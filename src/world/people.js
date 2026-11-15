// People who move: they walk their aisles with a real stride, stop to check a tank, lean in and work
// with their hands, sit at a desk, or stand and look around.
// Close to the camera each one is a real rigged figure (avatars.js). Far away, where a person is a few pixels tall,
// the whole group is seven instanced draw calls of simple parts.
import * as THREE from 'three';
import { Builder, rng, TAU, C } from './kit.js';
import { avatars, CAST } from './avatars.js';

export const WEAR = {
  coat: 0x9fd0ee, gown: 0x9fd0ee, lab: 0xf6f8f9, overall: 0x2f6f9c, hivis: 0xf08a24, kandura: 0xfbfbf9, emirati: 0xfbfbf9, host: 0xfbfbf9, abaya: 0x17171a,
  // most visitors are Emirati: white kandura and ghutra, black abaya and shayla
  visitor: [0xfbfbf9, 0x17171a, 0xe8862e, 0xfbfbf9, 0x35a7a3, 0x17171a, 0x4a6fa5, 0xfbfbf9, 0xd65d5d, 0x17171a], office: [0xe9ecef, 0x9fb3c1, 0x33526b, 0xf2efe9],
};
const HAIR = [0x2a2420, 0x3b2c22, 0x1c1a19, 0x5a4636, 0x15130f];
export function wearFor(kind, R) { const v = WEAR[kind]; return Array.isArray(v) ? v[Math.floor(R() * v.length)] : v ?? 0xffffff; }

function geoOf(build) { const b = new Builder(); build(b); return b.buckets.get('matte').toGeometry(); }
let G = null;
function parts() {
  if (G) return G;
  G = {
    torso: geoOf((b) => { b.cyl(0xffffff, 0.185, 0.54, 0, -0.02, 0, 10, 0.2); b.ball(0xffffff, 0.205, 0, 0.51, 0, 10, 6, 0.4); }),
    head: geoOf((b) => { b.cyl(C.skin, 0.052, 0.12, 0, 0, 0, 6); b.ball(C.skin, 0.122, 0, 0.215, 0, 12, 9); b.box(0x2a2420, 0.04, 0.03, 0.03, 0.05, 0.23, 0.108); b.box(0x2a2420, 0.04, 0.03, 0.03, -0.05, 0.23, 0.108); }),
    cap: geoOf((b) => { b.dome(0xffffff, 0.13, 0, 0.228, -0.006, 12, 6, 1.02); }),
    arm: geoOf((b) => { b.cyl(0xffffff, 0.048, 0.56, 0, -0.56, 0, 6, 0.062); b.ball(0xffffff, 0.066, 0, 0, 0, 6, 5); }),
    hand: geoOf((b) => { b.ball(C.skin, 0.058, 0, -0.6, 0, 6, 5); }),
    leg: geoOf((b) => { b.cyl(0xffffff, 0.078, 0.8, 0, -0.8, 0, 8, 0.1); b.box(0x8a8a88, 0.13, 0.08, 0.27, 0, -0.87, 0.05); }),
  };
  return G;
}

const _m = new THREE.Matrix4(), _b = new THREE.Matrix4(), _t = new THREE.Matrix4(), _r = new THREE.Matrix4(), _c = new THREE.Color();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _inv = new THREE.Matrix4(), _cl = new THREE.Vector3(), GONE = new THREE.Matrix4().makeScale(0, 0, 0);
const SEATED = { sit: 1, desk: 1 }, STAFF = { coat: 1, lab: 1, gown: 1, overall: 1, hivis: 1 }, VISIT = { visitor: 1, kandura: 1, emirati: 1, abaya: 1, host: 1 };
const compose = (out, x, y, z, rx, ry, rz) => out.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(1, 1, 1));
const turn = (a, b, k) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return a + d * k; };

/**
 * list: [{ x, z, ry, hex, s, y, kind, mode, path, loop, speed, legs, cap }]
 *   mode 'work'  stands at a spot, leans in and works with both hands
 *        'idle'  stands, shifts weight, looks round
 *        'talk'  stands and gestures
 *        'walk'  follows `path` [[x,z],...] (there and back, or round and round with loop), pausing to work at the ends
 *        'sit' on a seat, 'desk' seated at a table, 'present' showing something, 'check' reading a clipboard, 'watch' looking on
 *   cast: which figures may play this person (a key of CAST); otherwise worked out from kind and colour
 */
export function createPeople(mats, list, { y = 0.07, seed = 1, cast = true } = {}) {
  const P = parts(), R = rng(seed * 31 + list.length), n = list.length;
  const mk = (geo, mat, count, tint) => { const m = new THREE.InstancedMesh(geo, mat, count); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = cast; m.receiveShadow = false; m.userData.tint = tint; return m; };
  const torso = mk(P.torso, mats.cloth, n, 1), head = mk(P.head, mats.matte, n), cap = mk(P.cap, mats.cloth, n, 1);
  const arms = mk(P.arm, mats.cloth, n * 2, 1), hands = mk(P.hand, mats.matte, n * 2), legs = mk(P.leg, mats.cloth, n * 2, 1);
  hands.castShadow = false; cap.castShadow = false;
  const st = list.map((o, i) => {
    const kind = o.kind || 'visitor', hex = o.hex ?? wearFor(kind, R);
    const gown = hex === WEAR.gown, robe = hex === WEAR.kandura, abaya = hex === WEAR.abaya;
    torso.setColorAt(i, _c.setHex(hex)); arms.setColorAt(i * 2, _c); arms.setColorAt(i * 2 + 1, _c);
    legs.setColorAt(i * 2, _c.setHex(o.legs ?? (robe ? 0xf4f4f0 : abaya ? 0x141416 : gown ? 0xb5d9ee : kind === 'office' || kind === 'visitor' ? [0x27333d, 0x3b4654, 0x6b6257, 0x1f2a36][Math.floor(R() * 4)] : 0x27333d))); legs.setColorAt(i * 2 + 1, _c);
    cap.setColorAt(i, _c.setHex(o.cap ?? (gown ? 0x7fbce4 : kind === 'hivis' ? 0xf6f6f2 : kind === 'overall' ? 0x2a5c7d : robe ? 0xfbfbf9 : abaya ? 0x141416 : HAIR[Math.floor(R() * HAIR.length)])));
    const s = { o, kind, x: o.x, z: o.z, h: o.ry || 0, gh: o.ry || 0, y: o.y ?? y, sc: o.s || 1, ph: R() * TAU, k: R(), mode: o.mode || (VISIT[kind] ? 'idle' : 'work'), stride: 0, wait: 0, moving: false, av: null };
    const child = s.sc < 0.86, pool = CAST[o.cast || (child ? 'child' : gown || kind === 'coat' ? 'gown' : robe ? 'emirati' : abaya ? 'abaya' : kind)] || CAST.visitor;
    s.type = pool[Math.floor(R() * pool.length)]; s.asc = child ? 0.9 + R() * 0.12 : 0.97 + R() * 0.06;
    if (o.path && o.path.length > 1) {
      const pts = o.path, segs = []; let total = 0; const m = o.loop ? pts.length : pts.length - 1;
      for (let j = 0; j < m; j++) { const a = pts[j], c = pts[(j + 1) % pts.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]); if (l < 0.01) continue; segs.push({ a, c, l, s: total }); total += l; }
      s.segs = segs; s.total = total; s.d = (o.off ?? R()) * total; s.dir = R() < 0.5 && !o.loop ? -1 : 1; s.sp = (o.speed || 1.25) * (0.9 + R() * 0.2); s.mode = 'walk'; s.pause = o.pause ?? 2.5;
    }
    return s;
  });
  for (const m of [torso, cap, arms, legs]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
  const group = new THREE.Group(); group.name = 'people'; group.add(torso, head, cap, arms, hands, legs);

  function update(dt, t) {
    const av = avatars, real = av.on && !!av.cam;
    if (real) { _inv.copy(group.matrixWorld).invert(); _cl.copy(av.cam.position).applyMatrix4(_inv); }
    for (let i = 0; i < n; i++) {
      const s = st[i]; let lean = 0, bob = 0, la = 0, ra = 0, ll = 0, rl = 0, spread = 0.06, yaw = 0, hx = 0;
      if (s.segs) {
        if (s.wait > 0) { s.wait -= dt; s.moving = false; }
        else {
          s.d += s.sp * dt * s.dir; s.moving = true;
          if (s.o.loop) s.d = ((s.d % s.total) + s.total) % s.total;
          else if (s.d >= s.total) { s.d = s.total; s.dir = -1; s.wait = s.pause * (0.6 + s.k * 1.2); }
          else if (s.d <= 0) { s.d = 0; s.dir = 1; s.wait = s.pause * (0.6 + s.k * 1.2); }
          s.stride += s.sp * dt * 4.4;
        }
        let sg = s.segs[s.segs.length - 1]; for (const q of s.segs) if (s.d >= q.s && s.d <= q.s + q.l) { sg = q; break; }
        const k = (s.d - sg.s) / sg.l; s.x = sg.a[0] + (sg.c[0] - sg.a[0]) * k; s.z = sg.a[1] + (sg.c[1] - sg.a[1]) * k;
        if (s.moving) s.gh = Math.atan2((sg.c[0] - sg.a[0]) * s.dir, (sg.c[1] - sg.a[1]) * s.dir);
        s.h = turn(s.h, s.gh, Math.min(1, dt * 7));
      }
      const w = t * 1.0 + s.ph;
      if (s.moving) {
        const sw = Math.sin(s.stride); ll = sw * 0.52; rl = -sw * 0.52; la = -sw * 0.42; ra = sw * 0.42; bob = Math.abs(Math.cos(s.stride)) * 0.035; lean = 0.05;
      } else if (s.mode === 'work' || s.segs) {
        // reaching into a tank, turning a valve, writing on a board: both hands busy, weight shifting
        const a = Math.sin(w * 1.7), c = Math.sin(w * 0.43 + 1.3);
        lean = 0.17 + 0.07 * c; la = -1.05 - 0.28 * a - 0.2 * c; ra = -0.92 + 0.3 * a - 0.15 * c; spread = -0.08; bob = -0.02 + 0.012 * c; hx = Math.sin(w * 0.21) * 0.12; yaw = Math.sin(w * 0.33) * 0.16;
      } else if (s.mode === 'talk') {
        const a = Math.sin(w * 2.1); lean = 0.03; la = -0.5 - 0.35 * Math.max(0, a); ra = -0.18 - 0.4 * Math.max(0, -a) * (s.k > 0.5 ? 1 : 0.3); yaw = Math.sin(w * 0.5) * 0.22; bob = Math.sin(w * 0.9) * 0.006;
      } else {
        const c = Math.sin(w * 0.37); yaw = Math.sin(w * 0.23) * 0.5; lean = 0.02 + 0.015 * c; la = -0.06 + 0.05 * c; ra = s.k > 0.6 ? -0.9 - 0.25 * Math.sin(w * 0.8) : -0.05 - 0.05 * c; bob = Math.sin(w * 0.8) * 0.006;
      }
      // near the camera: the real figure takes over from the simple one
      let shown = false;
      if (real) {
        const dx = s.x - _cl.x, dy = s.y + 1 - _cl.y, dz = s.z - _cl.z, d2 = dx * dx + dy * dy + dz * dz, r = av.range * (s.av && s.on ? 1.12 : 1);
        if (d2 < r * r) {
          const T = av.type(s.type);
          if (T) {
            if (!s.av) { s.av = av.spawn(T, cast); s.av.seed = s.k; group.add(s.av.root); }
            const a = s.av; shown = true; av.shown++;
            a.root.visible = dx * dx + dz * dz > 1.5 || Math.abs(dy) > 1.7;        // never fill the lens with the back of a head
            a.root.position.set(s.x, s.y, s.z); a.root.rotation.y = s.h; a.root.scale.setScalar(s.asc);
            const act = s.moving ? (s.sp < 0.98 ? 'stroll' : 'walk') : s.segs ? (STAFF[s.kind] ? 'check' : 'watch') : s.mode;
            av.pose(a, av.clipFor(T, act, s.k), dt, s.moving ? s.sp * dt : -1, s.asc);
          }
        }
      }
      s.on = shown;
      if (shown) { torso.setMatrixAt(i, GONE); head.setMatrixAt(i, GONE); cap.setMatrixAt(i, GONE); for (const m of [arms, hands, legs]) { m.setMatrixAt(i * 2, GONE); m.setMatrixAt(i * 2 + 1, GONE); } continue; }
      if (s.av) s.av.root.visible = false;
      const sc = s.sc; if (SEATED[s.mode]) bob -= 0.42;
      // body frame at the feet
      _b.compose(_p.set(s.x + Math.cos(s.h) * hx, s.y, s.z - Math.sin(s.h) * hx), _q.setFromEuler(_e.set(0, s.h + yaw * 0.35, 0)), _s.set(sc, sc, sc));
      compose(_t, 0, 0.86 + bob, 0, lean, yaw * 0.3, 0); _t.premultiply(_b); torso.setMatrixAt(i, _t);
      compose(_m, 0, 0.6, 0, -lean * 0.6, yaw * 0.5, 0); _m.premultiply(_t); head.setMatrixAt(i, _m); cap.setMatrixAt(i, _m);
      compose(_m, 0.255, 0.5, 0, la, 0, spread); _m.premultiply(_t); arms.setMatrixAt(i * 2, _m); hands.setMatrixAt(i * 2, _m);
      compose(_m, -0.255, 0.5, 0, ra, 0, -spread); _m.premultiply(_t); arms.setMatrixAt(i * 2 + 1, _m); hands.setMatrixAt(i * 2 + 1, _m);
      compose(_m, 0.1, 0.87 + bob, 0, ll, 0, 0); _m.premultiply(_b); legs.setMatrixAt(i * 2, _m);
      compose(_m, -0.1, 0.87 + bob, 0, rl, 0, 0); _m.premultiply(_b); legs.setMatrixAt(i * 2 + 1, _m);
    }
    for (const m of [torso, head, cap, arms, hands, legs]) m.instanceMatrix.needsUpdate = true;
  }
  update(0, 0);
  return { group, update, n, state: st };
}

/* ───── vehicles that drive ───── */
/** cars following closed loops or there-and-back routes: [{ pts, n, speed, hex }] */
export function createTraffic(mats, routes, y = 0.08) {
  const b = new Builder();
  b.use('matte').box(0xffffff, 4.3, 0.62, 1.78, 0, 0.3, 0); b.box(0xffffff, 2.3, 0.56, 1.6, -0.25, 0.92, 0);
  const body = b.buckets.get('matte').toGeometry();
  const b2 = new Builder();
  b2.use('matte').box(0x1d2a33, 2.34, 0.4, 1.63, -0.25, 0.98, 0); for (const sx of [-1.35, 1.35]) for (const sz of [-0.85, 0.85]) b2.rod(0x1b2025, 0.33, [sx, 0.33, sz - 0.1], [sx, 0.33, sz + 0.1], 10);
  b2.box(0xfff3c4, 0.06, 0.14, 0.4, 2.14, 0.6, 0.55); b2.box(0xfff3c4, 0.06, 0.14, 0.4, 2.14, 0.6, -0.55); b2.box(0xd9322a, 0.06, 0.12, 0.4, -2.14, 0.62, 0.55); b2.box(0xd9322a, 0.06, 0.12, 0.4, -2.14, 0.62, -0.55);
  const trim = b2.buckets.get('matte').toGeometry();
  const cars = [];
  routes.forEach((r, ri) => {
    const segs = []; let total = 0; const pts = r.pts, m = r.loop === false ? pts.length - 1 : pts.length;
    for (let j = 0; j < m; j++) { const a = pts[j], c = pts[(j + 1) % pts.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]); if (l < 0.01) continue; segs.push({ a, c, l, s: total }); total += l; }
    for (let k = 0; k < (r.n || 1); k++) cars.push({ segs, total, d: ((k + 0.37 * ri) / (r.n || 1)) * total, sp: (r.speed || 8) * (0.85 + 0.3 * ((k * 7 + ri * 3) % 5) / 5), hex: (r.hex || [0xf4f4f2, 0xd9dde0, 0x33414c, 0x8f1f24, 0x2a5c7d, 0xb9bfc4])[(k + ri) % 6], lane: r.lane ?? 2.4, loop: r.loop !== false, dir: 1, h: 0 });
  });
  const n = cars.length, A = new THREE.InstancedMesh(body, mats.satin, n), B = new THREE.InstancedMesh(trim, mats.matte, n);
  cars.forEach((c, i) => A.setColorAt(i, _c.setHex(c.hex))); if (A.instanceColor) A.instanceColor.needsUpdate = true;
  for (const m of [A, B]) { m.frustumCulled = false; m.castShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
  const group = new THREE.Group(); group.name = 'traffic'; group.add(A, B);
  const update = (dt) => {
    for (let i = 0; i < n; i++) {
      const c = cars[i]; c.d += c.sp * dt * c.dir;
      if (c.loop) c.d = ((c.d % c.total) + c.total) % c.total; else if (c.d > c.total) { c.d = c.total; c.dir = -1; } else if (c.d < 0) { c.d = 0; c.dir = 1; }
      let sg = c.segs[c.segs.length - 1]; for (const q of c.segs) if (c.d >= q.s && c.d <= q.s + q.l) { sg = q; break; }
      const k = (c.d - sg.s) / sg.l, ux = ((sg.c[0] - sg.a[0]) / sg.l) * c.dir, uz = ((sg.c[1] - sg.a[1]) / sg.l) * c.dir;
      const gh = Math.atan2(-uz, ux); c.h = turn(c.h, gh, Math.min(1, dt * 5));
      // keep to the right-hand lane
      _m.compose(_p.set(sg.a[0] + (sg.c[0] - sg.a[0]) * k - uz * c.lane, y, sg.a[1] + (sg.c[1] - sg.a[1]) * k + ux * c.lane), _q.setFromEuler(_e.set(0, c.h, 0)), _s.set(1, 1, 1));
      A.setMatrixAt(i, _m); B.setMatrixAt(i, _m);
    }
    A.instanceMatrix.needsUpdate = true; B.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { group, update };
}
