// Everything outdoors that is not a building: planting, lighting, vehicles, flags, the sea water intake.
import * as THREE from 'three';
import { Builder, C, rng, TAU, DEG, arcPts } from './kit.js';
import { plantTrees, streetLights, car, bus, flag, carport, crowd, walkers, WEAR, glowPointsMat } from './props.js';
import { PARK, ROADS, HATCH, BROOD, INTAKE, GEN, P1 } from './layout.js';
import { SEA_Y, terrainH } from './terrain-fn.js';

export function buildSite(world) {
  const { scene, mats, env } = world;
  const R = rng(5), px = PARK.x, pz = PARK.z;
  const { ave, north, east, south, crossA, crossB } = ROADS;
  const palms = [], trees = [], shrubs = [], lights = [];
  const palm = (x, z, s = 1) => palms.push({ x, z, ry: R() * TAU, s: s * (0.85 + R() * 0.35) });
  const tree = (x, z, s = 1) => trees.push({ x, z, ry: R() * TAU, s: s * (0.8 + R() * 0.5) });
  const shrub = (x, z, s = 1) => shrubs.push({ x, z, ry: R() * TAU, s: s * (0.7 + R() * 0.8), y: 0.2 });

  // avenue of palms, both sides
  for (let z = north + 18; z < south - 8; z += 13) { if (Math.abs(z - crossA) < 8 || Math.abs(z - crossB) < 8) continue; palm(ave - 7.5, z); if (z > crossB + 6 || z < crossA - 6) palm(ave + 7.5, z); }
  // visitor road and forecourt
  for (const [x, z] of [[-112, 204], [-140, 182], [-164, 160], [-188, 128], [-208, 100], [-226, 66], [-242, 30], [-258, 2], [-262, -52], [-236, -2], [-222, 22]]) palm(x, z);
  for (let d = 150; d <= 250; d += 14) palm(px + Math.cos(d * DEG) * 39, pz + Math.sin(d * DEG) * 39, 1.05);
  for (let d = 20; d <= 100; d += 16) palm(px + Math.cos(d * DEG) * 38.5, pz + Math.sin(d * DEG) * 38.5, 0.95);
  // courtyard: three date palms and shade trees (as drawn on the plan)
  for (const [x, z] of [[62, -21.2], [67, -20.6], [72, -21.4]]) palms.push({ x: px + x, z: pz + z, ry: R() * TAU, s: 1.15, y: 0.4 });
  for (const [x, z] of [[47.5, -25], [54, -25.2], [61, -25.2], [68.5, -25.2], [76, -25.2], [83, -25], [84.6, -20.5], [79, -18], [73, -17.2], [64, -16.4], [57, -15.6], [51.6, -17.4]]) trees.push({ x: px + x, z: pz + z, ry: R() * TAU, s: 0.62, y: 0.3 });
  // beach palms and lawn trees
  for (let k = 0; k < 16; k++) palm(-266 + R() * 14, -120 + R() * 240, 0.9);
  for (const [x, z] of [[-178, 84], [-150, 110], [-118, 126], [-132, 82], [-104, 100], [-160, 136], [-124, 148], [-232, -84], [-246, -72], [-228, 44], [-152, -128], [-132, -118], [-108, -132], [-92, -112], [176, 132], [180, 150], [ave, south + 34], [-250, -30]]) tree(x, z, 1.25);
  for (let z = crossB + 16; z < south - 12; z += 12) tree(ave + 17, z, 0.9);
  for (let z = -128; z < crossA - 10; z += 14) tree(-55, z, 0.9);
  for (let i = 0; i < 9; i++) shrub(-58, -24 + i * 21.5, 1.1);
  for (let z = -92; z < 116; z += 11) shrub(east + 10.5, z, 1.2);
  for (let k = 0; k < 70; k++) { const x = -260 + R() * 500, z = 260 + R() * 500; shrub(x, z, 1.4 + R()); }
  for (let d = 16; d < 204; d += 5.5) shrubs.push({ x: px + Math.cos(d * DEG) * 33.6, z: pz + Math.sin(d * DEG) * 33.6, ry: d, s: 0.95, y: 0.5 });
  plantTrees(scene, mats, { palms, trees, shrubs });

  // solar street lights
  const light = (x, z, ry) => lights.push({ x, z, ry });
  for (let x = ave + 20; x < east - 10; x += 30) { light(x, north + 5.5, Math.PI / 2); light(x, south - 5.5, -Math.PI / 2); light(x + 15, crossA + 5.5, -Math.PI / 2); light(x + 15, crossB - 5.5, Math.PI / 2); }
  for (let z = north + 22; z < south - 10; z += 30) { light(ave + 5.5, z + 6, Math.PI); light(east - 5.5, z, 0); }
  for (const [x, z, ry] of [[-100, 68, -Math.PI / 2], [-140, 68, -Math.PI / 2], [-176, 68, -Math.PI / 2], [-126, 190, -2.4], [-178, 142, -2.3], [-214, 86, -2.1], [-240, 26, -1.8], [-246, -44, -1.2], [-174, 10, Math.PI / 2], [-130, 10, Math.PI / 2], [-150, 60, -Math.PI / 2], [-110, 34, 0], [ave + 5.5, 250, Math.PI], [ave + 5.5, 300, Math.PI], [-200, -140, Math.PI / 2], [-120, -164, -Math.PI / 2]]) light(x, z, ry);
  streetLights(scene, mats, env, lights);

  // parked vehicles, canopies, flags, small things
  const b = new Builder();
  const paint = [0xf4f4f2, 0xd9dde0, 0x33414c, 0x8f1f24, 0x2a5c7d, 0xf4f4f2, 0xb9bfc4, 0x1d2227, 0xe9e2d0];
  for (let i = 0; i < 26; i++) { const x = -174.4 + i * 3.2; if (R() < 0.62) car(b, x, 20.4, Math.PI / 2 + (R() - 0.5) * 0.05, paint[Math.floor(R() * paint.length)]); if (R() < 0.45) car(b, x, 49.8, -Math.PI / 2 + (R() - 0.5) * 0.05, paint[Math.floor(R() * paint.length)]); if (i < 24 && R() < 0.4) car(b, x, 35, (R() < 0.5 ? 1 : -1) * Math.PI / 2, paint[Math.floor(R() * paint.length)]); }
  carport(b, -176, 20.6, -94); carport(b, -176, 49.6, -94);
  bus(b, -243, -8, 1.3);                                                   // the staff coach at the drop-off
  car(b, 60, crossA + 9, 0.02, 0xf4f4f2); car(b, 132, -70, Math.PI / 2, 0xd9dde0); car(b, 20, 62, 0, 0x2a5c7d); car(b, -8, 150, 0.1, 0xf4f4f2); car(b, 100, crossB - 1.8, Math.PI, 0xb9bfc4); car(b, east - 1.8, 20, Math.PI / 2, 0x33414c);
  for (const dx of [-5, 0, 5]) flag(b, px - 34 + dx * 0.9, pz + 44 + dx * 0.55, 0.9);
  // gatehouse on the way in
  b.use('matte').box(C.clay, 5, 3.2, 4, ave + 9, 0, 262); b.box(C.roof, 14, 0.3, 6, ave + 2, 3.2, 262); b.use('window').box(null, 5.04, 1.1, 2.6, ave + 9, 1.3, 262); b.use('satin').cyl(C.steelDark, 0.12, 3.2, ave - 4.5, 0, 264.5, 8);
  b.use('matte').box(C.red, 7, 0.14, 0.14, ave - 1, 1.1, 266); b.box(C.white, 1.2, 0.15, 0.15, ave - 3.4, 1.1, 266); b.box(C.white, 1.2, 0.15, 0.15, ave - 0.4, 1.1, 266);
  // sea water intake: two mains from the pump room to a screened tower offshore
  const ix = (INTAKE.x0 + INTAKE.x1) / 2 - 4;
  for (const dx of [0, 2.2]) b.use('satin').pipe(C.pipeSea, 0.42, [[ix + dx, 0.9, INTAKE.z0], [ix + dx, 0.9, -172], [ix + dx, terrainH(ix, -192) + 0.4, -192], [ix + dx, SEA_Y - 3.4, -222]], 10);
  for (let z = INTAKE.z0 - 6; z > -172; z -= 9) b.use('matte').box(C.clayCool, 4.2, 0.5, 0.7, ix + 1.1, 0.05, z);
  b.use('satin'); for (const [dx, dz] of [[-2.2, -2.2], [4.4, -2.2], [-2.2, 2.2], [4.4, 2.2]]) b.cyl(C.steelDark, 0.2, 9, ix + dx, SEA_Y - 7, -224 + dz, 8);
  b.use('matte').box(0x8a959c, 7.6, 0.3, 5.4, ix + 1.1, SEA_Y + 1.6, -224); b.use('satin').cyl(C.yellow, 0.07, 1.8, ix + 4.4, SEA_Y + 1.9, -221.8, 6); b.use('glow').ball(C.red, 0.2, ix + 4.4, SEA_Y + 3.9, -221.8, 8, 6);
  // roundabout marker
  const rb = world.land.roundabout; b.use('satin').cyl(C.clay, 1.1, 0.5, rb.x, 0.28, rb.z, 20); b.use('matte').ico(C.orange, 2.0, rb.x, 3.4, rb.z, 1, 0.4, 1); b.use('satin').cyl(C.woodDark, 0.2, 2.2, rb.x, 0.7, rb.z, 8);
  // a few far buildings on the mainland for depth
  for (const [x, z, w, d, h] of [[240, 330, 80, 34, 9], [330, 300, 50, 30, 8], [-360, 380, 60, 26, 7], [120, 430, 90, 30, 10], [-180, 470, 44, 22, 6]]) { b.use('matte').box(0xe9e6df, w, h, d, x, 0, z); b.box(0x2a5c7d, w, 0.7, 0.2, x, h - 1.4, z - d / 2 - 0.06); }
  const g = b.build(mats, { cast: true }); g.name = 'site'; scene.add(g);

  // people outdoors: a few standing, a few walking
  const still = [];
  const put = (x, z, k, s = 1) => still.push({ x, z, ry: R() * TAU, hex: Array.isArray(WEAR[k]) ? WEAR[k][Math.floor(R() * WEAR[k].length)] : WEAR[k], s, y: 0.07 });
  put(-236, -10, 'visitor'); put(-234.5, -11.4, 'visitor', 0.72); put(-233, -9.6, 'visitor', 0.72); put(-235.5, -8, 'kandura'); put(px - 16, pz + 27, 'office'); put(px - 18.5, pz + 29, 'visitor');
  put(36, 29, 'hivis'); put(30, crossA + 12, 'overall'); put(120, -78, 'hivis'); put(60, 114, 'overall'); put(-150, 35, 'office'); put(ave + 11, 259, 'hivis'); put(40, -182, 'overall'); put(42, -186, 'hivis');
  const sg = crowd(mats, still, 0.07); scene.add(sg);
  const wk = walkers(mats, [
    { pts: [[-268, -30], [-262, -110], [-222, -152], [-150, -160], [-82, -160], [-150, -158], [-222, -150], [-260, -110]], n: 4, speed: 1.15, hex: 0xe8862e },
    { pts: arcPts(31.2, 20 * DEG, 200 * DEG, px, pz, 12 * DEG).concat(arcPts(29.6, 200 * DEG, 20 * DEG, px, pz, 12 * DEG)), n: 5, speed: 1.2, hex: 0x35a7a3 },
    { pts: [[ave - 5, -120], [ave - 5, 150], [ave - 4, 150], [ave - 4, -120]], n: 4, speed: 1.3, hex: 0xf6f8f9 },
    { pts: [[-22, crossB - 7], [150, crossB - 7], [150, crossB - 6], [-22, crossB - 6]], n: 3, speed: 1.25, hex: 0x2f6f9c },
    { pts: [[40, -180], [40, -262], [41, -262], [41, -180]], n: 2, speed: 1.1, hex: 0xf08a24, y: 0.55 },
  ]);
  scene.add(wk.group); world.updaters.push(wk.update);
}
