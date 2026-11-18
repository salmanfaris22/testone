// Builds every area and the life around them.
import { createAreas } from './areas.js';
import { buildHalls } from './halls.js';
import { buildPark } from './park.js';
import { buildCages } from './cages.js';
import { buildSite } from './site.js';
import { buildHelipad } from './helipad.js';
import { createFish } from './fish.js';
import * as THREE from 'three';
import { AREAS, TOUR } from '../data/areas.js';
import { uploadNow } from './screens.js';
import { causticTexture } from './reef.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
export const ORDER = AREAS.map((a) => a.id);       // phase order

export async function buildAll(world, onProgress) {
  world.items = new Map(); uploadNow.renderer = world.engine.renderer;
  world.areas = createAreas(world);
  world.fish = createFish(world);
  world.park = buildPark(world); onProgress(0.45); await tick();
  buildHalls(world); onProgress(0.62); await tick();
  world.cages = buildCages(world); onProgress(0.7); await tick();
  buildSite(world); buildHelipad(world); onProgress(0.8); await tick();
  world.areas.list.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  world.areas.ensure(world.areas.byId.seacages);
  world.updaters.push((dt, t) => world.areas.update(dt, t));
  world.openArea = (id, instant) => world.areas.open(id, instant);
  world.closeArea = (id, instant) => world.areas.close(id, instant);
  backgroundWork(world);
  onProgress(0.9);
}

/* ───── background work, one piece per calm frame ───── */
// The insides not built at load are built in the background, one at a time, each followed by its pictures (sent to the graphics
// card one per frame) and one drawing of it out of sight, so no roof ever stalls as it lifts. Every piece waits for a calm frame:
// the camera at rest or drifting, nobody scrolling, dragging or pressing keys, no roof moving. A piece is one inside or one
// picture, so even a calm frame costs at most one short hitch, and the quality governor is told not to judge by it.
// They go in tour order, and the scroll tour asks for the next area ahead of the rest (world.soon), so the area it comes to
// next is ready while its card is being read.
function backgroundWork(world) {
  const E = world.engine, jobs = (world.jobs = []);
  let lastInput = -1e9, pre = null;
  const touch = (e) => { if (e.type !== 'pointermove' || e.buttons) lastInput = performance.now(); };
  for (const ev of ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'pointermove', 'keydown']) addEventListener(ev, touch, { passive: true, capture: true });
  world.calm = () => performance.now() - lastInput > 400 && world.rig.speed < 6 && !world.animating;
  E.mayChange = () => world.calm();                 // the picture's resolution changes only at such a moment too (engine.js)
  world.slowJobs = [];                              // (pieces that took over 25 ms, for checking)
  /** any other piece of work that can wait for a calm frame (a picture redrawn once its photos arrive, and sent to the card) */
  E.later = uploadNow.later = (fn, label = '') => { fn.label = label; jobs.push(fn); };
  /** a small piece that should not wait for calm (a decoded photo going to the card: a few ms): one per frame, 120 ms apart */
  const quick = []; let quickAt = 0;
  E.soon = (fn, label = '') => { fn.label = label; quick.push(fn); };
  E.onFrame(() => {
    if (quick.length && performance.now() - quickAt > 120) { quickAt = performance.now(); const q = quick.shift(); try { q(); } catch (e) { console.warn('background work:', e); } return; }
    if (!jobs.length || !world.calm()) return;
    E.hold(450);
    const job = jobs.shift(), t0 = performance.now();
    try { job(); } catch (e) { console.warn('background work:', e); }
    const ms = performance.now() - t0; if (ms > 25 && world.slowJobs.length < 40) world.slowJobs.push(`${job.label || '?'} ${Math.round(ms)}`);
  });

  const props = E.renderer.properties;
  const fresh = (t) => t && t.isTexture && t.version > 0 && props.get(t).__version !== t.version;
  function picturesOf(...roots) {
    const out = new Set();
    for (const r of roots) if (r) r.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { for (const k of ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'bumpMap']) if (fresh(m[k])) out.add(m[k]); if (m.uniforms) for (const u in m.uniforms) if (fresh(m.uniforms[u].value)) out.add(m.uniforms[u].value); } });
    return [...out];
  }
  // (one picture per frame: the browser passes picture data to the graphics card through a buffer of limited size, and a
  // frame that sends many big ones at once waits for it to drain, where one at a time costs a frame nothing)
  const sendJob = (t, why) => Object.assign(() => { if (fresh(t)) try { E.renderer.initTexture(t); } catch (e) { /* sent on first use instead */ } }, { label: `picture ${why} ${t.image ? t.image.width + 'x' + t.image.height : ''}` });
  const cam = new THREE.PerspectiveCamera(60, 1, 1, 3000), box = new THREE.Box3(), mid = new THREE.Vector3(), size = new THREE.Vector3(); cam.layers.enable(1);
  /** draw one inside once, from straight over it with a lens that takes in just that inside, under the normal picture (which
   *  is drawn over it in this same frame): its shapes go to the graphics card now rather than in the frame its roof first lifts */
  function warmArea(a) {
    if (!a.interior || a.interior.visible || a.drawn) return;              // on show, or shown before: it has been drawn for real
    const r = E.renderer, uv = a.upper ? a.upper.visible : false, sh = r.shadowMap.needsUpdate, was = r.getRenderTarget();
    for (const u of a.updaters || []) { try { u(1 / 60, E.t); } catch (e) { /* only a warm-up */ } }
    a.interior.visible = true; if (a.upper) a.upper.visible = true;
    // (the frame comes from the area's own outline, not from measuring every shape in it: people would be posed to measure)
    box.makeEmpty(); for (const q of a.hit || []) for (const [x, z] of [[q[0], q[2]], [q[3], q[5]], [q[0], q[5]], [q[3], q[2]]]) { const w = a.toWorld(x, z); box.expandByPoint(mid.set(w[0], q[1], w[1])); box.expandByPoint(mid.set(w[0], q[4], w[1])); }
    if (box.isEmpty()) box.setFromCenterAndSize(mid.set(a.frame.x, 3, a.frame.z), size.set(60, 8, 60));
    box.getCenter(mid); box.getSize(size);
    const R = Math.max(4, Math.hypot(size.x, size.z) / 2), h = R / Math.tan((30 * Math.PI) / 180) + size.y;
    cam.aspect = 1; cam.near = Math.max(0.5, h - size.y - 2); cam.far = h + 40; cam.updateProjectionMatrix();
    cam.position.set(mid.x, mid.y + h, mid.z); cam.lookAt(mid.x, mid.y, mid.z + 0.001); cam.updateMatrixWorld();
    r.shadowMap.needsUpdate = false;
    try { r.setRenderTarget(null); r.render(world.scene, cam); } catch (e) { /* only a warm-up */ }
    r.setRenderTarget(was); r.shadowMap.needsUpdate = sh; a.interior.visible = false; if (a.upper) a.upper.visible = uv;
  }
  /**
   * The shadow pass draws every caster with a depth shader of its own kind (cut-out leaves, people with bones, rows of copies,
   * one side or both), and three.js makes each kind the first time such a caster is in the sun's view, stopping that frame
   * while it compiles. Here one stand-in of each kind found in the scene is compiled on the driver's own threads, with the
   * same settings the shadow pass will use (drawing into a target, not the screen), so the shadow pass finds them ready.
   */
  const FLIP = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };
  function shadowShaders() {
    const r = E.renderer, kinds = new Map(), stand = new THREE.Group(), tiny = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    world.scene.traverse((o) => {
      if (!o.isMesh || !o.castShadow || o.customDepthMaterial) return;
      for (const m of [].concat(o.material)) {
        if (!m) continue;
        // (as three.js's shadow pass sets its depth material: the caster's side turned over, its pictures, its alpha cut)
        const side = m.shadowSide !== null && m.shadowSide !== undefined ? m.shadowSide : FLIP[m.side], at = m.alphaToCoverage === true ? 0.5 : m.alphaTest;
        const key = [!!o.isSkinnedMesh, !!o.isInstancedMesh, !!o.instanceColor, !!m.map, !!m.alphaMap, at > 0, side].join();
        if (kinds.has(key)) continue;
        const d = new THREE.MeshDepthMaterial(); d.side = side; d.map = m.map || null; d.alphaMap = m.alphaMap || null; d.alphaTest = at;
        let q;
        if (o.isSkinnedMesh) { q = new THREE.SkinnedMesh(o.geometry, d); q.bind(o.skeleton, o.bindMatrix); }
        else if (o.isInstancedMesh) { q = new THREE.InstancedMesh(tiny, d, 1); if (o.instanceColor) q.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(3), 3); }
        else q = new THREE.Mesh(tiny, d);
        kinds.set(key, q); stand.add(q);
      }
    });
    // (the shadow pass draws into a target and without the scene's fog: so are these, or their shaders would not be the same ones)
    const was = r.getRenderTarget(), rt = new THREE.WebGLRenderTarget(1, 1), fog = world.scene.fog;
    try { world.scene.fog = null; r.setRenderTarget(rt); r.compile(stand, world.camera, world.scene); } catch (e) { /* compiled on first use instead */ }
    world.scene.fog = fog; r.setRenderTarget(was); rt.dispose();
  }
  const order = (a) => { const i = TOUR.findIndex((t) => t.id === a.id); return i < 0 ? 99 : i; };
  const retry = (fn) => jobs.splice(Math.min(2, jobs.length), 0, fn);          // (not ready yet: try again a couple of pieces later)
  const jobFor = new Map();
  /** build the remaining interiors in the background (call as often as you like: it queues the work once) */
  world.prebuild = () => pre || (pre = new Promise((resolve) => {
    // the shaders of everything the page added after the loader compiled the site (the drone and its dock, the controls'
    // markers), compiled on the driver's own threads, so pressing Drone never waits for one
    jobs.push(Object.assign(() => { try { E.renderer.compileAsync(world.scene, world.camera).catch(() => {}); } catch (e) { /* compiled on first use */ } }, { label: 'shaders' }));
    jobs.push(Object.assign(() => shadowShaders(), { label: 'shadow shaders' }));
    jobs.push(Object.assign(() => causticTexture(), { label: 'caustics' }));          // (the sunlight net on the aquarium floor is drawn pixel by pixel)
    // first, every picture on the site the camera has not looked at yet (the gate sign, the boards, the far buildings), so the
    // scroll tour never meets one for the first time
    for (const t of picturesOf(world.scene)) jobs.push(sendJob(t, 'site'));
    const list = world.areas.list.filter((a) => !a.host && a.makeInterior).sort((p, q) => order(p) - order(q));
    for (const a of list) {
      // its pictures and its drawing wait until the driver has compiled its shaders (areas.js), then go ahead of the next area
      const draw = Object.assign(() => { if (a.compiling) { retry(draw); return; } warmArea(a); }, { label: `draw ${a.id}` });
      const pics = Object.assign(() => {
        if (a.compiling) { retry(pics); return; }
        if (!a.interior || a.interior.visible || a.drawn) return;
        jobs.unshift(...picturesOf(a.interior, a.upper).map((t) => sendJob(t, a.id)), draw);
      }, { label: `pictures ${a.id}` });
      const job = Object.assign(() => { jobFor.delete(a.id); if (!a.built) world.areas.ensure(a); jobs.unshift(pics); }, { label: `build ${a.id}` });
      jobFor.set(a.id, job); jobs.push(job);
    }
    jobs.push(resolve);
  }));
  /** the scroll tour is about to come to this area: do its piece next */
  world.soon = (id) => { const a = world.areas.byId[id], k = a && (jobFor.get(a.host || id)); if (!k) return; const i = jobs.indexOf(k); if (i > 0) { jobs.splice(i, 1); jobs.unshift(k); } };
}
