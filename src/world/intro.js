// The opening. It starts on the name wall at the gate: the camera slides slowly along the brushed-steel plaque (Arabic and English),
// then turns to the gate as its lattice leaves swing open and a black Defender drives in past the camera. The camera lifts off
// behind the car like a drone, over the gate, the guard cabin and the boom, while the car drives through the wheel bath, and rises
// up over the flag road. From there the site is built on the sand in front of it: area 08, the Education and Visitor Centre,
// goes up first (its ground paved outwards, the building rising from its slab), a blueprint is drawn over the rest,
// services are laid in (sea water from the intake, power from the generators), the roads are paved from the gate inward, the
// paving flows out to the apron, plazas, lawns and parking and the street lights go up behind it. The buildings rise phase by
// phase (1, 2, 3), each from its slab with a glowing cut line; the cages come up out of the
// sea, LFC Hamour sails in, the planting grows and the site comes to life. Last, the camera comes down over the drop-off of the
// Innovation Park into the hero view: across the shell roof of 08 and the arch to the halls and the sea (the view Jeffry picked).
import * as THREE from 'three';
import { P } from './rig.js';
import { clamp, easeIO, easeOut, smooth } from './kit.js';
import { AREAS, PHASES, areaById } from '../data/areas.js';
import * as L from './layout.js';
import { revealMap, groundMat, riseMat, riseDepth, RV_GLSL } from './intro-build.js';
import { makeDefender } from './defender.js';
import { avatars } from './avatars.js';

const backOut = (t) => { const s = 1.25; t -= 1; return t * t * ((s + 1) * t + s) + 1; };
const win = (t, a, d) => clamp((t - a) / d, 0, 1);
const TINY = 1e-4;
const FIRST = 'visitor';                   // the area built first (08)
const ISLAND = 96;                         // metres round it paved and planted as 08 goes up

/** timeline, in seconds: the car comes up the road; the name board; the camera lifts over the gate as it opens and comes down
 *  inside, and the car drives through at it; the drone follows it in; then up, and the site is built */
const T = {
  board: 3.4,                                // from the car to the name board (the car has stopped at the closed gate)
  over: 6.6,                                 // the camera lifts over the gate as it opens and comes down inside, looking back at the car
  chase: 12.6,                               // the car comes through at the camera and past it; the drone takes off behind it
  rise: 15.4, fly0: 18.6,                    // it cranes up over the flag road, then flies on the path
  b08: 17.4,                                 // 08 goes up first (its slab, then the walls over B08_RISE s)
  bp: 18.0, draw0: 18.3, draw1: 21.6,        // the blueprint: the paper, then every line drawn on it
  util0: 19.6, util1: 22.0,                  // sea water and power drawn in
  road0: 15.4, road1: 25.4,                  // the roads: paved out from the car's route in one slow, steady run, from the crane-up after the wheel bath
  infra: 20.0, pace: 1.35,                   // the roads paved outward from the gate, the drive in and 08's ground, the paving flowing out behind them
  p1: 23.4, p2: 24.8, p3: 26.4,              // the buildings, phase by phase
  sea: 27.2, boat: 27.4, life: 28.4,         // the cages, LFC Hamour, then the trees, people and traffic
  settle: 29.2, end: 34.0,                   // the camera comes down into the hero view
};
const B08_RISE = 3.2;                      // 08 is the hero: it rises slowly enough to be watched
/** the car: it starts 34 m out from the gate and its speed, [seconds, metres per second], is straight-line between keys: it slows
 *  to a stop at the closed gate, waits while the name board is shown and the gate opens, comes through, slow under the lifted boom
 *  and through the wheel bath, then on up the flag road */
const CAR0 = 0;
const SPEED = [[0, 12.0], [4.4, 0], [8.0, 0], [9.2, 3.2], [10.6, 5.2], [11.6, 4.4], [17.6, 4.4], [20.0, 12.0], [60, 12.0]];
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
  const Z0 = L.RB_W.z, LANE = Z0 + L.GATE.lane, X0 = GX - 34;
  const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz || 1, u = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l, 0, 1); return Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u); };
  const drive = L.ROADS.drive;
  const onRoute = (x, z) => (x > GX - 6 && x < L.RB_W.x && Math.abs(z - Z0) < 13) || Math.hypot(x - L.RB_W.x, z - Z0) < L.RB_W.r + L.ROADS.w / 2 + L.ROADS.walk + 0.6 || drive.some((p, i) => i > 0 && segD(x, z, drive[i - 1], p) < 11.5);
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
  const narrow = () => clamp(1.25 / Math.max(0.3, engine.w / Math.max(1, engine.h)), 1, 2.4);       // a phone held upright stands further off
  const onWall = (s, d, y) => [PC.x + NRM[0] * d + RUN[0] * s, y, PC.z + NRM[1] * d + RUN[1] * s];
  const carAt = (t) => { const x = route.at(t); return [x + 1.4, 1.0, LANE]; };
  const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return [0, 1, 2].map((i) => v * v * v * p0[i] + 3 * v * v * u * p1[i] + 3 * v * u * u * p2[i] + u * u * u * p3[i]); };
  // 1, the car: low on the verge ahead of it, its front coming at us as it slows for the gate
  // (on a narrow screen it stands further off the road, but never past the roadside wall 12.4 m from the centre line: from behind
  // it the first seconds of the film were a grey wall)
  const carCam = (t) => { const k = smooth(win(t, 0, T.board)); return [GX - 15.5 + 2.2 * k, 1.15 + 0.2 * k, Z0 - Math.min(8.4, 6.2 * narrow())]; };
  // 2, the name board: the camera turns from the car to the plaque and slides along it, reading it
  // (a narrow screen stands further off the wall, but never out in the lane: the car waits at the gate right behind the camera,
  // and on a phone the step-back put the camera inside it, Jeffry 20 Nov. It stays CAR_CLEAR off the lane's centre line)
  const CAR_CLEAR = 5.5;
  const offWall = (s, d) => (NRM[1] > 0.2 ? Math.min(d, Math.max(2.5, (LANE - CAR_CLEAR - PC.z - RUN[1] * s) / NRM[1])) : d);
  const boardCam = (t) => { const k = smooth(win(t, T.board + 0.3, T.over - T.board - 0.3)), n = narrow(), s = -1.9 + 4.3 * k; return onWall(s, offWall(s, (3.5 + 2.0 * k) * n), 1.6 + 0.32 * k); };
  const boardLook = (t) => { const k = smooth(win(t, T.board + 0.3, T.over - T.board - 0.3)); return onWall((-1.9 + 4.3 * k) * 0.3, 0, 1.78); };
  // 3, over the gate: the camera lifts off the end of the wall, turning to the car waiting at the gate, rises back over the
  // opening gate and hovers inside it, about 5 m up, looking back out at the car (it no longer dives to the road there: Jeffry,
  // 20 Nov, 'camera moving to the bottom, don't need')
  const IN = [GX + 10.5, 5.0, Z0 - 1.6];
  const overCam = (t) => { const p0 = boardCam(T.over), u = smooth(win(t, T.over + 0.3, 2.3)); return bez(p0, [p0[0] + 2.5, 6.2, p0[2] + 1.2], [GX + 5.5, 5.6, Z0 - 2.4], IN, u); };
  // 4, inside: the car comes through the gate towards the camera and drives on below it on the left; the eye follows it
  const inLook = (t) => { const x = route.at(t), k = smooth(win(x, GX - 12, 22)); return mix3([GX - 9, 1.5, Z0 + 0.4], [x + 0.6, 1.0, LANE], 0.3 + 0.62 * k); };
  /** shot 5, the drone: it lifts off behind and above the car, over the guard cabin and the boom, as it drives through the bath */
  const chase = (t, x) => { const k = smooth(win(t, T.chase, T.rise - T.chase + 1.2)); return [[x - 10 - 7 * k, IN[1] + (17.4 - IN[1]) * k, LANE - 8 - 6 * k], [x + 3.5 + 6 * k, 0.9, LANE - 0.4]]; };      // (it only climbs from the hover)
  // where the crane-up comes to rest: high over the flag road, looking along it past 08's plot to the sea
  const upright = engine.h > engine.w * 1.1;
  /** a look point turned from l0 to l1 by k, as seen from c: the heading and the tilt turn evenly (the short way round), so the
   *  camera pans; blending the two points instead sent the aim under the camera when they lay either side of it, and the view
   *  whipped over (1,000°/s just after the name board) */
  const aimMix = (c, l0, l1, k, dir = 0) => {
    if (k <= 0) return l0; if (k >= 1) return l1;
    const ax = l0[0] - c[0], ay = l0[1] - c[1], az = l0[2] - c[2], bx = l1[0] - c[0], by = l1[1] - c[1], bz = l1[2] - c[2];
    const r0 = Math.hypot(ax, ay, az) || 1, r1 = Math.hypot(bx, by, bz) || 1, y0 = Math.atan2(ax, az), y1 = Math.atan2(bx, bz);
    let dy = y1 - y0; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    if (dir < 0 && dy > 0) dy -= 2 * Math.PI; else if (dir > 0 && dy < 0) dy += 2 * Math.PI;      // (a turn of about half a circle goes one fixed way: the short way can swap sides from one frame to the next)
    const p0 = Math.asin(clamp(ay / r0, -1, 1)), p1 = Math.asin(clamp(by / r1, -1, 1)), y = y0 + dy * k, pt = p0 + (p1 - p0) * k, r = r0 + (r1 - r0) * k;
    return [c[0] + Math.sin(y) * Math.cos(pt) * r, c[1] + Math.sin(pt) * r, c[2] + Math.cos(y) * Math.cos(pt) * r];
  };
  /** where the camera turns to from the board: the gate and the car waiting at it (it turns across the gate, clockwise seen from above) */
  const gateLook = (t) => mix3([GX - 2, 1.6, Z0 + 0.3], carAt(t), 0.55);
  const kGate = (t) => smooth(win(t, T.over - 0.9, 2.4));          // a slow pan from the board round to the gate (≈110°/s at most)
  const vantage = [[GX + 10, 128, Z0 - 132], upright ? [vc[0] - 8, 0, vc[1] + 22] : [vc[0] - 26, 0, vc[1] + 66]], vantageP = poseFrom(...vantage);
  /** how far the camera steps back for a narrow screen while the site is built: half the rig's usual step-back (which fits the
   *  site's whole width into an upright phone and turns it into a flat road map), growing to all of it as the camera comes down
   *  into the hero view, so the film hands over to the page without a jump */
  const buildFit = (time, k = 1) => 1 + (rig.fit - 1) * k * (0.5 + 0.5 * smooth(win(time, T.settle, T.end - T.settle)));
  /** the camera for film time t: [position, point looked at, how far the crane-up has come]; the shots glide into each other */
  const shotAt = (t) => {
    const x = route.at(t);
    if (t < T.over) {
      const b = smooth(win(t, T.board - 0.6, 1.8));                                   // car → board: one slow, even turn
      const c = mix3(carCam(t), boardCam(t), b);
      return [c, aimMix(c, aimMix(c, carAt(t), boardLook(t), b), gateLook(t), kGate(t), -1), 0];
    }
    if (t < T.chase) {
      const c = t < T.over + 2.6 ? overCam(t) : [IN[0] - 1.4 * smooth(win(t, T.over + 2.6, T.chase - T.over - 2.6)), IN[1], IN[2]];
      const l = t < T.over + 2.6 ? aimMix(c, aimMix(c, boardLook(t), gateLook(t), kGate(t), -1), inLook(t), smooth(win(t, T.over + 0.8, 1.6))) : inLook(t);      // (it turns to the car as it rises, not down at the paving)
      return [c, l, 0];
    }
    const e = easeIO(win(t, T.chase, 2.3)), ch = chase(t, x), c0 = [IN[0] - 1.4, IN[1], IN[2]];
    const c = mix3(c0, ch[0], e), l = mix3(inLook(t), ch[1], e);
    if (t < T.rise) return [c, l, 0];
    const k = smooth(win(t, T.rise, T.fly0 - T.rise));                 // ...and up, from the moving drone into the still pose the path starts at
    return [mix3(c, vantage[0], k), mix3(l, vantage[1], k), k];
  };
  const driveFov = () => { const asp = engine.w / Math.max(1, engine.h); return clamp((2 * Math.atan(Math.tan((32 * Math.PI) / 180) / asp) * 180) / Math.PI, 36, 62); };
  const BUILD_FOV = 38;
  const setFov = (f) => { if (Math.abs(rig.fov - f) < 0.01 && rig.fovGoal === f) return; rig.fov = rig.fovGoal = f; engine.camera.fov = f; engine.camera.updateProjectionMatrix(); if (rig.onFov) rig.onFov(f); };
  let wakeT = { f: -1, r: -1 }, splashed = { f: false, r: false, out: false }, lastX = X0;
  const ph = { 1: [], 2: [], 3: [] };
  for (const d of AREAS) if (d.id !== 'seacages' && d.id !== 'lfc' && d.id !== FIRST && A[d.id] && !A[d.id].host) ph[d.phase].push(A[d.id]);      // (an area inside another's building goes up with it)
  const builds = [...ph[1], ...ph[2], ...ph[3], V];
  const sea = A.seacages.root, lfc = world.cages && world.cages.lfc;
  const cages = (world.cages && world.cages.cages) || [];

  /* ───── where and when the ground gets built ───── */
  // every road stands complete on the sand from the first frame (Jeffry: no half-built roads, no cut-off arms at the roundabout):
  // the paving, lawns and buildings fill in round them as the film goes on
  // only the road the car drives is there from the first frame; every other road is paved out from it, a glowing edge running
  // along it, once the camera is up and the blueprint is down (Jeffry, 20 Nov: the roads build like everything else)
  const map = revealMap(world, { gateX: GX, pre: (x, z) => onRoute(x, z) || Math.hypot(x - L.DROP.x, z - L.DROP.z) < L.DROP.r + 3.5, roadDur: 3.6, island: { x: vc[0], z: vc[1], r: ISLAND } });
  const G = { map: { value: map.tex }, box: { value: map.uBox }, p: { value: -1 }, rise: { value: 3.2 }, pr: { value: -1 }, pre: { value: new THREE.Vector4(vc[0], vc[1], ISLAND, 0) } };
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


  /* ───── the blueprint: a sheet of drawing paper laid over the site with a grid, and every line drawn on it ───── */
  const BP = { x: -40, z: 70, r0: 300, r1: 430 };
  const U = { uOp: { value: 0 }, uLop: { value: 0 }, uUop: { value: 0 }, uDraw: { value: 0 }, uUtil: { value: 0 }, uT: { value: 0 }, uRvMap: G.map, uRvBox: G.box, uRvP: G.p, uRvPR: G.pr, uRvPre: G.pre };
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
  for (const d of AREAS) { const a = A[d.id]; if (!a || a.host || d.id === 'seacages' || d.id === 'lfc' || d.id === FIRST) continue; for (const b of a.hit || []) lists[d.phase].push(rect(a, b)); }
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
  if (lightsG) addGrow(lightsG.children.find((c) => c.isInstancedMesh && c.visible), (x, z) => { const v = map.sample(x, z); return x < GX || onRoute(x, z) || v < -1 ? -10 : v <= map.roadDur ? T.road0 + (Math.max(0, v) / map.roadDur) * (T.road1 - T.road0) + 0.3 : T.infra + v / T.pace + 0.12; }, 0.5, true);      // (street lights go up just behind their road)
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
  const KNOWN = new Set(['terrain', 'hardscape', 'rocks', 'ao', 'plants', 'lights', 'gate', 'host', 'flags-road', 'flags-drop', 'blueprint', 'intro-helpers', 'intro-car', 'drone', 'drone-shadow', ...AREAS.map((d) => d.id)]);
  const flagDrop = named('flags-drop');
  const grown = ['site', ...scene.children.filter((o) => o.name && o.visible && !KNOWN.has(o.name) && !['people', 'traffic', 'gulls', 'led-boards', 'site', 'helicopter'].includes(o.name) && (o.isGroup || o.isMesh) && !o.isLight).map((o) => o.name)];
  const later = [...new Set(grown)].map(named).filter(Boolean);
  const popped = ['people', 'traffic', 'gulls', 'led-boards', 'helicopter'].map(named).filter(Boolean);

  /* ───── light: a warmer, low-contrast sun at the gate, back to the normal day as the camera rises ───── */
  const GOLD = new THREE.Color(0xffc68a), HAZE = new THREE.Color(0xf4dfc4); let warmOn = false;
  const warm = (k) => {
    if (k <= 0.001) { if (warmOn) { env.apply(); warmOn = false; } return; }
    env.apply(); warmOn = true;
    env.sun.color.lerp(GOLD, 0.5 * k); env.sun.intensity *= 1 + 0.1 * k; env.hemi.intensity *= 1 - 0.18 * k;
    if (env.horizon) env.horizon.lerp(HAZE, 0.4 * k);
  };

  /* ───── state ───── */
  let avRange = 0, t = 0, playing = false, resolve = null, stop = null, calmTick = () => {}, polMax = 1.4, distMin = 9, warmObj = [], driving = false, flying = false, end = null;
  const keep = new Map(); const remember = (o) => { if (!keep.has(o)) keep.set(o, { s: o.scale.clone(), p: o.position.clone(), v: o.visible }); return keep.get(o); };
  const first = areaById[FIRST];
  // (the welcome comes with the car; it goes while the name board is read, the plaque says it already)
  const capT = [[0.5, 'Umm Al Quwain, United Arab Emirates', 'Marhaba. Welcome to the Sheikh Khalifa Marine Research Centre'], [T.board - 0.2, null, null],
    [T.over + 1.0, 'Biosecurity starts at the gate', 'Every vehicle drives through the wheel bath'],
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
  /** the aim is steered, not set: each frame it turns towards where the shot wants to look, easing in and never faster than
   *  about 170°/s, so no blend of shots (and no shot passing over its subject) can swing or flip the view from one frame to the
   *  next (it is reset when film time jumps) */
  let aimDir = null, aimT = -1;
  const steer = (c, l, time) => {
    const dx = l[0] - c[0], dy = l[1] - c[1], dz = l[2] - c[2], r = Math.hypot(dx, dy, dz) || 1, w = [dx / r, dy / r, dz / r];
    const dt = time - aimT; aimT = time;
    if (!aimDir || dt <= 0 || dt > 0.25) { aimDir = w; return l; }
    const ang = Math.acos(clamp(aimDir[0] * w[0] + aimDir[1] * w[1] + aimDir[2] * w[2], -1, 1));
    if (ang > 1e-5) {
      const f = Math.min(1, Math.min(ang * (1 - Math.exp(-12 * dt)), 3.0 * dt) / ang);
      let v;
      if (ang > 3.1) v = [aimDir[0] + (w[0] - aimDir[0]) * f + aimDir[2] * 0.05, aimDir[1] + (w[1] - aimDir[1]) * f, aimDir[2] + (w[2] - aimDir[2]) * f - aimDir[0] * 0.05];
      else { const sn = Math.sin(ang), a = Math.sin((1 - f) * ang) / sn, b = Math.sin(f * ang) / sn; v = [aimDir[0] * a + w[0] * b, aimDir[1] * a + w[1] * b, aimDir[2] * a + w[2] * b]; }
      const n = Math.hypot(v[0], v[1], v[2]) || 1; aimDir = [v[0] / n, v[1] / n, v[2] / n];
    }
    return [c[0] + aimDir[0] * r, c[1] + aimDir[1] * r, c[2] + aimDir[2] * r];
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
      rig.fitOverride = buildFit(t, k); setFov(fovAt(t));
      rig.jump(poseFrom(c, steer(c, l, t))); rig._apply();
    } else if (flying) { rig.fitOverride = buildFit(t); setFov(fovAt(t)); }
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
    G.pr.value = t < T.road0 ? -1 : map.roadDur * clamp((t - T.road0) / (T.road1 - T.road0), 0, 1) + (t > T.road1 ? 9 : 0);
    G.p.value = t < T.infra ? -1 : Math.min((t - T.infra) * T.pace, G.pr.value);      // (the paving never runs ahead of its road)
    // the buildings: 08 first, then phase by phase
    for (const c of cons) buildState(c, t);
    for (const a of aos) a.o.material.opacity = a.op * smooth(win(t, a.at - 0.2, 0.9));
    // the cages come up out of the sea
    { const k = easeOut(win(t, T.sea, 1.8)), r = remember(sea); sea.position.y = r.p.y - 16 * (1 - k); sea.visible = k > 0 || r.v; world.sea.uniforms.uCageN.value = k > 0.5 ? cages.length : 0; }
    // LFC Hamour is simply moored at its berth, bow out, once the cages are up (no sailing in at speed: it looked like a game)
    if (lfc) { lfc.visible = t >= T.sea; lfc.position.x = L.LFC_BERTH.x; lfc.position.z = L.LFC_BERTH.z; lfc.rotation.y = L.LFC_BERTH.ry; }
    // street lights and trees
    for (const g of grows) applyGrow(g, t);
    // the rest grows, lights and screens go up, people and traffic come out
    later.forEach((o, i) => { const r = remember(o), k = win(t, T.life + i * 0.12, 1.3); o.scale.y = Math.max(TINY, backOut(k)) * r.s.y; o.visible = k > 0 && r.v; });   // hidden until it grows: flattened it still shows as a disc
    popped.forEach((o, i) => { const r = remember(o); o.visible = win(t, T.life + 0.2 + i * 0.12, 1) > 0.2 && r.v; });
    // the warm-up objects only had to be drawn once, to compile the shadow pass of the rising buildings under the loader
    if (warmObj.length && t > 0.6) { for (const w of warmObj) { scene.remove(w); w.geometry.dispose(); } warmObj = []; }
    // captions
    let ci = -1; capT.forEach((c, i) => { if (t >= c[0]) ci = i; });
    if (ci !== capI) { capI = ci; if (ci >= 0 && api.onCaption) api.onCaption(capT[ci][1], capT[ci][2], ci); }        // (a null caption hides it)
    if (api.onPhase) api.onPhase(t < T.p1 ? 0 : t < T.p2 ? 1 : t < T.p3 ? 2 : 3);
    engine.shadowDirty = true;
  }
  function restore() {
    for (const c of cons) { if (c.state !== 2) finishBuild(c); c.state = 2; }
    swapOut(groundSwaps);
    for (const g of grows) { g.im.instanceMatrix.array.set(g.o); g.im.instanceMatrix.needsUpdate = true; }
    for (const a of aos) a.o.material.opacity = a.op;
    for (const [o, r] of keep) { o.scale.copy(r.s); o.position.copy(r.p); o.visible = r.v; }
    world.sea.uniforms.uCageN.value = cages.length; if (lfc) { lfc.visible = true; lfc.position.x = L.LFC_BERTH.x; lfc.position.z = L.LFC_BERTH.z; lfc.rotation.y = L.LFC_BERTH.ry; }
    for (const w of warmObj) scene.remove(w); warmObj = [];
    if (V.interior) V.interior.visible = false;
    warm(0); if (warmOn) env.apply();
    if (E) { E.setGate(1); E.setBoom(1); E.wash.reset(); } driving = false; car.group.visible = false; G.pre.value.z = ISLAND; G.pre.value.w = 1;
    const h = hero(); rig.fitOverride = null; rig.floorOverride = null; rig.fovGoal = h.fov; rig.limits.distMin = distMin;
    sheet.visible = false; engine.shadowDirty = true;
  }
  /** hide what is to be built; call before the loader lifts */
  /** quick: skip the warm-up drawing (a slow device that is already late: better a hitch in the film than a long loader) */
  /** everything the film needs drawn once under the loader. It runs in pieces with a frame between them (the mirror's shaders, the
   *  pictures a few at a time, the site drawn on the screen, then into the mirror), so the loader keeps moving instead of
   *  freezing for half a second */
  api.prepare = async ({ quick = false } = {}) => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    // the wheel bath's mirror draws the scene into a picture of its own, and every surface needs a second shader for that:
    // compile them all now, under the loader (helpers, the car and 08 included), not when the camera first comes near the bath
    if (!quick && E && E.mirror && E.mirror.getRenderTarget) { const r = engine.renderer, was = r.getRenderTarget(), vis = helpers.visible; helpers.visible = true; r.setRenderTarget(E.mirror.getRenderTarget()); try { r.compile(scene, world.camera); } catch (e) { /* only a warm-up */ } r.setRenderTarget(was); helpers.visible = vis; }
    // and send every picture in the scene to the graphics card now (08's screens, panels and photos are big): a texture is otherwise uploaded the first time it is drawn, which stalls that frame
    if (!quick) { await frame(); const r = engine.renderer, list = new Set(), up = (tx) => { if (tx && tx.isTexture) list.add(tx); };
      scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { for (const k in m) up(m[k]); if (m.uniforms) for (const k in m.uniforms) up(m.uniforms[k] && m.uniforms[k].value); } });
      let t0 = performance.now();
      for (const tx of list) { try { r.initTexture(tx); } catch (e) { /* only a warm-up */ } if (performance.now() - t0 > 40) { await frame(); t0 = performance.now(); } } }
    // let 08's inside run once (its screens draw their first picture, its people take their places)
    for (const u of V.updaters || []) { try { u(1 / 60, 0); } catch (e) { /* only a warm-up */ } }
    // draw the whole site once with 08's inside, the car and the stand-ins showing, on the screen (under the loader) and
    // into the mirror's picture: every shape is on the graphics card and every surface prepared before the film starts
    if (!quick) { let iv = false, hv = false;
      const show = () => { iv = V.interior ? V.interior.visible : false; hv = helpers.visible; if (V.interior) V.interior.visible = true; car.group.visible = true; helpers.visible = true; };
      const hide = () => { if (V.interior) V.interior.visible = iv; car.group.visible = false; helpers.visible = hv; };
      await frame(); world.warm(show, hide, [null]);
      if (E && E.mirror && E.mirror.getRenderTarget) { await frame(); world.warm(show, hide, [E.mirror.getRenderTarget()]); }
      await frame(); }
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
    resolve = res; playing = api.playing = true; world.filming = true; t = 0; capI = -1; end = hero();          // captions fire again now that someone is listening
    wakeT = { f: -1, r: -1 }; splashed = { f: false, r: false, out: false }; driving = true; flying = false; lastX = route.at(0);
    rig.user = false; rig.limits.polMax = 1.66; rig.limits.distMin = 0.5; rig.floorOverride = 0.3; setState(0);
    // the governor may lower the resolution only while the camera is nearly still (the slow slide along the name wall), never mid-pan
    { const cam = world.camera, d0 = new THREE.Vector3(), d1 = new THREE.Vector3(), p0 = new THREE.Vector3(); let has = false; api.calm = true;
      engine.judgeFrom = engine.frames + 60; engine.mayDrop = () => !playing || api.calm;
      calmTick = (dt) => { cam.getWorldDirection(d1); if (has && dt > 0) { const turn = (Math.acos(Math.min(1, d0.dot(d1))) * 180) / Math.PI / dt, mv = p0.distanceTo(cam.position) / dt; api.calm = turn < 35 && mv < 3.2; } d0.copy(d1); p0.copy(cam.position); has = true; }; }
    stop = engine.onFrame((dt) => {
      if (!playing) return;
      setState(t + dt); calmTick(dt);
      if (!flying && t >= T.fly0) {
        // the crane-up has come to rest high over the flag road: from here the camera flies the path, starting from exactly that pose;
        // it drifts round to the north-west of the site while everything goes up, then comes down over 08's drop-off into the hero
        flying = true; rig.fitOverride = buildFit(t); rig.floorOverride = null; rig.limits.distMin = distMin; rig.limits.polMax = 1.56;
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
    if (!playing) return; playing = api.playing = false; world.filming = false; if (stop) stop(); engine.noUp = false; engine.mayDrop = () => true; engine.judgeFrom = undefined; if (avRange) avatars.rangeMax = avRange;
    restore(); scene.remove(sheet); lg.dispose(); paper.geometry.dispose(); paper.material.dispose(); lines.material.dispose();
    for (const s of groundSwaps) s[2].dispose(); for (const c of cons) { for (const s of c.ms) s[2].dispose(); c.depth.dispose(); }
    map.tex.dispose(); rig.limits.polMax = polMax; scene.remove(car.group); car.dispose();
    const h = hero();
    if (skipped) { rig.stopPath(); rig.fovGoal = h.fov; rig.flyTo(h, { dur: 1.1, hop: 0 }); }
    if (api.onCaption) api.onCaption(null);
    const r = resolve; resolve = null; r && r(skipped);
  };
  return api;
}
