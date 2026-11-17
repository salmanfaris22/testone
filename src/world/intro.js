// The opening. It starts on the name wall at the gate: the camera slides slowly along the brushed-steel plaque (Arabic and English),
// then turns to the gate as its lattice leaves swing open and a black Defender drives in past the camera. The camera lifts off
// behind the car like a drone, over the gate, the guard cabin and the boom, while the car drives through the wheel bath, and cranes
// up over the flag road. From there the site is built on the sand in front of it: area 08, the Education and Visitor Centre,
// goes up first (its ground paved outwards, the building rising from its slab with a crane), a blueprint is drawn over the rest,
// services are laid in (sea water from the intake, power from the generators), the roads are paved from the gate inward, the
// paving flows out to the apron, plazas, lawns and parking and the street lights go up behind it. The buildings rise phase by
// phase (1, 2, 3), each from its slab with a glowing cut line and a tower crane beside each phase; the cages come up out of the
// sea, LFC Hamour sails in, the planting grows and the site comes to life. Last, the camera comes down over the drop-off of the
// Innovation Park into the hero view: across the shell roof of 08 and the arch to the halls and the sea (the view Jeffry picked).
import * as THREE from 'three';
import { P } from './rig.js';
import { clamp, easeIO, easeOut, smooth } from './kit.js';
import { AREAS, PHASES, areaById } from '../data/areas.js';
import * as L from './layout.js';
import { revealMap, groundMat, riseMat, riseDepth, makeCrane, RV_GLSL } from './intro-build.js';
import { makeDefender } from './defender.js';
import { avatars } from './avatars.js';

const backOut = (t) => { const s = 1.25; t -= 1; return t * t * ((s + 1) * t + s) + 1; };
const win = (t, a, d) => clamp((t - a) / d, 0, 1);
const TINY = 1e-4;
const FIRST = 'visitor';                   // the area built first (08)
const ISLAND = 96;                         // metres round it paved and planted as 08 goes up

/** timeline, in seconds */
const T = {
  b: 4.4,                                    // the camera leaves the name wall and lifts off behind the car as it comes through the gate
  rise: 8.2, fly0: 11.6,                     // it cranes up over the flag road, then flies on the path
  b08: 10.0,                                 // 08 goes up first (its slab, then the walls over B08_RISE s)
  bp: 10.6, draw0: 10.9, draw1: 14.6,        // the blueprint: the paper, then every line drawn on it
  util0: 12.6, util1: 15.2,                  // sea water and power drawn in
  infra: 11.9, pace: 1.3,                    // the roads paved outward from the gate, the drive in and 08's ground, the paving flowing out behind them
  p1: 16.2, p2: 18.0, p3: 20.0,              // the buildings, phase by phase
  sea: 21.0, boat: 21.3, life: 22.4,         // the cages, LFC Hamour, then the trees, people and traffic
  settle: 23.0, end: 28.4,                   // the camera comes down into the hero view
};
const B08_RISE = 3.2;                      // 08 is the hero: it rises slowly enough to be watched
/** the car: it starts 30 m out from the gate at CAR0 and its speed, [seconds after CAR0, metres per second], is straight-line between
 *  keys: up to the gate as it opens, slower through it and under the lifted boom, through the wheel bath at walking pace, then on */
const CAR0 = 0.8;
const SPEED = [[0, 8.0], [3.4, 6.0], [5.0, 4.6], [6.6, 4.4], [9.6, 4.4], [12.2, 12.0], [60, 12.0]];
const SLAB = 0.42, SLAB_T = 0.32, HOLD = 0.22;   // each building: its slab first, a breath, then the walls rise

export function createIntro(world, { hero }) {
  const { scene, areas, rig, engine, env } = world;
  const A = areas.byId, named = (n) => scene.children.find((o) => o.name === n);
  const GX = L.GATE.x;                                 // the gate: west of it is the public road, there from the start
  const E = world.entrance;                            // the gates, the barrier arms and the wheel bath (entrance.js)
  // area 08 is there from the first frame: its inside is built now, and shown once so it is compiled under the loader
  const V = A[FIRST]; areas.ensure(V); if (V.interior) V.interior.visible = true;
  const vc = V.toWorld(0, 0), inIsland = (x, z) => Math.hypot(x - vc[0], z - vc[1]) < ISLAND;

  /* ───── the drive in: the road from the gate to the roundabout and on up to 08's plot stands built from the first frame ───── */
  const Z0 = L.RB_W.z, LANE = Z0 + L.GATE.lane, X0 = GX - 30;
  const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz || 1, u = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l, 0, 1); return Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u); };
  const drive = L.ROADS.drive;
  const onRoute = (x, z) => (x > GX - 6 && x < L.RB_W.x && Math.abs(z - Z0) < 13) || Math.hypot(x - L.RB_W.x, z - Z0) < L.RB_W.r + 13 || drive.some((p, i) => i > 0 && segD(x, z, drive[i - 1], p) < 11.5);
  // where the car is along the road against film time: the speed keys integrated (before CAR0 it is further out, coming in at its first speed)
  const route = (() => {
    const tMax = 40, dt = 1 / 240, n = Math.ceil(tMax / dt) + 1, s = new Float32Array(n);
    const speedAt = (t) => { for (let i = 1; i < SPEED.length; i++) if (t <= SPEED[i][0]) { const a = SPEED[i - 1], b = SPEED[i], k = (t - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k; } return SPEED[SPEED.length - 1][1]; };
    for (let i = 1; i < n; i++) s[i] = s[i - 1] + ((speedAt((i - 1) * dt) + speedAt(i * dt)) / 2) * dt;
    const at = (ft) => { const t = ft - CAR0; if (t < 0) return X0 + t * SPEED[0][1]; const f = Math.min(t, tMax) / dt, i = Math.min(n - 2, Math.floor(f)), k = f - i; return X0 + s[i] + (s[i + 1] - s[i]) * k; };
    const when = (x) => { const want = x - X0; if (want < 0) return CAR0 + want / SPEED[0][1]; let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] < want) lo = m; else hi = m; } return CAR0 + hi * dt; };
    return { at, when, speed: (ft) => speedAt(clamp(ft - CAR0, 0, tMax)) };
  })();
  const [W0, W1] = L.GATE.wash;
  const car = makeDefender(world.mats); car.group.visible = false; scene.add(car.group);
  const AX = car.axle, TR = car.track;
  const CAR_END = L.RB_W.x - L.RB_W.r - 6;                                     // it leaves the picture at the roundabout
  const tGate = route.when(GX - 4.5) - 3.1, tBoom = route.when(L.GATE.boom - 6.5) - 1.3;   // the gates are open as it gets there, the arms up before it
  /** a camera pose from where the camera is and a point it looks at (kept at least 12 m off, so the rig's limits never move it) */
  const poseFrom = (c, l) => { let dx = c[0] - l[0], dy = c[1] - l[1], dz = c[2] - l[2]; const d0 = Math.hypot(dx, dy, dz) || 1, d = Math.max(12, d0); dx *= d / d0; dy *= d / d0; dz *= d / d0; const lx = c[0] - dx, ly = c[1] - dy, lz = c[2] - dz; return P(lx, ly, lz, Math.atan2(dx, dz), Math.acos(clamp(dy / d, -1, 1)), d); };
  const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

  /* ───── the shots ───── */
  // the name wall: the plaque's centre, the way its face looks (out over the road) and the run of the wall towards the gate
  const plaque = scene.getObjectByName('gate-sign');
  const PC = plaque ? plaque.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(GX - 4.9, 1.8, Z0 - 10.3);
  const NRM = plaque ? [Math.sin(plaque.rotation.y), Math.cos(plaque.rotation.y)] : [-0.38, 0.92], RUN = [NRM[1], -NRM[0]];
  const onWall = (s, d, y) => [PC.x + NRM[0] * d + RUN[0] * s, y, PC.z + NRM[1] * d + RUN[1] * s];
  /** shot 1, the name wall: the camera slides along it reading the plaque, then turns to the gate as the leaves open and the car comes */
  const narrow = () => clamp(1.25 / Math.max(0.3, engine.w / Math.max(1, engine.h)), 1, 2.4);       // a phone held upright stands further off the wall
  const wallCam = (t) => { const k = smooth(win(t, 0, T.b)); return onWall(-1.9 + 4.3 * k, (3.5 + 2.0 * k) * narrow(), 1.6 + 0.32 * k); };
  const wallLook = (t) => {
    const k = smooth(win(t, 0, T.b)), x = route.at(t), plq = onWall((-1.9 + 4.3 * k) * 0.3, 0, 1.78);
    const gate = [GX + 7, 1.5, Z0 + 0.6], carAt = [x + 1.5, 1.1, LANE];
    return mix3(plq, mix3(gate, carAt, 0.55 * smooth(win(t, 3.9, 1.6))), smooth(win(t, 2.5, 2.2)));
  };
  /** shot 2, the drone: it lifts off where the wall shot left it and settles in behind and above the car, over the gate and the boom */
  const chase = (t, x) => { const k = smooth(win(t, T.b, T.rise - T.b + 1.2)); return [[x - 10 - 7 * k, 2.4 + 15 * k, LANE - 8 - 6 * k], [x + 3.5 + 6 * k, 0.9, LANE - 0.4]]; };
  // where the crane-up comes to rest: high over the flag road, looking along it past 08's plot to the sea
  const vantage = [[GX + 10, 128, Z0 - 132], [vc[0] - 26, 0, vc[1] + 66]], vantageP = poseFrom(...vantage);
  /** the camera for film time t: [position, point looked at, how far the crane-up has come] */
  const shotAt = (t) => {
    const x = route.at(t);
    if (t < T.b) return [wallCam(t), wallLook(t), 0];
    const e = easeIO(win(t, T.b, 2.3)), ch = chase(t, x);
    const c = mix3(wallCam(T.b), ch[0], e), l = mix3(wallLook(t), ch[1], e);
    if (t < T.rise) return [c, l, 0];
    const k = smooth(win(t, T.rise, T.fly0 - T.rise));                 // ...and up, from the moving drone into the still pose the path starts at
    return [mix3(c, vantage[0], k), mix3(l, vantage[1], k), k];
  };
  const driveFov = () => { const asp = engine.w / Math.max(1, engine.h); return clamp((2 * Math.atan(Math.tan((32 * Math.PI) / 180) / asp) * 180) / Math.PI, 36, 62); };
  const BUILD_FOV = 38;
  const setFov = (f) => { if (Math.abs(rig.fov - f) < 0.01 && rig.fovGoal === f) return; rig.fov = rig.fovGoal = f; engine.camera.fov = f; engine.camera.updateProjectionMatrix(); if (rig.onFov) rig.onFov(f); };
  let wakeT = { f: -1, r: -1 }, splashed = { f: false, r: false, out: false }, lastX = X0;
  const ph = { 1: [], 2: [], 3: [] };
  for (const d of AREAS) if (d.id !== 'seacages' && d.id !== 'lfc' && d.id !== FIRST && A[d.id]) ph[d.phase].push(A[d.id]);
  const builds = [...ph[1], ...ph[2], ...ph[3], V];
  const sea = A.seacages.root, lfc = world.cages && world.cages.lfc;
  const cages = (world.cages && world.cages.cages) || [];

  /* ───── where and when the ground gets built ───── */
  const map = revealMap(world, { gateX: GX, pre: onRoute, island: { x: vc[0], z: vc[1], r: ISLAND } });
  const G = { map: { value: map.tex }, box: { value: map.uBox }, p: { value: -1 }, rise: { value: 3.2 }, pre: { value: new THREE.Vector4(vc[0], vc[1], ISLAND, 0) } };
  const hard = world.land.hardscape;
  const helpers = new THREE.Group(); helpers.name = 'intro-helpers'; helpers.visible = false;
  // one stand-in per kind of surface, so its shaders are compiled under the loader rather than in the middle of the film
  // (an instanced mesh with its own colours needs its own shader, so the stand-in copies that too)
  const helper = (mesh, mat) => { const h = mesh.isInstancedMesh ? new THREE.InstancedMesh(mesh.geometry, mat, 1) : new THREE.Mesh(mesh.geometry, mat); if (mesh.isInstancedMesh && mesh.instanceColor) h.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(3), 3); h.castShadow = mesh.castShadow; h.receiveShadow = mesh.receiveShadow; helpers.add(h); };
  const helped = new Set(), helpOnce = (mesh, mat) => { const k = `${mat.uuid}|${mesh.isInstancedMesh ? 1 : 0}|${mesh.isInstancedMesh && mesh.instanceColor ? 1 : 0}`; if (!helped.has(k)) { helped.add(k); helper(mesh, mat); } };
  const groundSwaps = [];
  { const cache = new Map(); hard.traverse((m) => { if (!m.isMesh || Array.isArray(m.material) || !(m.material.isMeshStandardMaterial || m.material.isMeshBasicMaterial)) return; let c = cache.get(m.material); if (!c) { c = groundMat(m.material, G); cache.set(m.material, c); } helpOnce(m, c); groundSwaps.push([m, m.material, c]); }); }

  /* ───── each area: material copies that build it from the ground up ───── */
  const box3 = new THREE.Box3();
  const wbox = (a) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const b of a.hit || []) for (const [x, z] of [[b[0], b[2]], [b[3], b[2]], [b[3], b[5]], [b[0], b[5]]]) { const w = a.toWorld(x, z); x0 = Math.min(x0, w[0]); x1 = Math.max(x1, w[0]); z0 = Math.min(z0, w[1]); z1 = Math.max(z1, w[1]); } return { x0, x1, z0, z1, x: (x0 + x1) / 2, z: (z0 + z1) / 2 }; };
  const cons = [];
  const addCon = (a, k, t0, slow = 0) => {
    box3.setFromObject(a.root); const top = Math.max(2, box3.max.y + 0.3), rise = slow || clamp(0.95 + top * 0.035, 1.1, 1.7);
    const R = { h: { value: -1 }, g: { value: 1 } }, depth = riseDepth(R), cache = new Map(), ms = [], hide = [];
    a.root.traverse((m) => {
      if (!(m.isMesh || m.isPoints || m.isLine)) return;
      const ok = m.isMesh && !m.isSkinnedMesh && !Array.isArray(m.material) && (m.material.isMeshStandardMaterial || m.material.isMeshBasicMaterial);
      if (!ok) { hide.push([m, m.visible]); return; }
      let c = cache.get(m.material); if (!c) { c = riseMat(m.material, R); cache.set(m.material, c); } helpOnce(m, c);
      ms.push([m, m.material, c, m.customDepthMaterial]);
    });
    cons.push({ a, k, t0, top, rise, done: t0 + SLAB_T + HOLD + rise + 0.05, R, depth, ms, hide, state: -1, box: wbox(a) });
  };
  addCon(V, 0, T.b08, B08_RISE);                              // 08 goes up first, on its own, as the camera cranes up
  for (const k of [1, 2, 3]) ph[k].forEach((a, i) => addCon(a, k, T['p' + k] + i * (ph[k].length > 3 ? 0.27 : 0.42)));
  const phaseDone = { 0: 0, 1: 0, 2: 0, 3: 0 }; for (const c of cons) phaseDone[c.k] = Math.max(phaseDone[c.k], c.done);
  scene.add(helpers);                                        // compiled with the rest by compileAsync, removed in prepare()

  /* ───── tower cranes, one per phase, on clear ground near the middle of the phase ───── */
  const roadsW = Object.values(world.land.roads || {});
  const clearAt = (x, z) => {
    for (const a of builds) for (const b of a.hit || []) { const [lx, lz] = a.toLocal(x, z); if (Math.hypot(Math.max(b[0] - lx, 0, lx - b[3]), Math.max(b[2] - lz, 0, lz - b[5])) < 5.5) return false; }
    for (const p of roadsW) for (let i = 0; i < p.length - 1; i++) if (segD(x, z, p[i], p[i + 1]) < 10.5) return false;
    return true;
  };
  const spot = (x, z) => { if (clearAt(x, z)) return [x, z]; for (let r = 4; r <= 110; r += 4) { const n = Math.ceil((Math.PI * 2 * r) / 4); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (clearAt(px, pz)) return [px, pz]; } } return [x, z]; };
  const craneG = new THREE.Group(); craneG.name = 'intro-cranes'; craneG.visible = false;
  const cranes = [0, 1, 2, 3].map((k) => {
    const list = cons.filter((c) => c.k === k); if (!list.length) return null;
    let cx = 0, cz = 0; for (const c of list) { cx += c.box.x; cz += c.box.z; } cx /= list.length; cz /= list.length;
    const [x, z] = spot(cx, cz), tall = Math.max(...list.map((c) => c.top)), span = Math.max(...list.map((c) => Math.max(c.box.x1 - c.box.x0, c.box.z1 - c.box.z0)));
    const cr = makeCrane(world.mats, { H: Math.round(tall + 28), jib: clamp(span * 0.45, 36, 54), cjib: 14 });
    cr.root.position.set(x, -400, z); craneG.add(cr.root);
    return { ...cr, k, x, z, base: Math.atan2(-(cz - z), cx - x), t0: (k ? T['p' + k] : T.b08) - 0.45, t1: phaseDone[k] + 0.15 };
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
  for (const d of AREAS) { const a = A[d.id]; if (!a || d.id === 'seacages' || d.id === 'lfc' || d.id === FIRST) continue; for (const b of a.hit || []) lists[d.phase].push(rect(a, b)); }
  (V.hit || []).forEach((b, i, all) => ribbon(rect(V, b), 0.01 + (0.08 * i) / all.length, 0.1));       // 08's outline first
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
  const islandAt = (x, z) => T.b08 + 0.5 + 1.3 * clamp(Math.hypot(x - vc[0], z - vc[1]) / ISLAND, 0, 1);
  if (lightsG) addGrow(lightsG.children.find((c) => c.isInstancedMesh && c.visible), (x, z) => (x < GX || onRoute(x, z) ? -10 : inIsland(x, z) ? islandAt(x, z) : T.infra + Math.max(0, map.sample(x, z)) / T.pace + 0.12), 0.5, true);
  if (plantsG) for (const im of plantsG.children) addGrow(im, (x, z) => (x < GX || onRoute(x, z) ? -10 : inIsland(x, z) ? islandAt(x, z) + 0.4 : T.life + 0.95 * clamp(map.sample(x, z) / Math.max(1, map.end), 0, 1)), 1.1, false);
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
    box3.setFromObject(o); let at = 0;
    for (const c of cons) if (c.box.x1 > box3.min.x && c.box.x0 < box3.max.x && c.box.z1 > box3.min.z && c.box.z0 < box3.max.z) at = Math.max(at, c.done);
    return { o, at: at || T.p3 + 1.5, op: o.material.opacity };
  });

  /* ───── what comes to life at the end; anything new in the scene that we do not know joins it ───── */
  const KNOWN = new Set(['terrain', 'hardscape', 'rocks', 'ao', 'plants', 'lights', 'gate', 'host', 'flags-road', 'flags-drop', 'blueprint', 'intro-helpers', 'intro-cranes', 'intro-car', 'drone', 'drone-shadow', ...AREAS.map((d) => d.id)]);
  const flagDrop = named('flags-drop');
  const grown = ['site', ...scene.children.filter((o) => o.name && o.visible && !KNOWN.has(o.name) && !['people', 'traffic', 'gulls', 'led-boards', 'site'].includes(o.name) && (o.isGroup || o.isMesh) && !o.isLight).map((o) => o.name)];
  const later = [...new Set(grown)].map(named).filter(Boolean);
  const popped = ['people', 'traffic', 'gulls', 'led-boards'].map(named).filter(Boolean);

  /* ───── light: a warmer, low-contrast sun at the gate, back to the normal day as the camera rises ───── */
  const GOLD = new THREE.Color(0xffc68a), HAZE = new THREE.Color(0xf4dfc4); let warmOn = false;
  const warm = (k) => {
    if (k <= 0.001) { if (warmOn) { env.apply(); warmOn = false; } return; }
    env.apply(); warmOn = true;
    env.sun.color.lerp(GOLD, 0.5 * k); env.sun.intensity *= 1 + 0.1 * k; env.hemi.intensity *= 1 - 0.18 * k;
    if (env.horizon) env.horizon.lerp(HAZE, 0.4 * k);
  };

  /* ───── state ───── */
  let avRange = 0, t = 0, playing = false, resolve = null, stop = null, polMax = 1.4, distMin = 9, warmObj = [], driving = false, flying = false, end = null;
  const keep = new Map(); const remember = (o) => { if (!keep.has(o)) keep.set(o, { s: o.scale.clone(), p: o.position.clone(), v: o.visible }); return keep.get(o); };
  const first = areaById[FIRST];
  // (the first caption waits until the camera has read the plaque and turns to the gate: the plaque says the name already)
  const capT = [[2.9, 'Umm Al Quwain, United Arab Emirates', 'Marhaba. Welcome to the Sheikh Khalifa Marine Research Centre'],
    [5.6, 'Biosecurity starts at the gate', 'Every vehicle drives through the wheel bath'],
    [T.b08 + 0.4, `${first.n} · ${first.name}`, 'The visitor centre goes up first'],
    [T.util0 + 0.4, 'Then the whole centre fills in', 'Roads, sea water and power first'],
    [T.p1, `${PHASES[0].name}`, PHASES[0].title], [T.p2, `${PHASES[1].name}`, PHASES[1].title], [T.p3, `${PHASES[2].name}`, PHASES[2].title], [T.life, 'Today', 'One centre, from egg to sea']];
  let capI = -1;
  // Keep the page framing on the same clock as the final camera move.
  const api = { playing: false, onCaption: null, onPhase: null, onCall: null,
    get time() { return t; }, get settleProgress() { return smooth(win(t, T.settle, T.end - T.settle)); }, T };

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
  /** the lens: the drive's (wider on a narrow window), the build's, then the hero's as the camera comes down */
  const fovAt = (time) => {
    const f0 = driveFov(), f1 = f0 + (BUILD_FOV - f0) * smooth(win(time, T.rise, T.fly0 - T.rise));
    return f1 + ((end ? end.fov : 50) - BUILD_FOV) * smooth(win(time, T.settle, T.end - T.settle));
  };
  function setState(time) {
    const prev = t; t = time;
    warm(0.62 * (1 - smooth(win(t, T.rise + 0.4, 2.4))));
    // the drive: the gates and barrier arms, the car, the water it throws up in the bath, and the camera's shots
    const x = route.at(t);
    if (E) { E.setGate(easeIO(win(t, tGate, 3.0))); E.setBoom(easeIO(win(t, tBoom, 1.2))); }
    { const xf = x + AX, xr = x - AX, wet = smooth(win(xf, W0, 1.0)) * (1 - smooth(win(xr, W1 - 0.3, 1.0)));
      car.group.visible = driving && x < CAR_END; car.group.position.set(x, 0.075 - 0.06 * wet, LANE); car.roll(x - lastX); lastX = x;
      if (t > prev && t - prev < 0.2) car.ride((route.speed(t) - route.speed(prev)) / (t - prev), t - prev); }      // it dips its nose as it slows for the gate
    if (E && playing && t > prev && t < T.fly0 + 6) {
      const sp = route.speed(t);
      for (const [key, ax] of [['f', x + AX], ['r', x - AX]]) {
        const inBath = ax > W0 && ax < W1;
        if (inBath && !splashed[key]) { splashed[key] = true; for (const s2 of [-1, 1]) { E.wash.splash(ax + 0.3, LANE + s2 * TR, sp, key === 'f' ? 34 : 18); E.wash.wake(ax, LANE + s2 * TR, 1); } }
        if (inBath && t - wakeT[key] > 0.13) { wakeT[key] = t; for (const s2 of [-1, 1]) E.wash.wake(ax + 0.35, LANE + s2 * TR, key === 'f' ? 0.8 : 0.5); }
        if (inBath && key === 'f' && Math.random() < 0.5) E.wash.splash(ax + 0.35, LANE + (Math.random() < 0.5 ? -TR : TR), sp, 3);       // a steady spray off the front tyres
      }
      if (!splashed.out && x + AX > W1) { splashed.out = true; for (const s2 of [-1, 1]) E.wash.splash(W1 + 0.2, LANE + s2 * TR, sp * 0.8, 14); }
    }
    if (!flying && t < T.fly0) {
      const [c, l, k = 0] = shotAt(t);
      rig.fitOverride = 1 + (rig.fit - 1) * k; setFov(fovAt(t));
      rig.jump(poseFrom(c, l)); rig._apply();
    } else if (flying) setFov(fovAt(t));
    // 08's ground is paved and planted outwards from it as it goes up
    G.pre.value.z = ISLAND * smooth(win(t, T.b08 + 0.2, 1.6)); G.pre.value.w = win(t, T.b08 + 0.2, 1.6);
    if (flagDrop) { const r = remember(flagDrop), k = win(t, T.b08 + 1.4, 1.0); flagDrop.visible = k > 0 && r.v; flagDrop.scale.y = Math.max(TINY, backOut(k)) * r.s.y; }
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
    // the buildings: 08 first, then phase by phase
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
    if (V.interior) V.interior.visible = false;
    warm(0); if (warmOn) env.apply();
    if (E) { E.setGate(1); E.setBoom(1); E.wash.reset(); } driving = false; car.group.visible = false; G.pre.value.z = ISLAND; G.pre.value.w = 1;
    const h = hero(); rig.fitOverride = null; rig.floorOverride = null; rig.fovGoal = h.fov; rig.limits.distMin = distMin;
    sheet.visible = false; craneG.visible = false; engine.shadowDirty = true;
  }
  /** hide what is to be built; call before the loader lifts */
  api.prepare = () => {
    // the wheel bath's mirror draws the scene into a picture of its own, and every surface needs a second shader for that:
    // compile them all now, under the loader (helpers, the car and 08 included), not when the camera first comes near the bath
    if (E && E.mirror && E.mirror.getRenderTarget) { const r = engine.renderer, was = r.getRenderTarget(), vis = helpers.visible; helpers.visible = true; r.setRenderTarget(E.mirror.getRenderTarget()); try { r.compile(scene, world.camera); } catch (e) { /* only a warm-up */ } r.setRenderTarget(was); helpers.visible = vis; }
    // and send every picture in the scene to the graphics card now (08's screens, panels and photos are big): a texture is otherwise uploaded the first time it is drawn, which stalls that frame
    { const r = engine.renderer, done = new Set(), up = (tx) => { if (tx && tx.isTexture && !done.has(tx)) { done.add(tx); try { r.initTexture(tx); } catch (e) { /* only a warm-up */ } } };
      scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { for (const k in m) up(m[k]); if (m.uniforms) for (const k in m.uniforms) up(m.uniforms[k] && m.uniforms[k].value); } }); }
    // let 08's inside run once (its screens draw their first picture, its people take their places)
    for (const u of V.updaters || []) { try { u(1 / 60, 0); } catch (e) { /* only a warm-up */ } }
    // draw the whole site once with 08's inside, the car, the cranes and the stand-ins showing, on the screen (under the loader) and
    // into the mirror's picture: every shape is on the graphics card and every surface prepared before the film starts
    { let iv = false, cv = false, hv = false;
      world.warm(() => { iv = V.interior ? V.interior.visible : false; cv = craneG.visible; hv = helpers.visible; if (V.interior) V.interior.visible = true; car.group.visible = true; craneG.visible = true; helpers.visible = true; for (const c of cranes) c.root.position.y = 0; },
        () => { if (V.interior) V.interior.visible = iv; car.group.visible = false; craneG.visible = cv; helpers.visible = hv; for (const c of cranes) c.root.position.y = -400; },
        E && E.mirror && E.mirror.getRenderTarget ? [null, E.mirror.getRenderTarget()] : [null]); }
    scene.remove(helpers); if (V.interior) V.interior.visible = false;
    for (const c of cons) remember(c.a.root);
    for (const o of [sea, ...later, ...popped]) remember(o); if (lfc) remember(lfc);
    swapIn(groundSwaps);
    // draw one tiny copy of each kind of rising surface in the first frames, so its shadow pass is compiled while the loader is still up
    const seen = new Set();
    for (const c of cons) for (const s of c.ms) { const key = !!s[2].map; if (seen.has(key) || !s[0].castShadow) continue; seen.add(key);
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), s[2]); w.position.set(X0 - 40, -0.6, LANE); w.castShadow = true; w.frustumCulled = false; w.customDepthMaterial = c.depth; scene.add(w); warmObj.push(w); }
    if (E) { E.setGate(0); E.setBoom(0); E.wash.reset(); }
    if (flagDrop) remember(flagDrop);
    avRange = avatars.rangeMax; avatars.rangeMax = 30;     // only people close to the lens are full rigged figures in the film (setting up dozens of them at once stalls a frame)
    engine.noUp = true;                                    // while the film plays the picture may get lighter to keep pace, never sharper and back (each change is a hitch)
    polMax = rig.limits.polMax; distMin = rig.limits.distMin; rig.limits.polMax = 1.66; rig.limits.distMin = 0.5; rig.floorOverride = 0.3; driving = true; lastX = route.at(0); setState(0);
  };
  api.play = () => new Promise((res) => {
    resolve = res; playing = api.playing = true; t = 0; capI = -1; end = hero();          // captions fire again now that someone is listening
    wakeT = { f: -1, r: -1 }; splashed = { f: false, r: false, out: false }; driving = true; flying = false; lastX = route.at(0);
    rig.user = false; rig.limits.polMax = 1.66; rig.limits.distMin = 0.5; rig.floorOverride = 0.3; setState(0);
    stop = engine.onFrame((dt) => {
      if (!playing) return;
      setState(t + dt);
      if (!flying && t >= T.fly0) {
        // the crane-up has come to rest high over the flag road: from here the camera flies the path, starting from exactly that pose;
        // it drifts round to the north-west of the site while everything goes up, then comes down over 08's drop-off into the hero
        flying = true; rig.fitOverride = null; rig.floorOverride = null; rig.limits.distMin = distMin; rig.limits.polMax = 1.56;
        end = hero();
        const keys = [
          { p: vantageP },
          { p: P(-150, 0, -64, -1.98, 0.98, 400), t: 3.4 },          // 08 up and the blueprint drawn, the services glowing
          { p: P(-80, 0, 6, -2.08, 0.95, 545), t: 4.4 },             // the whole site as the phases rise
          { p: P(-112, 0, -38, -2.12, 0.99, 455), t: T.settle - T.fly0 - 7.8 },    // the sea and LFC Hamour, the trees and people
        ];
        keys.push({ p: end, t: T.end - T.settle });
        rig.playPath(keys);
      }
      if (t >= T.end) api.finish(false);
    });
  });
  /** jump to the end (skip button, a scroll, a key) or wrap up when the film is over */
  api.finish = (skipped = true) => {
    if (!playing) return; playing = api.playing = false; if (stop) stop(); engine.noUp = false; if (avRange) avatars.rangeMax = avRange;
    restore(); scene.remove(sheet); scene.remove(craneG); lg.dispose(); paper.geometry.dispose(); paper.material.dispose(); lines.material.dispose();
    for (const c of cranes) c.root.traverse((m) => { if (m.isMesh) m.geometry.dispose(); });
    for (const s of groundSwaps) s[2].dispose(); for (const c of cons) { for (const s of c.ms) s[2].dispose(); c.depth.dispose(); }
    map.tex.dispose(); rig.limits.polMax = polMax; scene.remove(car.group); car.dispose();
    const h = hero();
    if (skipped) { rig.stopPath(); rig.fovGoal = h.fov; rig.flyTo(h, { dur: 1.1, hop: 0 }); }
    if (api.onCaption) api.onCaption(null);
    const r = resolve; resolve = null; r && r(skipped);
  };
  return api;
}
