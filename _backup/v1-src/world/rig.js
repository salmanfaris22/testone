// Camera rig: orbit by hand, scripted flights, a film path and a free "drone".
// Everything eases through one damped pose so hand-offs between modes never jump.
import * as THREE from 'three';
import { clamp, lerp, damp, dampAngle, easeIO, TAU } from './kit.js';
import { SEA_Y } from './terrain-fn.js';

export const P = (x, y, z, az, pol, dist) => ({ x, y, z, az, pol, dist });
const copy = (a, b) => { a.x = b.x; a.y = b.y; a.z = b.z; a.az = b.az; a.pol = b.pol; a.dist = b.dist; return a; };
const near = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return a + d; };
const _t = new THREE.Vector3();

function cr(p0, p1, p2, p3, t) { // Catmull-Rom scalar
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export class Rig {
  constructor(engine, dom) {
    this.engine = engine; this.cam = engine.camera; this.dom = dom;
    this.cur = P(-20, 0, -20, -0.7, 0.95, 620); this.goal = copy({}, this.cur);
    this.limits = { polMin: 0.12, polMax: 1.4, distMin: 9, distMax: 980, box: [-330, 250, -430, 290] };
    this.lambda = 6.5;
    this.flight = null; this.path = null; this.drone = null;
    this.user = false;            // may the visitor steer?
    this.wheelZoom = false;       // wheel zooms (explore) or scrolls the page (story)
    this.drift = 0; this.idle = 0;
    this.shift = { x: 0, y: 0, gx: 0, gy: 0 };
    this.fit = 1; this.moved = true; this.speed = 0;
    this.target = new THREE.Vector3();
    this.keys = new Set(); this.pointers = new Map();
    this.onUser = null; this.onTap = null; this.onHover = null;
    this._bind();
    this._apply(0);
  }
  /* ───── scripted moves ───── */
  jump(p) { this.flight = null; this.path = null; copy(this.goal, p); copy(this.cur, p); this.moved = true; }
  flyTo(p, { dur = 1.7, hop = 0.22, ease = easeIO, done } = {}) {
    if (this.engine.reduced) dur = Math.min(dur, 0.45);
    this.path = null;
    const from = copy({}, this.cur), to = copy({}, p); to.az = near(from.az, to.az);
    const travel = Math.hypot(to.x - from.x, to.z - from.z);
    const bump = hop * Math.max(0, travel - Math.abs(to.dist - from.dist) * 0.4);
    this.flight = { from, to, t: 0, dur, ease, bump, done };
    return this;
  }
  /** continuous film move through key poses: [{p, t}] with t = seconds for the leg that ends at this key */
  playPath(keys, { loop = false, onLeg, done } = {}) {
    this.flight = null;
    const ks = keys.map((k) => ({ ...k, p: copy({}, k.p) }));
    for (let i = 1; i < ks.length; i++) ks[i].p.az = near(ks[i - 1].p.az, ks[i].p.az);
    this.path = { ks, i: 0, t: 0, loop, onLeg, done };
    onLeg && onLeg(0, ks[0]);
  }
  stopPath() { this.path = null; }
  setShift(x, y) { this.shift.gx = x; this.shift.gy = y; }
  /* ───── drone ───── */
  enterDrone() {
    // take off from where the camera is, but drop to a height where the site reads well
    const c = this.cam.position.clone(), t = this.target;
    if (c.y > 70) { const k = 70 / c.y; c.set(t.x + (c.x - t.x) * k * 1.6, 70, t.z + (c.z - t.z) * k * 1.6); }
    const yaw = Math.atan2(t.x - c.x, t.z - c.z), pitch = -Math.atan2(c.y - 6, Math.hypot(t.x - c.x, t.z - c.z));
    this.drone = { pos: c, vel: new THREE.Vector3(), yaw, pitch, gy: yaw, gp: pitch, boost: 1, touch: { f: 0, s: 0, u: 0 } };
    this.flight = null; this.path = null;
  }
  exitDrone() {
    const d = this.drone; if (!d) return; this.drone = null;
    // turn the drone view back into an orbit around the ground point ahead
    const dir = new THREE.Vector3(Math.sin(d.yaw) * Math.cos(d.pitch), Math.sin(d.pitch), Math.cos(d.yaw) * Math.cos(d.pitch));
    let dist = dir.y < -0.05 ? clamp(-d.pos.y / dir.y, 20, 600) : 160;
    const tx = d.pos.x + dir.x * dist, tz = d.pos.z + dir.z * dist;
    const p = P(tx, 0, tz, Math.atan2(d.pos.x - tx, d.pos.z - tz), Math.acos(clamp((d.pos.y - 0) / dist, -1, 1)), dist);
    copy(this.cur, p); copy(this.goal, p);
  }
  /* ───── per frame ───── */
  update(dt) {
    const L = this.limits;
    if (this.drone) return this._drone(dt);
    if (this.path) this._path(dt);
    else if (this.flight) {
      const f = this.flight; f.t += dt / f.dur; const k = f.ease(clamp(f.t, 0, 1));
      const g = this.goal, a = f.from, b = f.to;
      g.x = lerp(a.x, b.x, k); g.y = lerp(a.y, b.y, k); g.z = lerp(a.z, b.z, k);
      g.az = lerp(a.az, b.az, k); g.pol = lerp(a.pol, b.pol, k) - Math.sin(Math.PI * k) * Math.min(0.12, f.bump * 0.0006);
      g.dist = lerp(a.dist, b.dist, k) + Math.sin(Math.PI * k) * f.bump;
      if (f.t >= 1) { this.flight = null; f.done && f.done(); }
    } else if (this.drift && !this.pointers.size) {
      this.idle += dt; if (this.idle > 3.5) this.goal.az += this.drift * dt * Math.min(1, (this.idle - 3.5) / 2);
    }
    const g = this.goal, c = this.cur;
    g.pol = clamp(g.pol, L.polMin, L.polMax); g.dist = clamp(g.dist, L.distMin, L.distMax);
    g.x = clamp(g.x, L.box[0], L.box[1]); g.z = clamp(g.z, L.box[2], L.box[3]);
    const lam = this.flight || this.path ? 9 : this.lambda;
    const px = c.x, pz = c.z, pa = c.az, pp = c.pol, pd = c.dist;
    c.x = damp(c.x, g.x, lam, dt); c.y = damp(c.y, g.y, lam, dt); c.z = damp(c.z, g.z, lam, dt);
    c.az = dampAngle(c.az, g.az, lam, dt); c.pol = damp(c.pol, g.pol, lam, dt); c.dist = damp(c.dist, g.dist, lam, dt);
    this.shift.x = damp(this.shift.x, this.shift.gx, 5, dt); this.shift.y = damp(this.shift.y, this.shift.gy, 5, dt);
    const delta = Math.abs(c.x - px) + Math.abs(c.z - pz) + (Math.abs(c.az - pa) + Math.abs(c.pol - pp)) * c.dist + Math.abs(c.dist - pd);
    this.speed = delta / Math.max(dt, 1e-3);
    this.moved = delta > 0.002 || Math.abs(this.shift.x - this.shift.gx) > 0.3 || Math.abs(this.shift.y - this.shift.gy) > 0.3;
    this._apply(dt);
  }
  _apply() {
    const c = this.cur, cam = this.cam, e = this.engine;
    const dist = c.dist * this.fit, sp = Math.sin(c.pol);
    this.target.set(c.x, c.y, c.z);
    cam.position.set(c.x + dist * sp * Math.sin(c.az), c.y + dist * Math.cos(c.pol), c.z + dist * sp * Math.cos(c.az));
    // never dip under the ground or the sea
    const floor = SEA_Y + 3.4; if (cam.position.y < floor) cam.position.y = floor;
    cam.lookAt(this.target);
    const n = clamp(dist * 0.04, 0.35, 10);
    if (Math.abs(cam.near - n) > n * 0.08) { cam.near = n; cam.far = 9000; cam.updateProjectionMatrix(); }
    const sx = Math.round(this.shift.x), sy = Math.round(this.shift.y);
    if (sx !== this._sx || sy !== this._sy || e.w !== this._w || e.h !== this._h) {
      this._sx = sx; this._sy = sy; this._w = e.w; this._h = e.h;
      if (sx || sy) cam.setViewOffset(e.w, e.h, sx, sy, e.w, e.h); else cam.clearViewOffset();
    }
    cam.updateMatrixWorld();
  }
  _path(dt) {
    const p = this.path, ks = p.ks, n = ks.length;
    if (p.i >= n - 1) { if (p.loop) { p.i = 0; p.t = 0; } else { this.path = null; p.done && p.done(); return; } }
    const k1 = ks[p.i], k2 = ks[p.i + 1], k0 = ks[Math.max(0, p.i - 1)], k3 = ks[Math.min(n - 1, p.i + 2)];
    p.t += dt / (k2.t || 6); const t = clamp(p.t, 0, 1), g = this.goal;
    for (const key of ['x', 'y', 'z', 'az', 'pol', 'dist']) g[key] = cr(k0.p[key], k1.p[key], k2.p[key], k3.p[key], t);
    if (p.t >= 1) { p.i++; p.t = 0; if (p.i < n - 1) p.onLeg && p.onLeg(p.i, ks[p.i]); }
  }
  _drone(dt) {
    const d = this.drone, K = this.keys;
    const f = (K.has('KeyW') || K.has('ArrowUp') ? 1 : 0) - (K.has('KeyS') || K.has('ArrowDown') ? 1 : 0) + d.touch.f;
    const s = (K.has('KeyD') || K.has('ArrowRight') ? 1 : 0) - (K.has('KeyA') || K.has('ArrowLeft') ? 1 : 0) + d.touch.s;
    const u = (K.has('KeyE') || K.has('Space') ? 1 : 0) - (K.has('KeyQ') ? 1 : 0) + d.touch.u;
    const sp = 34 * d.boost * (K.has('ShiftLeft') || K.has('ShiftRight') ? 2.6 : 1);
    d.yaw = dampAngle(d.yaw, d.gy, 10, dt); d.pitch = damp(d.pitch, d.gp, 10, dt);
    const fx = Math.sin(d.yaw), fz = Math.cos(d.yaw);
    _t.set((fx * f - fz * s) * sp, u * sp * 0.7 + Math.sin(d.pitch) * f * sp * 0.55, (fz * f + fx * s) * sp);
    d.vel.x = damp(d.vel.x, _t.x, 3.2, dt); d.vel.y = damp(d.vel.y, _t.y, 3.2, dt); d.vel.z = damp(d.vel.z, _t.z, 3.2, dt);
    d.pos.addScaledVector(d.vel, dt);
    d.pos.x = clamp(d.pos.x, -700, 620); d.pos.z = clamp(d.pos.z, -760, 640);
    const land = Math.abs(d.pos.x + 35) < 252 && d.pos.z > -180;
    d.pos.y = clamp(d.pos.y, (land ? 0 : SEA_Y) + 2.2, 420);
    const cam = this.cam; cam.position.copy(d.pos);
    const cp = Math.cos(d.pitch);
    _t.set(d.pos.x + fx * cp, d.pos.y + Math.sin(d.pitch), d.pos.z + fz * cp); cam.lookAt(_t);
    this.target.set(d.pos.x + fx * 60, 0, d.pos.z + fz * 60);
    if (cam.near !== 0.6) { cam.near = 0.6; cam.updateProjectionMatrix(); }
    if (this._sx || this._sy) { cam.clearViewOffset(); this._sx = this._sy = 0; }
    cam.updateMatrixWorld(); this.moved = true; this.speed = d.vel.length();
  }
  /* ───── input ───── */
  _bind() {
    const el = this.dom;
    let downX = 0, downY = 0, downT = 0, moved = 0, pinch = 0, lastMid = null;
    const active = () => this.user || this.drone;
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 2) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey });
      if (this.pointers.size === 1) { downX = e.clientX; downY = e.clientY; downT = performance.now(); moved = 0; }
      if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
      if (active()) { try { el.setPointerCapture(e.pointerId); } catch {} }
    });
    el.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) { this.onHover && this.onHover(e.clientX, e.clientY, e); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (!active()) return;
      if (this.drone) { this.drone.gy -= dx * 0.0042; this.drone.gp = clamp(this.drone.gp - dy * 0.0036, -1.35, 0.6); return; }
      this._userTook();
      const g = this.goal;
      if (this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (pinch) g.dist *= pinch / Math.max(d, 1); pinch = d;
        if (lastMid) this._pan((mid.x - lastMid.x) * 0.5, (mid.y - lastMid.y) * 0.5); lastMid = mid;
      } else if (p.b === 2 || p.b === 1 || p.shift) this._pan(dx, dy);
      else { g.az -= dx * 0.0052; g.pol -= dy * 0.0042; }
    });
    const up = (e) => {
      const p = this.pointers.get(e.pointerId); if (!p) return;
      this.pointers.delete(e.pointerId); pinch = 0; lastMid = null;
      if (moved < 7 && performance.now() - downT < 600 && p.b === 0) this.onTap && this.onTap(e.clientX, e.clientY, e);
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); });
    el.addEventListener('contextmenu', (e) => { if (active()) e.preventDefault(); });
    el.addEventListener('wheel', (e) => {
      if (this.drone) { e.preventDefault(); this.drone.boost = clamp(this.drone.boost * Math.exp(-e.deltaY * 0.001), 0.3, 5); return; }
      if (!this.user || (!this.wheelZoom && !e.ctrlKey)) return;
      e.preventDefault(); this._userTook();
      this.goal.dist *= Math.exp(clamp(e.deltaY, -120, 120) * (e.ctrlKey ? 0.008 : 0.0016));
    }, { passive: false });
    addEventListener('keydown', (e) => { if (this.drone) { this.keys.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); } });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }
  _pan(dx, dy) {
    const g = this.goal, k = (g.dist * this.fit * 2 * Math.tan((this.cam.fov * Math.PI) / 360)) / this.engine.h;
    const ca = Math.cos(g.az), sa = Math.sin(g.az), fy = dy / Math.max(0.35, Math.cos(g.pol));
    g.x += (-dx * ca - fy * sa) * k; g.z += (dx * sa - fy * ca) * k;
  }
  _userTook() { this.idle = 0; if (this.flight || this.path) { this.flight = null; this.path = null; copy(this.goal, this.cur); } this.onUser && this.onUser(); }
  zoomBy(f) { this._userTook(); this.goal.dist *= f; }
}
