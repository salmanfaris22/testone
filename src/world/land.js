// Terrain, the paved apron, roads with their brick walks, lawns, the parking court and the rock armour.
import * as THREE from 'three';
import { Builder, C, lin, rng, roundRect, arcPts, DEG, TAU, mixHex } from './kit.js';
import { terrainH, landSDF, beachiness, SEA_Y } from './terrain-fn.js';
import { APRON, coast, ROADS, RB_W, RB_E, LAWNS, PARKING, DROP, PARK_FRAME, P1, HATCH, HATCH_FRAME, BROOD, BROOD_FRAME, GEN, FIRE, JETTY } from './layout.js';

function axis(dense0, dense1, step, far) {
  const a = []; for (let v = dense0; v <= dense1 + 1e-6; v += step) a.push(v);
  let s = step, v = dense1; while (v < far) { s *= 1.28; v += s; a.push(v); }
  s = step; v = dense0; const b = []; while (v > -far) { s *= 1.28; v -= s; b.push(v); }
  return b.reverse().concat(a);
}
/** round the corners of a polyline: `r` is the tangent length, one number or one per corner */
export function fillet(pts, r, seg = 8) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    let ax = a[0] - p[0], az = a[1] - p[1], bx = b[0] - p[0], bz = b[1] - p[1];
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz), m = Math.min(Array.isArray(r) ? r[i - 1] : r, la / 2, lb / 2);
    ax /= la; az /= la; bx /= lb; bz /= lb;
    if (Math.abs(ax * bx + az * bz) > 0.995) { out.push(p); continue; }
    const s = [p[0] + ax * m, p[1] + az * m], e = [p[0] + bx * m, p[1] + bz * m];
    for (let k = 0; k <= seg; k++) { const t = k / seg, u = 1 - t; out.push([u * u * s[0] + 2 * u * t * p[0] + t * t * e[0], u * u * s[1] + 2 * u * t * p[1] + t * t * e[1]]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/** shortest distance from (x, z) to a polyline */
export function polyDist(p, x, z) {
  let m = Infinity;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i], c = p[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), ex = a[0] + dx * t - x, ez = a[1] + dz * t - z;
    m = Math.min(m, ex * ex + ez * ez);
  }
  return Math.sqrt(m);
}
/** resample a polyline at an even step */
export function resample(pts, step) {
  const out = [pts[0].slice()]; let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]); let d = step - carry;
    for (; d <= len; d += step) out.push([a[0] + ((b[0] - a[0]) * d) / len, a[1] + ((b[1] - a[1]) * d) / len]);
    carry = len - (d - step);
  }
  const l = pts[pts.length - 1], q = out[out.length - 1]; if (Math.hypot(l[0] - q[0], l[1] - q[1]) > step * 0.3) out.push(l.slice());
  return out;
}
/** local point of a frame → world [x, z] */
export const fromFrame = (f, x, z) => { const c = Math.cos(f.ry), s = Math.sin(f.ry); return [f.x + x * c + z * s, f.z - x * s + z * c]; };

export function createLand(scene, mats) {
  /* ───── terrain heightfield ───── */
  const xs = axis(-430, 330, 4.5, 9000), zs = axis(-330, 235, 4.5, 9000);
  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3), col = new Uint8Array(nx * nz * 3);
  const sand = lin(C.sand), wet = lin(C.sandWet), rock = lin(C.rock), rockD = lin(C.rockDark), bed = lin(0x9fb9a2), dune = lin(0xe6d7b6), pale = lin(0xe9dfc8);
  const R = rng(3);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = xs[i], z = zs[j], k = (j * nx + i) * 3;
    let h = terrainH(x, z);
    const far = (Math.max(0, -420 - x) / 600) * sm(16, 70, Math.abs(z - RB_W.z));   // gentle dunes inland, to the west (not across the road in)
    if (h > -0.01 && far > 0) h += (Math.sin(x * 0.011 + z * 0.006) * 1.6 + Math.sin(x * 0.027 - z * 0.019) * 0.7) * Math.min(1, far);
    pos[k] = x; pos[k + 1] = h; pos[k + 2] = z;
    const b = beachiness(x, z);
    let c;
    if (h > -0.02) c = far > 0 ? mix3(sand, dune, Math.min(1, far * 1.5)) : mix3(sand, pale, 0.5 + 0.5 * Math.sin(x * 0.05 + z * 0.08) * Math.sin(z * 0.03 - x * 0.021));
    else {
      const w = sm(SEA_Y + 1.0, SEA_Y - 0.25, h);
      const beachC = mix3(pale, wet, w), rockC = mix3(rock, rockD, w * 0.7 + (R() - 0.5) * 0.25);
      c = mix3(rockC, beachC, b);
      if (h < SEA_Y - 0.3) c = mix3(c, bed, sm(SEA_Y - 0.3, SEA_Y - 2.5, h));
    }
    col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2];
  }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(col, 3, true)); tg.setIndex(new THREE.BufferAttribute(idx, 1));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, mats.ground); terrain.receiveShadow = true; terrain.matrixAutoUpdate = false; terrain.name = 'terrain';
  scene.add(terrain);

  /* ───── hardscape ───── */
  const b = new Builder();
  // the apron: one sheet of concrete from the south quay to the line of the beach
  const e0 = coast(430.2, -APRON.back), e1 = coast(-62.9, -APRON.back);
  const apron = [[APRON.west, APRON.south], [APRON.east - 14, APRON.south], [APRON.east, APRON.south - 14], [APRON.east, e0[1]], e1, [APRON.west, e1[1]]];
  b.use('concrete').poly(0xd9d6cd, fillet([...apron, apron[0], apron[1]], 16).slice(4, -4), 0.02);
  // the red line along the beach side of the apron
  // the red boundary wall along the beach side of the apron, bold as in the client's render, with a pale coping
  b.use('matte').wall(0xc4352c, e1[0] + 3, e1[1] + 2.2, e0[0] - 2, e0[1] - 1.5, 1.6, 0.02, 1.15); b.wall(0xe9d9cf, e1[0] + 3, e1[1] + 2.2, e0[0] - 2, e0[1] - 1.5, 1.75, 1.15, 1.25);

  const W = ROADS.w, roads = {};
  // Every centre line is laid out first, so each road knows where the others meet it: lane markings stop short of
  // every junction and roundabout, edge lines break across a side road's mouth, and a give-way line marks each road
  // that ends on another. The north road runs on into the shore road in one smooth bend (it used to meet it in a notch).
  const defs = [
    ['entry', ROADS.entry],
    ['ring', [...ROADS.north, ...ROADS.shore.slice(1)], { round: [15, 15, 19, 21, 21, 21] }],
    ['westSouth', [...ROADS.west, ...ROADS.south.slice(1)], { round: [16, 12] }],          // the west road turns into the south road (no stub out into the sand)
    ['avenue', ROADS.avenue, { round: 15 }],
    ['cross', ROADS.cross, { w: 9 }], ['drive', ROADS.drive, { w: 9, round: 14, dash: false }],
  ];
  const all = defs.map(([name, pts, o = {}]) => ({ name, w: o.w || W, dash: o.dash !== false, walk: o.walk ?? ROADS.walk, p: resample(o.round ? fillet(pts, o.round) : pts, 3) }));
  const circles = [RB_W, RB_E].map((rb) => ({ x: rb.x, z: rb.z, r: rb.r + W / 2, walk: rb.r + W / 2 + 2.4 })).concat([{ x: DROP.x, z: DROP.z, r: DROP.r, walk: DROP.r + 3 }]);
  /** is (x, z) on the carriageway of a road other than `self`, or on a roundabout, give or take `pad` metres? */
  const onOther = (self, x, z, pad, padRing = pad) => {
    for (const r of all) if (r !== self && polyDist(r.p, x, z) < r.w / 2 + pad) return true;
    for (const c of circles) if (Math.hypot(x - c.x, z - c.z) < c.r + padRing) return true;
    return false;
  };
  const RC = 6;                                                                      // kerb radius at the corners of a T-junction
  const offset = (p, d) => p.map((pt, i) => { const a = p[Math.max(0, i - 1)], c = p[Math.min(p.length - 1, i + 1)], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; return [pt[0] - ((c[1] - a[1]) / l) * d, pt[1] + ((c[0] - a[0]) / l) * d]; });
  for (const r of all) {
    const { p, w, walk } = r;
    if (walk) { b.use('paving').ribbon(C.brick, p, w + walk * 2, 0.045); b.use('matte').ribbon(0xd8d2c6, p, w + 0.7, 0.06); }
    b.use('asphalt').ribbon(C.asphalt, p, w, 0.075);
    const free = p.map(([x, z]) => !onOther(r, x, z, 1.4));
    if (r.dash) { b.use('matte'); for (let i = 1; i < p.length - 1; i += 2) { if (!free[i] || !free[i + 1]) continue; const a = p[i], c = p[i + 1]; b.quad(0xf4f1ea, 3.0, 0.22, (a[0] + c[0]) / 2, 0.092, (a[1] + c[1]) / 2, -Math.atan2(c[1] - a[1], c[0] - a[0])); } }
    // edge lines, in runs between the junctions
    if (w > 7) for (const s of [-1, 1]) { let run = []; const flush = () => { if (run.length > 1) b.use('matte').ribbon(0xe9e6de, run, 0.16, 0.09); run = []; };
      for (const q of offset(p, s * (w / 2 - 0.5))) { if (onOther(r, q[0], q[1], RC + 0.7, 0.7)) flush(); else run.push(q); } flush(); }
    // give-way line across the lane coming in, where this road ends on another one (traffic keeps right)
    for (const end of [0, p.length - 1]) {
      if (free[end]) continue;
      const dir = end ? -1 : 1; let k = end; while (k > 0 && k < p.length - 1 && !free[k]) k += dir;
      if (k <= 0 || k >= p.length - 1) continue;
      const a = p[k], c = p[k - dir], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l, ry = -Math.atan2(dz, dx);
      for (let o = 0.6; o < w / 2 - 0.6; o += 0.9) b.use('matte').quad(0xf4f1ea, 0.34, 0.6, a[0] + nx * o, 0.093, a[1] + nz * o, ry);
    }
    roads[r.name] = p;
  }
  // rounded corners where a road ends on another one: asphalt fillet, kerb and walk round the arc, and the edge line follows it
  const meet = (p1, d1, p2, d2) => { const den = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(den) < 1e-6) return null; const a = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den; return [p1[0] + d1[0] * a, p1[1] + d1[1] * a]; };
  const arcRun = (c, r, a0, a1, n = 12) => { let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; const out = []; for (let i = 0; i <= n; i++) { const a = a0 + (da * i) / n; out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); } return out; };
  for (const S of all) for (const end of [0, S.p.length - 1]) {
    const E = S.p[end], T = all.find((r) => r !== S && polyDist(r.p, E[0], E[1]) < r.w / 2);
    if (!T) continue;
    const q = S.p[end ? end - 1 : 1], dl = Math.hypot(E[0] - q[0], E[1] - q[1]) || 1, d = [(E[0] - q[0]) / dl, (E[1] - q[1]) / dl], ps = [-d[1], d[0]];
    // the through road's direction and the normal pointing back up the side road
    let bi = 0, bd = Infinity; for (let i = 0; i < T.p.length - 1; i++) { const m = polyDist([T.p[i], T.p[i + 1]], E[0], E[1]); if (m < bd) { bd = m; bi = i; } }
    const a = T.p[bi], c = T.p[bi + 1], tl = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, t = [(c[0] - a[0]) / tl, (c[1] - a[1]) / tl];
    let n = [-t[1], t[0]]; if (n[0] * -d[0] + n[1] * -d[1] < 0) n = [-n[0], -n[1]];
    const tt = Math.max(0, Math.min(1, ((E[0] - a[0]) * t[0] + (E[1] - a[1]) * t[1]) / tl)), ET = [a[0] + (c[0] - a[0]) * tt, a[1] + (c[1] - a[1]) * tt];
    for (const sd of [-1, 1]) {
      const o = [ps[0] * sd, ps[1] * sd], eS = [E[0] + o[0] * S.w / 2, E[1] + o[1] * S.w / 2], eT = [ET[0] + n[0] * T.w / 2, ET[1] + n[1] * T.w / 2];
      const K = meet(eS, d, eT, t), C0 = meet([eS[0] + o[0] * RC, eS[1] + o[1] * RC], d, [eT[0] + n[0] * RC, eT[1] + n[1] * RC], t);
      if (!K || !C0) continue;
      const T1 = [C0[0] - o[0] * RC, C0[1] - o[1] * RC], T2 = [C0[0] - n[0] * RC, C0[1] - n[1] * RC], a1 = Math.atan2(T1[1] - C0[1], T1[0] - C0[0]), a2 = Math.atan2(T2[1] - C0[1], T2[0] - C0[0]);
      b.use('asphalt').poly(C.asphalt, [K, ...arcRun(C0, RC, a1, a2)], 0.0752);
      if (S.walk) { b.use('paving').ribbon(C.brick, arcRun(C0, RC - 0.35 - S.walk / 2, a1, a2), S.walk, 0.0455); b.use('matte').ribbon(0xd8d2c6, arcRun(C0, RC - 0.175, a1, a2), 0.35, 0.0605); }
      if (S.w > 7) b.use('matte').ribbon(0xe9e6de, arcRun(C0, RC + 0.5, a1, a2), 0.16, 0.0905);
    }
  }
  // the rest of the model still knows the north, shore, west and south roads by name: split the joined roads at their bends
  const split = (key, a, c, at) => { const p = roads[key]; let k = 0, best = 1e9; p.forEach(([x, z], i) => { const d = Math.hypot(x - at[0], z - at[1]); if (d < best) { best = d; k = i; } }); roads[a] = p.slice(0, k + 1); roads[c] = p.slice(k); delete roads[key]; };
  split('ring', 'north', 'shore', ROADS.shore[0]); split('westSouth', 'west', 'south', ROADS.west[ROADS.west.length - 1]);
  for (const rb of [RB_W, RB_E]) {
    b.use('paving').disc(C.brick, rb.r + W / 2 + 2.4, rb.x, 0.047, rb.z, 64); b.use('matte').disc(0xd8d2c6, rb.r + W / 2 + 0.35, rb.x, 0.062, rb.z, 64);
    b.use('asphalt').ring(C.asphalt, rb.r + W / 2, rb.r - W / 2, rb.x, 0.077, rb.z, 72);
    b.use('paving').ring(C.brick, rb.r - W / 2, rb.r - W / 2 - 1.2, rb.x, 0.085, rb.z, 64);
    b.use('matte').prism(C.grass, arcPts(rb.r - W / 2 - 1.2, 0, TAU, rb.x, rb.z, 8 * DEG), 0, 0.42);
    roads[rb === RB_W ? 'rbW' : 'rbE'] = arcPts(rb.r, 0, TAU, rb.x, rb.z, 9 * DEG);
  }
  // drop-off loop at the foot of the Innovation Park
  b.use('paving').disc(C.brick, DROP.r + 3, DROP.x, 0.047, DROP.z, 44); b.use('matte').disc(0xd8d2c6, DROP.r + 0.35, DROP.x, 0.062, DROP.z, 44);      // (its kerb, as round the roundabouts)
  b.use('asphalt').disc(C.asphalt, DROP.r, DROP.x, 0.077, DROP.z, 44); b.use('matte').prism(C.grass, arcPts(4.6, 0, TAU, DROP.x, DROP.z, 12 * DEG), 0, 0.4);
  // where the drive meets the loop: the drive ended square just short of it and comes in off its centre, so slivers of the loop's
  // paving showed in its mouth (Jeffry, 20 Nov: "the road cut"). Its asphalt, kerb and walk run on into the loop instead.
  { const S = all.find((r) => r.name === 'drive'), D = [DROP.x, DROP.z];
    if (S) {
      const p = S.p, near = (i) => Math.hypot(p[i][0] - D[0], p[i][1] - D[1]), end = near(0) < near(p.length - 1) ? 0 : p.length - 1, dir = end ? -1 : 1;
      const e = p[end], f = p[end + dir], dl = Math.hypot(e[0] - f[0], e[1] - f[1]) || 1, d = [(e[0] - f[0]) / dl, (e[1] - f[1]) / dl];
      const along = Math.max(4, (D[0] - e[0]) * d[0] + (D[1] - e[1]) * d[1]), ins = [e[0] + d[0] * along, e[1] + d[1] * along];      // on to level with the loop's middle
      if (S.walk) { b.use('paving').ribbon(C.brick, [f, e, ins], S.w + S.walk * 2, 0.045); b.use('matte').ribbon(0xd8d2c6, [f, e, ins], S.w + 0.7, 0.06); }
      b.use('asphalt').ribbon(C.asphalt, [f, e, ins], S.w, 0.075);
    } }

  // parking court between the office wing and the north road
  b.use('asphalt').poly(0x3d4249, PARKING, 0.07);
  { const [a, c] = [PARKING[0], PARKING[1]], len = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / len, uz = (c[1] - a[1]) / len, ry = -Math.atan2(uz, ux);
    for (let i = 0; i <= 15; i++) { const d = 3 + i * 3.1; b.use('matte').quad(0xf1eee6, 0.16, 5.6, a[0] + ux * d + uz * -4.2, 0.085, a[1] + uz * d + ux * 4.2, ry); }
    for (let i = 0; i <= 14; i++) b.use('matte').quad(0xf1eee6, 0.16, 5.4, -127 + i * 3.2, 0.085, -85.6, 0); }

  // forecourt of the Innovation Park (in its own turned frame) and the round plaza under the shell roof
  const pf = (x, z) => fromFrame(PARK_FRAME, x, z);
  b.use('paving').poly(0xe7e1d4, roundRect(-22, -53, 112, 13.5, 5).map(([x, z]) => pf(x, z)), 0.05);
  // (the podium, its steps and the plaza round the oval hall are part of the hall itself: oval.js)

  // service pads round the production buildings
  const pad = (x0, z0, x1, z1, m = 5, hex = 0xcfccc4) => b.use('concrete').poly(hex, roundRect(x0 - m, z0 - m, x1 + m, z1 + m, 2.5), 0.035);
  const hf = HATCH_FRAME, bf = BROOD_FRAME;
  pad(hf.x + HATCH.x0, hf.z + HATCH.z0, hf.x + HATCH.x1, hf.z + HATCH.annexZ1, 4.5);
  pad(bf.x + BROOD.x0, bf.z + BROOD.z0, bf.x + BROOD.x1 + 32, bf.z + BROOD.z1, 4);
  pad(GEN.x0 - 2, GEN.z0, GEN.x1 + 12, GEN.z1, 4);
  for (const r of Object.values(P1)) pad(r.x0, r.z0, r.x1, r.z1, 3.5);
  pad(FIRE.x - FIRE.w / 2, FIRE.z - FIRE.d / 2, FIRE.x + FIRE.w / 2, FIRE.z + FIRE.d / 2, 1, 0xc4c2bb);

  // lawns: the plan numbers let a few of them run over a road, its kerb and walk, or a roundabout. Each lawn is pulled
  // back until it clears every road by 0.6 m (sides move in, corners stay round) and is cut round the roundabouts.
  const clear = (x, z) => { let m = Infinity; for (const r of all) m = Math.min(m, polyDist(r.p, x, z) - (r.w / 2 + (r.walk || 0.35) + 0.6)); return m; };
  const outline = (x0, z0, x1, z1, r) => { const p = roundRect(x0, z0, x1, z1, Math.min(r, (x1 - x0) / 2 - 0.2, (z1 - z0) / 2 - 0.2)); return resample(p.concat([p[0]]), 1.2).slice(0, -1); };
  const cut = (pts, pad) => { for (const c of circles) { const R = c.walk + pad; pts = pts.map(([x, z]) => { const d = Math.hypot(x - c.x, z - c.z); return d < R ? [c.x + ((x - c.x) / d) * R, c.z + ((z - c.z) / d) * R] : [x, z]; }); } return pts; };
  const lawns = LAWNS.map(([x0, z0, x1, z1, r]) => {
    for (let it = 0; it < 30; it++) {
      const rr = Math.min(r, (x1 - x0) / 2 - 0.2, (z1 - z0) / 2 - 0.2), w = { x0: 0, x1: 0, z0: 0, z1: 0 };
      for (const [x, z] of outline(x0, z0, x1, z1, r)) { const c = clear(x, z); if (c >= 0) continue;
        if (x < x0 + rr + 0.01) w.x0 = Math.min(w.x0, c); if (x > x1 - rr - 0.01) w.x1 = Math.min(w.x1, c);
        if (z < z0 + rr + 0.01) w.z0 = Math.min(w.z0, c); if (z > z1 - rr - 0.01) w.z1 = Math.min(w.z1, c); }
      if (!(w.x0 || w.x1 || w.z0 || w.z1)) break;
      if (w.x0) x0 += 0.1 - w.x0; if (w.x1) x1 -= 0.1 - w.x1; if (w.z0) z0 += 0.1 - w.z0; if (w.z1) z1 -= 0.1 - w.z1;
    }
    const poly = cut(outline(x0, z0, x1, z1, r), 0.6), inner = cut(outline(x0 + 5, z0 + 5, x1 - 5, z1 - 5, Math.max(1.5, r - 3)), 5);
    b.use('matte').prism(C.grass, poly, 0, 0.3); b.use('matte').prism(C.grassDark, inner, 0.3, 0.38, { sides: false });
    return { x0, z0, x1, z1, poly };
  });
  // planted strip along the avenue, between the road and Phase 1
  for (let x = -214; x < 140; x += 19.5) b.use('matte').prism(C.grass, roundRect(x - 5.5, 39.6, x + 5.5, 43.8, 1.6), 0, 0.3);

  const g = b.build(mats, { cast: false });
  g.name = 'hardscape'; scene.add(g);

  /* ───── rock armour along the south shore and round the tip ───── */
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, flatShading: true }), 1700);
  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), cc = new THREE.Color();
  let n = 0, guard = 0;
  while (n < 1700 && guard++ < 120000) {
    const x = -560 + R() * 860, z = 150 + R() * 36, d = landSDF(x, z);
    if (d < 0.5 || d > 10.5 || beachiness(x, z) > 0.25 || Math.abs(x - JETTY.u) < JETTY.w / 2 + 1.6) continue;      // keep the jetty clear
    const s = 0.8 + R() * 1.4; e.set(R() * 6, R() * 6, R() * 6);
    m4.compose(v.set(x, terrainH(x, z) + s * 0.3, z), qt.setFromEuler(e), sc.set(s * (0.8 + R() * 0.6), s * (0.6 + R() * 0.4), s * (0.8 + R() * 0.6)));
    rocks.setMatrixAt(n, m4); cc.setHex(mixHex(C.rock, C.rockDark, R())); rocks.setColorAt(n, cc); n++;
  }
  rocks.count = n; rocks.castShadow = true; rocks.receiveShadow = true; rocks.instanceMatrix.needsUpdate = true; if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  rocks.name = 'rocks'; scene.add(rocks);
  return { terrain, hardscape: g, rocks, roads, lawns, apronEdge: [e1, e0] };
}
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
