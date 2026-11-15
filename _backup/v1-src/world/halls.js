// Production side of the centre: areas 03 to 09.
import * as THREE from 'three';
import { Builder, C, shade, rng, TAU, DEG, canvasTex } from './kit.js';
import { hall, wallRun, aoSkirts, CUT } from './shell.js';
import * as E from './equip.js';
import { WEAR, fishTruck, forklift } from './props.js';
import { HATCH, BROOD, INTAKE, PLANT, GEN, P1 } from './layout.js';
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
const yellowLine = (b, x0, z0, x1, z1) => b.use('matte').wall(0xf2cf4a, x0, z0, x1, z1, 0.14, F + 0.004, F + 0.012);
const staff = (ctx, R, list) => list.forEach(([x, z, k, y]) => ctx.person(x, z, R() * TAU, Array.isArray(WEAR[k]) ? WEAR[k][Math.floor(R() * WEAR[k].length)] : WEAR[k], y));
const partition = (b, x0, z0, x1, z1, doors = [], hex = C.clay) => wallRun(b, null, x0, z0, x1, z1, { t: 0.2, hex, doors });
const SPN = { hamour: 'Hamour', hamra: 'Hamra, red snapper', shaari: 'Shaari' };

/** a big area number painted on the roof, readable from the overview */
function roofNo(group, roof, text, x, y, z, size = 15) {
  const tex = canvasTex(256, 160, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#0b2b3c'; g.font = '600 150px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 8); }, { repeat: false });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.3, depthWrite: false }); mat.userData.baseOpacity = 0.3;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * 1.6, size).rotateX(-Math.PI / 2), mat); m.position.set(x, y, z); m.updateMatrix(); m.matrixAutoUpdate = false; m.renderOrder = 2; m.userData.noShadow = true;
  roof['no' + text] = mat; group.add(m); roofNos.push(m); return group;
}
const roofNos = [];

export function buildHalls(world) {
  const { mats, areas } = world;
  const ao = [];

  /* ══════════ 03 · Weaning and Nursery ══════════ */
  {
    const r = { x0: HATCH.x0, x1: HATCH.nurseryX1, z0: HATCH.z0, z1: HATCH.z1 };
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet();
    hall(lo, hi, { ...r, h: HATCH.h, seed: 3, doors: { s: [{ at: 66, w: 5 }, { at: 12, w: 1.4, h: 2.4 }], n: [{ at: 8, w: 1.4, h: 2.4 }, { at: 58, w: 4.5 }], e: [{ at: 22, w: 2.4, h: 2.6, shut: false }], w: [{ at: 30, w: 1.4, h: 2.4 }] }, windows: { s: { n: 9 }, n: { n: 9 }, w: { n: 5 } } });
    fishTruck(lo, 36, 31.5, Math.PI / 2); lo.use('paving').quad(C.clayCool, 10, 6, 36, 0.045, 28);
    ao.push(r);
    areas.add({
      id: 'nursery', low: lo.build(mats), high: roofNo(hi.build(roof), roof, '03', 8, HATCH.h + 0.46, 2), roofMats: roof, lift: 8, hit: [[r.x0, 0, r.z0, r.x1, HATCH.h, r.z1]], pin: [8, HATCH.h + 6, 2],
      pose: P(8, 2, 4, -0.62, 0.92, 150), inside: P(4, 1, 3, -0.38, 0.72, 96), plan: P(8, 0, 2, 0, 0.14, 118),
      makeInterior(b, ctx) {
        const R = rng(31), sp = ['hamour', 'hamra', 'shaari', 'hamour', 'hamra'];
        for (let i = 0; i < 5; i++) {
          const zc = -15.3 + i * 6.3, x0 = -24, x1 = 20, age = 34 + i * 9 + Math.floor(R() * 5), count = 180000 + Math.floor(R() * 90000), w = +(0.4 + (age - 30) * 0.045).toFixed(2);
          const box = E.raceway(b, x0, zc - 2.3, x1, zc + 2.3);
          // feeder rails and posts
          b.use('satin'); for (const s of [-1.55, 1.55]) b.rod(C.steel, 0.05, [x0, 2.3, zc + s], [x1, 2.3, zc + s], 6);
          for (let x = x0; x <= x1 + 0.1; x += 11) for (const s of [-2.55, 2.55]) { b.cyl(C.steelDark, 0.05, 2.3, x, F, zc + s, 6); b.rod(C.steelDark, 0.04, [x, 2.3, zc - 2.55], [x, 2.3, zc + 2.55], 6); }
          ctx.item({ code: `N-0${i + 1}`, group: 'Raceways', name: `Nursery raceway N-0${i + 1}`, kind: `${SPN[sp[i]]} juveniles`, box, label: i === 0,
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
        E.pipeRack(b, [[-28, -19], [44, -19]], 3.5, [C.pipeSea, C.pipeTreat, C.pipeO2], 0.1);
        forklift(b, 24, 13, 0.6);
        yellowLine(b, 22.5, -19, 22.5, 13.2); yellowLine(b, -28.5, 13.2, 22.5, 13.2); yellowLine(b, 25.5, 0, 45, 0);
        staff(ctx, R, [[-10, -12.2, 'overall'], [12, 0.6, 'overall'], [31, -9, 'overall'], [39.5, 9.6, 'hivis'], [-2, 15, 'coat'], [34, 6.5, 'overall']]);
      },
    });
  }

  /* ══════════ 04 · Larval Rearing Hall ══════════ */
  {
    const r = { x0: HATCH.nurseryX1, x1: HATCH.larvalX1, z0: HATCH.z0, z1: HATCH.z1 };
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet();
    hall(lo, hi, { ...r, h: HATCH.h, seed: 4, doors: { s: [{ at: 12, w: 1.4, h: 2.4 }, { at: 40, w: 1.4, h: 2.4 }], n: [{ at: 54, w: 4.5 }], w: [{ at: 22, w: 2.4, h: 2.6, shut: false }], e: [{ at: 22, w: 2.4, h: 2.6, shut: false }] }, windows: { s: { n: 8 }, n: { n: 8 } } });
    ao.push(r);
    areas.add({
      id: 'hatchery', low: lo.build(mats), high: roofNo(hi.build(roof), roof, '04', 78, HATCH.h + 0.46, 2), roofMats: roof, lift: 8, hit: [[r.x0, 0, r.z0, r.x1, HATCH.h, r.z1]], pin: [78, HATCH.h + 6, 2],
      pose: P(78, 2, 4, -0.5, 0.92, 140), inside: P(76, 1, 0, -0.3, 0.7, 86), plan: P(78, 0, 2, 0, 0.14, 104),
      makeInterior(b, ctx) {
        const R = rng(41), rowSp = ['hamour', 'hamour', 'hamra', 'shaari'], stage = (d) => (d < 4 ? 'Green water and rotifers' : d < 14 ? 'Rotifers, enriched' : d < 22 ? 'Artemia' : 'Artemia and first dry feed');
        for (let rr = 0; rr < 4; rr++) for (let c = 0; c < 6; c++) {
          const x = 53 + c * 6.8, z = -14 + rr * 7.2, dph = 1 + c * 4 + rr, stocked = 600000 + Math.floor(R() * 12) * 5000, un = Math.round(stocked * (0.08 + R() * 0.1) / 1000) * 1000;
          const green = dph < 14;
          const box = E.coneTank(b, x, z, 1.75, { water: green ? C.waterGreen : C.waterTank });
          ctx.item({ code: `L${rr + 1}T${c + 1}`, group: 'Larval tanks', name: `Larval tank L${rr + 1}T${c + 1}`, kind: `${SPN[rowSp[rr]]}, day ${dph} post-hatch`, box, label: rr === 0 && c === 2,
            desc: 'A conical tank on its own recirculating loop. The cone keeps the water turning gently so the larvae stay suspended, and the central screen lets water out while keeping them in.',
            card: [['Tank no', `L${rr + 1}T${c + 1}`], ['Species', SPN[rowSp[rr]]], ['Stocking date', fmtDate(dph + 1)], ['Stocked eggs', num(stocked)], ['Unhatched eggs', num(un)], ['Hatched eggs', num(stocked - un)]],
            specs: [['8 m³', 'Volume'], [`${dph} days`, 'Post-hatch'], [`${Math.round(78 - dph * 1.1 - R() * 6)} %`, 'Survival, est.']],
            live: [...wq(26.2, 39.0, 6.7, 8.1), { k: 'Feed stage', text: stage(dph) }, { k: 'Light', text: green ? '16 h on, dimmed' : '14 h on' }], species: rowSp[rr], stage: 'hatchery' });
          ctx.specks({ x0: x - 1.2, z0: z - 1.2, x1: x + 1.2, z1: z + 1.2, y: F + 2.35, n: 70, size: 0.06, round: true });
        }
        for (let rr = 0; rr < 4; rr++) { const z = -14 + rr * 7.2 - 2.6; b.use('satin').pipe(C.pipeSea, 0.07, [[50, 3.0, z], [89, 3.0, z]], 8); b.pipe(C.pipeO2, 0.045, [[50, 3.0, z + 0.3], [89, 3.0, z + 0.3]], 6); }
        b.use('satin').pipe(C.pipeSea, 0.1, [[50, 3.0, -17.6], [50, 3.0, 5.2]], 8);
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
        yellowLine(b, 91.6, -19, 91.6, 13); yellowLine(b, 47, 11.4, 91.6, 11.4);
        staff(ctx, R, [[56.5, -10.5, 'overall'], [70, 4, 'overall'], [84, -3, 'coat'], [73.5, 20.6, 'coat'], [86, 19, 'coat'], [99, 2.5, 'overall'], [55, 19.5, 'coat']]);
      },
    });
  }

  /* ══════════ 05 · Live Feed and Algae ══════════ */
  {
    const r = { x0: HATCH.larvalX1, x1: HATCH.x1, z0: HATCH.z0, z1: HATCH.z1 };
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet();
    hall(lo, hi, { ...r, h: HATCH.h, seed: 5, doors: { s: [{ at: 14, w: 1.4, h: 2.4 }, { at: 38, w: 1.4, h: 2.4 }], n: [{ at: 36, w: 3.6 }], w: [{ at: 22, w: 2.4, h: 2.6, shut: false }], e: [{ at: 30, w: 1.4, h: 2.4 }] }, windows: { s: { n: 6 }, n: { n: 6 }, e: { n: 5 } } });
    ao.push(r);
    const ALGAE = [['Nannochloropsis', C.algae1, 'Green-water for the larval tanks'], ['Isochrysis', C.algae3, 'Rich in DHA, for enrichment'], ['Tetraselmis', C.algae4, 'Rotifer feed'], ['Chaetoceros', C.algae6, 'Diatom, for copepods'], ['Pavlova', C.algae2, 'Enrichment for Artemia'], ['Diatom culture', C.algae5, 'Copepod feed'], ['Stock cultures', C.algae7, 'Clean starter lines']];
    areas.add({
      id: 'livefeed', low: lo.build(mats), high: roofNo(hi.build(roof), roof, '05', 134, HATCH.h + 0.46, 2), roofMats: roof, lift: 8, hit: [[r.x0, 0, r.z0, r.x1, HATCH.h, r.z1]], pin: [134, HATCH.h + 6, 2],
      pose: P(134, 2, 4, -0.36, 0.92, 128), inside: P(133, 1, 0, -0.22, 0.68, 78), plan: P(134, 0, 2, 0, 0.14, 96),
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
        partition(b, 111, 13.4, 135, 13.4, [{ at: 12, w: 1.4 }]);
        E.labBench(b, 118, 22.6, { len: 6, ry: Math.PI, kit: 3 }); E.labBench(b, 127, 22.6, { len: 5, ry: Math.PI, kit: 0 });
        for (let k = 0; k < 2; k++) { E.shelving(b, 114 + k * 9, 16.2, { len: 4, hex: C.alu }); b.use('glow'); for (let q = 0; q < 6; q++) b.cyl([C.algae1, C.algae3, C.algae4, C.algae6][q % 4], 0.16, 0.42, 112.6 + k * 9 + q * 0.56, F + 1.44, 16.2, 8); }
        ctx.item({ code: 'SC', group: 'Microalgae', name: 'Starter culture lab', kind: 'Where each batch begins', box: [112, 0, 14.4, 134, 2.3, 23.2], label: true,
          desc: 'Every culture in the hall starts in a test tube here. Pure strains are stepped up from tubes to flasks to carboys under sterile conditions before they go to the columns.',
          specs: [['Sterile', 'Bench work'], ['7', 'Strains kept'], ['Weekly', 'Renewed']] });
        // rotifers, Artemia, copepods
        partition(b, 135, -19.5, 135, 23.5, [{ at: 9, w: 1.4 }, { at: 23, w: 1.4 }, { at: 37, w: 1.4 }]); partition(b, 135, -3, 157.4, -3); partition(b, 135, 11, 157.4, 11);
        for (let k = 0; k < 6; k++) {
          const x = 140 + (k % 3) * 6, z = -15 + Math.floor(k / 3) * 7, box = E.cultureCone(b, x, z, 0xe9d7a6, { r: 1.05, h: 2.0 });
          ctx.item({ code: `R-${k + 1}`, group: 'Zooplankton', name: `Rotifer cone R-${k + 1}`, kind: 'First food for larvae', box, label: k === 1,
            desc: 'Rotifers are tiny animals, a fifth of a millimetre long, and the first thing a newly hatched larva can catch. They are fed on microalgae here and enriched with fatty acids before each feed.',
            specs: [['1,500 L', 'Volume'], ['Brachionus', 'Species'], ['Twice daily', 'Harvest']], live: [{ k: 'Density', u: '/mL', v: 620 + k * 40, d: 25, lo: 200, hi: 1200, p: 0 }, { k: 'Temperature', u: '°C', v: 26.4, d: 0.2, lo: 24, hi: 28, p: 1 }] });
        }
        for (let k = 0; k < 4; k++) {
          const x = 139.5 + k * 4.4, box = E.cultureCone(b, x, 0.3, 0xf0a55a, { r: 0.8, h: 1.7 });
          ctx.item({ code: `AR-${k + 1}`, group: 'Zooplankton', name: `Artemia hatcher AR-${k + 1}`, kind: 'Second food for larvae', box, label: k === 0,
            desc: 'Dry Artemia cysts hatch into swimming nauplii within a day in warm, strongly aerated sea water. The orange colour is the nauplii themselves.',
            specs: [['600 L', 'Volume'], ['24 h', 'To hatch'], ['Enriched', 'Before feeding']], live: [{ k: 'Hatch rate', u: '%', v: 88, d: 1.5, lo: 70, hi: 96, p: 0 }, { k: 'Temperature', u: '°C', v: 28.2, d: 0.2, lo: 26, hi: 30, p: 1 }] });
        }
        for (let k = 0; k < 3; k++) {
          const x = 141 + k * 6, box = E.roundTank(b, x, 7, 1.35, 1.2, { wall: C.white, water: 0x9fc9a8, standpipe: false });
          ctx.item({ code: `C-${k + 1}`, group: 'Zooplankton', name: `Copepod tank C-${k + 1}`, kind: 'Closest to wild food', box,
            desc: 'Copepods are what marine fish larvae eat in the sea. They are slower to culture than rotifers but give the best start to delicate species such as grouper.',
            specs: [['6 m³', 'Volume'], ['Diatoms', 'Fed on']], live: [{ k: 'Density', u: '/L', v: 1400 + k * 180, d: 60, lo: 500, hi: 3000, p: 0 }] });
        }
        E.labBench(b, 146, 22.6, { len: 8, ry: Math.PI, kit: 0 }); E.labBench(b, 146, 16.2, { len: 5, island: true, kit: 1 }); E.fridge(b, 156.6, 14, { ry: -Math.PI / 2 }); E.fridge(b, 156.6, 15.1, { ry: -Math.PI / 2, glass: true });
        ctx.item({ code: 'QC', group: 'Zooplankton', name: 'Live feed quality bench', kind: 'Counts and enrichment checks', box: [137, 0, 12, 157, 2.3, 23.2],
          desc: 'Before any live feed goes to the larval hall it is counted and checked here for density, size and bacterial load.',
          specs: [['Every batch', 'Checked'], ['Microscope', 'Counts']] });
        yellowLine(b, 111, -19, 134.6, -19);
        staff(ctx, R, [[121, -4.6, 'coat'], [130, 8.2, 'coat'], [143, -11, 'overall'], [150, 3.6, 'coat'], [144, 19, 'coat']]);
      },
    });
  }

  /* ══════════ 06 · Broodstock Building and sea water intake ══════════ */
  {
    const r = BROOD, q = INTAKE;
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet();
    hall(lo, hi, { ...r, h: BROOD.h, seed: 6, doors: { s: [{ at: 36, w: 5 }, { at: 60, w: 1.4, h: 2.4 }], w: [{ at: 22, w: 1.4, h: 2.4 }], n: [{ at: 25, w: 2.4, h: 2.8, shut: false }] }, windows: { s: { n: 8 }, e: { n: 5 }, w: { n: 5 } } });
    hall(lo, hi, { ...q, h: INTAKE.h, seed: 16, wall: C.clayCool, doors: { s: [{ at: 15, w: 2.4, h: 2.8, shut: false }], e: [{ at: 9, w: 3 }] }, windows: { w: { n: 2 } }, strip: false });
    ao.push(r, q);
    areas.add({
      id: 'broodstock', low: lo.build(mats), high: roofNo(hi.build(roof), roof, '06', 26, BROOD.h + 0.46, -90), roofMats: roof, lift: 8, hit: [[r.x0, 0, r.z0, r.x1, BROOD.h, r.z1], [q.x0, 0, q.z0, q.x1, INTAKE.h, q.z1]], pin: [26, BROOD.h + 6, -90],
      pose: P(26, 2, -92, -0.55, 0.94, 150), inside: P(25, 1, -93, -0.32, 0.7, 96), plan: P(25, 0, -96, 0, 0.14, 118),
      makeInterior(b, ctx) {
        const R = rng(61);
        BROODSTOCK_TANKS.forEach((s, i) => {
          const x = 1.5 + (i % 4) * 16.5, z = i < 4 ? -101 : -79, rad = 6.4, n = 26 + Math.floor(R() * 14), spawn = ['Spring', 'Winter', 'Spring', 'Summer', 'Winter', 'Summer', 'To be confirmed', 'Spring'][i];
          const box = E.roundTank(b, x, z, rad, 1.7, { wall: C.grpDark, water: C.waterDeep, pipe: C.pipeSea, level: 0.88 });
          b.use('glow').torus(0xfff0cf, 4.2, 0.07, x, 4.3, z, 6, 40);
          const s2 = i < 4 ? -1 : 1; b.use('satin'); for (const a of [0.6, 2.1, 3.7, 5.2]) b.rod(C.steelDark, 0.02, [x + Math.cos(a) * 4.2, 4.3, z + Math.sin(a) * 4.2], [x + Math.cos(a) * 4.2, 7.2, z + Math.sin(a) * 4.2], 4);
          // egg collector at the overflow
          const ecx = x + (rad + 0.75) * 0.7071, ecz = z - s2 * (rad + 0.75) * 0.7071;
          b.use('satin').box(C.white, 1.3, 1.0, 1.0, ecx, F, ecz, 0.785); b.use('metal').box(C.alu, 1.1, 0.04, 0.8, ecx, F + 1.0, ecz, 0.785);
          ctx.school({ x, z, rx: rad * 0.74, rz: rad * 0.74, r0: 0.32, y0: F + 0.75, y1: F + 1.38, n: 15, sp: s.sp, len: s.sp === 'cobia' ? 1.05 : s.sp === 'mullet' ? 0.5 : 0.72, speed: 0.11 });
          ctx.item({ code: `B-0${i + 1}`, group: 'Breeding tanks', name: `Broodstock tank B-0${i + 1}`, kind: s.sci ? `${s.name}, ${s.sci}` : s.name, box, label: i === 0 || i === 5,
            desc: 'A deep round tank holding one breeding group. Day length and water temperature are shifted through the year to match the season each species spawns in. Eggs float, so they leave with the overflow and are caught in the collector beside the tank.',
            card: [['Tank', `B-0${i + 1}`], ['Species', s.name], ['Breeders', String(n)], ['Sex ratio', i % 2 ? '1 male to 2 females' : '1 male to 3 females'], ['Spawning season', spawn], ['Diet', 'Fresh fish, squid, vitamin mix']],
            specs: [['12.8 m', 'Diameter'], ['200 m³', 'Volume'], [String(n), 'Fish']],
            live: [...wq(i === 1 || i === 4 ? 23.5 : 26.8, 39.4, 6.6), { k: 'Day length', u: 'h', v: i === 1 || i === 4 ? 11 : 13.5, d: 0, lo: 9, hi: 15, p: 1 }, { k: 'Eggs collected today', u: '', v: i === 6 ? 0 : 0.6e6 + R() * 2.4e6, d: 0, lo: 0, hi: 4e6, p: 0, big: true }], species: ['hamour', 'seabream', 'shaari', 'shiqra'].includes(s.sp) ? s.sp : null, stage: 'broodstock' });
        });
        const cw = E.catwalk(b, -6, -90, 58, -90, { y: 1.9, w: 1.5 }); E.steps(b, -7.2, -90, { ry: Math.PI / 2 });
        for (let i = 0; i < 4; i++) { const x = 1.5 + i * 16.5; E.catwalk(b, x, -90.7, x, -94.2, { y: 1.9, w: 1.2, legsEvery: 99 }); E.catwalk(b, x, -89.3, x, -85.8, { y: 1.9, w: 1.2, legsEvery: 99 }); }
        ctx.item({ code: 'CW', group: 'Access', name: 'Service walkway', kind: 'Safe access to every tank', box: [cw[0], 1.7, cw[2], cw[3], 3, cw[5]], prio: -1,
          desc: 'A raised walkway of non-slip grating runs down the middle of the hall with a spur to each tank. Staff feed, observe and net fish from here without leaning over the water.',
          specs: [['64 m', 'Length'], ['GRP grating', 'Deck'], ['8', 'Tank spurs']] });
        ctx.item({ code: 'EC', group: 'Eggs', name: 'Egg collectors', kind: 'Spawn harvested each morning', box: [5.7, 0, -96.8, 7.4, 1.4, -95.1], label: true, prio: 1,
          desc: 'A fine mesh box on each tank\'s overflow. Fertilised eggs float, so they drift out with the surface water overnight and are waiting here at dawn to be counted, disinfected and carried to the incubators.',
          specs: [['8', 'Collectors'], ['500 µm', 'Mesh'], ['To hall 04', 'Next stop']], live: [{ k: 'Collected today, all tanks', u: '', v: 9.4e6, d: 0, lo: 0, hi: 2e7, p: 0, big: true }] });
        b.use('satin').pipe(C.pipeSea, 0.24, [[15, 3.2, -111.2], [15, 3.2, -110.4], [-7, 3.2, -110.4]], 10); b.pipe(C.pipeSea, 0.24, [[15, 3.2, -110.4], [59, 3.2, -110.4]], 10);
        for (let i = 0; i < 4; i++) { const x = 1.5 + i * 16.5 + 6.9; b.pipe(C.pipeSea, 0.12, [[x, 3.2, -110.4], [x, 3.2, -72], [x, F, -72]], 8); }
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
        // sea water intake room
        for (let k = 0; k < 4; k++) { const box = E.pump(b, 5 + k * 4.2, -125.5, { ry: Math.PI / 2, s: 1.7 }); b.use('satin').pipe(C.pipeSea, 0.3, [[5 + k * 4.2, 0.9, -127], [5 + k * 4.2, 0.9, -129.6]], 10); if (k === 0) ctx.item({ code: 'IP', group: 'Sea water intake', name: 'Intake pumps', kind: 'Drawing in Gulf water', box: [box[0], 0, box[2], 5 + 3 * 4.2 + 1.4, 2, box[5]], label: true,
          desc: 'Four pumps lift sea water from the screened intake offshore. Three run and one stands by, so a pump can be serviced without the tanks noticing.',
          specs: [['4', 'Pumps'], ['3 + 1', 'Duty and standby'], ['Screened', 'Intake']], live: [{ k: 'Pumps running', u: 'of 4', v: 3, d: 0, lo: 0, hi: 4, p: 0 }, { k: 'Intake flow', u: 'm³/h', v: 640, d: 10, lo: 300, hi: 900, p: 0 }, { k: 'Sea temperature', u: '°C', v: 28.4, d: 0.2, lo: 18, hi: 35, p: 1 }] }); }
        for (let k = 0; k < 3; k++) { const box = E.sandFilter(b, 6 + k * 4.4, -117, 1.5, 2.6); if (k === 0) ctx.item({ code: 'SF-I', group: 'Sea water intake', name: 'Intake sand filters', kind: 'First cleaning step', box: [box[0], 0, box[2], 6 + 2 * 4.4 + 1.9, box[4], box[5]],
          desc: 'Raw sea water is pushed down through beds of graded sand that trap silt, plankton and larvae of other animals. The beds are washed in reverse when the pressure rises.',
          specs: [['3', 'Vessels'], ['20 µm', 'Removes down to'], ['Auto', 'Backwash']], live: [{ k: 'Pressure drop', u: 'bar', v: 0.42, d: 0.03, lo: 0.1, hi: 1, p: 2 }] }); }
        const uvI = E.uvBank(b, 21.5, -117.5, { n: 5 }); b.use('satin').box(C.clayCool, 1.6, 2.0, 1.2, 26, F, -125); b.cyl(C.white, 0.5, 3.2, 27.8, F, -121.5, 14); b.use('glow').box(0x9fd8ff, 0.5, 0.3, 0.02, 26, F + 1.3, -124.38);
        ctx.item({ code: 'UVO', group: 'Sea water intake', name: 'UV and ozone treatment', kind: 'Nothing unwanted gets in', box: [19.5, 0, -126, 28.6, 3.4, -116], label: true,
          desc: 'After the sand filters the water is dosed with ozone in the contact column, then passes ultraviolet lamps. Together they stop wild pathogens from ever reaching the broodstock.',
          specs: [['UV + O₃', 'Two barriers'], ['Biosecure', 'Entry point']], live: [{ k: 'UV dose', u: 'mJ/cm²', v: 124, d: 3, lo: 80, hi: 160, p: 0 }, { k: 'Redox', u: 'mV', v: 318, d: 6, lo: 250, hi: 380, p: 0 }] });
        E.panel(b, 29.3, -118, { ry: -Math.PI / 2 });
        E.pipeRack(b, [[5, -122], [18, -122], [18, -113]], 3.0, [C.pipeSea], 0.2);
        yellowLine(b, -9.4, -68.9, 61.4, -68.9);
        staff(ctx, R, [[10, -90, 'overall', 1.9], [38, -90, 'coat', 1.9], [57, -96.6, 'coat'], [26, -70.5, 'overall'], [14, -121, 'overall'], [51.5, -90, 'overall', 1.9]]);
      },
    });
  }

  /* ══════════ 07 · Plant Room ══════════ */
  {
    const r = PLANT;
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet();
    hall(lo, hi, { ...r, h: PLANT.h, seed: 7, wall: C.clayCool, doors: { s: [{ at: 14, w: 4.5 }, { at: 36, w: 1.4, h: 2.4 }], w: [{ at: 12, w: 1.4, h: 2.4 }] }, windows: { s: { n: 4 }, e: { n: 3 } } });
    // outdoors: chillers and the liquid oxygen store
    const ch = [E.chiller(lo, 128.5, -103, { ry: Math.PI / 2, y: 0.06 }), E.chiller(lo, 128.5, -97.5, { ry: Math.PI / 2, y: 0.06 })];
    const lox = E.vTank(lo, 79.5, -100, { r: 1.5, h: 7 }); lo.use('satin'); for (let k = 0; k < 5; k++) lo.box(C.alu, 0.12, 2.4, 1.6, 78.2 + k * 0.55, 0.06, -94.6); lo.pipe(C.pipeO2, 0.06, [[79.5, 0.5, -98.4], [79.5, 0.5, -95], [79.5, 2.8, -95], [84.2, 2.8, -95]], 6);
    lo.use('matte'); for (const [x, z] of [[76.6, -103], [82.6, -103], [76.6, -93], [82.6, -93]]) lo.cyl(C.yellow, 0.07, 1.1, x, 0.05, z, 6);
    ao.push(r);
    areas.add({
      id: 'plantroom', low: lo.build(mats), high: roofNo(hi.build(roof), roof, '07', 104, PLANT.h + 0.46, -96, 10), roofMats: roof, lift: 7, hit: [[r.x0, 0, r.z0, r.x1, PLANT.h, r.z1]], pin: [104, PLANT.h + 6, -96],
      pose: P(104, 2, -96, -0.45, 0.94, 112), inside: P(104, 1, -96.5, -0.3, 0.66, 62), plan: P(104, 0, -96, 0, 0.14, 74),
      makeInterior(b, ctx) {
        const R = rng(71);
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
    const r = GEN;
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet();
    hall(lo, hi, { ...r, h: GEN.h, seed: 8, wall: C.clayCool, doors: { s: [{ at: 8, w: 4 }, { at: 26, w: 1.4, h: 2.4 }], e: [{ at: 10, w: 1.4, h: 2.4 }] }, windows: {}, roofKit: false });
    for (let k = 0; k < 3; k++) { hi.use('metal').cyl(C.alu, 0.28, 3.2, 144.2, GEN.h, -101.2 + k * 5.4, 10); hi.use('matte').cyl(C.steelDark, 0.36, 0.2, 144.2, GEN.h + 3.2, -101.2 + k * 5.4, 10); }
    for (let k = 0; k < 4; k++) lo.use('matte').box(C.steelDark, 3.4, 2.2, 0.08, 139 + k * 4.4, 2.6, -106.02);
    // transformer yard, fuel and fire water
    const tx = E.transformer(lo, 181, -101, { ry: 0 }); lo.use('paving').quad(C.pavingDark, 9, 8, 181, 0.045, -101);
    for (const [x0, z0, x1, z1] of [[176.5, -105, 185.5, -105], [185.5, -105, 185.5, -97], [185.5, -97, 176.5, -97]]) { lo.use('satin').rod(C.steel, 0.03, [x0, 1.6, z0], [x1, 1.6, z1], 4); lo.rod(C.steel, 0.03, [x0, 0.8, z0], [x1, 0.8, z1], 4); const n = 5; for (let k = 0; k <= n; k++) lo.cyl(C.steel, 0.04, 1.7, x0 + ((x1 - x0) * k) / n, 0.05, z0 + ((z1 - z0) * k) / n, 4); }
    const fuel = E.hTank(lo, 180, -89, { len: 6, r: 1.1, hex: 0xd9dde0 }); lo.use('matte').box(C.clayCool, 9.5, 0.35, 4.4, 180, 0.04, -89);
    lo.use('satin').box(0xd7dde0, 7.5, 3.4, 7.5, 151, 0.06, -75); lo.use('matte'); for (let k = 0; k < 4; k++) { lo.box(0xbfc8cc, 7.56, 0.06, 0.06, 151, 0.9 + k * 0.85, -71.24); lo.box(0xbfc8cc, 0.06, 0.06, 7.56, 147.24, 0.9 + k * 0.85, -75); }
    lo.use('satin').box(C.red, 2.6, 2.2, 2.2, 158.5, 0.06, -76); lo.pipe(C.red, 0.1, [[154.8, 0.5, -76], [157.2, 0.5, -76]], 8);
    ao.push(r);
    areas.add({
      id: 'genroom', low: lo.build(mats), high: roofNo(hi.build(roof), roof, '08', 155, GEN.h + 0.46, -96, 9), roofMats: roof, lift: 7, hit: [[r.x0, 0, r.z0, r.x1, GEN.h, r.z1]], pin: [153, GEN.h + 6, -96],
      pose: P(158, 2, -94, -0.4, 0.94, 112), inside: P(155, 1, -95, -0.25, 0.66, 60), plan: P(156, 0, -94, 0, 0.14, 72),
      makeInterior(b, ctx) {
        const R = rng(81);
        for (let k = 0; k < 3; k++) { const box = E.genset(b, 143.5, -101.2 + k * 5.4); ctx.item({ code: `G${k + 1}`, group: 'Generators', name: `Standby generator G${k + 1}`, kind: 'Diesel, automatic start', box, label: k === 0,
          desc: 'A diesel generator sized to carry pumps, oxygen and controls. If the grid drops it starts by itself within seconds. Two cover the full load, so the third is a spare.',
          specs: [['3', 'Sets, N+1'], ['< 10 s', 'To take load'], ['Weekly', 'Test run']], live: [{ k: 'Status', text: 'Standby, ready' }, { k: 'Battery', u: 'V', v: 27.2, d: 0.1, lo: 24, hi: 28.5, p: 1 }, { k: 'Coolant heater', u: '°C', v: 42, d: 0.6, lo: 35, hi: 50, p: 0 }, { k: 'Last test run', text: fmtDate(3 + k) }] }); }
        const sg = E.switchgear(b, 166.4, -96, { ry: -Math.PI / 2, n: 12 });
        ctx.item({ code: 'SWG', group: 'Distribution', name: 'Main switchgear', kind: 'Power distribution', box: sg, label: true,
          desc: 'Low-voltage panels that share power between the hatchery, the broodstock building and the plant room. Each outgoing circuit is metered and can be isolated on its own.',
          specs: [['12', 'Panels'], ['Metered', 'Every feeder']], live: [{ k: 'Load', u: 'kW', v: 386, d: 6, lo: 150, hi: 700, p: 0 }, { k: 'Supply', text: 'Grid' }, { k: 'Frequency', u: 'Hz', v: 50.0, d: 0.02, lo: 49.5, hi: 50.5, p: 2 }] });
        const ats = E.panel(b, 157, -104.9, { w: 2.4, screen: 0xffcf7a });
        ctx.item({ code: 'ATS', group: 'Distribution', name: 'Automatic transfer switch', kind: 'Grid to generator', box: ats,
          desc: 'Watches the grid supply. The moment it fails, this switch starts the generators and moves the load across, then moves it back when the grid is steady again.',
          specs: [['Automatic', 'Changeover'], ['Both ways', 'Transfer']], live: [{ k: 'Position', text: 'On grid' }] });
        E.hTank(b, 152, -88.4, { len: 2.6, r: 0.6, hex: 0xd9dde0, y: F });
        ctx.item({ code: 'TX', group: 'Outside', name: 'Transformer', kind: 'Grid connection', box: tx, label: true,
          desc: 'Steps the utility supply down to the voltage the site uses. It sits in its own fenced yard outside the building.',
          specs: [['Step-down', 'Type'], ['Fenced', 'Yard']], live: [{ k: 'Oil temperature', u: '°C', v: 58, d: 0.8, lo: 30, hi: 85, p: 0 }] });
        ctx.item({ code: 'FUEL', group: 'Outside', name: 'Fuel tank', kind: 'Diesel for the generators', box: fuel,
          desc: 'Bunded diesel storage sized so the generators can run for days without a delivery.',
          specs: [['Bunded', 'Double wall'], ['Days', 'Autonomy']], live: [{ k: 'Level', u: '%', v: 84, d: 0, lo: 20, hi: 100, p: 0 }] });
        ctx.item({ code: 'FW', group: 'Outside', name: 'Fire-water tank and pump', kind: 'Site fire protection', box: [147.2, 0, -78.8, 159.9, 3.6, -71.2],
          desc: 'A dedicated reserve of water with its own pump, kept full and tested for the site\'s fire system.',
          specs: [['Dedicated', 'Reserve'], ['Diesel', 'Pump drive']], live: [{ k: 'Level', u: '%', v: 100, d: 0, lo: 80, hi: 100, p: 0 }] });
        b.use('satin'); E.pipeRack(b, [[146.5, -104], [163, -104]], 3.0, [C.steel], 0.14);
        yellowLine(b, 149, -105, 149, -87); yellowLine(b, 149, -93.4, 164, -93.4);
        staff(ctx, R, [[152, -98, 'hivis'], [162, -92, 'overall']]);
      },
    });
  }

  /* ══════════ 09 · Phase 1 Hatchery ══════════ */
  {
    const lo = new Builder(), hi = new Builder(), roof = mats.roofSet(), A = P1.a, B = P1.b, O = P1.office, PLn = P1.plant, Gn = P1.gen;
    const old = 0xece5d6; // the original buildings are a shade warmer
    hall(lo, hi, { ...A, h: P1.h, seed: 9, wall: old, doors: { n: [{ at: 20, w: 4.5 }, { at: 60, w: 1.4, h: 2.4 }], s: [{ at: 40, w: 1.4, h: 2.4 }], e: [{ at: 18, w: 2.4, h: 2.6 }] }, windows: { n: { n: 9 }, s: { n: 9 } } });
    hall(lo, hi, { ...B, h: P1.h, seed: 10, wall: old, doors: { n: [{ at: 30, w: 4.5 }, { at: 70, w: 4.5 }], s: [{ at: 20, w: 1.4, h: 2.4 }], w: [{ at: 18, w: 2.4, h: 2.6 }] }, windows: { n: { n: 10 }, s: { n: 10 } } });
    hall(lo, hi, { ...O, h: 4.6, seed: 11, wall: old, floor: C.floor, doors: { n: [{ at: 20, w: 1.6, h: 2.4 }] }, windows: { n: { n: 6, y: 2.2, h: 1.4, w: 3 }, s: { n: 6, y: 2.2, h: 1.4, w: 3 }, w: { n: 3, y: 2.2, h: 1.4, w: 3 } }, strip: false });
    hall(lo, hi, { ...PLn, h: 6, seed: 12, wall: C.clayCool, doors: { n: [{ at: 8, w: 4 }], e: [{ at: 10, w: 1.4, h: 2.4 }] }, windows: {} });
    hall(lo, hi, { ...Gn, h: 5, seed: 13, wall: C.clayCool, doors: { n: [{ at: 6, w: 3.6 }] }, windows: {}, roofKit: false });
    // header tanks on steel towers
    const ht = [];
    for (let k = 0; k < 3; k++) {
      const x = 76 + k * 9.5, z = 130;
      lo.use('satin'); for (const [dx, dz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) lo.cyl(C.steelDark, 0.13, 6, x + dx, 0.05, z + dz, 6);
      for (const yy of [2, 4]) { lo.rod(C.steelDark, 0.06, [x - 2.4, yy, z - 2.4], [x + 2.4, yy + 2, z - 2.4], 4); lo.rod(C.steelDark, 0.06, [x - 2.4, yy, z + 2.4], [x + 2.4, yy + 2, z + 2.4], 4); lo.rod(C.steelDark, 0.06, [x - 2.4, yy + 2, z - 2.4], [x - 2.4, yy, z + 2.4], 4); lo.rod(C.steelDark, 0.06, [x + 2.4, yy + 2, z - 2.4], [x + 2.4, yy, z + 2.4], 4); }
      lo.use('metal').box(0xaab4ba, 5.6, 0.14, 5.6, x, 6, z);
      E.roundTank(lo, x, z, 2.5, 2.8, { wall: C.grpBlue, water: C.waterTank, y: 6.14, standpipe: false, inlet: false });
      lo.use('satin').pipe(C.pipeSea, 0.14, [[x, 6.1, z], [x, 0.4, z], [x, 0.4, z - 9]], 8);
      ht.push([x - 2.8, 0, z - 2.8, x + 2.8, 9, z + 2.8]);
    }
    ao.push(A, B, O, PLn, Gn);
    areas.add({
      id: 'phase1', low: lo.build(mats), high: roofNo(hi.build(roof), roof, '09', 15, P1.h + 0.46, 90, 14), roofMats: roof, lift: 7, hit: [A, B, O, PLn, Gn].map((q, i) => [q.x0, 0, q.z0, q.x1, i < 2 ? P1.h : 5, q.z1]), pin: [64, P1.h + 7, 92],
      pose: P(64, 2, 104, -0.5, 0.95, 196), inside: P(62, 1, 100, -0.3, 0.72, 132), plan: P(64, 0, 104, 0, 0.14, 156),
      makeInterior(b, ctx) {
        const R = rng(91);
        // hall A: broodstock (west) and hatchery (east)
        partition(b, 1, A.z0 + 0.5, 1, A.z1 - 0.5, [{ at: 17.5, w: 2.4 }]);
        for (let k = 0; k < 4; k++) { const x = -18.5 + (k % 2) * 11.5, z = 81 + Math.floor(k / 2) * 18; const s = BROODSTOCK_TANKS[[0, 1, 2, 3][k]];
          const box = E.roundTank(b, x, z, 4.7, 1.6, { wall: C.grpDark, water: C.waterDeep });
          ctx.school({ x, z, rx: 3.4, rz: 3.4, r0: 0.3, y0: F + 0.7, y1: F + 1.3, n: 9, sp: s.sp, len: 0.68, speed: 0.12 });
          ctx.item({ code: `P1-B${k + 1}`, group: 'Hall A, broodstock', name: `Phase 1 broodstock tank B${k + 1}`, kind: s.name, box, label: k === 0,
            desc: 'One of the original breeding tanks. The first generations of hatchery-born fish at the centre came from the parents held in this hall.',
            card: [['Tank', `P1-B${k + 1}`], ['Species', s.name], ['Breeders', String(14 + k * 3)]], specs: [['9.4 m', 'Diameter'], ['95 m³', 'Volume']], live: wq(26.6, 39.3, 6.6), stage: 'broodstock' }); }
        for (let rr = 0; rr < 3; rr++) for (let c = 0; c < 6; c++) { const x = 8.5 + c * 7.6, z = 79.5 + rr * 10.5, kind = ['Incubation', 'Larval', 'Larval'][rr];
          const box = E.roundTank(b, x, z, 1.9, 1.3, { wall: C.grp, water: rr === 0 ? C.waterClear : C.waterGreen });
          ctx.item({ code: `P1-${rr + 1}${c + 1}`, group: 'Hall A, hatchery', name: `Phase 1 tank P1-${rr + 1}${c + 1}`, kind: `${kind} unit`, box, label: rr === 1 && c === 2,
            desc: 'A flat-bottomed round tank from the first production stream. Phase 1 still runs alongside Phase 2, which lets the team stagger batches and keep fry available through the year.',
            specs: [['12 m³', 'Volume'], [kind, 'Use']], live: wq(26.3, 39.1, 6.8) });
          ctx.specks({ x0: x - 1.3, z0: z - 1.3, x1: x + 1.3, z1: z + 1.3, y: F + 0.8, n: 50, size: 0.07, round: true }); }
        // hall B: nursery tanks and short raceways
        for (let rr = 0; rr < 2; rr++) for (let c = 0; c < 7; c++) { const x = 75 + c * 7, z = 81 + rr * 18;
          const box = E.squareTank(b, x, z, 5, 5, 1.2, { wall: C.grpBlue });
          ctx.item({ code: `P1-N${rr * 7 + c + 1}`, group: 'Hall B, nursery', name: `Phase 1 nursery tank N${rr * 7 + c + 1}`, kind: 'Nursery unit', box, label: rr === 0 && c === 3,
            desc: 'Square nursery tanks with rounded corners, the layout the centre began with. Juveniles are held here between weaning and transfer.',
            specs: [['25 m³', 'Volume'], ['Square', 'Shape']], live: wq(27.0, 39.2, 6.9), stage: 'nursery' });
          ctx.specks({ x0: x - 2, z0: z - 2, x1: x + 2, z1: z + 2, y: F + 0.75, n: 140, size: 0.12 }); }
        for (let k = 0; k < 3; k++) { const z = 79 + k * 9; const box = E.raceway(b, 126, z - 2.1, 154, z + 2.1);
          ctx.item({ code: `P1-R${k + 1}`, group: 'Hall B, nursery', name: `Phase 1 raceway R${k + 1}`, kind: 'Weaning and grading', box,
            desc: 'A shorter raceway used for weaning and for holding graded fish before dispatch.', specs: [['28 m', 'Length'], ['50 m³', 'Volume']], live: wq(27.1, 39.2, 6.9), stage: 'nursery' });
          ctx.specks({ x0: 127, z0: z - 1.7, x1: 152, z1: z + 1.7, y: F + 0.62, n: 420, size: 0.14 }); }
        for (let k = 0; k < 3; k++) E.pallet(b, 128 + k * 2.4, 104.5, { hex: C.clayWarm });
        // office
        E.deskPod(b, -18, 126); E.deskPod(b, -18, 134.5); E.deskPod(b, -9, 126); E.meetingTable(b, 3, 133.5, { len: 4.2 }); E.sofa(b, 8, 123, { ry: Math.PI }); E.planter(b, 12.6, 122);
        ctx.item({ code: 'P1-OF', group: 'Support', name: 'Phase 1 office', kind: 'Hatchery team', box: [O.x0, 0, O.z0, O.x1, 2.2, O.z1], label: true,
          desc: 'Working space for the hatchery managers and technicians, a few steps from the tanks they look after.', specs: [['12', 'Desks'], ['1', 'Meeting room']] });
        // plant
        E.sandFilter(b, 36, 125, 1.2, 2.3); E.sandFilter(b, 39.6, 125, 1.2, 2.3); E.biofilter(b, 50, 127, 2.6, 2.4); E.drumFilter(b, 37.5, 135, {}); E.pump(b, 46, 136.5, {}); E.pump(b, 48.4, 136.5, {}); E.uvBank(b, 57, 135, { n: 3, ry: Math.PI / 2 }); E.panel(b, 60.8, 126, { ry: -Math.PI / 2 });
        ctx.item({ code: 'P1-PL', group: 'Support', name: 'Phase 1 plant room', kind: 'Its own water treatment', box: [PLn.x0, 0, PLn.z0, PLn.x1, 3.5, PLn.z1], label: true,
          desc: 'Phase 1 has a separate treatment line: sand filters, a biofilter, a drum filter and UV. Keeping the two phases on separate water is a biosecurity choice. A problem in one cannot spread to the other.',
          specs: [['Separate', 'From Phase 2'], ['4', 'Treatment steps']], live: [{ k: 'Flow', u: 'm³/h', v: 240, d: 5, lo: 100, hi: 360, p: 0 }, { k: 'Water reused', u: '%', v: 91.2, d: 0.3, lo: 80, hi: 98, p: 1 }] });
        ctx.item({ code: 'HT', group: 'Support', name: 'Header tanks', kind: 'Gravity supply', box: [ht[0][0], 0, ht[0][2], ht[2][3], 9, ht[0][5]], label: true,
          desc: 'Three tanks on steel towers hold treated sea water above the halls. Water reaches the tanks by gravity, so the fish still get flow for a while even if every pump stops.',
          specs: [['3', 'Tanks'], ['6 m', 'Tower height'], ['Gravity', 'Feed']], live: [{ k: 'Level', u: '%', v: 87, d: 0.6, lo: 50, hi: 100, p: 0 }] });
        const g1 = E.genset(b, 142, 130);
        ctx.item({ code: 'P1-G', group: 'Support', name: 'Phase 1 generator', kind: 'Back-up power', box: g1,
          desc: 'The original standby generator. It still protects the Phase 1 halls and backs up the main generator room.', specs: [['Diesel', 'Fuel'], ['Automatic', 'Start']], live: [{ k: 'Status', text: 'Standby, ready' }] });
        E.pipeRack(b, [[A.x0 + 2, A.z0 + 1.2], [A.x1 - 2, A.z0 + 1.2]], 3.3, [C.pipeSea, C.pipeTreat], 0.1); E.pipeRack(b, [[B.x0 + 2, B.z0 + 1.2], [B.x1 - 2, B.z0 + 1.2]], 3.3, [C.pipeSea, C.pipeTreat], 0.1);
        staff(ctx, R, [[-12, 90, 'overall'], [20, 85, 'overall'], [40, 96, 'coat'], [90, 90, 'overall'], [118, 90.4, 'overall'], [140, 101, 'hivis'], [-14, 130.4, 'office'], [2, 131.7, 'office'], [44, 131, 'overall']]);
      },
    });
  }
  world.scene.add(aoSkirts(ao));
  // keep the roof numbers the right way up for wherever the camera is
  let turn = null;
  world.updaters.push(() => { const az = world.rig.drone ? world.rig.drone.yaw + Math.PI : world.rig.cur.az, q = Math.round(az / (Math.PI / 2)) * (Math.PI / 2); if (q === turn) return; turn = q; for (const m of roofNos) { m.rotation.y = q; m.updateMatrix(); m.matrixWorldNeedsUpdate = true; } });
}
