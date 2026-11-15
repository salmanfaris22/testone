// Species section: an underwater studio with one life-size fish you can turn, and its details.
import * as THREE from 'three';
import { SPECIES, speciesById } from '../data/species.js';
import { areaById } from '../data/areas.js';
import { clamp, damp, rng, TAU, canvasTex } from '../world/kit.js';

const ANCHOR = { r: 'translate(-6px,-50%)', l: 'translate(-100%,-50%) translateX(6px)', u: 'translate(-50%,-100%) translateY(6px)', d: 'translate(-50%,0) translateY(-6px)' };
const ANCHOR_M = { r: 'translate(-86%,0) translateY(-6px)', l: 'translate(-14%,0) translateY(-6px)', u: 'translate(-50%,-100%) translateY(6px)', d: 'translate(-50%,0) translateY(-6px)' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createSpecies(world, { onGoto, onAsk }) {
  const { engine } = world;
  const tabsEl = document.getElementById('species-tabs'), cardEl = document.getElementById('species-card'), viewEl = document.getElementById('species-view'), hotEl = document.getElementById('species-hot');
  tabsEl.innerHTML = SPECIES.map((s, i) => `<button type="button" role="tab" data-sp="${s.id}" aria-selected="${i === 0}"><b>${esc(s.local)}</b><small>${esc(s.tab || s.common)}</small></button>`).join('');

  /* ───── the studio ───── */
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0c6a8e, 0.05); scene.environment = world.scene.environment; scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(30, engine.w / engine.h, 0.1, 120); camera.position.set(0, 0.1, 5.4); camera.lookAt(0, 0, 0);
  const uT = { value: 0 };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uT },
    vertexShader: 'varying vec3 v; void main(){ v = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 v; uniform float uT; void main(){ vec3 d = normalize(v); float h = d.y;
      vec3 c = mix(vec3(0.02, 0.2, 0.33), vec3(0.05, 0.47, 0.64), smoothstep(-0.5, 0.25, h)); c = mix(c, vec3(0.42, 0.84, 0.9), smoothstep(0.2, 1.0, h));
      float a = atan(d.z, d.x); float ray = pow(max(0.0, sin(a * 9.0 + uT * 0.12) * 0.5 + 0.5), 6.0) * smoothstep(0.0, 0.9, h) * 0.22; c += vec3(0.5, 0.9, 1.0) * ray;
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` })));
  scene.add(new THREE.HemisphereLight(0xc8f2ff, 0x0b4666, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(1.5, 5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7fe0ff, 1.1); rim.position.set(-3, 1, -4); scene.add(rim);
  // light shafts
  const shaftTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, w, h); }, { repeat: false });
  const shafts = []; const R = rng(9);
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + R() * 2.2, 14), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.1 + R() * 0.12, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: 0xbff4ff })); m.position.set(-8 + R() * 16, 2.5, -3 - R() * 7); m.rotation.z = -0.25 + R() * 0.12; scene.add(m); shafts.push(m); }
  // drifting particles
  { const n = 320, pos = new Float32Array(n * 3), ph = new Float32Array(n); for (let i = 0; i < n; i++) { pos.set([-9 + R() * 18, -4 + R() * 8, -8 + R() * 11], i * 3); ph[i] = R(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
    const pm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT, uS: { value: 1 } },
      vertexShader: 'attribute float aPh; uniform float uT, uS; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y + 4.0 + uT * (0.05 + aPh * 0.12), 8.0) - 4.0; p.x += sin(uT * 0.3 + aPh * 40.0) * 0.2; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (0.012 + aPh * 0.03) * uS / -mv.z; vA = 0.25 + aPh * 0.5; }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(0.8, 0.97, 1.0) * vA * (1.0 - d * 2.0), 1.0); }' });
    const pts = new THREE.Points(g, pm); pts.frustumCulled = false; scene.add(pts); world.addScaled(pm.uniforms.uS); }

  const pivot = new THREE.Group(); scene.add(pivot);
  let fish = null, school = null, cur = null, L = 2.4;
  const rot = { yaw: 0.28, pitch: 0.04, gy: 0.28, gp: 0.04, drag: false, idle: 0 };
  const hots = [];

  function select(id, focus = false) {
    const s = speciesById[id]; if (!s || cur === id) return; cur = id;
    for (const b of tabsEl.children) b.setAttribute('aria-selected', String(b.dataset.sp === id));
    if (fish) { pivot.remove(fish); fish.geometry.dispose(); } if (school) { scene.remove(school); school.geometry.dispose(); }
    const model = world.fish.FISH[id] ? id : 'naisrah';
    fish = world.fish.mesh(model, [[0, 0, 0, 0, 0, 0.3, Math.PI, 1, 1]], true); pivot.add(fish);
    const rows = []; const Q = rng(id.length * 7 + 3); for (let i = 0; i < 16; i++) rows.push([0, -9, 7 + Q() * 6, 2 + Q() * 3, -1.6 + Q() * 3.4, Q(), (0.05 + Q() * 0.05) * (i % 5 ? 1 : -1), 0.5 + Q() * 0.35, 0]);
    school = world.fish.mesh(model, rows); scene.add(school);
    rot.gy = 0.28; rot.gp = 0.04;
    // card
    cardEl.innerHTML = `<span class="sp-status${s.status === 'Under evaluation' ? ' is-eval' : ''}">${esc(s.status)}</span>
      <h3>${esc(s.local)}</h3><p class="sp-names">${esc(s.common)}${s.sci ? `, <i>${esc(s.sci)}</i>` : ''}</p>
      <p class="sp-about">${esc(s.about)}</p>
      <dl class="sp-facts">${s.facts.map(([v, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <p class="sp-h">How it is farmed</p><p class="sp-about" style="margin-top:4px">${esc(s.farm)}</p>
      <p class="sp-h">Supply</p><ul class="sp-list">${s.supply.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="sp-h">Follow it through the centre</p><div class="sp-path">${s.stages.map((a) => `<button type="button" data-goto="${a}"><b>${areaById[a].n}</b>${esc(areaById[a].short)}</button>`).join('')}</div>
      <button class="btn btn-solid" type="button" data-ask="${esc(s.local)}">${s.status === 'Under evaluation' ? `Register interest in ${esc(s.local)}` : `Ask about ${esc(s.local)} fry`}</button>`;
    cardEl.scrollTop = 0;
    hotEl.innerHTML = ''; hots.length = 0;
    (s.anatomy || []).forEach((a, i) => { const el = document.createElement('div'); el.className = 'hot is-' + (a.side || 'r'); el.innerHTML = `<i></i><span><b>${esc(a.t)}</b><em>${esc(a.d)}</em></span>`; hotEl.appendChild(el); hots.push({ el, a }); });
    if (focus) tabsEl.querySelector(`[data-sp="${id}"]`).scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    fit();
  }
  tabsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-sp]'); if (b) select(b.dataset.sp); });
  tabsEl.addEventListener('keydown', (e) => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const i = SPECIES.findIndex((s) => s.id === cur), n = SPECIES[(i + (e.key === 'ArrowRight' ? 1 : -1) + SPECIES.length) % SPECIES.length]; select(n.id, true); tabsEl.querySelector(`[data-sp="${n.id}"]`).focus(); });
  cardEl.addEventListener('click', (e) => { const g = e.target.closest('[data-goto]'); if (g) return onGoto(g.dataset.goto); const a = e.target.closest('[data-ask]'); if (a) onAsk(a.dataset.ask); });

  // turning the fish by hand
  let lx = 0, ly = 0;
  viewEl.addEventListener('pointerdown', (e) => { rot.drag = true; lx = e.clientX; ly = e.clientY; try { viewEl.setPointerCapture(e.pointerId); } catch {} });
  viewEl.addEventListener('pointermove', (e) => { if (!rot.drag) return; rot.gy += (e.clientX - lx) * 0.008; rot.gp = clamp(rot.gp + (e.clientY - ly) * 0.004, -0.5, 0.5); lx = e.clientX; ly = e.clientY; rot.idle = 0; });
  for (const ev of ['pointerup', 'pointercancel']) viewEl.addEventListener(ev, () => { rot.drag = false; });

  let rect = null;
  function fit() {
    rect = viewEl.getBoundingClientRect(); const w = engine.w, h = engine.h;
    camera.aspect = w / h; const vis = 2 * 5.4 * Math.tan((15 * Math.PI) / 180);        // world height seen at the fish
    L = clamp(Math.min(((engine.w < 720 ? 0.74 : 0.6) * rect.width * vis) / h, (0.9 * rect.height * vis) / h / 0.52), 0.9, 3.4);   // leave room for the side labels
    if (fish) { const a = fish.geometry.attributes.aMove; a.setW(0, L); a.needsUpdate = true; }
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', fit);
  const v3 = new THREE.Vector3();
  let active = false;
  const api = {
    scene, camera, select,
    setActive(v) { if (v === active) return; active = v; if (v) { engine.altCamera = camera; fit(); engine.view = { scene, camera }; } else { engine.view = { scene: world.scene, camera: world.camera }; engine.altCamera = null; } },
    get active() { return active; },
    update(dt, t) {
      if (!active) return;
      uT.value = t; rot.idle += dt;
      if (!rot.drag && rot.idle > 2.5 && !engine.reduced) rot.gy += Math.sin(t * 0.35) * 0.0016;
      rot.yaw = damp(rot.yaw, rot.gy, 6, dt); rot.pitch = damp(rot.pitch, rot.gp, 6, dt);
      pivot.rotation.set(rot.pitch, rot.yaw, 0);
      shafts.forEach((m, i) => { m.rotation.z = -0.22 + Math.sin(t * 0.12 + i) * 0.05; });
      // keep the fish centred in its window, whatever the layout
      rect = viewEl.getBoundingClientRect();
      const ox = engine.w / 2 - (rect.left + rect.width / 2), oy = engine.h / 2 - (rect.top + rect.height * 0.52);
      camera.setViewOffset(engine.w, engine.h, ox, oy, engine.w, engine.h);
      pivot.updateMatrixWorld(); camera.updateMatrixWorld();
      const side = Math.cos(rot.yaw), show = Math.abs(Math.sin(rot.yaw)) < 0.8, narrow = engine.w < 720;
      hotEl.classList.toggle('is-narrow', narrow);
      for (const q of hots) {
        v3.set(-(0.5 - q.a.at[0]) * L, q.a.at[1] * L, 0.11 * L * Math.sign(side || 1)).applyMatrix4(pivot.matrixWorld).project(camera);
        const x = (v3.x * 0.5 + 0.5) * engine.w - rect.left, y = (-v3.y * 0.5 + 0.5) * engine.h - rect.top;
        q.el.style.opacity = show ? 1 : 0;
        q.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) ${(narrow ? ANCHOR_M : ANCHOR)[q.a.side || 'r']}`;
      }
    },
  };
  select(SPECIES[0].id);
  return api;
}
