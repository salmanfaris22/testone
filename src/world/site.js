// Everything outdoors that is not a building: planting, lighting, parked and moving vehicles, the arch,
// people on foot, gulls over the beach and the sea water intake.
import * as THREE from 'three';
import { Builder, C, rng, TAU, DEG } from './kit.js';
import { plantTrees, streetLights, car, bus, glowPointsMat } from './props.js';
import { createFlags } from './flags.js';
import { createBoards } from './boards.js';
import { createPeople, createTraffic, wearFor } from './people.js';
import { hall } from './shell.js';
import { fromFrame, resample } from './land.js';
import { GATE, PARK_FRAME, ROADS, RB_W, RB_E, LAWNS, PARKING, DROP, SMALL, PUMP, coast, COAST, APRON, JETTY, south, CAGES, HATCH, HATCH_FRAME, BROOD, BROOD_FRAME, PLANT, PLANT_FRAME, GEN, P1, LANDLINE } from './layout.js';
import { SEA_Y, terrainH } from './terrain-fn.js';

export function buildSite(world) {
  const { scene, mats, env, land } = world;
  const R = rng(5), pf = (x, z) => fromFrame(PARK_FRAME, x, z);
  const palms = [], trees = [], shrubs = [], lights = [];
  const palm = (x, z, s = 1, y = 0) => palms.push({ x, z, ry: R() * TAU, s: s * (0.85 + R() * 0.35), y });
  const tree = (x, z, s = 1, y = 0) => trees.push({ x, z, ry: R() * TAU, s: s * (0.8 + R() * 0.5), y });
  const shrub = (x, z, s = 1, y = 0.2) => shrubs.push({ x, z, ry: R() * TAU, s: s * (0.7 + R() * 0.8), y });

  /* ───── planting ───── */
  // palms down the west road, along the way in and along the avenue (none on the beach side: the shore is kept open to the sea)
  for (let z = -51; z <= 136; z += 18) palm(RB_W.x - 10.5, z);
  for (let x = -520; x <= -268; x += 18) { if (x > -344 && x < -280) continue; palm(x, RB_W.z - 10.5); palm(x, RB_W.z + 10.5); }     // (the name wall and the host stand in the gap)
  for (let x = -214; x < 140; x += 19.5) palm(x, 41.7, 1, 0.3);
  for (let d = 150; d <= 250; d += 14) { const [x, z] = pf(Math.cos(d * DEG) * 39, Math.sin(d * DEG) * 39); palm(x, z, 1.05); }
  for (let d = 20; d <= 100; d += 16) { const [x, z] = pf(Math.cos(d * DEG) * 38.5, Math.sin(d * DEG) * 38.5); palm(x, z, 0.95); }
  // the palm courtyard between the laboratories and the offices (as drawn on the client's plan)
  for (const [x, z] of [[62, -21.2], [67, -20.6], [72, -21.4]]) { const w = pf(x, z); palms.push({ x: w[0], z: w[1], ry: R() * TAU, s: 1.15, y: 0.4 }); }
  for (const [x, z] of [[47.5, -25], [54, -25.2], [61, -25.2], [68.5, -25.2], [76, -25.2], [83, -25], [84.6, -20.5], [79, -18], [73, -17.2], [64, -16.4], [57, -15.6], [51.6, -17.4]]) { const w = pf(x, z); trees.push({ x: w[0], z: w[1], ry: R() * TAU, s: 0.62, y: 0.3 }); }
  for (let d = 16; d < 204; d += 5.5) { const w = pf(Math.cos(d * DEG) * 33.6, Math.sin(d * DEG) * 33.6); shrubs.push({ x: w[0], z: w[1], ry: d, s: 0.95, y: 0.5 }); }
  // shade trees on the lawns, beach palms, desert scrub inland
  for (const [x0, z0, x1, z1] of LAWNS) { const n = Math.max(3, Math.round(((x1 - x0) * (z1 - z0)) / 330)); for (let k = 0; k < n; k++) tree(x0 + 4 + R() * (x1 - x0 - 8), z0 + 4 + R() * (z1 - z0 - 8), 1.2, 0.3); }
  for (let k = 0; k < 150; k++) { const x = -1000 + R() * 720, z = -520 + R() * 660; if (z > 150 || Math.abs(z - RB_W.z) < 16 || (x + 76.5) * COAST.nx + (z + 243) * COAST.nz > -30) continue; shrub(x, z, 1.3 + R(), 0.15); }
  tree(RB_E.x, RB_E.z, 1.5, 0.4); for (const [x, z] of [[160, 46], [186, 100], [172, 124], [-254, 60], [-254, 120]]) tree(x, z, 1.1, 0.3);
  plantTrees(scene, mats, { palms, trees, shrubs });

  /* ───── solar street lights along every road ───── */
  const lamp = (pts, w, every = 30) => { const p = resample(pts, every); p.forEach((q, i) => { if (i === 0 || i === p.length - 1) return; const a = p[i - 1], c = p[i + 1], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, nx = -(c[1] - a[1]) / l, nz = (c[0] - a[0]) / l, s = i % 2 ? 1 : -1, x = q[0] + nx * s * (w / 2 + 1.7), z = q[1] + nz * s * (w / 2 + 1.7); lights.push({ x, z, ry: Math.atan2(nz * s, -nx * s) }); }); };
  lamp(land.roads.north, ROADS.w); lamp(land.roads.shore, ROADS.w); lamp(land.roads.avenue, ROADS.w); lamp(land.roads.south, ROADS.w, 34); lamp(land.roads.west, ROADS.w); lamp(land.roads.cross, 9); lamp(land.roads.drive, 9, 24);
  lamp([[-560, RB_W.z], [RB_W.x - RB_W.r - 4, RB_W.z]], ROADS.w, 34);
  for (const [x, z] of [[-122, -108], [-104, -96], [-112, -86], [-92, -86]]) lights.push({ x, z, ry: 0.6 });
  streetLights(scene, mats, env, lights);

  /* ───── fixed things ───── */
  const b = new Builder();
  const paint = [0xf4f4f2, 0xd9dde0, 0x33414c, 0x8f1f24, 0x2a5c7d, 0xf4f4f2, 0xb9bfc4, 0x1d2227, 0xe9e2d0];
  // parking court: white tensile canopies along the office side, cars in the bays
  { const [a, c] = [PARKING[0], PARKING[1]], len = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / len, uz = (c[1] - a[1]) / len, ry = -Math.atan2(uz, ux);
    for (let k = 0; k < 5; k++) {
      const d = 5.4 + k * 9.3, x = a[0] + ux * d - uz * 4.2, z = a[1] + uz * d + ux * 4.2;
      b.push(x, 0.07, z, ry);
      b.use('satin'); for (const [sx, sz] of [[-4.1, -2.7], [4.1, -2.7], [-4.1, 2.7], [4.1, 2.7]]) b.cyl(0xe6e9eb, 0.09, sx * sz > 0 ? 3.9 : 2.5, sx, 0, sz, 8);
      b.use('matte'); const P4 = [[-4.4, 2.5, -3], [4.4, 3.9, -3], [4.4, 2.5, 3], [-4.4, 3.9, 3]], mid = [0, 2.75, 0];
      for (let i = 0; i < 4; i++) { const p = P4[i], q = P4[(i + 1) % 4]; b.cur.raw([p, q, mid].map(([vx, vy, vz]) => { const cs = Math.cos(ry), sn = Math.sin(ry); return [x + vx * cs + vz * sn, 0.07 + vy, z - vx * sn + vz * cs]; }), [[0, 1, 0], [0, 1, 0], [0, 1, 0]], [0, 1, 2, 0, 2, 1], 0xfbfaf6); }
      b.pop();
      for (const o of [-2.6, 0, 2.6]) if (R() < 0.36) car(b, x + ux * o, z + uz * o, ry + Math.PI / 2 + (R() - 0.5) * 0.05, paint[Math.floor(R() * paint.length)]);
    }
    for (let i = 0; i < 14; i++) if (R() < 0.22) car(b, -125.4 + i * 3.2, -85.2, Math.PI / 2 + (R() - 0.5) * 0.06, paint[Math.floor(R() * paint.length)]); }
  bus(b, DROP.x - 9, DROP.z - 9.6, 0.62);                                         // the staff coach at the drop-off
  for (const [x, z, ry, hex] of [[84, 20.6, 0, 0xf4f4f2], [150, 96, Math.PI / 2, 0x33414c], [-2, -58, 0.7, 0xf4f4f2]]) car(b, x, z, ry, hex);
  // the golden shell on the west roundabout and the entrance arch over the north road (the flags fly on their own, below)
  b.use('satin').cyl(0xe6dfd0, 3.2, 0.9, RB_W.x, 0.4, RB_W.z, 28); b.use('metal').ico(0xd9a441, 4.6, RB_W.x, 5.0, RB_W.z, 0.86, 0.4, 1); b.use('metal').cyl(0xb98a34, 0.5, 1.4, RB_W.x, 1.3, RB_W.z, 10);
  { const a = [-195, -90], c = [-196, -57], n = 16, pts = [], pts2 = [];
    for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (c[0] - a[0]) * t - Math.sin(Math.PI * t) * 3.6, z = a[1] + (c[1] - a[1]) * t, y = Math.sin(Math.PI * t) ** 0.85 * 19.5; pts.push([x, y, z]); pts2.push([x + 2.4, y * 0.94, z]); }
    b.use('metal').pipe(0xc5ccd1, 0.62, pts, 12); b.use('satin').pipe(0xf6f6f2, 0.3, pts2, 10); for (let i = 3; i <= n - 3; i += 2) b.use('satin').rod(0xdfe4e7, 0.06, pts[i], pts2[i], 5);
    for (const p of [a, c]) b.use('satin').cyl(0xe6dfd0, 1.6, 0.7, p[0], 0.05, p[1], 16); }
  // gatehouse and barrier on the way in: their own group, because the intro starts here before anything else is built
  const gb = new Builder();
  gb.use('matte').box(C.clay, 5, 3.2, 4, -330, 0, RB_W.z - 9.5); gb.box(C.roof, 8, 0.3, 21, -330, 3.3, RB_W.z); gb.use('window').box(null, 5.04, 1.1, 2.6, -330, 1.3, RB_W.z - 9.5);
  for (const s of [-1, 1]) gb.use('satin').cyl(C.steelDark, 0.14, 3.3, -330, 0, RB_W.z + s * 9.6, 8);
  gb.use('matte').box(C.red, 0.14, 0.14, 7, -326, 1.1, RB_W.z - 3.6); gb.box(C.white, 0.15, 0.15, 1.2, -326, 1.1, RB_W.z - 1.2); gb.box(C.white, 0.15, 0.15, 1.2, -326, 1.1, RB_W.z - 4.4);
  // the name of the centre on a stone wall just inside the gate, in Arabic and English
  { const sx = GATE.sign[0], sz = GATE.sign[1]; gb.use('matte').box(0xe2d6bf, 0.9, 2.5, 9.4, sx, 0, sz); gb.box(0xcdbfa4, 1.1, 0.3, 9.8, sx, 2.5, sz); gb.box(0xcdbfa4, 1.2, 0.35, 10, sx, 0, sz);
    for (const dz of [-3.2, 0, 3.2]) gb.use('glow').box(0xfff1d0, 0.3, 0.12, 0.3, sx - 1.3, 0.06, sz + dz); }
  const gate = gb.build(mats, { cast: true }); gate.name = 'gate'; scene.add(gate);
  { const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.9), new THREE.MeshBasicMaterial({ map: gateSignTex(), transparent: true, toneMapped: false }));
    sign.position.set(GATE.sign[0] - 0.47, 1.35, GATE.sign[1]); sign.rotation.y = -Math.PI / 2; sign.name = 'gate-sign'; gate.add(sign); }
  // gatehouse and the workshop by the east lawn
  hall(b, b, { ...SMALL[0], seed: 21, doors: { w: [{ at: 6.5, w: 1.4, h: 2.4 }] }, windows: { w: { n: 2, y: 2.2, h: 1.4, w: 3 }, s: { n: 2, y: 2.2, h: 1.4, w: 3 } }, strip: false, fit: false });
  hall(b, b, { ...SMALL[1], seed: 22, doors: { w: [{ at: 8.4, w: 4 }] }, windows: { s: { n: 3 }, n: { n: 3 } }, strip: false, fit: false });
  // sea water intake: twin mains leave the pump station, pass under the road and the beach, and end at a screened tower offshore
  { const u0 = 162, w0 = [(PUMP.x0 + PUMP.x1) / 2, PUMP.z0];
    for (const s of [-0.7, 0.7]) { b.use('satin').pipe(C.pipeSea, 0.42, [[w0[0] + s, 0.9, w0[1]], [w0[0] + s + COAST.nx * 5, 0.9, w0[1] + COAST.nz * 5], [w0[0] + s + COAST.nx * 6.4, -0.5, w0[1] + COAST.nz * 6.4]], 10);
      const p0 = coast(u0 + s * 1.2, -APRON.back + 3), p1 = coast(u0 + s * 1.2, -7), p2 = coast(u0 + s * 1.2, 8); b.pipe(C.pipeSea, 0.42, [[p0[0], -0.4, p0[1]], [p0[0] + COAST.nx * 2, 0.7, p0[1] + COAST.nz * 2], [p1[0], terrainH(p1[0], p1[1]) + 0.6, p1[1]], [p2[0], SEA_Y - 1.1, p2[1]]], 10); }
    for (let f = -17; f < -7; f += 4.5) { const p = coast(u0, f); b.use('matte').box(0xc4c2bb, 4.4, 0.6, 0.8, p[0], terrainH(p[0], p[1]) - 0.1, p[1], -Math.atan2(COAST.dz, COAST.dx)); }
    const t = coast(u0, 27); b.use('satin'); for (const [dx, dz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) b.cyl(C.steelDark, 0.22, 9, t[0] + dx, SEA_Y - 7, t[1] + dz, 8);
    b.use('matte').box(0x8a959c, 6, 0.3, 6, t[0], SEA_Y + 1.7, t[1]); b.use('satin').cyl(C.yellow, 0.07, 1.9, t[0] + 2.4, SEA_Y + 2, t[1] + 2.4, 6); b.use('glow').ball(C.red, 0.22, t[0] + 2.4, SEA_Y + 4.1, t[1] + 2.4, 8, 6);
    for (const s of [-1, 1]) b.use('satin').rod(C.yellow, 0.04, [t[0] - 3, SEA_Y + 2.9, t[1] + s * 3], [t[0] + 3, SEA_Y + 2.9, t[1] + s * 3], 5); }
  // bollards along the beach promenade and benches facing the sea
  for (let u = -30; u < 420; u += 12) { const p = coast(u, -APRON.back - 2.4); if (p[0] < APRON.east - 6) b.use('satin').cyl(0xe9ecee, 0.14, 0.9, p[0], 0.03, p[1], 8); }
  for (let u = 10; u < 400; u += 48) { const p = coast(u, -APRON.back - 5); b.use('matte').box(C.wood, 2.4, 0.45, 0.6, p[0], 0.05, p[1], -Math.atan2(COAST.dz, COAST.dx)); }
  // a few far buildings inland for depth
  for (const [x, z, w, d, h] of [[-640, -260, 90, 36, 9], [-760, -40, 60, 30, 8], [-700, 60, 80, 28, 10], [-900, -180, 110, 40, 12], [-560, 80, 46, 24, 7]]) { b.use('matte').box(0xe9e6df, w, h, d, x, 0, z); b.box(0x2a5c7d, w, 0.7, 0.2, x, h - 1.4, z - d / 2 - 0.06); }
  const g = b.build(mats, { cast: true }); g.name = 'site'; scene.add(g);

  /* ───── UAE flags: three behind the name wall at the gate and three by the drop-off, streaming in the breeze ───── */
  const flagsGate = createFlags(mats, [-1, 0, 1].map((k) => ({ x: GATE.sign[0] - 4 + k * 4.2, z: GATE.sign[1] + 6.2, h: 10 })));
  const flagsDrop = createFlags(mats, [-1, 0, 1].map((k) => ({ x: DROP.x + 16 + k * 2.2, z: DROP.z - 14 + k * 3.4 })));
  flagsGate.group.name = 'flags-gate'; flagsDrop.group.name = 'flags-drop';
  for (const f of [flagsGate, flagsDrop]) { scene.add(f.group); world.updaters.push(f.update); }

  /* ───── a big LED screen at every area: on the facade that faces the road, or on a pylon where there is room ───── */
  { const hs = HATCH_FRAME.z + HATCH.z1 + 0.12;
    const boards = createBoards(world, [
      { id: 'phase1', x: -148, z: P1.a.z0 - 0.12, ry: Math.PI, wall: true, y: 4.4, w: 6.2 },
      { id: 'nursery', x: -128.4, z: hs, ry: 0, wall: true, y: 5.0, w: 5.8 },
      { id: 'hatchery', x: -72, z: hs, ry: 0, wall: true, y: 5.0, w: 5.8 },
      { id: 'livefeed', x: -12, z: HATCH_FRAME.z + HATCH.annexZ1 + 0.12, ry: 0, wall: true, y: 2.9, w: 5.0 },
      { id: 'broodstock', x: 40, z: BROOD_FRAME.z + BROOD.z1 + 0.12, ry: 0, wall: true, y: 5.4, w: 6.0 },
      { id: 'plantroom', x: 91, z: PLANT_FRAME.z - PLANT.x0 + 0.12, ry: 0, wall: true, y: 4.0, w: 5.2 },
      { id: 'genroom', x: (GEN.x0 + GEN.x1) / 2, z: GEN.z1 + 0.12, ry: 0, wall: true, y: 2.3, w: 4.2 },
      { id: 'visitor', x: -190, z: -122, ry: -0.64, w: 6.0 },
      { id: 'research', x: -146, z: -93, ry: -0.8, w: 5.6 },
      { id: 'seacages', x: JETTY.u + 9.5, z: LANDLINE.south - 4.5, ry: Math.PI, w: 5.6 },
    ]);
    scene.add(boards.group); world.updaters.push(boards.update); world.boards = boards; }

  /* ───── people outdoors ───── */
  const ppl = [], who = (x, z, k, o = {}) => ppl.push({ x, z, ry: R() * TAU, hex: wearFor(k, R), kind: k, ...o });
  const along = (pts, k, n, o = {}) => { for (let i = 0; i < n; i++) ppl.push({ x: pts[0][0], z: pts[0][1], hex: wearFor(k, R), kind: k, path: pts, off: (i + R() * 0.5) / n, speed: 1.05 + R() * 0.35, ...o }); };
  // visitors arriving, a school group by the coach, staff crossing between buildings, a stroll along the beach promenade
  who(DROP.x - 4, DROP.z - 6, 'visitor', { mode: 'talk' }); who(DROP.x - 2.6, DROP.z - 7.2, 'visitor', { s: 0.72 }); who(DROP.x - 5.4, DROP.z - 7.6, 'visitor', { s: 0.72 }); who(DROP.x - 3.4, DROP.z - 8.6, 'kandura', { mode: 'talk' }); who(DROP.x - 6.6, DROP.z - 5.4, 'visitor', { s: 0.74 });
  along([[DROP.x + 11, DROP.z - 4], pf(-17.5, 26.5)], 'visitor', 3, { pause: 3 });
  along(Array.from({ length: 36 }, (_, i) => pf(Math.cos((i / 36) * TAU) * 31, Math.sin((i / 36) * TAU) * 31)).filter((_, i) => i > 1 && i < 20), 'visitor', 4);
  along([coast(-20, -APRON.back - 6), coast(400, -APRON.back - 6)], 'visitor', 5, { speed: 1.0 }); along([coast(380, -APRON.back - 8), coast(0, -APRON.back - 8)], 'office', 3);
  along([[-212, 37], [138, 37]], 'coat', 3); along([[140, 26.6], [-170, 26.6]], 'overall', 3); along([[-84, 5.4], [-84, 44]], 'coat', 2); along([[62, 23], [62, 44]], 'hivis', 2);
  along([[-128, -82], [-80, -82]], 'office', 2); along([[110, 86], [150, 86], [150, 100], [110, 100]], 'overall', 2, { loop: true });
  who(-93, 13.2, 'overall'); who(-95.4, 12.4, 'hivis'); who(84, 22.6, 'hivis'); who(120, 21, 'overall'); who(-20, -60, 'overall'); who(-18.4, -61.2, 'coat', { mode: 'talk' });
  // the farm crew on the jetty and the floating walkway, and a deckhand by LFC Hamour
  { const J = JETTY, j = south(J.u + 0.9, 24); who(j[0], j[1], 'hivis', { y: J.y + 0.02, mode: 'idle' }); const d = south(J.u - 1.1, 31); who(d[0], d[1], 'overall', { y: J.y + 0.02, mode: 'work', ry: -Math.PI / 2 });
    along([south(J.u + 0.8, J.f0 + 7), south(J.u + 0.8, J.f1 - 2)], 'hivis', 1, { y: J.y + 0.02, speed: 1.0, pause: 4 });
    const east = Math.max(...CAGES.small.list.map((c) => c[0])) + 6; along([south(J.u + 3, J.way), south(east, J.way)], 'overall', 2, { y: SEA_Y + 0.44, speed: 0.95 }); }
  const people = createPeople(mats, ppl, { y: 0.09, seed: 17 }); scene.add(people.group); world.updaters.push(people.update);
  // at the gate, where the intro begins: the guard in his booth and the Emirati host who welcomes you, in front of the name wall
  const host = createPeople(mats, [{ x: GATE.host[0], z: GATE.host[1], ry: GATE.hostRy, hex: wearFor('emirati', R), kind: 'emirati', cast: 'host', mode: 'present' }, { x: -331.5, z: RB_W.z - 6, ry: 1.2, hex: wearFor('hivis', R), kind: 'hivis', cast: 'guard', mode: 'idle' }], { y: 0.09, seed: 29 });
  host.group.name = 'host'; scene.add(host.group); world.updaters.push(host.update);

  /* ───── traffic ───── */
  const rd = land.roads, rev = (p) => p.slice().reverse();
  const traffic = createTraffic(mats, [
    { pts: [[-620, RB_W.z], ...arc(RB_W, Math.PI, Math.PI * 1.9), ...rd.north, ...rd.shore, ...arc(RB_E, -Math.PI / 2, Math.PI * 0.4)], loop: false, n: 2, speed: 8.5 },
    { pts: [...rd.avenue, ...rev(rd.south).slice(8), ...rev(rd.west).slice(0, -1)].filter((p) => p[0] >= RB_W.x - 0.5), loop: true, n: 2, speed: 7.2 },
  ]);
  scene.add(traffic.group); world.updaters.push(traffic.update);

  /* ───── gulls over the beach and the cages ───── */
  const fc = CAGES.big.list.reduce((a, c) => [a[0] + c[0] / CAGES.big.list.length, a[1] + c[1] / CAGES.big.list.length], [0, 0]);
  const birds = createBirds(22, [fc[0], fc[1] - 60], env); scene.add(birds.mesh); world.updaters.push(birds.update);
  void glowPointsMat;
}
function arc(rb, a0, a1, n = 10) { const out = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([rb.x + Math.cos(a) * rb.r, rb.z + Math.sin(a) * rb.r]); } return out; }

function createBirds(n, [cx, cz], env) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.35, 0, 0, -0.35, 1.5, 0, 0, 0, 0, -0.35, 0, 0, 0.35, -1.5, 0, 0]), 3));
  geo.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1]), 1));
  const R = rng(23), a = new Float32Array(n * 4), b = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a.set([cx + (R() - 0.5) * 260, cz + (R() - 0.5) * 200, 30 + R() * 70, 0.05 + R() * 0.07], i * 4); b.set([R() * TAU, 14 + R() * 26, 0.8 + R() * 0.6], i * 3); }
  geo.setAttribute('aOrbit', new THREE.InstancedBufferAttribute(a, 4)); geo.setAttribute('aBird', new THREE.InstancedBufferAttribute(b, 3));
  const U = { uT: { value: 0 }, uNight: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
    vertexShader: `attribute float aSide; attribute vec4 aOrbit; attribute vec3 aBird; uniform float uT; varying float vS;
      void main(){ float th = aBird.x + uT * aOrbit.w * (aBird.z > 1.1 ? 1.0 : -1.0); vec2 c = vec2(cos(th), sin(th)); float dir = aBird.z > 1.1 ? 1.0 : -1.0;
        vec3 centre = vec3(aOrbit.x + c.x * aOrbit.z, aBird.y + sin(uT * 0.3 + aBird.x * 5.0) * 3.0, aOrbit.y + c.y * aOrbit.z * 0.7);
        vec2 fwd = normalize(vec2(-c.y, c.x * 0.7)) * dir, side = vec2(-fwd.y, fwd.x);
        vec3 p = position * aBird.z; float flap = sin(uT * 7.0 * (1.6 - aBird.z * 0.5) + aBird.x * 9.0); p.y += aSide * (0.25 + flap * 0.7) * aBird.z; p.x *= 1.0 - aSide * abs(flap) * 0.18;
        vec3 w = centre + vec3(side.x * p.x + fwd.x * p.z, p.y, side.y * p.x + fwd.y * p.z); vS = aSide;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
    fragmentShader: `uniform float uNight; varying float vS; void main(){ vec3 c = mix(vec3(0.97), vec3(0.34, 0.37, 0.4), smoothstep(0.55, 1.0, vS)) * (1.0 - 0.7 * uNight); gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  env.onNight((v) => { U.uNight.value = v; });
  const mesh = new THREE.InstancedMesh(geo, mat, n); mesh.frustumCulled = false; mesh.name = 'gulls';
  return { mesh, update: (dt, t) => { U.uT.value = t; } };
}

/** the name of the centre for the wall at the gate (Arabic above English) */
function gateSignTex() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 226; const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#b8892f'; g.textAlign = 'center'; g.direction = 'rtl'; g.font = '600 76px "Geeza Pro", "Noto Naskh Arabic", "Arial", sans-serif'; g.fillText('مركز الشيخ خليفة للأبحاث البحرية', 512, 88);
  g.direction = 'ltr'; g.fillStyle = '#0b2b3c'; g.font = '600 50px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif'; g.fillText('SHEIKH KHALIFA MARINE RESEARCH CENTRE', 512, 168);
  g.fillStyle = '#b8892f'; g.fillRect(392, 192, 240, 4);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
