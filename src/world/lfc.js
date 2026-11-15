// LFC Hamour: the live fish carrier (well-boat) owned and run by Jalboot Marine Network, the first in the GCC.
// Made in code from the vessel specification (principal dimensions, GA profile and deck plans) and photographs.
// Local metres: bow towards +x, centreline z = 0, waterline y = 0. +z is the port side.
import * as THREE from 'three';
import { Builder, C, DEG, canvasTex, clamp, rng } from './kit.js';

/* ───── principal dimensions (vessel specification) ───── */
const XS = -15.95, XB = 15.95;              // transom and stem: 31.90 m overall
const HB = 7.0;                              // half of the 14.00 m moulded beam
const KEEL = -3.85;                          // 3.80 m draft plus the keel bar
const BILGE = 1.3;
const DECK = 0.95, BUL = 1.9, UP = 4.4;      // main deck, top of the aft bulwark, upper (forecastle) deck
const STEP0 = -0.2, STEP1 = 2.2, FC = 5.0;   // the side plating steps up between STEP0 and STEP1, to FC
const UPAFT = 1.8, HOUSE = 2.6;              // aft edge of the upper deck, aft wall of the main-deck house
const FOOT = 11.6;                           // where the flat keel meets the stem

const x0Cap = 0x77242a, HULL = 0x7b2527, HULL_MID = 0x802c28, HULL_AFT = 0x88372b, BOOT = 0xa5302a, BOTTOM = 0x66282a, RUST = 0x98472f;
const WHITE = 0xf3f4f1, WHITE2 = 0xe2e6e6, DECKC = 0x87929a, DECKU = 0x98a1a6, DARK = 0x262d33, RAILD = 0x434b51, BRONZE = 0xb48c55;

const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

/* ───── hull form ───── */
/** how far forward the hull reaches at height y (raked stem, rounded forefoot, near-vertical above the forecastle) */
function stemX(y) {
  if (y >= UP) return XB;
  if (y >= 0) return 14.7 + Math.pow(y / UP, 0.8) * (XB - 14.7);
  if (y >= -2) return 14.2 + ((y + 2) / 2) * 0.5;
  return FOOT + Math.sqrt(clamp((y - KEEL) / (-2 - KEEL), 0, 1)) * (14.2 - FOOT);
}
/** where the bow starts to narrow at height y: far forward at the deck (round, flared bow), further aft below water */
const bowStart = (y) => (y >= 0 ? mix(4.3, 8.95, ss(0, UP, y)) : mix(2.6, 4.3, ss(KEEL, 0, y)));
const bowP = (y) => (y >= 0 ? mix(1.65, 2.0, ss(0, UP, y)) : mix(1.55, 1.65, ss(KEEL, 0, y)));
const bowQ = (y) => (y >= 0 ? mix(1.0, 2.0, Math.pow(ss(0, UP, y), 1.3)) : 1.0);
function planK(x, y) {
  const xs = stemX(y); if (x >= xs) return 0;
  let k = x < -12 ? 1 - 0.045 * ((-12 - x) / 3.95) ** 2 : 1;
  const xt = Math.min(bowStart(y), xs - 0.6);
  if (x > xt) { const t = (x - xt) / (xs - xt); k *= Math.pow(Math.max(0, 1 - Math.pow(t, bowP(y))), 1 / bowQ(y)); }
  return k;
}
/** the bottom rises towards the transom, clearing the three propellers */
const bottomY = (x) => (x < -10 ? KEEL + Math.pow((-10 - x) / 5.95, 1.35) * 2.3 : KEEL);
/** lowest point of the hull at a station: the keel, or the stem curve forward of the foot */
function lowY(x) {
  if (x <= FOOT) return bottomY(x);
  let a = KEEL, b = UP; for (let i = 0; i < 28; i++) { const m = (a + b) / 2; if (stemX(m) < x) a = m; else b = m; }
  return b;
}
function sectionHB(y, yk) { if (y >= yk + BILGE) return HB; if (y <= yk) return HB - BILGE; const d = yk + BILGE - y; return HB - BILGE + Math.sqrt(BILGE * BILGE - d * d); }
/** half-breadth of the outer plating */
const hullHB = (x, y) => sectionHB(y, lowY(x)) * planK(x, y);
/** top of the side plating: low bulwark aft, a diagonal step, then the tall forecastle rising to the bow */
function sheerY(x) {
  if (x <= STEP0) return BUL + 0.16 * ss(-12, XS, x);
  if (x < STEP1) return BUL + (FC - BUL) * ((x - STEP0) / (STEP1 - STEP0));
  return FC + 1.0 * Math.pow((x - STEP1) / (XB - STEP1), 1.8);
}
/** outward normal of the plating at (x, y) on one side */
function hullN(x, y, side) {
  const e = 0.03, hx = (hullHB(x + e, y) - hullHB(x - e, y)) / (2 * e), hy = (hullHB(x, y + e) - hullHB(x, y - e)) / (2 * e), l = Math.hypot(hx, hy, 1);
  return [-hx / l, -hy / l, side / l];
}

const XSTA = [XS, -15.7, -15.2, -14.4, -13.4, -12.2, -11, -10, -8.5, -7, -5.5, -4, -2.6, -1.4, STEP0, 0.4, 1.0, 1.6, UPAFT, STEP1, 3, 3.9, 4.8, 5.7, 6.0, 6.6, 7.5, 8.4, 9.2, 10, 10.7, 11.3, FOOT, 12.1, 12.6, 13.1, 13.5, 13.9, 14.3, 14.65, 14.95, 15.25, 15.5, 15.72, 15.88, XB];
const ROWS_ABS = [-1.4, -0.3, 0.25, DECK, BUL];
/** rows round one station from the keel to the sheer: [y, half-breadth] */
function stationRows(x) {
  const yk = lowY(x), ys = sheerY(x), out = [];
  const put = (y, sec) => { const prev = out.length ? out[out.length - 1][0] : -99; out.push([Math.max(y, prev + 1e-4, yk), sec]); };
  put(yk, 0);
  for (const th of [0, 30, 60, 90]) { const a = th * DEG; put(yk + BILGE * (1 - Math.cos(a)), HB - BILGE + BILGE * Math.sin(a)); }
  for (const y of ROWS_ABS) put(y, null);
  const y0 = out[out.length - 1][0]; for (let f = 1; f <= 8; f++) put(y0 + (Math.max(ys, y0) - y0) * (f / 8), null);
  return out.map(([y, sec], k) => [y, (k === 0 ? 0 : sec !== null ? sec : sectionHB(y, yk)) * planK(x, y)]);
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** a grid of points [i][k] → triangles for one side (+1 or -1), normals by finite differences. `inward` flips the faces. */
function emitGrid(b, G, hex, side, { i0 = 0, i1 = G.length - 1, k0 = 0, k1 = G[0].length - 1, inward = false } = {}) {
  const NX = G.length, NK = G[0].length, verts = [], norms = [], tris = [], W = k1 - k0 + 1;
  for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) {
    const p = G[i][k], a = G[Math.max(0, i - 1)][k], c = G[Math.min(NX - 1, i + 1)][k];
    let tk = [0, 1, 0];
    for (let s = 1; s < NK; s++) { const lo = G[i][Math.max(0, k - s)], hi = G[i][Math.min(NK - 1, k + s)], d = sub(hi, lo); if (Math.hypot(d[0], d[1], d[2]) > 1e-3) { tk = d; break; } }
    let tx = sub(c, a); if (Math.hypot(tx[0], tx[1], tx[2]) < 1e-5) tx = [1, 0, 0];
    let n = norm(cross(tx, tk)); if (inward) n = [-n[0], -n[1], -n[2]];
    verts.push([p[0], p[1], p[2] * side]); norms.push([n[0], n[1], n[2] * side]);
  }
  const flip = (side < 0) !== inward;
  for (let i = 0; i < i1 - i0; i++) for (let k = 0; k < W - 1; k++) {
    const a = i * W + k, bb = (i + 1) * W + k, c = bb + 1, d = a + 1;
    if (!flip) tris.push(a, bb, c, a, c, d); else tris.push(a, c, bb, a, d, c);
  }
  b._raw(verts, norms, tris, hex);
}
/** a quad that faces along nOut */
function quadOut(b, hex, p00, p10, p11, p01, nOut) {
  const n = norm(nOut), f = cross(sub(p10, p00), sub(p01, p00)), ok = f[0] * n[0] + f[1] * n[1] + f[2] * n[2] > 0;
  b._raw([p00, p10, p11, p01], [n, n, n, n], ok ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2], hex);
}
/** a filled ellipse lying on the outer plating (anchor pocket, portholes, marks) */
function hullPatch(b, hex, xc, yc, ax, ay, side, off = 0.025) {
  const verts = [], norms = [], tris = [], AN = 30, RN = 5;
  const at = (x, y) => { const h = hullHB(x, y), n = hullN(x, y, side); verts.push([x + n[0] * off, y + n[1] * off, side * h + n[2] * off]); norms.push(n); };
  at(xc, yc);
  for (let r = 1; r <= RN; r++) for (let j = 0; j < AN; j++) { const a = (j / AN) * Math.PI * 2; at(xc + Math.cos(a) * ax * (r / RN), yc + Math.sin(a) * ay * (r / RN)); }
  const id = (r, j) => (r === 0 ? 0 : 1 + (r - 1) * AN + (((j % AN) + AN) % AN));
  const tri = (a, c, d) => { if (side > 0) tris.push(a, c, d); else tris.push(a, d, c); };
  for (let j = 0; j < AN; j++) tri(0, id(1, j), id(1, j + 1));
  for (let r = 1; r < RN; r++) for (let j = 0; j < AN; j++) { tri(id(r, j), id(r + 1, j), id(r + 1, j + 1)); tri(id(r, j), id(r + 1, j + 1), id(r, j + 1)); }
  b._raw(verts, norms, tris, hex);
}
/** a rectangle (or a slanted strip) lying on the plating: corners given as (x, y) */
function hullQuad(b, hex, c00, c10, c11, c01, side, off = 0.02, nu = 6) {
  const verts = [], norms = [], tris = [];
  for (let i = 0; i <= nu; i++) for (const v of [0, 1]) {
    const u = i / nu, lo = [mix(c00[0], c10[0], u), mix(c00[1], c10[1], u)], hi = [mix(c01[0], c11[0], u), mix(c01[1], c11[1], u)];
    const x = mix(lo[0], hi[0], v), y = mix(lo[1], hi[1], v), h = hullHB(x, y), n = hullN(x, y, side);
    verts.push([x + n[0] * off, y + n[1] * off, side * h + n[2] * off]); norms.push(n);
  }
  for (let i = 0; i < nu; i++) { const a = i * 2, bb = a + 2, c = a + 3, d = a + 1; if (side > 0) tris.push(a, bb, c, a, c, d); else tris.push(a, c, bb, a, d, c); }
  b._raw(verts, norms, tris, hex);
}
/** railing along a polyline of deck-edge points [x, y, z]: posts, a top rail and a knee rail */
function rail(b, pts, { h = 1.0, hex = WHITE, step = 1.45, r = 0.03 } = {}) {
  const P = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], c = pts[i + 1], len = Math.hypot(c[0] - a[0], c[2] - a[2]), n = Math.max(1, Math.round(len / step)); for (let k = 1; k <= n; k++) P.push(lerp3(a, c, k / n)); }
  b.use('satin');
  for (let i = 0; i < P.length; i++) {
    const p = P[i]; b.rod(hex, r * 0.8, p, [p[0], p[1] + h, p[2]], 5);
    if (i) { const q = P[i - 1]; if (Math.hypot(p[0] - q[0], p[2] - q[2]) < 1e-3) continue; b.rod(hex, r, [q[0], q[1] + h, q[2]], [p[0], p[1] + h, p[2]], 6); b.rod(hex, r * 0.7, [q[0], q[1] + h * 0.5, q[2]], [p[0], p[1] + h * 0.5, p[2]], 5); }
  }
}
/** an inclined ladder from a (bottom) to c (top), steps across z */
function ladder(b, a, c, w = 0.7, hex = WHITE) {
  b.use('satin');
  for (const s of [-w / 2, w / 2]) { b.rod(hex, 0.04, [a[0], a[1], a[2] + s], [c[0], c[1], c[2] + s], 5); b.rod(hex, 0.028, [a[0], a[1] + 0.95, a[2] + s], [c[0], c[1] + 0.95, c[2] + s], 5); b.rod(hex, 0.025, [a[0], a[1], a[2] + s], [a[0], a[1] + 0.95, a[2] + s], 5); b.rod(hex, 0.025, [c[0], c[1], c[2] + s], [c[0], c[1] + 0.95, c[2] + s], 5); }
  const n = Math.max(2, Math.round((c[1] - a[1]) / 0.24));
  for (let i = 1; i < n; i++) { const p = lerp3(a, c, i / n); b.boxC(hex, 0.2, 0.035, w, p[0], p[1], p[2]); }
}
const M4 = () => new THREE.Matrix4();
const ONE = new THREE.Vector3(1, 1, 1);
const place = (x, y, z, rx = 0, ry = 0, rz = 0) => M4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), ONE);
/** lifebuoy hanging upright, facing along ry */
function lifebuoy(b, x, y, z, ry) { b.pushM(place(x, y, z, Math.PI / 2, ry)); b.use('satin').torus(0xe9572b, 0.33, 0.075, 0, 0, 0, 6, 20); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; b.boxC(WHITE, 0.17, 0.17, 0.07, Math.cos(a) * 0.33, 0, Math.sin(a) * 0.33, -a); } b.pop(); }

/* ───── name boards: canvas text on strips that follow the plating ───── */
function textCanvas(text, color, px) {
  const probe = document.createElement('canvas').getContext('2d'), font = `700 ${px}px "Arial", "Helvetica Neue", Helvetica, sans-serif`;
  probe.font = font; const w = Math.ceil(probe.measureText(text).width + px * 0.3), h = Math.ceil(px * 1.05);
  const tex = canvasTex(w, h, (g) => { g.clearRect(0, 0, w, h); g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h * 0.53); }, { repeat: false });
  return { tex, aspect: w / h, cap: (0.72 * px) / h };
}
function textMat(tex) { return new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.25, roughness: 0.75, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }); }
/** the ship's name high on the bow, both sides, reading left to right from outside */
function bowName(capH, xMid, yBase) {
  const { tex, aspect, cap } = textCanvas('LFC HAMOUR', '#f2f3ef', 220);
  const H = capH / cap, L = H * aspect, x0 = xMid - L / 2, x1 = xMid + L / 2, NU = 18, mat = textMat(tex), out = [];
  for (const side of [1, -1]) {
    const pos = [], nor = [], uv = [], idx = [];
    for (let i = 0; i <= NU; i++) for (const v of [0, 1]) {
      const x = mix(x0, x1, i / NU), y = yBase + v * H, h = hullHB(x, y), n = hullN(x, y, side);
      pos.push(x + n[0] * 0.035, y + n[1] * 0.035, side * h + n[2] * 0.035); nor.push(...n); uv.push(side > 0 ? i / NU : 1 - i / NU, v);
    }
    for (let i = 0; i < NU; i++) { const a = i * 2, bb = a + 2, c = a + 3, d = a + 1; if (side > 0) idx.push(a, bb, c, a, c, d); else idx.push(a, c, bb, a, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, mat); m.renderOrder = 4; m.receiveShadow = true; m.name = 'lfc-name'; out.push(m);
  }
  return out;
}

/* ───── the vessel ───── */
export function makeLFC(mats) {
  const b = new Builder(), R = rng(1182477);

  /* hull: outer plating in three bands, transom, inner bulwarks and the cap on top */
  const G = XSTA.map((x) => stationRows(x).map(([y, z]) => [x, y, z]));
  const iAft = XSTA.indexOf(-5.5), iMid = XSTA.indexOf(STEP1), NK = G[0].length;
  for (const side of [1, -1]) {
    emitGrid(b, G, BOTTOM, side, { k0: 0, k1: 6 });
    emitGrid(b, G, BOOT, side, { k0: 6, k1: 7 });
    emitGrid(b, G, HULL_AFT, side, { k0: 7, k1: NK - 1, i1: iAft });
    emitGrid(b, G, HULL_MID, side, { k0: 7, k1: NK - 1, i0: iAft, i1: iMid });
    emitGrid(b, G, HULL, side, { k0: 7, k1: NK - 1, i0: iMid });
  }
  const transom = (k0, k1, hex) => { const v = [], n = [], t = []; for (let k = k0; k <= k1; k++) { const p = G[0][k]; v.push([p[0], p[1], -p[2]], [p[0], p[1], p[2]]); n.push([-1, 0, 0], [-1, 0, 0]); } for (let k = 0; k < k1 - k0; k++) { const P0 = k * 2; t.push(P0, P0 + 1, P0 + 3, P0, P0 + 3, P0 + 2); } b._raw(v, n, t, hex); };
  transom(0, 6, BOTTOM); transom(6, 7, BOOT); transom(7, NK - 1, HULL_AFT);
  // inner face of the bulwarks: aft from the main deck, forward from the upper deck
  const inner = (xs, yLo, yHi) => xs.map((x) => { const lo = yLo(x), hi = Math.max(lo + 0.01, yHi(x)); return [0, 0.33, 0.66, 1].map((f) => { const y = mix(lo, hi, f); return [x, y, Math.max(0.03, hullHB(x, y) - 0.14)]; }); });
  const GA = inner(XSTA.filter((x) => x <= 6.0).map((x) => (x === XS ? XS + 0.14 : x)), () => DECK, (x) => (x <= UPAFT ? sheerY(x) : Math.min(sheerY(x), UP - 0.25)));
  const GF = inner(XSTA.filter((x) => x >= UPAFT && x < XB - 0.05), () => UP, (x) => sheerY(x));
  for (const side of [1, -1]) { emitGrid(b, GA, 0xb8bfc2, side, { inward: true }); emitGrid(b, GF, 0xd2d6d6, side, { inward: true }); }
  b.use('matte').box(0xb8bfc2, 0.14, sheerY(XS) - DECK, 2 * (hullHB(XS, 1.5) - 0.1), XS + 0.09, DECK, 0);          // inside of the transom
  // the cap along the top of the side plating
  for (const side of [1, -1]) {
    const v = [], n = [], t = [];
    XSTA.forEach((x) => { const y = sheerY(x), zo = hullHB(x, y), zi = Math.max(0, zo - 0.14); v.push([x, y + 0.012, zi * side], [x, y + 0.012, zo * side]); n.push([0, 1, 0], [0, 1, 0]); });
    for (let i = 0; i < XSTA.length - 1; i++) { const a = i * 2; if (side > 0) t.push(a, a + 1, a + 3, a, a + 3, a + 2); else t.push(a, a + 3, a + 1, a, a + 2, a + 3); }
    b._raw(v, n, t, x0Cap);
  }

  /* decks */
  const mainPts = XSTA.filter((x) => x <= HOUSE + 0.4).map((x) => [x === XS ? XS + 0.15 : x, Math.max(0.1, hullHB(x, DECK + 0.05) - 0.14)]);
  b.use('matte').poly(DECKC, mainPts.concat(mainPts.slice().reverse().map(([x, z]) => [x, -z])), DECK);
  // the bow flares, so the slab follows the narrowest line over its depth, clear of the plating
  const upPts = XSTA.filter((x) => x >= UPAFT && x < XB - 0.45).map((x) => [x, Math.max(0.05, Math.min(hullHB(x, UP), hullHB(x, UP - 0.16)) - 0.2)]);
  b.use('matte').prism(DECKU, upPts.concat([[XB - 0.45, 0]], upPts.slice().reverse().map(([x, z]) => [x, -z])), UP - 0.16, UP, { bottom: true });
  // a rounded stem bar from the forefoot to the top of the bow
  { const at = (y) => [stemX(Math.min(y, UP)) - 0.02, y, 0], lo = [], hi = []; for (let k = 0; k <= 8; k++) lo.push(at(KEEL + ((-0.3 - KEEL) * k) / 8)); for (let k = 0; k <= 10; k++) hi.push(at(-0.3 + ((sheerY(XB) - 0.3 + 0.3) * k) / 10)); b.use('satin').pipe(BOTTOM, 0.09, lo, 8); b.pipe(HULL, 0.09, hi, 8); }

  /* plating details: strake, step seams, portholes, freeing ports, thruster marks, anchor pockets, rust */
  for (const side of [1, -1]) {
    // a half-round strake at main-deck height, and three seams parallel to the step
    const sk = []; for (let x = XS + 0.25; x <= 6.2; x += 0.9) sk.push(x);
    for (let i = 0; i < sk.length - 1; i++) { const a = sk[i], c = sk[i + 1]; b.use('satin').rod(0x5e1f20, 0.075, [a, 1.35, side * (hullHB(a, 1.35) + 0.03)], [c, 1.35, side * (hullHB(c, 1.35) + 0.03)], 6); }
    for (const d of [0.95, 1.9, 2.85]) hullQuad(b, 0x5d2022, [STEP0 + d, 1.45], [STEP0 + d + 0.06, 1.45], [STEP1 + d + 0.06, sheerY(STEP1 + d) - 0.08], [STEP1 + d, sheerY(STEP1 + d) - 0.08], side, 0.015, 3);
    for (const x of [4.9, 6.0, 7.1]) { hullPatch(b, 0xd5d9da, x, 2.95, 0.25, 0.25, side, 0.02); hullPatch(b, 0x18222a, x, 2.95, 0.17, 0.17, side, 0.035); }
    for (let x = -14.6; x <= -1.6; x += 2.15) { hullQuad(b, 0x2a1a18, [x - 0.28, DECK + 0.06], [x + 0.28, DECK + 0.06], [x + 0.28, DECK + 0.3], [x - 0.28, DECK + 0.3], side, 0.02, 2); hullQuad(b, RUST, [x - 0.09, 0.34], [x + 0.07, 0.34], [x + 0.1, DECK + 0.05], [x - 0.12, DECK + 0.05], side, 0.012, 2); }
    for (let k = 0; k < 9; k++) { const x = mix(-14, 9.5, R()), y0 = mix(0.5, 1.6, R()), y1 = Math.min(sheerY(x) - 0.25, y0 + mix(0.7, 2.2, R())), w = mix(0.08, 0.2, R()); if (y1 > y0 + 0.3) hullQuad(b, R() < 0.5 ? RUST : 0x8d3a2c, [x - w, y0], [x + w, y0], [x + w * 0.6, y1], [x - w * 0.6, y1], side, 0.012, 2); }
    for (const x of [6.8, 9.3]) { hullPatch(b, 0xf0f0ec, x, 0.92, 0.4, 0.4, side, 0.02); hullQuad(b, DARK, [x - 0.3, 0.885], [x + 0.3, 0.885], [x + 0.3, 0.955], [x - 0.3, 0.955], side, 0.03, 4); hullQuad(b, DARK, [x - 0.035, 0.62], [x + 0.035, 0.62], [x + 0.035, 1.22], [x - 0.035, 1.22], side, 0.03, 1); }
    hullPatch(b, 0xc9cdcc, 14.1, 4.62, 0.9, 0.38, side, 0.03);                             // anchor pocket
    hullPatch(b, 0x22282c, 14.62, 4.64, 0.2, 0.2, side, 0.045); hullPatch(b, 0x7d8489, 14.62, 4.64, 0.11, 0.11, side, 0.055);   // hawse pipe
    hullQuad(b, 0x4b5257, [13.75, 4.42], [14.55, 4.5], [14.55, 4.6], [13.75, 4.52], side, 0.05, 4); hullPatch(b, 0x4b5257, 13.75, 4.47, 0.13, 0.2, side, 0.055);   // the anchor stowed in it
    hullQuad(b, 0x1d1514, [10.9, 3.5], [11.6, 3.5], [11.6, 3.78], [10.9, 3.78], side, 0.025, 3);   // mooring chock
    hullPatch(b, 0x101416, 11.15, -2.3, 0.22, 0.22, side, 0.02);                          // bow thruster tunnel
  }

  /* below the water: keel bar, skeg, three propellers with rudders */
  b.use('matte').box(BOTTOM, 23, 0.12, 0.3, 0.1, KEEL - 0.06, 0);
  b.use('matte').box(BOTTOM, 1.2, 0.95, 0.24, -12.7, -3.85, 0);
  for (const [z, y] of [[0, -3.18], [2.7, -3.15], [-2.7, -3.15]]) {
    const px = -13.5;
    b.use('metal').rod(0x98a2a8, 0.085, [-12.2, y + 0.08, z], [px, y, z], 8); b.ball(BRONZE, 0.15, px, y, z, 10, 8); b.ball(BRONZE, 0.1, px - 0.16, y, z, 8, 6);
    if (z) b.use('matte').rod(0x8c9399, 0.05, [-13.0, y, z], [-13.0, bottomY(-13.0) + 0.1, z * 1.1], 6);
    for (let k = 0; k < 4; k++) { b.pushM(M4().makeTranslation(px, y, z).multiply(M4().makeRotationX(k * Math.PI / 2 + 0.3)).multiply(M4().makeTranslation(0, 0.21, 0)).multiply(M4().makeRotationY(0.6))); b.use('metal').boxC(BRONZE, 0.24, 0.34, 0.04, 0, 0, 0); b.pop(); }
    const rt = bottomY(-14.75); b.use('matte').box(BOTTOM, 0.95, rt - (y - 0.6) + 0.05, 0.13, -14.8, y - 0.6, z); b.use('metal').cyl(0x8c9399, 0.07, 0.5, -14.6, rt - 0.1, z, 8);
  }

  /* main deck, aft: four well-tank covers (2 × 2), engine covers, crane, bollards, fish pump, oxygen line */
  for (const [x0, x1] of [[-6.8, -3.1], [-2.4, 1.3]]) for (const s of [-1, 1]) {
    const z0 = s > 0 ? 0.5 : -5.5, z1 = s > 0 ? 5.5 : -0.5, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    b.use('matte').box(0x6c767b, w, 0.42, d, cx, DECK, cz);
    b.use('satin').box(0xb7bfc3, w + 0.12, 0.14, d + 0.12, cx, DECK + 0.42, cz);
    for (const f of [-0.27, 0.27]) { b.use('satin').box(0x7b868c, 0.64, 0.1, 0.64, cx + w * 0.14, DECK + 0.56, cz + d * f); b.use('metal').rod(C.steel, 0.02, [cx + w * 0.14 - 0.2, DECK + 0.7, cz + d * f], [cx + w * 0.14 + 0.2, DECK + 0.7, cz + d * f], 4); }
    for (let k = 0; k < 4; k++) b.use('matte').box(0x4c5559, 0.12, 0.22, 0.08, x0 + ((k + 0.5) * w) / 4, DECK + 0.28, s > 0 ? z1 + 0.07 : z0 - 0.07);
    for (const [ex, ez] of [[x1 - 0.3, z0 + 0.3], [x0 + 0.3, z1 - 0.3]]) b.use('matte').cyl(C.red, 0.1, 0.02, ex, DECK + 0.56, ez, 10);
  }
  b.use('satin').box(0x9aa3a8, 2.4, 0.4, 2.0, -9.6, DECK, 0); b.use('matte').box(0x6c767b, 2.2, 0.06, 1.8, -9.6, DECK + 0.4, 0);
  b.use('satin').box(0xa9b1b5, 0.9, 0.62, 1.2, -7.5, DECK, 0); b.box(0xa9b1b5, 0.8, 0.5, 0.8, -14.0, DECK, 4.7);
  for (const s of [-1, 1]) for (const x of [-15.2, -11.2]) { b.use('satin').cyl(WHITE, 0.16, 1.0, x, DECK, s * 5.9, 10); b.dome(WHITE, 0.3, x, DECK + 1.0, s * 5.9, 12, 5); }      // mushroom vents
  // knuckle-boom deck crane at the stern, stowed (3,800 kg at 18 m)
  b.use('satin').cyl(0xd3d8db, 0.44, 2.15, -14.55, DECK, 0, 14); b.box(C.yellow, 1.15, 0.6, 1.05, -14.55, DECK + 2.15, 0);
  b.boxC(C.yellow, 4.4, 0.44, 0.38, -12.65, 4.55, 0, 0, 0, Math.atan2(2.2, 3.4));
  b.boxC(C.yellow, 3.2, 0.3, 0.28, -12.4, 4.95, 0.36, 0, 0, Math.atan2(1.3, 2.8));
  b.use('metal').rod(0xb9c2c9, 0.09, [-14.2, 3.05, -0.28], [-12.9, 4.6, -0.28], 8); b.rod(0xb9c2c9, 0.06, [-11.3, 5.45, 0.36], [-12.6, 5.0, 0.36], 6);
  b.use('matte').rod(DARK, 0.015, [-13.75, 4.25, 0.36], [-13.75, 3.15, 0.36], 4); b.use('satin').box(C.yellow, 0.24, 0.32, 0.2, -13.75, 2.85, 0.36);
  b.use('satin').box(0xd3d8db, 0.5, 1.15, 0.5, -14.55, DECK, 1.0);
  const bollard = (x, y, z) => { b.use('satin').box(0x3d464c, 0.5, 0.08, 1.05, x, y, z); for (const o of [-0.3, 0.3]) { b.cyl(0x3d464c, 0.14, 0.42, x, y + 0.08, z + o, 10); b.cyl(0x3d464c, 0.18, 0.05, x, y + 0.5, z + o, 10); } };
  for (const s of [-1, 1]) { bollard(-14.2, DECK, s * 6.2); bollard(-8.0, DECK, s * 6.25); bollard(13.3, UP, s * 3.3); bollard(3.1, UP, s * 6.15); }
  b.use('satin').box(0x3e6f8e, 1.3, 0.85, 1.0, -7.8, DECK, -4.6); b.use('matte').rod(0x1d2226, 0.48, [-9.0, DECK + 0.6, -5.0], [-9.0, DECK + 0.6, -4.1], 16); b.use('satin').box(0x5c6870, 0.25, 0.9, 1.1, -9.0, DECK, -4.55);
  for (const s of [-1, 1]) { b.use('satin').rod(C.pipeO2, 0.07, [-6.9, DECK + 0.16, s * 5.78], [1.4, DECK + 0.16, s * 5.78], 6); for (const x of [-5, -0.6]) b.rod(C.pipeO2, 0.05, [x, DECK + 0.16, s * 5.78], [x, DECK + 0.48, s * 5.55], 5); }

  /* main-deck house (under the forecastle): its aft wall shows under the upper-deck overhang */
  b.use('satin').box(WHITE, 3.4, UP - 0.25 - DECK, 11.0, HOUSE + 1.7, DECK, 0);
  b.use('satin').box(WHITE2, 0.12, UP - 0.25 - DECK, 1.45, 6.0, DECK, 6.2); b.box(WHITE2, 0.12, UP - 0.25 - DECK, 1.45, 6.0, DECK, -6.2);
  b.use('satin').box(0xc9ced0, 0.06, 2.0, 0.95, HOUSE - 0.03, DECK, -1.7); b.use('window').box(null, 0.06, 0.38, 0.5, HOUSE - 0.05, DECK + 1.35, -1.7);
  for (const z of [0.6, 2.4]) b.use('window').box(null, 0.06, 0.62, 0.9, HOUSE - 0.04, DECK + 1.55, z);
  b.use('matte').box(C.red, 0.12, 0.7, 0.5, HOUSE - 0.06, DECK + 1.1, -3.6);

  /* upper deck: oxygen cylinders, windlass, chain, jackstaff, liferafts */
  for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) { const x = 10.55 + r * 0.42, z = -1.35 + k * 0.54; b.use('satin').cyl(0x1f2a30, 0.15, 1.35, x, UP, z, 10); b.dome(WHITE, 0.15, x, UP + 1.35, z, 10, 4); }
  b.use('satin').box(0x6f7b82, 1.1, 0.08, 3.6, 10.76, UP + 1.0, 0); b.box(0x6f7b82, 1.1, 0.12, 3.6, 10.76, UP, 0);
  b.use('satin').box(0x2f5a78, 1.0, 0.55, 2.3, 12.55, UP, 0); for (const s of [-1, 1]) { b.use('metal').rod(0x3a4248, 0.32, [12.55, UP + 0.55, s * 0.9], [12.55, UP + 0.55, s * 1.4], 14); b.use('matte').rod(0x2b3034, 0.06, [12.7, UP + 0.6, s * 1.15], [14.35, UP + 0.12, s * 3.9], 5); b.use('satin').cyl(0x3a4248, 0.22, 0.6, 13.8, UP, s * 1.6, 12); }
  b.use('satin').cyl(WHITE, 0.07, 2.4, 15.35, UP + 0.4, 0, 8, 0.05); b.use('glow').ball(0xfff6dc, 0.1, 15.35, UP + 2.85, 0, 8, 6);
  for (const s of [-1, 1]) { b.use('satin').box(0x5a656c, 1.3, 0.35, 0.6, 4.55, UP, s * 6.15); b.rod(WHITE, 0.33, [3.95, UP + 0.68, s * 6.15], [5.15, UP + 0.68, s * 6.15], 14); b.ball(WHITE, 0.33, 3.95, UP + 0.68, s * 6.15, 12, 8); b.ball(WHITE, 0.33, 5.15, UP + 0.68, s * 6.15, 12, 8); b.use('matte').rod(0x2c3338, 0.345, [4.53, UP + 0.68, s * 6.15], [4.57, UP + 0.68, s * 6.15], 14); }

  /* deckhouse on the upper deck (cabins), bridge deck, wheelhouse, compass deck */
  const DH = [[HOUSE, -4.4], [8.4, -4.4], [9.6, -3.2], [9.6, 3.2], [8.4, 4.4], [HOUSE, 4.4]];
  b.use('satin').prism(WHITE, DH, UP, 6.95);
  for (const s of [-1, 1]) {
    for (const x of [4.15, 5.35, 6.55, 7.75]) b.use('window').box(null, 0.95, 0.72, 0.05, x, 5.3, s * 4.425);
    b.use('satin').box(0xd5d9db, 0.85, 1.95, 0.05, 3.15, UP, s * 4.43); b.use('window').box(null, 0.4, 0.35, 0.055, 3.15, UP + 1.3, s * 4.435);
  }
  for (const z of [-1.5, 1.5]) b.use('window').box(null, 0.05, 0.75, 1.1, 9.63, 5.3, z);
  b.use('satin').box(0xd5d9db, 0.05, 1.95, 0.85, HOUSE - 0.03, UP, 0.4);
  const BD = [[2.2, -4.65], [5.7, -4.65], [5.7, -5.45], [9.0, -5.45], [10.1, -4.4], [10.1, 4.4], [9.0, 5.45], [5.7, 5.45], [5.7, 4.65], [2.2, 4.65]];
  b.use('satin').prism(WHITE2, BD, 6.95, 7.12, { bottom: true });
  // wheelhouse: front and corners lean outward at the top, glazed all round the front
  const W0 = [[4.6, -3.7], [8.5, -3.7], [9.4, -2.7], [9.4, 2.7], [8.5, 3.7], [4.6, 3.7]], W1 = [[4.6, -3.7], [8.68, -3.8], [9.72, -2.78], [9.72, 2.78], [8.68, 3.8], [4.6, 3.7]];
  const Y0 = 7.12, Y1 = 9.36, cxW = 7.0;
  const wall = (j, u, y) => { const n = W0.length, a = W0[j], c = W0[(j + 1) % n], at = W1[j], ct = W1[(j + 1) % n], t = (y - Y0) / (Y1 - Y0); const bot = [mix(a[0], c[0], u), mix(a[1], c[1], u)], top = [mix(at[0], ct[0], u), mix(at[1], ct[1], u)]; return [mix(bot[0], top[0], t), y, mix(bot[1], top[1], t)]; };
  const wallN = (j) => { const p00 = wall(j, 0, Y0), p10 = wall(j, 1, Y0), p01 = wall(j, 0, Y1); let n = norm(cross(sub(p10, p00), sub(p01, p00))); const m = wall(j, 0.5, Y0); if ((m[0] - cxW) * n[0] + m[2] * n[2] < 0) n = n.map((q) => -q); return n; };
  for (let j = 0; j < W0.length; j++) { const n = wallN(j); quadOut(b.use('satin'), WHITE, wall(j, 0, Y0), wall(j, 1, Y0), wall(j, 1, Y1), wall(j, 0, Y1), n); }
  const pane = (j, u0, u1, ya = 7.86, yb = 9.14) => { const n = wallN(j), o = (p) => [p[0] + n[0] * 0.03, p[1], p[2] + n[2] * 0.03]; quadOut(b.use('window'), 0xffffff, o(wall(j, u0, ya)), o(wall(j, u1, ya)), o(wall(j, u1, yb)), o(wall(j, u0, yb)), n); };
  for (let k = 0; k < 5; k++) pane(2, 0.012 + k * 0.198, 0.2 + k * 0.198);
  pane(1, 0.04, 0.96); pane(3, 0.04, 0.96);
  for (let k = 0; k < 3; k++) { pane(0, 0.39 + k * 0.2, 0.585 + k * 0.2); pane(4, 0.015 + k * 0.2, 0.21 + k * 0.2); }
  pane(5, 0.3, 0.44, 8.1, 8.95); pane(5, 0.56, 0.7, 8.1, 8.95);
  b.use('satin').box(0xd5d9db, 0.05, 1.95, 0.85, 4.57, Y0, -2.5); b.use('window').box(null, 0.055, 0.4, 0.4, 4.56, Y0 + 1.3, -2.5);
  b.use('satin').prism(WHITE, [[4.25, -4.1], [8.85, -4.1], [10.15, -2.95], [10.15, 2.95], [8.85, 4.1], [4.25, 4.1]], Y1, Y1 + 0.32, { bottom: true });
  for (const s of [-1, 1]) { b.use('matte').box(DARK, 0.42, 0.42, 0.2, 8.85, 7.3, s * 5.3); b.use('glow').box(s > 0 ? 0xff2a1a : 0x18e05a, 0.2, 0.24, 0.06, 8.98, 7.39, s * 5.42); }   // side lights: red to port, green to starboard
  // ladders: upper deck to bridge deck (both sides), main deck to upper deck (both sides), and up the wheelhouse to the compass deck
  for (const s of [-1, 1]) { ladder(b, [2.95, UP, s * 5.05], [5.65, 7.12, s * 5.05], 0.66); ladder(b, [-1.45, DECK, s * 6.2], [1.75, UP, s * 6.2], 0.66); }
  b.use('satin'); for (const s of [-0.22, 0.22]) b.rod(WHITE, 0.03, [4.5, Y0, -3.35 + s], [4.5, Y1 + 0.32, -3.35 + s], 5); for (let y = Y0 + 0.3; y < Y1 + 0.3; y += 0.3) b.rod(WHITE, 0.022, [4.5, y, -3.57], [4.5, y, -3.13], 4);
  // exhaust stacks against the aft wall of the deckhouse
  for (const s of [-1, 1]) { b.use('satin').cyl(WHITE, 0.21, 9.4 - UP, 2.36, UP, s * 3.25, 12); b.use('matte').cyl(0x1c2024, 0.215, 0.5, 2.36, 9.4, s * 3.25, 12); }

  /* compass deck: mast with crosstrees and lights, radar, domes, whips, searchlight, flag */
  const RT = Y1 + 0.32;
  b.use('satin').box(WHITE, 0.95, 0.85, 0.95, 5.25, RT, 0); b.cyl(WHITE, 0.17, 14.5 - RT, 5.25, RT, 0, 10, 0.08);
  for (const s of [-1, 1]) b.rod(WHITE, 0.06, [4.55, RT, s * 0.9], [5.2, RT + 2.2, s * 0.12], 6);
  for (const [y, w] of [[12.0, 2.5], [12.7, 1.8], [13.4, 1.15]]) { b.use('satin').box(WHITE, 0.12, 0.1, w, 5.25, y, 0); for (const s of [-1, 1]) b.use('glow').ball(y > 13.2 ? 0xffffff : y > 12.5 ? 0xff3322 : 0xfff2c8, 0.07, 5.28, y + 0.12, s * w / 2, 6, 5); }
  b.use('satin').box(WHITE, 1.0, 0.07, 0.95, 5.95, 10.85, 0); b.use('matte').cyl(0x30373c, 0.17, 0.38, 5.95, 10.92, 0, 10);
  b.use('satin').cyl(0xe8eaea, 0.04, 1.0, 5.25, 14.5, 0, 5); b.ball(WHITE, 0.16, 5.25, 14.45, 0, 10, 8);
  b.use('matte').box(0xc8262a, 0.78, 0.48, 0.02, 4.82, 12.75, -0.9);                                          // flag on the crosstree halyard
  for (const s of [-1, 1]) { b.use('satin').rod(0xdfe3e5, 0.022, [4.42, RT, s * 3.72], [4.42, RT + 3.0, s * 3.72], 4); b.cyl(WHITE, 0.05, 0.45, 4.6, RT, s * 2.7, 6); b.ball(WHITE, 0.24, 4.6, RT + 0.6, s * 2.7, 12, 9); }
  b.use('satin').cyl(0x50585e, 0.17, 0.32, 9.45, RT, 2.25, 10); b.use('glass').box(null, 0.06, 0.22, 0.22, 9.63, RT + 0.08, 2.25);
  b.use('satin').box(0xb9c0c4, 0.55, 0.3, 0.32, 5.6, 11.55, 0);
  // railings: forecastle bulwark (white), upper-deck aft edge, bridge deck, compass deck, aft bulwark (dark)
  const fcRail = (side) => XSTA.filter((x) => x >= 2.45).map((x) => { const y = sheerY(x); return [x, y, side * Math.max(0, hullHB(x, y) - 0.07)]; });
  rail(b, fcRail(1).concat(fcRail(-1).reverse()), { h: 0.95 });
  rail(b, [[UPAFT + 0.06, UP, -5.75], [UPAFT + 0.06, UP, 5.75]], { h: 1.0 });
  rail(b, [[5.75, 7.12, -5.43], [9.0, 7.12, -5.43], [10.08, 7.12, -4.38], [10.08, 7.12, 4.38], [9.0, 7.12, 5.43], [5.75, 7.12, 5.43]], { h: 1.0 });
  for (const s of [-1, 1]) rail(b, [[2.22, 7.12, s * 4.63], [5.68, 7.12, s * 4.63]], { h: 1.0 });
  rail(b, [[2.22, 7.12, -4.63], [2.22, 7.12, 4.63]], { h: 1.0 });
  rail(b, [[7.6, RT, -4.08], [4.27, RT, -4.08], [4.27, RT, 4.08], [7.6, RT, 4.08]], { h: 0.9, step: 1.2 });
  const aftRail = (side) => XSTA.filter((x) => x <= STEP0 + 0.25).map((x) => { const xx = x === XS ? XS + 0.08 : x, y = sheerY(xx); return [xx, y, side * Math.max(0, hullHB(xx, y) - 0.07)]; });
  rail(b, aftRail(1).reverse().concat(aftRail(-1)), { h: 0.85, hex: RAILD, step: 1.7 });
  for (const s of [-1, 1]) { lifebuoy(b, 7.6, 7.75, s * 5.5, s > 0 ? 0 : Math.PI); lifebuoy(b, UPAFT + 0.02, UP + 0.6, s * 3.0, -Math.PI / 2); lifebuoy(b, XS + 0.02, sheerY(XS) + 0.45, s * 3.6, -Math.PI / 2); }

  const body = b.build(mats, { cast: true }); body.name = 'lfc-body';

  /* radar scanner (turns), the ship's name and the IMO number on the bridge front */
  const rb = new Builder(); rb.use('matte').boxC(0x2c3338, 2.7, 0.24, 0.16, 0, 0, 0); rb.use('satin').boxC(0xe6e8e8, 2.7, 0.03, 0.17, 0, 0.13, 0); rb.use('matte').cyl(0x2c3338, 0.12, 0.25, 0, -0.35, 0, 8);
  const radar = rb.build(mats, { cast: true }); radar.position.set(5.95, 11.55, 0); radar.name = 'lfc-radar';
  const names = bowName(0.5, 10.45, 3.98);
  const imo = (() => {
    const { tex, aspect, cap } = textCanvas('1182477', '#1d2226', 200), H = 0.38 / cap, Wd = H * aspect;
    const n = wallN(2), o = (p) => [p[0] + n[0] * 0.035, p[1], p[2] + n[2] * 0.035], y0 = 7.24, y1 = y0 + H;
    const p00 = o(wall(2, 0.5 - Wd / 10.8, y0)), p10 = o(wall(2, 0.5 + Wd / 10.8, y0)), p11 = o(wall(2, 0.5 + Wd / 10.8, y1)), p01 = o(wall(2, 0.5 - Wd / 10.8, y1));
    // the front face runs from -z to +z; seen from ahead (+x) the text must run from +z to -z
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...p10, ...p00, ...p01, ...p11], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([...n, ...n, ...n, ...n], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
    const m = new THREE.Mesh(g, textMat(tex)); m.renderOrder = 4; m.name = 'lfc-imo'; return m;
  })();

  const inner0 = new THREE.Group(); inner0.name = 'lfc-afloat'; inner0.add(body, radar, imo, ...names);
  const shade = canvasTex(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.scale(1, h / w); const r = g.createRadialGradient(0, 0, 0, 0, 0, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.62, 'rgba(255,255,255,.75)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.beginPath(); g.arc(0, 0, w / 2, 0, Math.PI * 2); g.fill(); g.restore(); }, { repeat: false, srgb: false });
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(38, 19).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shade, color: 0x05222f, transparent: true, opacity: 0.42, depthWrite: false }));
  wet.position.set(0.6, 0.06, 0); wet.renderOrder = 1; wet.name = 'lfc-shadow';
  const group = new THREE.Group(); group.name = 'lfc-hamour'; group.add(wet, inner0);
  group.userData.inner = inner0; group.userData.radar = radar;
  return { group, box: [XS - 0.2, KEEL - 0.1, -HB - 0.15, XB + 0.1, 15.6, HB + 0.15] };
}

/** gentle swell and the turning radar; call every frame with the elapsed time */
export function animateLFC(group, t) {
  const a = group.userData.inner; if (!a) return;
  a.position.y = Math.sin(t * 0.8) * 0.07; a.rotation.x = Math.sin(t * 0.55) * 0.012; a.rotation.z = Math.sin(t * 0.43 + 1) * 0.006;
  const r = group.userData.radar; if (r) r.rotation.y = t * 2.4;
}

/** what the item card shows (the box is added where the boat is placed) */
export const LFC_ITEM = {
  code: 'LFC', group: 'Support', name: 'LFC Hamour', kind: 'Live fish carrier (well-boat)', label: true,
  desc: 'The first live fish carrier in the GCC, owned and run by Jalboot Marine Network. Its four built-in wells are a floating life-support system: oxygen, temperature and water quality are held steady while live fry travel between hatchery and cages, so the fish arrive calm and healthy.',
  card: [
    ['Vessel', 'LFC Hamour, well-boat'], ['IMO number', '1182477'], ['Owner and operator', 'Jalboot Marine Network LLC, Abu Dhabi'],
    ['Length overall', '31.90 m'], ['Beam', '14.00 m'], ['Draft', '3.80 m'], ['Gross tonnage', '465.969 GT'],
    ['Live-fish wells', '4 integrated tanks, about 360 m³'], ['Oxygen', 'O₂ generator, compressors and an emergency bank'],
    ['Life support', 'Closed-circuit recirculation, heat pump, cyclonic filtration'],
    ['Monitoring', 'Live alarms for temperature, oxygen, pH and ammonia; cameras in the wells'],
    ['Loading', 'Fish pump with optical counting'], ['Speed', '16 kn top, 12 kn cruising'], ['Power', '1,937 kW from three Weichai diesels'],
    ['Endurance', 'About 8 days at sea'], ['Crew', '14 people'], ['Deck crane', '3,800 kg at 18 m'], ['Built', 'Çınar Tersanecilik, Türkiye'], ['Flag', 'Comoros'],
  ],
  specs: [['31.9 m', 'Length'], ['360 m³', 'Live-fish wells'], ['16 kn', 'Top speed']],
  live: [
    { k: 'Well oxygen', u: 'mg/L', v: 8.4, d: 0.25, lo: 5, hi: 12, p: 1 },
    { k: 'Well water temperature', u: '°C', v: 26.4, d: 0.12, lo: 20, hi: 32, p: 1 },
    { k: 'Status', text: 'Alongside the jetty, loading fry' },
    { k: 'Fish in the wells', text: '120,000 Hamour fry' },
  ],
};
