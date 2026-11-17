// The way in, as the client's drive-in video shows it. Outside: the public road with solar street lights, a long white wall
// with razor wire on the left and open sand with a low post fence on the right. At the gate: the name wall (a brushed-steel
// plaque on stone, turned towards the cars coming in), two pairs of white pillars with gold finials and a pair of dark lattice
// gates across the road. Inside: the STOP sign and the guard cabin on the right, orange boom barriers, then the wheel bath, a
// shallow blue pool across the whole road that every vehicle drives through, then the flag road (a UAE flag on every street
// light) past the salt lagoons to the west roundabout. The perimeter runs north and south from the gate as a wall, then a fence.
// The gates, the barrier arms and the water are live: the opening film shuts them, opens them and drives through.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Builder, C, rng, TAU, canvasTex, clamp } from './kit.js';
import { createFlags } from './flags.js';
import { GATE, ROADS, RB_W } from './layout.js';
import { landSDF } from './terrain-fn.js';

const BRONZE = 0x2c2621, PILLAR = 0xf3f1ec, WALL = 0xeeece6, COPING = 0xdedad2, STONE = 0xb9b2a6, ORANGE = 0xe0602a;

/** the salt lagoons either side of the flag road (outline points), also used to keep shrubs out of the water */
export function lagoons() {
  const blob = (cx, cz, rx, rz, seed) => { const R = rng(seed), a = R() * TAU, b = R() * TAU, c = R() * TAU, out = [];
    for (let i = 0; i < 64; i++) { const t = (i / 64) * TAU, r = 1 + 0.16 * Math.sin(3 * t + a) + 0.09 * Math.sin(5 * t + b) + 0.05 * Math.sin(9 * t + c); out.push([cx + Math.cos(t) * rx * r, cz + Math.sin(t) * rz * r]); }
    return out; };
  return [blob(-322, -24, 44, 26, 3), blob(-330, -124, 38, 19, 8), blob(-288, -36, 13, 9, 12)];
}
export function inPolygon(p, x, z) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; }

/** a dark metal lattice panel in the local frame: it runs along +z from 0 to `len`, `h` tall from `y0`, thin in x */
function lattice(b, len, h, y0) {
  const T = 0.08, t = 0.042, s = t * 0.8;
  b.use('satin');
  b.box(BRONZE, T, h, T, 0, y0, T / 2); b.box(BRONZE, T, h, T, 0, y0, len - T / 2);
  b.box(BRONZE, T, T * 1.5, len, 0, y0, len / 2); b.box(BRONZE, T, T, len, 0, y0 + h - T, len / 2);
  const nc = Math.max(2, Math.round(len / 0.68)), nr = Math.max(2, Math.round(h / 0.66));
  const cw = (len - T * 2) / nc, ch = (h - T * 2.5) / nr, zb = T, yb = y0 + T * 1.5;
  for (let i = 1; i < nc; i++) b.box(BRONZE, t, h - T * 2.5, t, 0, yb, zb + i * cw);
  for (let j = 1; j < nr; j++) b.box(BRONZE, t, t, len - T * 2, 0, yb + j * ch - t / 2, len / 2);
  for (let i = 0; i < nc; i++) for (let j = 0; j < nr; j++) {
    const zc = zb + (i + 0.5) * cw, yc = yb + (j + 0.5) * ch, iw = cw * 0.46, ih = ch * 0.46;
    b.box(BRONZE, s, ih, s, 0, yc - ih / 2, zc - iw / 2); b.box(BRONZE, s, ih, s, 0, yc - ih / 2, zc + iw / 2);
    b.box(BRONZE, s, s, iw, 0, yc - ih / 2, zc); b.box(BRONZE, s, s, iw, 0, yc + ih / 2 - s, zc);
    // ties out to the cell edges, turned a quarter in alternate cells, so it reads as fretwork rather than a grid
    if ((i + j) % 2) { const l = (cw - iw) / 2; b.box(BRONZE, s, s, l, 0, yc - s / 2, zc - iw / 2 - l / 2); b.box(BRONZE, s, s, l, 0, yc - s / 2, zc + iw / 2 + l / 2); }
    else { const l = (ch - ih) / 2; b.box(BRONZE, s, l, s, 0, yc + ih / 2, zc); b.box(BRONZE, s, l, s, 0, yc - ih / 2 - l, zc); }
  }
}
function pillar(b, x, z, h = 3.45) {
  b.use('matte').box(0xe2ded5, 0.98, 0.32, 0.98, x, 0, z); b.box(PILLAR, 0.8, h, 0.8, x, 0, z);
  b.box(0xe7e3da, 1.0, 0.16, 1.0, x, h, z); b.box(0xe7e3da, 0.56, 0.12, 0.56, x, h + 0.16, z);
  b.use('metal').ball(0xd6ac52, 0.2, x, h + 0.47, z, 14, 10); b.cyl(0xc99a3e, 0.06, 0.1, x, h + 0.26, z, 8);
}

/* ───── canvas pictures: the plaque, the STOP sign, razor wire and chain link ───── */
function plaqueTex() {
  const w = 1024, h = 448, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'), R = rng(5);
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#cfd3d5'); bg.addColorStop(0.45, '#eef0f0'); bg.addColorStop(0.6, '#c3c8cb'); bg.addColorStop(1, '#dde0e1');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '60,66,70'},${0.05 + R() * 0.08})`; g.fillRect(0, R() * h, w, 1); }      // brushed grain
  g.strokeStyle = 'rgba(80,86,90,.35)'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
  const gold = g.createLinearGradient(0, 0, 0, h); gold.addColorStop(0, '#e6c56d'); gold.addColorStop(0.5, '#b8892f'); gold.addColorStop(1, '#d9b155');
  // the emblem: a fish over three waves in a ring
  const ex = w / 2, ey = 112; g.strokeStyle = gold; g.fillStyle = gold; g.lineWidth = 7; g.beginPath(); g.arc(ex, ey, 66, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(ex - 40, ey); g.bezierCurveTo(ex - 20, ey - 30, ex + 18, ey - 28, ex + 30, ey - 4); g.lineTo(ex + 48, ey - 20); g.lineTo(ex + 44, ey); g.lineTo(ex + 48, ey + 16); g.lineTo(ex + 30, ey + 2); g.bezierCurveTo(ex + 16, ey + 22, ex - 22, ey + 22, ex - 40, ey); g.fill();
  g.lineWidth = 5; for (let k = 0; k < 3; k++) { g.beginPath(); for (let i = 0; i <= 40; i++) { const x = ex - 44 + i * 2.2, y = ey + 30 + k * 11 + Math.sin(i * 0.45) * 4; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  g.fillStyle = gold; g.textAlign = 'center'; g.direction = 'rtl'; g.font = '600 62px "Geeza Pro", "Noto Naskh Arabic", Arial, sans-serif'; g.fillText('مركز الشيخ خليفة للأبحاث البحرية', w / 2, 262);
  g.direction = 'ltr'; g.fillStyle = '#2e3337'; g.font = '600 42px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif'; g.fillText('SHEIKH KHALIFA MARINE RESEARCH CENTRE', w / 2, 334);
  g.fillStyle = gold; g.fillRect(w / 2 - 130, 356, 260, 4);
  g.fillStyle = '#4b5257'; g.font = '500 26px "IBM Plex Sans", Arial, sans-serif'; g.fillText('UMM AL QUWAIN  ·  UNITED ARAB EMIRATES', w / 2, 400);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function stopTex() {
  return canvasTex(256, 256, (g, w) => {
    g.clearRect(0, 0, w, w);
    const oct = (r) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * TAU) / 8; g.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r); } g.closePath(); };
    oct(126); g.fillStyle = '#f4f4f2'; g.fill(); oct(116); g.fillStyle = '#c8202a'; g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '700 64px "Geeza Pro", Arial, sans-serif'; g.fillText('قف', w / 2, 112); g.font = '700 58px Arial, sans-serif'; g.fillText('STOP', w / 2, 178);
  }, { repeat: false });
}
function razorTex() {
  return canvasTex(256, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(205,212,216,1)'; g.lineWidth = 2.2;
    for (let i = 0; i < 9; i++) { const x = (i / 8) * w; g.beginPath(); g.ellipse(x, h / 2, 17, h * 0.47, 0.5, 0, TAU); g.stroke(); }
    g.lineWidth = 1.4; for (let i = 0; i < 26; i++) { const x = (i / 25) * w; g.beginPath(); g.moveTo(x - 3, h * 0.2); g.lineTo(x + 3, h * 0.28); g.moveTo(x - 3, h * 0.8); g.lineTo(x + 3, h * 0.72); g.stroke(); }
  });
}
function linkTex() {
  return canvasTex(64, 64, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(190,198,203,1)'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(0, w / 2); g.lineTo(w / 2, 0); g.lineTo(w, w / 2); g.lineTo(w / 2, w); g.closePath(); g.stroke(); });
}

export function buildEntrance(world, { lights }) {
  const { scene, mats, env } = world;
  const G = GATE.x, Z = RB_W.z, H = ROADS.w / 2, WK = H + ROADS.walk;          // road axis z, half the carriageway, outer edge of the walk
  const group = new THREE.Group(); group.name = 'gate';
  const b = new Builder(), R = rng(43);
  const zN = Z - 9.0, zS = Z + 9.0;                                             // outer pillars, at the back of the walks

  /* ───── walls with razor wire, the perimeter fence ───── */
  const coils = [], fences = [];
  const whiteWall = (x0, z0, x1, z1, hgt = 3.0) => {
    b.use('matte').wall(WALL, x0, z0, x1, z1, 0.3, 0, hgt); b.wall(COPING, x0, z0, x1, z1, 0.42, hgt, hgt + 0.1);
    const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len, n = Math.floor(len / 3.6);
    for (let i = 1; i < n; i++) { const x = x0 + ux * i * 3.6, z = z0 + uz * i * 3.6; b.use('matte').box(0xe3e0d9, 0.05, hgt, 0.34, x, 0, z, -Math.atan2(uz, ux)); }     // panel joints
    for (let i = 0; i <= Math.floor(len / 3); i++) { const x = x0 + ux * i * 3, z = z0 + uz * i * 3; b.use('satin').rod(0x8f989e, 0.025, [x, hgt + 0.1, z], [x, hgt + 0.62, z], 5); }   // coil brackets
    coils.push([x0, z0, x1, z1, hgt + 0.36]);
  };
  const fence = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 3));
    b.use('satin'); for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n; b.cyl(0xa9b1b6, 0.045, 2.55, x, 0, z, 6); }
    b.rod(0xa9b1b6, 0.03, [x0, 2.35, z0], [x1, 2.35, z1], 5); for (const y of [2.47, 2.58, 2.69]) b.rod(0x7d868c, 0.009, [x0, y, z0], [x1, y, z1], 3);
    fences.push([x0, z0, x1, z1]);
  };
  // outside: the long wall on the left (north) side of the road in, sand and a low post fence on the right
  whiteWall(-650, zN - 3.4, G - 8.6, zN - 3.4);
  { b.use('satin'); for (let x = -650; x < G - 2; x += 4) b.cyl(0x9aa2a7, 0.04, 1.2, x, 0, zS + 3.5, 6); b.rod(0x8b9399, 0.012, [-650, 0.75, zS + 3.5], [G - 2, 0.75, zS + 3.5], 3); b.rod(0x8b9399, 0.012, [-650, 1.12, zS + 3.5], [G - 2, 1.12, zS + 3.5], 3); }
  // the perimeter: a wall either side of the gate, then a fence to the shore on each side
  const shoreZ = (z, dir) => { while (Math.abs(z) < 900 && landSDF(G, z + dir * 3) < -6) z += dir * 3; return z; };
  whiteWall(G, zN - 3.4, G, zN - 64); fence(G, zN - 64, G, shoreZ(zN - 64, -1));
  whiteWall(G, zS + 0.4, G, zS + 58); fence(G, zS + 58, G, shoreZ(zS + 58, 1));
  b.use('matte').wall(WALL, G, zN - 0.4, G, zN - 3.4, 0.3, 0, 3.0); b.wall(COPING, G, zN - 0.4, G, zN - 3.4, 0.42, 3.0, 3.1);

  /* ───── the gate: pillars, fixed lattice over the walks, and the two leaves (their own meshes, they swing) ───── */
  const zIn = H + 0.5;                                                          // inner pillar centres sit just off the carriageway
  for (const z of [Z - zIn, Z + zIn, zN, zS]) pillar(b, G, z);
  for (const [z0, z1] of [[zN + 0.42, Z - zIn - 0.42], [Z + zIn + 0.42, zS - 0.42]]) { b.push(G, 0, z0); lattice(b, z1 - z0, 2.75, 0.14); b.pop(); }
  const hingeZ = zIn - 0.42, leafLen = hingeZ - 0.04;
  const leaves = [-1, 1].map((s) => {
    const lb = new Builder(); lattice(lb, leafLen, GATE.leafH, 0.12);
    lb.use('satin').cyl(0x1d1916, 0.05, 0.24, 0, GATE.leafH + 0.1, 0.05, 8); lb.ball(0xc99a3e, 0.06, 0, GATE.leafH + 0.36, 0.05, 8, 6);   // hinge pin and its cap
    const pivot = new THREE.Group(); pivot.position.set(G, 0, Z + s * hingeZ); pivot.add(lb.build(mats, { cast: true })); group.add(pivot);
    return { pivot, s };
  });
  const setGate = (k) => { const a = clamp(k, 0, 1) * Math.PI * 0.51; for (const { pivot, s } of leaves) pivot.rotation.y = s < 0 ? a : Math.PI - a; };
  // the name wall: stone, turned towards the cars coming in, a brushed-steel plaque on its face, lit from the ground
  const sA = [G - 8.6, zN - 3.4], sB = [G - 0.75, zN - 0.15], sLen = Math.hypot(sB[0] - sA[0], sB[1] - sA[1]), sRy = -Math.atan2(sB[1] - sA[1], sB[0] - sA[0]);
  const sMid = [(sA[0] + sB[0]) / 2, (sA[1] + sB[1]) / 2], sN = [-(sB[1] - sA[1]) / sLen, (sB[0] - sA[0]) / sLen];       // its face looks this way (south-west, at the road)
  b.use('concrete').box(STONE, sLen, 3.25, 0.85, sMid[0], 0, sMid[1], sRy); b.use('matte').box(0xa79f92, sLen + 0.2, 0.14, 1.0, sMid[0], 3.25, sMid[1], sRy); b.box(0x9d968a, sLen + 0.3, 0.22, 1.1, sMid[0], 0, sMid[1], sRy);
  b.use('metal').box(0xb9bec1, 5.32, 2.36, 0.06, sMid[0] + sN[0] * 0.44, 0.62, sMid[1] + sN[1] * 0.44, sRy);
  for (const o of [-2.2, 0, 2.2]) { const u = [(sB[0] - sA[0]) / sLen, (sB[1] - sA[1]) / sLen]; b.use('glow').box(0xfff0cf, 0.3, 0.1, 0.24, sMid[0] + u[0] * o + sN[0] * 1.6, 0.05, sMid[1] + u[1] * o + sN[1] * 1.6, sRy); }
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.275), new THREE.MeshStandardMaterial({ map: plaqueTex(), metalness: 0.55, roughness: 0.32, envMapIntensity: 1.2 }));
  plaque.position.set(sMid[0] + sN[0] * 0.48, 0.62 + 1.18, sMid[1] + sN[1] * 0.48); plaque.rotation.y = Math.atan2(sN[0], sN[1]); plaque.name = 'gate-sign'; group.add(plaque);

  /* ───── inside: STOP sign, guard cabin, boom barriers ───── */
  { const x = GATE.stop, z = Z + H + 2.6; b.use('satin').cyl(0xa7afb4, 0.04, 2.35, x, 0, z, 8); b.boxC(0x9aa2a7, 0.04, 0.8, 0.8, x + 0.03, 2.3, z, 0, 0, 0);
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86), new THREE.MeshStandardMaterial({ map: stopTex(), transparent: true, alphaTest: 0.5, roughness: 0.6 })); st.position.set(x - 0.02, 2.3, z); st.rotation.y = -Math.PI / 2; group.add(st); }
  { const [x0, x1] = GATE.cabin, z0 = Z + WK + 0.55, z1 = z0 + 3.2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, hc = 2.75;
    b.use('concrete').box(0xcfcbc2, w + 0.4, 0.18, d + 0.4, cx, 0, cz);
    b.use('matte').box(0xdfe3e5, w, hc, d, cx, 0.18, cz);
    for (let x = x0 + 0.11; x < x1; x += 0.22) for (const z of [z0 - 0.02, z1 + 0.02]) b.box(0xeef1f2, 0.07, hc - 0.1, 0.04, x, 0.23, z);       // corrugated cladding
    for (let z = z0 + 0.11; z < z1; z += 0.22) for (const x of [x0 - 0.02, x1 + 0.02]) b.box(0xeef1f2, 0.04, hc - 0.1, 0.07, x, 0.23, z);
    b.box(0xe9ecee, w + 0.5, 0.14, d + 0.5, cx, hc + 0.18, cz); b.box(0xbcc3c7, w + 0.56, 0.06, d + 0.56, cx, hc + 0.18, cz);
    b.use('window').box(null, 2.1, 1.0, 0.06, x0 + 1.6, 1.15, z0 - 0.04); b.use('window').box(null, 0.06, 1.0, 1.7, x0 - 0.04, 1.15, cz);
    b.use('matte').box(0xc9cfd2, 0.95, 2.1, 0.06, x1 - 0.95, 0.18, z0 - 0.05); b.box(0x8e979c, 0.05, 0.05, 0.05, x1 - 1.3, 1.2, z0 - 0.09);   // door and its handle
    b.box(0xf4f5f5, 0.78, 0.5, 0.3, x1 + 0.17, 1.9, cz + 0.6); b.box(0x9aa3a8, 0.6, 0.04, 0.04, x1 + 0.17, 2.05, cz + 0.45);                // the AC unit
    b.use('glow').box(0xfff4d6, 0.5, 0.06, 0.12, x0 + 1.6, 2.45, z0 - 0.1); }
  const booms = [-1, 1].map((s) => {
    const x = GATE.boom, z = Z + s * (H + 1.15);
    b.use('satin').box(ORANGE, 0.42, 1.05, 0.38, x, 0.06, z); b.box(0x2a2f33, 0.44, 0.06, 0.4, x, 1.11, z); b.use('glow').box(0xffb02e, 0.16, 0.06, 0.03, x - 0.22, 0.9, z);
    const ab = new Builder(), len = H + 0.95;
    for (let i = 0; i < 6; i++) ab.use('satin').boxC(i % 2 ? 0xd43a2f : 0xf6f6f4, 0.09, 0.09, len / 6, 0, 0, -s * (len / 12 + (i * len) / 6));
    ab.use('satin').boxC(0x3a4044, 0.16, 0.2, 0.3, 0, 0, s * 0.1);
    const pivot = new THREE.Group(); pivot.position.set(x, 0.98, z); pivot.add(ab.build(mats, { cast: true })); group.add(pivot);
    return { pivot, s };
  });
  const setBoom = (k) => { const a = clamp(k, 0, 1) * Math.PI * 0.46; for (const { pivot, s } of booms) pivot.rotation.x = s > 0 ? a : -a; };

  /* ───── the wheel bath: a shallow pool across the road, blue-painted floor and kerbs, ramps in and out ───── */
  const [w0, w1] = GATE.wash, wx = (w0 + w1) / 2, wl = w1 - w0, WY = 0.205;
  b.use('matte').box(0x57c3cf, wl, 0.012, ROADS.w, wx, 0.076, Z);
  for (let i = 0; i < 9; i++) b.box(0x4ab6c4, wl - 0.4, 0.004, 0.05, wx, 0.089, Z - H + 0.6 + (i * (ROADS.w - 1.2)) / 8);      // tile joints
  for (const s of [-1, 1]) { b.box(0x3aa7b8, wl + 0.6, 0.26, 0.32, wx, 0.06, Z + s * (H + 0.16)); b.box(0xd9d5cc, wl + 0.6, 0.03, 0.36, wx, 0.32, Z + s * (H + 0.16)); }
  for (const x of [w0, w1]) b.use('concrete').box(0xc4c0b6, 0.7, 0.05, ROADS.w, x, 0.076, Z);
  b.use('water').box(0x3fa2b3, wl, 0.005, ROADS.w, wx, WY - 0.005, Z);
  // close up, the water is a mirror (the car and the sky in it, broken by ripples over the blue floor); far off it is the plain sheet above
  const mirror = new Reflector(new THREE.PlaneGeometry(wl, ROADS.w), { textureWidth: 640, textureHeight: 480, clipBias: 0.003, multisample: 4, shader: {
    name: 'WheelBath', uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tN: { value: mats.water.normalMap }, uT: { value: 0 } },
    vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse, tN; uniform float uT; varying vec4 vUv; varying vec3 vW;
      void main(){
        vec2 p = vW.xz;
        vec2 d = (texture2D(tN, p * 0.16 + uT * vec2(0.035, 0.021)).rg - 0.5) * 0.05 + (texture2D(tN, p * 0.43 - uT * vec2(0.024, -0.031)).rg - 0.5) * 0.028;
        vec4 uv = vUv; uv.xy += d * uv.w;
        vec3 refl = texture2DProj(tDiffuse, uv).rgb;
        vec3 v = normalize(cameraPosition - vW); float fres = 0.32 + 0.6 * pow(1.0 - clamp(v.y, 0.0, 1.0), 4.0);
        vec3 floorCol = vec3(0.17, 0.56, 0.62) * (0.9 + 0.2 * d.x * 10.0);
        gl_FragColor = vec4(mix(floorCol, refl * vec3(0.86, 0.97, 1.0), fres), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` } });
  mirror.rotation.x = -Math.PI / 2; mirror.position.set(wx, WY + 0.002, Z); mirror.visible = false; mirror.name = 'wheel-bath-mirror'; group.add(mirror);
  // ripples, rings from the wheels and the bow wave: one sheet over the water, drawn from a list of wave sources
  const NW = 24, waves = Array.from({ length: NW }, () => new THREE.Vector4(0, 0, -99, 0)); let wi = 0, tNow = 0;
  const wakeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uW: { value: waves }, uBox: { value: new THREE.Vector4(w0 + 0.05, w1 - 0.05, Z - H + 0.05, Z + H - 0.05) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT; uniform vec4 uW[${NW}]; uniform vec4 uBox; varying vec3 vW;
      void main(){
        if (vW.x < uBox.x || vW.x > uBox.y || vW.z < uBox.z || vW.z > uBox.w) discard;
        float a = 0.0;
        for (int i = 0; i < ${NW}; i++) { vec4 s = uW[i]; float age = uT - s.z; if (age < 0.0 || age > 2.6) continue;
          float r = 0.25 + age * 1.75, d = distance(vW.xz, s.xy), band = exp(-pow((d - r) / (0.07 + age * 0.05), 2.0));
          float inner = exp(-pow((d - r * 0.62) / (0.06 + age * 0.04), 2.0)) * 0.45;
          a += (band + inner) * s.w * (1.0 - age / 2.6) * (1.0 - age / 2.6); }
        float edge = smoothstep(0.0, 0.5, min(min(vW.x - uBox.x, uBox.y - vW.x), min(vW.z - uBox.z, uBox.w - vW.z)));
        a = min(a, 0.85) * edge;
        gl_FragColor = vec4(vec3(0.92, 0.98, 1.0) * a, a);
      }` });
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(wl, ROADS.w).rotateX(-Math.PI / 2), wakeMat); wake.position.set(wx, WY + 0.004, Z); wake.renderOrder = 3; wake.frustumCulled = false; group.add(wake);
  // spray thrown up by the front wheels as they hit the water
  const NS = 140, sPos = new Float32Array(NS * 3), sVel = new Float32Array(NS * 3), sAge = new Float32Array(NS).fill(9); let si = 0;
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sGeo.setAttribute('aAge', new THREE.BufferAttribute(sAge, 1));
  const spray = new THREE.Points(sGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uS: { value: 1 } },
    vertexShader: 'attribute float aAge; uniform float uS; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; vA = clamp(1.0 - aAge / 0.9, 0.0, 1.0); gl_PointSize = clamp(0.05 * uS / -mv.z, 1.0, 14.0) * (0.6 + 0.4 * vA); }',
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5 || vA <= 0.0) discard; gl_FragColor = vec4(0.93, 0.98, 1.0, vA * 0.8 * (1.0 - d * 2.0)); }' }));
  spray.frustumCulled = false; spray.renderOrder = 4; group.add(spray); spray.material.userData.scale = spray.material.uniforms.uS;     // world.js keeps it in pixels per metre
  const wash = {
    x0: w0, x1: w1, z0: Z - H, z1: Z + H, y: WY,
    /** a ring wave from (x, z), strength 0..1 */
    wake(x, z, k = 1) { waves[wi].set(x, z, tNow, k); wi = (wi + 1) % NW; },
    /** a burst of spray at (x, z) thrown forward along +x at speed v */
    splash(x, z, v = 4, n = 24) { for (let i = 0; i < n; i++) { const j = si; si = (si + 1) % NS; sPos[j * 3] = x + (R() - 0.5) * 0.3; sPos[j * 3 + 1] = WY + 0.02; sPos[j * 3 + 2] = z + (R() - 0.5) * 0.3;
      const a = (R() - 0.5) * 2.4; sVel[j * 3] = v * (0.35 + R() * 0.5) + Math.cos(a) * 0.6; sVel[j * 3 + 1] = 1.1 + R() * 1.9; sVel[j * 3 + 2] = Math.sin(a) * (1.0 + R() * 1.4); sAge[j] = 0; } },
    reset() { for (const w of waves) w.z = -99; sAge.fill(9); sGeo.attributes.aAge.needsUpdate = true; },
  };
  const tickWash = (dt) => {
    tNow += dt; wakeMat.uniforms.uT.value = tNow;
    let any = false;
    for (let j = 0; j < NS; j++) { if (sAge[j] > 1) continue; any = true; sAge[j] += dt; sVel[j * 3 + 1] -= 9.8 * dt; sPos[j * 3] += sVel[j * 3] * dt; sPos[j * 3 + 1] = Math.max(WY, sPos[j * 3 + 1] + sVel[j * 3 + 1] * dt); sPos[j * 3 + 2] += sVel[j * 3 + 2] * dt; }
    if (any || spray.visible) { sGeo.attributes.position.needsUpdate = true; sGeo.attributes.aAge.needsUpdate = true; }
    spray.visible = any;
  };

  /* ───── the salt lagoons beside the flag road: wet sand, a pale salt rim, shallow still water ───── */
  for (const p of lagoons()) {
    let cx = 0, cz = 0; for (const [x, z] of p) { cx += x / p.length; cz += z / p.length; }
    const grow = (k) => p.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
    b.use('matte').poly(0xe7e1d2, grow(1.1), 0.012); b.poly(0xc2b088, grow(1.04), 0.018);
    b.use('water').poly(0x9cc7cc, p, 0.03);
  }

  /* ───── the gold shell on the west roundabout, where the drive in ends (it used to be part of the site group) ───── */
  b.use('satin').cyl(0xe6dfd0, 3.2, 0.9, RB_W.x, 0.4, RB_W.z, 28); b.use('metal').ico(0xd9a441, 4.6, RB_W.x, 5.0, RB_W.z, 0.86, 0.4, 1); b.use('metal').cyl(0xb98a34, 0.5, 1.4, RB_W.x, 1.3, RB_W.z, 10);

  /* ───── solar street lights on both sides of the road in; inside the gate every one carries a UAE flag ───── */
  const lampAt = (x, s) => lights.push({ x, z: Z + s * (H + 1.7), ry: s > 0 ? Math.PI / 2 : -Math.PI / 2 });
  for (let x = -646; x < G - 14; x += 32) { lampAt(x, -1); lampAt(x + 16, 1); }
  const inside = [];
  for (let x = w1 + 6; x < RB_W.x - RB_W.r - H - 4; x += 28) { lampAt(x, -1); lampAt(x + 14, 1); inside.push([x, -1], [x + 14, 1]); }
  const flags = createFlags(mats, inside.map(([x, s]) => ({ x: x - 0.02 * s, z: Z + s * (H + 1.7), h: 7.2, s: 1.05, pole: false })));
  flags.group.name = 'flags-road'; scene.add(flags.group);

  const static_ = b.build(mats, { cast: true }); group.add(static_);
  // razor wire coils and chain-link mesh: one see-through tube or sheet per straight run, uv in metres
  { const tex = razorTex(), mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.35, side: THREE.DoubleSide, metalness: 0.7, roughness: 0.38, color: 0xc9cfd3 });
    for (const [x0, z0, x1, z1, y] of coils) {
      const len = Math.hypot(x1 - x0, z1 - z0), geo = new THREE.CylinderGeometry(0.27, 0.27, len, 10, 1, true), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * len / 0.55);
      const m = new THREE.Mesh(geo, mat); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.rotation.set(0, -Math.atan2(z1 - z0, x1 - x0), Math.PI / 2, 'YXZ'); m.castShadow = false; group.add(m);
    } }
  { const tex = linkTex(), mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5, color: 0xc4cbcf });
    for (const [x0, z0, x1, z1] of fences) {
      const len = Math.hypot(x1 - x0, z1 - z0), geo = new THREE.PlaneGeometry(len, 2.3), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 0.12, uv.getY(i) * 2.3 / 0.12);
      const m = new THREE.Mesh(geo, mat); m.position.set((x0 + x1) / 2, 1.2, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); group.add(m);
    } }
  scene.add(group);

  setGate(1); setBoom(1);                                 // open, as the site works; the opening film shuts them first
  const _c = new THREE.Vector3(), here = new THREE.Vector3(wx, WY, Z);
  world.updaters.push((dt, t) => {
    tickWash(dt); flags.update(dt, t);
    // the mirror costs a second render of the scene, so it is on only when the camera is near the bath and low enough to see it
    world.camera.getWorldPosition(_c); const near = _c.distanceTo(here) < 70 && _c.y < 30;
    if (mirror.visible !== near) mirror.visible = near; if (near) mirror.material.uniforms.uT.value = t;
  });
  void env;
  return { group, setGate, setBoom, wash, flags, mirror, lampsInside: inside };
}
