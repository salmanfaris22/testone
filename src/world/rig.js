// Camera rig: orbit by hand, scripted flights, a film path and a free "drone".
// Everything eases through one damped pose so hand-offs between modes never jump.
import * as THREE from 'three';
import { clamp, lerp, damp, dampAngle, easeIO, TAU } from './kit.js';
import { SEA_Y, landSDF } from './terrain-fn.js';
import { CAM_BOX } from './layout.js';
import { BOUNDS, ALT_MAX } from './airspace.js';

export const P = (x, y, z, az, pol, dist) => ({ x, y, z, az, pol, dist });
const copy = (a, b) => { a.x = b.x; a.y = b.y; a.z = b.z; a.az = b.az; a.pol = b.pol; a.dist = b.dist; return a; };
const near = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return a + d; };
const _t = new THREE.Vector3(), _q = new THREE.Vector3(), _c1 = new THREE.Vector3(), _c2 = new THREE.Vector3(), _l1 = new THREE.Vector3(), _l2 = new THREE.Vector3(), _sp = {};
/** how high the drone's centre stands over whatever its feet are on (drone.js: the legs reach 0.222 below it, at 1.55 scale) */
export const DRONE_LEG = 0.222 * 1.55;
/** the shortest turn from one heading to another */
const angleTo = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

/** the drone's cruising speeds, metres per second: slow (for a close look), cruise, fast, sport */
export const DRONE_SPEED = [7, 16, 30, 52];
const POSE_KEYS = ['x', 'y', 'z', 'az', 'pol', 'dist'];
// Time-aware, shape-preserving Hermite tangents. Adjacent legs share a velocity
// in units per second, even when their durations differ. A turn slows naturally
// instead of overshooting a roof, and takeoff/landing have zero velocity.
function pathTangents(ks) {
  return ks.map((k, i) => Object.fromEntries(POSE_KEYS.map((key) => {
    if (!i || i === ks.length - 1) return [key, 0];
    const h0 = k.t, h1 = ks[i + 1].t;
    const a = (k.p[key] - ks[i - 1].p[key]) / h0, b = (ks[i + 1].p[key] - k.p[key]) / h1;
    const w0 = 2 * h1 + h0, w1 = h1 + 2 * h0;
    return [key, a * b <= 0 ? 0 : (w0 + w1) / (w0 / a + w1 / b)];
  })));
}

export class Rig {
  constructor(engine, dom) {
    this.engine = engine; this.cam = engine.camera; this.dom = dom;
    this.cur = P(-20, 0, -20, -0.7, 0.95, 620); this.goal = copy({}, this.cur);
    this.limits = { polMin: 0.12, polMax: 1.4, distMin: 9, distMax: 1250, box: CAM_BOX.slice() };
    this.fov = 32; this.fovGoal = 32; this.room = null; this._rd = 0;
    this.lambda = 6.5;
    this.flight = null; this.path = null; this.drone = null;
    this.user = false;            // may the visitor steer?
    this.wheelZoom = false;       // wheel zooms (explore) or scrolls the page (story)
    this.drift = 0; this.idle = 0;
    this.shift = { x: 0, y: 0, gx: 0, gy: 0 };
    this.fit = 1; this.fitOverride = null; this.floorOverride = null; this.moved = true; this.speed = 0;
    this.target = new THREE.Vector3();
    this.keys = new Set(); this.pointers = new Map(); this.walkIn = { f: 0, s: 0 };     // on-screen stick: forward and sideways, -1 to 1
    this.onUser = null; this.onTap = null; this.onHover = null; this.onDrag = null; this.onWheel = null;
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
    this.flight = null; this.path = null;
    if (!keys.length) return;
    const ks = keys.map((k) => ({ ...k, t: Math.max(1 / 240, k.t || 6), p: copy({}, k.p) }));
    for (let i = 1; i < ks.length; i++) ks[i].p.az = near(ks[i - 1].p.az, ks[i].p.az);
    if (ks.length === 1) { copy(this.goal, ks[0].p); done && done(); return; }
    this.path = { ks, tangents: pathTangents(ks), i: 0, t: 0, loop, onLeg, done };
    onLeg && onLeg(0, ks[0]);
  }
  stopPath() { this.path = null; }
  setShift(x, y) { this.shift.gx = x; this.shift.gy = y; }
  /* ───── drone ───── */
  /**
   * Take off. With a dock ({ rest, yaw, out, around(d, side, y) }, dock.js) the camera first comes down to the dock, its lid opens,
   * the rotors spin up and the drone lifts out and turns to `out`; without one it starts where the camera is.
   * `air` is the space it flies in (airspace.js): walls, doors, roofs, ceilings. The state is rig.drone; d.phase says what it is doing:
   * 'launch', 'fly' (yours), 'home' (flying itself back to the dock), 'land' (down into it), 'done'.
   */
  enterDrone(dock = null, air = null) {
    this.air = air; this.dock = dock;
    const c = this.cam.position.clone(), t = this.target.clone();
    const d = this.drone = { pos: c.clone(), vel: new THREE.Vector3(), cam: c.clone(), look: t.clone(), yaw: 0, cy: 0, pitch: -0.1, gy: 0, gp: -0.1, boost: 1, level: 1,
      tiltX: 0, tiltZ: 0, thr: 0.3, motor: 1, size: 1, inK: 0, age: 0, kmh: 0, touch: { f: 0, s: 0, u: 0, yaw: 0 }, phase: 'fly', pt: 0, lid: 0, bob: 1, sp: {}, inside: null };
    if (dock) {
      d.pos.copy(dock.rest); d.pos.y += DRONE_LEG; d.yaw = d.cy = d.gy = dock.yaw; d.thr = 0; d.motor = 0; d.bob = 0; d.phase = 'launch';
      // where the camera watches the take-off from: in front of the dock and to one side, a little above it
      const view = dock.around(5.6, -2.8, 4.1), at = dock.rest.clone(); at.y += 0.7;
      d.L = { c0: c, l0: t, view, at, T1: clamp(1.0 + c.distanceTo(view) / 420, 1.4, 2.8) };
    } else {
      // no dock: take off from where the camera is, but drop to a height where the site reads well
      if (c.y > 70) { const k = 70 / c.y; c.set(t.x + (c.x - t.x) * k * 1.6, 70, t.z + (c.z - t.z) * k * 1.6); }
      d.pos.copy(c); d.cam.copy(c); d.yaw = d.cy = d.gy = Math.atan2(t.x - c.x, t.z - c.z); d.pitch = d.gp = clamp(-Math.atan2(c.y - 6, Math.hypot(t.x - c.x, t.z - c.z)), -0.85, 0.1);
    }
    this.flight = null; this.path = null;
  }
  /** fly home to the dock and land in it (with no dock: just stop). `skip` puts it straight in */
  droneHome(skip = false) {
    const d = this.drone; if (!d) return;
    if (!this.dock) { d.phase = 'done'; return; }
    if (skip) { const k = this.dock; d.pos.copy(k.rest); d.pos.y += DRONE_LEG; d.vel.set(0, 0, 0); d.yaw = d.cy = d.gy = k.yaw; d.motor = 0; d.thr = 0; d.lid = 0; d.phase = 'done'; return; }
    if (d.phase === 'home' || d.phase === 'land' || d.phase === 'done') return;
    // a smooth arc: up off where it is, over at a safe height, down onto a point above the dock
    const k = this.dock, p0 = d.pos.clone(), p3 = k.rest.clone(); p3.y += DRONE_LEG + 6.5;
    const h = Math.max(p0.y + 6, Math.min(70, 40 + p0.distanceTo(p3) * 0.03));
    const p1 = new THREE.Vector3(p0.x, h, p0.z), p2 = new THREE.Vector3(p3.x, h, p3.z), len = p0.distanceTo(p1) + p1.distanceTo(p2) + p2.distanceTo(p3);
    d.H = { p0, p1, p2, p3, T: clamp(len / 24, 2.6, 9) }; d.phase = 'home'; d.pt = 0; d.touch.f = d.touch.s = d.touch.u = d.touch.yaw = 0;
  }
  /** put the drone above the dock at once (it was shut in a building: the screen has been faded out by the caller) */
  droneOverDock() {
    const d = this.drone, k = this.dock; if (!d || !k) return;
    d.pos.copy(k.rest); d.pos.y += DRONE_LEG + 6.5; d.vel.set(0, 0, 0); d.inK = 0; d.size = 1; d.inside = null;
    d.yaw = d.cy = d.gy = k.yaw; d.pitch = d.gp = -0.25; this._chaseCam(d, d.cam); d.phase = 'land'; d.pt = 0;
  }
  exitDrone(around = null) {
    const d = this.drone; if (!d) return; this.drone = null;
    // turn the drone's camera back into an orbit, round the dock (when it has landed) or the ground point ahead of it
    const c = this.cam.position, dir = new THREE.Vector3(Math.sin(d.cy) * Math.cos(d.pitch), Math.sin(d.pitch), Math.cos(d.cy) * Math.cos(d.pitch));
    let tx, ty = 0, tz, dist;
    if (around) { tx = around.x; ty = around.y; tz = around.z; dist = Math.hypot(c.x - tx, c.y - ty, c.z - tz); }
    else { dist = dir.y < -0.05 ? clamp(-c.y / dir.y, 20, 600) : 160; tx = c.x + dir.x * dist; tz = c.z + dir.z * dist; }
    const p = P(tx, ty, tz, Math.atan2(c.x - tx, c.z - tz), Math.acos(clamp((c.y - ty) / Math.max(1e-3, dist), -1, 1)), dist);
    copy(this.cur, p); copy(this.goal, p); this.fovGoal = 32; this.air = null;
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
    if (this.room && this.user) this._walk(dt);
    if (this.room && !this.flight && !this.path) this._keepIn(g);
    if (Math.abs(this.fov - this.fovGoal) > 0.02) { this.fov = damp(this.fov, this.fovGoal, 4.5, dt); this.cam.fov = this.fov; this.cam.updateProjectionMatrix(); this.onFov && this.onFov(this.fov); this.moved = true; }
    this._dt = dt;
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
    const sp = Math.sin(c.pol), dx = sp * Math.sin(c.az), dy = Math.cos(c.pol), dz = sp * Math.cos(c.az);
    let dist = c.dist * (this.room ? 1 : (this.fitOverride ?? this.fit));        // (the opening film's drive holds the fit at 1 so the camera stays in the car)
    this.target.set(c.x, c.y, c.z);
    if (this.room) { const lim = this._roomLimit(c, dx, dy, dz, dist); this._rd = this._rd ? damp(this._rd, lim, 10, this._dt || 0.016) : lim; dist = Math.min(dist, this._rd); } else this._rd = 0;
    cam.position.set(c.x + dist * dx, c.y + dist * dy, c.z + dist * dz);
    // never dip under the ground or the sea
    const floor = this.room ? 0.5 : (this.floorOverride ?? SEA_Y + 3.4); if (cam.position.y < floor) cam.position.y = floor;      // (the film's low shots by the gate and the wheel bath go lower)
    cam.lookAt(this.target);
    const n = this.room ? 0.14 : clamp(dist * 0.04, 0.35, 10);
    if (Math.abs(cam.near - n) > n * 0.08) { cam.near = n; cam.far = 9000; cam.updateProjectionMatrix(); }
    const sx = Math.round(this.shift.x), sy = Math.round(this.shift.y);
    if (sx !== this._sx || sy !== this._sy || e.w !== this._w || e.h !== this._h) {
      this._sx = sx; this._sy = sy; this._w = e.w; this._h = e.h;
      if (sx || sy) cam.setViewOffset(e.w, e.h, sx, sy, e.w, e.h); else cam.clearViewOffset();
    }
    cam.updateMatrixWorld();
  }
  /** walk-in view: how far back from the target the camera may sit before it meets a wall, the ceiling or a big piece of kit */
  _roomLimit(c, dx, dy, dz, dist) {
    const a = this.room, f = a.frame, cs = Math.cos(f.ry), sn = Math.sin(f.ry);
    const tx = (c.x - f.x) * cs - (c.z - f.z) * sn, tz = (c.x - f.x) * sn + (c.z - f.z) * cs, lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
    let t = dist, top = 0;
    for (const r of a.rooms || []) {
      const m = 0.7;
      if (r.circle) {
        const ox = tx - r.x, oz = tz - r.z, rr = r.r - 0.3; if (ox * ox + oz * oz > rr * rr) continue;
        const A = lx * lx + lz * lz, B = 2 * (ox * lx + oz * lz), Cc = ox * ox + oz * oz - rr * rr;
        if (A > 1e-6) { const D = B * B - 4 * A * Cc; if (D >= 0) t = Math.min(t, (-B + Math.sqrt(D)) / (2 * A)); }
        // something round standing in the middle (the aquarium): stop at its glass rather than end up inside it
        if (r.inner && ox * ox + oz * oz > r.inner * r.inner && A > 1e-6) { const C2 = ox * ox + oz * oz - r.inner * r.inner, D2 = B * B - 4 * A * C2; if (D2 >= 0) { const hit = (-B - Math.sqrt(D2)) / (2 * A); if (hit > 0) t = Math.min(t, hit - 0.2); } }
      } else {
        if (tx < r.x0 || tx > r.x1 || tz < r.z0 || tz > r.z1) continue;
        if (lx > 1e-6) t = Math.min(t, (r.x1 - m - tx) / lx); else if (lx < -1e-6) t = Math.min(t, (r.x0 + m - tx) / lx);
        if (lz > 1e-6) t = Math.min(t, (r.z1 - m - tz) / lz); else if (lz < -1e-6) t = Math.min(t, (r.z0 + m - tz) / lz);
      }
      top = r.h; break;
    }
    if (top && dy > 1e-6) t = Math.min(t, (top - 0.75 - c.y) / dy);
    // walls: a ray as wide as a doorway, so the camera neither passes a wall nor peers through a door crack
    const W = a.walls, L = Math.hypot(lx, lz);
    if (W && L > 1e-4) {
      const px = (-lz / L) * 0.7, pz = (lx / L) * 0.7; let best = t, hit = false;
      for (let k = -1; k <= 1; k++) {
        const sx = tx + px * k, sz = tz + pz * k;
        for (let i = 0; i < W.length; i++) {
          const w = W[i], ex = w[2] - w[0], ez = w[3] - w[1], den = lx * ez - lz * ex; if (den > -1e-9 && den < 1e-9) continue;
          const qx = w[0] - sx, qz = w[1] - sz, tt = (qx * ez - qz * ex) / den; if (tt <= 0.02 || tt >= best) continue;
          const u = (qx * lz - qz * lx) / den; if (u < -0.02 || u > 1.02) continue;
          if (w[4] < 2 && c.y + dy * tt > w[4] + 0.3) continue;                 // a low partition: look over it
          if (k) { const d2 = px * k * ez - pz * k * ex; if (d2 < -1e-9 || d2 > 1e-9) { const ax = w[0] - tx, az = w[1] - tz, s1 = (ax * ez - az * ex) / d2, u1 = (ax * pz * k - az * px * k) / d2; if (s1 > 0 && s1 < 1 && u1 > 0 && u1 < 1) continue; } }   // the wall right beside the target
          best = tt; hit = true;
        }
      }
      if (hit) t = Math.min(t, best - 0.55 / L);
    }
    // never end up inside a tall cabinet, column or filter: stop in front of it
    const its = a.items;
    if (its && its.length && L > 1e-4) for (let i = 0; i < its.length; i++) {
      const it = its[i], b = it.box; if (it.zone || b[4] < 1.3) continue;
      if (tx > b[0] && tx < b[3] && tz > b[2] && tz < b[5]) continue;            // the thing being looked at
      const m = 0.4, cx = tx + lx * t, cz = tz + lz * t, cy = c.y + dy * t;
      if (cx < b[0] - m || cx > b[3] + m || cz < b[2] - m || cz > b[5] + m || cy > b[4] + 0.35) continue;
      let te = 0; if (lx > 1e-6) te = Math.max(te, (b[0] - m - tx) / lx); else if (lx < -1e-6) te = Math.max(te, (b[3] + m - tx) / lx);
      if (lz > 1e-6) te = Math.max(te, (b[2] - m - tz) / lz); else if (lz < -1e-6) te = Math.max(te, (b[5] + m - tz) / lz);
      if (te > 0 && te < t) t = te - 0.1;
    }
    return Math.max(0.5, t);
  }
  /** walk-in view: W A S D, the arrow keys or the on-screen stick move the point you stand at; walls and tanks stop you, doors let you through */
  _walk(dt) {
    const K = this.keys, w = this.walkIn;
    const f = (K.has('KeyW') || K.has('ArrowUp') ? 1 : 0) - (K.has('KeyS') || K.has('ArrowDown') ? 1 : 0) + w.f, s = (K.has('KeyD') ? 1 : 0) - (K.has('KeyA') ? 1 : 0) + w.s;
    if (!f && !s) return;
    if (this.flight || this.path) { this.flight = null; this.path = null; copy(this.goal, this.cur); }
    this.idle = 0; this.onUser && this.onUser(); this.onWalk && this.onWalk();
    const g = this.goal, a = this.room, fr = a.frame, cs = Math.cos(fr.ry), sn = Math.sin(fr.ry), v = (K.has('ShiftLeft') || K.has('ShiftRight') ? 6.5 : 3.6) * Math.min(dt, 0.05), sa = Math.sin(g.az), ca = Math.cos(g.az);
    const wx = (-sa * f + ca * s) * v, wz = (-ca * f - sa * s) * v;
    const ox = (g.x - fr.x) * cs - (g.z - fr.z) * sn, oz = (g.x - fr.x) * sn + (g.z - fr.z) * cs, dx = wx * cs - wz * sn, dz = wx * sn + wz * cs;
    const free = (mx, mz) => {
      const L = Math.hypot(mx, mz); if (L < 1e-6) return false; const ex0 = (mx / L) * (L + 0.45), ez0 = (mz / L) * (L + 0.45);
      for (const q of a.walls || []) { if (q[5]) continue; const ex = q[2] - q[0], ez = q[3] - q[1], den = ex0 * ez - ez0 * ex; if (den > -1e-9 && den < 1e-9) continue; const qx = q[0] - ox, qz = q[1] - oz, t = (qx * ez - qz * ex) / den, u = (qx * ez0 - qz * ex0) / den; if (t > 0 && t < 1 && u > -0.02 && u < 1.02) return false; }
      const nx = ox + mx, nz = oz + mz;
      for (const it of a.items || []) { const b = it.box; if (it.zone || b[4] < 0.9) continue; const m = 0.3; if (nx > b[0] - m && nx < b[3] + m && nz > b[2] - m && nz < b[5] + m && !(ox > b[0] - m && ox < b[3] + m && oz > b[2] - m && oz < b[5] + m)) return false; }
      return true;
    };
    let mx = dx, mz = dz; if (!free(mx, mz)) { if (free(dx, 0)) mz = 0; else if (free(0, dz)) mx = 0; else return; }       // slide along what is in the way
    g.x += mx * cs + mz * sn; g.z += -mx * sn + mz * cs; g.y = damp(g.y, 1.55, 6, dt);
  }
  /** walk-in view: the point you stand at stays inside the building */
  _keepIn(g) {
    const a = this.room, f = a.frame, cs = Math.cos(f.ry), sn = Math.sin(f.ry);
    let tx = (g.x - f.x) * cs - (g.z - f.z) * sn, tz = (g.x - f.x) * sn + (g.z - f.z) * cs, best = null, bd = Infinity;
    for (const r of a.rooms) {
      let px, pz;
      if (r.circle) { const ox = tx - r.x, oz = tz - r.z, d = Math.hypot(ox, oz), rr = r.r - 1; if (d <= rr) return; px = r.x + (ox / d) * rr; pz = r.z + (oz / d) * rr; }
      else { if (tx >= r.x0 + 1 && tx <= r.x1 - 1 && tz >= r.z0 + 1 && tz <= r.z1 - 1) return; px = clamp(tx, r.x0 + 1, r.x1 - 1); pz = clamp(tz, r.z0 + 1, r.z1 - 1); }
      const d = (px - tx) ** 2 + (pz - tz) ** 2; if (d < bd) { bd = d; best = [px, pz]; }
    }
    if (best) { g.x = f.x + best[0] * cs + best[1] * sn; g.z = f.z - best[0] * sn + best[1] * cs; }
  }
  _path(dt) {
    const p = this.path, ks = p.ks, n = ks.length;
    p.t += dt;
    while (p.t >= ks[p.i + 1].t) {
      p.t -= ks[p.i + 1].t; p.i++;
      if (p.i === n - 1) {
        if (p.loop) p.i = 0;
        else { copy(this.goal, ks[n - 1].p); this.path = null; p.done && p.done(); return; }
      }
      p.onLeg && p.onLeg(p.i, ks[p.i]);
      if (this.path !== p) return;
    }
    const a = ks[p.i], b = ks[p.i + 1], h = b.t, u = p.t / h, u2 = u * u, u3 = u2 * u;
    for (const key of POSE_KEYS) this.goal[key] = (2 * u3 - 3 * u2 + 1) * a.p[key]
      + (u3 - 2 * u2 + u) * h * p.tangents[p.i][key]
      + (-2 * u3 + 3 * u2) * b.p[key] + (u3 - u2) * h * p.tangents[p.i + 1][key];
  }
  /** the camera behind the drone and a little below its line (so the drone rides in the upper part of the picture);
   *  closer in when it is indoors */
  _chaseCam(d, out) {
    const cp = Math.cos(d.pitch), sn = Math.sin(d.pitch), cx = Math.sin(d.cy), cz = Math.cos(d.cy), tall = this.engine.h > this.engine.w;
    const back = lerp(tall ? 6.0 : 4.7, tall ? 3.1 : 2.5, d.inK), rise = lerp(tall ? 1.9 : 1.25, tall ? 0.95 : 0.72, d.inK);
    return out.set(d.pos.x - cx * cp * back + cx * sn * rise, d.pos.y - sn * back - cp * rise, d.pos.z - cz * cp * back + cz * sn * rise);
  }
  /** the drone: it has weight (it takes a moment to get going and to stop), it leans the way it flies and banks into turns,
   *  and the camera trails it on a soft tether. Walls, closed doors, roofs and ceilings stop it (airspace.js); doors open for it */
  _drone(dt) {
    const d = this.drone, K = this.keys, cam = this.cam, air = this.air; d.age += dt; d.pt += dt;
    const yaw0 = d.yaw, vx0 = d.vel.x, vz0 = d.vel.z, tall = this.engine.h > this.engine.w;
    let camSet = false;
    if (d.phase === 'fly') {
      const f = (K.has('KeyW') || K.has('ArrowUp') ? 1 : 0) - (K.has('KeyS') || K.has('ArrowDown') ? 1 : 0) + d.touch.f;
      const s = (K.has('KeyD') || K.has('ArrowRight') ? 1 : 0) - (K.has('KeyA') || K.has('ArrowLeft') ? 1 : 0) + d.touch.s;
      const u = (K.has('KeyE') || K.has('Space') ? 1 : 0) - (K.has('KeyQ') ? 1 : 0) + d.touch.u;
      let sp = DRONE_SPEED[d.level] * d.boost * (K.has('ShiftLeft') || K.has('ShiftRight') ? 1.8 : 1);
      sp = lerp(sp, Math.min(sp, 6.5), d.inK);                                                  // indoors it goes carefully
      if (d.touch.yaw) d.gy -= d.touch.yaw * 1.45 * dt;                                         // the turn buttons on a phone
      d.yaw = dampAngle(d.yaw, d.gy, 6.5, dt); d.cy = dampAngle(d.cy, d.yaw, 3.6, dt); d.pitch = damp(d.pitch, d.gp, 8, dt);
      const fx = Math.sin(d.yaw), fz = Math.cos(d.yaw);
      _t.set((fx * f - fz * s) * sp, u * sp * 0.6 + Math.sin(d.pitch) * f * sp * 0.5, (fz * f + fx * s) * sp);
      d.vel.x = damp(d.vel.x, _t.x, 2.3, dt); d.vel.y = damp(d.vel.y, _t.y, 3.2, dt); d.vel.z = damp(d.vel.z, _t.z, 2.3, dt);
      // move in small steps so it can never slip through a wall, and keep it out of what is solid
      const n = Math.min(14, Math.max(1, Math.ceil((d.vel.length() * dt) / 0.28))), h = dt / n;
      for (let i = 0; i < n; i++) {
        _q.copy(d.pos); d.pos.addScaledVector(d.vel, h);
        d.pos.x = clamp(d.pos.x, BOUNDS[0], BOUNDS[1]); d.pos.z = clamp(d.pos.z, BOUNDS[2], BOUNDS[3]);
        if (!air) continue;
        air.guide(d.pos, d.vel, h);
        const pu = air.collide(d.pos, _q);
        if (pu[0] || pu[1]) { const L = Math.hypot(pu[0], pu[1]), nx = pu[0] / L, nz = pu[1] / L, vn = d.vel.x * nx + d.vel.z * nz; if (vn < 0) { d.vel.x -= vn * nx; d.vel.z -= vn * nz; } }
      }
      const g = air ? air.space(d.pos.x, d.pos.y, d.pos.z, d.sp) : { floor: (landSDF(d.pos.x, d.pos.z) < 6 ? 0 : SEA_Y) + 2.4, ceil: ALT_MAX, zone: null };
      if (d.pos.y < g.floor) { d.pos.y = g.floor - d.pos.y > 0.3 ? damp(d.pos.y, g.floor, 14, dt) : g.floor; if (d.vel.y < 0) d.vel.y = 0; }
      if (d.pos.y > g.ceil) { d.pos.y = g.ceil; if (d.vel.y > 0) d.vel.y = 0; }
      d.inside = g.zone ? g.zone.a : null;
    } else if (d.phase === 'launch') {
      // the camera comes to the dock, the lid opens, the rotors spin up, the drone lifts out and turns towards the site
      const L = d.L, t = d.pt, k1 = easeIO(clamp(t / L.T1, 0, 1)), t2 = t - L.T1;
      d.lid = clamp((t - L.T1 + 0.55) / 1.0, 0, 1);
      d.motor = clamp((t2 - 0.25) / 0.55, 0, 1); d.thr = 0.42 * d.motor;
      const up = easeIO(clamp((t2 - 0.75) / 1.5, 0, 1)), k3 = easeIO(clamp((t2 - 0.9) / 1.7, 0, 1));
      const rest = this.dock.rest.y + DRONE_LEG; d.pos.y = rest + 4.6 * up; d.bob = up;
      d.yaw = d.cy = d.gy = this.dock.yaw + angleTo(this.dock.yaw, this.dock.out) * easeIO(clamp((t2 - 1.0) / 1.5, 0, 1));
      d.vel.y = 0;
      this._chaseCam(d, _c2);
      _c1.copy(L.c0).lerp(L.view, k1); _l1.copy(L.l0).lerp(L.at, k1);
      _l2.set(d.pos.x + Math.sin(d.cy) * 12, d.pos.y + Math.sin(d.pitch) * 12, d.pos.z + Math.cos(d.cy) * 12);
      d.cam.copy(_c1).lerp(_c2, k3); d.look.copy(_l1).lerp(_l2, k3);
      cam.position.copy(d.cam); cam.lookAt(d.look); camSet = true;
      if (t2 > 2.7) { d.phase = 'fly'; d.pt = 0; d.motor = 1; d.bob = 1; d.L = null; }
    } else if (d.phase === 'home') {
      // along a smooth arc: up, over at a safe height, down to a point over the dock; facing the way it goes
      const H = d.H, u = easeIO(clamp(d.pt / H.T, 0, 1)), v = 1 - u;
      _t.set(0, 0, 0).addScaledVector(H.p0, v * v * v).addScaledVector(H.p1, 3 * v * v * u).addScaledVector(H.p2, 3 * v * u * u).addScaledVector(H.p3, u * u * u);
      d.vel.copy(_t).sub(d.pos).multiplyScalar(1 / Math.max(dt, 1e-3)); d.pos.copy(_t);
      const hv = Math.hypot(d.vel.x, d.vel.z); if (hv > 2.5) d.gy = Math.atan2(d.vel.x, d.vel.z); else if (u > 0.8) d.gy = this.dock.yaw;
      d.yaw = dampAngle(d.yaw, d.gy, 4.5, dt); d.cy = dampAngle(d.cy, d.yaw, 3, dt); d.pitch = damp(d.pitch, -0.32, 2.5, dt); d.thr = damp(d.thr, 0.35 + hv / 70, 4, dt);
      d.inside = null;
      if (d.pt >= H.T) { d.phase = 'land'; d.pt = 0; }
    } else if (d.phase === 'land') {
      // over the dock: the lid opens, it comes straight down onto the pad, the rotors stop, the lid closes
      const rest = this.dock.rest.y + DRONE_LEG, t = d.pt;
      d.lid = Math.min(1, Math.max(d.lid, t / 0.9)) * (1 - clamp((t - 3.6) / 1.0, 0, 1));
      const down = easeIO(clamp((t - 0.6) / 2.2, 0, 1)); d.pos.y = rest + 6.5 * (1 - down); d.vel.set(0, 0, 0); d.bob = 1 - down;
      d.yaw = dampAngle(d.yaw, this.dock.yaw, 4, dt); d.cy = dampAngle(d.cy, d.yaw, 3, dt); d.pitch = damp(d.pitch, -0.42, 2.5, dt);
      d.motor = 1 - clamp((t - 2.9) / 0.8, 0, 1); d.thr = 0.3 * d.motor;
      // the camera eases round to watch it go in
      const w = this.dock.around(7.2, -3.4, 3.3), at = this.dock.rest.clone(), k = easeIO(clamp((t - 0.2) / 2.4, 0, 1)); at.y += 0.8;
      this._chaseCam(d, _c2); _l2.set(d.pos.x + Math.sin(d.cy) * 12, d.pos.y + Math.sin(d.pitch) * 12, d.pos.z + Math.cos(d.cy) * 12);
      d.cam.lerp(_c2, 1 - Math.exp(-6 * dt)); _c1.copy(d.cam).lerp(w, k); d.look.copy(_l2).lerp(at, k);
      cam.position.copy(_c1); cam.lookAt(d.look); camSet = true;
      if (t > 4.7) d.phase = 'done';
    }
    // attitude: nose down while it speeds up and flies forward, a roll into sideways flight and into every turn
    const idt = 1 / Math.max(dt, 1e-3), fx = Math.sin(d.yaw), fz = Math.cos(d.yaw), vf = d.vel.x * fx + d.vel.z * fz, vs = -d.vel.x * fz + d.vel.z * fx;
    const af = ((d.vel.x - vx0) * fx + (d.vel.z - vz0) * fz) * idt, as = (-(d.vel.x - vx0) * fz + (d.vel.z - vz0) * fx) * idt;
    let yr = (d.yaw - yaw0) % TAU; if (yr > Math.PI) yr -= TAU; if (yr < -Math.PI) yr += TAU; yr *= idt;
    const air1 = d.phase === 'fly' || d.phase === 'home' ? 1 : 0;
    d.tiltX = damp(d.tiltX, clamp(vf * 0.008 + af * 0.02, -0.46, 0.52) * air1, 7, dt);
    d.tiltZ = damp(d.tiltZ, clamp(vs * 0.011 + as * 0.02 - yr * 0.2, -0.6, 0.6) * air1, 7, dt);
    const speed = Math.hypot(d.vel.x, d.vel.y, d.vel.z); d.kmh = speed * 3.6;
    if (d.phase === 'fly') d.thr = damp(d.thr, clamp(0.24 + speed / 62 + (Math.abs(af) + Math.abs(as)) * 0.012, 0, 1), 5, dt);
    // indoors: closer camera, smaller-looking drone (it has doors to get through)
    d.inK = damp(d.inK, d.inside ? 1 : 0, 3.2, dt); d.size = lerp(1, 0.62, d.inK);
    if (!camSet) {
      this._chaseCam(d, _t);
      // flying low, the camera stays at about eye height over the ground (not down on the floor) and looks over the drone
      if (air) { const g = air.space(_t.x, Math.min(_t.y, d.pos.y), _t.z, _sp), lo = g.floor + lerp(1.05, 0.55, d.inK); _t.y = clamp(_t.y, lo, Math.max(lo, g.ceil + 0.2)); }
      d.cam.lerp(_t, 1 - Math.exp(-(d.age < 1.2 && d.phase === 'fly' && !this.dock ? 4 : 13) * dt));
      // never behind a wall: the camera comes in front of it, towards the drone
      if (air) { const f = air.sight(d.pos, d.cam); if (f < 1) { const L = d.pos.distanceTo(d.cam); d.cam.sub(d.pos).multiplyScalar(Math.max(0.06, f - 0.14 / Math.max(L, 0.01))).add(d.pos); } }
      cam.position.copy(d.cam);
      const cp = Math.cos(d.pitch), sn = Math.sin(d.pitch); _l2.set(d.cam.x + Math.sin(d.cy) * cp, d.cam.y + sn, d.cam.z + Math.cos(d.cy) * cp); cam.lookAt(_l2);
    }
    this.target.set(d.pos.x + fx * lerp(60, 3, d.inK), 0, d.pos.z + fz * lerp(60, 3, d.inK));
    const fov = (tall ? 62 : 50) + 9 * clamp(speed / 60, 0, 1) + (tall ? 6 : 8) * d.inK;            // the lens opens a little at speed, and indoors
    if (Math.abs(this.fov - fov) > 0.05) { this.fov = damp(this.fov, fov, 3, dt); cam.fov = this.fov; cam.updateProjectionMatrix(); this.onFov && this.onFov(this.fov); }
    const near = lerp(0.4, 0.12, d.inK); if (Math.abs(cam.near - near) > 0.02) { cam.near = near; cam.updateProjectionMatrix(); }
    if (this._sx || this._sy) { cam.clearViewOffset(); this._sx = this._sy = 0; }
    cam.updateMatrixWorld(); this.moved = true; this.speed = speed;
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
      if (this.onDrag && this.onDrag(dx, dy, e)) return;
      if (!active()) return;
      if (this.drone) { this.drone.gy -= dx * 0.0042; this.drone.gp = clamp(this.drone.gp - dy * 0.0036, -1.2, 0.3); return; }
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
      if (this.onWheel && this.onWheel(e.deltaY, e)) { e.preventDefault(); return; }
      if (this.drone) { e.preventDefault(); this.drone.boost = clamp(this.drone.boost * Math.exp(-e.deltaY * 0.001), 0.5, 2); return; }
      if (!this.user || (!this.wheelZoom && !e.ctrlKey)) return;
      e.preventDefault(); this._userTook();
      this.goal.dist *= Math.exp(clamp(e.deltaY, -120, 120) * (e.ctrlKey ? 0.008 : 0.0016));
    }, { passive: false });
    addEventListener('keydown', (e) => { if (e.target && e.target.closest && e.target.closest('input,textarea,select')) return; if (this.room && this.user && /^(Key[WASD]|Arrow(Up|Down))$/.test(e.code)) { this.keys.add(e.code); e.preventDefault(); } if (this.drone) { this.keys.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); } });
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
