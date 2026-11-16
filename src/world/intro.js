// The opening: the camera starts at the gate, where the Emirati host welcomes you under the flag, and goes straight to
// area 08, the Education and Visitor Centre, which stands finished on a blueprint of the rest of the site. Its roof lifts,
// what is inside pops up, and its rooms and exhibits are called out one by one. Then the camera pulls out and everything
// else fills in the way it would really be built: services are drawn in (sea water from the intake, power from the
// generators), the roads are paved from the gate inward, the paving flows out to the apron, plazas, lawns and parking and
// the street lights go up behind it. The buildings go up phase by phase (1, 2, 3): each starts as its slab and rises from
// the ground with a glowing cut line, a tower crane working beside each phase. The cages come up out of the sea,
// LFC Hamour sails in, the planting grows, the site comes to life and the camera settles into the hero view.
import * as THREE from 'three';
import { P } from './rig.js';
import { clamp, easeIO, easeOut, smooth } from './kit.js';
import { AREAS, PHASES, areaById } from '../data/areas.js';
import * as L from './layout.js';
import { revealMap, groundMat, riseMat, riseDepth, makeCrane, RV_GLSL } from './intro-build.js';

const backOut = (t) => { const s = 1.25; t -= 1; return t * t * ((s + 1) * t + s) + 1; };
const win = (t, a, d) => clamp((t - a) / d, 0, 1);
const TINY = 1e-4;
const FIRST = 'visitor';                   // the area the film opens on (08)
const ISLAND = 96;                         // metres round it that are already paved and planted when the film starts

/** timeline, in seconds */
const T = {
  gate: 0, fly: 2.0,
  bp: 2.2, draw0: 2.5, draw1: 6.0,
  open: 5.8, items: 7.2, gap: 0.9,
  close: 15.5,
  util0: 15.2, util1: 17.8,
  infra: 15.8, pace: 1.3,
  p1: 18.2, p2: 20.0, p3: 22.0,
  sea: 23.0, boat: 23.3, life: 24.4, settle: 26.5, end: 28.8,
};
const SLAB = 0.42, SLAB_T = 0.32, HOLD = 0.22;   // each building: its slab first, a breath, then the walls rise

export function createIntro(world, { hero }) {
  const { scene, areas, rig, engine, env } = world;
  const A = areas.byId, named = (n) => scene.children.find((o) => o.name === n);
  const GX = L.GATE.sign[0] - 30.5;                    // the barrier line: west of it is the public road, there from the start
  // first shot: from the road outside the gatehouse, looking in under the canopy at the host by the name wall
  const hx = L.GATE.host[0], hz = L.GATE.host[1];
  const gate = P(L.GATE.sign[0] - 24, 2.4, (L.RB_W ? L.RB_W.z : hz) + 5, -1.64, 1.5, 64);   // down the road outside, over the gatehouse canopy
  // area 08 is there from the first frame: its inside is built now, and shown once so it is compiled under the loader
  const V = A[FIRST]; areas.ensure(V); if (V.interior) V.interior.visible = true;
  const vc = V.toWorld(0, 0), inIsland = (x, z) => Math.hypot(x - vc[0], z - vc[1]) < ISLAND;
  const ph = { 1: [], 2: [], 3: [] };
  for (const d of AREAS) if (d.id !== 'seacages' && d.id !== FIRST && A[d.id]) ph[d.phase].push(A[d.id]);
  const builds = [...ph[1], ...ph[2], ...ph[3], V];
  const sea = A.seacages.root, lfc = world.cages && world.cages.lfc;
  const cages = (world.cages && world.cages.cages) || [];

  /* ───── where and when the ground gets built ───── */
  const map = revealMap(world, { gateX: GX });
  const G = { map: { value: map.tex }, box: { value: map.uBox }, p: { value: -1 }, rise: { value: 3.2 }, pre: { value: new THREE.Vector4(vc[0], vc[1], ISLAND, 0) } };
  const hard = world.land.hardscape, swaps = [];             // [mesh, original, copy] while the film plays
  const helpers = new THREE.Group(); helpers.name = 'intro-helpers'; helpers.visible = false;
  const helper = (mesh, mat) => helpers.add(mesh.isInstancedMesh ? new THREE.InstancedMesh(mesh.geometry, mat, 1) : new THREE.Mesh(mesh.geometry, mat));
  const groundSwaps = [];
  { const cache = new Map(); hard.traverse((m) => { if (!m.isMesh || Array.isArray(m.material) || !(m.material.isMeshStandardMaterial || m.material.isMeshBasicMaterial)) return; let c = cache.get(m.material); if (!c) { c = groundMat(m.material, G); cache.set(m.material, c); helper(m, c); } groundSwaps.push([m, m.material, c]); }); }

  /* ───── each area: material copies that build it from the ground up ───── */
  const box3 = new THREE.Box3();
  const wbox = (a) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const b of a.hit || []) for (const [x, z] of [[b[0], b[2]], [b[3], b[2]], [b[3], b[5]], [b[0], b[5]]]) { const w = a.toWorld(x, z); x0 = Math.min(x0, w[0]); x1 = Math.max(x1, w[0]); z0 = Math.min(z0, w[1]); z1 = Math.max(z1, w[1]); } return { x0, x1, z0, z1, x: (x0 + x1) / 2, z: (z0 + z1) / 2 }; };
  const cons = [];
  for (const k of [1, 2, 3]) ph[k].forEach((a, i) => {
    const gap = ph[k].length > 3 ? 0.27 : 0.42, t0 = T['p' + k] + i * gap;
    box3.setFromObject(a.root); const top = Math.max(2, box3.max.y + 0.3), rise = clamp(0.95 + top * 0.035, 1.1, 1.7);
    const R = { h: { value: -1 }, g: { value: 1 } }, depth = riseDepth(R), cache = new Map(), ms = [], hide = [];
    a.root.traverse((m) => {
      if (!(m.isMesh || m.isPoints || m.isLine)) return;
      const ok = m.isMesh && !m.isSkinnedMesh && !Array.isArray(m.material) && (m.material.isMeshStandardMaterial || m.material.isMeshBasicMaterial);
      if (!ok) { hide.push([m, m.visible]); return; }
      let c = cache.get(m.material); if (!c) { c = riseMat(m.material, R); cache.set(m.material, c); helper(m, c); }
      ms.push([m, m.material, c, m.customDepthMaterial]);
    });
    cons.push({ a, k, t0, top, rise, done: t0 + SLAB_T + HOLD + rise + 0.05, R, depth, ms, hide, state: -1, box: wbox(a) });
  });
  const phaseDone = { 1: 0, 2: 0, 3: 0 }; for (const c of cons) phaseDone[c.k] = Math.max(phaseDone[c.k], c.done);
  scene.add(helpers);                                        // compiled with the rest by compileAsync, removed in prepare()

  /* ───── tower cranes, one per phase, on clear ground near the middle of the phase ───── */
  const roadsW = Object.values(world.land.roads || {});
  const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz || 1, u = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l, 0, 1); return Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u); };
  const clearAt = (x, z) => {
    for (const a of builds) for (const b of a.hit || []) { const [lx, lz] = a.toLocal(x, z); if (Math.hypot(Math.max(b[0] - lx, 0, lx - b[3]), Math.max(b[2] - lz, 0, lz - b[5])) < 5.5) return false; }
    for (const p of roadsW) for (let i = 0; i < p.length - 1; i++) if (segD(x, z, p[i], p[i + 1]) < 10.5) return false;
    return true;
  };
  const spot = (x, z) => { if (clearAt(x, z)) return [x, z]; for (let r = 4; r <= 110; r += 4) { const n = Math.ceil((Math.PI * 2 * r) / 4); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (clearAt(px, pz)) return [px, pz]; } } return [x, z]; };
  const craneG = new THREE.Group(); craneG.name = 'intro-cranes'; craneG.visible = false;
  const cranes = [1, 2, 3].map((k) => {
    const list = cons.filter((c) => c.k === k); if (!list.length) return null;
    let cx = 0, cz = 0; for (const c of list) { cx += c.box.x; cz += c.box.z; } cx /= list.length; cz /= list.length;
    const [x, z] = spot(cx, cz), tall = Math.max(...list.map((c) => c.top)), span = Math.max(...list.map((c) => Math.max(c.box.x1 - c.box.x0, c.box.z1 - c.box.z0)));
    const cr = makeCrane(world.mats, { H: Math.round(tall + 28), jib: clamp(span * 0.45, 36, 54), cjib: 14 });
    cr.root.position.set(x, -400, z); craneG.add(cr.root);
    return { ...cr, k, x, z, base: Math.atan2(-(cz - z), cx - x), t0: T['p' + k] - 0.45, t1: phaseDone[k] + 0.15 };
  }).filter(Boolean);
  scene.add(craneG);

  /* ───── the blueprint: a sheet of drawing paper laid over the site with a grid, and every line drawn on it ───── */
  const BP = { x: -40, z: 70, r0: 300, r1: 430 };
  const U = { uOp: { value: 0 }, uLop: { value: 0 }, uUop: { value: 0 }, uDraw: { value: 0 }, uUtil: { value: 0 }, uT: { value: 0 }, uRvMap: G.map, uRvBox: G.box, uRvP: G.p, uRvPre: G.pre };
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(BP.r1 * 2.2, BP.r1 * 2.2).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uOp, uT; ${RV_GLSL.decl} varying vec2 vW;
      float grid(vec2 p, float s, float w){ vec2 g = abs(fract(p / s - 0.5) - 0.5) * s; vec2 fw = fwidth(p) * w; vec2 l = 1.0 - smoothstep(vec2(0.0), fw, g); return max(l.x, l.y); }
      void main(){
        vec3 vRvW = vec3(vW.x, 0.0, vW.y);
        ${RV_GLSL.at}
        float built = smoothstep(0.0, 1.3, rvAge) * step(-5.0, rvAt);
        float d = distance(vW, vec2(${BP.x.toFixed(1)}, ${BP.z.toFixed(1)}));
        float edge = 1.0 - smoothstep(${BP.r0.toFixed(1)}, ${BP.r1.toFixed(1)}, d);
        float g = grid(vW, 10.0, 1.0) * 0.32 + grid(vW, 50.0, 1.6) * 0.55;
        vec3 col = mix(vec3(0.07, 0.30, 0.55), vec3(0.86, 0.95, 1.0), g);
        gl_FragColor = vec4(col, uOp * edge * (0.78 + 0.22 * g) * (1.0 - 0.88 * built));
        #include <colorspace_fragment>
      }` }));
  paper.position.set(BP.x, 0.52, BP.z); paper.renderOrder = 5; paper.frustumCulled = false;

  // linework: ribbons revealed in drawing order. kind 0 footprint, 1 road centre line, 2 sea water main, 3 power cable
  const pos = [], tt = [], kk = [], ss = [], idx = [];
  const ribbon = (pts, t0, t1, { closed = true, w = 0.9, y = 0.62, kind = 0, tAt = null } = {}) => {
    const P2 = closed ? pts.concat([pts[0]]) : pts; let len = 0; const Ls = [0];
    for (let i = 1; i < P2.length; i++) { len += Math.hypot(P2[i][0] - P2[i - 1][0], P2[i][1] - P2[i - 1][1]); Ls.push(len); }
    if (len < 0.5) return;
    for (let i = 0; i < P2.length - 1; i++) {
      const a = P2[i], c = P2[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = (-dz / l) * w * 0.5, nz = (dx / l) * w * 0.5, b0 = pos.length / 3;
      const ta = tAt ? tAt(a) : t0 + (t1 - t0) * (Ls[i] / len), tc = tAt ? tAt(c) : t0 + (t1 - t0) * (Ls[i + 1] / len);
      pos.push(a[0] - nx, y, a[1] - nz, a[0] + nx, y, a[1] + nz, c[0] + nx, y, c[1] + nz, c[0] - nx, y, c[1] - nz); tt.push(ta, ta, tc, tc); kk.push(kind, kind, kind, kind); ss.push(Ls[i], Ls[i], Ls[i + 1], Ls[i + 1]);
      idx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
    }
  };
  // road centre lines, drawn outward from the gate in the order they will be paved
  for (const [name, pts] of Object.entries(world.land.roads || {})) { const inside = pts.filter((p) => p[0] > GX - 4); if (inside.length > 1) ribbon(inside, 0, 0.3, { closed: name === 'rbW' || name === 'rbE', w: 1.1, y: 0.6, kind: 1, tAt: (p) => 0.02 + 0.28 * clamp(map.sample(p[0], p[1]) / map.roadDur, 0, 1) }); }
  // footprints, phase by phase, then the cages
  const rect = (a, b) => { const [x0, , z0, x1, , z1] = b; return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => a.toWorld(x, z)); };
  const lists = { 1: [], 2: [], 3: [] };
  for (const d of AREAS) { const a = A[d.id]; if (!a || d.id === 'seacages' || d.id === FIRST) continue; for (const b of a.hit || []) lists[d.phase].push(rect(a, b)); }
  const span = { 1: [0.3, 0.5], 2: [0.5, 0.72], 3: [0.72, 0.86] };
  for (const k of [1, 2, 3]) { const l = lists[k], [s0, s1] = span[k]; l.forEach((pts, i) => { const a = s0 + ((s1 - s0) * i) / l.length, b = s0 + ((s1 - s0) * (i + 1.6)) / l.length; ribbon(pts, a, Math.min(s1, b)); }); }
  cages.forEach((c, i) => { const pts = []; for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; pts.push([c.x + Math.cos(a) * c.r, c.z + Math.sin(a) * c.r]); } const a = 0.86 + (0.13 * i) / Math.max(1, cages.length); ribbon(pts, a, a + 0.05, { y: 0.62 }); });
  // services: the sea water main from the offshore intake to every production building, power from the generator room to them all
  const centre = (id) => { const a = A[id]; if (!a || !a.hit || !a.hit.length) return null; const b = wbox(a); return [b.x, b.z]; };
  const L2 = (a, b, xFirst = true) => (xFirst ? [a, [b[0], a[1]], b] : [a, [a[0], b[1]], b]);
  {
    const pump = L.PUMP ? [(L.PUMP.x0 + L.PUMP.x1) / 2, (L.PUMP.z0 + L.PUMP.z1) / 2] : null;
    const intake = L.INTAKE && L.BROOD_FRAME ? [L.BROOD_FRAME.x + (L.INTAKE.x0 + L.INTAKE.x1) / 2, L.BROOD_FRAME.z + (L.INTAKE.z0 + L.INTAKE.z1) / 2] : centre('broodstock');
    if (pump && L.coast) { const off = L.coast(162, 27), beach = L.coast(162, -6); ribbon([off, beach, pump], 0, 0.14, { closed: false, w: 1.7, y: 0.66, kind: 2 }); ribbon(L2(pump, intake, false), 0.14, 0.24, { closed: false, w: 1.7, y: 0.66, kind: 2 }); }
    const prod = ['broodstock', 'plantroom', 'nursery', 'hatchery', 'livefeed', 'phase1'].map(centre).filter(Boolean);
    prod.forEach((c, i) => ribbon(L2(intake, c, i % 2 === 0), 0.24 + i * 0.05, 0.42 + i * 0.05, { closed: false, w: 1.5, y: 0.665, kind: 2 }));
    const gen = centre('genroom');
    if (gen) ['plantroom', 'broodstock', 'livefeed', 'hatchery', 'nursery', 'phase1', 'research', 'visitor'].map(centre).filter(Boolean)
      .forEach((c, i) => ribbon(L2(gen, c, i % 2 === 1), 0.36 + i * 0.06, 0.6 + i * 0.05, { closed: false, w: 1.3, y: 0.67, kind: 3 }));
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1)); lg.setAttribute('aK', new THREE.Float32BufferAttribute(kk, 1)); lg.setAttribute('aS', new THREE.Float32BufferAttribute(ss, 1)); lg.setIndex(idx);
  const lines = new THREE.Mesh(lg, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'attribute float aT, aK, aS; varying float vT, vK, vS; varying vec2 vW; void main(){ vT = aT; vK = aK; vS = aS; vW = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uLop, uUop, uDraw, uUtil, uT; ${RV_GLSL.decl} varying float vT, vK, vS; varying vec2 vW;
      void main(){
        bool util = vK > 1.5; float draw = util ? uUtil : uDraw;
        if (vT > draw) discard;
        vec3 vRvW = vec3(vW.x, 0.0, vW.y);
        ${RV_GLSL.at}
        float paved = smoothstep(0.15, 0.9, rvAge) * step(-5.0, rvAt);
        float head = smoothstep(draw - 0.012, draw, vT);
        vec3 c; float a;
        if (vK < 0.5) { c = mix(vec3(1.0), vec3(1.0, 0.72, 0.35), head); a = uLop; }
        else if (vK < 1.5) { c = mix(vec3(0.93, 0.97, 1.0), vec3(1.0, 0.72, 0.35), head); a = uLop * step(0.4, fract(vS / 7.0)) * (1.0 - paved); }
        else { float flow = smoothstep(0.72, 1.0, fract(vS / 15.0 - uT * 1.7)); c = (vK < 2.5 ? vec3(0.30, 0.80, 1.0) : vec3(1.0, 0.70, 0.24)) * (0.78 + 0.5 * flow); c = mix(c, vec3(1.0), head * 0.6); a = uUop * (1.0 - 0.8 * paved); }
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }` }));
  lines.renderOrder = 6; lines.frustumCulled = false;
  const sheet = new THREE.Group(); sheet.name = 'blueprint'; sheet.add(paper, lines); scene.add(sheet);      // visible (but clear) until prepare(), so it is compiled with the rest

  /* ───── street lights go up behind the paving front; trees grow in a wave from the gate ───── */
  const grows = [];
  const addGrow = (im, startOf, dur, yOnly) => {
    if (!im || !im.isInstancedMesh) return;
    if (!im.boundingSphere) im.computeBoundingSphere();       // from the full-size instances, so nothing is culled while they grow
    const o = im.instanceMatrix.array.slice(), n = im.count, st = new Float32Array(n);
    for (let i = 0; i < n; i++) st[i] = startOf(o[i * 16 + 12], o[i * 16 + 14]);
    grows.push({ im, o, n, st, dur, yOnly, last: new Float32Array(n).fill(-1) });
  };
  const lightsG = named('lights'), plantsG = named('plants');
  if (lightsG) addGrow(lightsG.children.find((c) => c.isInstancedMesh && c.visible), (x, z) => (x < GX || inIsland(x, z) ? -10 : T.infra + map.sample(x, z) / T.pace + 0.12), 0.5, true);
  if (plantsG) for (const im of plantsG.children) addGrow(im, (x, z) => (x < GX || inIsland(x, z) ? -10 : T.life + 0.95 * clamp(map.sample(x, z) / Math.max(1, map.end), 0, 1)), 1.1, false);
  const applyGrow = (g, time) => {
    const a = g.im.instanceMatrix.array, o = g.o; let dirty = false;
    for (let i = 0; i < g.n; i++) {
      const k = win(time, g.st[i], g.dur), s = k >= 1 ? 1 : Math.max(TINY, backOut(k));
      if (s === g.last[i]) continue; g.last[i] = s; dirty = true;
      const b = i * 16, sx = g.yOnly ? 1 : s;
      for (let c = 0; c < 4; c++) { a[b + c] = o[b + c] * sx; a[b + 4 + c] = o[b + 4 + c] * s; a[b + 8 + c] = o[b + 8 + c] * sx; }
    }
    if (dirty) g.im.instanceMatrix.needsUpdate = true;
  };

  /* ───── soft contact shadows round the buildings fade in once the buildings they belong to are up ───── */
  const aos = scene.children.filter((o) => o.name === 'ao' && o.material).map((o) => {
    box3.setFromObject(o); let at = 0; const vb = wbox(V);
    for (const c of cons) if (c.box.x1 > box3.min.x && c.box.x0 < box3.max.x && c.box.z1 > box3.min.z && c.box.z0 < box3.max.z) at = Math.max(at, c.done);
    if (!at && vb.x1 > box3.min.x && vb.x0 < box3.max.x && vb.z1 > box3.min.z && vb.z0 < box3.max.z) at = -5;       // under the area that already stands
    return { o, at: at || T.p3 + 1.5, op: o.material.opacity };
  });

  /* ───── what comes to life at the end; anything new in the scene that we do not know joins it ───── */
  const KNOWN = new Set(['terrain', 'hardscape', 'rocks', 'ao', 'plants', 'lights', 'gate', 'host', 'flags-gate', 'flags-drop', 'blueprint', 'intro-helpers', 'intro-cranes', 'intro-rings', ...AREAS.map((d) => d.id)]);
  const grown = ['site', ...scene.children.filter((o) => o.name && o.visible && !KNOWN.has(o.name) && !['people', 'traffic', 'gulls', 'led-boards', 'site'].includes(o.name) && (o.isGroup || o.isMesh) && !o.isLight).map((o) => o.name)];
  const later = [...new Set(grown)].map(named).filter(Boolean);
  const popped = ['people', 'traffic', 'gulls', 'led-boards'].map(named).filter(Boolean);

  /* ───── call-outs: the things inside area 08, named one after another, each with a ring of light on its floor ───── */
  const calls = ['AQ', 'WD', 'EX-1', 'AMP', 'REC', 'AC-2', 'MDC-1', 'MDC-2', 'CAN'].map((c) => V.items.find((it) => it.code === c)).filter(Boolean);
  const ringGeo = new THREE.RingGeometry(0.93, 1, 72).rotateX(-Math.PI / 2), ringG = new THREE.Group(); ringG.name = 'intro-rings';
  const rings = calls.map((it) => {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xf08a24, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }));
    m.position.set(it.center[0], 0.6, it.center[2]); m.visible = false; m.renderOrder = 7; m.userData.r = clamp(it.size * 0.5, 2.6, 9.5); ringG.add(m); return m;
  });
  scene.add(ringG);
  let opened = false, closed = false, callI = 0;

  /* ───── light: a warmer, low-contrast sun for the gate shot, back to the normal day as the camera rises ───── */
  const GOLD = new THREE.Color(0xffc68a), HAZE = new THREE.Color(0xf4dfc4); let warmOn = false;
  const warm = (k) => {
    if (k <= 0.001) { if (warmOn) { env.apply(); warmOn = false; } return; }
    env.apply(); warmOn = true;
    env.sun.color.lerp(GOLD, 0.5 * k); env.sun.intensity *= 1 + 0.1 * k; env.hemi.intensity *= 1 - 0.18 * k;
    if (env.horizon) env.horizon.lerp(HAZE, 0.4 * k);
  };

  /* ───── state ───── */
  let t = 0, playing = false, resolve = null, stop = null, polMax = 1.4, warmObj = [];
  const keep = new Map(); const remember = (o) => { if (!keep.has(o)) keep.set(o, { s: o.scale.clone(), p: o.position.clone(), v: o.visible }); return keep.get(o); };
  const first = areaById[FIRST];
  const capT = [[T.gate, 'Umm Al Quwain, United Arab Emirates', 'Marhaba. Welcome to the Sheikh Khalifa Marine Research Centre'],
    [T.fly + 0.8, `${first.n} · ${first.name}`, first.line],
    [T.close - 0.15, 'Then the whole centre fills in', 'Roads, sea water and power first'],
    [T.p1, `${PHASES[0].name}`, PHASES[0].title], [T.p2, `${PHASES[1].name}`, PHASES[1].title], [T.p3, `${PHASES[2].name}`, PHASES[2].title], [T.life, 'Today', 'One centre, from egg to sea']];
  let capI = -1;
  // Keep the page framing on the same clock as the final camera move.
  const api = { playing: false, onCaption: null, onPhase: null, onCall: null,
    get time() { return t; }, get settleProgress() { return smooth(win(t, T.settle - 1.4, 2.4)); }, T };

  const swapIn = (list) => { for (const s of list) s[0].material = s[2]; };
  const swapOut = (list) => { for (const s of list) s[0].material = s[1]; };
  function buildState(c, time) {
    const st = time < c.t0 ? 0 : time < c.done ? 1 : 2;
    if (st !== c.state) {
      if (st === 0) { c.a.root.visible = false; swapOut(c.ms); }
      else if (st === 1) { c.a.root.visible = remember(c.a.root).v; swapIn(c.ms); for (const s of c.ms) if (s[0].castShadow) s[0].customDepthMaterial = c.depth; for (const [m] of c.hide) m.visible = false; }
      else finishBuild(c);
      c.state = st;
    }
    if (st === 1) {
      const u = time - c.t0;
      c.R.h.value = u < SLAB_T ? SLAB * easeOut(u / SLAB_T) : u < SLAB_T + HOLD ? SLAB : SLAB + (c.top - SLAB) * easeIO(clamp((u - SLAB_T - HOLD) / c.rise, 0, 1));
      c.R.g.value = 1 - smooth(win(time, c.done - 0.25, 0.25));
    }
  }
  function finishBuild(c) {
    swapOut(c.ms); for (const s of c.ms) s[0].customDepthMaterial = s[3];
    for (const [m, v] of c.hide) m.visible = v; c.a.root.visible = remember(c.a.root).v; c.R.h.value = 1e5;
  }
  function setState(time) {
    t = time;
    warm(1 - smooth(win(t, T.fly - 0.2, 1.6)));
    // the blueprint: paper, linework, services
    const inn = smooth(win(t, T.bp, 1.1));
    U.uOp.value = inn * (1 - smooth(win(t, T.p1 - 0.4, 1.4)));
    U.uLop.value = inn * (1 - smooth(win(t, T.p3 + 1.0, 1.6)));
    U.uUop.value = smooth(win(t, T.util0 - 0.2, 0.6)) * (1 - smooth(win(t, T.p2, 1.4)));
    U.uDraw.value = 1.08 * easeIO(win(t, T.draw0, T.draw1 - T.draw0)) + 0.0001;
    U.uUtil.value = 1.04 * easeIO(win(t, T.util0, T.util1 - T.util0)) + 0.0001;
    U.uT.value = t;
    sheet.visible = Math.max(U.uOp.value, U.uLop.value, U.uUop.value) > 0.002;
    // infrastructure: the reveal map runs on film time after T.infra
    G.p.value = t < T.infra ? -1 : (t - T.infra) * T.pace;
    // area 08: the roof lifts, what is inside pops up from the floor, and its things are called out one by one
    if (!opened && t >= T.open && t < T.close) { opened = true; areas.open(FIRST); }
    if (opened && !closed && t >= T.close) { closed = true; areas.close(FIRST); if (api.onCall) api.onCall(null); }
    if (V.interior) V.interior.scale.y = t < T.open + 1.3 ? Math.max(0.02, backOut(win(t, T.open + 0.15, 1.05))) : 1;
    while (callI < calls.length && t >= T.items + callI * T.gap && t < T.close) { if (api.onCall) api.onCall(calls[callI], callI); callI++; }
    rings.forEach((m, i) => {
      const u = t - (T.items + i * T.gap), out = (1 - smooth(win(u, T.gap * 0.7, 0.45))) * (1 - smooth(win(t, T.close - 0.1, 0.5)));
      if (u < 0 || out <= 0) { m.visible = false; return; }
      const k = easeOut(win(u, 0, 0.8)); m.visible = true; m.scale.setScalar(m.userData.r * (0.3 + 0.7 * k));
      m.material.opacity = (1 - 0.35 * smooth(win(u, 0.5, 0.9)) + 0.12 * Math.sin(u * 3.2)) * out;
    });
    // the buildings, phase by phase
    for (const c of cons) buildState(c, t);
    for (const a of aos) a.o.material.opacity = a.op * smooth(win(t, a.at - 0.2, 0.9));
    // cranes rise out of the ground at the start of their phase, work, and go when the phase is up
    let anyCrane = false;
    for (const c of cranes) {
      const up = easeOut(win(t, c.t0, 0.75)), down = easeIO(win(t, c.t1, 0.7)), k = up * (1 - down);
      c.root.visible = k > 0.002; anyCrane = anyCrane || c.root.visible;
      c.root.position.y = -(c.H + 14) * (1 - k);
      c.top.rotation.y = c.base + 0.5 * Math.sin((t - c.t0) * 0.8);
      c.hook.position.x = c.jib * (0.42 + 0.22 * Math.sin((t - c.t0) * 1.3 + 1));
    }
    craneG.visible = anyCrane;
    // the cages come up out of the sea
    { const k = easeOut(win(t, T.sea, 1.8)), r = remember(sea); sea.position.y = r.p.y - 16 * (1 - k); sea.visible = k > 0 || r.v; world.sea.uniforms.uCageN.value = k > 0.5 ? cages.length : 0; }
    // LFC Hamour sails in from the open sea to the jetty
    if (lfc) { const k = win(t, T.boat, 3.2), e = easeOut(k); lfc.visible = k > 0; lfc.position.x = L.LFC_BERTH.x; lfc.position.z = L.LFC_BERTH.z + 190 * (1 - e); }
    // street lights and trees
    for (const g of grows) applyGrow(g, t);
    // the rest grows, lights and screens go up, people and traffic come out
    later.forEach((o, i) => { const r = remember(o), k = win(t, T.life + i * 0.12, 1.3); o.scale.y = Math.max(TINY, backOut(k)) * r.s.y; o.visible = k > 0 && r.v; });   // hidden until it grows: flattened it still shows as a disc
    popped.forEach((o, i) => { const r = remember(o); o.visible = win(t, T.life + 0.2 + i * 0.12, 1) > 0.2 && r.v; });
    // the warm-up objects only had to be drawn once, to compile the shadow pass of the rising buildings under the loader
    if (warmObj.length && t > 0.6) { for (const w of warmObj) { scene.remove(w); w.geometry.dispose(); } warmObj = []; }
    // captions
    let ci = -1; capT.forEach((c, i) => { if (t >= c[0]) ci = i; });
    if (ci !== capI) { capI = ci; if (ci >= 0 && api.onCaption) api.onCaption(capT[ci][1], capT[ci][2], ci); }
    if (api.onPhase) api.onPhase(t < T.p1 ? 0 : t < T.p2 ? 1 : t < T.p3 ? 2 : 3);
    engine.shadowDirty = true;
  }
  function restore() {
    for (const c of cons) { if (c.state !== 2) finishBuild(c); c.state = 2; }
    swapOut(groundSwaps);
    for (const g of grows) { g.im.instanceMatrix.array.set(g.o); g.im.instanceMatrix.needsUpdate = true; }
    for (const a of aos) a.o.material.opacity = a.op;
    for (const [o, r] of keep) { o.scale.copy(r.s); o.position.copy(r.p); o.visible = r.v; }
    world.sea.uniforms.uCageN.value = cages.length; if (lfc) { lfc.visible = true; lfc.position.x = L.LFC_BERTH.x; lfc.position.z = L.LFC_BERTH.z; }
    for (const w of warmObj) scene.remove(w); warmObj = [];
    if (opened && !closed) { closed = true; areas.close(FIRST, true); } if (V.interior) V.interior.scale.y = 1;
    for (const m of rings) m.visible = false; if (api.onCall) api.onCall(null);
    warm(0); if (warmOn) env.apply();
    sheet.visible = false; craneG.visible = false; engine.shadowDirty = true;
  }
  /** hide what is to be built; call before the loader lifts */
  api.prepare = () => {
    scene.remove(helpers); if (V.interior) V.interior.visible = false;
    for (const c of cons) remember(c.a.root);
    for (const o of [sea, ...later, ...popped]) remember(o); if (lfc) remember(lfc);
    swapIn(groundSwaps);
    // draw one tiny copy of each kind of rising surface in the first frames, so its shadow pass is compiled while the loader is still up
    const seen = new Set();
    for (const c of cons) for (const s of c.ms) { const key = !!s[2].map; if (seen.has(key) || !s[0].castShadow) continue; seen.add(key);
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), s[2]); w.position.set(hx, 0.5, hz); w.castShadow = true; w.frustumCulled = false; w.customDepthMaterial = c.depth; scene.add(w); warmObj.push(w); }
    setState(0); polMax = rig.limits.polMax; rig.limits.polMax = 1.56; rig.jump(gate);
  };
  api.play = () => new Promise((res) => {
    resolve = res; playing = api.playing = true; t = 0; capI = -1; opened = closed = false; callI = 0;          // captions fire again now that someone is listening
    const vi = V.inside;
    const keys = [
      { p: gate },
      { p: P(-305, 2.1, -66, -1.52, 1.46, 46), t: T.fly },                             // in along the road to the host, the name wall and the flag
      { p: P(-238, 2, -112, -1.42, 1.1, 150), t: 1.8 },
      { p: { ...vi, x: vc[0] + 3, z: vc[1] - 3, dist: 142 }, t: T.open - T.fly - 1.8 },
      { p: P(vc[0] + 3, 1.5, vc[1] - 3, vi.az + 0.26, 0.7, 132), t: 3.1 },
      { p: P(vc[0] + 3, 1.5, vc[1] - 3, vi.az + 0.55, 0.72, 126), t: 3.2 },
      { p: P(vc[0] + 4, 1.5, vc[1] - 4, vi.az + 0.8, 0.7, 142), t: T.close - T.open - 6.3 },
      { p: P(-150, 0, -70, -0.7, 0.84, 390), t: 2.7 },
      { p: P(-60, 0, 20, -0.9, 0.84, 540), t: 1.8 },
      { p: P(-40, 0, 50, -0.95, 0.88, 570), t: 2.0 },
      { p: P(-50, 0, 110, -0.95, 1.0, 650), t: 2.4 },
    ];
    const used = keys.reduce((s, k) => s + (k.t || 0), 0);
    keys.push({ p: hero, t: Math.max(1.2, T.end - used) });
    rig.user = false; rig.limits.polMax = 1.56; rig.playPath(keys);
    stop = engine.onFrame((dt) => { if (!playing) return; setState(t + dt); if (t >= T.end) api.finish(false); });
  });
  /** jump to the end (skip button, a scroll, a key) or wrap up when the film is over */
  api.finish = (skipped = true) => {
    if (!playing) return; playing = api.playing = false; if (stop) stop();
    restore(); scene.remove(sheet); scene.remove(craneG); scene.remove(ringG); ringGeo.dispose(); for (const m of rings) m.material.dispose(); lg.dispose(); paper.geometry.dispose(); paper.material.dispose(); lines.material.dispose();
    for (const c of cranes) c.root.traverse((m) => { if (m.isMesh) m.geometry.dispose(); });
    for (const s of groundSwaps) s[2].dispose(); for (const c of cons) { for (const s of c.ms) s[2].dispose(); c.depth.dispose(); }
    map.tex.dispose(); rig.limits.polMax = polMax;
    if (skipped) { rig.stopPath(); rig.flyTo(hero, { dur: 1.1, hop: 0 }); }
    if (api.onCaption) api.onCaption(null);
    const r = resolve; resolve = null; r && r(skipped);
  };
  return api;
}
