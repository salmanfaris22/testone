// The opening: the camera starts at the gate, where the Emirati host welcomes you, then rises over a blueprint of the site.
// The footprints draw themselves, the buildings rise phase by phase (1, 2, 3), the cages come up out of the sea,
// LFC Hamour sails in, the planting grows and the site comes to life, and the camera settles into the hero view.
import * as THREE from 'three';
import { P } from './rig.js';
import { clamp, easeIO, easeOut, smooth } from './kit.js';
import { AREAS, PHASES } from '../data/areas.js';
import { LFC_BERTH, GATE } from './layout.js';

const backOut = (t) => { const s = 1.25; t -= 1; return t * t * ((s + 1) * t + s) + 1; };
const win = (t, a, d) => clamp((t - a) / d, 0, 1);
const TINY = 1e-4;

/** timeline, in seconds */
const T = { gate: 0, rise: 2.7, draw0: 3.0, draw1: 6.6, p1: 5.4, p2: 7.4, p3: 9.9, sea: 10.4, boat: 11.5, life: 12.4, settle: 14.0, end: 15.6 };

export function createIntro(world, { hero }) {
  const { scene, areas, rig, engine } = world;
  const A = areas.byId, named = (n) => scene.children.find((o) => o.name === n);
  // first shot: from the road outside the gatehouse, looking in under the canopy at the host by the name wall
  const gate = P(GATE.host[0], 1.7, GATE.host[1], -1.66, 1.548, 40);
  const ph = { 1: [], 2: [], 3: [] };
  for (const a of AREAS) if (a.id !== 'seacages') ph[a.phase].push(A[a.id].root);
  const sea = A.seacages.root, lfc = world.cages && world.cages.lfc;
  const later = ['site', 'plants', 'lights', 'people', 'traffic', 'gulls', 'led-boards', 'flags-drop'].map(named).filter(Boolean);

  /* ───── the blueprint: a sheet of drawing paper laid over the site with a grid, and every footprint drawn on it ───── */
  const BP = { x: -40, z: 70, r0: 300, r1: 430 };
  const U = { uOp: { value: 0 }, uDraw: { value: 0 }, uT: { value: 0 } };
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(BP.r1 * 2.2, BP.r1 * 2.2).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uOp, uT; varying vec2 vW;
      float grid(vec2 p, float s, float w){ vec2 g = abs(fract(p / s - 0.5) - 0.5) * s; vec2 fw = fwidth(p) * w; vec2 l = 1.0 - smoothstep(vec2(0.0), fw, g); return max(l.x, l.y); }
      void main(){
        float d = distance(vW, vec2(${BP.x.toFixed(1)}, ${BP.z.toFixed(1)}));
        float edge = 1.0 - smoothstep(${BP.r0.toFixed(1)}, ${BP.r1.toFixed(1)}, d);
        float g = grid(vW, 10.0, 1.0) * 0.32 + grid(vW, 50.0, 1.6) * 0.55;
        vec3 col = mix(vec3(0.07, 0.30, 0.55), vec3(0.86, 0.95, 1.0), g);
        gl_FragColor = vec4(col, uOp * edge * (0.78 + 0.22 * g));
        #include <colorspace_fragment>
      }` }));
  paper.position.set(BP.x, 0.52, BP.z); paper.renderOrder = 5; paper.frustumCulled = false;

  // footprints: thin ribbons along every building outline and round every cage, revealed in drawing order
  const pos = [], tt = [], idx = [];
  const ribbon = (pts, t0, t1, closed = true, w = 0.9, y = 0.62) => {
    const P2 = closed ? pts.concat([pts[0]]) : pts; let len = 0; const L = [0];
    for (let i = 1; i < P2.length; i++) { len += Math.hypot(P2[i][0] - P2[i - 1][0], P2[i][1] - P2[i - 1][1]); L.push(len); }
    for (let i = 0; i < P2.length - 1; i++) {
      const a = P2[i], c = P2[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = (-dz / l) * w * 0.5, nz = (dx / l) * w * 0.5, b0 = pos.length / 3;
      const ta = t0 + (t1 - t0) * (L[i] / len), tc = t0 + (t1 - t0) * (L[i + 1] / len);
      pos.push(a[0] - nx, y, a[1] - nz, a[0] + nx, y, a[1] + nz, c[0] + nx, y, c[1] + nz, c[0] - nx, y, c[1] - nz); tt.push(ta, ta, tc, tc);
      idx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
    }
  };
  const rect = (a, b) => { const [x0, , z0, x1, , z1] = b; return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => a.toWorld(x, z)); };
  const lists = { 1: [], 2: [], 3: [] };
  for (const d of AREAS) { const a = A[d.id]; if (d.id === 'seacages') continue; for (const b of a.hit || []) lists[d.phase].push(rect(a, b)); }
  const span = { 1: [0, 0.3], 2: [0.3, 0.66], 3: [0.66, 0.86] };
  for (const k of [1, 2, 3]) { const l = lists[k], [s0, s1] = span[k]; l.forEach((pts, i) => { const a = s0 + ((s1 - s0) * i) / l.length, b = s0 + ((s1 - s0) * (i + 1.6)) / l.length; ribbon(pts, a, Math.min(s1, b)); }); }
  const cages = (world.cages && world.cages.cages) || [];
  cages.forEach((c, i) => { const pts = []; for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; pts.push([c.x + Math.cos(a) * c.r, c.z + Math.sin(a) * c.r]); } const a = 0.86 + (0.13 * i) / cages.length; ribbon(pts, a, a + 0.05, true, 1.0, 0.62); });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1)); lg.setIndex(idx);
  const lines = new THREE.Mesh(lg, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uOp, uDraw; varying float vT; void main(){ if (vT > uDraw) discard; float head = smoothstep(uDraw - 0.012, uDraw, vT); vec3 c = mix(vec3(1.0), vec3(1.0, 0.72, 0.35), head); gl_FragColor = vec4(c, uOp);
      #include <colorspace_fragment>
    }` }));
  lines.renderOrder = 6; lines.frustumCulled = false;
  const sheet = new THREE.Group(); sheet.name = 'blueprint'; sheet.add(paper, lines); scene.add(sheet);      // visible (but clear) until prepare(), so it is compiled with the rest

  /* ───── state ───── */
  let t = 0, playing = false, resolve = null, stop = null, polMax = 1.4;
  const keep = new Map(); const remember = (o) => { if (!keep.has(o)) keep.set(o, { s: o.scale.clone(), p: o.position.clone(), v: o.visible }); return keep.get(o); };
  const allRise = [...ph[1], ...ph[2], ...ph[3]];
  const capT = [[T.gate, 'Umm Al Quwain, United Arab Emirates', 'Marhaba. Welcome to the Sheikh Khalifa Marine Research Centre'], [T.rise + 0.6, 'From the first sketch', 'A marine hatchery, built in three phases'],
    [T.p1, `${PHASES[0].name}`, PHASES[0].title], [T.p2, `${PHASES[1].name}`, PHASES[1].title], [T.p3, `${PHASES[2].name}`, PHASES[2].title], [T.life, 'Today', 'One centre, from egg to sea']];
  let capI = -1;
  const api = { playing: false, onCaption: null, onPhase: null, get time() { return t; } };
  function setState(time) {
    t = time;
    // the blueprint
    const op = smooth(win(t, T.rise - 0.4, 1.2)) * (1 - smooth(win(t, T.life - 0.6, 1.6)));
    U.uOp.value = op; U.uDraw.value = 1.08 * easeIO(win(t, T.draw0, T.draw1 - T.draw0)) + 0.0001; sheet.visible = op > 0.002;
    // buildings rise, one after another inside each phase
    const rise = (list, t0, gap, dur) => list.forEach((o, i) => { const k = win(t, t0 + i * gap, dur), s = k <= 0 ? TINY : Math.max(TINY, backOut(k)); o.scale.y = s * remember(o).s.y; o.visible = k > 0 || remember(o).v; });
    rise(ph[1], T.p1, 0.25, 1.5); rise(ph[2], T.p2, 0.32, 1.45); rise(ph[3], T.p3, 0.3, 1.5);
    // the cages come up out of the sea
    { const k = easeOut(win(t, T.sea, 1.8)), r = remember(sea); sea.position.y = r.p.y - 16 * (1 - k); world.sea.uniforms.uCageN.value = k > 0.5 ? cages.length : 0; }
    // LFC Hamour sails in from the open sea to the jetty
    if (lfc) { const k = win(t, T.boat, 3.2), e = easeOut(k); lfc.visible = k > 0; lfc.position.x = LFC_BERTH.x; lfc.position.z = LFC_BERTH.z + 190 * (1 - e); }
    // the planting grows, lights and screens go up, people and traffic come out
    later.forEach((o, i) => { const r = remember(o), k = win(t, T.life + i * 0.12, 1.3); if (o.name === 'plants' || o.name === 'lights' || o.name === 'site') { o.scale.y = Math.max(TINY, backOut(k)) * r.s.y; o.visible = r.v; } else { o.visible = k > 0.2 && r.v; } });
    // captions
    let ci = -1; capT.forEach((c, i) => { if (t >= c[0]) ci = i; });
    if (ci !== capI) { capI = ci; if (ci >= 0 && api.onCaption) api.onCaption(capT[ci][1], capT[ci][2], ci); }
    if (api.onPhase) api.onPhase(t < T.p1 ? 0 : t < T.p2 ? 1 : t < T.p3 ? 2 : 3);
    engine.shadowDirty = true;
  }
  function restore() {
    for (const [o, r] of keep) { o.scale.copy(r.s); o.position.copy(r.p); o.visible = r.v; }
    world.sea.uniforms.uCageN.value = cages.length; if (lfc) { lfc.visible = true; lfc.position.x = LFC_BERTH.x; lfc.position.z = LFC_BERTH.z; }
    sheet.visible = false; engine.shadowDirty = true;
  }
  /** hide what is to be built; call before the loader lifts */
  api.prepare = () => { for (const o of [...allRise, sea, ...later]) remember(o); if (lfc) remember(lfc); setState(0); polMax = rig.limits.polMax; rig.limits.polMax = 1.56; rig.jump(gate); };
  api.play = () => new Promise((res) => {
    resolve = res; playing = api.playing = true; t = 0; capI = -1;          // captions fire again now that someone is listening
    const keys = [
      { p: gate }, { p: P(GATE.host[0], 1.6, GATE.host[1], GATE.hostRy, 1.44, 16), t: T.rise },
      { p: P(-235, 0, -42, -1.6, 1.08, 190), t: 2.6 }, { p: P(-80, 0, 40, -1.3, 0.93, 520), t: 2.9 }, { p: P(-70, 0, 120, -1.12, 0.95, 640), t: 3.2 },
      { p: hero, t: T.end - T.rise - 2.6 - 2.9 - 3.2 },
    ];
    rig.user = false; rig.limits.polMax = 1.56; rig.playPath(keys);
    stop = engine.onFrame((dt) => { if (!playing) return; setState(t + dt); if (t >= T.end) api.finish(false); });
  });
  /** jump to the end (skip button, a scroll, a key) or wrap up when the film is over */
  api.finish = (skipped = true) => {
    if (!playing) return; playing = api.playing = false; if (stop) stop();
    restore(); scene.remove(sheet); lg.dispose(); paper.geometry.dispose(); rig.limits.polMax = polMax;
    if (skipped) { rig.stopPath(); rig.flyTo(hero, { dur: 1.1, hop: 0 }); }
    if (api.onCaption) api.onCaption(null);
    const r = resolve; resolve = null; r && r(skipped);
  };
  return api;
}
