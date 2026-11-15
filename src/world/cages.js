// Area 10: the cages off the north-east beach. Eight covered nursery cages in two rows near the shore,
// twelve open grow-out cages further out, a floating walkway, the feed barge and the work boat.
import * as THREE from 'three';
import { Builder, C, rng, TAU, canvasTex } from './kit.js';
import { workBoat } from './props.js';
import { CAGES, coast, COAST } from './layout.js';
import { SEA_Y, terrainH } from './terrain-fn.js';
import { P } from './rig.js';

const SMALL_SP = [['hamour', 'Hamour'], ['hamra', 'Hamra, red snapper'], ['shiqra', 'Shiqra, mangrove snapper'], ['hamour', 'Hamour'], ['hamra', 'Hamra, red snapper'], ['shaari', 'Shaari'], ['hamour', 'Hamour'], ['shiqra', 'Shiqra, mangrove snapper']];
const BIG_SP = [['hamour', 'Hamour'], ['hamra', 'Hamra, red snapper'], ['shiqra', 'Shiqra, mangrove snapper'], ['seabream', 'Seabream'], ['hamour', 'Hamour'], ['shaari', 'Shaari'], ['hamra', 'Hamra, red snapper'], ['shiqra', 'Shiqra, mangrove snapper'], ['hamour', 'Hamour'], ['seabream', 'Seabream'], ['hamra', 'Hamra, red snapper'], ['hamour', 'Hamour']];

export function cageList() {
  const out = [];
  CAGES.small.list.forEach(([x, z], i) => out.push({ x, z, r: CAGES.small.r, n: i + 1, kind: 'nursery', code: `NC-${String(i + 1).padStart(2, '0')}`, sp: SMALL_SP[i], depth: 6 }));
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
  // bird nets: a shallow cone of fine mesh over each nursery cage
  const birdTex = canvasTex(64, 64, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(235,242,246,.9)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, w); g.moveTo(w, 0); g.lineTo(0, w); g.stroke(); });
  const coneGeo = new THREE.ConeGeometry(1, 1, 48, 1, true); { const uv = coneGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 70, uv.getY(i) * 10); }
  const small = cages.filter((c) => c.kind === 'nursery');
  const birds = new THREE.InstancedMesh(coneGeo, new THREE.MeshBasicMaterial({ map: birdTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: 0xe8eef2 }), small.length);

  cages.forEach((c, i) => {
    const r = c.r, d = c.depth;
    m4.compose(new THREE.Vector3(c.x, Y + 1.2 - (d + 1.2) / 2, c.z), q0, new THREE.Vector3(r - 0.3, d + 1.2, r - 0.3)); nets.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(c.x, Y - d, c.z), q0, new THREE.Vector3(r - 0.3, 1, r - 0.3)); floors.setMatrixAt(i, m4);
    b.use('satin').torus(C.hdpe, r, 0.32, c.x, Y + 0.1, c.z, 8, 64); b.torus(C.hdpe, r + 1.15, 0.32, c.x, Y + 0.1, c.z, 8, 64);
    b.use('matte').ring(0x5f6b73, r + 1.05, r + 0.1, c.x, Y + 0.44, c.z, 64);                      // walkway between the two pipes
    b.use('satin').torus(C.yellow, r + 0.12, 0.05, c.x, Y + 1.45, c.z, 5, 64);
    const posts = Math.round(r * 1.7); for (let k = 0; k < posts; k++) { const a = (k / posts) * TAU; b.cyl(C.hdpe, 0.05, 1.1, c.x + Math.cos(a) * (r + 0.12), Y + 0.35, c.z + Math.sin(a) * (r + 0.12), 5); }
    if (c.kind === 'nursery') {
      b.use('satin').cyl(C.hdpe, 0.9, 0.35, c.x, Y, c.z, 12); b.cyl(C.yellow, 0.08, 5.2, c.x, Y + 0.3, c.z, 6);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; b.rod(0xdfe6ea, 0.03, [c.x, Y + 5.4, c.z], [c.x + Math.cos(a) * (r + 0.1), Y + 1.45, c.z + Math.sin(a) * (r + 0.1)], 4); }
      m4.compose(new THREE.Vector3(c.x, Y + 1.45 + 1.975, c.z), q0, new THREE.Vector3(r + 0.1, 3.95, r + 0.1)); birds.setMatrixAt(small.indexOf(c), m4);
    } else {
      b.use('satin').cyl(C.orange, 0.7, 0.55, c.x, Y, c.z, 12); b.cyl(C.steelDark, 0.12, 0.8, c.x, Y + 0.55, c.z, 8);   // feed spreader
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.78; b.use('satin').ball(k % 2 ? C.orange : C.yellow, 0.7, c.x + Math.cos(a) * (r + 7), Y + 0.18, c.z + Math.sin(a) * (r + 7), 10, 8); }
    }
  });
  nets.instanceMatrix.needsUpdate = true; floors.instanceMatrix.needsUpdate = true; birds.instanceMatrix.needsUpdate = true; nets.renderOrder = -12; floors.renderOrder = -13; birds.renderOrder = 3;

  // floating walkway between the two rows of nursery cages, and the jetty that reaches it from the beach
  const way = (u0, f0, u1, f1, w = 2.6) => { const a = coast(u0, f0), c = coast(u1, f1); b.use('matte').wall(0x8a959c, a[0], a[1], c[0], c[1], w, Y - 0.14, Y + 0.38); const n = Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / 6); for (let k = 0; k <= n; k++) { const x = a[0] + ((c[0] - a[0]) * k) / n, z = a[1] + ((c[1] - a[1]) * k) / n; b.wall(0x71808a, x - COAST.nx * w * 0.5, z - COAST.nz * w * 0.5, x + COAST.nx * w * 0.5, z + COAST.nz * w * 0.5, 0.18, Y + 0.38, Y + 0.44); } return [a, c]; };
  way(118, 66, 242, 66);
  const ju = 112, j0 = coast(ju, -9), j1 = coast(ju, 40), j2 = coast(ju, 66);
  b.use('matte').wall(C.clayCool, j0[0], j0[1], j1[0], j1[1], 4.2, 0.2, 0.7);
  for (let f = -4; f < 40; f += 7) for (const s of [-1.7, 1.7]) { const p = coast(ju + s, f); b.use('satin').cyl(C.steelDark, 0.22, 0.4 - terrainH(p[0], p[1]) + 1.2, p[0], terrainH(p[0], p[1]) - 1.2, p[1], 8); }
  for (const s of [-2, 2]) { const a = coast(ju + s, -9), c = coast(ju + s, 40); b.use('satin').rod(C.alu, 0.04, [a[0], 1.8, a[1]], [c[0], 1.8, c[1]], 5); for (let f = -9; f <= 40; f += 3.5) { const p = coast(ju + s, f); b.cyl(C.alu, 0.035, 1.1, p[0], 0.7, p[1], 5); } }
  { const a = coast(ju, 40), c = coast(ju, 52); b.use('matte').wall(0x8a959c, a[0], a[1], c[0], c[1], 1.8, Y + 0.3, Y + 0.42); b.rod(0x8a959c, 0.06, [a[0], 0.7, a[1]], [c[0], Y + 0.45, c[1]], 4); }
  way(ju, 50, ju, 66, 2.6); way(112, 66, 119, 66);
  // feed barge moored between the two cage fields
  const fb = coast(262, 118), fry = -Math.atan2(COAST.dz, COAST.dx);
  b.push(fb[0], 0, fb[1], fry);
  b.use('satin').box(0x54626c, 16, 1.7, 9, 0, Y - 0.75, 0); b.use('matte').box(0x8a959c, 15.4, 0.1, 8.4, 0, Y + 0.95, 0);
  for (let k = 0; k < 3; k++) { b.use('satin').cyl(C.white, 1.7, 4.6, -4.2 + k * 3.8, Y + 1.05, -1.6, 18); b.cyl(C.white, 1.7, 1.1, -4.2 + k * 3.8, Y + 5.65, -1.6, 18, 0.3); }
  b.use('satin').box(C.clay, 4.8, 2.8, 3.2, 4.4, Y + 1.05, 2.2); b.use('window').box(null, 4.84, 0.9, 3.24, 4.4, Y + 2.4, 2.2); b.use('matte').box(C.orange, 5.2, 0.14, 3.6, 4.4, Y + 3.85, 2.2);
  for (const s of [-1, 1]) for (let x = -7.4; x <= 7.5; x += 2.47) b.use('satin').cyl(C.yellow, 0.035, 1.1, x, Y + 1.0, s * 4.1, 5);
  b.pop();
  for (let k = 0; k < 4; k++) { const c = cages[8 + k], t = coast(262 - 8, 118 + 4 + k); b.use('satin').pipe(C.hdpe, 0.11, [[t[0], Y + 1.3, t[1]], [(t[0] + c.x) / 2, Y + 0.06, (t[1] + c.z) / 2 - 6 + k * 3], [c.x + (k - 1.5) * 2, Y + 0.3, c.z + c.r]], 6); }
  // camera buoy between the grow-out rows
  const cb = coast(190.5, 208.5); b.use('satin').cyl(C.yellow, 0.8, 0.8, cb[0], Y - 0.2, cb[1], 12); b.cyl(C.steelDark, 0.07, 2.8, cb[0], Y + 0.6, cb[1], 6); b.use('glow').ball(C.red, 0.18, cb[0], Y + 3.5, cb[1], 8, 6);

  const low = b.build(mats, { cast: true }); low.add(nets, floors, birds);
  // the work boat does slow rounds of the grow-out cages; it faces the way it is going and leaves a wake
  const bb = new Builder(); workBoat(bb, 0, 0, 0, Y); const boat = bb.build(mats, { cast: true });
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(22, 5).rotateX(-Math.PI / 2).translate(-14, Y + 0.06, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false })); boat.add(wake);
  const bc = coast(190.5, 237), ang = Math.atan2(COAST.dz, COAST.dx), ca = Math.cos(ang), sa = Math.sin(ang);
  const path = (t) => { const a = t * 0.04, lx = Math.cos(a) * 128, lz = Math.sin(a) * 92; return [bc[0] + lx * ca - lz * sa, bc[1] + lx * sa + lz * ca]; };
  world.updaters.push((dt, t) => { const p = path(t), n = path(t + 0.5); boat.position.set(p[0], Math.sin(t * 1.1) * 0.09, p[1]); boat.rotation.set(Math.sin(t * 0.9) * 0.025, Math.atan2(-(n[1] - p[1]), n[0] - p[0]), Math.sin(t * 0.7) * 0.02); });
  low.add(boat);
  world.sea.setCages(cages);

  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, cx = 0, cz = 0;
  for (const c of cages) { x0 = Math.min(x0, c.x - c.r); x1 = Math.max(x1, c.x + c.r); z0 = Math.min(z0, c.z - c.r); z1 = Math.max(z1, c.z + c.r); cx += c.x / cages.length; cz += c.z / cages.length; }
  const sc = small.reduce((a, c) => [a[0] + c.x / small.length, a[1] + c.z / small.length], [0, 0]);
  areas.add({
    id: 'seacages', low, high: null, alwaysOpen: true, pin: [cx, 14, cz],
    hit: cages.map((c) => [c.x - c.r - 2, Y, c.z - c.r - 2, c.x + c.r + 2, Y + 4, c.z + c.r + 2]),
    pose: P(cx - 10, Y, cz + 30, -0.62, 1.04, 430), inside: P(cx - 6, Y, cz + 22, -0.5, 0.84, 330), plan: P(cx, Y, cz, ang - Math.PI / 2, 0.14, 420),
    walk: P(cages[12].x, Y, cages[12].z, -0.9, 1.3, 64),
    makeInterior(_b, ctx) {
      cages.forEach((c, i) => {
        const [sp, name] = c.sp, big = c.kind === 'growout', w = big ? 380 + Math.floor(R() * 620) : 12 + Math.floor(R() * 60), n = big ? 42000 + Math.floor(R() * 26000) : 60000 + Math.floor(R() * 50000);
        ctx.school({ x: c.x, z: c.z, rx: c.r * 0.72, rz: c.r * 0.72, r0: 0.3, y0: Y - c.depth * 0.6, y1: Y - 0.8, n: big ? 60 : 44, sp, len: big ? 0.75 + w / 1500 : 0.42, speed: big ? 0.08 : 0.13 });
        ctx.item({ code: c.code, group: big ? 'Grow-out cages' : 'Nursery cages', name: `${big ? 'Sea cage' : 'Nursery cage'} ${c.code}`, kind: `${name}, ${big ? 'open-sea grow-out' : 'first weeks at sea'}`, box: [c.x - c.r - 1, Y - 1, c.z - c.r - 1, c.x + c.r + 1, Y + (big ? 2.2 : 5.6), c.z + c.r + 1], label: i === 2 || i === 13 || i === 18,
          desc: big ? 'A floating collar of two polyethylene pipes holds a net that hangs nine metres down. Sea water passes straight through, so the fish live in the same water as their wild cousins. They arrive from the nursery cages and stay until they reach market size.'
            : 'Fingerlings from the hatchery spend their first weeks at sea here. The mesh is finer than in the grow-out cages and a net overhead keeps cormorants and gulls away. Once they are too big to slip through a wider mesh they move out to the large cages.',
          card: [['Cage', c.code], ['Species', name], ['Fish', n.toLocaleString('en-US')], ['Average weight', `${w} g`], ['Stocked from', big ? `Nursery cage NC-0${(i % 8) + 1}` : `Nursery raceway N-0${(i % 6) + 1}`]],
          specs: [[`${Math.round(c.r * 2)} m`, 'Diameter'], [`${c.depth} m`, 'Net depth'], [big ? 'Open top' : 'Bird net', 'Cover']],
          live: [{ k: 'Water temperature', u: '°C', v: 28.6, d: 0.15, lo: 18, hi: 35, p: 1 }, { k: 'Dissolved oxygen', u: 'mg/L', v: 6.1, d: 0.25, lo: 4, hi: 8, p: 1 }, { k: 'Current', u: 'cm/s', v: 11, d: 2, lo: 0, hi: 40, p: 0 }, { k: 'Feeding response', text: ['Strong', 'Strong', 'Good', 'Strong'][i % 4] }],
          species: ['hamour', 'hamra', 'shaari', 'seabream', 'shiqra'].includes(sp) ? sp : null, stage: 'seacages', swim: { sp, n: big ? 150 : 170, net: c.r, depth: c.depth, grams: w }, cage: c });
      });
      ctx.item({ code: 'FB', group: 'Support', name: 'Feed barge', kind: 'Feed store and control', box: [fb[0] - 9, Y - 1, fb[1] - 9, fb[0] + 9, Y + 7.4, fb[1] + 9], label: true,
        desc: 'A moored barge carrying feed silos and the feeding controls. Pellets are blown to each cage through floating pipes, and cameras under the nets show when the fish stop eating so nothing is wasted.',
        specs: [['3', 'Silos'], ['Air blown', 'Feed delivery'], ['Camera', 'Controlled']], live: [{ k: 'Feed delivered today', u: 'kg', v: 1840, d: 12, lo: 0, hi: 4000, p: 0, rise: true }, { k: 'Silo level', u: '%', v: 64, d: 0.4, lo: 10, hi: 100, p: 0 }] });
      ctx.item({ code: 'JT', group: 'Support', name: 'Jetty and floating walkway', kind: 'Access from the beach', box: [Math.min(j0[0], j2[0]) - 2.4, Y, Math.min(j0[1], j2[1]) - 2.4, Math.max(j0[0], j2[0]) + 2.4, 2, Math.max(j0[1], j2[1]) + 2.4],
        desc: 'A fixed jetty leads out from the beach to a floating walkway that runs between the two rows of nursery cages. Staff can reach every nursery cage on foot; the grow-out cages are served by boat.',
        specs: [['Fixed + floating', 'Structure'], ['8', 'Cages reached on foot']] });
      ctx.item({ code: 'WB', group: 'Support', name: 'Work boat', kind: 'Daily rounds', box: [bc[0] - 8, Y, bc[1] - 8, bc[0] + 8, Y + 3, bc[1] + 8], prio: -2,
        desc: 'Used for net changes, health checks, harvesting and carrying fingerlings out from the nursery. It circles the cages through the day.',
        specs: [['11 m', 'Length'], ['Crane', 'For nets']] });
      ctx.item({ code: 'CAM', group: 'Support', name: 'Underwater cameras', kind: 'Eyes below the surface', box: [cb[0] - 1.4, Y - 1, cb[1] - 1.4, cb[0] + 1.4, Y + 3.6, cb[1] + 1.4],
        desc: 'Cameras below the nets watch how the fish feed and behave. The pictures go to the feed barge and to the control room on shore.',
        specs: [['Live', 'Video'], ['24/7', 'Recording']] });
    },
  });
  return { cages };
}
