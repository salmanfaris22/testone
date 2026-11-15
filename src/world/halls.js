// Production side of the centre: areas 03 to 09.
import * as THREE from 'three';
import { Builder, C, shade, rng, TAU, DEG, canvasTex } from './kit.js';
import { hall, wallRun, aoSkirts, CUT } from './shell.js';
import * as E from './equip.js';
import { fishTruck, forklift } from './props.js';
import { wearFor } from './people.js';
import { HATCH, HATCH_FRAME, BROOD, BROOD_FRAME, INTAKE, PLANT, PLANT_FRAME, GEN, P1, PUMP, SMALL, FIRE, coast } from './layout.js';
import { SEA_Y, terrainH } from './terrain-fn.js';
import { P } from './rig.js';
import { BROODSTOCK_TANKS } from '../data/species.js';

const F = E.FLOOR;
const fmtDate = (daysAgo) => { const d = new Date(Date.now() - daysAgo * 864e5); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
const num = (n) => Math.round(n).toLocaleString('en-US');
/** standard water-quality sensors */
const wq = (t = 26.5, s = 39.2, o = 6.8, ph = 8.05) => [
  { k: 'Temperature', u: '°C', v: t, d: 0.25, lo: t - 2, hi: t + 2, p: 1 },
  { k: 'Salinity', u: 'ppt', v: s, d: 0.25, lo: 36, hi: 42, p: 1 },
  { k: 'Dissolved oxygen', u: 'mg/L', v: o, d: 0.3, lo: 5, hi: 9, p: 1 },
  { k: 'pH', u: '', v: ph, d: 0.04, lo: 7.7, hi: 8.4, p: 2 },
];
let AISLES = [];
const yellowLine = (b, x0, z0, x1, z1) => { b.use('matte').wall(0xf2cf4a, x0, z0, x1, z1, 0.14, F + 0.004, F + 0.012); AISLES.push([x0, z0, x1, z1]); };
/** staff at their posts (each turns to the nearest piece of kit and works on it), plus someone walking every marked aisle */
function staff(ctx, R, list) {
  for (const [x, z, k, y] of list) {
    let best = null, bd = 64; for (const it of ctx.items) { const q = it.box, cx = (q[0] + q[3]) / 2, cz = (q[2] + q[5]) / 2, d = (cx - x) ** 2 + (cz - z) ** 2; if (d < bd && d > 0.3) { bd = d; best = [cx, cz]; } }
    ctx.person(x, z, best ? Math.atan2(best[0] - x, best[1] - z) : R() * TAU, wearFor(k, R), y, { kind: k, mode: k === 'office' ? 'talk' : 'work' });
  }
  AISLES.forEach(([x0, z0, x1, z1], i) => {
    const len = Math.hypot(x1 - x0, z1 - z0); if (len < 12) return;
    const ux = (x1 - x0) / len, uz = (z1 - z0) / len, o = i % 2 ? 0.75 : -0.75, k = ['coat', 'overall', 'coat', 'hivis'][i % 4];
    ctx.person(x0, z0, 0, wearFor(k, R), undefined, { kind: k, path: [[x0 + ux * 1.5 - uz * o, z0 + uz * 1.5 + ux * o], [x1 - ux * 1.5 - uz * o, z1 - uz * 1.5 + ux * o]], speed: 1.12 + (i % 3) * 0.1 });
  });
  AISLES = [];
}
/** the camera stops of a hall, worked out from its footprint (all in the hall's own frame) */
function stops(rs, frame, { az = -0.55, walk, k = 1 } = {}) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const r of rs) { x0 = Math.min(x0, r.x0); x1 = Math.max(x1, r.x1); z0 = Math.min(z0, r.z0); z1 = Math.max(z1, r.z1); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, s = Math.max(x1 - x0, z1 - z0) * k, a = az - (frame ? frame.ry : 0);
  return { pose: P(cx, 2, cz, a, 0.96, s * 1.5 + 46), inside: P(cx, 1, cz, a * 0.6 - (frame ? frame.ry * 0.4 : 0), 0.7, s * 1.0 + 24), plan: P(cx, 0, cz, -(frame ? frame.ry : 0), 0.14, s * 1.28 + 22), walk, rooms: rs.map((r) => ({ ...r })), hit: rs.map((r) => [r.x0, 0, r.z0, r.x1, r.h, r.z1]) };
}
/** footprint in a frame → world rectangle (frames here only shift or turn a quarter) */
const worldRect = (f, r) => (!f || !f.ry ? { x0: (f ? f.x : 0) + r.x0, x1: (f ? f.x : 0) + r.x1, z0: (f ? f.z : 0) + r.z0, z1: (f ? f.z : 0) + r.z1 } : { x0: f.x + r.z0, x1: f.x + r.z1, z0: f.z - r.x1, z1: f.z - r.x0 });
const partition = (b, x0, z0, x1, z1, doors = [], hex = C.clay) => wallRun(b, null, x0, z0, x1, z1, { t: 0.2, hex, doors });
const SPN = { hamour: 'Hamour', hamra: 'Hamra, red snapper', shaari: 'Shaari' };

/** a big area number painted on the roof, readable from the overview */
function roofNo(group, roof, text, x, y, z, size = 15) {
  const tex = canvasTex(256, 160, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#0b2b3c'; g.font = '600 150px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 8); }, { repeat: false });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.3, depthWrite: false }); mat.userData.baseOpacity = 0.3;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * 1.6, size).rotateX(-Math.PI / 2), mat); m.position.set(x, y, z); m.updateMatrix(); m.matrixAutoUpdate = false; m.renderOrder = 2; m.userData.noShadow = true;
  roof['no' + text] = mat; group.add(m); roofNos.push(m); return group;   // (set m.userData.fry for a turned frame)
}
const roofNos = [];

export function buildHalls(world) {
  const { mats, areas } = world;
  const ao = [];

  /* ══════════ 03 · Weaning and Nursery ══════════ */
  {
    const r = { x0: HATCH.x0, x1: HATCH.nurseryX1, z0: HATCH.z0, z1: HATCH.z1, h: HATCH.h };
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet();
    hall(lo, hi, { ...r, seed: 3, doors: { s: [{ at: 74.4, w: 5 }, { at: 20.4, w: 1.4, h: 2.4 }], n: [{ at: 16.4, w: 1.4, h: 2.4 }, { at: 66.4, w: 4.5 }], e: [{ at: 30.5, w: 2.4, h: 2.6, shut: false }], w: [{ at: 38.5, w: 1.4, h: 2.4 }] }, windows: { s: { n: 10 }, n: { n: 10 }, w: { n: 6 } } });
    fishTruck(lo, 36, 31.5, Math.PI / 2); lo.use('concrete').quad(0xc4c2bb, 10, 6, 36, 0.05, 28);
    ao.push(worldRect(HATCH_FRAME, r));
    areas.add({ walls: lo.walls,
      id: 'nursery', frame: HATCH_FRAME, low: lo.build(mats), high: roofNo(hi.build(roof), roof, '03', 3.8, HATCH.h + 0.46, -2.25, 17), roofMats: roof, lift: 9, pin: [3.8, HATCH.h + 7, -2.25],
      ...stops([r], HATCH_FRAME, { az: -0.62, walk: P(27, 1.5, -1, 1.3, 1.44, 16) }),
      makeInterior(b, ctx) {
        const R = rng(31), sp = ['hamour', 'hamra', 'shaari', 'hamour', 'hamra', 'shaari'];
        for (let i = 0; i < 6; i++) {
          const zc = -21.6 + i * 6.3, x0 = -24, x1 = 20, age = 28 + i * 9 + Math.floor(R() * 5), count = 180000 + Math.floor(R() * 90000), w = +(0.4 + Math.max(0, age - 30) * 0.045).toFixed(2);
          const box = E.raceway(b, x0, zc - 2.3, x1, zc + 2.3);
          // feeder rails and posts
          b.use('satin'); for (const s of [-1.55, 1.55]) b.rod(C.steel, 0.05, [x0, 2.3, zc + s], [x1, 2.3, zc + s], 6);
          for (let x = x0; x <= x1 + 0.1; x += 11) for (const s of [-2.55, 2.55]) { b.cyl(C.steelDark, 0.05, 2.3, x, F, zc + s, 6); b.rod(C.steelDark, 0.04, [x, 2.3, zc - 2.55], [x, 2.3, zc + 2.55], 6); }
          ctx.item({ code: `N-0${i + 1}`, group: 'Raceways', name: `Nursery raceway N-0${i + 1}`, kind: `${SPN[sp[i]]} juveniles`, box, label: i === 1,
            desc: 'A long, shallow tank with a steady current from one end to the other. The flow carries waste to the outlet screen and gives the young fish something to swim against, which builds muscle before they go to sea.',
            card: [['Tank', `N-0${i + 1}`], ['Species', SPN[sp[i]]], ['Age', `${age} days post-hatch`], ['Stocked', fmtDate(age - 25)], ['Fish in tank', num(count)], ['Average weight', `${w} g`]],
            specs: [['44 m', 'Length'], ['95 m³', 'Volume'], [`${Math.round(age / 9)} meals`, 'A day']],
            live: [...wq(27, 39.3, 6.9), { k: 'Flow', u: 'm³/h', v: 46, d: 2, lo: 30, hi: 60, p: 0 }, { k: 'Feed given today', u: 'kg', v: 9 + i * 2.5, d: 0.4, lo: 0, hi: 30, p: 1, rise: true }], species: sp[i], stage: 'nursery' });
          ctx.specks({ x0: x0 + 1, z0: zc - 1.9, x1: x1 - 2, z1: zc + 1.9, y: F + 0.62, n: 900, size: 0.16 });
          // travelling feeder
          const fg = new Builder(); fg.use('satin').box(C.orange, 1.3, 0.7, 3.5, 0, 2.38, 0); fg.box(C.steelDark, 0.6, 0.5, 0.6, 0, 1.9, 0); fg.use('glow').box(C.green, 0.1, 0.1, 0.02, 0.4, 2.8, 1.76);
          const fm = fg.build(mats, { cast: false }); fm.position.set(0, 0, zc); ctx.extra.push(fm);
          const ph = R() * 60; ctx.updaters.push((dt, t) => { const u = ((t + ph) % 60) / 60, k = u < 0.5 ? u * 2 : 2 - u * 2; fm.position.x = x0 + 2 + (x1 - x0 - 4) * (k * k * (3 - 2 * k)); });
          ctx.item({ code: `F-0${i + 1}`, group: 'Feeders', name: `Rail feeder F-0${i + 1}`, kind: 'Automatic feeding', box: [x0, 1.9, zc - 1.8, x1, 3.1, zc + 1.8], prio: -1,
            desc: 'A hopper that rides along the raceway on rails and drops small meals as it goes. The ration is worked out from the weight of fish in the tank and the water temperature, so nothing is wasted.',
            specs: [['40 kg', 'Hopper'], ['2 g', 'Dose accuracy'], ['Rail', 'Mounted']],
            live: [{ k: 'Next meal in', u: 'min', v: 14 + i * 3, d: 5, lo: 0, hi: 45, p: 0 }, { k: 'Hopper level', u: '%', v: 72 - i * 8, d: 2, lo: 10, hi: 100, p: 0 }] });
        }
        for (let j = 0; j < 7; j++) {
          const x = -21 + j * 6.2, age = 25 + j;
          const box = E.roundTank(b, x, 18, 1.9, 1.25, { wall: C.grp, water: C.waterTank });
          ctx.item({ code: `W-0${j + 1}`, group: 'Weaning tanks', name: `Weaning tank W-0${j + 1}`, kind: 'Live feed to dry feed', box, label: j === 3,
            desc: 'The first stop after the larval hall. Over about ten days the share of dry feed goes up and live feed comes down, until the fish take pellets alone.',
            card: [['Tank', `W-0${j + 1}`], ['Species', SPN[sp[j % 3]]], ['Age', `${age} days post-hatch`], ['Dry feed share', `${Math.min(100, 20 + j * 13)} %`]],
            specs: [['12 m³', 'Volume'], ['10 days', 'Weaning time']], live: wq(27.2, 39.2, 7.0), species: sp[j % 3], stage: 'nursery' });
          ctx.specks({ x0: x - 1.3, z0: 16.7, x1: x + 1.3, z1: 19.3, y: F + 0.75, n: 160, size: 0.11, round: true });
        }
        // grading, counting, packing
        b.use('metal').box(C.alu, 3.4, 0.9, 1.3, 32, F, -12.5); b.use('satin').box(C.grpBlue, 1.6, 0.5, 1.1, 32, F + 0.9, -12.5);
        for (let k = 0; k < 3; k++) b.use('satin').box([C.white, C.grp, C.grpBlue][k], 1.0, 0.7, 1.0, 29.6 + k * 1.3, F, -10.4);
        ctx.item({ code: 'GR-1', group: 'Fry handling', name: 'Grading station', kind: 'Sorting by size', box: [29, 0, -13.6, 34.5, 1.7, -9.6], label: true,
          desc: 'Fish of the same age grow at different speeds. Sorting them into size classes stops the larger ones out-competing the smaller ones and gives customers an even batch.',
          specs: [['3', 'Size classes'], ['Weekly', 'Per raceway'], ['Wet', 'Fish never leave water']] });
        b.use('metal').box(C.alu, 2.2, 0.9, 1.0, 39, F, -12.5); b.use('satin').box(C.white, 0.9, 0.5, 0.7, 39, F + 0.9, -12.5); b.use('glow').box(C.screen, 0.5, 0.25, 0.02, 39, F + 1.15, -12.14);
        ctx.item({ code: 'FC-1', group: 'Fry handling', name: 'Fry counter', kind: 'Counting for dispatch', box: [37.8, 0, -13.2, 40.2, 1.7, -11.8],
          desc: 'An optical counter that tallies fry as they pass through a channel of water. It gives every delivery an exact number for the traceability record.',
          specs: [['Optical', 'Method'], ['Batch record', 'Logged to'], ['Every order', 'Used for']], live: [{ k: 'Counted today', u: 'fry', v: 148000, d: 900, lo: 0, hi: 400000, p: 0, rise: true }] });
        for (let k = 0; k < 4; k++) E.pallet(b, 30 + (k % 2) * 2.2, 3.5 + Math.floor(k / 2) * 2.6, { hex: C.white, n: 3 + (k % 2) });
        b.use('satin'); for (let k = 0; k < 6; k++) b.cyl(k < 4 ? 0x3f9b63 : C.steel, 0.12, 1.5, 39.5 + (k % 3) * 0.32, F, 4 + Math.floor(k / 3) * 0.4, 8);
        b.use('metal').box(C.alu, 3.0, 0.9, 1.1, 38.5, F, 8.2);
        ctx.item({ code: 'PK-1', group: 'Fry handling', name: 'Packing and oxygen', kind: 'Ready to travel', box: [29, 0, 2.2, 41.5, 1.8, 9], label: true,
          desc: 'Fry travel in sealed bags of sea water topped up with pure oxygen, packed in insulated boxes. Road deliveries go out in the tanker waiting at the door.',
          specs: [['Oxygen', 'Filled bags'], ['Insulated', 'Boxes'], ['UAE and GCC', 'Deliveries']] });
        E.panel(b, 45.2, -4, { ry: -Math.PI / 2, w: 2.2 });
        ctx.item({ code: 'WQ-N', group: 'Water', name: 'Water-quality station', kind: 'Nursery monitoring', box: [44.6, 0, -5.4, 45.8, 2.2, -2.6],
          desc: 'Shows the readings from every raceway and weaning tank in this hall. Anything outside its limits raises an alarm here and on the duty phone.',
          specs: [['12', 'Tanks watched'], ['1 min', 'Logging'], ['SMS', 'Alarms']], live: wq(27.1, 39.2, 6.9) });
        const df = [E.drumFilter(b, 30, 19, { ry: 0 }), E.drumFilter(b, 36, 19, { ry: 0 })];
        df.forEach((box, k) => ctx.item({ code: `DF-N${k + 1}`, group: 'Water', name: `Drum filter DF-N${k + 1}`, kind: 'Solids removal', box,
          desc: 'Water leaving the raceways passes through a rotating fine mesh. Uneaten feed and waste stay on the mesh and are rinsed away before the water goes back to the plant room.',
          specs: [['60 µm', 'Mesh'], ['Self-cleaning', 'Backwash']], live: [{ k: 'Flow', u: 'm³/h', v: 120, d: 4, lo: 60, hi: 180, p: 0 }] }));
        for (let k = 0; k < 3; k++) E.pump(b, 41 + k * 1.4, 20.5, { ry: Math.PI / 2 });
        E.pipeRack(b, [[-36, -27.2], [44, -27.2]], 4.2, [C.pipeSea, C.pipeTreat, C.pipeO2], 0.1);
        forklift(b, 24, 13, 0.6);
        // feed store and the biosecure way in, along the west wall
        const silo = [0, 1, 2].map((k) => E.vTank(b, -34.6, -22 + k * 4.4, { r: 1.25, h: 4.6, hex: 0xdfe5e8, y: F }));
        for (let k = 0; k < 3; k++) b.use('satin').pipe(C.steel, 0.07, [[-34.6, 0.5, -22 + k * 4.4], [-32.4, 0.5, -22 + k * 4.4], [-32.4, 2.3, -22 + k * 4.4]], 6);
        for (let k = 0; k < 8; k++) E.pallet(b, -35.4 + (k % 2) * 2.3, -7 + Math.floor(k / 2) * 2.5, { hex: [C.clayWarm, C.white, 0xd9c7a2][k % 3], n: 3 + (k % 3) });
        ctx.item({ code: 'FS-N', group: 'Feed', name: 'Feed store and silos', kind: 'Dry feed, six pellet sizes', box: [silo[0][0], 0, silo[0][2], -31.5, 5.6, 3.6], label: true,
          desc: 'Three silos hold the pellets used most, and bagged feed for the smaller sizes is stacked on pallets beside them. Pellet size steps up six times between weaning and dispatch, so the store is arranged by size, smallest by the door.',
          specs: [['3', 'Silos'], ['0.3 to 3 mm', 'Pellet sizes'], ['Cool, dry', 'Storage']], live: [{ k: 'Silo 1 level', u: '%', v: 71, d: 0.4, lo: 10, hi: 100, p: 0 }, { k: 'Silo 2 level', u: '%', v: 46, d: 0.4, lo: 10, hi: 100, p: 0 }, { k: 'Store temperature', u: '°C', v: 22.4, d: 0.3, lo: 18, hi: 26, p: 1 }] });
        b.use('satin').box(0x3d86ab, 2.4, 0.16, 1.6, -35.2, F, 10.4); b.use('water').quad(C.waterClear, 2.1, 1.3, -35.2, F + 0.14, 10.4); b.use('metal').box(C.alu, 1.8, 0.9, 0.6, -37.2, F, 14.2, Math.PI / 2); b.use('satin').box(C.white, 0.5, 0.3, 0.4, -37.3, F + 1.25, 13.6);
        E.shelving(b, -37.4, 18.6, { ry: Math.PI / 2, len: 4.2, hex: 0x9fb3c1 }); for (let k = 0; k < 5; k++) b.use('matte').box(0xf4f4f0, 0.3, 0.42, 0.26, -37.3, F + 0.06, 17 + k * 0.74);
        ctx.item({ code: 'BIO-N', group: 'Fry handling', name: 'Biosecure entry', kind: 'Boots, hands, gowns', box: [-38, 0, 9.2, -33.6, 2.3, 21], label: true,
          desc: 'Nobody walks straight into the hall. Staff step through a disinfectant foot bath, wash their hands and put on a clean gown, hairnet and white boots kept for this hall only. It is the cheapest disease control there is.',
          specs: [['Foot bath', 'Every entry'], ['Hall-only', 'Boots and gowns'], ['Logged', 'Visitors']] });
        yellowLine(b, 22.5, -26, 22.5, 13.2); yellowLine(b, -28.5, 13.2, 22.5, 13.2); yellowLine(b, 25.5, 0, 45, 0); yellowLine(b, -29.6, -26, -29.6, 22.4);
        staff(ctx, R, [[-10, -12.2, 'coat'], [12, 0.6, 'coat'], [31, -9, 'coat'], [39.5, 9.6, 'hivis'], [-2, 15, 'coat'], [34, 6.5, 'overall'], [-32.6, -14, 'overall'], [-34, 12.4, 'coat'], [4, -18.4, 'coat']]);
      },
    });
  }

  /* ══════════ 04 · Larval Rearing Hall ══════════ */
  {
    const r = { x0: HATCH.nurseryX1, x1: HATCH.larvalX1, z0: HATCH.z0, z1: HATCH.z1, h: HATCH.h }, ax = { x0: HATCH.annexX0, x1: HATCH.larvalX1, z0: HATCH.z1, z1: HATCH.annexZ1, h: HATCH.annexH };
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet();
    hall(lo, hi, { ...r, seed: 4, doors: { s: [{ at: 12, w: 1.4, h: 2.4 }, { at: 40, w: 1.6, h: 2.4, shut: false }], n: [{ at: 54, w: 4.5 }], w: [{ at: 30.5, w: 2.4, h: 2.6, shut: false }], e: [{ at: 30.5, w: 2.4, h: 2.6, shut: false }] }, windows: { n: { n: 8 } } });
    hall(lo, hi, { ...ax, seed: 14, floor: C.floor, skip: { n: true }, doors: { s: [{ at: 17.8, w: 1.6, h: 2.4 }], e: [{ at: 10, w: 1.4, h: 2.4, shut: false }] }, windows: { s: { n: 4, y: 2.3, h: 1.7, w: 4.4 }, w: { n: 2, y: 2.3, h: 1.7, w: 4.4 } }, strip: false });
    ao.push(worldRect(HATCH_FRAME, r), worldRect(HATCH_FRAME, ax));
    areas.add({ walls: lo.walls,
      id: 'hatchery', frame: HATCH_FRAME, low: lo.build(mats), high: roofNo(hi.build(roof), roof, '04', 77.9, HATCH.h + 0.46, -2.25, 17), roofMats: roof, lift: 9, pin: [77.9, HATCH.h + 7, -2.25],
      ...stops([r, ax], HATCH_FRAME, { az: -0.5, walk: P(71, 1.5, -3, -1.35, 1.44, 16) }),
      makeInterior(b, ctx) {
        const R = rng(41), rowSp = ['shaari', 'hamour', 'hamour', 'hamra', 'shaari'], stage = (d) => (d < 4 ? 'Green water and rotifers' : d < 14 ? 'Rotifers, enriched' : d < 22 ? 'Artemia' : 'Artemia and first dry feed');
        for (let rr = 0; rr < 5; rr++) for (let c = 0; c < 6; c++) {
          const x = 53 + c * 6.8, z = -21.2 + rr * 7.2, dph = 1 + c * 4 + rr, stocked = 600000 + Math.floor(R() * 12) * 5000, un = Math.round(stocked * (0.08 + R() * 0.1) / 1000) * 1000;
          const green = dph < 14;
          const box = E.coneTank(b, x, z, 1.75, { water: green ? C.waterGreen : C.waterTank });
          ctx.item({ code: `L${rr + 1}T${c + 1}`, group: 'Larval tanks', name: `Larval tank L${rr + 1}T${c + 1}`, kind: `${SPN[rowSp[rr]]}, day ${dph} post-hatch`, box, label: rr === 1 && c === 2,
            desc: 'A conical tank on its own recirculating loop. The cone keeps the water turning gently so the larvae stay suspended, and the central screen lets water out while keeping them in.',
            card: [['Tank no', `L${rr + 1}T${c + 1}`], ['Species', SPN[rowSp[rr]]], ['Stocking date', fmtDate(dph + 1)], ['Stocked eggs', num(stocked)], ['Unhatched eggs', num(un)], ['Hatched eggs', num(stocked - un)]],
            specs: [['8 m³', 'Volume'], [`${dph} days`, 'Post-hatch'], [`${Math.round(78 - dph * 1.1 - R() * 6)} %`, 'Survival, est.']],
            live: [...wq(26.2, 39.0, 6.7, 8.1), { k: 'Feed stage', text: stage(dph) }, { k: 'Light', text: green ? '16 h on, dimmed' : '14 h on' }], species: rowSp[rr], stage: 'hatchery' });
          ctx.specks({ x0: x - 1.2, z0: z - 1.2, x1: x + 1.2, z1: z + 1.2, y: F + 2.35, n: 70, size: 0.06, round: true });
        }
        for (let rr = 0; rr < 5; rr++) { const z = -21.2 + rr * 7.2 - 2.6; b.use('satin').pipe(C.pipeSea, 0.07, [[50, 3.0, z], [89, 3.0, z]], 8); b.pipe(C.pipeO2, 0.045, [[50, 3.0, z + 0.3], [89, 3.0, z + 0.3]], 6); for (let c = 0; c < 6; c++) b.pipe(C.pipeSea, 0.035, [[53 + c * 6.8, 3.0, z], [53 + c * 6.8, 3.0, z + 1.4], [53 + c * 6.8, 2.6, z + 1.4]], 5); }
        b.use('satin').pipe(C.pipeSea, 0.1, [[50, 3.0, -24.8], [50, 3.0, 5.2]], 8);
        // a dimmable light over every tank: larvae feed by sight, so day length is set tank by tank
        for (let rr = 0; rr < 5; rr++) for (let c = 0; c < 6; c++) { const x = 53 + c * 6.8, z = -21.2 + rr * 7.2; b.use('satin').cyl(0xe9ecee, 0.5, 0.1, x, 4.5, z, 14); b.use('glow').disc(0xfff3d2, 0.42, x, 4.49, z, 14); b.use('satin').cyl(0x9aa5ad, 0.015, 1.6, x, 4.6, z, 4); }
        // green-water header tanks on a frame
        for (const z of [-12.5, -9.4]) { b.use('satin'); for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) b.cyl(C.steelDark, 0.05, 1.5, 48.8 + dx, F, z + dz, 6); b.use('metal').box(0xaab4ba, 2.2, 0.06, 2.2, 48.8, F + 1.5, z); E.roundTank(b, 48.8, z, 0.95, 1.2, { wall: C.white, water: C.waterGreen, y: F + 1.56, standpipe: false, inlet: false }); }
        b.use('satin').pipe(C.pipeTreat, 0.04, [[48.8, F + 1.7, -11], [48.8, 2.7, -11], [89, 2.7, -11]], 6);
        ctx.item({ code: 'GW-1', group: 'Feed', name: 'Green-water dosing', kind: 'Microalgae for the tanks', box: [47.6, 0, -13.8, 50, 3, -8.2], label: true,
          desc: 'Live microalgae from the hall next door are pumped into the larval tanks. The green tint softens the light, feeds the rotifers already in the tank and keeps the water stable.',
          specs: [['3 to 4', 'Doses a day'], ['From hall 05', 'Supply']], live: [{ k: 'Cell density', u: 'M/mL', v: 0.42, d: 0.03, lo: 0.2, hi: 0.8, p: 2 }] });
        // recirculation module
        const ras = [];
        ras.push(['DF', 'Drum filter', E.drumFilter(b, 97.5, -14.5), 'Solids removal']); ras.push(['DF', 'Drum filter', E.drumFilter(b, 97.5, -9.5), 'Solids removal']);
        ras.push(['PS', 'Protein skimmer', E.skimmer(b, 104, -15), 'Fine waste and foam']); ras.push(['PS', 'Protein skimmer', E.skimmer(b, 106.2, -15), 'Fine waste and foam']);
        const bf = E.biofilter(b, 101, -1.6, 2.3, 2.4), uv = E.uvBank(b, 105.5, 6, { ry: Math.PI / 2 }), ox1 = E.oxygenCone(b, 95.5, 5.5), ox2 = E.oxygenCone(b, 97.6, 5.5);
        const cnt = {}; ras.forEach(([c, n, box, k]) => { cnt[c] = (cnt[c] || 0) + 1; ctx.item({ code: `${c}-L${cnt[c]}`, group: 'Recirculation', name: `${n} ${c}-L${cnt[c]}`, kind: k, box,
          desc: c === 'DF' ? 'A rotating mesh drum that strains particles out of the water coming back from the tanks. It rinses itself when the mesh starts to clog.' : 'Fine bubbles lift dissolved waste to the top as foam, which overflows into a cup. It also strips out excess carbon dioxide.',
          specs: c === 'DF' ? [['40 µm', 'Mesh'], ['Self-cleaning', 'Backwash']] : [['Fine bubble', 'Method'], ['3.2 m', 'Column']], live: [{ k: 'Flow', u: 'm³/h', v: c === 'DF' ? 85 : 30, d: 2, lo: 20, hi: 120, p: 0 }] }); });
        ctx.item({ code: 'BF-L1', group: 'Recirculation', name: 'Biofilter BF-L1', kind: 'Ammonia to nitrate', box: bf, label: true,
          desc: 'Millions of small plastic carriers tumble in this tank, each coated in bacteria that turn the ammonia from fish waste into harmless nitrate. It is the living heart of a recirculating system.',
          specs: [['Moving bed', 'Type'], ['95 %', 'Water reused']], live: [{ k: 'Ammonia', u: 'mg/L', v: 0.04, d: 0.01, lo: 0, hi: 0.2, p: 2 }, { k: 'Nitrite', u: 'mg/L', v: 0.08, d: 0.02, lo: 0, hi: 0.5, p: 2 }] });
        ctx.item({ code: 'UV-L1', group: 'Recirculation', name: 'UV steriliser UV-L1', kind: 'Pathogen control', box: uv,
          desc: 'Before water returns to the tanks it flows past high-output ultraviolet lamps. The light damages the DNA of bacteria, viruses and parasites so they cannot multiply.',
          specs: [['4', 'Reactors'], ['No chemicals', 'Treatment']], live: [{ k: 'UV dose', u: 'mJ/cm²', v: 118, d: 3, lo: 80, hi: 150, p: 0 }] });
        ctx.item({ code: 'OX-L', group: 'Recirculation', name: 'Oxygen cones', kind: 'Dissolving oxygen', box: [ox1[0], 0, ox1[2], ox2[3], ox1[4], ox1[5]],
          desc: 'Pure oxygen is mixed into the water under pressure inside these cones. Larvae need steady oxygen far more than adult fish do.',
          specs: [['2', 'Cones'], ['Pure O₂', 'Feed gas']], live: [{ k: 'Outlet oxygen', u: 'mg/L', v: 9.6, d: 0.3, lo: 7, hi: 12, p: 1 }] });
        for (let k = 0; k < 3; k++) E.pump(b, 95.2 + k * 1.5, 10, { ry: Math.PI / 2 });
        E.pipeRack(b, [[92.5, -18], [92.5, 11.5]], 3.4, [C.pipeSea, C.pipeTreat], 0.11);
        // incubation, microscopy and control rooms along the south side
        partition(b, 47, 13.6, 92, 13.6, [{ at: 9, w: 1.3 }, { at: 27, w: 1.3 }, { at: 38, w: 1.3 }]); partition(b, 68, 13.6, 68, 23.4); partition(b, 80, 13.6, 80, 23.4); partition(b, 92, 13.6, 92, 23.4, [{ at: 5, w: 1.3 }]);
        // the annex: hatchery office, feed enrichment kitchen and changing room
        partition(b, 92.6, 24.6, 92.6, 45.2, [{ at: 6, w: 1.3 }]); partition(b, 74.8, 35.4, 92.6, 35.4, [{ at: 12, w: 1.3 }]);
        E.deskPod(b, 79.5, 28.6); E.deskPod(b, 86.5, 28.6); E.wallScreen(b, 83.2, 34.9, { ry: Math.PI, w: 3.6 }); E.planter(b, 75.6, 25.6);
        E.meetingTable(b, 83, 40.6, { len: 4.6 }); E.wallScreen(b, 83, 45.0, { ry: Math.PI, w: 2.8 }); E.sofa(b, 76, 41, { ry: Math.PI / 2, len: 2.4 });
        ctx.item({ code: 'HO', group: 'Offices', name: 'Hatchery office', kind: 'Production planning', box: [74.8, 0, 24.6, 92.4, 2.4, 45.2], label: true,
          desc: 'The hatchery manager and technicians plan each spawning run here: which broodstock tank supplies the eggs, which larval tanks are free, and when the nursery can take the next batch. The wall screen mirrors the tank readings from the control room next door.',
          specs: [['8', 'Desks'], ['1', 'Meeting room'], ['3', 'Species a year']], live: [{ k: 'Batches in the hall', u: '', v: 5, d: 0, lo: 0, hi: 8, p: 0 }, { k: 'Next stocking', text: 'Tomorrow, 06:30' }] });
        E.labBench(b, 101, 44.6, { len: 7, ry: Math.PI, kit: 1 }); E.labBench(b, 100.6, 38.2, { len: 5, island: true, kit: 2 }); E.fridge(b, 108.6, 30, { ry: -Math.PI / 2, w: 1.2 }); E.fridge(b, 108.6, 31.6, { ry: -Math.PI / 2, w: 1.2, glass: true });
        for (let k = 0; k < 4; k++) E.cultureCone(b, 95.6 + k * 2.3, 27.4, [0xf0a55a, 0xe9d7a6][k % 2], { r: 0.55, h: 1.3 });
        ctx.item({ code: 'EK', group: 'Feed', name: 'Enrichment kitchen', kind: 'Boosting live feed before each meal', box: [93, 0, 24.6, 109.2, 2.4, 45.2], label: true,
          desc: 'Rotifers and Artemia are only as good as what they last ate. A few hours before every feed they are held here in small cones with an emulsion rich in the fatty acids marine larvae cannot make for themselves, then rinsed and carried to the tanks.',
          specs: [['DHA + EPA', 'Enrichment'], ['4', 'Cones'], ['6 feeds', 'A day']], live: [{ k: 'Next harvest in', u: 'min', v: 38, d: 6, lo: 0, hi: 120, p: 0 }, { k: 'Cone temperature', u: '°C', v: 26.8, d: 0.2, lo: 25, hi: 28, p: 1 }] });
        for (let k = 0; k < 8; k++) { const x = 50 + (k % 4) * 3.6, z = 16.4 + Math.floor(k / 4) * 3.6; E.cultureCone(b, x, z, 0xdff3f0, { r: 0.6, h: 1.4 }); }
        ctx.item({ code: 'INC', group: 'Eggs', name: 'Egg incubators', kind: 'Day 0', box: [49, 0, 15.4, 62, 2.4, 21.2], label: true,
          desc: 'Eggs from the broodstock building are counted, disinfected and held here in gently upwelling water. They hatch in about a day, and only strong batches go on to the larval tanks.',
          card: [['Batch', 'Hamour, spawned last night'], ['Eggs received', num(4.2e6)], ['Floating, viable', '88 %']], specs: [['8', 'Incubators'], ['≈ 24 h', 'To hatch']], live: wq(26.0, 39.0, 6.9, 8.1) });
        E.labBench(b, 74, 22.4, { len: 5, ry: Math.PI, kit: 0 }); E.labBench(b, 74, 17.2, { len: 4, island: true, kit: 3 }); E.fridge(b, 69, 16, { ry: Math.PI / 2 });
        ctx.item({ code: 'MIC', group: 'Eggs', name: 'Microscopy bench', kind: 'Daily larval checks', box: [70.5, 0, 15.8, 77.5, 2, 23],
          desc: 'Each morning a few larvae from every tank are checked under the microscope: gut full, swim bladder inflated, no deformities. What is seen here decides the day\'s feeding.',
          specs: [['Daily', 'Every tank'], ['Photo record', 'Kept']] });
        const cd = E.controlDesk(b, 86, 20.5, { ry: Math.PI }); E.panel(b, 91.3, 17, { ry: -Math.PI / 2 }); E.panel(b, 91.3, 19.4, { ry: -Math.PI / 2 });
        ctx.item({ code: 'RAS', group: 'Recirculation', name: 'RAS control room', kind: 'All 26 systems', box: [81, 0, 14.4, 91.8, 2.2, 23], label: true, prio: 1,
          desc: 'One console for the centre\'s 26 recirculating systems. Temperature, salinity, oxygen and day length are tracked for every tank, and any drift pages the duty team.',
          specs: [['26', 'Systems'], ['24/7', 'Monitoring'], ['SMS + app', 'Alarms']], live: [{ k: 'Systems online', u: 'of 26', v: 26, d: 0, lo: 0, hi: 26, p: 0 }, { k: 'Active alarms', u: '', v: 0, d: 0, lo: 0, hi: 5, p: 0 }, ...wq(26.2, 39.0, 6.7, 8.1).slice(0, 2)] });
        yellowLine(b, 91.6, -27, 91.6, 13); yellowLine(b, 47, 11.4, 91.6, 11.4); yellowLine(b, 49.2, -27, 91.6, -27.4);
        staff(ctx, R, [[56.5, -10.5, 'coat'], [70, 4, 'coat'], [84, -3, 'coat'], [73.5, 20.6, 'coat'], [86, 19, 'coat'], [99, 2.5, 'overall'], [55, 19.5, 'coat'], [63, -17.6, 'coat'], [80.4, 30, 'office'], [98, 42.8, 'coat'], [102, 36.6, 'coat']]);
      },
    });
  }

  /* ══════════ 05 · Live Feed and Algae ══════════ */
  {
    const r = { x0: HATCH.larvalX1, x1: HATCH.x1, z0: HATCH.z0, z1: HATCH.z1, h: HATCH.h }, ax = { x0: HATCH.larvalX1, x1: HATCH.x1, z0: HATCH.z1, z1: HATCH.annexZ1, h: HATCH.annexH };
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet();
    hall(lo, hi, { ...r, seed: 5, doors: { s: [{ at: 13, w: 1.6, h: 2.4, shut: false }], n: [{ at: 12, w: 3.6 }], w: [{ at: 30.5, w: 2.4, h: 2.6, shut: false }], e: [{ at: 38.5, w: 1.4, h: 2.4 }] }, windows: { n: { n: 3 }, e: { n: 6 } } });
    hall(lo, hi, { ...ax, seed: 15, floor: C.floorLab, skip: { n: true }, doors: { s: [{ at: 12, w: 2.4, h: 2.6 }], e: [{ at: 11, w: 1.4, h: 2.4 }], w: [{ at: 10, w: 1.4, h: 2.4, shut: false }] }, windows: { s: { n: 3, y: 2.3, h: 1.7, w: 4.4 }, e: { n: 2, y: 2.3, h: 1.7, w: 4.4 } }, strip: false });
    ao.push(worldRect(HATCH_FRAME, r), worldRect(HATCH_FRAME, ax));
    const ALGAE = [['Nannochloropsis', C.algae1, 'Green-water for the larval tanks'], ['Isochrysis', C.algae3, 'Rich in DHA, for enrichment'], ['Tetraselmis', C.algae4, 'Rotifer feed'], ['Chaetoceros', C.algae6, 'Diatom, for copepods'], ['Pavlova', C.algae2, 'Enrichment for Artemia'], ['Diatom culture', C.algae5, 'Copepod feed'], ['Stock cultures', C.algae7, 'Clean starter lines']];
    areas.add({ walls: lo.walls,
      id: 'livefeed', frame: HATCH_FRAME, low: lo.build(mats), high: roofNo(hi.build(roof), roof, '05', 121.9, HATCH.h + 0.46, -2.25, 12), roofMats: roof, lift: 9, pin: [121.9, HATCH.h + 7, -2.25],
      ...stops([r, ax], HATCH_FRAME, { az: -0.4, walk: P(122, 1.5, -10.55, -Math.PI / 2, 1.45, 11) }),
      makeInterior(b, ctx) {
        const R = rng(51);
        ALGAE.forEach(([name, hex, use], i) => {
          const z = -17 + i * 4.3;
          for (let j = 0; j < 12; j++) E.photobioreactor(b, 113.2 + j * 1.75, z, hex);
          b.use('glow').box(0xfff6dc, 20.6, 0.07, 0.16, 122.8, 3.25, z - 0.9); b.box(0xfff6dc, 20.6, 0.07, 0.16, 122.8, 3.25, z + 0.9);
          b.use('satin').pipe(C.pipeAir, 0.035, [[112.4, 0.3, z + 0.5], [133.6, 0.3, z + 0.5]], 6);
          ctx.item({ code: `A-${i + 1}`, group: 'Microalgae', name: `Photobioreactors, ${name}`, kind: use, box: [112.6, 0, z - 0.6, 133.2, 3.2, z + 0.6], label: i === 0 || i === 3,
            desc: `A row of twelve lit columns growing ${name === 'Stock cultures' ? 'the clean starter lines that seed every other row' : name}. Air and carbon dioxide bubble up from the base, and part of each column is harvested every day and replaced with fresh medium.`,
            specs: [['12', 'Columns'], ['24 h', 'LED light'], ['Daily', 'Harvest']],
            live: [{ k: 'Cell density', u: 'M/mL', v: 18 + i * 3.2, d: 0.6, lo: 8, hi: 45, p: 1 }, { k: 'Culture temperature', u: '°C', v: 23.6, d: 0.2, lo: 21, hi: 26, p: 1 }, { k: 'pH', u: '', v: 8.3, d: 0.06, lo: 7.8, hi: 8.8, p: 2 }] });
        });
        // starter culture lab at the south end of the algae room
        partition(b, 110.3, 13.4, 133.6, 13.4, [{ at: 12, w: 1.4 }]);
        E.labBench(b, 118, 22.6, { len: 6, ry: Math.PI, kit: 3 }); E.labBench(b, 127, 22.6, { len: 5, ry: Math.PI, kit: 0 });
        for (let k = 0; k < 2; k++) { E.shelving(b, 114 + k * 9, 16.2, { len: 4, hex: C.alu }); b.use('glow'); for (let q = 0; q < 6; q++) b.cyl([C.algae1, C.algae3, C.algae4, C.algae6][q % 4], 0.16, 0.42, 112.6 + k * 9 + q * 0.56, F + 1.44, 16.2, 8); }
        ctx.item({ code: 'SC', group: 'Microalgae', name: 'Starter culture lab', kind: 'Where each batch begins', box: [112, 0, 14.4, 134, 2.3, 23.2], label: true,
          desc: 'Every culture in the hall starts in a test tube here. Pure strains are stepped up from tubes to flasks to carboys under sterile conditions before they go to the columns.',
          specs: [['Sterile', 'Bench work'], ['7', 'Strains kept'], ['Weekly', 'Renewed']] });
        // rotifers in the north bay; Artemia, copepods and the quality bench in the annex
        for (let k = 0; k < 6; k++) {
          const x = 114.4 + (k % 3) * 6.4, z = -25.4 + Math.floor(k / 3) * 3.9, box = E.cultureCone(b, x, z, 0xe9d7a6, { r: 1.05, h: 2.0 });
          ctx.item({ code: `R-${k + 1}`, group: 'Zooplankton', name: `Rotifer cone R-${k + 1}`, kind: 'First food for larvae', box, label: k === 1,
            desc: 'Rotifers are tiny animals, a fifth of a millimetre long, and the first thing a newly hatched larva can catch. They are fed on microalgae here and enriched with fatty acids before each feed.',
            specs: [['1,500 L', 'Volume'], ['Brachionus', 'Species'], ['Twice daily', 'Harvest']], live: [{ k: 'Density', u: '/mL', v: 620 + k * 40, d: 25, lo: 200, hi: 1200, p: 0 }, { k: 'Temperature', u: '°C', v: 26.4, d: 0.2, lo: 24, hi: 28, p: 1 }] });
        }
        b.use('satin').pipe(C.pipeAir, 0.05, [[111.2, 2.9, -23.4], [132.6, 2.9, -23.4]], 6); for (let k = 0; k < 3; k++) b.pipe(C.pipeAir, 0.03, [[114.4 + k * 6.4, 2.9, -23.4], [114.4 + k * 6.4, 2.9, -25.4], [114.4 + k * 6.4, 2.2, -25.4]], 5);
        for (let k = 0; k < 4; k++) {
          const x = 114 + k * 4.9, box = E.cultureCone(b, x, 28.2, 0xf0a55a, { r: 0.8, h: 1.7 });
          ctx.item({ code: `AR-${k + 1}`, group: 'Zooplankton', name: `Artemia hatcher AR-${k + 1}`, kind: 'Second food for larvae', box, label: k === 0,
            desc: 'Dry Artemia cysts hatch into swimming nauplii within a day in warm, strongly aerated sea water. The orange colour is the nauplii themselves.',
            specs: [['600 L', 'Volume'], ['24 h', 'To hatch'], ['Enriched', 'Before feeding']], live: [{ k: 'Hatch rate', u: '%', v: 88, d: 1.5, lo: 70, hi: 96, p: 0 }, { k: 'Temperature', u: '°C', v: 28.2, d: 0.2, lo: 26, hi: 30, p: 1 }] });
        }
        for (let k = 0; k < 3; k++) {
          const x = 114.6 + k * 6.6, box = E.roundTank(b, x, 34.6, 1.35, 1.2, { wall: C.white, water: 0x9fc9a8, standpipe: false });
          ctx.item({ code: `C-${k + 1}`, group: 'Zooplankton', name: `Copepod tank C-${k + 1}`, kind: 'Closest to wild food', box, label: k === 1,
            desc: 'Copepods are what marine fish larvae eat in the sea. They are slower to culture than rotifers but give the best start to delicate species such as grouper.',
            specs: [['6 m³', 'Volume'], ['Diatoms', 'Fed on']], live: [{ k: 'Density', u: '/L', v: 1400 + k * 180, d: 60, lo: 500, hi: 3000, p: 0 }] });
        }
        E.labBench(b, 118.5, 44.5, { len: 8, ry: Math.PI, kit: 0 }); E.labBench(b, 127.5, 40.2, { len: 5, island: true, kit: 1 }); E.fridge(b, 133, 29.5, { ry: -Math.PI / 2 }); E.fridge(b, 133, 30.7, { ry: -Math.PI / 2, glass: true });
        ctx.item({ code: 'QC', group: 'Zooplankton', name: 'Live feed quality bench', kind: 'Counts and enrichment checks', box: [112, 0, 38.4, 131, 2.3, 45.2],
          desc: 'Before any live feed goes to the larval hall it is counted and checked here for density, size and bacterial load.',
          specs: [['Every batch', 'Checked'], ['Microscope', 'Counts']] });
        yellowLine(b, 111, -19.6, 133, -19.6); yellowLine(b, 111.3, -19, 111.3, 12.6);
        staff(ctx, R, [[121, -4.6, 'coat'], [130, 8.2, 'coat'], [117.6, -23.4, 'coat'], [124.4, 30.4, 'coat'], [120, 42.8, 'coat'], [122, 18.8, 'coat'], [118, 36.9, 'coat']]);
      },
    });
  }

  /* ══════════ 06 · Broodstock Building and sea water intake ══════════ */
  {
    const r = BROOD, q = INTAKE;
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet();
    hall(lo, hi, { ...r, seed: 6, doors: { s: [{ at: 34.4, w: 5 }, { at: 58.4, w: 1.4, h: 2.4 }], w: [{ at: 22, w: 1.4, h: 2.4 }], n: [{ at: 37.5, w: 2.4, h: 2.8, shut: false }] }, windows: { s: { n: 8 }, w: { n: 8 }, n: { n: 6 } } });
    hall(lo, hi, { ...q, seed: 16, wall: C.clayCool, skip: { s: true }, doors: { e: [{ at: 6.5, w: 3 }] }, windows: { w: { n: 1, y: 3.4, h: 1.2, w: 4 } }, strip: false, roofKit: false });
    // the pump station by the shore road, and the twin mains that run from it to the intake room
    const ps = { x0: PUMP.x0 - BROOD_FRAME.x, x1: PUMP.x1 - BROOD_FRAME.x, z0: PUMP.z0 - BROOD_FRAME.z, z1: PUMP.z1 - BROOD_FRAME.z, h: PUMP.h };
    hall(lo, hi, { ...ps, seed: 26, wall: C.clayCool, doors: { s: [{ at: 9, w: 3.6 }], e: [{ at: 6, w: 1.4, h: 2.4 }] }, windows: { e: { n: 2 }, w: { n: 2 } }, strip: false, fit: false });
    for (const dz of [0, 1.3]) lo.use('satin').pipe(C.pipeSea, 0.42, [[ps.x1, 0.9, ps.z0 + 6 + dz], [ps.x1 + 6 + dz, 0.9, ps.z0 + 6 + dz], [q.x0 - 6 - dz, 0.9, q.z0 + 5 + dz], [q.x0, 0.9, q.z0 + 5 + dz]], 10);
    for (let k = 0; k < 5; k++) { const t = (k + 0.5) / 5, x = ps.x1 + 6 + (q.x0 - 6 - ps.x1 - 6) * t, z = ps.z0 + 6 + (q.z0 + 5 - ps.z0 - 6) * t; lo.use('matte').box(0xc4c2bb, 1.1, 0.5, 3.2, x, 0.04, z + 0.65, 0.5); }
    ao.push(worldRect(BROOD_FRAME, r), worldRect(BROOD_FRAME, q), worldRect(BROOD_FRAME, ps));
    const TANKS = [...BROODSTOCK_TANKS, { sp: 'hamour', name: 'Hamour, first hatchery-born generation', sci: 'Epinephelus coioides' }, { sp: 'hamra', name: 'Hamra, red snapper', sci: 'Lutjanus malabaricus' }, { sp: 'shaari', name: 'Shaari, second line', sci: 'Lethrinus nebulosus' }, { sp: 'seabream', name: 'Seabream, second line', sci: 'Sparidentex hasta' }];
    areas.add({ walls: lo.walls,
      id: 'broodstock', frame: BROOD_FRAME, low: lo.build(mats), high: roofNo(hi.build(roof), roof, '06', 26.3, BROOD.h + 0.46, -77.3, 18), roofMats: roof, lift: 9, pin: [26.3, BROOD.h + 7, -77.3],
      ...stops([r, q, ps], BROOD_FRAME, { az: -0.55, k: 0.82, walk: P(18, 3.3, -90, Math.PI / 2, 1.43, 13) }),
      makeInterior(b, ctx) {
        const R = rng(61);
        TANKS.forEach((s, i) => {
          const x = 1.5 + (i % 4) * 16.5, z = [-101, -79, -57][Math.floor(i / 4)], rad = 6.4, n = 26 + Math.floor(R() * 14), spawn = ['Spring', 'Winter', 'Spring', 'Summer', 'Winter', 'Summer', 'To be confirmed', 'Spring', 'Spring', 'Summer', 'Spring', 'Winter'][i];
          const box = E.roundTank(b, x, z, rad, 1.7, { wall: C.grpDark, water: C.waterDeep, pipe: C.pipeSea, level: 0.88 });
          b.use('glow').torus(0xfff0cf, 4.2, 0.07, x, 4.3, z, 6, 40);
          const s2 = i < 4 ? -1 : 1; b.use('satin'); for (const a of [0.6, 2.1, 3.7, 5.2]) b.rod(C.steelDark, 0.02, [x + Math.cos(a) * 4.2, 4.3, z + Math.sin(a) * 4.2], [x + Math.cos(a) * 4.2, 7.2, z + Math.sin(a) * 4.2], 4);
          // egg collector at the overflow
          const ecx = x + (rad + 0.75) * 0.7071, ecz = z - s2 * (rad + 0.75) * 0.7071;
          b.use('satin').box(C.white, 1.3, 1.0, 1.0, ecx, F, ecz, 0.785); b.use('metal').box(C.alu, 1.1, 0.04, 0.8, ecx, F + 1.0, ecz, 0.785);
          ctx.school({ x, z, rx: rad * 0.74, rz: rad * 0.74, r0: 0.32, y0: F + 0.75, y1: F + 1.38, n: 15, sp: s.sp, len: s.sp === 'cobia' ? 1.05 : s.sp === 'mullet' ? 0.5 : 0.72, speed: 0.11 });
          const no = String(i + 1).padStart(2, '0');
          ctx.item({ code: `B-${no}`, group: 'Breeding tanks', name: `Broodstock tank B-${no}`, kind: s.sci ? `${s.name}, ${s.sci}` : s.name, box, label: i === 0 || i === 5,
            desc: 'A deep round tank holding one breeding group. Day length and water temperature are shifted through the year to match the season each species spawns in. Eggs float, so they leave with the overflow and are caught in the collector beside the tank.',
            card: [['Tank', `B-${no}`], ['Species', s.name], ['Breeders', String(n)], ['Sex ratio', i % 2 ? '1 male to 2 females' : '1 male to 3 females'], ['Spawning season', spawn], ['Diet', 'Fresh fish, squid, vitamin mix']],
            specs: [['12.8 m', 'Diameter'], ['200 m³', 'Volume'], [String(n), 'Fish']],
            live: [...wq(i === 1 || i === 4 ? 23.5 : 26.8, 39.4, 6.6), { k: 'Day length', u: 'h', v: i === 1 || i === 4 ? 11 : 13.5, d: 0, lo: 9, hi: 15, p: 1 }, { k: 'Eggs collected today', u: '', v: i === 6 ? 0 : 0.6e6 + R() * 2.4e6, d: 0, lo: 0, hi: 4e6, p: 0, big: true }], species: ['hamour', 'seabream', 'shaari', 'shiqra', 'hamra'].includes(s.sp) ? s.sp : null, stage: 'broodstock', swim: { sp: s.sp, n: 24, tank: rad }, photo: i === 0 ? 'broodstock' : undefined });
        });
        const cw = E.catwalk(b, -6, -90, 58, -90, { y: 1.9, w: 1.5 }); E.steps(b, -7.2, -90, { ry: Math.PI / 2 });
        for (let i = 0; i < 4; i++) { const x = 1.5 + i * 16.5; E.catwalk(b, x, -90.7, x, -94.2, { y: 1.9, w: 1.2, legsEvery: 99 }); E.catwalk(b, x, -89.3, x, -85.8, { y: 1.9, w: 1.2, legsEvery: 99 }); }
        E.catwalk(b, -6, -68, 58, -68, { y: 1.9, w: 1.5 }); E.steps(b, -7.2, -68, { ry: Math.PI / 2 });
        for (let i = 0; i < 4; i++) { const x = 1.5 + i * 16.5; E.catwalk(b, x, -67.3, x, -63.8, { y: 1.9, w: 1.2, legsEvery: 99 }); }
        // shade cloth over each tank: breeders spawn better in dim, even light
        for (let i = 0; i < 12; i++) { const x = 1.5 + (i % 4) * 16.5, z = [-101, -79, -57][Math.floor(i / 4)]; b.use('satin').torus(0x56636c, 6.9, 0.05, x, 7.2, z, 5, 40); b.use('glow').torus(0x7fb2ff, 5.2, 0.05, x, 7.15, z, 5, 40); }
        ctx.item({ code: 'CW', group: 'Access', name: 'Service walkway', kind: 'Safe access to every tank', box: [cw[0], 1.7, cw[2], cw[3], 3, cw[5]], prio: -1,
          desc: 'A raised walkway of non-slip grating runs down the middle of the hall with a spur to each tank. Staff feed, observe and net fish from here without leaning over the water.',
          specs: [['2 × 64 m', 'Length'], ['GRP grating', 'Deck'], ['12', 'Tank spurs']] });
        ctx.item({ code: 'EC', group: 'Eggs', name: 'Egg collectors', kind: 'Spawn harvested each morning', box: [5.7, 0, -96.8, 7.4, 1.4, -95.1], label: true, prio: 1,
          desc: 'A fine mesh box on each tank\'s overflow. Fertilised eggs float, so they drift out with the surface water overnight and are waiting here at dawn to be counted, disinfected and carried to the incubators.',
          specs: [['12', 'Collectors'], ['500 µm', 'Mesh'], ['To hall 04', 'Next stop']], live: [{ k: 'Collected today, all tanks', u: '', v: 9.4e6, d: 0, lo: 0, hi: 2e7, p: 0, big: true }] });
        b.use('satin').pipe(C.pipeSea, 0.24, [[29.2, 3.2, -113], [29.2, 3.2, -110.4], [-7, 3.2, -110.4]], 10); b.pipe(C.pipeSea, 0.24, [[29.2, 3.2, -110.4], [59, 3.2, -110.4]], 10);
        for (let i = 0; i < 4; i++) { const x = 1.5 + i * 16.5 + 6.9; b.pipe(C.pipeSea, 0.12, [[x, 3.2, -110.4], [x, 3.2, -47.4], [x, F, -47.4]], 8); }
        ctx.item({ code: 'SW', group: 'Water', name: 'Sea water supply main', kind: 'From the intake room', box: [-7, 2.8, -111, 59, 3.7, -109.8], prio: -1,
          desc: 'Filtered and sterilised Gulf water arrives through this main and drops to each tank. Used water is not wasted: it is treated and returned.',
          specs: [['DN 500', 'Main'], ['UV + ozone', 'Treated by'], ['90 %', 'Reused']], live: [{ k: 'Flow', u: 'm³/h', v: 410, d: 8, lo: 200, hi: 600, p: 0 }] });
        // health-check and feed kitchen
        b.use('metal').box(C.alu, 3.2, 0.9, 1.2, 58.2, F, -98); b.use('satin').box(C.grpBlue, 1.6, 0.6, 0.9, 58.2, F, -95.4); b.use('water').quad(C.waterClear, 1.4, 0.7, 58.2, F + 0.5, -95.4);
        ctx.item({ code: 'HC', group: 'Access', name: 'Health-check station', kind: 'Handling the breeders', box: [56.4, 0, -99, 60, 1.6, -94.6], label: true,
          desc: 'Breeders are lightly sedated in the small bath, then weighed, measured and checked for maturity on the padded table. Each fish carries a microchip so its history follows it.',
          specs: [['Microchip', 'Identity'], ['Monthly', 'Checks'], ['Sedated', 'Low stress']] });
        E.fridge(b, 59.6, -71, { ry: -Math.PI / 2, w: 1.4 }); E.fridge(b, 59.6, -72.7, { ry: -Math.PI / 2, w: 1.4 }); b.use('metal').box(C.alu, 2.6, 0.9, 1.0, 55.5, F, -70.2);
        ctx.item({ code: 'FK', group: 'Access', name: 'Feed kitchen', kind: 'Fresh diet for the breeders', box: [53.8, 0, -73.8, 60.4, 2.1, -69.4],
          desc: 'Egg quality starts with what the parents eat. Fresh fish and squid are portioned here with a vitamin and fatty-acid mix for each species.',
          specs: [['Daily', 'Prepared'], ['−20 °C', 'Cold store']] });
        // sea water intake room: pumps and UV indoors, sand filters and the ozone column in the yard beside it
        for (let k = 0; k < 3; k++) { const x = 26 + k * 3.1; E.pump(b, x, -121.6, { ry: Math.PI / 2, s: 1.45 }); b.use('satin').pipe(C.pipeSea, 0.26, [[x, 0.9, -122.8], [x, 0.9, -124.4]], 10); b.pipe(C.pipeSea, 0.2, [[x, 0.9, -120.4], [x, 2.6, -120.4], [x, 2.6, -117.6]], 8); }
        b.use('satin').pipe(C.pipeSea, 0.24, [[25.4, 2.6, -117.6], [32.8, 2.6, -117.6]], 10);
        ctx.item({ code: 'IP', group: 'Sea water intake', name: 'Intake pumps', kind: 'Drawing in Gulf water', box: [24.9, 0, -123.4, 33.3, 2.9, -119.6], label: true,
          desc: 'Sea water arrives from the pump station by the shore through twin mains. These pumps lift it through the filters and on to the tanks. Two run and one stands by, so a pump can be serviced without the fish noticing.',
          specs: [['3', 'Pumps'], ['2 + 1', 'Duty and standby'], ['Twin', 'Mains from the shore']], live: [{ k: 'Pumps running', u: 'of 3', v: 2, d: 0, lo: 0, hi: 3, p: 0 }, { k: 'Intake flow', u: 'm³/h', v: 640, d: 10, lo: 300, hi: 900, p: 0 }, { k: 'Sea temperature', u: '°C', v: 28.4, d: 0.2, lo: 18, hi: 35, p: 1 }] });
        const uvI = E.uvBank(b, 29.2, -115.2, { n: 3 }); E.panel(b, 34.1, -117, { ry: -Math.PI / 2 });
        b.use('satin').box(C.clayCool, 1.5, 2.0, 1.1, 39.4, 0.06, -121.4); b.cyl(C.white, 0.55, 3.6, 41.6, 0.06, -118.2, 14); b.use('glow').box(0x9fd8ff, 0.5, 0.3, 0.02, 39.4, 1.4, -120.83); b.use('satin').pipe(C.pipeTreat, 0.09, [[40.2, 1.2, -121.4], [41.6, 1.2, -121.4], [41.6, 1.2, -118.8]], 6);
        ctx.item({ code: 'UVO', group: 'Sea water intake', name: 'UV and ozone treatment', kind: 'Nothing unwanted gets in', box: [uvI[0], 0, uvI[2], 42.3, 3.8, -114], label: true,
          desc: 'After the sand filters the water is dosed with ozone in the contact column outside, then passes ultraviolet lamps. Together they stop wild pathogens from ever reaching the broodstock.',
          specs: [['UV + O₃', 'Two barriers'], ['Biosecure', 'Entry point']], live: [{ k: 'UV dose', u: 'mJ/cm²', v: 124, d: 3, lo: 80, hi: 160, p: 0 }, { k: 'Redox', u: 'mV', v: 318, d: 6, lo: 250, hi: 380, p: 0 }] });
        const sf = [0, 1, 2].map((k) => E.sandFilter(b, 10.5 + k * 4.4, -116.4, 1.5, 2.6, { y: 0.06 }));
        b.use('satin').pipe(C.pipeSea, 0.2, [[23.5, 0.9, -119], [21.6, 0.9, -119], [21.6, 0.9, -116.4]], 8); b.use('concrete').quad(0xc4c2bb, 15, 5.4, 15, 0.05, -116.4);
        ctx.item({ code: 'SF-I', group: 'Sea water intake', name: 'Intake sand filters', kind: 'First cleaning step', box: [sf[0][0], 0, sf[0][2], sf[2][3], sf[0][4], sf[0][5]],
          desc: 'Raw sea water is pushed down through beds of graded sand that trap silt, plankton and larvae of other animals. The beds are washed in reverse when the pressure rises.',
          specs: [['3', 'Vessels'], ['20 µm', 'Removes down to'], ['Auto', 'Backwash']], live: [{ k: 'Pressure drop', u: 'bar', v: 0.42, d: 0.03, lo: 0.1, hi: 1, p: 2 }] });
        ctx.item({ code: 'PS', group: 'Sea water intake', name: 'Sea water pump station', kind: 'Beside the shore road', box: [ps.x0, 0, ps.z0, ps.x1, ps.h, ps.z1], label: true, out: true, solid: true,
          desc: 'The first building the sea water meets. Screened intakes sit offshore beyond the beach; the water is drawn under the road into a wet well here and pushed on to the intake room through two buried mains, one for each half of the centre.',
          specs: [['2', 'Mains'], ['Screened', 'Offshore intake'], ['Wet well', 'Type']], live: [{ k: 'Wet well level', u: 'm', v: 2.6, d: 0.08, lo: 1.2, hi: 3.4, p: 2 }, { k: 'Flow to site', u: 'm³/h', v: 1180, d: 14, lo: 600, hi: 1600, p: 0 }, { k: 'Tide', text: 'Rising' }] });
        yellowLine(b, -7.2, -45.2, 60, -45.2); yellowLine(b, -7.4, -108, -7.4, -47);
        staff(ctx, R, [[10, -90, 'coat', 1.9], [38, -90, 'coat', 1.9], [57, -96.6, 'coat'], [56, -71.4, 'coat'], [28, -119, 'overall'], [51.5, -90, 'overall', 1.9], [18, -68, 'coat', 1.9], [44, -68, 'coat', 1.9], [12, -113.6, 'overall']]);
      },
    });
  }

  /* ══════════ 07 · Plant Room ══════════ */
  {
    const r = PLANT;
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet();
    hall(lo, hi, { ...r, seed: 7, wall: C.clayCool, doors: { s: [{ at: 13.7, w: 4.5 }, { at: 35.7, w: 1.4, h: 2.4 }], w: [{ at: 19.9, w: 1.4, h: 2.4 }] }, windows: { s: { n: 4 }, e: { n: 4 }, w: { n: 4 } } });
    // outdoors: chillers and the liquid oxygen store
    const ch = [E.chiller(lo, 128.5, -103, { ry: Math.PI / 2, y: 0.06 }), E.chiller(lo, 128.5, -97.5, { ry: Math.PI / 2, y: 0.06 })];
    const lox = E.vTank(lo, 79.5, -100, { r: 1.5, h: 7 }); lo.use('satin'); for (let k = 0; k < 5; k++) lo.box(C.alu, 0.12, 2.4, 1.6, 78.2 + k * 0.55, 0.06, -94.6); lo.pipe(C.pipeO2, 0.06, [[79.5, 0.5, -98.4], [79.5, 0.5, -95], [79.5, 2.8, -95], [84.2, 2.8, -95]], 6);
    lo.use('matte'); for (const [x, z] of [[76.6, -103], [82.6, -103], [76.6, -93], [82.6, -93]]) lo.cyl(C.yellow, 0.07, 1.1, x, 0.05, z, 6);
    ao.push(worldRect(PLANT_FRAME, r));
    const high7 = roofNo(hi.build(roof), roof, '07', 104.15, PLANT.h + 0.46, -99.9, 11); roofNos[roofNos.length - 1].userData.fry = PLANT_FRAME.ry;
    areas.add({ walls: lo.walls,
      id: 'plantroom', frame: PLANT_FRAME, low: lo.build(mats), high: high7, roofMats: roof, lift: 8, pin: [104.15, PLANT.h + 7, -99.9],
      ...stops([r], PLANT_FRAME, { az: -0.45, walk: P(101, 1.5, -107.2, -Math.PI / 2, 1.42, 11) }),
      makeInterior(b, ctx) {
        const R = rng(71);
        // the north bay: ozone, degassing and heat exchange
        b.use('satin').box(0xdfe5e8, 3.0, 1.9, 1.5, 91, F, -112.6); b.use('glow').box(0x9fd8ff, 0.6, 0.34, 0.02, 90.2, F + 1.3, -111.84); b.use('satin').cyl(C.white, 0.6, 4.2, 94.6, F, -112.6, 16); b.pipe(C.pipeTreat, 0.08, [[92.5, 1.2, -112.6], [94.6, 1.2, -112.6]], 6);
        ctx.item({ code: 'OZ', group: 'Disinfection', name: 'Ozone generator', kind: 'Clears colour and kills germs', box: [89.4, 0, -113.5, 95.3, 4.4, -111.7], label: true,
          desc: 'Ozone is made on the spot from oxygen and bubbled through a contact column. It breaks down the yellow tint that builds up in recirculated water and knocks back bacteria, then turns back into oxygen before the water reaches any fish.',
          specs: [['From O₂', 'Made on site'], ['Contact column', 'Dosing'], ['Redox', 'Controlled by']], live: [{ k: 'Redox', u: 'mV', v: 322, d: 5, lo: 250, hi: 380, p: 0 }, { k: 'Output', u: 'g/h', v: 84, d: 2, lo: 20, hi: 150, p: 0 }] });
        b.use('satin').cyl(0xcfd8dc, 1.15, 5.2, 101.6, F, -112.3, 20); b.cyl(C.steelDark, 1.25, 0.14, 101.6, F + 5.2, -112.3, 20); b.cyl(C.steel, 0.3, 0.8, 101.6, F + 5.3, -112.3, 10); b.pipe(C.pipeTreat, 0.14, [[101.6, 0.6, -111.1], [101.6, 0.6, -109.4], [104.5, 0.6, -109.4]], 8);
        ctx.item({ code: 'DG', group: 'Disinfection', name: 'Degassing tower', kind: 'Carbon dioxide out, oxygen in', box: [100.4, 0, -113.5, 102.8, 6.3, -111.1],
          desc: 'Fish breathe out carbon dioxide just as we do. Water trickles down through packing inside this tower while a fan blows air up through it, which strips the carbon dioxide out and tops up the oxygen.',
          specs: [['Packed column', 'Type'], ['Fan driven', 'Air'], ['5 m', 'Height']], live: [{ k: 'CO₂ after tower', u: 'mg/L', v: 4.1, d: 0.3, lo: 2, hi: 10, p: 1 }] });
        for (let k = 0; k < 3; k++) { b.use('metal').box(0xaab4ba, 0.7, 1.7, 1.9, 108.4 + k * 2.3, F + 0.25, -112.4); b.use('satin').box(0x2f6f9c, 0.16, 1.9, 2.1, 108 + k * 2.3, F + 0.15, -112.4); b.box(0x2f6f9c, 0.16, 1.9, 2.1, 108.8 + k * 2.3, F + 0.15, -112.4); b.pipe(C.pipeHot, 0.07, [[108.4 + k * 2.3, 1.7, -111.3], [108.4 + k * 2.3, 3.1, -111.3]], 6); b.pipe(C.pipeSea, 0.07, [[108.4 + k * 2.3, 0.6, -111.3], [108.4 + k * 2.3, 0.6, -110.2]], 6); }
        b.use('satin').pipe(C.pipeHot, 0.09, [[107.6, 3.1, -111.3], [123, 3.1, -111.3]], 6);
        ctx.item({ code: 'HX', group: 'Circulation', name: 'Plate heat exchangers', kind: 'Heat moved, water kept apart', box: [107.6, 0, -113.5, 114, 2.3, -111.2],
          desc: 'Stacks of thin titanium plates pass heat between the heat-pump loop and the tank water without the two ever mixing. Titanium is used because warm sea water eats ordinary steel.',
          specs: [['3', 'Units'], ['Titanium', 'Plates'], ['No mixing', 'Two loops']], live: [{ k: 'Water in', u: '°C', v: 27.9, d: 0.2, lo: 20, hi: 34, p: 1 }, { k: 'Water out', u: '°C', v: 26.4, d: 0.15, lo: 20, hi: 30, p: 1 }] });
        yellowLine(b, 86, -108.4, 116, -108.4);
        for (let k = 0; k < 4; k++) { const box = E.sandFilter(b, 88.6 + k * 4.2, -104.3, 1.3, 2.5); ctx.item({ code: `SF-${k + 1}`, group: 'Filtration', name: `Sand filter SF-${k + 1}`, kind: 'Particle removal', box, label: k === 0,
          desc: 'A pressure vessel packed with graded sand. Water is forced down through the bed and comes out clear. When the bed loads up, the flow reverses to wash it clean.',
          specs: [['2.6 m', 'Diameter'], ['20 µm', 'Removes down to'], ['Auto', 'Backwash']], live: [{ k: 'Flow', u: 'm³/h', v: 150 + k * 6, d: 4, lo: 80, hi: 220, p: 0 }, { k: 'Pressure drop', u: 'bar', v: 0.3 + k * 0.08, d: 0.02, lo: 0.1, hi: 1, p: 2 }] }); }
        for (let k = 0; k < 2; k++) { const box = E.biofilter(b, 90.5 + k * 7.4, -92.2, 3.1, 2.7); ctx.item({ code: `BF-${k + 1}`, group: 'Filtration', name: `Biofilter BF-${k + 1}`, kind: 'Ammonia to nitrate', box, label: k === 0,
          desc: 'A moving-bed reactor. Air keeps thousands of small carriers tumbling, and the bacteria living on them convert ammonia from fish waste into nitrate, which fish tolerate well.',
          specs: [['Moving bed', 'Type'], ['80 m³', 'Volume'], ['Aerated', 'Always']], live: [{ k: 'Ammonia out', u: 'mg/L', v: 0.03, d: 0.01, lo: 0, hi: 0.2, p: 2 }, { k: 'Nitrite out', u: 'mg/L', v: 0.06, d: 0.02, lo: 0, hi: 0.5, p: 2 }, { k: 'Air flow', u: 'm³/h', v: 220, d: 5, lo: 120, hi: 300, p: 0 }] }); }
        [E.drumFilter(b, 104.6, -90, { ry: Math.PI / 2 }), E.drumFilter(b, 104.6, -95.2, { ry: Math.PI / 2 })].forEach((box, k) => ctx.item({ code: `DF-${k + 1}`, group: 'Filtration', name: `Drum filter DF-${k + 1}`, kind: 'Solids removal', box,
          desc: 'The first step for water coming back from the halls: a rotating mesh drum that strains out uneaten feed and waste before they can break down.',
          specs: [['40 µm', 'Mesh'], ['Self-cleaning', 'Backwash']], live: [{ k: 'Flow', u: 'm³/h', v: 300, d: 8, lo: 150, hi: 420, p: 0 }] }));
        [E.uvBank(b, 106.5, -104.4, { n: 4 }), E.uvBank(b, 111.5, -104.4, { n: 4 })].forEach((box, k) => ctx.item({ code: `UV-${k + 1}`, group: 'Disinfection', name: `UV steriliser UV-${k + 1}`, kind: 'Pathogen control', box, label: k === 0,
          desc: 'Banks of ultraviolet lamps disinfect the recirculating water before it returns to the tanks. No chemicals are added and nothing is left in the water.',
          specs: [['4', 'Reactors'], ['99.9 %', 'Kill rate'], ['No chemicals', 'Treatment']], live: [{ k: 'UV dose', u: 'mJ/cm²', v: 120 + k * 4, d: 3, lo: 80, hi: 160, p: 0 }, { k: 'Lamp hours', u: 'h', v: 3120 + k * 800, d: 0, lo: 0, hi: 9000, p: 0 }] }));
        const ps = [E.skimmer(b, 110.4, -89.6), E.skimmer(b, 112.6, -89.6)];
        ctx.item({ code: 'PS', group: 'Disinfection', name: 'Protein skimmers', kind: 'Fine waste and gas exchange', box: [ps[0][0], 0, ps[0][2], ps[1][3], ps[0][4], ps[0][5]],
          desc: 'Tall columns where fine bubbles carry dissolved waste to the top as foam. They also drive off carbon dioxide and add oxygen.',
          specs: [['2', 'Columns'], ['Fine bubble', 'Method']], live: [{ k: 'Flow', u: 'm³/h', v: 90, d: 3, lo: 40, hi: 140, p: 0 }] });
        for (let k = 0; k < 4; k++) E.pump(b, 109 + k * 2, -98, { ry: 0, s: 1.25 });
        ctx.item({ code: 'PMP', group: 'Circulation', name: 'Main pump skid', kind: 'Moving the water', box: [108, 0, -98.8, 116.6, 1.5, -97.2], label: true,
          desc: 'Four variable-speed pumps send treated water back to the halls. Speed follows demand, which saves energy at night when the fish are quiet.',
          specs: [['4', 'Pumps'], ['Variable speed', 'Drive'], ['3 + 1', 'Duty and standby']], live: [{ k: 'Pumps running', u: 'of 4', v: 3, d: 0, lo: 0, hi: 4, p: 0 }, { k: 'Total flow', u: 'm³/h', v: 590, d: 9, lo: 300, hi: 800, p: 0 }, { k: 'Power draw', u: 'kW', v: 46, d: 1.2, lo: 20, hi: 75, p: 0 }] });
        const bl = [E.blower(b, 87, -99.4), E.blower(b, 87, -96.6)];
        ctx.item({ code: 'BL', group: 'Circulation', name: 'Air blowers', kind: 'Aeration', box: [bl[0][0], 0, bl[0][2], bl[1][3], bl[0][4], bl[1][5]],
          desc: 'Low-pressure blowers supply the air that keeps the biofilters turning and the tanks aerated. One runs, one is ready.',
          specs: [['2', 'Blowers'], ['1 + 1', 'Duty and standby']], live: [{ k: 'Air pressure', u: 'mbar', v: 310, d: 4, lo: 200, hi: 400, p: 0 }] });
        // control room
        partition(b, 116.6, -93.6, 123.6, -93.6, [{ at: 1.6, w: 1.2 }]); partition(b, 116.6, -93.6, 116.6, -84.4);
        const cd = E.controlDesk(b, 120.2, -86.6, { ry: Math.PI }); E.switchgear(b, 122.9, -90.4, { ry: -Math.PI / 2, n: 5 });
        ctx.item({ code: 'SCADA', group: 'Control', name: 'Life-support control room', kind: 'Pumps, filters, oxygen, temperature', box: [117, 0, -93, 123.6, 2.3, -84.6], label: true, prio: 1,
          desc: 'The operator sees every pump, filter, valve and sensor on one screen and can run the whole water system from here. If anything drifts, it alarms on site and on the duty phone.',
          specs: [['24/7', 'Staffed or on call'], ['1 s', 'Data refresh'], ['Remote', 'Access']], live: [{ k: 'Signals monitored', u: '', v: 1840, d: 0, lo: 0, hi: 2000, p: 0 }, { k: 'Active alarms', u: '', v: 0, d: 0, lo: 0, hi: 5, p: 0 }, { k: 'Water reused', u: '%', v: 93.5, d: 0.3, lo: 85, hi: 98, p: 1 }] });
        ctx.item({ code: 'CH', group: 'Circulation', name: 'Heat pumps', kind: 'Holding the temperature', box: [ch[0][0], 0, ch[0][2], ch[1][3], ch[0][4], ch[1][5]],
          desc: 'The Gulf swings from 18 °C in winter to 35 °C in summer. These units heat or cool the recirculating water so each hall stays at the temperature its fish need.',
          specs: [['2', 'Units'], ['Heat and cool', 'Reversible']], live: [{ k: 'Supply temperature', u: '°C', v: 26.4, d: 0.15, lo: 20, hi: 30, p: 1 }] });
        ctx.item({ code: 'LOX', group: 'Circulation', name: 'Liquid oxygen store', kind: 'Oxygen for every tank', box: lox, label: true,
          desc: 'Oxygen is delivered as a liquid and stored cold in this vessel. It warms to gas in the finned vaporiser and is piped to the oxygen cones in each hall.',
          specs: [['Cryogenic', 'Vessel'], ['Bulk', 'Delivery'], ['Yellow', 'Pipe colour']], live: [{ k: 'Tank level', u: '%', v: 68, d: 0.2, lo: 15, hi: 100, p: 0 }, { k: 'Line pressure', u: 'bar', v: 4.2, d: 0.05, lo: 3, hi: 6, p: 1 }] });
        E.pipeRack(b, [[85.5, -100.5], [115.8, -100.5]], 3.6, [C.pipeSea, C.pipeTreat, C.pipeO2], 0.13); E.pipeRack(b, [[100.5, -107], [100.5, -85]], 3.2, [C.pipeTreat, C.pipeAir], 0.1);
        staff(ctx, R, [[96, -99, 'overall'], [119.6, -88.2, 'coat'], [107, -100.6, 'hivis']]);
      },
    });
  }

  /* ══════════ 08 · Generator Room ══════════ */
  {
    const r = GEN, kiosk = SMALL[2];
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet();
    hall(lo, hi, { ...r, seed: 8, wall: C.clayCool, doors: { s: [{ at: 5, w: 4 }, { at: 13.6, w: 1.4, h: 2.4 }], e: [{ at: 13.4, w: 1.4, h: 2.4 }] }, windows: {}, roofKit: false });
    hall(lo, hi, { ...kiosk, seed: 18, wall: C.clayCool, doors: { s: [{ at: 4.5, w: 2.4, h: 2.6 }] }, windows: {}, roofKit: false, strip: false, fit: false });
    for (let k = 0; k < 3; k++) { hi.use('metal').cyl(C.alu, 0.28, 3.2, 126.6, GEN.h, 5 + k * 5.1, 10); hi.use('matte').cyl(C.steelDark, 0.36, 0.2, 126.6, GEN.h + 3.2, 5 + k * 5.1, 10); lo.use('matte').box(C.steelDark, 0.08, 2.2, 3.2, GEN.x0 - 0.03, 2.4, 5 + k * 5.1); }
    // transformer yard, fuel store and, out by the east roundabout, the fire-water tanks
    const tx = E.transformer(lo, 143, 20, {}); lo.use('concrete').quad(0xc4c2bb, 9, 6.8, 143, 0.05, 20);
    for (const [x0, z0, x1, z1] of [[138.6, 16.7, 147.4, 16.7], [147.4, 16.7, 147.4, 23.3], [147.4, 23.3, 138.6, 23.3], [138.6, 23.3, 138.6, 16.7]]) { lo.use('satin').rod(C.steel, 0.03, [x0, 1.6, z0], [x1, 1.6, z1], 4); lo.rod(C.steel, 0.03, [x0, 0.8, z0], [x1, 0.8, z1], 4); const n = 5; for (let k = 0; k <= n; k++) lo.cyl(C.steel, 0.04, 1.7, x0 + ((x1 - x0) * k) / n, 0.05, z0 + ((z1 - z0) * k) / n, 4); }
    const fuel = E.hTank(lo, 113.5, 14.4, { len: 6, r: 1.1, hex: 0xd9dde0 }); lo.use('matte').box(C.clayCool, 9.5, 0.35, 4.4, 113.5, 0.04, 14.4); lo.use('satin').pipe(C.steel, 0.05, [[116.8, 0.5, 14.4], [119.9, 0.5, 14.4]], 6);
    lo.use('concrete').box(0xc9c7c0, FIRE.w, 0.3, FIRE.d, FIRE.x, 0.02, FIRE.z);
    for (const dx of [-6, 6]) { lo.use('satin').cyl(0xf1f3f3, FIRE.r, FIRE.h, FIRE.x + dx, 0.3, FIRE.z - 1.5, 30); lo.cyl(0xe1e6e8, FIRE.r + 0.14, 0.26, FIRE.x + dx, 0.3 + FIRE.h, FIRE.z - 1.5, 30); for (let k = 0; k < 3; k++) lo.torus(0xd4dadd, FIRE.r + 0.03, 0.05, FIRE.x + dx, 1.6 + k * 2, FIRE.z - 1.5, 5, 36); lo.rod(C.steel, 0.03, [FIRE.x + dx + FIRE.r + 0.1, 0.4, FIRE.z - 1.5], [FIRE.x + dx + FIRE.r + 0.1, FIRE.h + 1.2, FIRE.z - 1.5], 4); }
    lo.use('satin').box(C.red, 4.4, 2.6, 3, FIRE.x, 0.3, FIRE.z + 6.4); lo.use('matte').box(0xb93a2e, 4.8, 0.2, 3.4, FIRE.x, 2.9, FIRE.z + 6.4); lo.use('satin').pipe(C.red, 0.14, [[FIRE.x - 6, 0.7, FIRE.z + 3], [FIRE.x - 6, 0.7, FIRE.z + 6.4], [FIRE.x - 2.2, 0.7, FIRE.z + 6.4]], 8); lo.pipe(C.red, 0.14, [[FIRE.x + 6, 0.7, FIRE.z + 3], [FIRE.x + 6, 0.7, FIRE.z + 6.4], [FIRE.x + 2.2, 0.7, FIRE.z + 6.4]], 8);
    ao.push(r, kiosk);
    const st = stops([r, { ...kiosk }], null, { az: -0.4, k: 1.5, walk: P(127.5, 1.4, 10.1, 2.47, 1.42, 8.6) }); st.rooms = [{ ...r }];
    areas.add({ walls: lo.walls,
      id: 'genroom', low: lo.build(mats), high: roofNo(hi.build(roof), roof, '08', 128.4, GEN.h + 0.46, 10.3, 7.5), roofMats: roof, lift: 7, pin: [128.4, GEN.h + 7, 10.3], ...st,
      makeInterior(b, ctx) {
        const R = rng(81);
        for (let k = 0; k < 3; k++) { const box = E.genset(b, 126.2, 5 + k * 5.1); ctx.item({ code: `G${k + 1}`, group: 'Generators', name: `Standby generator G${k + 1}`, kind: 'Diesel, automatic start', box, label: k === 0,
          desc: 'A diesel generator sized to carry pumps, oxygen and controls. If the grid drops it starts by itself within seconds. Two cover the full load, so the third is a spare.',
          specs: [['3', 'Sets, N+1'], ['< 10 s', 'To take load'], ['Weekly', 'Test run']], live: [{ k: 'Status', text: 'Standby, ready' }, { k: 'Battery', u: 'V', v: 27.2, d: 0.1, lo: 24, hi: 28.5, p: 1 }, { k: 'Coolant heater', u: '°C', v: 42, d: 0.6, lo: 35, hi: 50, p: 0 }, { k: 'Last test run', text: fmtDate(3 + k) }] }); }
        const sg = E.switchgear(b, 135.6, 7.6, { ry: -Math.PI / 2, n: 8 });
        ctx.item({ code: 'SWG', group: 'Distribution', name: 'Main switchgear', kind: 'Power distribution', box: sg, label: true,
          desc: 'Low-voltage panels that share power between the hatchery, the broodstock building and the plant room. Each outgoing circuit is metered and can be isolated on its own.',
          specs: [['8', 'Panels'], ['Metered', 'Every feeder']], live: [{ k: 'Load', u: 'kW', v: 386, d: 6, lo: 150, hi: 700, p: 0 }, { k: 'Supply', text: 'Grid' }, { k: 'Frequency', u: 'Hz', v: 50.0, d: 0.02, lo: 49.5, hi: 50.5, p: 2 }] });
        const ats = E.panel(b, 131.4, 17.7, { ry: Math.PI, w: 2.4, screen: 0xffcf7a });
        ctx.item({ code: 'ATS', group: 'Distribution', name: 'Automatic transfer switch', kind: 'Grid to generator', box: ats,
          desc: 'Watches the grid supply. The moment it fails, this switch starts the generators and moves the load across, then moves it back when the grid is steady again.',
          specs: [['Automatic', 'Changeover'], ['Both ways', 'Transfer']], live: [{ k: 'Position', text: 'On grid' }] });
        E.hTank(b, 133.4, 13.8, { len: 2.2, r: 0.55, hex: 0xd9dde0, y: F });
        ctx.item({ code: 'TX', group: 'Outside', name: 'Transformer', kind: 'Grid connection', box: tx, label: true,
          desc: 'Steps the utility supply down to the voltage the site uses. It sits in its own fenced yard beside the substation kiosk.',
          specs: [['Step-down', 'Type'], ['Fenced', 'Yard']], live: [{ k: 'Oil temperature', u: '°C', v: 58, d: 0.8, lo: 30, hi: 85, p: 0 }] });
        ctx.item({ code: 'RMU', group: 'Outside', name: 'Substation kiosk', kind: 'Ring main unit and metering', box: [kiosk.x0, 0, kiosk.z0, kiosk.x1, kiosk.h, kiosk.z1],
          desc: 'Where the utility cable arrives. The ring main unit lets the site be fed from either direction along the public network, and the meters here record every unit the centre draws.',
          specs: [['11 kV', 'Incoming'], ['2', 'Feeds'], ['Metered', 'Supply']], live: [{ k: 'Incoming voltage', u: 'kV', v: 11.0, d: 0.05, lo: 10.5, hi: 11.5, p: 2 }] });
        ctx.item({ code: 'FUEL', group: 'Outside', name: 'Fuel tank', kind: 'Diesel for the generators', box: fuel,
          desc: 'Bunded diesel storage sized so the generators can run for days without a delivery.',
          specs: [['Bunded', 'Double wall'], ['Days', 'Autonomy']], live: [{ k: 'Level', u: '%', v: 84, d: 0, lo: 20, hi: 100, p: 0 }] });
        ctx.item({ code: 'FW', group: 'Outside', name: 'Fire-water tanks and pump', kind: 'Site fire protection', box: [FIRE.x - FIRE.w / 2, 0, FIRE.z - FIRE.d / 2, FIRE.x + FIRE.w / 2, FIRE.h + 1, FIRE.z + FIRE.d / 2], label: true,
          desc: 'Two tanks hold a dedicated reserve of water with its own diesel pump in the red house beside them, kept full and tested for the site\'s fire ring main.',
          specs: [['2', 'Tanks'], ['Dedicated', 'Reserve'], ['Diesel', 'Pump drive']], live: [{ k: 'Level', u: '%', v: 100, d: 0, lo: 80, hi: 100, p: 0 }, { k: 'Ring main pressure', u: 'bar', v: 7.2, d: 0.05, lo: 6, hi: 9, p: 1 }] });
        b.use('satin'); E.pipeRack(b, [[121.4, 17.4], [135, 17.4]], 3.2, [C.steel], 0.14);
        yellowLine(b, 121.2, 7.55, 134.6, 7.55); yellowLine(b, 130.6, 3, 130.6, 17);
        staff(ctx, R, [[130.8, 5.2, 'hivis'], [134.4, 10.4, 'overall'], [130.6, 16.6, 'overall']]);
      },
    });
  }

  /* ══════════ 09 · Phase 1 Hatchery: six buildings south of the avenue ══════════ */
  {
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet(), { a: A, b: B, c: Cc, d: D, e: Ee, f: Ff } = P1;
    const old = 0xece5d6, lowWin = { y: 2.3, h: 1.7, w: 4.4 };   // the original buildings are a shade warmer
    hall(lo, hi, { ...A, seed: 9, wall: old, doors: { n: [{ at: 30, w: 4.5 }, { at: 96, w: 1.4, h: 2.4 }], s: [{ at: 62, w: 5 }], e: [{ at: 20, w: 2.4, h: 2.6, shut: false }], w: [{ at: 28, w: 1.4, h: 2.4 }] }, windows: { n: { n: 13 }, s: { n: 13 }, w: { n: 6 } } });
    hall(lo, hi, { ...B, seed: 10, wall: old, doors: { n: [{ at: 24, w: 4.5 }], s: [{ at: 24, w: 1.4, h: 2.4 }], w: [{ at: 25.65, w: 2.4, h: 2.6, shut: false }], e: [{ at: 40, w: 1.4, h: 2.4 }] }, windows: { e: { n: 11 }, n: { n: 5 }, s: { n: 5 } } });
    hall(lo, hi, { ...Cc, seed: 11, wall: old, doors: { n: [{ at: 36, w: 4.5 }], s: [{ at: 20, w: 1.4, h: 2.4 }], w: [{ at: 22, w: 1.4, h: 2.4 }] }, windows: { n: { n: 9 }, s: { n: 9 }, e: { n: 5 }, w: { n: 5 } } });
    hall(lo, hi, { ...D, seed: 12, wall: old, floor: C.floor, doors: { n: [{ at: 14, w: 1.6, h: 2.4 }, { at: 38, w: 1.6, h: 2.4 }, { at: 62, w: 3.6 }], s: [{ at: 12, w: 1.4, h: 2.4 }] }, windows: { n: { n: 9, ...lowWin }, s: { n: 9, ...lowWin }, e: { n: 4, ...lowWin }, w: { n: 4, ...lowWin } }, strip: false });
    hall(lo, hi, { ...Ee, seed: 13, wall: C.clayCool, doors: { s: [{ at: 20, w: 4.5 }, { at: 56, w: 1.4, h: 2.4 }], w: [{ at: 16, w: 1.4, h: 2.4 }] }, windows: { n: { n: 8 }, s: { n: 8 } } });
    hall(lo, hi, { ...Ff, seed: 17, wall: C.clayCool, doors: { n: [{ at: 14, w: 4 }, { at: 44, w: 3.6 }], e: [{ at: 11, w: 1.4, h: 2.4 }] }, windows: { s: { n: 7, y: 3.6, h: 1.3 } }, roofKit: false });
    for (let k = 0; k < 2; k++) { hi.use('metal').cyl(C.alu, 0.26, 2.8, 88.6, Ff.h, 110.5 + k * 7.5, 10); hi.use('matte').cyl(C.steelDark, 0.34, 0.2, 88.6, Ff.h + 2.8, 110.5 + k * 7.5, 10); }
    // header tanks on steel towers, in the yard between the plant room and the generator building
    const ht = [];
    for (let k = 0; k < 3; k++) {
      const x = 92 + k * 12, z = 93;
      lo.use('satin'); for (const [dx, dz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) lo.cyl(C.steelDark, 0.13, 6, x + dx, 0.05, z + dz, 6);
      for (const yy of [2, 4]) { lo.rod(C.steelDark, 0.06, [x - 2.4, yy, z - 2.4], [x + 2.4, yy + 2, z - 2.4], 4); lo.rod(C.steelDark, 0.06, [x - 2.4, yy, z + 2.4], [x + 2.4, yy + 2, z + 2.4], 4); lo.rod(C.steelDark, 0.06, [x - 2.4, yy + 2, z - 2.4], [x - 2.4, yy, z + 2.4], 4); lo.rod(C.steelDark, 0.06, [x + 2.4, yy + 2, z - 2.4], [x + 2.4, yy, z + 2.4], 4); }
      lo.use('metal').box(0xaab4ba, 5.6, 0.14, 5.6, x, 6, z);
      E.roundTank(lo, x, z, 2.5, 2.8, { wall: C.grpBlue, water: C.waterTank, y: 6.14, standpipe: false, inlet: false });
      lo.use('satin').pipe(C.pipeSea, 0.14, [[x, 6.1, z], [x, 0.4, z], [x, 0.4, z - 12.2]], 8);
      ht.push([x - 2.8, 0, z - 2.8, x + 2.8, 9, z + 2.8]);
    }
    const all = [A, B, Cc, D, Ee, Ff]; ao.push(...all);
    areas.add({ walls: lo.walls,
      id: 'phase1', low: lo.build(mats), high: roofNo(roofNo(hi.build(roof), roof, '09', -148, A.h + 0.46, 83.4, 22), roof, '09 ', 12, Cc.h + 0.46, 70.3, 15), roofMats: roof, lift: 8, pin: [-62, A.h + 9, 88],
      ...stops(all, null, { az: -0.5, k: 0.62, walk: P(-159.4, 1.5, 74, 0.0, 1.43, 16) }),
      makeInterior(b, ctx) {
        const R = rng(91), spn = ['hamour', 'hamra', 'shaari'];
        /* A · nursery and weaning */
        for (let k = 0; k < 4; k++) { const z = 62 + k * 8.2, box = E.raceway(b, -204, z - 2.1, -166, z + 2.1);
          ctx.item({ code: `P1-R${k + 1}`, group: 'A · Nursery', name: `Phase 1 raceway R${k + 1}`, kind: `${SPN[spn[k % 3]]}, weaning and grading`, box, label: k === 1,
            desc: 'A raceway from the first production stream, used for weaning and for holding graded fish before dispatch. Phase 1 still runs alongside Phase 2, which lets the team stagger batches and keep fry available through the year.',
            card: [['Tank', `P1-R${k + 1}`], ['Species', SPN[spn[k % 3]]], ['Fish in tank', num(90000 + R() * 60000)]], specs: [['38 m', 'Length'], ['70 m³', 'Volume']], live: wq(27.1, 39.2, 6.9), species: spn[k % 3], stage: 'nursery' });
          ctx.specks({ x0: -203, z0: z - 1.7, x1: -168, z1: z + 1.7, y: F + 0.62, n: 520, size: 0.14 }); }
        for (let rr = 0; rr < 2; rr++) for (let c = 0; c < 7; c++) { const x = -152 + c * 8.2, z = 63.5 + rr * 10, n = rr * 7 + c + 1;
          const box = E.squareTank(b, x, z, 5.4, 5.4, 1.2, { wall: C.grpBlue });
          ctx.item({ code: `P1-N${n}`, group: 'A · Nursery', name: `Phase 1 nursery tank N${n}`, kind: 'Nursery unit', box, label: n === 4,
            desc: 'Square nursery tanks with rounded corners, the layout the centre began with. Juveniles are held here between weaning and transfer.',
            specs: [['29 m³', 'Volume'], ['Square', 'Shape']], live: wq(27.0, 39.2, 6.9), stage: 'nursery' });
          ctx.specks({ x0: x - 2.2, z0: z - 2.2, x1: x + 2.2, z1: z + 2.2, y: F + 0.75, n: 150, size: 0.12 }); }
        for (let c = 0; c < 8; c++) { const x = -152 + c * 7, box = E.roundTank(b, x, 85.4, 2.2, 1.25, { wall: C.grp, water: C.waterTank });
          ctx.item({ code: `P1-W${c + 1}`, group: 'A · Weaning', name: `Phase 1 weaning tank W${c + 1}`, kind: 'Live feed to dry feed', box, label: c === 5,
            desc: 'Round tanks where young fish make the switch from live feed to pellets over about ten days.', specs: [['15 m³', 'Volume'], ['10 days', 'Weaning time']], live: wq(27.2, 39.2, 7.0), stage: 'nursery' });
          ctx.specks({ x0: x - 1.5, z0: 83.9, x1: x + 1.5, z1: 86.9, y: F + 0.75, n: 150, size: 0.1, round: true }); }
        b.use('metal').box(C.alu, 3.6, 0.9, 1.3, -141, F, 102); b.use('satin').box(C.grpBlue, 1.6, 0.5, 1.1, -141, F + 0.9, 102); b.use('metal').box(C.alu, 2.4, 0.9, 1.0, -134, F, 102); b.use('glow').box(C.screen, 0.5, 0.25, 0.02, -134, F + 1.15, 102.36);
        for (let k = 0; k < 6; k++) E.pallet(b, -128 + (k % 3) * 2.4, 101 + Math.floor(k / 3) * 2.6, { hex: C.white, n: 2 + (k % 3) });
        forklift(b, -118, 106, 2.4); for (let k = 0; k < 6; k++) E.pallet(b, -203 + (k % 2) * 2.4, 98 + Math.floor(k / 2) * 2.7, { hex: C.clayWarm, n: 3 + (k % 2) });
        ctx.item({ code: 'P1-GR', group: 'A · Nursery', name: 'Grading and dispatch', kind: 'Sorted, counted, packed', box: [-143.4, 0, 100.4, -120.4, 1.9, 107.4], label: true,
          desc: 'Fish are sorted by size, counted and packed with oxygen here before they leave by the big door. Phase 1 fry go to the sea cages and to customer farms in the same way as Phase 2 fry.',
          specs: [['3', 'Size classes'], ['Oxygen', 'Packed with'], ['Every order', 'Counted']] });
        E.pipeRack(b, [[-206, 56.3], [-90, 56.3]], 3.6, [C.pipeSea, C.pipeTreat], 0.1);
        yellowLine(b, -159.4, 57.4, -159.4, 110); yellowLine(b, -206, 93.4, -92, 93.4);
        /* B · hatchery */
        for (let rr = 0; rr < 5; rr++) for (let c = 0; c < 4; c++) { const x = -77 + c * 9.2, z = 57 + rr * 8.6, dph = 2 + rr * 5 + c;
          const box = E.coneTank(b, x, z, 1.75, { water: dph < 14 ? C.waterGreen : C.waterTank });
          ctx.item({ code: `P1-L${rr + 1}${c + 1}`, group: 'B · Hatchery', name: `Phase 1 larval tank L${rr + 1}${c + 1}`, kind: `Day ${dph} post-hatch`, box, label: rr === 2 && c === 1,
            desc: 'A conical larval tank from the first production stream. The cone keeps the water turning gently so the larvae stay suspended.',
            specs: [['8 m³', 'Volume'], [`${dph} days`, 'Post-hatch']], live: wq(26.3, 39.1, 6.8), stage: 'hatchery' });
          ctx.specks({ x0: x - 1.2, z0: z - 1.2, x1: x + 1.2, z1: z + 1.2, y: F + 2.35, n: 60, size: 0.06, round: true }); }
        partition(b, -85.6, 100, -38.2, 100, [{ at: 10, w: 1.4 }, { at: 36, w: 1.4 }]); partition(b, -62, 100, -62, 117); partition(b, -85.6, 117, -38.2, 117, [{ at: 24, w: 2.2 }]);
        for (let k = 0; k < 8; k++) E.cultureCone(b, -81.6 + (k % 4) * 4.4, 104.6 + Math.floor(k / 4) * 6, 0xdff3f0, { r: 0.6, h: 1.4 });
        ctx.item({ code: 'P1-INC', group: 'B · Hatchery', name: 'Phase 1 incubators', kind: 'Eggs, day 0', box: [-83, 0, 103, -66, 2.4, 112.4], label: true,
          desc: 'Eggs for the Phase 1 tanks are disinfected and hatched here in gently upwelling water.', specs: [['8', 'Incubators'], ['≈ 24 h', 'To hatch']], live: wq(26.0, 39.0, 6.9, 8.1) });
        for (let rr = 0; rr < 2; rr++) for (let k = 0; k < 9; k++) E.photobioreactor(b, -58.6 + k * 1.75, 104 + rr * 3.4, [C.algae1, C.algae3][rr]);
        for (let k = 0; k < 3; k++) E.cultureCone(b, -56 + k * 5.6, 113, 0xe9d7a6, { r: 0.9, h: 1.8 });
        ctx.item({ code: 'P1-LF', group: 'B · Hatchery', name: 'Phase 1 live feed corner', kind: 'Algae and rotifers', box: [-60, 0, 102.6, -40, 3.2, 115.2], label: true,
          desc: 'A small live feed unit of its own, so Phase 1 never has to borrow cultures from Phase 2. Two rows of algae columns feed three rotifer cones.',
          specs: [['18', 'Algae columns'], ['3', 'Rotifer cones']], live: [{ k: 'Rotifer density', u: '/mL', v: 540, d: 20, lo: 200, hi: 1200, p: 0 }] });
        E.drumFilter(b, -78, 123.5, {}); E.biofilter(b, -69, 127, 2.3, 2.4); E.skimmer(b, -62.4, 124); E.skimmer(b, -60.2, 124); E.uvBank(b, -53, 128.6, { n: 3 }); for (let k = 0; k < 3; k++) E.pump(b, -46.6 + k * 1.7, 122.4, { ry: Math.PI / 2 }); E.oxygenCone(b, -44, 130); E.panel(b, -38.9, 126, { ry: -Math.PI / 2 });
        ctx.item({ code: 'P1-RAS', group: 'B · Hatchery', name: 'Phase 1 recirculation unit', kind: 'Drum filter, biofilter, skimmers, UV', box: [-80.6, 0, 120.6, -39.4, 3.4, 131], label: true,
          desc: 'The larval tanks in this building share one recirculating loop: solids out, ammonia converted, fine waste skimmed, then ultraviolet light before the water goes round again.',
          specs: [['4', 'Treatment steps'], ['95 %', 'Water reused']], live: [{ k: 'Flow', u: 'm³/h', v: 96, d: 3, lo: 40, hi: 160, p: 0 }, { k: 'Ammonia', u: 'mg/L', v: 0.05, d: 0.01, lo: 0, hi: 0.2, p: 2 }] });
        yellowLine(b, -82, 52, -82, 98); yellowLine(b, -84, 96.4, -40, 96.4);
        /* C · broodstock */
        for (let k = 0; k < 8; k++) { const x = -13.5 + (k % 4) * 17.2, z = k < 4 ? 58.6 : 82, s = BROODSTOCK_TANKS[k % 4];
          const box = E.roundTank(b, x, z, 4.8, 1.6, { wall: C.grpDark, water: C.waterDeep });
          b.use('glow').torus(0xfff0cf, 3.2, 0.06, x, 4.2, z, 6, 36);
          ctx.school({ x, z, rx: 3.5, rz: 3.5, r0: 0.3, y0: F + 0.7, y1: F + 1.3, n: 9, sp: s.sp, len: 0.68, speed: 0.12 });
          ctx.item({ code: `P1-B${k + 1}`, group: 'C · Broodstock', name: `Phase 1 broodstock tank B${k + 1}`, kind: s.name, box, label: k === 1,
            desc: 'One of the original breeding tanks. The first generations of hatchery-born fish at the centre came from the parents held in this hall.',
            card: [['Tank', `P1-B${k + 1}`], ['Species', s.name], ['Breeders', String(14 + k * 2)]], specs: [['9.6 m', 'Diameter'], ['100 m³', 'Volume']], live: wq(26.6, 39.3, 6.6), stage: 'broodstock', species: ['hamour', 'seabream', 'shaari', 'shiqra'].includes(s.sp) ? s.sp : null, swim: { sp: s.sp, n: 16, tank: 4.8 } }); }
        E.catwalk(b, -21.4, 70.3, 46, 70.3, { y: 1.9, w: 1.4 }); E.steps(b, -22.6, 70.3, { ry: Math.PI / 2 });
        for (let k = 0; k < 4; k++) { const x = -13.5 + k * 17.2; E.catwalk(b, x, 69.6, x, 63.6, { y: 1.9, w: 1.1, legsEvery: 99 }); E.catwalk(b, x, 71, x, 77, { y: 1.9, w: 1.1, legsEvery: 99 }); }
        E.pipeRack(b, [[-22, 48.6], [46.4, 48.6]], 3.4, [C.pipeSea, C.pipeTreat], 0.1); yellowLine(b, -22, 90.6, 46, 90.6);
        /* D · office, laboratory and stores */
        partition(b, 8, 100, 8, 134.4, [{ at: 8, w: 1.3 }]); partition(b, 30, 100, 30, 134.4, [{ at: 10, w: 1.6 }]); partition(b, -18.2, 121, 8, 121, [{ at: 14, w: 1.3 }]);
        E.deskPod(b, -12.4, 105.4); E.deskPod(b, -3.4, 105.4); E.deskPod(b, -12.4, 113.6); E.deskPod(b, -3.4, 113.6); E.meetingTable(b, -6, 128, { len: 4.6 }); E.wallScreen(b, -6, 134.1, { ry: Math.PI, w: 3 }); E.sofa(b, -15.6, 127, { ry: Math.PI / 2 }); E.planter(b, 6.6, 122.6); E.planter(b, -17, 101.4);
        ctx.item({ code: 'P1-OF', group: 'D · Support', name: 'Phase 1 office', kind: 'Hatchery team', box: [-18.2, 0, 100, 7.9, 2.3, 134.4], label: true,
          desc: 'Working space for the hatchery managers and technicians, a few steps from the tanks they look after.', specs: [['16', 'Desks'], ['1', 'Meeting room']] });
        E.labBench(b, 19, 101, { len: 9, kit: 2 }); E.labBench(b, 19, 111, { len: 6, island: true, kit: 4 }); E.labBench(b, 19, 133.4, { len: 9, ry: Math.PI, kit: 0 }); E.fridge(b, 29.3, 106, { ry: -Math.PI / 2 }); E.fridge(b, 29.3, 107.3, { ry: -Math.PI / 2, glass: true }); E.fumeHood(b, 9.6, 124, { ry: Math.PI / 2 });
        ctx.item({ code: 'P1-LAB', group: 'D · Support', name: 'Phase 1 hall laboratory', kind: 'Quick checks beside the tanks', box: [8.2, 0, 100, 29.8, 2.4, 134.4], label: true,
          desc: 'A working lab for the checks that cannot wait: larval gut fullness under the microscope, a bacterial count on tonight\'s live feed, a quick ammonia test. Anything that needs the full diagnostic suite goes to the Research Wing.',
          specs: [['Daily', 'Larval checks'], ['Microscopes', 'Bench'], ['Fume hood', '1']], live: [{ k: 'Samples today', u: '', v: 17, d: 0, lo: 0, hi: 60, p: 0 }] });
        for (let k = 0; k < 12; k++) E.pallet(b, 35 + (k % 4) * 2.6, 104 + Math.floor(k / 4) * 3, { hex: [C.clayWarm, C.white, 0xd9c7a2][k % 3], n: 2 + (k % 3) });
        E.shelving(b, 44, 133.6, { len: 12, ry: Math.PI }); E.shelving(b, 56.9, 112, { len: 8, ry: -Math.PI / 2 }); forklift(b, 50, 122, 0.9); for (let k = 0; k < 5; k++) b.use('satin').cyl(k < 3 ? 0x3f9b63 : C.steel, 0.13, 1.5, 33 + k * 0.5, F, 131, 8);
        ctx.item({ code: 'P1-ST', group: 'D · Support', name: 'Feed and equipment store', kind: 'Feed, nets, spares', box: [30.2, 0, 100, 57.6, 2.6, 134.4],
          desc: 'Bagged feed, spare nets, pumps and pipe fittings for both production streams. Feed is stacked by pellet size and used oldest first.', specs: [['Cool, dry', 'Storage'], ['First in', 'First out']] });
        /* E · plant room */
        const sfp = [0, 1, 2, 3].map((k) => E.sandFilter(b, 76 + k * 4.6, 53, 1.3, 2.5));
        ctx.item({ code: 'P1-SF', group: 'E · Plant room', name: 'Phase 1 sand filters', kind: 'Particle removal', box: [sfp[0][0], 0, sfp[0][2], sfp[3][3], sfp[0][4], sfp[0][5]], label: true,
          desc: 'Four pressure vessels of graded sand that polish the water before it returns to the Phase 1 halls.', specs: [['4', 'Vessels'], ['Auto', 'Backwash']], live: [{ k: 'Flow', u: 'm³/h', v: 240, d: 5, lo: 100, hi: 360, p: 0 }] });
        const bfp = [E.biofilter(b, 80, 69, 3.0, 2.7), E.biofilter(b, 89.6, 69, 3.0, 2.7)];
        ctx.item({ code: 'P1-BF', group: 'E · Plant room', name: 'Phase 1 biofilters', kind: 'Ammonia to nitrate', box: [bfp[0][0], 0, bfp[0][2], bfp[1][3], bfp[0][4], bfp[0][5]], label: true,
          desc: 'Two moving-bed reactors. Bacteria living on thousands of tumbling carriers turn ammonia from fish waste into nitrate.', specs: [['2', 'Reactors'], ['Moving bed', 'Type']], live: [{ k: 'Ammonia out', u: 'mg/L', v: 0.04, d: 0.01, lo: 0, hi: 0.2, p: 2 }] });
        const dfp = [E.drumFilter(b, 100, 53.6, {}), E.drumFilter(b, 100, 59.6, {})];
        ctx.item({ code: 'P1-DF', group: 'E · Plant room', name: 'Phase 1 drum filters', kind: 'Solids removal', box: [dfp[0][0], 0, dfp[0][2], dfp[1][3], dfp[0][4], dfp[1][5]],
          desc: 'Rotating mesh drums that strain uneaten feed and waste out of the water coming back from the tanks.', specs: [['2', 'Drums'], ['40 µm', 'Mesh']], live: [{ k: 'Flow', u: 'm³/h', v: 240, d: 6, lo: 100, hi: 360, p: 0 }] });
        const uvp = [E.uvBank(b, 110, 53, { n: 3 }), E.uvBank(b, 116, 53, { n: 3 })]; E.skimmer(b, 108, 70.4); E.skimmer(b, 110.4, 70.4);
        ctx.item({ code: 'P1-UV', group: 'E · Plant room', name: 'Phase 1 UV and skimmers', kind: 'Disinfection', box: [uvp[0][0], 0, uvp[0][2], uvp[1][3], uvp[0][4], uvp[0][5]],
          desc: 'Phase 1 has a separate treatment line. Keeping the two phases on separate water is a biosecurity choice: a problem in one cannot spread to the other.', specs: [['Separate', 'From Phase 2'], ['No chemicals', 'Treatment']], live: [{ k: 'UV dose', u: 'mJ/cm²', v: 116, d: 3, lo: 80, hi: 160, p: 0 }] });
        for (let k = 0; k < 4; k++) E.pump(b, 120 + k * 2.3, 61.6, { s: 1.2 }); E.blower(b, 128, 51.6); E.blower(b, 128, 55);
        ctx.item({ code: 'P1-PMP', group: 'E · Plant room', name: 'Phase 1 pumps and blowers', kind: 'Moving water and air', box: [119, 0, 50.4, 129.6, 1.8, 62.6],
          desc: 'Four pumps return treated water to the halls and the header tanks; two blowers supply the air for the biofilters and tank aeration.', specs: [['4', 'Pumps'], ['2', 'Blowers']], live: [{ k: 'Pumps running', u: 'of 4', v: 3, d: 0, lo: 0, hi: 4, p: 0 }, { k: 'Water reused', u: '%', v: 91.2, d: 0.3, lo: 80, hi: 98, p: 1 }] });
        partition(b, 129.6, 68, 140, 68, [{ at: 2, w: 1.2 }]); partition(b, 129.6, 68, 129.6, 80); E.controlDesk(b, 135, 77.6, { ry: Math.PI }); E.panel(b, 139.4, 71.6, { ry: -Math.PI / 2 });
        ctx.item({ code: 'P1-CR', group: 'E · Plant room', name: 'Phase 1 control room', kind: 'Pumps, filters and alarms', box: [130, 0, 68.4, 140, 2.3, 80], label: true,
          desc: 'The original control room. Its screens are repeated in the main life-support control room, so either can run the Phase 1 water system.', specs: [['24/7', 'Monitoring'], ['Mirrored', 'In area 07']], live: [{ k: 'Active alarms', u: '', v: 0, d: 0, lo: 0, hi: 5, p: 0 }] });
        E.pipeRack(b, [[72, 64.4], [128, 64.4]], 3.5, [C.pipeSea, C.pipeTreat, C.pipeO2], 0.12); yellowLine(b, 72, 62.8, 118, 62.8);
        ctx.item({ code: 'HT', group: 'E · Plant room', name: 'Header tanks', kind: 'Gravity supply', box: [ht[0][0], 0, ht[0][2], ht[2][3], 9, ht[0][5]], label: true,
          desc: 'Three tanks on steel towers hold treated sea water above the halls. Water reaches the tanks by gravity, so the fish still get flow for a while even if every pump stops.',
          specs: [['3', 'Tanks'], ['6 m', 'Tower height'], ['Gravity', 'Feed']], live: [{ k: 'Level', u: '%', v: 87, d: 0.6, lo: 50, hi: 100, p: 0 }] });
        /* F · generator and workshop */
        partition(b, 104, 105.6, 104, 127, [{ at: 9, w: 1.4 }]);
        const g1 = [E.genset(b, 88.4, 110.5), E.genset(b, 88.4, 118)]; const sw1 = E.switchgear(b, 102.6, 118, { ry: -Math.PI / 2, n: 6 });
        ctx.item({ code: 'P1-G', group: 'F · Power and workshop', name: 'Phase 1 generators', kind: 'Back-up power', box: [g1[0][0], 0, g1[0][2], g1[1][3], g1[0][4], g1[1][5]], label: true,
          desc: 'The original standby sets. They still protect the Phase 1 halls and back up the main generator room.', specs: [['2', 'Sets'], ['Automatic', 'Start']], live: [{ k: 'Status', text: 'Standby, ready' }] });
        ctx.item({ code: 'P1-SW', group: 'F · Power and workshop', name: 'Phase 1 switchboard', kind: 'Power for the six buildings', box: sw1,
          desc: 'Shares power between the Phase 1 buildings and ties them to the main switchgear in area 08.', specs: [['6', 'Panels']], live: [{ k: 'Load', u: 'kW', v: 142, d: 4, lo: 40, hi: 300, p: 0 }] });
        E.labBench(b, 122, 126.2, { len: 12, ry: Math.PI, kit: 0 }); E.shelving(b, 139.4, 113, { len: 9, ry: -Math.PI / 2 }); for (let k = 0; k < 4; k++) E.pallet(b, 109 + k * 2.6, 121, { hex: C.clayWarm, n: 2 }); forklift(b, 116, 112, -0.6);
        b.use('satin').box(0x2f6f9c, 2.2, 1.0, 1.2, 128, F, 112); b.use('metal').box(C.alu, 1.4, 0.5, 0.9, 128, F + 1.0, 112); b.use('satin').cyl(C.orange, 0.5, 0.9, 133, F, 111, 14); b.cyl(C.orange, 0.5, 0.9, 134.4, F, 112.4, 14);
        ctx.item({ code: 'P1-WS', group: 'F · Power and workshop', name: 'Maintenance workshop', kind: 'Pumps, nets, repairs', box: [104.4, 0, 105.6, 140, 2.4, 127],
          desc: 'Pumps are stripped and rebuilt here, nets mended and feeders serviced. Keeping spares and skills on site means a failed pump is swapped in minutes, not days.', specs: [['On site', 'Repairs'], ['Spares', 'Held']] });
        staff(ctx, R, [[-186, 66.4, 'coat'], [-148, 68.6, 'coat'], [-124, 79, 'coat'], [-139, 104.2, 'overall'], [-126, 99, 'hivis'], [-110, 83, 'coat'], [-72, 61, 'coat'], [-54, 78.4, 'coat'], [-74, 107.6, 'coat'], [-50, 110.6, 'coat'], [-66, 123, 'overall'], [-4.6, 70.3, 'coat', 1.9], [29.4, 70.3, 'coat', 1.9], [12, 91.4, 'overall'], [-9, 108.6, 'office'], [-7.6, 126, 'office'], [17, 108.6, 'lab'], [22, 131.4, 'lab'], [42, 118, 'overall'], [84, 60, 'overall'], [103, 57, 'hivis'], [134.6, 75.6, 'coat'], [96, 114.4, 'hivis'], [120, 124.4, 'overall'], [100, 99.6, 'overall']]);
      },
    });
  }
  world.scene.add(aoSkirts(ao));
  // keep the roof numbers the right way up for wherever the camera is
  let turn = null;
  world.updaters.push(() => { const az = world.rig.drone ? world.rig.drone.yaw + Math.PI : world.rig.cur.az, q = Math.round(az / (Math.PI / 2)) * (Math.PI / 2); if (q === turn) return; turn = q; for (const m of roofNos) { m.rotation.y = q - (m.userData.fry || 0); m.updateMatrix(); m.matrixWorldNeedsUpdate = true; } });
}
