// Area 10: open-sea cages, the jetty and the boats.
import * as THREE from 'three';
import { Builder, C, rng, TAU, DEG, canvasTex } from './kit.js';
import { workBoat } from './props.js';
import { CAGES } from './layout.js';
import { SEA_Y } from './terrain-fn.js';
import { P } from './rig.js';

export function cageList() {
  const out = []; const { cx, cz, cols, rows, gap, r } = CAGES;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out.push({ x: cx + (i - (cols - 1) / 2) * gap, z: cz + (j - (rows - 1) / 2) * gap, r, n: j * cols + i + 1 });
  return out;
}

export function buildCages(world) {
  const { mats, areas, scene } = world;
  const cages = cageList(), Y = SEA_Y, b = new Builder(), R = rng(77);
  const SP = [['hamour', 'Hamour'], ['hamra', 'Hamra, red snapper'], ['shaari', 'Shaari'], ['seabream', 'Seabream'], ['hamour', 'Hamour'], ['shiqra', 'Shiqra, mangrove snapper'], ['hamra', 'Hamra, red snapper'], ['shaari', 'Shaari'], ['hamour', 'Hamour'], ['seabream', 'Seabream'], ['hamra', 'Hamra, red snapper'], ['hamour', 'Hamour']];

  // net texture: a fine diamond mesh, see-through
  const net = canvasTex(64, 64, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(20,40,50,.85)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, w); g.moveTo(w, 0); g.lineTo(0, w); g.stroke(); });
  const netMat = new THREE.MeshBasicMaterial({ map: net, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, depthWrite: true, color: 0x9fb3bd });
  const netGeo = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true);
  { const uv = netGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 90, uv.getY(i) * 12); }
  const nets = new THREE.InstancedMesh(netGeo, netMat, cages.length), m4 = new THREE.Matrix4();
  const floorG = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), floors = new THREE.InstancedMesh(floorG, new THREE.MeshBasicMaterial({ color: 0x0d3550 }), cages.length);

  cages.forEach((c, i) => {
    const r = c.r;
    m4.compose(new THREE.Vector3(c.x, Y - 3.4, c.z), new THREE.Quaternion(), new THREE.Vector3(r - 0.3, 9.2, r - 0.3)); nets.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(c.x, Y - 8, c.z), new THREE.Quaternion(), new THREE.Vector3(r - 0.3, 1, r - 0.3)); floors.setMatrixAt(i, m4);
    b.use('satin').torus(C.hdpe, r, 0.3, c.x, Y + 0.1, c.z, 8, 56); b.torus(C.hdpe, r + 1.05, 0.3, c.x, Y + 0.1, c.z, 8, 56);
    b.use('matte').ring(0x5f6b73, r + 0.95, r + 0.1, c.x, Y + 0.42, c.z, 56);                      // walkway between the two pipes
    b.use('satin').torus(C.yellow, r + 0.12, 0.05, c.x, Y + 1.45, c.z, 5, 56);
    for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU; b.cyl(C.hdpe, 0.05, 1.1, c.x + Math.cos(a) * (r + 0.12), Y + 0.35, c.z + Math.sin(a) * (r + 0.12), 5); }
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.78; b.use('satin').ball(k % 2 ? C.orange : C.yellow, 0.55, c.x + Math.cos(a) * (r + 4.2), Y + 0.15, c.z + Math.sin(a) * (r + 4.2), 10, 8); }
    if (i % 2 === 0) {                                                                                // bird net on a centre float
      b.use('satin').cyl(C.hdpe, 0.9, 0.35, c.x, Y, c.z, 12); b.cyl(C.yellow, 0.07, 4.2, c.x, Y + 0.3, c.z, 6);
      for (let k = 0; k < 18; k++) { const a = (k / 18) * TAU; b.rod(0x70818b, 0.022, [c.x, Y + 4.4, c.z], [c.x + Math.cos(a) * (r + 0.1), Y + 1.45, c.z + Math.sin(a) * (r + 0.1)], 4); }
    } else { b.use('satin').cyl(C.orange, 0.6, 0.5, c.x, Y, c.z, 12); b.cyl(C.steelDark, 0.12, 0.7, c.x, Y + 0.5, c.z, 8); }
  });
  nets.instanceMatrix.needsUpdate = true; floors.instanceMatrix.needsUpdate = true; nets.renderOrder = -12; floors.renderOrder = -13;

  // pontoons between the cages, and the jetty from the shore
  const { cx, cz, gap } = CAGES, zs = [cz - gap, cz, cz + gap], xs = cages.slice(0, 4).map((c) => c.x);
  b.use('matte');
  for (let j = 0; j < 2; j++) { const z = (zs[j] + zs[j + 1]) / 2; b.box(0x8a959c, xs[3] - xs[0] + 20, 0.5, 2.4, cx, Y - 0.12, z); for (let x = xs[0] - 8; x <= xs[3] + 8; x += 6) b.box(0x71808a, 0.18, 0.06, 2.4, x, Y + 0.39, z); }
  b.box(0x8a959c, 2.4, 0.5, gap * 2 + 26, cx, Y - 0.12, cz + 5);
  for (const c of cages) { const z = c.z < cz - 1 ? (zs[0] + zs[1]) / 2 : c.z > cz + 1 ? (zs[1] + zs[2]) / 2 : null; if (z !== null) b.box(0x8a959c, 1.6, 0.4, Math.abs(z - c.z) - c.r - 1, c.x, Y - 0.05, (z + c.z) / 2 + Math.sign(z - c.z) * (c.r + 1) / 2); else b.box(0x8a959c, 1.6, 0.4, 4.2, c.x, Y - 0.05, c.z + c.r + 3); }
  // jetty
  const jx = cx, j0 = -178, j1 = cz + gap + 18;
  b.use('matte').box(C.clayCool, 4.2, 0.5, j0 - j1, jx, 0.25, (j0 + j1) / 2);
  for (let z = j0 - 3; z > j1; z -= 7) for (const s of [-1.7, 1.7]) b.use('satin').cyl(C.steelDark, 0.22, 9.5, jx + s, -9, z, 8);
  for (const s of [-2, 2]) { b.use('satin').rod(C.alu, 0.04, [jx + s, 1.85, j0], [jx + s, 1.85, j1], 5); for (let z = j0; z >= j1; z -= 3.5) b.cyl(C.alu, 0.035, 1.1, jx + s, 0.75, z, 5); }
  b.use('matte').box(C.clayCool, 9, 0.5, 7, jx, 0.25, j1 - 3.5); b.box(0x8a959c, 2.2, 0.4, 5, jx, Y - 0.05, j1 - 9, 0, 0.42);
  // feed barge
  const fb = { x: xs[3] + 34, z: cz + 4 };
  b.use('satin').box(0x54626c, 14, 1.6, 8, fb.x, Y - 0.7, fb.z); b.use('matte').box(0x8a959c, 13.4, 0.1, 7.4, fb.x, Y + 0.9, fb.z);
  for (let k = 0; k < 3; k++) { b.use('satin').cyl(C.white, 1.5, 4.2, fb.x - 3.6 + k * 3.4, Y + 1, fb.z - 1.4, 16); b.cyl(C.white, 1.5, 1.0, fb.x - 3.6 + k * 3.4, Y + 5.2, fb.z - 1.4, 16, 0.3); }
  b.use('satin').box(C.clay, 4.4, 2.6, 3, fb.x + 3.6, Y + 1, fb.z + 2); b.use('window').box(null, 4.44, 0.8, 3.04, fb.x + 3.6, Y + 2.3, fb.z + 2);
  for (let k = 0; k < 4; k++) b.use('satin').pipe(C.hdpe, 0.1, [[fb.x - 6, Y + 1.3, fb.z + 1 + k * 0.5], [fb.x - 9, Y + 0.1, fb.z + 1 + k * 0.5], [xs[3] + 14, Y + 0.05, zs[k % 3]]], 6);
  // camera buoy
  b.use('satin').cyl(C.yellow, 0.7, 0.7, xs[1] + gap / 2, Y - 0.2, cz + gap / 2, 12); b.cyl(C.steelDark, 0.06, 2.6, xs[1] + gap / 2, Y + 0.5, cz + gap / 2, 6); b.use('glow').ball(C.red, 0.16, xs[1] + gap / 2, Y + 3.2, cz + gap / 2, 8, 6);

  const low = b.build(mats, { cast: true }); low.add(nets, floors);
  // the work boat does slow rounds of the pens
  const bb = new Builder(); workBoat(bb, 0, 0, 0, Y); const boat = bb.build(mats, { cast: true });
  const path = (t) => { const a = t * 0.045, rx = (xs[3] - xs[0]) / 2 + 30, rz = gap + 28; return [cx + Math.cos(a) * rx, cz + 2 + Math.sin(a) * rz, Math.atan2(-Math.sin(a) * rx, Math.cos(a) * rz)]; };
  world.updaters.push((dt, t) => { const [x, z, h] = path(t); boat.position.set(x, Math.sin(t * 1.1) * 0.08, z); boat.rotation.set(Math.sin(t * 0.9) * 0.02, -h + Math.PI / 2, 0); });
  low.add(boat);
  world.sea.setCages(cages);

  const hx0 = xs[0] - 16, hx1 = xs[3] + 16;
  areas.add({
    id: 'seacages', low, high: null, alwaysOpen: true, hit: [[hx0, Y, zs[0] - 16, hx1, Y + 5, zs[2] + 16]], pin: [cx, 11, cz],
    pose: P(cx + 4, Y, cz + 12, -0.5, 1.02, 210), inside: P(cx, Y, cz + 4, -0.35, 0.86, 124), plan: P(cx, Y, cz + 6, 0, 0.14, 170),
    makeInterior(_b, ctx) {
      cages.forEach((c, i) => {
        const [sp, name] = SP[i], w = 180 + Math.floor(R() * 520), n = 18000 + Math.floor(R() * 9000);
        ctx.school({ x: c.x, z: c.z, rx: c.r * 0.72, rz: c.r * 0.72, r0: 0.3, y0: Y - 4.6, y1: Y - 0.7, n: 46, sp, len: 0.5 + w / 1400, speed: 0.1 });
        ctx.item({ code: `SC-${String(c.n).padStart(2, '0')}`, group: 'Cages', name: `Sea cage SC-${String(c.n).padStart(2, '0')}`, kind: `${name}, open-sea grow-out`, box: [c.x - c.r - 1, Y - 1, c.z - c.r - 1, c.x + c.r + 1, Y + 2.2, c.z + c.r + 1], label: i === 1 || i === 6,
          desc: 'A floating collar of two polyethylene pipes holds a net that hangs eight metres down. Sea water passes straight through, so the fish live in the same water as their wild cousins. Fingerlings arrive from the nursery and stay until they reach market size.',
          card: [['Cage', `SC-${String(c.n).padStart(2, '0')}`], ['Species', name], ['Fish', n.toLocaleString('en-US')], ['Average weight', `${w} g`], ['Stocked from', `Nursery raceway N-0${(i % 5) + 1}`]],
          specs: [['25 m', 'Diameter'], ['8 m', 'Net depth'], [i % 2 === 0 ? 'Bird net' : 'Open top', 'Cover']],
          live: [{ k: 'Water temperature', u: '°C', v: 28.6, d: 0.15, lo: 18, hi: 35, p: 1 }, { k: 'Dissolved oxygen', u: 'mg/L', v: 6.1, d: 0.25, lo: 4, hi: 8, p: 1 }, { k: 'Current', u: 'cm/s', v: 11, d: 2, lo: 0, hi: 40, p: 0 }, { k: 'Feeding response', text: ['Strong', 'Strong', 'Good', 'Strong'][i % 4] }],
          species: ['hamour', 'hamra', 'shaari', 'seabream', 'shiqra'].includes(sp) ? sp : null, stage: 'seacages' });
      });
      ctx.item({ code: 'FB', group: 'Support', name: 'Feed barge', kind: 'Feed store and control', box: [fb.x - 7.5, Y - 1, fb.z - 4.5, fb.x + 7.5, Y + 7, fb.z + 4.5], label: true,
        desc: 'A moored barge carrying feed silos and the feeding controls. Pellets are blown to each cage through floating pipes, and cameras under the nets show when the fish stop eating so nothing is wasted.',
        specs: [['3', 'Silos'], ['Air blown', 'Feed delivery'], ['Camera', 'Controlled']], live: [{ k: 'Feed delivered today', u: 'kg', v: 1840, d: 12, lo: 0, hi: 4000, p: 0, rise: true }, { k: 'Silo level', u: '%', v: 64, d: 0.4, lo: 10, hi: 100, p: 0 }] });
      ctx.item({ code: 'JT', group: 'Support', name: 'Jetty and floating walkways', kind: 'Access from the shore', box: [jx - 2.4, Y, j1 - 12, jx + 2.4, 2, j0],
        desc: 'A fixed jetty leads from the quay to floating pontoons that run between the rows of cages. Staff can reach every pen on foot.',
        specs: [['Fixed + floating', 'Structure'], ['12', 'Cages reached']] });
      ctx.item({ code: 'WB', group: 'Support', name: 'Work boat', kind: 'Daily rounds', box: [hx1 + 2, Y, zs[1] - 3, hx1 + 14, Y + 3, zs[1] + 3], prio: -2,
        desc: 'Used for net changes, health checks, harvesting and carrying fingerlings out from the nursery. It circles the pens through the day.',
        specs: [['11 m', 'Length'], ['Crane', 'For nets']] });
      ctx.item({ code: 'CAM', group: 'Support', name: 'Underwater cameras', kind: 'Eyes below the surface', box: [xs[1] + gap / 2 - 1.2, Y - 1, cz + gap / 2 - 1.2, xs[1] + gap / 2 + 1.2, Y + 3.4, cz + gap / 2 + 1.2],
        desc: 'Cameras below the nets watch how the fish feed and behave. The pictures go to the feed barge and to the control room on shore.',
        specs: [['Live', 'Video'], ['24/7', 'Recording']] });
    },
  });
  return { cages };
}
