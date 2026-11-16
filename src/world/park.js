// Areas 01 and 02: the Marine Innovation Park, modelled from the client's floor plan.
// Plan scale 0.1 m per pixel. Local frame: origin at the rotunda centre, +x = plan right, +z = plan down.
// Angles are in degrees, 0 = +x, 90 = +z (south), 180 = west, 270 = north.
import * as THREE from 'three';
import { Builder, C, shade, rng, TAU, DEG, sectorPts, arcPts, canvasTex } from './kit.js';
import { wallRun, noteWall, roofGear, aoSkirts, CUT } from './shell.js';
import * as E from './equip.js';
import { WEAR, wearFor } from './people.js';
import { PARK, PARK_FRAME } from './layout.js';
import { buildOval } from './oval.js';
import { P } from './rig.js';

const F = E.FLOOR;
export const RH = 11.1, RR = 14.7, RO = 25.5, RT = 33;      // hall wall, ring corridor, outer wall, terrace
export const SPINE = { x: 12, z: -3.1, ry: 0.1396 };        // the angled corridor to the office wing (8° off the plan axis)
const WING = { x0: -18.1, x1: 107.5, z0: -48.3, zr: -32.8, zc: -28.5, split: 29.1, h: 5.2 };
const UPF = 3.6;                                              // height of the wing's upper floor
const pol = (r, deg) => [Math.cos(deg * DEG) * r, Math.sin(deg * DEG) * r];
const ux = Math.cos(SPINE.ry), uz = -Math.sin(SPINE.ry), vx = Math.sin(SPINE.ry), vz = Math.cos(SPINE.ry);
/** spine frame (u along the corridor, v to the south) → local xz */
const uv = (u, v) => [SPINE.x + ux * u + vx * v, SPINE.z + uz * u + vz * v];

/** keep the part of a polygon where nx*x + nz*z <= c */
function clip(poly, nx, nz, c) {
  const out = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], da = nx * a[0] + nz * a[1] - c, db = nx * b[0] + nz * b[1] - c;
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
// the fan rooms sit between the corridor of the lab wing (z = zc) and the angled spine
const SPN = { nx: vx, nz: vz, c: vx * SPINE.x + vz * SPINE.z - 1.9 };          // north of the spine's north edge
const fan = (r0, r1, a0 = -78, a1 = -4) => clip(clip(sectorPts(r0, r1, a0 * DEG, a1 * DEG, 3 * DEG), 0, -1, -WING.zc), SPN.nx, SPN.nz, SPN.c);

/** arc wall with door gaps (degrees), low + high parts */
function arcRun(lo, hi, r, a0, a1, { t = 0.3, h = 7.5, hex = C.clay, doors = [], glass = false, mull = 6, cut = CUT } = {}) {
  const ds = doors.slice().sort((p, q) => p[0] - q[0]); const spans = []; let p = a0;
  for (const [d0, d1] of ds) { if (d0 > p + 0.05) spans.push([p, Math.min(d0, a1)]); p = Math.max(p, d1); }
  if (a1 > p + 0.05) spans.push([p, a1]);
  for (const [s0, s1] of spans) {
    const A0 = s0 * DEG, A1 = s1 * DEG;
    for (let k = 0, n = Math.max(1, Math.ceil((s1 - s0) / 5)); k < n; k++) { const p = pol(r, s0 + ((s1 - s0) * k) / n), q = pol(r, s0 + ((s1 - s0) * (k + 1)) / n); noteWall(lo, p[0], p[1], q[0], q[1], hi ? h : cut); }
    if (glass) {
      lo.use('matte').arcWall(hex, r, A0, A1, t, F, F + 0.3); lo.use('glass').arcWall(C.glass, r, A0, A1, 0.08, F + 0.3, cut); lo.use('matte').arcWall(C.poche, r, A0, A1, 0.14, cut, cut + 0.05);
      for (let a = s0; a <= s1 + 0.01; a += mull) { const [x, z] = pol(r, a); lo.use('satin').box(C.alu, 0.12, cut - F, 0.2, x, F, z, -(a * DEG)); if (hi) hi.use('satin').box(C.alu, 0.14, h - cut - 0.6, 0.24, x, cut, z, -(a * DEG)); }
      if (hi) { hi.use('window').arcWall(null, r, A0, A1, 0.1, cut, h - 0.6); hi.use('matte').arcWall(hex, r, A0, A1, t, h - 0.6, h); }
    } else {
      lo.use('matte').arcWall(hex, r, A0, A1, t, F, cut); lo.arcWall(C.poche, r, A0, A1, Math.max(0.08, t - 0.07), cut, cut + 0.05);
      if (hi) hi.use('matte').arcWall(hex, r, A0, A1, t, cut, h);
    }
  }
  if (hi) for (const [d0, d1] of ds) hi.use('matte').arcWall(hex, r, d0 * DEG, d1 * DEG, t, Math.max(cut, 2.6), h);
  for (const [d0, d1] of ds) if (d1 - d0 < 12) { const p = pol(r, d0), q = pol(r, d1); noteWall(lo, p[0], p[1], q[0], q[1], 0, 2); }        // doorways (the wide openings of the hall are not doors)
}
const radial = (lo, hi, deg, r0, r1, o = {}) => { const a = pol(r0, deg), b = pol(r1, deg); wallRun(lo, hi, a[0], a[1], b[0], b[1], { t: 0.25, h: 7.5, ...o }); };

function signTex(dark) {
  return canvasTex(1536, 200, (g, w, h) => {
    g.fillStyle = dark ? '#efe9dc' : '#fbfaf7'; g.fillRect(0, 0, w, h);
    g.fillStyle = dark ? '#3a3a36' : '#b8923e'; g.textBaseline = 'middle';
    g.font = '600 56px "IBM Plex Sans", Helvetica, Arial, sans-serif'; g.textAlign = 'right'; g.fillText('MARINE INNOVATION PARK', w / 2 - 96, h / 2 + 3);
    g.font = '600 62px "Geeza Pro", "Noto Sans Arabic", Tahoma, sans-serif'; g.direction = 'rtl'; g.textAlign = 'left'; g.fillText('مركز الابتكار البحري', w / 2 + 96, h / 2 + 3);
    const gr = g.createLinearGradient(0, 30, 0, 170); gr.addColorStop(0, '#e2c06a'); gr.addColorStop(1, '#a98232'); g.fillStyle = gr; g.fillRect(w / 2 - 62, 32, 124, 136);
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2 - 28, 134); g.quadraticCurveTo(w / 2 - 6, 78, w / 2 + 8, 56); g.quadraticCurveTo(w / 2 + 20, 98, w / 2 + 30, 134); g.stroke();
  }, { repeat: false });
}

export function buildPark(world) {
  const { mats, areas, scene } = world;
  const px = PARK.x, pz = PARK.z;
  const Wb = (x0, z0, x1, z1, y1 = 2.4, y0 = 0) => [px + Math.min(x0, x1), y0, pz + Math.min(z0, z1), px + Math.max(x0, x1), y1, pz + Math.max(z0, z1)];
  /** box of a ring sector room */
  const Sb = (r0, r1, a0, a1, y1 = 2.4) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of sectorPts(r0, r1, a0 * DEG, a1 * DEG, 5 * DEG)) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return Wb(x0, z0, x1, z1, y1); };
  /** box of a rectangle in the spine frame */
  const Ub = (u0, v0, u1, v1, y1 = 2.4) => { const ps = [uv(u0, v0), uv(u1, v0), uv(u1, v1), uv(u0, v1)]; return Wb(Math.min(...ps.map((p) => p[0])), Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[1])), y1); };

  const lo1 = new Builder(), hi1 = new Builder(), lo2 = new Builder(), hi2 = new Builder();
  const roof1 = mats.roofSet(), roof2 = mats.roofSet();
  for (const b of [lo1, hi1, lo2, hi2]) b.push(px, 0, pz);

  /* ───────── floors ───────── */
  lo1.use('floorTile').prism(C.floorStone, arcPts(RO, 0, TAU, 0, 0, 3 * DEG), 0, F, { sides: false });
  lo1.use('matte').prism(0xf1ede4, arcPts(RH - 0.15, 0, TAU, 0, 0, 4 * DEG), F, F + 0.012, { sides: false });           // exhibition hall terrazzo
  lo1.use('matte').prism(C.carpet, sectorPts(RR + 2.2, RO - 0.3, 10 * DEG, 89 * DEG), F, F + 0.02, { sides: false });   // amphitheatre carpet
  for (const [r0, r1, hex] of [[RO, 29, C.floor], [29, 33, C.floor], [33, 40.5, C.floorStone], [40.5, 47.4, C.floorStone]]) lo1.use('floorTile').prism(hex, fan(r0, r1), 0, F, { sides: false });
  lo1.use('floorTile').box(C.floor, WING.split - WING.x0, F, WING.zc - WING.z0, (WING.x0 + WING.split) / 2, 0, (WING.z0 + WING.zc) / 2);
  lo1.use('floorTile').prism(C.floor, [[-18.1, WING.zc], [29.1, WING.zc], [29.1, -19], [18, -18.5], [-18.1, -18]], 0, F, { sides: false });   // link between the drum and the wing
  lo2.use('floorTile').box(C.floorLab, WING.x1 - WING.split, F, WING.zc - WING.z0, (WING.x1 + WING.split) / 2, 0, (WING.z0 + WING.zc) / 2);
  lo2.use('floorTile').prism(C.floor, [uv(0, -1.9), uv(92, -1.9), uv(92, 1.9), uv(0, 1.9)], 0, F, { sides: false });   // spine corridor
  lo2.use('floorTile').prism(C.floor, [uv(24.1, 1.9), uv(92, 1.9), uv(92, 17.6), uv(24.1, 17.6)], 0, F, { sides: false });
  lo2.use('floorTile').box(C.floor, 24.1, F, 9.8, 103.05, 0, -23.4);                                                     // east connector + service block

  /* ───────── rotunda walls ───────── */
  arcRun(lo1, hi1, RH, 0, 360, { t: 0.4, h: 9.2, doors: [[262, 278], [350, 360], [0, 9], [118, 134], [40, 52]] });
  arcRun(lo1, hi1, RR, 9, 232, { t: 0.25, h: 7.5, doors: [[44, 50], [92, 97], [104, 141], [151, 156], [166, 171], [187, 192], [214, 219]] });
  arcRun(lo1, hi1, RR, 232, 339, { t: 0.25, h: 7.5, doors: [[244, 249], [262, 278], [289, 294], [318, 323]] });
  arcRun(lo1, hi1, RR, 354, 369, { t: 0.25, h: 7.5, doors: [[359, 364]] });
  // outer wall: glazed from the amphitheatre round past the entrance to the west rooms; solid where it meets the wing
  arcRun(lo1, hi1, RO, 9, 232, { t: 0.35, h: 7.5, glass: true, mull: 4.5, doors: [[119, 127]] });
  arcRun(lo1, hi1, RO, 232, 262, { t: 0.35, h: 7.5 }); arcRun(lo1, hi1, RO, 278, 300, { t: 0.35, h: 7.5 }); arcRun(lo1, hi1, RO, 354, 369, { t: 0.35, h: 7.5, glass: true, mull: 5 });
  for (const d of [9, 90, 99, 146, 161, 177, 202, 232]) radial(lo1, hi1, d, RR, RO, d === 99 || d === 146 ? { glass: true, mullion: 0 } : {});
  for (const d of [262, 278, 305]) radial(lo1, hi1, d, RR, d === 305 ? RO : 28.9);
  radial(lo1, hi1, 354, RR, RO);
  // entrance vestibule
  { const [ex, ez] = pol(RO + 1.6, 123), ry = -(123 * DEG) + Math.PI / 2; lo1.use('floorTile').box(C.floorStone, 6.4, F, 3.6, ex, 0, ez, ry);
    for (const s of [-3.1, 3.1]) { const c = Math.cos(ry), sn = Math.sin(ry); wallRun(lo1, hi1, ex + s * c - 1.7 * sn, ez - s * sn - 1.7 * c, ex + s * c + 1.7 * sn, ez - s * sn + 1.7 * c, { t: 0.14, h: 3.4, glass: true }); }
    hi1.use('matte').box(C.clay, 7, 0.3, 4.4, ex, 3.4, ez, ry); }

  /* ───────── lab wing (north) ───────── */
  const rooms = [[-18.1, 1.1], [1.4, 12.1], [15.6, 19.1], [19.1, 29.1], [29.1, 37.9], [37.9, 47.6], [54.1, 64.4], [64.4, 73.1], [73.1, 81.8], [81.8, 92.6], [99.6, 107.5]];
  const wingWalls = (lo, hi, x0, x1) => {
    const o = { t: 0.35, h: WING.h };
    wallRun(lo, hi, x0, WING.z0 + 0.17, x1, WING.z0 + 0.17, o);
    // corridor side: one door per room
    const doors = rooms.filter((r) => r[0] >= x0 - 0.1 && r[1] <= x1 + 0.1).map((r) => ({ at: (r[0] + r[1]) / 2 - x0, w: 1.5, h: 2.4 }));
    wallRun(lo, hi, x0, WING.zr, x1, WING.zr, { ...o, t: 0.22, doors });
  };
  wingWalls(lo1, hi1, WING.x0, WING.split); wingWalls(lo2, hi2, WING.split, WING.x1);
  wallRun(lo1, hi1, WING.x0 + 0.17, WING.z0, WING.x0 + 0.17, WING.zc, { t: 0.35, h: WING.h, doors: [{ at: 17.6, w: 1.8, h: 2.5 }] });
  wallRun(lo2, hi2, WING.x1 - 0.17, WING.z0, WING.x1 - 0.17, WING.zc, { t: 0.35, h: WING.h });
  for (const x of [1.25, 12.1, 15.6, 19.1]) wallRun(lo1, hi1, x, WING.z0 + 0.3, x, WING.zr, { t: 0.2, h: WING.h });
  wallRun(lo1, hi1, WING.split - 0.11, WING.z0 + 0.3, WING.split - 0.11, WING.zr, { t: 0.2, h: WING.h }); wallRun(lo2, hi2, WING.split + 0.11, WING.z0 + 0.3, WING.split + 0.11, WING.zc, { t: 0.2, h: WING.h, doors: [{ at: 17.5, w: 2.2, h: 2.5, shut: false }] });
  for (const x of [37.9, 47.6, 54.1, 64.4, 73.1, 81.8, 92.6, 99.6]) wallRun(lo2, hi2, x, WING.z0 + 0.3, x, WING.zr, { t: 0.2, h: WING.h });
  // corridor wall towards the drum, the fans and the courtyard (glazed along the courtyard)
  wallRun(lo1, hi1, WING.x0, WING.zc, -9.5, WING.zc, { t: 0.3, h: WING.h });
  wallRun(lo1, hi1, -18, -18, WING.x0 + 0.1, WING.zc, { t: 0.3, h: WING.h });
  wallRun(lo2, hi2, 38.4, WING.zc, 87.4, WING.zc, { t: 0.2, h: WING.h, glass: true, mullion: 3.2, doors: [{ at: 24, w: 2, h: 2.5 }] });
  // windows on the sea side of the wing
  for (const [b, x0, x1] of [[hi1, WING.x0, WING.split], [hi2, WING.split, WING.x1]]) for (let x = x0 + 2.6; x < x1 - 1.5; x += 4.3) b.use('window').box(null, 2.6, 1.6, 0.14, x, 2.0, WING.z0 - 0.02);
  for (let x = WING.x0 + 3; x < WING.x1 - 2; x += 5.2) (x < WING.split ? lo1 : lo2).use('glass').box(C.glass, 2.6, CUT - 0.5, 0.1, x, 0.5, WING.z0 + 0.17);

  /* ───────── fan rooms (canteen side) ───────── */
  const fanArc = (lo, hi, r, glass, doors = []) => { const pts = fan(r - 0.01, r + 0.01); let a0 = 360, a1 = -360; for (const p of pts) { const a = Math.atan2(p[1], p[0]) / DEG; a0 = Math.min(a0, a); a1 = Math.max(a1, a); } arcRun(lo, hi, r, a0 + 0.4, a1 - 0.4, { t: 0.25, h: 5.6, glass, mull: 3, doors }); return [a0, a1]; };
  fanArc(lo1, hi1, 29, false, [[-36, -33]]); fanArc(lo1, hi1, 33, false, [[-40, -37], [-24, -21]]); fanArc(lo1, hi1, 40.5, true, [[-33, -29]]);
  const fa = fanArc(lo1, hi1, 47.3, true, [[-28, -25.5]]);
  { const a = pol(RO, 300), c = pol(28.9, 278); wallRun(lo1, hi1, c[0], c[1], c[0], WING.zc, { t: 0.25, h: 5.6 }); }

  /* ───────── spine corridor and office wing ───────── */
  const wU = (lo, hi, u0, v0, u1, v1, o = {}) => { const a = uv(u0, v0), c = uv(u1, v1); wallRun(lo, hi, a[0], a[1], c[0], c[1], { t: 0.25, h: 5, ...o }); };
  wU(lo2, hi2, 3.4, -1.9, 26.5, -1.9, {}); wU(lo2, hi2, 35.6, -1.9, 79, -1.9, { glass: true, mullion: 3 }); wU(lo2, hi2, 79, -1.9, 92, -1.9, { doors: [{ at: 6, w: 2.2, h: 2.5, shut: false }] });
  wU(lo2, hi2, 9, 1.9, 24.1, 1.9, { glass: true, mullion: 3, doors: [{ at: 8, w: 2, h: 2.5 }] });
  const blocks = [[24.1, 36], [36, 52.3], [59.2, 68.8], [68.8, 77.9], [77.9, 88]];
  wU(lo2, hi2, 24.1, 1.9, 92, 1.9, { t: 0.22, doors: [...blocks.map(([a, c]) => ({ at: (a + c) / 2 - 24.1, w: 1.5, h: 2.4 })), { at: 31.5, w: 1.3, h: 2.4 }] });
  wU(lo2, hi2, 24.1, 17.6, 92, 17.6, { t: 0.35 }); wU(lo2, hi2, 24.1, 1.9, 24.1, 17.6, { t: 0.35 }); wU(lo2, hi2, 92, -1.9, 92, 17.6, { t: 0.35, doors: [{ at: 1.9, w: 2, h: 2.5 }] });
  for (const u of [36, 52.3, 59.2, 68.8, 77.9, 88]) wU(lo2, hi2, u, 1.9, u, 17.6, { t: 0.2 });
  wU(lo2, hi2, 52.3, 12, 59.2, 12, { t: 0.2 });
  for (let u = 27; u < 90; u += 4.4) { const p = uv(u, 17.62); hi2.use('window').box(null, 2.6, 1.5, 0.14, p[0], 2.0, p[1], SPINE.ry); const q = uv(u, 17.42); lo2.use('glass').box(C.glass, 2.6, CUT - 0.5, 0.1, q[0], 0.5, q[1], SPINE.ry); }
  // east connector and service block
  for (const [x0, z0, x1, z1, d] of [[91, -28.3, 115.1, -28.3], [115.1, -28.3, 115.1, -18.5], [91, -18.5, 115.1, -18.5, [{ at: 4.4, w: 2.2, h: 2.5, shut: false }]], [91, -28.3, 91, -18.5, [{ at: 4, w: 2, h: 2.5 }]], [103.4, -28.3, 103.4, -18.5, [{ at: 5, w: 1.4, h: 2.4 }]]]) wallRun(lo2, hi2, x0, z0, x1, z1, { t: 0.3, h: 5, doors: d || [] });

  /* ───────── roofs ───────── */
  // the white shell, the curved glass front, the name over the doors and the podium with its lawns, steps and ramp (oval.js)
  const oval = buildOval(lo1, hi1, { RO, pol });
  // flat roofs
  const flat = (b, pts, y, hex = C.roof) => { b.use('matte').prism(hex, pts, y, y + 0.35); b.use('glow').prism(0xdde2e1, pts, y - 0.07, y - 0.03, { cap: false, sides: false, bottom: true }); };
  // ceilings seen from inside: the hall under the shell, the ring of rooms round it, the two wings
  hi1.use('glow').cyl(0xe2e6e4, RH - 0.2, 0.05, 0, 9.1, 0, 56); hi1.use('glow').sector(0xdfe3e1, RH + 0.2, RO - 0.2, 0, TAU, 7.4, 7.46, { bottom: true, cap: false, sides: false });
  for (let k = 0; k < 3; k++) hi1.use('glow').torus(0xfff6dc, 5.4 + k * 2.2, 0.07, 0, 9.0, 0, 5, 56);
  hi1.use('glow').box(0xdde2e1, WING.split - WING.x0 - 0.6, 0.04, WING.zc - WING.z0 - 0.6, (WING.x0 + WING.split) / 2, WING.h - 0.05, (WING.z0 + WING.zc) / 2);
  hi2.use('glow').box(0xdde2e1, WING.x1 - WING.split - 0.6, 0.04, WING.zc - WING.z0 - 0.6, (WING.x1 + WING.split) / 2, WING.h - 0.05, (WING.z0 + WING.zc) / 2);
  for (let x = WING.x0 + 3; x < WING.x1 - 3; x += 5.2) (x < WING.split ? hi1 : hi2).use('glow').box(0xfff8e6, 3.2, 0.05, 0.3, x, WING.h - 0.12, (WING.zr + WING.zc) / 2);
  for (const [r0, r1] of [[RO - 0.4, 47.6]]) flat(hi1, fan(r0, r1), 5.6);
  hi1.use('matte').box(C.roof, WING.split - WING.x0 + 0.8, 0.35, WING.zc - WING.z0 + 0.8, (WING.x0 + WING.split) / 2 - 0.2, WING.h, (WING.z0 + WING.zc) / 2);
  flat(hi1, [[-18.5, WING.zc], [29.1, WING.zc], [29.1, -20], [15, -21], [-18.4, -17.4]], 5.3);
  hi2.use('matte').box(C.roof, WING.x1 - WING.split + 0.6, 0.35, WING.zc - WING.z0 + 0.8, (WING.x1 + WING.split) / 2 + 0.1, WING.h, (WING.z0 + WING.zc) / 2);
  flat(hi2, [uv(3, -2.2), uv(92.4, -2.2), uv(92.4, 18), uv(23.7, 18), uv(23.7, 2.2), uv(3, 2.2)], 5);
  hi2.use('matte').box(C.roof, 24.6, 0.35, 10.4, 103.05, 5, -23.4);
  // the upper floor of the lab wing, as in the client's render: a plain white storey with a row of small square windows
  // on both long sides (the shell only: it lifts away with the roof, the rooms below are unchanged)
  for (const [b, x0, x1] of [[hi1, WING.x0, WING.split], [hi2, WING.split, WING.x1]]) {
    const y = WING.h + 0.35, zm = (WING.z0 - 0.3 + WING.zc) / 2, d = WING.zc - WING.z0 + 0.3;
    b.use('matte').box(0xf2f0eb, x1 - x0 + 0.02, UPF, d, (x0 + x1) / 2, y, zm);
    b.use('matte').box(C.roof, x1 - x0 + 0.3, 0.35, d + 0.3, (x0 + x1) / 2, y + UPF, zm);
    b.use('matte').box(0xe4e1da, x1 - x0 + 0.02, 0.5, 0.12, (x0 + x1) / 2, y + UPF - 0.1, WING.z0 - 0.47);       // parapet line on the beach side
    for (let x = x0 + 2.2; x < x1 - 1.4; x += 3.3) for (const z of [WING.z0 - 0.37, WING.zc + 0.06]) b.use('window').box(null, 1.25, 1.25, 0.1, x, y + 1.25, z);
  }
  roofGear(hi1, WING.x0 + 2, WING.z0 + 2, WING.split - 2, WING.zr - 1, WING.h + 0.35 + UPF + 0.35, 21); roofGear(hi2, WING.split + 2, WING.z0 + 2, WING.x1 - 2, WING.zr - 1, WING.h + 0.35 + UPF + 0.35, 22);
  for (let u = 30; u < 88; u += 9.5) { const p = uv(u, 9.5); hi2.use('satin').box(C.steel, 2.2, 1.2, 1.4, p[0], 5.35, p[1], SPINE.ry); }
  for (let x = WING.x0 + 1; x < WING.x1; x += 8) (x < WING.split ? hi1 : hi2).use('glow').box(C.led, 6, 0.1, 0.1, x + 3, WING.h - 0.25, WING.z0 - 0.08);

  /* ───────── courtyard and terrace (always visible) ───────── */
  const court = [[38.4, -28.2], [87.4, -28.2], [88.9, -17.6], [46.6, -11.4]];
  lo1.use('paving').poly(C.paving, court, 0.05);
  lo1.use('matte').prism(C.grass, [[45, -25.6], [84.6, -25.6], [85.6, -19.6], [51, -14.6]], 0.05, 0.3);
  lo1.use('matte').prism(C.grassDark, [[52, -23.6], [80, -23.6], [80.6, -20.6], [57, -17.4]], 0.3, 0.42);
  for (let k = 0; k < 6; k++) { const x = 47 + k * 7.2; lo1.use('matte').box(C.wood, 2.2, 0.45, 0.6, x, 0.05, -27); }

  const hitA = [[px - 35.5, 0, pz - 26, px + 35.5, 13, pz + 31.5], [px + RO * 0.6, 0, pz + WING.zc, px + 47, 6, pz - 3], [px + WING.x0, 0, pz + WING.z0, px + WING.split, WING.h + UPF + 0.7, pz + WING.zc]];
  const hitB = [[px + WING.split, 0, pz + WING.z0, px + WING.x1, WING.h + UPF + 0.7, pz + WING.zc], Ub(24.1, 1.9, 92, 17.6, 5), [px + 91, 0, pz - 28.3, px + 115.1, 5, pz - 18.5]];

  const parkWalls = (lo1.walls || []).concat(lo2.walls || []);
  /* ═════════ 01 · Education and Visitor Centre ═════════ */
  const signMat = oval.signMat;
  const high1 = hi1.build(roof1); high1.add(oval.sign); roof1.sign = signMat; signMat.userData.baseOpacity = 1;
  const a1 = areas.add({
    id: 'visitor', frame: PARK_FRAME, low: lo1.build(mats), high: high1, roofMats: roof1, lift: 11, hit: hitA, pin: [px, 17, pz],
    pose: P(px + 6, 2, pz + 2, -0.82, 1.0, 150), inside: P(px + 3, 1, pz - 3, -0.7, 0.66, 104), plan: P(px + 42, 0, pz - 8, 0, 0.1, 252), planWith: 'research',
    walk: P(px, 2.4, pz, 2.25, 1.44, 9.6), walls: parkWalls,
    rooms: [{ circle: true, x: 0, z: 0, r: RH - 0.9, h: 8.6, inner: 4.5 }, { circle: true, x: 0, z: 0, r: RO - 0.8, h: 6.6 }, { x0: WING.x0, x1: WING.split, z0: WING.z0, z1: WING.zc, h: WING.h }, { x0: WING.x0, x1: 29.1, z0: WING.zc, z1: -18.6, h: 5.2 }, { x0: 26, x1: 47.6, z0: WING.zc, z1: -5, h: 5.5 }],
    makeInterior(b0, ctx) {
      const b = b0; b.push(px, 0, pz); const R = rng(101);
      const who = (x, z, k, s, o = {}) => { const kk = k === 'coat' ? 'lab' : k; ctx.person(px + x, pz + z, o.ry ?? R() * TAU, wearFor(kk, R), undefined, { kind: kk, s, mode: /visitor|kandura|emirati|abaya/.test(kk) ? (R() < 0.4 ? 'talk' : 'idle') : kk === 'office' ? 'talk' : 'work', ...o }); };
      // an Emirati couple strolling the ring corridor round the hall (the visitor centre is kept calm: fewer people than before)
      for (let k = 0; k < 2; k++) ctx.person(0, 0, 0, wearFor(k ? 'abaya' : 'emirati', R), undefined, { kind: k ? 'abaya' : 'emirati', path: arcPts(12.9, 0, TAU, px, pz, 10 * DEG), loop: true, speed: 0.82, off: k * 0.02 });
      /* exhibition hall and the living aquarium */
      b.use('satin').cyl(C.ink, 3.9, 0.9, 0, F, 0, 48); b.use('metal').torus(C.alu, 3.42, 0.13, 0, F + 0.92, 0, 6, 56); b.torus(C.alu, 3.42, 0.16, 0, 7.2, 0, 6, 56);
      b.use('glass').cyl(C.glass, 3.36, 6.3, 0, F + 0.9, 0, 56, 3.36, true);
      b.use('matte'); for (let k = 0; k < 9; k++) { const a = R() * TAU, r = R() * 2.3; b.ico([0x8f9b8c, 0xb9a98a, 0x7d8f96][k % 3], 0.5 + R() * 0.6, Math.cos(a) * r, F + 1.2, Math.sin(a) * r, 0.7, R() * 3, 1); }
      for (let k = 0; k < 7; k++) { const a = R() * TAU, r = 0.6 + R() * 2; b.cone([0xe98a6b, 0xd9a05b, 0x7fc9b0][k % 3], 0.16, 0.9 + R() * 0.8, Math.cos(a) * r, F + 1.4, Math.sin(a) * r, 6); }
      b.use('glow').torus(0xdff6ff, 3.0, 0.08, 0, 7.05, 0, 6, 48);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 6.2, 56, 1, true), new THREE.MeshStandardMaterial({ color: 0x2fa3d6, transparent: true, opacity: 0.3, roughness: 0.1, emissive: 0x1787bd, emissiveIntensity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      col.position.set(px, F + 4.0, pz); col.renderOrder = 2; ctx.extra.push(col);
      ctx.school({ x: px, z: pz, rx: 2.5, rz: 2.5, r0: 0.25, y0: F + 1.9, y1: F + 6.5, n: 72, sp: 'mix', len: 0.42, speed: 0.2 });
      ctx.item({ code: 'AQ', group: 'Exhibition hall', name: 'Living aquarium', kind: '360° cylinder, native Gulf species', box: Wb(-3.9, -3.9, 3.9, 3.9, 7.4), label: true, prio: 2,
        desc: 'A floor-to-ceiling cylinder of sea water in the middle of the hall. Visitors walk all the way round it and see the same species the hatchery breeds, swimming together as they would on a Gulf reef.',
        card: [['On show', 'Hamour, Shaari, red snappers, seabream'], ['Raised', 'In this hatchery'], ['Water', 'Filtered Gulf sea water']],
        specs: [['360°', 'View'], ['6.3 m', 'Tall'], ['210 m³', 'Volume']], live: [{ k: 'Temperature', u: '°C', v: 26.0, d: 0.15, lo: 24, hi: 28, p: 1 }, { k: 'Salinity', u: 'ppt', v: 39.0, d: 0.2, lo: 36, hi: 42, p: 1 }, { k: 'Visitors today', u: '', v: 184, d: 0, lo: 0, hi: 600, p: 0, rise: true }] , swim: { sp: 'mix', n: 70, glass: true, tank: 3.3, depth: 6.1, age: 1.6 } });
      const topics = [['Hamour', C.orange], ['Shaari', 0x3a9ec4], ['Red snappers', 0xc9503c], ['Seabream', 0x7f97a8], ['From egg to sea', C.teal], ['Live feed', 0x69a95a], ['Clean water', 0x2f86ab], ['Restocking the Gulf', 0x2a5c7d]];
      topics.forEach(([t], k) => { const d = 20 + k * 45, [x, z] = pol(9.5, d), az = -(d * DEG) - Math.PI / 2;
        const box = E.exhibitTV(b, x, z, { ry: az, tile: 200 + k });
        ctx.item({ code: `EX-${k + 1}`, group: 'Exhibition hall', name: `Fish screen: ${t}`, kind: 'Widescreen marine-life display', isDisplay: true, box: [px + box[0], box[1], pz + box[2], px + box[3], box[4], pz + box[5]], label: k === 0, faceAz: az,
          view: P(px + x, F + 1.85, pz + z, az, 1.5, 4.8),
          species: { Hamour: 'hamour', Shaari: 'shaari', 'Red snappers': 'hamra', Seabream: 'seabream' }[t], link: { 'From egg to sea': 'hatchery', 'Live feed': 'livefeed', 'Clean water': 'plantroom', 'Restocking the Gulf': 'seacages' }[t],
          card: [['Station', `${k + 1} of 8`], ['Topic', t], ['Display', '16:9, edge-to-edge picture'], ['On screen', 'Looping fish animation'], ['Languages', 'Arabic and English']],
          desc: `One of eight TV displays around the living aquarium. Swimming fish, softly moving light and underwater scenery fill the widescreen picture. This exhibit introduces ${t.toLowerCase()}; the animation uses photographs of native fish.`,
          specs: [['16:9', 'Widescreen'], ['Animated', 'Marine life'], ['8', 'Displays']] }); });
      for (let k = 0; k < 6; k++) { const d = 42 + k * 60, [x, z] = pol(6.3, d); E.kiosk(b, x, z, { ry: -(d * DEG) - Math.PI / 2 }); }
      b.use('matte'); for (let d = 196; d <= 250; d += 6) { const [x, z] = pol(5.4, d); b.box(C.wood, 0.55, 0.45, 0.9, x, F, z, -(d * DEG)); }
      b.use('satin').sector(C.ink, 7.7, 8.5, 306 * DEG, 334 * DEG, F, F + 1.05);
      ctx.item({ code: 'WD', group: 'Exhibition hall', name: 'Welcome desk', kind: 'Tours and school visits', box: Sb(7.4, 8.8, 306, 334, 1.4), label: true,
        desc: 'Where guided tours begin. School groups, university partners and official visitors are met here before they go round the hall or on to the hatchery.',
        specs: [['Guided', 'Tours'], ['Schools', 'Welcome'], ['By booking', 'Hatchery visits']] });
      who(-1.6, 5.4, 'visitor', 0.72); who(-0.3, 5.9, 'visitor', 0.74); who(1.0, 5.5, 'visitor', 0.7); who(-0.6, 7.2, 'coat'); who(5.8, -3.2, 'emirati'); who(6.5, -2.4, 'abaya');
      /* amphitheatre */
      for (let k = 0; k < 5; k++) { const r0 = 17.2 + k * 1.6; b.use('matte').sector(k % 2 ? C.carpet : shade(C.carpet, 0.92), r0, RO - 0.3, 12 * DEG, 88 * DEG, F, F + 0.26 * (k + 1));
        for (let d = 15; d <= 85; d += 2.5 - k * 0.2) { const [x, z] = pol(r0 + 0.75, d); b.box(0xf2efe9, 0.5, 0.42, 0.5, x, F + 0.26 * (k + 1), z, -(d * DEG)); } }
      b.use('matte').sector(C.wood, RR + 0.2, 16.6, 14 * DEG, 86 * DEG, F, F + 0.14);
      b.use('matte').arcWall(0xfafaf7, RR + 0.35, 28 * DEG, 72 * DEG, 0.12, F + 0.9, F + 4.2); b.use('satin').box(C.wood, 0.9, 1.15, 0.6, ...((p) => [p[0], F + 0.14, p[1]])(pol(16, 80)), -(80 * DEG));
      ctx.item({ code: 'AMP', group: 'Amphitheatre', name: 'Amphitheatre', kind: 'Talks, films and school sessions', box: Sb(RR, RO, 10, 89, 4.4), label: true, prio: 1,
        desc: 'Curved tiers follow the glazed outer wall and look in towards a full-height projection screen. It seats a school year group for a talk or a film before the tour.',
        specs: [['5', 'Tiers'], ['≈ 150', 'Seats'], ['Projection', 'Full wall']] });
      [[20, 40], [21.6, 52], [18.4, 64], [23.2, 30]].forEach(([r, d]) => { const [x, z] = pol(r + 0.75, d); ctx.people.push({ x: px + x, z: pz + z, ry: -(d * DEG) - Math.PI / 2, hex: WEAR.visitor[Math.floor(R() * 7)], s: 0.74, kind: 'visitor', mode: 'sit', y: F + 0.26 * Math.round((r - 17.2) / 1.6 + 1) }); });
      /* reception lobby */
      { const [x, z] = pol(19.5, 131); b.use('satin').prism(C.wood, [[-2.4, -0.7], [2.4, -0.7], [2.1, 0.7], [-2.1, 0.7]].map(([lx, lz]) => { const a = -(131 * DEG) + Math.PI / 2, c = Math.cos(a), s = Math.sin(a); return [x + lx * c + lz * s, z - lx * s + lz * c]; }), F, F + 0.85);
        b.use('satin').prism(C.white, [[-2.7, -0.9], [2.7, -0.9], [2.4, 0.9], [-2.4, 0.9]].map(([lx, lz]) => { const a = -(131 * DEG) + Math.PI / 2, c = Math.cos(a), s = Math.sin(a); return [x + lx * c + lz * s, z - lx * s + lz * c]; }), F + 0.85, F + 1.1);
        const [wx, wz] = pol(16.2, 122); b.use('matte').box(C.white, 9.5, 3.3, 0.25, wx, F, wz, -(122 * DEG) + Math.PI / 2);
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 1.2), new THREE.MeshBasicMaterial({ map: signTex(false), toneMapped: false })); const [qx, qz] = pol(16.35, 122); sg.position.set(px + qx, F + 2.2, pz + qz); sg.rotation.y = -(122 * DEG) + Math.PI / 2; ctx.extra.push(sg);
        for (const d of [106, 110]) { const [sx, sz] = pol(22.5, d); E.sofa(b, sx, sz, { ry: -(d * DEG) + Math.PI / 2, len: 2.2 }); } for (const [r, d] of [[23.6, 140], [17, 103], [23.8, 102]]) { const [qx2, qz2] = pol(r, d); E.planter(b, qx2, qz2); }
        ctx.item({ code: 'REC', group: 'Arrival', name: 'Reception', kind: 'Main entrance', box: Sb(RR, RO, 100, 145, 3.4), label: true, prio: 1, view: P(...((q) => [px + q[0], 1.5, pz + q[1]])(pol(18.6, 127)), Math.atan2(Math.cos(118 * DEG), Math.sin(118 * DEG)), 1.42, 6.2),
          desc: 'Visitors come in under the canopy, through the glazed lobby, to a white desk on a timber base. The name of the building is set in gold letters on the wall behind, in Arabic and English.',
          specs: [['South-west', 'Entrance'], ['Canopy', 'Covered arrival'], ['Step-free', 'Access']] });
        // the Emirati host welcomes visitors at the desk
        who(...pol(18.6, 133), 'office'); who(...pol(21.2, 124), 'emirati', 1, { cast: 'host', mode: 'present', ry: -(124 * DEG) + Math.PI / 2 }); who(...pol(23.0, 121.5), 'abaya', 1, { mode: 'idle', ry: -(121.5 * DEG) - Math.PI / 2 }); }
      b.use('matte'); for (let k = 0; k < 9; k++) { const [x, z] = pol(16.4 + k * 0.9, 94.5); b.box(C.clayCool, 2.2, 0.16 * (k + 1), 0.9, x, F, z, -(94.5 * DEG)); }
      /* glass-walled academic rooms on the west side */
      [[146, 161, 'Academic room 1'], [161, 177, 'Academic room 2'], [177, 202, 'Academic room 3'], [202, 232, 'Workshop room']].forEach(([a0, a1, name], k) => {
        const mid = (a0 + a1) / 2; const [x, z] = pol(20.3, mid);
        if (k < 3) { E.meetingTable(b, x, z, { ry: -(mid * DEG), len: k === 2 ? 5 : 3.4, screen: false, top: C.white, seat: [C.orange, 0x8aa6b5, C.navy][k] }); const [sx, sz] = pol(RO - 0.5, mid); E.wallScreen(b, sx, sz, { ry: -(mid * DEG) - Math.PI / 2, w: 2.6, h: 1.4 }); }
        else { for (const dd of [-8, 0, 8]) { const [tx, tz] = pol(19 + (dd ? 2 : 0), mid + dd); E.roundTable(b, tx, tz, { seats: 5, seat: 0x8aa6b5, alt: C.orange }); } const [sx, sz] = pol(RO - 0.6, mid); E.shelving(b, sx, sz, { ry: -(mid * DEG) - Math.PI / 2, len: 4 }); }
        ctx.item({ code: `AC-${k + 1}`, group: 'Academic rooms', name, kind: 'Teaching space', box: Sb(RR, RO, a0, a1), label: k === 1,
          desc: 'A daylit room behind a glass partition, with the sea on the other side. Used for classes, workshops and partner meetings.', specs: [[k === 2 ? '14' : k === 3 ? '15' : '10', 'Seats'], ['Glass', 'Partition'], ['Screen', 'Fitted']] });
      });
      for (const [a0, a1] of [[232, 262], [278, 305], [305, 339]]) { const mid = (a0 + a1) / 2, [x, z] = pol(20, mid); E.shelving(b, x, z, { ry: -(mid * DEG), len: 3.2 }); E.desk(b, ...pol(22.6, mid), { ry: -(mid * DEG) - Math.PI / 2 }); }
      { const [x, z] = pol(20.5, 361.5); E.sofa(b, x - 1.5, z - 1.6, { ry: 0.3, len: 2.4, hex: 0xb9a48a }); E.sofa(b, x + 1.4, z + 1.6, { ry: Math.PI + 0.3, len: 2.4, hex: 0xb9a48a }); b.use('satin').cyl(C.oak, 0.6, 0.4, x, F, z, 16);
        ctx.item({ code: 'LNG', group: 'Arrival', name: 'Guest lounge', kind: 'For official visits', box: Sb(RR, RO, 354, 369), desc: 'A quiet sitting room beside the hall for hosting delegations before or after a visit.', specs: [['8', 'Seats'], ['Sea view', 'Glazed wall']] }); }
      /* Marine Discovery Corners (names as on the door signs) */
      const corner = (x0, x1, n, cols, code) => {
        const w = x1 - x0, zc0 = WING.z0 + 2.4;
        for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); E.desk(b, x0 + 2.2 + c * ((w - 4.4) / Math.max(1, cols - 1)), zc0 + 1.6 + r * 3.1, { ry: Math.PI, w: 1.5, top: C.white, seat: [C.orange, 0x35a7a3, 0x8aa6b5][(i + r) % 3] }); }
        E.wallScreen(b, (x0 + x1) / 2, WING.z0 + 0.5, { w: 3.6, h: 1.9, tile: 8 }); E.poster(b, x0 + 3, WING.zr - 0.14, { ry: Math.PI, tile: 104 }); E.poster(b, x0 + 4.4, WING.zr - 0.14, { ry: Math.PI, tile: 105 }); E.whiteboard(b, x1 - 0.14, WING.z0 + 4.2, { ry: -Math.PI / 2, w: 2.6 });
        for (let k = 0; k < 3; k++) { const x = x0 + 1.2, z = WING.z0 + 4 + k * 3.4; b.use('satin').box(C.white, 0.7, 0.8, 1.6, x, F, z); b.use('glass').box(C.glass, 0.6, 0.6, 1.5, x, F + 0.8, z); b.use('glow').box(0x5fc4e6, 0.5, 0.45, 1.4, x, F + 0.82, z); }
        E.shelving(b, x1 - 0.8, WING.zr - 3.4, { ry: Math.PI / 2, len: 4.4 });
        ctx.item({ code, group: 'Science discovery', name: `Marine Discovery Corner ${code.slice(-1)}`, kind: 'Hands-on science for schools', box: Wb(x0, WING.z0, x1, WING.zr), label: true, prio: 1,
          desc: 'A discovery room for school groups. Children work at their own stations with microscopes and screens, look at live plankton and young fish in the bench aquaria, and see what the scientists next door do every day.',
          specs: [[String(n), 'Work stations'], ['3', 'Bench aquaria'], ['Ages 8 to 16', 'Designed for']] });
      };
      corner(-18.1, 1.1, 20, 5, 'MDC-1'); corner(1.4, 12.1, 9, 3, 'MDC-2');
      b.use('matte').cyl(C.white, 1.3, 0.75, -8.4, F, -39, 24); b.cyl(0x8aa6b5, 1.05, 0.05, -8.4, F + 0.75, -39, 24);
      E.shelving(b, 17.3, -44, { ry: Math.PI / 2, len: 5 }); E.shelving(b, 17.3, -37, { ry: Math.PI / 2, len: 4 });
      E.meetingTable(b, 24, -44.2, { len: 4.6 }); E.meetingTable(b, 24, -37.2, { len: 4.6, top: C.white });
      ctx.item({ code: 'SEM', group: 'Science discovery', name: 'Seminar rooms', kind: 'Academic spaces', box: Wb(19.1, WING.z0, 29.1, WING.zr), desc: 'Two rooms for lectures, training courses and research meetings, between the Discovery Corners and the laboratories.', specs: [['2', 'Rooms'], ['12', 'Seats each']] });
      for (const [x, z, k] of [[-12, -40, 'visitor'], [-9.4, -37.6, 'visitor'], [-14, -35.5, 'coat'], [5.2, -41, 'visitor'], [-2, -30.6, 'office']]) who(x, z, k, k === 'visitor' ? 0.74 : 1);
      /* staff canteen (round tables and coloured chairs, as on site) */
      const cols = [C.orange, C.white, 0x8aa6b5, 0x4a5a66];
      for (const [r, d0, d1, st] of [[36.6, -52, -18, 7.2], [43.8, -40, -19, 5.4]]) for (let d = d0; d <= d1; d += st) { const p = [pol(r - 1.7, d), pol(r + 1.7, d + st * 0.5)]; for (const [x, z] of p) { if (z < WING.zc + 1.6 || SPN.nx * x + SPN.nz * z > SPN.c - 1.6) continue; E.roundTable(b, x, z, { r: 0.55, seats: 4, seat: cols[Math.floor(R() * 4)], alt: cols[Math.floor(R() * 4)] }); } }
      { const [x, z] = pol(31, -34); b.use('metal').box(C.alu, 5.5, 0.95, 0.9, x, F, z, 34 * DEG + Math.PI / 2); E.fridge(b, ...pol(31, -47), { ry: 47 * DEG + Math.PI / 2, glass: true, w: 1.3 }); E.fridge(b, ...pol(31, -23), { ry: 23 * DEG + Math.PI / 2, w: 1.3 }); }
      ctx.item({ code: 'CAN', group: 'Staff canteen', name: 'Staff canteen', kind: 'Looking onto the palm courtyard', box: [px + 27, 0, pz + WING.zc, px + 47.5, 2.2, pz - 6], label: true, prio: 1,
        desc: 'A bright dining room that fans out from the rotunda. Its outer wall is glass from floor to ceiling and faces the palm courtyard, so the whole team eats in daylight.',
        specs: [['≈ 90', 'Seats'], ['Fully furnished', 'Kitchen and servery'], ['Courtyard', 'View']] });
      for (const [r, d, k] of [[36, -30, 'overall'], [43.6, -27, 'office'], [31.6, -30, 'emirati']]) who(...pol(r, d), k);
      ctx.item({ code: 'CY', group: 'Staff canteen', name: 'Palm courtyard', kind: 'Open to the sky', box: Wb(40, -28.2, 88.9, -11.4, 9), prio: -1,
        desc: 'A planted court between the laboratories and the offices, with date palms in the middle and benches along the glazed corridor. Every corridor in the building looks onto it.',
        specs: [['3', 'Date palms'], ['12', 'Shade trees'], ['≈ 700 m²', 'Area']] });
      b.pop();
    },
  });

  /* ═════════ 02 · Research and Administration Wing ═════════ */
  const LABS = [
    ['Virology', 'Viral pathogen testing', 'Fish from every incoming and outgoing batch are screened here for the viruses that matter most in marine hatcheries.'],
    ['Molecular diagnostics', 'PCR', 'Genetic tests that find a pathogen from a tiny sample, often before the fish show any sign of illness.'],
    ['Bacteriology', 'Bacterial screening and culture', 'Water, live feed and fish samples are plated and cultured to keep track of the bacteria in every system.'],
    ['Chemistry and sample preparation', 'Five ducted fume hoods', 'Samples are fixed, stained and prepared here. Five ducted fume hoods keep reagents and fixatives safely away from staff.'],
    ['Parasitology', 'Parasite diagnostics', 'Skin, gill and gut samples are examined for parasites so treatment can start early and stay targeted.'],
    ['Microscopy', 'Larval development', 'Larvae are measured and photographed day by day to follow growth, feeding and any deformities.'],
    ['Water quality', 'Daily water analysis', 'Temperature, oxygen, pH, salinity and nitrogen compounds are measured for every tank and logged against the limits for its life stage.'],
    ['Genomics bench', 'Broodstock genetics', 'Each breeder is genotyped so pairings stay diverse and the best families can be followed across generations.'],
    ['Plankton and red-tide monitoring', 'Watching the intake', 'Sea water from the intake is checked for harmful algae so the hatchery can close its intake before a bloom arrives.'],
  ];
  const labRooms = [[29.1, 37.9], [37.9, 47.6], [54.1, 64.4], [64.4, 73.1], [73.1, 81.8], [81.8, 92.6], [99.6, 107.5]];
  areas.add({
    id: 'research', frame: PARK_FRAME, low: lo2.build(mats), high: hi2.build(roof2), roofMats: roof2, lift: 7, hit: hitB, pin: [px + 68, 11.5, pz - 30],
    pose: P(px + 62, 2, pz - 16, -0.4, 0.98, 170), inside: P(px + 64, 1, pz - 18, -0.2, 0.62, 122), plan: P(px + 42, 0, pz - 8, 0, 0.1, 252), planWith: 'visitor',
    walk: P(px + 66, 1.5, pz - 30.6, Math.PI / 2, 1.45, 9), walls: parkWalls,
    rooms: [{ x0: WING.split, x1: WING.x1, z0: WING.z0, z1: WING.zc, h: WING.h }, { x0: 91, x1: 115.1, z0: -28.3, z1: -18.5, h: 4.8 }, { x0: 22, x1: 106, z0: -22, z1: 15, h: 4.6 }],
    makeInterior(b, ctx) {
      b.push(px, 0, pz); const R = rng(202);
      const who = (x, z, k) => { const kk = k === 'coat' ? 'lab' : k; ctx.person(px + x, pz + z, R() * TAU, wearFor(kk, R), undefined, { kind: kk, mode: kk === 'office' ? 'talk' : kk === 'kandura' || kk === 'visitor' ? 'idle' : 'work' }); };
      for (let k = 0; k < 3; k++) ctx.person(0, 0, 0, wearFor(k === 1 ? 'office' : 'lab', R), undefined, { kind: k === 1 ? 'office' : 'lab', path: [[px + 31 + k * 2, pz - 30.2 - k * 0.5], [px + 105 - k * 3, pz - 30.2 - k * 0.5]], speed: 1.1 + k * 0.1, off: k / 3 });
      let n = 0;
      labRooms.forEach(([x0, x1], ri) => {
        const mid = (x0 + x1) / 2, w = x1 - x0, zm = (WING.z0 + WING.zr) / 2;
        wallRun(b, null, x0 + 0.2, zm, x1 - 0.2, zm, { t: 0.15, doors: [{ at: w * 0.5, w: 1.3 }] });
        for (const half of [0, 1]) {
          n++; const zc = half ? zm + 3.9 : zm - 3.9, spec = LABS[n - 1];
          const hoods = n === 4;
          E.labBench(b, mid, half ? WING.zr - 0.7 : WING.z0 + 0.8, { len: w - 2.6, ry: half ? Math.PI : 0, kit: n });
          if (hoods) { for (let k = 0; k < 5; k++) E.fumeHood(b, x0 + 1.1 + k * 1.62, zc + (half ? -2.6 : 2.6), { ry: half ? 0 : Math.PI }); }
          else E.labBench(b, mid, zc, { len: w - 3.4, island: true, kit: n + 1 });
          E.fridge(b, x1 - 0.7, zc + (half ? 1.2 : -1.2), { ry: -Math.PI / 2, glass: n % 2 === 0 });
          if (n % 3 === 0) E.shelving(b, x0 + 0.6, zc, { ry: Math.PI / 2, len: 2.6 });
          else E.wallScreen(b, x0 + 0.13, zc, { ry: Math.PI / 2, w: 1.7, h: 0.96, y: 1.35, tile: [9, 8, 1, 14][n % 4] });
          E.whiteboard(b, mid - w * 0.24, zm + (half ? 0.1 : -0.1), { ry: half ? 0 : Math.PI, w: 1.8 }); E.lockers(b, mid + w * 0.28, zm + (half ? 0.1 : -0.1), { ry: half ? 0 : Math.PI, n: 3 });
          E.safety(b, x1 - 0.14, zc + (half ? -1.6 : 1.6), { ry: -Math.PI / 2 }); E.clock(b, x0 + 0.13, zc + 1.9, { ry: Math.PI / 2 });
          ctx.item({ code: `LAB-${String(n).padStart(2, '0')}`, group: 'Laboratories', name: spec ? `Laboratory ${n}: ${spec[0]}` : `Laboratory ${n}`, kind: spec ? spec[1] : 'Fitted out, use to be assigned', box: Wb(x0, half ? zm : WING.z0, x1, half ? WING.zr : zm), label: n === 1 || n === 4 || n === 7 || n === 12,
            desc: spec ? spec[2] : 'One of the fourteen laboratories. Benches, services and storage are in place, ready for the research programme or visiting team it is assigned to.',
            specs: hoods ? [['5', 'Fume hoods'], ['0.5 m/s', 'Face velocity'], ['Ducted', 'Extraction']] : [['ISO/IEC 17025', 'Provisioned for'], [`${Math.round((w * 7.6) / 5) * 5} m²`, 'Floor area'], [spec ? `${12 + ((n * 7) % 30)}` : '—', spec ? 'Samples today' : 'Samples today']],
            live: spec ? [{ k: 'Room temperature', u: '°C', v: 21.5, d: 0.2, lo: 19, hi: 24, p: 1 }, { k: 'Samples in progress', u: '', v: 6 + ((n * 5) % 14), d: 0, lo: 0, hi: 40, p: 0 }] : undefined });
        }
        if (ri % 2 === 0) who(mid + 1.2, zm - 5.2, 'coat'); who(mid - 1.4, zm + 5.4, 'coat');
      });
      // cores between the lab blocks: sample reception and stores
      E.shelving(b, 50.8, -44, { ry: Math.PI / 2, len: 6 }); b.use('metal').box(C.alu, 4, 0.9, 1.0, 50.8, F, -36); E.fridge(b, 49, -40, { ry: Math.PI / 2 }); E.fridge(b, 52.8, -40, { ry: -Math.PI / 2, glass: true });
      ctx.item({ code: 'SR', group: 'Laboratories', name: 'Sample reception', kind: 'Every sample is logged here first', box: Wb(47.6, WING.z0, 54.1, WING.zr), label: true,
        desc: 'Samples from the hatchery, the sea cages and outside clients arrive at this counter. Each is labelled, logged and sent to the right laboratory, so every result can be traced back to a tank and a date.',
        specs: [['Bar-coded', 'Tracking'], ['Cold chain', 'Storage']] });
      E.shelving(b, 96.1, -44.5, { ry: Math.PI / 2, len: 5 }); E.shelving(b, 96.1, -37.5, { ry: Math.PI / 2, len: 5 });
      for (let x = 34; x < 104; x += 14) { b.use('matte').box(C.wood, 1.8, 0.45, 0.5, x, F, -29.2); }
      /* offices along the spine */
      b.pushM(new THREE.Matrix4().makeRotationY(SPINE.ry).setPosition(SPINE.x, 0, SPINE.z));
      const office = (u0, u1, kind, k = 0) => {
        const mid = (u0 + u1) / 2, w = u1 - u0;
        // every wall has something on it: a planning board, a live display, storage under the windows, the copier by the door
        E.whiteboard(b, u0 + 0.13, 7.4, { ry: Math.PI / 2, w: 2.8 }); E.poster(b, u0 + 0.13, 12.6, { ry: Math.PI / 2, tile: [6, 107, 104, 106, 100][k % 5] }); E.clock(b, u0 + 0.13, 15, { ry: Math.PI / 2 });
        E.wallScreen(b, u1 - 0.13, 8.2, { ry: -Math.PI / 2, w: 2.6, h: 1.46, y: 1.15, tile: [0, 13, 3, 1, 7][k % 5] }); E.poster(b, u1 - 0.13, 13.2, { ry: -Math.PI / 2, w: 0.9, h: 1.15, tile: [14, 5, 12, 9, 2][k % 5] });
        for (let x = u0 + 1.9; x < u1 - 1.6; x += 3.4) E.cabinet(b, x, 17.36, { ry: Math.PI, len: 2.6 });
        E.copier(b, mid + w * 0.3, 2.06, {}); E.cooler(b, mid + w * 0.3 + 1.0, 2.06, {}); E.cabinet(b, mid - w * 0.3, 2.06, { len: 1.8, h: 1.2 });
        if (kind === 'meet') { E.meetingTable(b, mid, 6, { len: Math.min(5.4, w - 3.6), ry: 0 }); partU(u0 + 0.2, 10.4, u1 - 0.2, 10.4, [{ at: w / 2, w: 1.3 }]); E.meetingTable(b, mid - 1, 14, { len: 3.4, top: C.white, screen: false }); E.planter(b, u1 - 1, 11.6); }
        else if (kind === 'open') { for (let i = 0; i < 6; i++) E.deskPod(b, u0 + 3 + (i % 3) * ((w - 6) / 2), 6.2 + Math.floor(i / 3) * 7.2); E.roundTable(b, mid, 9.8, { r: 0.8, seats: 5, seat: 0x8aa6b5, alt: C.orange }); E.planter(b, u0 + 1, 16.6); E.planter(b, u1 - 1, 3); }
        else { for (let i = 0; i < 4; i++) E.deskPod(b, u0 + 2.6 + (i % 2) * (w - 5.2), 5.6 + Math.floor(i / 2) * 7.4); E.sofa(b, mid, 16.6, { ry: Math.PI, len: 2.2 }); }
      };
      const partU = (u0, v0, u1, v1, doors) => wallRun(b, null, u0, v0, u1, v1, { t: 0.15, doors });
      office(24.1, 36, 'meet', 0); office(36, 52.3, 'open', 1); office(59.2, 68.8, 'desk', 2); office(68.8, 77.9, 'desk', 3); office(77.9, 88, 'desk', 4);
      const wd = E.wallScreen(b, 44.2, 2.25, { w: 4.4, h: 1.8, y: 1.0, tile: 0 });
      b.use('satin').box(C.white, 1.2, 0.8, 0.9, 55.6, F, 3.4); b.box(C.white, 1.2, 0.8, 0.9, 55.6, F, 6); b.box(C.white, 1.6, 0.8, 0.9, 57.6, F, 10);   // washrooms block (plain)
      b.pop();
      const OFF = [['Meeting rooms', 'Partners and visiting researchers', 24.1, 36, 'Two rooms for meetings with research and industry partners, with screens for sharing live production data.', [['2', 'Rooms'], ['16', 'Seats']]],
        ['Open-plan office', 'Gulf Aquaculture team', 36, 52.3, 'The main office: hatchery management, biosecurity, logistics and administration sit together, a short walk from both the laboratories and the hatchery.', [['24', 'Desks'], ['1', 'Team table']]],
        ['Production office', 'Planning and logistics', 59.2, 68.8, 'Fry orders, stocking plans and deliveries are scheduled here, with the hatchery numbers live on the wall screen.', [['16', 'Desks'], ['Live', 'Production board']]],
        ['Science office', 'Research staff', 68.8, 77.9, 'Desks for the laboratory scientists and visiting researchers, next to the labs across the courtyard.', [['16', 'Desks'], ['Shared', 'With visiting teams']]],
        ['Management office', 'Operations and quality', 77.9, 88, 'Operations, quality and certification work is led from here, including the records for Best Aquaculture Practices audits.', [['16', 'Desks'], ['BAP', 'Certification records']]]];
      OFF.forEach(([name, kind, u0, u1, desc, specs], k) => ctx.item({ code: `OF-${k + 1}`, group: 'Offices', name, kind, box: Ub(u0, 1.9, u1, 17.6), label: k === 1 || k === 3, desc, specs,
        live: k === 2 ? [{ k: 'Fry ready this week', u: '', v: 412000, d: 0, lo: 0, hi: 9e5, p: 0, big: true }, { k: 'Deliveries scheduled', u: '', v: 5, d: 0, lo: 0, hi: 12, p: 0 }] : undefined }));
      for (const [u, v, k] of [[30, 4.6, 'office'], [28, 7.6, 'kandura'], [41, 5, 'office'], [47, 12.6, 'office'], [44, 10.8, 'office'], [63, 9, 'office'], [73, 5, 'coat'], [82.5, 12, 'office'], [12, 0, 'coat'], [50, 0.3, 'office'], [70, -0.4, 'overall']]) who(...uv(u, v), k);
      ctx.item({ code: 'SPN', group: 'Offices', name: 'Courtyard corridor', kind: 'From the rotunda to the offices', box: Ub(26, -1.9, 79, 1.9, 2.6), prio: -2,
        desc: 'The glazed corridor that ties the building together. It runs from the exhibition hall past the canteen and along the courtyard to the office wing.', specs: [['92 m', 'Length'], ['Glazed', 'To the courtyard']] });
      b.pop();
    },
  });

  const skirts = aoSkirts([{ x0: px + WING.x0, z0: pz + WING.z0, x1: px + WING.x1, z1: pz + WING.zc }, { x0: px + 91, z0: pz - 28.3, x1: px + 115.1, z1: pz - 18.5 }], [{ x: px, z: pz, r: RO }], 5.5, 0.3);
  skirts.position.set(PARK_FRAME.x, 0, PARK_FRAME.z); skirts.rotation.y = PARK_FRAME.ry; skirts.updateMatrix(); scene.add(skirts);
  return { court, fanAngles: fa };
}
