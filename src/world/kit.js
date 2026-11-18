// Geometry kit: everything in the model is made of primitives appended into
// a few big "buckets" (one per surface type), so a whole building draws in a handful of calls.
import * as THREE from 'three';

/* ───────────────────────── palette (sRGB hex) ───────────────────────── */
export const C = {
  clay: 0xf3efe8, clayWarm: 0xefe7da, clayCool: 0xe6eaec, roof: 0xe9e6e0, roofDark: 0xcfd2d2,
  poche: 0x12303f, floor: 0xe3e4e0, floorHall: 0xc6ccce, floorLab: 0xe9ebe9, floorStone: 0xebe5d8,
  floorWood: 0xc9a777, carpet: 0x7d98a6, carpetWarm: 0xb9a48a,
  steel: 0xb9c2c9, steelDark: 0x66727c, alu: 0xd5dadd, black: 0x1b2730, rubber: 0x232b31,
  grp: 0xc5d0d6, grpBlue: 0x3d86ab, grpDark: 0x2b5d78, hdpe: 0x19242b, white: 0xfafafa,
  pipeSea: 0x2f82c4, pipeTreat: 0x3fa66b, pipeO2: 0xe9c33b, pipeAir: 0xe9edf0, pipeDrain: 0x7b8790, pipeHot: 0xd9603b,
  wood: 0xc79a5c, woodDark: 0x8c6a42, oak: 0xd4ae77,
  orange: 0xe8862e, orangeDeep: 0xc7641c, teal: 0x0e6e7e, lagoon: 0x35c4c0, ink: 0x0b2b3c,
  asphalt: 0x33383f, brick: 0xa85a43, paving: 0xece6da, pavingDark: 0xd8cfbd, kerb: 0xcfc9bc, sand: 0xdccfb4, sandWet: 0xc4b48c,
  grass: 0x86b765, grassDark: 0x74a857, palm: 0x4d9d57, palmDark: 0x3a8446, trunk: 0x9b7b58, rock: 0x8d8780, rockDark: 0x6d6862,
  glass: 0xa9dbe6, glassDark: 0x35566b, screen: 0x7fe3ee, led: 0xfff2cf, red: 0xd94d3d, green: 0x57b46b, yellow: 0xf0c53c,
  skin: 0xd9a57e, skinDark: 0x8a5a3c, coat: 0xf5f7f8, overall: 0x2f6f9c, hivis: 0xf08a24, navy: 0x1f3a52,
  waterTank: 0x4fb3cf, waterGreen: 0x6fbf7a, waterDeep: 0x1e6f9a, waterBrown: 0x9a8a5a, waterClear: 0x8fd6e6,
  algae1: 0x7ed957, algae2: 0xc9d84a, algae3: 0xd9a441, algae4: 0x4fc38a, algae5: 0x9bd45a, algae6: 0xb8873c, algae7: 0x58b9a8,
};

const _c = new THREE.Color();
const colCache = new Map();
/** sRGB hex → linear rgb triple scaled 0..255 (cached) */
export function lin(hex) {
  let v = colCache.get(hex);
  if (!v) { _c.setHex(hex); v = [Math.round(_c.r * 255), Math.round(_c.g * 255), Math.round(_c.b * 255)]; colCache.set(hex, v); }
  return v;
}
export function shade(hex, f) { _c.setHex(hex); _c.multiplyScalar(f); return _c.getHex(); }
export function mixHex(a, b, t) { const A = new THREE.Color(a), B = new THREE.Color(b); return A.lerp(B, t).getHex(); }

/* ───────────────────────── math helpers ───────────────────────── */
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export function dampAngle(a, b, lambda, dt) {
  let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
  return a + d * (1 - Math.exp(-lambda * dt));
}
/** deterministic random */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ───────────────────────── template geometries ───────────────────────── */
const tplCache = new Map();
function tpl(key, make) {
  let g = tplCache.get(key);
  if (!g) {
    const src = make();
    const idx = src.index ? src.index.array : null;
    g = { pos: src.attributes.position.array, nor: src.attributes.normal.array, idx, n: src.attributes.position.count };
    tplCache.set(key, g);
  }
  return g;
}
const T = {
  box: () => tpl('box', () => new THREE.BoxGeometry(1, 1, 1)),
  cyl: (seg, ratio = 1, open = false) => tpl(`cyl${seg}_${ratio}_${open}`, () => new THREE.CylinderGeometry(ratio, 1, 1, seg, 1, open)),
  cylIn: (seg) => tpl(`cylin${seg}`, () => { const g = new THREE.CylinderGeometry(1, 1, 1, seg, 1, true); flip(g); return g; }),
  sphere: (w, h, phiLen = TAU, thetaLen = Math.PI) => tpl(`sph${w}_${h}_${phiLen}_${thetaLen}`, () => new THREE.SphereGeometry(1, w, h, 0, phiLen, 0, thetaLen)),
  disc: (seg) => tpl(`disc${seg}`, () => { const g = new THREE.CircleGeometry(1, seg); g.rotateX(-Math.PI / 2); return g; }),
  ring: (seg, inner) => tpl(`ring${seg}_${inner}`, () => { const g = new THREE.RingGeometry(inner, 1, seg, 1); g.rotateX(-Math.PI / 2); return g; }),
  torus: (tube, rs, ts, arc = TAU) => tpl(`tor${tube}_${rs}_${ts}_${arc}`, () => { const g = new THREE.TorusGeometry(1, tube, rs, ts, arc); g.rotateX(-Math.PI / 2); return g; }),
  quad: () => tpl('quad', () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; }),
  quadV: () => tpl('quadV', () => new THREE.PlaneGeometry(1, 1)),
  ico: (d) => tpl(`ico${d}`, () => { const g = new THREE.IcosahedronGeometry(1, d); return g.index ? g : toIndexed(g); }),
  cone: (seg) => tpl(`cone${seg}`, () => new THREE.ConeGeometry(1, 1, seg, 1, false)),
};
function flip(g) {
  const idx = g.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t; }
  const n = g.attributes.normal.array; for (let i = 0; i < n.length; i++) n[i] = -n[i];
}
function toIndexed(g) { const n = g.attributes.position.count; const idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1)); return g; }

/* ───────────────────────── bucket ───────────────────────── */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const _n3 = new THREE.Matrix3();

export class Bucket {
  constructor(uvScale = 0) { this.pos = []; this.nor = []; this.col = []; this.idx = []; this.n = 0; this.uvScale = uvScale; }
  /** append a template (or raw arrays) transformed by matrix m, tinted with hex colour */
  put(t, m, hex) {
    const e = m.elements, P = t.pos, N = t.nor, c = lin(hex), base = this.n;
    _n3.getNormalMatrix(m); const ne = _n3.elements;
    const pos = this.pos, nor = this.nor, col = this.col;
    for (let i = 0, l = t.n * 3; i < l; i += 3) {
      const x = P[i], y = P[i + 1], z = P[i + 2];
      pos.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
      const nx = N[i], ny = N[i + 1], nz = N[i + 2];
      let ax = ne[0] * nx + ne[3] * ny + ne[6] * nz, ay = ne[1] * nx + ne[4] * ny + ne[7] * nz, az = ne[2] * nx + ne[5] * ny + ne[8] * nz;
      const il = 1 / (Math.hypot(ax, ay, az) || 1);
      nor.push(ax * il, ay * il, az * il);
      col.push(c[0], c[1], c[2]);
    }
    const I = t.idx, idx = this.idx;
    if (I) for (let i = 0; i < I.length; i++) idx.push(I[i] + base); else for (let i = 0; i < t.n; i++) idx.push(i + base);
    this.n += t.n;
  }
  /** raw triangles in final space: arrays of [x,y,z] verts + per-vertex normals */
  raw(verts, norms, tris, hex) {
    const c = lin(hex), base = this.n;
    for (let i = 0; i < verts.length; i++) { const v = verts[i], n = norms[i]; this.pos.push(v[0], v[1], v[2]); this.nor.push(n[0], n[1], n[2]); this.col.push(c[0], c[1], c[2]); }
    for (let i = 0; i < tris.length; i++) this.idx.push(tris[i] + base);
    this.n += verts.length;
  }
  get empty() { return this.n === 0; }
  toGeometry() {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(this.pos);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.nor), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(this.col), 3, true));
    if (this.uvScale) {
      const uv = new Float32Array(this.n * 2), s = this.uvScale;
      for (let i = 0; i < this.n; i++) { uv[i * 2] = pos[i * 3] * s; uv[i * 2 + 1] = pos[i * 3 + 2] * s; }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    g.setIndex(new THREE.BufferAttribute(this.n > 65535 ? new Uint32Array(this.idx) : new Uint16Array(this.idx), 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    this.pos = this.nor = this.col = this.idx = null;
    return g;
  }
}

/* ───────────────────────── builder ─────────────────────────
   b.use('matte') selects a bucket; primitives take a base-centre position (y = bottom). */
export class Builder {
  constructor() { this.buckets = new Map(); this.cur = null; this.base = new THREE.Matrix4(); this.stack = []; this.use('matte'); }
  use(name) { let b = this.buckets.get(name); if (!b) { b = new Bucket(UV_SCALE[name] || 0); this.buckets.set(name, b); } this.cur = b; this.curName = name; return this; }
  push(x = 0, y = 0, z = 0, ry = 0, s = 1) { this.stack.push(this.base.clone()); _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(s, s, s)); this.base.multiply(_m); return this; }
  pushM(m) { this.stack.push(this.base.clone()); this.base.multiply(m); return this; }
  pop() { this.base.copy(this.stack.pop()); return this; }
  _put(t, x, y, z, sx, sy, sz, rx, ry, rz, hex) {
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
    _m.premultiply(this.base);
    this.cur.put(t, _m, hex);
  }
  /** box sitting on y */
  box(hex, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { this._put(T.box(), x, y + h / 2, z, w, h, d, rx, ry, rz, hex); return this; }
  /** a flat picture facing +z (monitor, wall display, printed panel): remembered for screens.js, which draws what is on it. y is its bottom edge. */
  screen(tile, w, h, x, y, z, ry = 0, rx = 0, crop = null) {
    if (!this.scr) return this;
    _m.compose(_p.set(x, y + h / 2, z), _q.setFromEuler(_e.set(rx, ry, 0, 'YXZ')), _s.set(1, 1, 1)).premultiply(this.base);
    const p = []; for (const [cx, cy] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) { _p.set(cx, cy, 0).applyMatrix4(_m); p.push(_p.x, _p.y, _p.z); }
    this.scr.push({ tile, p, crop }); return this;            // crop: [top, bottom] as fractions of the tile's height, to show only a band of it
  }
  /** somewhere to sit (kind 'desk' or 'chair'), facing ry: remembered so people can be seated there */
  seat(kind, x, y, z, ry = 0) {
    if (!this.seats) return this; const e = this.base.elements, s = Math.sin(ry), c = Math.cos(ry), dx = e[0] * s + e[8] * c, dz = e[2] * s + e[10] * c;
    this.seats.push({ kind, x: e[0] * x + e[8] * z + e[12], y, z: e[2] * x + e[10] * z + e[14], ry: Math.atan2(dx, dz) }); return this;
  }
  /** box centred */
  boxC(hex, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { this._put(T.box(), x, y, z, w, h, d, rx, ry, rz, hex); return this; }
  /** vertical cylinder / frustum sitting on y. rTop may differ */
  cyl(hex, r, h, x, y, z, seg = 24, rTop = r, open = false) {
    const ratio = Math.round((rTop / r) * 1000) / 1000;
    this._put(T.cyl(seg, ratio, open), x, y + h / 2, z, r, h, r, 0, 0, 0, hex); return this;
  }
  /** cylinder between two points (pipes) */
  rod(hex, r, a, b, seg = 10) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz); if (len < 1e-4) return this;
    _q.setFromUnitVectors(_p.set(0, 1, 0), _s.set(dx / len, dy / len, dz / len));
    _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(r, len, r));
    _m.premultiply(this.base); this.cur.put(T.cyl(seg, 1, false), _m, hex); return this;
  }
  /** pipe run through points with ball joints */
  pipe(hex, r, pts, seg = 10) {
    for (let i = 0; i < pts.length - 1; i++) this.rod(hex, r, pts[i], pts[i + 1], seg);
    for (let i = 1; i < pts.length - 1; i++) this.ball(hex, r * 1.12, pts[i][0], pts[i][1], pts[i][2], 8, 6);
    return this;
  }
  cylIn(hex, r, h, x, y, z, seg = 24) { this._put(T.cylIn(seg), x, y + h / 2, z, r, h, r, 0, 0, 0, hex); return this; }
  ball(hex, r, x, y, z, w = 14, h = 10, sy = 1) { this._put(T.sphere(w, h), x, y, z, r, r * sy, r, 0, 0, 0, hex); return this; }
  dome(hex, r, x, y, z, w = 20, h = 8, sy = 1) { this._put(T.sphere(w, h, TAU, Math.PI / 2), x, y, z, r, r * sy, r, 0, 0, 0, hex); return this; }
  ico(hex, r, x, y, z, sy = 1, ry = 0, d = 0) { this._put(T.ico(d), x, y, z, r, r * sy, r, 0, ry, 0, hex); return this; }
  cone(hex, r, h, x, y, z, seg = 16) { this._put(T.cone(seg), x, y + h / 2, z, r, h, r, 0, 0, 0, hex); return this; }
  disc(hex, r, x, y, z, seg = 28, sz = 1) { this._put(T.disc(seg), x, y, z, r, 1, r * sz, 0, 0, 0, hex); return this; }
  ring(hex, r, rIn, x, y, z, seg = 32) { this._put(T.ring(seg, Math.round((rIn / r) * 1000) / 1000), x, y, z, r, 1, r, 0, 0, 0, hex); return this; }
  torus(hex, r, tube, x, y, z, rs = 8, ts = 40, arc = TAU, ry = 0) { this._put(T.torus(Math.round((tube / r) * 1000) / 1000, rs, ts, arc), x, y, z, r, r, r, 0, ry, 0, hex); return this; }
  /** flat rectangle lying on y */
  quad(hex, w, d, x, y, z, ry = 0) { this._put(T.quad(), x, y, z, w, 1, d, 0, ry, 0, hex); return this; }
  /** vertical rectangle facing +z (before ry) */
  quadV(hex, w, h, x, y, z, ry = 0, rx = 0) { this._put(T.quadV(), x, y + h / 2, z, w, h, 1, rx, ry, 0, hex); return this; }

  /** extruded polygon. pts = [[x,z],...] (any winding), y0..y1. smooth: soften side normals on gentle corners */
  prism(hex, pts, y0, y1, { smoothSides = true, cap = true, bottom = false, sides = true } = {}) {
    const n = pts.length; if (n < 3) return this;
    // ensure counter-clockwise when seen from above (x right, z towards viewer)
    let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    const P = area < 0 ? pts.slice().reverse() : pts; // now area > 0 → clockwise seen from +y? handled by normals below
    const verts = [], norms = [], tris = [];
    if (sides) {
      const en = []; // outward edge normals
      for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; en.push([dz / l, -dx / l]); }
      for (let i = 0; i < n; i++) {
        const a = P[i], b = P[(i + 1) % n], e = en[i], ep = en[(i - 1 + n) % n], enx = en[(i + 1) % n];
        let na = e, nb = e;
        if (smoothSides) {
          if (e[0] * ep[0] + e[1] * ep[1] > 0.86) { const x = e[0] + ep[0], z = e[1] + ep[1], l = Math.hypot(x, z); na = [x / l, z / l]; }
          if (e[0] * enx[0] + e[1] * enx[1] > 0.86) { const x = e[0] + enx[0], z = e[1] + enx[1], l = Math.hypot(x, z); nb = [x / l, z / l]; }
        }
        const k = verts.length;
        verts.push([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]);
        norms.push([na[0], 0, na[1]], [nb[0], 0, nb[1]], [nb[0], 0, nb[1]], [na[0], 0, na[1]]);
        tris.push(k, k + 2, k + 1, k, k + 3, k + 2);
      }
    }
    if (cap || bottom) {
      const contour = P.map((p) => new THREE.Vector2(p[0], p[1]));
      const faces = THREE.ShapeUtils.triangulateShape(contour, []);
      if (cap) { const k = verts.length; for (const p of P) { verts.push([p[0], y1, p[1]]); norms.push([0, 1, 0]); } for (const f of faces) tris.push(k + f[0], k + f[2], k + f[1]); }
      if (bottom) { const k = verts.length; for (const p of P) { verts.push([p[0], y0, p[1]]); norms.push([0, -1, 0]); } for (const f of faces) tris.push(k + f[0], k + f[1], k + f[2]); }
    }
    this._raw(verts, norms, tris, hex); return this;
  }
  _raw(verts, norms, tris, hex) {
    const e = this.base.elements; _n3.getNormalMatrix(this.base); const ne = _n3.elements;
    const V = verts.map((v) => [e[0] * v[0] + e[4] * v[1] + e[8] * v[2] + e[12], e[1] * v[0] + e[5] * v[1] + e[9] * v[2] + e[13], e[2] * v[0] + e[6] * v[1] + e[10] * v[2] + e[14]]);
    const N = norms.map((v) => { const x = ne[0] * v[0] + ne[3] * v[1] + ne[6] * v[2], y = ne[1] * v[0] + ne[4] * v[1] + ne[7] * v[2], z = ne[2] * v[0] + ne[5] * v[1] + ne[8] * v[2], l = 1 / (Math.hypot(x, y, z) || 1); return [x * l, y * l, z * l]; });
    this.cur.raw(V, N, tris, hex);
  }
  /** ring sector slab (angles in radians, 0 = +x, increasing towards +z) */
  sector(hex, r0, r1, a0, a1, y0, y1, opts) { return this.prism(hex, sectorPts(r0, r1, a0, a1), y0, y1, opts); }
  /** arc wall: thin sector */
  arcWall(hex, r, a0, a1, thick, y0, y1, cx = 0, cz = 0) {
    const pts = sectorPts(r - thick / 2, r + thick / 2, a0, a1).map((p) => [p[0] + cx, p[1] + cz]);
    return this.prism(hex, pts, y0, y1);
  }
  /** straight wall segment between two points (xz), thickness t, y0..y1 */
  wall(hex, x0, z0, x1, z1, t, y0, y1) {
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz); if (len < 1e-3) return this;
    this.box(hex, len, y1 - y0, t, (x0 + x1) / 2, y0, (z0 + z1) / 2, -Math.atan2(dz, dx)); return this;
  }
  /** lathe: profile [[r,y],...] revolved (smooth) */
  lathe(hex, profile, x, y, z, seg = 24, sx = 1, sz = 1) {
    const verts = [], norms = [], tris = [], m = profile.length;
    for (let i = 0; i < m; i++) {
      const p = profile[i], a = profile[Math.max(0, i - 1)], b = profile[Math.min(m - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; // tangent → normal (ty,-tx)
      for (let j = 0; j <= seg; j++) { const th = (j / seg) * TAU, cs = Math.cos(th), sn = Math.sin(th); verts.push([x + p[0] * cs * sx, y + p[1], z + p[0] * sn * sz]); norms.push([ty * cs, -tx, ty * sn]); }
    }
    for (let i = 0; i < m - 1; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; tris.push(a, b, a + 1, a + 1, b, b + 1); }
    this._raw(verts, norms, tris, hex); return this;
  }
  /** flat ribbon along a polyline (roads, paths) at height y */
  ribbon(hex, pts, width, y, closed = false) {
    const out = offsetPolyline(pts, width / 2, closed), inn = offsetPolyline(pts, -width / 2, closed);
    const verts = [], norms = [], tris = [], n = pts.length;
    for (let i = 0; i < n; i++) { verts.push([out[i][0], y, out[i][1]], [inn[i][0], y, inn[i][1]]); norms.push([0, 1, 0], [0, 1, 0]); }
    const m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) { const a = i * 2, b = ((i + 1) % n) * 2; tris.push(a, a + 1, b, b, a + 1, b + 1); }
    // make winding face up regardless of direction
    this._rawUp(verts, norms, tris, hex); return this;
  }
  _rawUp(verts, norms, tris, hex) {
    for (let i = 0; i < tris.length; i += 3) {
      const a = verts[tris[i]], b = verts[tris[i + 1]], c = verts[tris[i + 2]];
      const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      if (ny < 0) { const t = tris[i + 1]; tris[i + 1] = tris[i + 2]; tris[i + 2] = t; }
    }
    this._raw(verts, norms, tris, hex);
  }
  /** flat polygon facing up */
  poly(hex, pts, y) { return this.prism(hex, pts, y, y, { sides: false, cap: true }); }

  /** finish: returns a Group of merged meshes using the shared material set (and the door leaves, one instanced mesh per material) */
  build(mats, { cast = true, receive = true, name = '' } = {}) {
    const g = new THREE.Group(); g.name = name;
    if (this.leaves && this.leaves.length) { g.userData.doors = buildLeaves(this.leaves, mats, cast, receive, g); this.leaves = []; }
    for (const [key, b] of this.buckets) {
      if (b.empty) continue;
      const mat = mats[key]; if (!mat) { console.warn('no material', key); continue; }
      const mesh = new THREE.Mesh(b.toGeometry(), mat);
      mesh.name = key; mesh.matrixAutoUpdate = false;
      const transparent = key === 'glass' || key === 'water' || key === 'glow' || key === 'decal';
      mesh.castShadow = cast && !transparent && key !== 'pane'; mesh.receiveShadow = receive && key !== 'glow' && key !== 'pane';
      if (key === 'glass') mesh.renderOrder = 3; if (key === 'water') mesh.renderOrder = 2;
      g.add(mesh);
    }
    this.buckets.clear();
    return g;
  }
}
const UV_SCALE = { water: 0.11, floorTile: 1, paving: 1, asphalt: 1, ground: 1, concrete: 1 };

/* ───── door leaves: each builder's doors are one instanced mesh per material, so every door can open on its own ───── */
const _lm = new THREE.Matrix4(), _lq = new THREE.Quaternion(), _lp = new THREE.Vector3(), _ls = new THREE.Vector3(), _ly = new THREE.Vector3(0, 1, 0);
let leafGeo = null;
function buildLeaves(list, mats, cast, receive, g) {
  if (!leafGeo) { leafGeo = new THREE.BoxGeometry(1, 1, 1); leafGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(leafGeo.attributes.position.count * 3).fill(1), 3)); }
  const byKey = new Map(); for (const d of list) { if (!byKey.has(d.key)) byKey.set(d.key, []); byKey.get(d.key).push(d); }
  for (const [key, ds] of byKey) {
    const mat = mats[key]; if (!mat) continue;
    const n = ds.reduce((a, d) => a + d.n, 0), mesh = new THREE.InstancedMesh(leafGeo, mat, n); mesh.name = 'doors-' + key;
    mesh.castShadow = cast && key !== 'window'; mesh.receiveShadow = receive;
    let i = 0; for (const d of ds) { d.mesh = mesh; d.i = i; i += d.n; if (mat.vertexColors) for (let k = 0; k < d.n; k++) mesh.setColorAt(d.i + k, _c.setHex(d.hex)); placeLeaf(d); }
    mesh.computeBoundingSphere(); g.add(mesh);
  }
  return list;
}
/** put a door's leaf (or leaves) where `open` says: a shutter rolls up into its head, a door slides into the wall, a pair parts */
export function placeLeaf(d) {
  const dx = d.x1 - d.x0, dz = d.z1 - d.z0, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len, k = Math.min(1, Math.max(0, d.open)), ry = -Math.atan2(dz, dx);
  _lq.setFromAxisAngle(_ly, ry);
  const put = (j, cx, cz, w, y0, y1) => {
    if (w < 0.01 || y1 - y0 < 0.01) _lm.makeScale(0, 0, 0);
    else _lm.compose(_lp.set(cx, (y0 + y1) / 2, cz), _lq, _ls.set(w, y1 - y0, d.t));
    d.mesh.setMatrixAt(d.i + j, _lm);
  };
  const mx = (d.x0 + d.x1) / 2, mz = (d.z0 + d.z1) / 2;
  if (d.kind === 'roll') put(0, mx, mz, len, d.y0 + (d.y1 - d.y0) * k * 0.985, d.y1);
  else if (d.kind === 'slide') { const s = -len * 0.97 * k; put(0, mx + ux * s, mz + uz * s, len, d.y0, d.y1); }
  else { const h = len / 2, s = h * 0.96 * k, o = 0.1; for (const j of [0, 1]) { const sg = j ? 1 : -1, c = sg * (h / 2 + s); put(j, mx + ux * c - uz * o, mz + uz * c + ux * o, h, d.y0, d.y1); } }
  d.mesh.instanceMatrix.needsUpdate = true;
}

export function sectorPts(r0, r1, a0, a1, step = 4 * DEG) {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step)), pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push([Math.cos(a) * r1, Math.sin(a) * r1]); }
  if (r0 > 0.001) for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; pts.push([Math.cos(a) * r0, Math.sin(a) * r0]); }
  else pts.push([0, 0]);
  return pts;
}
export function arcPts(r, a0, a1, cx = 0, cz = 0, step = 4 * DEG) {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step)), pts = [];
  const full = Math.abs(Math.abs(a1 - a0) - TAU) < 1e-6;      // a full circle: don't repeat the first point
  for (let i = 0; i <= (full ? n - 1 : n); i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return pts;
}
export function offsetPolyline(pts, d, closed) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let d1x = p[0] - a[0], d1z = p[1] - a[1], d2x = b[0] - p[0], d2z = b[1] - p[1];
    let l1 = Math.hypot(d1x, d1z), l2 = Math.hypot(d2x, d2z);
    if (l1 < 1e-6) { d1x = d2x; d1z = d2z; l1 = l2; } if (l2 < 1e-6) { d2x = d1x; d2z = d1z; l2 = l1; }
    d1x /= l1; d1z /= l1; d2x /= l2; d2z /= l2;
    let nx = -(d1z + d2z), nz = d1x + d2x; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    const cosHalf = Math.max(0.35, nx * -d1z + nz * d1x);
    out.push([p[0] + (nx * d) / cosHalf, p[1] + (nz * d) / cosHalf]);
  }
  return out;
}
/** rounded rectangle outline */
export function roundRect(x0, z0, x1, z1, r, seg = 6) {
  const pts = []; r = Math.min(r, (x1 - x0) / 2, (z1 - z0) / 2);
  const corner = (cx, cz, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
  corner(x1 - r, z1 - r, 0); corner(x0 + r, z1 - r, Math.PI / 2); corner(x0 + r, z0 + r, Math.PI); corner(x1 - r, z0 + r, Math.PI * 1.5);
  return pts;
}
/** smooth a polyline with Catmull-Rom */
export function smoothPath(pts, per = 6, closed = false) {
  const v = pts.map((p) => new THREE.Vector3(p[0], 0, p[1]));
  const c = new THREE.CatmullRomCurve3(v, closed, 'centripetal');
  return c.getPoints(pts.length * per).map((p) => [p.x, p.z]);
}

/* ───────────────────────── canvas textures ───────────────────────── */
/**
 * A photo made ready for the graphics card off the main thread. Chrome decodes it into a bitmap the right way up and with its
 * alpha as WebGL wants it, so sending it is a plain copy (an ordinary image is decoded and flipped again during the upload,
 * inside a frame: 30 to 60 ms for a big one). Other browsers get the decoded image. Resolves to { image, flipY } (the value
 * a texture needs for that kind of picture), or null if it did not load.
 */
export async function loadPhoto(url) {
  try {
    if (window.chrome && window.createImageBitmap) return { image: await createImageBitmap(await (await fetch(url)).blob(), { imageOrientation: 'flipY', premultiplyAlpha: 'none' }), flipY: false };
    const img = new Image(); img.src = url; await img.decode(); return { image: img, flipY: true };
  } catch (e) { return null; }
}
export function canvasTex(w, h, draw, { repeat = true, aniso = 8, srgb = true } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
