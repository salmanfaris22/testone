// Area 11: the cages off the south shore, in front of Phase 1. Nine open grow-out cages, three rows of three,
// a fixed jetty over the rock armour with a hinged gangway down to a floating landing stage for the boats,
// the feed barge, the work boat, and LFC Hamour (the live fish carrier) alongside the jetty.
// (The eight covered nursery cages near the jetty were taken out at the client's request, with the walkway that served them.)
import * as THREE from 'three';
import { Builder, C, rng, TAU, canvasTex } from './kit.js';
import { workBoat } from './props.js';
import { makeLFC, animateLFC, LFC_ITEM } from './lfc.js';
import { CAGES, JETTY, LFC_BERTH, south } from './layout.js';
import { SEA_Y, terrainH } from './terrain-fn.js';
import { P } from './rig.js';
import { buildCycleRing } from './cycle-ring.js';

const BIG_SP = [['hamour', 'Hamour'], ['hamra', 'Hamra, red snapper'], ['shiqra', 'Shiqra, mangrove snapper'], ['seabream', 'Seabream'], ['hamour', 'Hamour'], ['shaari', 'Shaari'], ['hamra', 'Hamra, red snapper'], ['shiqra', 'Shiqra, mangrove snapper'], ['hamour', 'Hamour'], ['seabream', 'Seabream'], ['hamra', 'Hamra, red snapper'], ['hamour', 'Hamour']];

export function cageList() {
  const out = [];
  CAGES.big.list.forEach(([x, z], i) => out.push({ x, z, r: CAGES.big.r, n: i + 1, kind: 'growout', code: `SC-${String(i + 1).padStart(2, '0')}`, sp: BIG_SP[i], depth: 9 }));
  return out;
}

export function buildCages(world) {
  const { mats, areas } = world;
  const cages = cageList(), Y = SEA_Y, b = new Builder(), R = rng(77);

  // net texture: a fine diamond mesh, see-through
  const net = canvasTex(64, 64, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(20,40,50,.85)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, w); g.moveTo(w, 0); g.lineTo(0, w); g.stroke(); });
  const netMat = new THREE.MeshBasicMaterial({ map: net, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, depthWrite: true, color: 0x9fb3bd });
  const netGeo = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true);
  { const uv = netGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 110, uv.getY(i) * 12); }
  const nets = new THREE.InstancedMesh(netGeo, netMat, cages.length), m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion();
  const floorG = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), floors = new THREE.InstancedMesh(floorG, new THREE.MeshBasicMaterial({ color: 0x0d3550 }), cages.length);
  // a bird net over the top of each cage: drawn up from the handrail to a ring on the central pole, so the gulls cannot reach the fish
  const BIRD_H = 3.3, birdGeo = new THREE.CylinderGeometry(0.42, CAGES.big.r + 0.12, BIRD_H, 72, 1, true).translate(0, BIRD_H / 2, 0);
  { const uv = birdGeo.attributes.uv, slant = Math.hypot(BIRD_H, CAGES.big.r); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.round((Math.PI * 2 * CAGES.big.r) / 0.55), uv.getY(i) * Math.round(slant / 0.55)); }
  // the net reads as a faint dark veil from afar and as mesh up close: a thin haze in the cloth, darker twine on top
  const birdTex = canvasTex(64, 64, (g, w) => { g.clearRect(0, 0, w, w); g.fillStyle = 'rgba(30,38,44,.16)'; g.fillRect(0, 0, w, w); g.strokeStyle = 'rgba(24,30,36,.92)'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, w); g.moveTo(w, 0); g.lineTo(0, w); g.stroke(); });
  const birdNets = new THREE.InstancedMesh(birdGeo, new THREE.MeshBasicMaterial({ map: birdTex, transparent: true, side: THREE.DoubleSide, color: 0x4d5b63, depthWrite: false }), cages.length);
  birdNets.renderOrder = 3;

  cages.forEach((c, i) => {
    const r = c.r, d = c.depth;
    m4.compose(new THREE.Vector3(c.x, Y + 1.2 - (d + 1.2) / 2, c.z), q0, new THREE.Vector3(r - 0.3, d + 1.2, r - 0.3)); nets.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(c.x, Y - d, c.z), q0, new THREE.Vector3(r - 0.3, 1, r - 0.3)); floors.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(c.x, Y + 1.45, c.z), q0, new THREE.Vector3(1, 1, 1)); birdNets.setMatrixAt(i, m4);
    // the pole that holds the net up, its top ring and the eight ropes the net hangs on
    b.use('satin').cyl(C.steelDark, 0.09, BIRD_H + 0.4, c.x, Y + 1.35, c.z, 8); b.torus(C.steelDark, 0.42, 0.05, c.x, Y + 1.45 + BIRD_H, c.z, 5, 16);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.2; b.rod(0x3a444b, 0.03, [c.x + Math.cos(a) * 0.42, Y + 1.45 + BIRD_H, c.z + Math.sin(a) * 0.42], [c.x + Math.cos(a) * (r + 0.12), Y + 1.47, c.z + Math.sin(a) * (r + 0.12)], 4); }
    b.use('satin').torus(C.hdpe, r, 0.32, c.x, Y + 0.1, c.z, 8, 64); b.torus(C.hdpe, r + 1.15, 0.32, c.x, Y + 0.1, c.z, 8, 64);
    b.use('matte').ring(0x5f6b73, r + 1.05, r + 0.1, c.x, Y + 0.44, c.z, 64);                      // walkway between the two pipes
    b.use('satin').torus(C.yellow, r + 0.12, 0.05, c.x, Y + 1.45, c.z, 5, 64);
    const posts = Math.round(r * 1.7); for (let k = 0; k < posts; k++) { const a = (k / posts) * TAU; b.cyl(C.hdpe, 0.05, 1.1, c.x + Math.cos(a) * (r + 0.12), Y + 0.35, c.z + Math.sin(a) * (r + 0.12), 5); }
    b.use('satin').cyl(C.orange, 0.7, 0.55, c.x, Y, c.z, 12); b.cyl(C.steelDark, 0.12, 0.8, c.x, Y + 0.55, c.z, 8);   // feed spreader
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.78; b.use('satin').ball(k % 2 ? C.orange : C.yellow, 0.7, c.x + Math.cos(a) * (r + 7), Y + 0.18, c.z + Math.sin(a) * (r + 7), 10, 8); }
  });
  nets.instanceMatrix.needsUpdate = true; floors.instanceMatrix.needsUpdate = true; birdNets.instanceMatrix.needsUpdate = true; nets.renderOrder = -12; floors.renderOrder = -13; birdNets.name = 'bird-nets';

  /* ───── jetty, gangway and the floating landing stage ───── */
  const J = JETTY, ju = J.u, half = J.w / 2, DY = J.y, WY = Y + 0.44;                 // jetty deck top, walkway deck top
  const at = (u, f) => south(u, f);
  // floating walkway: a deck on twin HDPE floats, cross cleats every few metres
  const way = (a, c, w = 2.6) => {
    const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), nx = -dz / len, nz = dx / len;
    b.use('matte').wall(0x8a959c, a[0], a[1], c[0], c[1], w, Y - 0.14, Y + 0.38);
    const n = Math.max(1, Math.round(len / 3)); for (let k = 0; k <= n; k++) { const x = a[0] + (dx * k) / n, z = a[1] + (dz * k) / n; b.wall(0x71808a, x - nx * w * 0.5, z - nz * w * 0.5, x + nx * w * 0.5, z + nz * w * 0.5, 0.16, Y + 0.38, WY); }
    for (const s of [-1, 1]) b.use('satin').rod(C.hdpe, 0.26, [a[0] + nx * s * (w / 2 - 0.15), Y + 0.02, a[1] + nz * s * (w / 2 - 0.15)], [c[0] + nx * s * (w / 2 - 0.15), Y + 0.02, c[1] + nz * s * (w / 2 - 0.15)], 8);
    for (let k = 0; k <= n; k += 2) { const x = a[0] + (dx * k) / n, z = a[1] + (dz * k) / n; for (const s of [-1, 1]) b.use('satin').cyl(C.steel, 0.07, 0.22, x + nx * s * (w / 2 - 0.25), WY, z + nz * s * (w / 2 - 0.25), 6); }
  };
  // the gangway lands on a pontoon that runs on as a floating landing stage, where the work boats tie up
  way(at(ju, J.foot - 2.2), at(ju, J.way + 1.3), 4.4);
  b.use('matte').box(0x8a959c, 5.2, 0.52, 4.4, at(ju, J.foot)[0], Y - 0.14, at(ju, J.foot)[1]);   // landing pontoon under the gangway
  b.box(0x71808a, 5.2, 0.06, 4.4, at(ju, J.foot)[0], Y + 0.38, at(ju, J.foot)[1]);
  for (const s of [-1, 1]) b.use('satin').rod(C.hdpe, 0.32, [at(ju + s * 2.2, J.foot - 2)[0], Y + 0.02, at(ju, J.foot - 2)[1]], [at(ju + s * 2.2, J.foot + 2)[0], Y + 0.02, at(ju, J.foot + 2)[1]], 8);
  // cleats, fenders and a lifebuoy along the landing stage, and a guard rail across its far end
  for (const f of [J.foot + 3, J.foot + 7.5, J.way - 0.5]) for (const s of [-1, 1]) { const p = at(ju + s * 2.05, f); b.use('satin').box(C.steelDark, 0.18, 0.16, 0.5, p[0], WY, p[1]); b.use('matte').box(0x1d2328, 0.22, 0.6, 1.1, p[0] + s * 0.25, Y - 0.2, p[1]); }
  { const e = at(ju, J.way + 1.2); b.use('satin').rod(C.alu, 0.04, [ju - 2.1, WY + 1.05, e[1]], [ju + 2.1, WY + 1.05, e[1]], 5); for (const s of [-2.1, 0, 2.1]) b.cyl(C.alu, 0.03, 1.05, ju + s, WY, e[1], 5);
    const lb = at(ju + 1.6, J.way + 1.1); b.use('satin').torus(C.orange, 0.32, 0.08, lb[0], WY + 0.7, lb[1], 6, 16); }
  // guide piles hold the landing pontoon in place but let it rise and fall with the tide
  for (const s of [-1, 1]) { const p = at(ju + s * 3.1, J.foot); const g = terrainH(p[0], p[1]); b.use('satin').cyl(C.steelDark, 0.3, Y + 3.4 - g, p[0], g, p[1], 10); b.cyl(C.yellow, 0.32, 0.5, p[0], Y + 2.9, p[1], 10); }

  // the fixed jetty: a ramp up from the shore walk, a concrete deck over the rock armour on steel piles
  const g0 = at(ju, J.f0), r1 = J.f0 + 6, rTop = at(ju, r1), dEnd = at(ju, J.f1);
  { const len = 6, drop = DY - 0.06; b.use('concrete').boxC(0xd4d0c6, J.w, 0.3, Math.hypot(len, drop), g0[0], 0.06 + drop / 2 - 0.12, (g0[1] + rTop[1]) / 2, 0, -Math.atan2(drop, len)); }
  b.use('concrete').box(0xd4d0c6, J.w, 0.34, J.f1 - r1, ju, DY - 0.34, (rTop[1] + dEnd[1]) / 2);
  b.use('matte').box(0xc4beb2, J.w + 0.2, 0.12, J.f1 - r1, ju, DY - 0.46, (rTop[1] + dEnd[1]) / 2);
  // abutment: solid from the ground up to the deck where the jetty is still over land, so it never floats above the sand
  { const a = at(ju, r1 - 0.1), c = at(ju, 3.5); b.use('concrete').box(0xcdc8bc, J.w + 0.3, DY - 0.32 + 0.6, c[1] - a[1], ju, -0.6, (a[1] + c[1]) / 2); }
  for (let f = 6; f < J.f1; f += 6.5) for (const s of [-1.55, 1.55]) { const p = at(ju + s, f), g = terrainH(p[0], p[1]); b.use('satin').cyl(C.steelDark, 0.26, DY - 0.46 - g + 0.2, p[0], g - 0.2, p[1], 10); }
  for (let f = 6; f < J.f1; f += 6.5) { const p = at(ju, f); b.use('matte').box(0x6f7a82, J.w - 0.4, 0.4, 0.5, p[0], DY - 0.86, p[1]); }   // pile caps
  // handrails along the deck and down the ramp; low kerbs; lamp posts; a lifebuoy
  for (const s of [-1, 1]) {
    const x = ju + s * (half - 0.08), a = at(x, J.f0 + 0.4), m = at(x, r1), c = at(x, J.f1 - 0.15);
    b.use('satin').rod(C.alu, 0.04, [x, 0.06 + 1.05, a[1]], [x, DY + 1.05, m[1]], 5); b.rod(C.alu, 0.04, [x, DY + 1.05, m[1]], [x, DY + 1.05, c[1]], 5);
    b.rod(C.alu, 0.025, [x, 0.06 + 0.55, a[1]], [x, DY + 0.55, m[1]], 4); b.rod(C.alu, 0.025, [x, DY + 0.55, m[1]], [x, DY + 0.55, c[1]], 4);
    for (let f = J.f0 + 0.4; f <= J.f1; f += 2.4) { const y0 = f < r1 ? 0.06 + ((f - J.f0) / 6) * (DY - 0.06) : DY; b.cyl(C.alu, 0.03, 1.05, x, y0, at(x, f)[1], 5); }
    b.use('matte').box(0xbab4a8, 0.18, 0.14, J.f1 - r1, ju + s * (half - 0.1), DY, (rTop[1] + dEnd[1]) / 2);
  }
  for (const f of [10, 26]) { const p = at(ju + half - 0.1, f); b.use('satin').cyl(0xe9ecee, 0.07, 4.6, p[0], DY, p[1], 6); b.boxC(0xe9ecee, 0.8, 0.12, 0.3, p[0] - 0.35, DY + 4.6, p[1]); b.use('glow').boxC(0xfff2cf, 0.5, 0.05, 0.2, p[0] - 0.45, DY + 4.53, p[1]); }
  // mooring bollards and fenders on the west face, where LFC Hamour comes alongside
  for (const f of [14, 22, 30, 38]) { const p = at(ju - half + 0.35, f); b.use('satin').cyl(0x2b3a44, 0.22, 0.42, p[0], DY, p[1], 10); b.cyl(0x2b3a44, 0.3, 0.07, p[0], DY + 0.42, p[1], 10); }
  for (let f = 13; f <= 39; f += 4.5) { const p = at(ju - half - 0.16, f); b.use('matte').box(0x1d2328, 0.3, 1.25, 0.7, p[0], DY - 1.3, p[1]); }
  // the gangway: hinged at the jetty head, its foot rolls on the landing pontoon, so it always meets both decks
  {
    const top = at(ju, J.f1 - 0.6), foot = at(ju, J.foot - 1.2), len = foot[1] - top[1], drop = DY - (WY + 0.06), L = Math.hypot(len, drop), ang = Math.atan2(drop, len), mz = (top[1] + foot[1]) / 2, my = (DY + WY + 0.06) / 2;
    b.use('metal').boxC(C.alu, 1.6, 0.14, L, ju, my - 0.06, mz, 0, ang);
    for (let k = 1; k < 16; k++) { const t = k / 16; b.use('matte').boxC(0x9aa4aa, 1.4, 0.04, 0.06, ju, DY + (WY + 0.06 - DY) * t + 0.02, top[1] + len * t, 0, 0); }   // non-slip treads
    for (const s of [-0.78, 0.78]) {
      b.use('satin').rod(C.alu, 0.04, [ju + s, DY + 1.05, top[1]], [ju + s, WY + 1.1, foot[1]], 5); b.rod(C.alu, 0.025, [ju + s, DY + 0.55, top[1]], [ju + s, WY + 0.6, foot[1]], 4);
      for (let k = 0; k <= 5; k++) { const t = k / 5, y = DY + (WY + 0.06 - DY) * t; b.rod(C.alu, 0.03, [ju + s, y, top[1] + len * t], [ju + s, y + 1.05, top[1] + len * t], 4); }
    }
    b.use('satin').rod(C.steelDark, 0.1, [ju - 0.95, DY + 0.05, top[1]], [ju + 0.95, DY + 0.05, top[1]], 8);           // hinge
    b.use('satin').rod(C.rubber, 0.16, [ju - 0.8, WY + 0.16, foot[1] + 0.2], [ju + 0.8, WY + 0.16, foot[1] + 0.2], 10);   // rollers
  }

  // feed barge moored between the jetty and the grow-out cages
  const fb = at(-8, 118), fry = 0;
  b.push(fb[0], 0, fb[1], fry);
  b.use('satin').box(0x54626c, 16, 1.7, 9, 0, Y - 0.75, 0); b.use('matte').box(0x8a959c, 15.4, 0.1, 8.4, 0, Y + 0.95, 0);
  for (let k = 0; k < 3; k++) { b.use('satin').cyl(C.white, 1.7, 4.6, -4.2 + k * 3.8, Y + 1.05, -1.6, 18); b.cyl(C.white, 1.7, 1.1, -4.2 + k * 3.8, Y + 5.65, -1.6, 18, 0.3); }
  b.use('satin').box(C.clay, 4.8, 2.8, 3.2, 4.4, Y + 1.05, 2.2); b.use('window').box(null, 4.84, 0.9, 3.24, 4.4, Y + 2.4, 2.2); b.use('matte').box(C.orange, 5.2, 0.14, 3.6, 4.4, Y + 3.85, 2.2);
  for (const s of [-1, 1]) for (let x = -7.4; x <= 7.5; x += 2.47) b.use('satin').cyl(C.yellow, 0.035, 1.1, x, Y + 1.0, s * 4.1, 5);
  b.pop();
  { const row = cages.filter((c) => c.z === cages[0].z); row.forEach((c, k) => { const t = [fb[0] - 4.5 + k * 3, fb[1] + 4.6]; b.use('satin').pipe(C.hdpe, 0.11, [[t[0], Y + 1.3, t[1]], [(t[0] + c.x) / 2, Y + 0.06, (t[1] + c.z - c.r) / 2 + (k - (row.length - 1) / 2) * 2], [c.x, Y + 0.3, c.z - c.r]], 6); }); }   // a floating feed line to each cage of the first row
  // camera buoy between the grow-out rows
  const cb = at(-64.5, 180.5); b.use('satin').cyl(C.yellow, 0.8, 0.8, cb[0], Y - 0.2, cb[1], 12); b.cyl(C.steelDark, 0.07, 2.8, cb[0], Y + 0.6, cb[1], 6); b.use('glow').ball(C.red, 0.18, cb[0], Y + 3.5, cb[1], 8, 6);
  // yellow special-mark buoys at the corners of the farm, as on the charts
  { const xs = cages.map((c) => c.x), zs = cages.map((c) => c.z), x0 = Math.min(...xs) - 34, x1 = Math.max(...xs) + 34, z1 = Math.max(...zs) + 34;
    for (const [x, z] of [[x0, at(0, 30)[1]], [x1, at(0, 30)[1]], [x0, z1], [x1, z1]]) { b.use('satin').cyl(C.yellow, 0.9, 1.6, x, Y - 0.5, z, 12, 0.5); b.cyl(C.yellow, 0.08, 1.6, x, Y + 1.1, z, 6); b.boxC(C.yellow, 0.7, 0.12, 0.7, x, Y + 2.6, z, 0.78, 0, 0.78); b.boxC(C.yellow, 0.7, 0.12, 0.7, x, Y + 2.6, z, -0.78, 0, 0.78); } }

  const low = b.build(mats, { cast: true }); low.add(nets, floors, birdNets);
  // the work boat does slow rounds of the grow-out cages; it faces the way it is going and leaves a wake
  const bb = new Builder(); workBoat(bb, 0, 0, 0, Y); const boat = bb.build(mats, { cast: true });
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(22, 5).rotateX(-Math.PI / 2).translate(-14, Y + 0.06, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false })); boat.add(wake);
  const bc = at(-64.5, 222);
  // its round: a lane with rounded corners right round the outside of the nine cages, clear of every net (it used to cross three)
  const lane = (() => {
    const xs = cages.map((c) => c.x), zs = cages.map((c) => c.z), r = Math.max(...cages.map((c) => c.r)), m = r + 15;
    const x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, z0 = Math.min(...zs) - m, z1 = Math.max(...zs) + m, rr = 32;
    const segs = [], line = (a, b) => segs.push({ a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) }), arc = (cx, cz, a0) => segs.push({ cx, cz, a0, len: (Math.PI / 2) * rr });
    line([x0 + rr, z0], [x1 - rr, z0]); arc(x1 - rr, z0 + rr, -Math.PI / 2); line([x1, z0 + rr], [x1, z1 - rr]); arc(x1 - rr, z1 - rr, 0);
    line([x1 - rr, z1], [x0 + rr, z1]); arc(x0 + rr, z1 - rr, Math.PI / 2); line([x0, z1 - rr], [x0, z0 + rr]); arc(x0 + rr, z0 + rr, Math.PI);
    const total = segs.reduce((q, g) => q + g.len, 0);
    return (s) => { s = ((s % total) + total) % total; for (const g of segs) { if (s > g.len) { s -= g.len; continue; } const k = s / g.len; if (g.a) return [g.a[0] + (g.b[0] - g.a[0]) * k, g.a[1] + (g.b[1] - g.a[1]) * k]; const a = g.a0 + (Math.PI / 2) * k; return [g.cx + Math.cos(a) * rr, g.cz + Math.sin(a) * rr]; } return [x0, z0]; };
  })();
  const path = (t) => lane(t * 4.6 + 60);
  world.updaters.push((dt, t) => { const p = path(t), n = path(t + 0.5); boat.position.set(p[0], Math.sin(t * 1.1) * 0.09, p[1]); boat.rotation.set(Math.sin(t * 0.9) * 0.025, Math.atan2(-(n[1] - p[1]), n[0] - p[0]), Math.sin(t * 0.7) * 0.02); });
  low.add(boat);

  // LFC Hamour, the live fish carrier, alongside the jetty
  const { group: lfc, box: lfcBox } = makeLFC(mats);
  lfc.name = 'lfc-hamour'; lfc.position.set(LFC_BERTH.x, Y, LFC_BERTH.z); lfc.rotation.y = LFC_BERTH.ry;
  const lfcLow = new THREE.Group(); lfcLow.add(lfc);                                   // area 10 of its own
  // its trip out to the cages, from the berth: straight out past the landing stage, round to the east and up to the first row
  const trip = new THREE.CatmullRomCurve3([[LFC_BERTH.x, LFC_BERTH.z], [LFC_BERTH.x, LFC_BERTH.z + 36], [-139, 262], [-113, 276], [-82, 282], [-54, 284]].map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const wakeL = new THREE.Mesh(new THREE.PlaneGeometry(46, 13).rotateX(-Math.PI / 2).translate(-38, 0.07, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  wakeL.visible = false; lfc.add(wakeL);
  let sailK = 0, sailV = 0;
  /** put LFC Hamour k of the way along its trip (0 = at the berth); the wake follows its speed. It only ever goes forward, bow
   *  first: scrolled back, it stays where it is, and it is back at its berth once k is 0 again (the tour has left its step) */
  const sail = (k) => {
    k = Math.min(1, Math.max(0, k));
    if (k < sailK && k > 0.001) return;
    if (k > sailK) sailV = Math.max(sailV * 0.9, (k - sailK) * 60);
    sailK = k;
    const p = trip.getPointAt(k), d = trip.getTangentAt(k); lfc.position.set(p.x, Y, p.z); lfc.rotation.y = Math.atan2(-d.z, d.x);
  };
  world.updaters.push(() => { sailV *= 0.96; wakeL.material.opacity = Math.min(0.42, sailV * 0.5); wakeL.visible = wakeL.material.opacity > 0.01; });
  world.updaters.push((dt, t) => animateLFC(lfc, t));       // a gentle bob and roll, and the radar turning
  world.sea.setCages(cages);

  let cx = 0, cz = 0;
  for (const c of cages) { cx += c.x / cages.length; cz += c.z / cages.length; }
  const lfcWorldBox = () => {
    // the vessel's local box turned onto its berth (a quarter turn swaps x and z)
    const [x0, y0, z0, x1, y1, z1] = lfcBox, c = Math.cos(LFC_BERTH.ry), s = Math.sin(LFC_BERTH.ry), pts = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, z]) => [LFC_BERTH.x + x * c + z * s, LFC_BERTH.z - x * s + z * c]);
    return [Math.min(...pts.map((p) => p[0])), Y + y0, Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Y + y1, Math.max(...pts.map((p) => p[1]))];
  };
  areas.add({
    id: 'seacages', low, high: null, alwaysOpen: true, pin: [cx, 14, cz],
    hit: cages.map((c) => [c.x - c.r - 2, Y, c.z - c.r - 2, c.x + c.r + 2, Y + 4, c.z + c.r + 2]),
    // seen from over the Phase 1 roofs, looking out to sea
    pose: P(cx + 6, Y, cz - 34, -2.55, 1.02, 430), inside: P(cx + 4, Y, cz - 26, -2.65, 0.84, 330), plan: P(cx, Y, cz, 0, 0.14, 420),
    walk: P(cages[4].x, Y, cages[4].z, -2.4, 1.3, 64),
    makeInterior(_b, ctx) {
      cages.forEach((c, i) => {
        const [sp, name] = c.sp, w = 380 + Math.floor(R() * 620), n = 42000 + Math.floor(R() * 26000);
        ctx.school({ x: c.x, z: c.z, rx: c.r * 0.72, rz: c.r * 0.72, r0: 0.3, y0: Y - c.depth * 0.6, y1: Y - 0.8, n: 60, sp, len: 0.75 + w / 1500, speed: 0.08 });
        ctx.item({ code: c.code, group: 'Grow-out cages', name: `Sea cage ${c.code}`, kind: `${name}, open-sea grow-out`, box: [c.x - c.r - 1, Y - 1, c.z - c.r - 1, c.x + c.r + 1, Y + 2.2, c.z + c.r + 1], label: i === 1 || i === 3 || i === 8,
          desc: 'A floating collar of two polyethylene pipes holds a net that hangs nine metres down. Sea water passes straight through, so the fish live in the same water as their wild cousins. They arrive from the nursery hall on shore as fingerlings, start in a fine-mesh net and stay until they reach market size. A bird net drawn up over the top, from the handrail to the central pole, keeps the gulls off.',
          card: [['Cage', c.code], ['Species', name], ['Fish', n.toLocaleString('en-US')], ['Average weight', `${w} g`], ['Stocked from', `Nursery raceway N-0${(i % 6) + 1}, by LFC Hamour`]],
          specs: [[`${Math.round(c.r * 2)} m`, 'Diameter'], [`${c.depth} m`, 'Net depth'], ['Bird net', 'Top']],
          live: [{ k: 'Water temperature', u: '°C', v: 28.6, d: 0.15, lo: 18, hi: 35, p: 1 }, { k: 'Dissolved oxygen', u: 'mg/L', v: 6.1, d: 0.25, lo: 4, hi: 8, p: 1 }, { k: 'Current', u: 'cm/s', v: 11, d: 2, lo: 0, hi: 40, p: 0 }, { k: 'Feeding response', text: ['Strong', 'Strong', 'Good', 'Strong'][i % 4] }],
          species: ['hamour', 'hamra', 'shaari', 'seabream', 'shiqra'].includes(sp) ? sp : null, stage: 'seacages', swim: { sp, n: 150, net: c.r, depth: c.depth, grams: w }, cage: c });
      });
      // the five phases from egg to sea, round the middle cage, as the client's film draws them (cycle-ring.js)
      buildCycleRing(world, cages[4], Y, -2.65, ctx);
      ctx.item({ code: 'FB', group: 'Support', name: 'Feed barge', kind: 'Feed store and control', box: [fb[0] - 9, Y - 1, fb[1] - 9, fb[0] + 9, Y + 7.4, fb[1] + 9], label: true,
        desc: 'A moored barge carrying feed silos and the feeding controls. Pellets are blown to each cage through floating pipes, and cameras under the nets show when the fish stop eating so nothing is wasted.',
        specs: [['3', 'Silos'], ['Air blown', 'Feed delivery'], ['Camera', 'Controlled']], live: [{ k: 'Feed delivered today', u: 'kg', v: 1840, d: 12, lo: 0, hi: 4000, p: 0, rise: true }, { k: 'Silo level', u: '%', v: 64, d: 0.4, lo: 10, hi: 100, p: 0 }] });
      { const a = at(ju, J.f0);
        ctx.item({ code: 'JT', group: 'Support', name: 'Jetty, gangway and landing stage', kind: 'Access from the shore', box: [ju - half - 0.6, Y, a[1], ju + half + 0.6, 2, at(ju, J.way + 1.5)[1]], label: true,
          desc: 'A fixed concrete jetty rises from the shore walk and crosses the rock armour on steel piles. At its head a hinged gangway drops to a floating landing stage, so the walk down is gentle at every tide. The work boats tie up at the stage to run crews, nets and fingerlings out to the cages, and LFC Hamour moors along the west face of the jetty to load fry.',
          card: [['Jetty', `${J.f1 - J.f0} m, concrete deck on steel piles`], ['Gangway', 'Hinged, rolls on the pontoon'], ['Landing stage', `${Math.round(J.way + 1.3 - (J.foot - 2.2))} m, floating`], ['Berth', 'West face, four bollards and fenders']],
          specs: [['Fixed + floating', 'Structure'], ['Work boats', 'Landing stage'], ['1', 'Vessel berth']] }); }
      ctx.item({ code: 'WB', group: 'Support', name: 'Work boat', kind: 'Daily rounds', box: [bc[0] - 8, Y, bc[1] - 8, bc[0] + 8, Y + 3, bc[1] + 8], prio: -2,
        desc: 'Used for net changes, health checks, harvesting and carrying fingerlings out from the nursery. It circles the cages through the day.',
        specs: [['11 m', 'Length'], ['Crane', 'For nets']] });
      ctx.item({ code: 'CAM', group: 'Support', name: 'Underwater cameras', kind: 'Eyes below the surface', box: [cb[0] - 1.4, Y - 1, cb[1] - 1.4, cb[0] + 1.4, Y + 3.6, cb[1] + 1.4],
        desc: 'Cameras below the nets watch how the fish feed and behave. The pictures go to the feed barge and to the control room on shore.',
        specs: [['Live', 'Video'], ['24/7', 'Recording']] });
    },
  });
  areas.add({
    id: 'lfc', low: lfcLow, high: null, alwaysOpen: true, pin: [LFC_BERTH.x, 15, LFC_BERTH.z],
    hit: [lfcWorldBox()],
    pose: P(LFC_BERTH.x + 4, Y + 3, LFC_BERTH.z + 6, -0.62, 1.12, 105),
    inside: P(-110, Y, 252, -0.8, 1.0, 235),                                            // frames its trip out to the cages (the scroll tour)
    top: P(LFC_BERTH.x + 2, Y + 3, LFC_BERTH.z + 2, -0.62, 1.08, 62),                   // a click on 11: straight to the ship at its berth
    plan: P(LFC_BERTH.x, Y, LFC_BERTH.z, 0, 0.14, 160),
    walk: P(LFC_BERTH.x, Y + 5, LFC_BERTH.z, -0.62, 1.32, 46),
    makeInterior(_b, ctx) { ctx.item({ ...LFC_ITEM, box: lfcWorldBox(), label: true, prio: 1 }); },
  });
  return { cages, lfc, sail, kick: (v) => { sailV = Math.max(sailV, v); } };
}
