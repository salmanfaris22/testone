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
/** round the corners of a polyline with radius r */
export function fillet(pts, r, seg = 8) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    let ax = a[0] - p[0], az = a[1] - p[1], bx = b[0] - p[0], bz = b[1] - p[1];
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz), m = Math.min(r, la / 2, lb / 2);
    ax /= la; az /= la; bx /= lb; bz /= lb;
    if (Math.abs(ax * bx + az * bz) > 0.995) { out.push(p); continue; }
    const s = [p[0] + ax * m, p[1] + az * m], e = [p[0] + bx * m, p[1] + bz * m];
    for (let k = 0; k <= seg; k++) { const t = k / seg, u = 1 - t; out.push([u * u * s[0] + 2 * u * t * p[0] + t * t * e[0], u * u * s[1] + 2 * u * t * p[1] + t * t * e[1]]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
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
  b.use('matte').wall(0xc8392f, e1[0] + 3, e1[1] + 2.2, e0[0] - 2, e0[1] - 1.5, 1.1, 0.02, 0.3);

  const W = ROADS.w, roads = {};
  const road = (name, pts, { w = W, round = 0, closed = false, dash = true, walk = ROADS.walk } = {}) => {
    const p = resample(round ? fillet(pts, round) : pts, 3);
    if (walk) { b.use('paving').ribbon(C.brick, p, w + walk * 2, 0.045, closed); b.use('matte').ribbon(0xd8d2c6, p, w + 0.7, 0.06, closed); }
    b.use('asphalt').ribbon(C.asphalt, p, w, 0.075, closed);
    if (dash) { b.use('matte'); for (let i = 1; i < p.length - 1; i += 2) { const a = p[i], c = p[i + 1]; b.quad(0xf4f1ea, 3.0, 0.22, (a[0] + c[0]) / 2, 0.092, (a[1] + c[1]) / 2, -Math.atan2(c[1] - a[1], c[0] - a[0])); } }
    // edge lines
    if (w > 7) for (const s of [-1, 1]) b.use('matte').ribbon(0xe9e6de, p.map((pt, i) => { const a = p[Math.max(0, i - 1)], c = p[Math.min(p.length - 1, i + 1)], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; return [pt[0] - ((c[1] - a[1]) / l) * s * (w / 2 - 0.5), pt[1] + ((c[0] - a[0]) / l) * s * (w / 2 - 0.5)]; }), 0.16, 0.09, closed);
    roads[name] = p; return p;
  };
  road('entry', ROADS.entry); road('west', ROADS.west);
  road('north', ROADS.north, { round: 15 }); road('shore', ROADS.shore, { round: 21 });
  road('avenue', ROADS.avenue, { round: 15 }); road('south', ROADS.south, { round: 12 });
  road('cross', ROADS.cross, { w: 9 }); road('drive', ROADS.drive, { w: 9, round: 14, dash: false });
  for (const rb of [RB_W, RB_E]) {
    b.use('paving').disc(C.brick, rb.r + W / 2 + 2.4, rb.x, 0.047, rb.z, 64); b.use('matte').disc(0xd8d2c6, rb.r + W / 2 + 0.35, rb.x, 0.062, rb.z, 64);
    b.use('asphalt').ring(C.asphalt, rb.r + W / 2, rb.r - W / 2, rb.x, 0.077, rb.z, 72);
    b.use('paving').ring(C.brick, rb.r - W / 2, rb.r - W / 2 - 1.2, rb.x, 0.085, rb.z, 64);
    b.use('matte').prism(C.grass, arcPts(rb.r - W / 2 - 1.2, 0, TAU, rb.x, rb.z, 8 * DEG), 0, 0.42);
    roads[rb === RB_W ? 'rbW' : 'rbE'] = arcPts(rb.r, 0, TAU, rb.x, rb.z, 9 * DEG);
  }
  // drop-off loop at the foot of the Innovation Park
  b.use('paving').disc(C.brick, DROP.r + 3, DROP.x, 0.047, DROP.z, 44); b.use('asphalt').disc(C.asphalt, DROP.r, DROP.x, 0.077, DROP.z, 44); b.use('matte').prism(C.grass, arcPts(4.6, 0, TAU, DROP.x, DROP.z, 12 * DEG), 0, 0.4);

  // parking court between the office wing and the north road
  b.use('asphalt').poly(0x3d4249, PARKING, 0.07);
  { const [a, c] = [PARKING[0], PARKING[1]], len = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / len, uz = (c[1] - a[1]) / len, ry = -Math.atan2(uz, ux);
    for (let i = 0; i <= 15; i++) { const d = 3 + i * 3.1; b.use('matte').quad(0xf1eee6, 0.16, 5.6, a[0] + ux * d + uz * -4.2, 0.085, a[1] + uz * d + ux * 4.2, ry); }
    for (let i = 0; i <= 14; i++) b.use('matte').quad(0xf1eee6, 0.16, 5.4, -127 + i * 3.2, 0.085, -85.6, 0); }

  // forecourt of the Innovation Park (in its own turned frame) and the round plaza under the shell roof
  const pf = (x, z) => fromFrame(PARK_FRAME, x, z);
  b.use('paving').poly(0xe7e1d4, roundRect(-22, -53, 112, 13.5, 5).map(([x, z]) => pf(x, z)), 0.05);
  b.use('paving').prism(C.floorStone, arcPts(35.6, 0, TAU, PARK_FRAME.x, PARK_FRAME.z, 5 * DEG), 0, 0.075, { sides: false });
  b.use('paving').ring(C.brick, 36.6, 35.4, PARK_FRAME.x, 0.08, PARK_FRAME.z, 72);
  b.use('paving').ribbon(0xe7e1d4, [pf(-15.6, 24), [DROP.x + DROP.r * 0.93, DROP.z - DROP.r * 0.36]], 7.5, 0.082);

  // service pads round the production buildings
  const pad = (x0, z0, x1, z1, m = 5, hex = 0xcfccc4) => b.use('concrete').poly(hex, roundRect(x0 - m, z0 - m, x1 + m, z1 + m, 2.5), 0.035);
  const hf = HATCH_FRAME, bf = BROOD_FRAME;
  pad(hf.x + HATCH.x0, hf.z + HATCH.z0, hf.x + HATCH.x1, hf.z + HATCH.annexZ1, 4.5);
  pad(bf.x + BROOD.x0, bf.z + BROOD.z0, bf.x + BROOD.x1 + 32, bf.z + BROOD.z1, 4);
  pad(GEN.x0 - 2, GEN.z0, GEN.x1 + 12, GEN.z1, 4);
  for (const r of Object.values(P1)) pad(r.x0, r.z0, r.x1, r.z1, 3.5);
  pad(FIRE.x - FIRE.w / 2, FIRE.z - FIRE.d / 2, FIRE.x + FIRE.w / 2, FIRE.z + FIRE.d / 2, 1, 0xc4c2bb);

  // lawns
  for (const [x0, z0, x1, z1, r] of LAWNS) { b.use('matte').prism(C.grass, roundRect(x0, z0, x1, z1, r), 0, 0.3); b.use('matte').prism(C.grassDark, roundRect(x0 + 5, z0 + 5, x1 - 5, z1 - 5, Math.max(1.5, r - 3)), 0.3, 0.38, { sides: false }); }
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
  return { terrain, hardscape: g, rocks, roads, apronEdge: [e1, e0] };
}
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
