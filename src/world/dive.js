// The view from under the water: inside a sea cage, a broodstock tank or the aquarium.
// Every fish here is its own animal: it keeps a lane, can be clicked and followed, and can be
// aged up or down so it grows the way the species really does.
import * as THREE from 'three';
import { clamp, damp, rng, TAU, canvasTex } from './kit.js';
import { lengthAt, weightAt, ageAtWeight, maxAge } from '../data/growth.js';
import { MIX } from './fish.js';

const TINT = { cage: 0x1f93b2, tank: 0x1f62b4, glass: 0x1c97be };      // lighter, clearer water than before, lit by a white sun
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _ray = new THREE.Ray(), _rc = new THREE.Raycaster(), _ndc = new THREE.Vector2();

export function createDive(world) {
  const { engine } = world;
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(TINT.cage, 0.02);
  scene.environment = world.scene.environment; scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(50, engine.w / engine.h, 0.05, 900);
  const uT = { value: 0 }, uTint = { value: new THREE.Color(TINT.cage) }, uN = world.sea.uniforms.uN;

  /* ───── water all round ───── */
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(420, 32, 20), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uT, uTint },
    vertexShader: 'varying vec3 v; void main(){ v = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 v; uniform float uT; uniform vec3 uTint; void main(){ vec3 d = normalize(v); float h = d.y;
      vec3 deep = uTint * 0.5, top = mix(uTint, vec3(0.9, 0.98, 1.0), 0.6);
      vec3 c = mix(deep, uTint * 1.08, smoothstep(-0.8, 0.12, h)); c = mix(c, top, smoothstep(0.18, 0.98, h));
      float a = atan(d.z, d.x); float ray = pow(max(0.0, sin(a * 7.0 + uT * 0.1 + sin(a * 3.0 + uT * 0.05) * 2.0) * 0.5 + 0.5), 5.0) * smoothstep(-0.25, 0.8, h) * 0.2; c += vec3(1.0, 0.99, 0.94) * ray;
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` })));
  // the surface from below: a bright window overhead with the ripples drawn in light
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { uT, uTint, uN }, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D uN; uniform float uT; uniform vec3 uTint; varying vec3 vW;
      void main(){ vec2 p = vW.xz;
        vec4 a = texture2D(uN, p * 0.035 + uT * vec2(0.02, 0.013)), b = texture2D(uN, p * 0.09 - uT * vec2(0.03, -0.018)), c = texture2D(uN, p * 0.012 + uT * vec2(-0.006, 0.009));
        float l1 = 1.0 - smoothstep(0.0, 0.05, abs(a.a - b.a)), l2 = 1.0 - smoothstep(0.0, 0.028, abs(c.a - a.a));
        float d = length(cameraPosition.xz - p), win = smoothstep(52.0, 5.0, d);
        vec3 col = mix(uTint, vec3(0.9, 0.98, 1.0), 0.6) * (0.78 + 0.4 * win) + vec3(1.0) * (l1 * 0.45 + l2 * 0.35) * (0.35 + 0.65 * win);
        float fog = 1.0 - exp(-pow(0.011 * length(cameraPosition - vW), 2.0)); col = mix(col, uTint * 0.95, clamp(fog, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  surf.scale.set(1400, 1, 1400); surf.frustumCulled = false; scene.add(surf);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x2b6f8c, 1.9), key = new THREE.DirectionalLight(0xfffaf0, 2.9), rim = new THREE.DirectionalLight(0xd8f4ff, 0.8);
  key.position.set(0.6, 5, 1.2); rim.position.set(-3, 0.6, -4); scene.add(hemi, key, rim);
  // shafts of light
  const shaftTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, w, h); }, { repeat: false });
  const shafts = new THREE.Group(); scene.add(shafts);
  // drifting specks
  const specks = (() => { const n = 700, pos = new Float32Array(n * 3), ph = new Float32Array(n), R = rng(9); for (let i = 0; i < n; i++) { pos.set([(R() - 0.5) * 60, -R() * 14, (R() - 0.5) * 60], i * 3); ph[i] = R(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT, uS: { value: 1 }, uC: { value: new THREE.Vector3() } },
      vertexShader: 'attribute float aPh; uniform float uT, uS; uniform vec3 uC; varying float vA; void main(){ vec3 p = position; p.xz = mod(p.xz - uC.xz + 30.0, 60.0) - 30.0 + uC.xz; p.y = -mod(-p.y - uT * (0.03 + aPh * 0.1), 14.0); p.x += sin(uT * 0.3 + aPh * 40.0) * 0.25; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp((0.012 + aPh * 0.03) * uS / -mv.z, 1.0, 9.0); vA = (0.25 + aPh * 0.5) * smoothstep(0.2, 1.4, -mv.z); }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(0.8, 0.97, 1.0) * vA * (1.0 - d * 2.0), 1.0); }' });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); world.addScaled(m.uniforms.uS); return m; })();

  /* ───── what holds the fish: net, tank wall or glass ───── */
  const netTex = canvasTex(64, 64, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(26,44,54,.92)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, w); g.moveTo(w, 0); g.lineTo(0, w); g.stroke(); });
  const holder = new THREE.Group(); scene.add(holder);
  const fishGroup = new THREE.Group(); scene.add(fishGroup);
  // the selected group: a soft glow in the water round every fish of the same school (the fish you clicked has a brighter aura)
  const HMAX = 260, hPos = new Float32Array(HMAX * 3), hSize = new Float32Array(HMAX), hHot = new Float32Array(HMAX);
  const hGeo = new THREE.BufferGeometry(); hGeo.setAttribute('position', new THREE.BufferAttribute(hPos, 3)); hGeo.setAttribute('aSize', new THREE.BufferAttribute(hSize, 1)); hGeo.setAttribute('aHot', new THREE.BufferAttribute(hHot, 1));
  const hMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uS: { value: 1 }, uT, uA: { value: 0 } },
    vertexShader: 'attribute float aSize, aHot; uniform float uS, uT; varying float vHot, vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float pulse = 1.0 + 0.08 * sin(uT * 3.0 + position.x * 2.0); gl_PointSize = clamp(aSize * uS * pulse / -mv.z, 6.0, 260.0); vHot = aHot; vA = smoothstep(0.15, 0.9, -mv.z); }',
    fragmentShader: 'uniform float uA; varying float vHot, vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float g = (exp(-d * d * 3.4) * 0.55 + exp(-d * d * 12.0) * 0.25) * (1.0 - smoothstep(0.78, 1.0, d)); float a = g * 0.95 * (1.0 - vHot) * uA * vA; if (a < 0.003) discard; gl_FragColor = vec4(vec3(0.6, 0.94, 1.0) * a, a); }' });      // (every fish of the group glows; the one you clicked has its own aura too)
  const halos = new THREE.Points(hGeo, hMat); halos.frustumCulled = false; halos.renderOrder = 4; scene.add(halos); world.addScaled(hMat.uniforms.uS);
  // the fish you clicked glows: a skin of light over it (fish.js) and a soft halo of light in the water round it
  const glowGroup = new THREE.Group(); scene.add(glowGroup);
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { uA: { value: 0 }, uT },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uA, uT; varying vec2 vUv; void main(){ vec2 p = (vUv - 0.5) * 2.0; float d = dot(p, p);
      float g = exp(-d * 3.2) * 0.5 + exp(-d * 13.0) * 0.22; g *= 1.0 - smoothstep(0.7, 1.0, d);
      float a = g * uA * (0.9 + 0.1 * sin(uT * 2.4)); if (a < 0.003) discard;
      gl_FragColor = vec4(vec3(0.6, 0.94, 1.0) * a, a); }` }));
  aura.renderOrder = 3; aura.visible = false; aura.frustumCulled = false; scene.add(aura);
  const _qz = new THREE.Quaternion(), _zAxis = new THREE.Vector3(0, 0, 1), _qi = new THREE.Quaternion();
  let glow = null, glowOf = null, glowK = 0, glowIdx = null;
  const S = { active: false, kind: 'cage', r: 19.5, depth: 9, fish: [], sel: null, mix: 0, yaw: 0, gy: 0, pitch: -0.02, gp: -0.02, ang: 0, rc: 4, yc: -3.5, zoom: 1, gz: 1, orb: 0.5, gorb: 0.5, lift: 0.1, glift: 0.1, D: 3, idle: 0, look: new THREE.Vector3(), ready: false, meshes: [] };

  function clear() {
    for (const o of [...holder.children]) { holder.remove(o); o.geometry && o.geometry.dispose(); if (o.material && o.material.dispose && !o.material.userData.keep) o.material.dispose(); }
    for (const o of [...fishGroup.children]) { fishGroup.remove(o); o.geometry.dispose(); }
    for (const o of [...shafts.children]) { shafts.remove(o); o.geometry.dispose(); o.material.dispose(); }
    for (const o of [...glowGroup.children]) { glowGroup.remove(o); o.geometry.dispose(); } glow = glowOf = null; glowIdx = null; glowK = 0; aura.visible = false;
    S.fish = []; S.meshes = []; S.sel = null; S.mix = 0; S.only = null; S.group = null; hMat.uniforms.uA.value = 0; hGeo.setDrawRange(0, 0);
  }
  /** opts: { kind: 'cage' | 'tank' | 'glass', r, depth, sp (id or 'mix'), n, grams } */
  function enter(o) {
    clear();
    const kind = o.kind || 'cage', r = o.r || 19.5, depth = o.depth || 9, R = rng(Math.round(r * 13 + depth * 7) + (o.seed || 1));
    Object.assign(S, { kind, r, depth, active: true, yaw: 0.35, gy: 0.35, pitch: -0.03, gp: -0.03, ang: R() * TAU, zoom: 1, gz: 1, idle: 0, ready: false });
    uTint.value.setHex(TINT[kind]); scene.fog.color.setHex(TINT[kind]); scene.fog.density = kind === 'cage' ? 0.0135 : kind === 'tank' ? 0.04 : 0.05;
    hemi.color.setHex(kind === 'tank' ? 0xdfe9ff : 0xffffff); hemi.groundColor.setHex(kind === 'tank' ? 0x1f3f86 : 0x2b6f8c); key.color.setHex(kind === 'tank' ? 0xf2f6ff : 0xfffaf0);
    if (kind === 'cage') {
      const mat = new THREE.MeshBasicMaterial({ map: netTex.clone(), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, color: 0x5d7480, fog: true });
      mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping; mat.map.repeat.set(Math.round((TAU * r) / 0.55), Math.round(depth / 0.55)); mat.map.needsUpdate = true;
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.96, depth, 72, 1, true), mat); wall.position.y = -depth / 2; wall.renderOrder = 2; holder.add(wall);
      const fm = mat.clone(); fm.map = netTex.clone(); fm.map.wrapS = fm.map.wrapT = THREE.RepeatWrapping; fm.map.repeat.set(Math.round((r * 2) / 0.55), Math.round((r * 2) / 0.55)); fm.map.needsUpdate = true;
      const floor = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 56).rotateX(-Math.PI / 2), fm); floor.position.y = -depth; floor.renderOrder = 2; holder.add(floor);
      const dark = new THREE.MeshStandardMaterial({ color: 0x10202b, roughness: 0.7 });
      for (const [rr, y, t] of [[r, 0.02, 0.34], [r + 1.15, 0.02, 0.34], [r * 0.96, -depth, 0.12]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, t, 8, 96).rotateX(Math.PI / 2), dark); ring.position.y = y; holder.add(ring); }
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, depth, 5), dark); rope.position.set(Math.cos(a) * r * 0.985, -depth / 2, Math.sin(a) * r * 0.985); holder.add(rope); }
    } else {
      const wallM = new THREE.MeshStandardMaterial({ color: kind === 'tank' ? 0x2a5f8a : 0x9fd6e6, roughness: kind === 'tank' ? 0.6 : 0.1, side: THREE.BackSide, transparent: kind === 'glass', opacity: kind === 'glass' ? 0.22 : 1 });
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, depth + 0.6, 64, 1, true), wallM); wall.position.y = -depth / 2 + 0.3; holder.add(wall);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(r, 56).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: kind === 'tank' ? 0x1d4d78 : 0xb9a98a, roughness: 0.9 })); floor.position.y = -depth; holder.add(floor);
      if (kind === 'tank') { const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, depth, 12), new THREE.MeshStandardMaterial({ color: 0x8a959c, roughness: 0.4 })); drain.position.y = -depth / 2; holder.add(drain); for (let k = 1; k <= 3; k++) { const mk = new THREE.Mesh(new THREE.TorusGeometry(r - 0.02, 0.012, 4, 64).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xdfeaf2 })); mk.position.y = -depth + (depth * k) / 4; holder.add(mk); } }
      else { const Q = rng(5); for (let k = 0; k < 11; k++) { const a = Q() * TAU, d = Q() * r * 0.75, rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + Q() * 0.5, 1), new THREE.MeshStandardMaterial({ color: [0x8f9b8c, 0xb9a98a, 0x7d8f96][k % 3], roughness: 1, flatShading: true })); rock.position.set(Math.cos(a) * d, -depth + 0.25, Math.sin(a) * d); rock.scale.y = 0.7; holder.add(rock); }
        for (let k = 0; k < 8; k++) { const a = Q() * TAU, d = 0.5 + Q() * r * 0.6, c = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.8 + Q() * 0.9, 6), new THREE.MeshStandardMaterial({ color: [0xe98a6b, 0xd9a05b, 0x7fc9b0][k % 3], roughness: 0.8 })); c.position.set(Math.cos(a) * d, -depth + 0.6, Math.sin(a) * d); holder.add(c); } }
    }
    const ns = kind === 'cage' ? 9 : 5;
    for (let i = 0; i < ns; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry((kind === 'cage' ? 1.6 : 0.5) + R() * (kind === 'cage' ? 2.6 : 0.8), depth + 3), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.08 + R() * 0.1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: kind === 'tank' ? 0x9fbaff : 0xbff4ff, side: THREE.DoubleSide })); const a = R() * TAU, d = r * (0.2 + R() * 0.7); m.position.set(Math.cos(a) * d, -(depth + 3) / 2 + 1.2, Math.sin(a) * d); m.rotation.set(0, R() * 3, -0.22 + R() * 0.12); m.userData.k = R() * 6; shafts.add(m); }

    /* fish */
    const ids = o.sp === 'mix' ? MIX.filter((v, i, a) => a.indexOf(v) === i) : [world.fish.FISH[o.sp] ? o.sp : 'naisrah'], n = o.n || 40;
    const refLen = (sp) => lengthAt(sp, o.grams ? ageAtWeight(sp, o.grams) : o.age || 2.4) / 100;
    const L0 = refLen(ids[0]);
    S.rc = clamp(r * 0.2, 0.7, 5); S.yc = -Math.min(depth * 0.45, 1.4 + 6 * L0); S.L0 = L0;
    // the school keeps to a band round the camera, thickest close in, so there is always something swimming past
    const rho0 = Math.min(r * 0.55, S.rc + 0.9 + 0.6 * L0), rho1 = Math.max(rho0 + 0.5, Math.min(r * 0.9, rho0 + 7 * L0 + 2)), half = Math.min(depth * 0.42, 0.7 + 3.6 * L0), y0 = Math.min(-0.4, S.yc + half), y1 = Math.max(-depth * 0.92, S.yc - half);
    const per = ids.map((sp, k) => ({ sp, rows: [], list: [], count: Math.round(n / ids.length) + (k === 0 ? n % ids.length : 0) }));
    for (const g of per) for (let i = 0; i < g.count; i++) {
      const age0 = o.grams ? ageAtWeight(g.sp, o.grams * (0.7 + R() * 0.7)) : (o.age || 2.4) * (0.75 + R() * 0.6), len = lengthAt(g.sp, age0) / 100;
      const f = { sp: g.sp, i, age: age0, age0, len, glen: len, rho: rho0 + (rho1 - rho0) * Math.pow(R(), 1.5), y: y0 + (y1 - y0) * R(), th: R() * TAU, v: (0.35 + R() * 0.3) * (0.5 + len) * (kind === 'cage' ? 1 : 0.6), ph: R() * TAU, dr: 0.3 + R() * 1.2 * Math.min(1, r / 12), dy: 0.15 + R() * 0.5 * Math.min(1, depth / 5), pos: new THREE.Vector3(), hx: 1, hz: 0 };
      f.gait = R(); g.rows.push([0, 0, 0, 0, 0, f.gait, 0, 1, 1]); g.list.push(f); S.fish.push(f);          // the same clock the shader uses for its burst and glide
    }
    for (const g of per) { const mesh = world.fish.mesh(g.sp, g.rows, true); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); fishGroup.add(mesh); g.list.forEach((f) => { f.mesh = mesh; }); S.meshes.push(mesh); }
    S.per = per; step(0.016, uT.value); placeCamera(1, true); S.ready = true;
    return S;
  }
  function exit() { S.active = false; S.sel = null; }

  function step(dt, t) {
    for (const f of S.fish) {
      const rho = clamp(f.rho + Math.sin(t * 0.11 + f.ph) * f.dr, S.rc + f.len * 1.4, S.r * 0.92), y = clamp(f.y + Math.sin(t * 0.17 + f.ph * 3.1) * f.dy, -S.depth + 0.3 + f.len * 0.3, -0.25 - f.len * 0.25);
      f.th += (f.v / rho) * dt * (f === S.sel ? 0.55 : 1) * (1 + 0.34 * Math.sin(t * 0.45 + f.gait * 31.4));      // faster while the tail beats hard, coasting in between
      f.len = damp(f.len, f.glen, 9, dt);
      const c = Math.cos(f.th), s = Math.sin(f.th); f.pos.set(c * rho, y, s * rho); f.hx = -s; f.hz = c;
      const pitch = Math.cos(t * 0.17 + f.ph * 3.1) * f.dy * 0.17 * 0.12;
      _m.compose(f.pos, _q.setFromEuler(_e.set(0, Math.atan2(-f.hz, f.hx), pitch, 'YXZ')), _s.setScalar(f.len));
      f.mesh.setMatrixAt(f.i, _m);
      if (glow && glowIdx) { const gi = glowIdx.get(f); if (gi !== undefined) glow.setMatrixAt(gi, _m); }
    }
    // the glow follows the fish you clicked, breathes a little, and fades when you let it go
    glowK = damp(glowK, S.sel && S.sel === glowOf ? 1 : 0, 4.5, dt);
    if (glowOf) {
      const f = glowOf, on = glowK > 0.01 && (!S.only || S.only === f.sp);
      if (glow) glow.visible = on; aura.visible = on;
      if (on) {
        world.fish.glowLevel.value = glowK * (0.85 + 0.15 * Math.sin(t * 2.4));
        // the halo faces the camera and is stretched along the fish as the camera sees it
        _v.set(f.hx, 0, f.hz).applyQuaternion(_qi.copy(camera.quaternion).invert()); const along = Math.hypot(_v.x, _v.y);
        aura.position.copy(f.pos); aura.quaternion.copy(camera.quaternion).multiply(_qz.setFromAxisAngle(_zAxis, Math.atan2(_v.y, _v.x)));
        aura.scale.set(f.len * (1.25 + 1.75 * along), f.len * 1.35, 1); aura.material.uniforms.uA.value = glowK;
      } else if (!S.sel) { if (glow) { glowGroup.remove(glow); glow.geometry.dispose(); glow = null; } glowOf = null; glowIdx = null; }
    }
    for (const m of S.meshes) m.instanceMatrix.needsUpdate = true;
    if (glow) glow.instanceMatrix.needsUpdate = true;
    // halos follow the selected group
    hMat.uniforms.uA.value = damp(hMat.uniforms.uA.value, S.group ? 1 : 0, 5, dt);
    if (S.group) { const G = S.group, n = Math.min(HMAX, G.length); for (let i = 0; i < n; i++) { const f = G[i]; hPos[i * 3] = f.pos.x; hPos[i * 3 + 1] = f.pos.y; hPos[i * 3 + 2] = f.pos.z; hSize[i] = f.len * (f === S.sel ? 1.9 : 2.7); hHot[i] = f === S.sel ? 1 : 0; } hGeo.setDrawRange(0, n); hGeo.attributes.position.needsUpdate = true; hGeo.attributes.aSize.needsUpdate = true; hGeo.attributes.aHot.needsUpdate = true; }
  }
  const want = new THREE.Vector3(), wantLook = new THREE.Vector3();
  function placeCamera(dt, snap) {
    S.idle += dt; if (S.idle > 4 && !S.sel) S.ang += dt * 0.025;
    S.yaw = damp(S.yaw, S.gy, 7, dt); S.pitch = damp(S.pitch, S.gp, 7, dt); S.zoom = damp(S.zoom, S.gz, 6, dt); S.orb = damp(S.orb, S.gorb, 6, dt); S.lift = damp(S.lift, S.glift, 6, dt);
    S.mix = damp(S.mix, S.sel ? 1 : 0, 3.2, dt);
    // free view: stand near the middle and look out through the school
    const bx = Math.cos(S.ang) * S.rc, bz = Math.sin(S.ang) * S.rc, a = S.ang + S.yaw, cp = Math.cos(S.pitch);
    want.set(bx, S.yc, bz); wantLook.set(bx + Math.cos(a) * cp * 10, S.yc + Math.sin(S.pitch) * 10, bz + Math.sin(a) * cp * 10);
    if (S.sel) {
      const f = S.sel, rho = Math.hypot(f.pos.x, f.pos.z) || 1, ux = f.pos.x / rho, uz = f.pos.z / rho, D = S.D * S.zoom;
      const ca = Math.cos(S.orb), sa = Math.sin(S.orb);
      _v.set(f.pos.x + (-ux * ca + f.hx * sa) * D, clamp(f.pos.y + S.lift * D, -S.depth + 0.3, -0.18), f.pos.z + (-uz * ca + f.hz * sa) * D);
      want.lerp(_v, S.mix); wantLook.lerp(f.pos, S.mix);
    }
    const k = snap ? 1 : 1 - Math.exp(-4.2 * dt), kl = snap ? 1 : 1 - Math.exp(-7 * dt);
    camera.position.lerp(want, k); S.look.lerp(wantLook, kl); camera.lookAt(S.look);
    const fov = S.sel ? 38 : 50 / (0.6 + 0.4 * S.zoom); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = damp(camera.fov, fov, 4, dt); camera.updateProjectionMatrix(); }
    const sx = Math.round(S.sx || 0), sy = Math.round(S.sy || 0); if (sx !== S._sx || sy !== S._sy || engine.w !== S._w || engine.h !== S._h) { S._sx = sx; S._sy = sy; S._w = engine.w; S._h = engine.h; if (sx || sy) camera.setViewOffset(engine.w, engine.h, sx, sy, engine.w, engine.h); else camera.clearViewOffset(); }
    camera.updateMatrixWorld(); specks.uniforms.uC.value.copy(camera.position);
  }

  const api = {
    scene, camera, state: S,
    get active() { return S.active; }, get selected() { return S.sel; }, get fish() { return S.fish; },
    enter, exit,
    update(dt, t) { if (!S.active) return; uT.value = t; step(dt, t); placeCamera(dt, false); shafts.children.forEach((m) => { m.rotation.z = -0.2 + Math.sin(t * 0.12 + m.userData.k) * 0.05; }); },
    resize() { camera.aspect = engine.w / engine.h; camera.updateProjectionMatrix(); },
    /** keep the subject clear of the panel: shift the picture by this many pixels */
    shift(x, y) { S.sx = x; S.sy = y; },
    /** drag: look round, or swing round the fish being followed */
    look(dx, dy) { S.idle = 0; if (S.sel) { S.gorb = clamp(S.gorb - dx * 0.006, -1.25, 1.25); S.glift = clamp(S.glift + dy * 0.004, -0.5, 0.6); } else { S.gy += dx * 0.0042; S.gp = clamp(S.gp + dy * 0.003, -0.7, 0.85); } },
    zoom(d) { S.idle = 0; S.gz = clamp(S.gz * Math.exp(d * 0.0012), 0.55, 2.2); },
    pick(cx, cy) {
      const r = engine.canvas.getBoundingClientRect(); _ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); _rc.setFromCamera(_ndc, camera); _ray.copy(_rc.ray);
      let best = null, bd = Infinity;
      for (const f of S.fish) { if (S.only && f.sp !== S.only) continue; const t = _v.copy(f.pos).sub(_ray.origin).dot(_ray.direction); if (t < 0.1) continue; const d = _ray.distanceToPoint(f.pos), lim = Math.max(f.len * 0.42, 0.02 * t + 0.06); if (d < lim && t < bd) { bd = t; best = f; } }
      return best;
    },
    /** selecting one fish selects its whole group: the school of the same species in this cage or tank, one batch of one age */
    select(f) {
      S.sel = f || null; S.idle = 0; S.group = f ? ((S.per || []).find((g) => g.sp === f.sp) || { list: [f] }).list : null;
      if (f) { S.gorb = 0.5; S.glift = 0.1; S.gz = 1; S.zoom = 1; api.frame(); }
      // every fish of the group wears the glow (one instanced skin of light over the whole school)
      if (f && f !== glowOf) { if (glow) { glowGroup.remove(glow); glow.geometry.dispose(); } const G = S.group || [f]; glow = world.fish.glowMany(f.sp, G.map((g) => g.gait || 0)); glowIdx = new Map(G.map((g, i) => [g, i])); glow.visible = false; glowGroup.add(glow); glowOf = f; glowK = 0; }
      api.onSelect && api.onSelect(S.sel);
    },
    /** follow distance for the selected fish: closer for small fish, but never so close that growth cannot be seen */
    frame() { const f = S.sel; if (!f) return; const Lmax = lengthAt(f.sp, maxAge(f.sp)) / 100; S.D = 0.3 + 1.75 * Math.sqrt(Math.max(f.glen, 0.004) * Lmax) + 0.6 * f.glen; },
    /** the slider ages the whole group together; each fish keeps its own small difference from the one you clicked */
    setAge(yrs) {
      const f = S.sel; if (!f) return; const mx = maxAge(f.sp), a = clamp(yrs, 0, mx), k = a / Math.max(1e-4, f.age0);
      for (const g of S.group || [f]) { g.age = g === f ? a : clamp(g.age0 * k, 0, mx); g.glen = Math.max(0.0018, lengthAt(g.sp, g.age) / 100); }
      api.frame();
    },
    info(f = S.sel) {
      if (!f) return null; const G = S.group || [f]; let cm = 0, gr = 0; for (const g of G) { cm += lengthAt(g.sp, g.age); gr += weightAt(g.sp, g.age); }
      return { sp: f.sp, age: f.age, cm: lengthAt(f.sp, f.age), g: weightAt(f.sp, f.age), max: maxAge(f.sp), n: G.length, avgCm: cm / G.length, avgG: gr / G.length };
    },
    /** screen position of a fish, and how many pixels one metre takes at its distance */
    screen(f, out) { _v.copy(f.pos).project(camera); if (_v.z > 1) return null; out.x = (_v.x * 0.5 + 0.5) * engine.w; out.y = (-_v.y * 0.5 + 0.5) * engine.h; out.ppm = (engine.h / (2 * Math.tan((camera.fov * Math.PI) / 360))) / camera.position.distanceTo(f.pos); return out; },
    /** one fish of each species near the camera, for name tags */
    /** show one species only (null = everyone) */
    filter(sp) { S.only = sp || null; for (const m of S.meshes) m.visible = !S.only || m.name === `fish-${S.only}`; },
    tags() { const out = []; for (const g of S.per || []) { if (S.only && g.sp !== S.only) continue; let best = null, bd = Infinity; for (const f of g.list) { const d = f.pos.distanceTo(camera.position); _v.copy(f.pos).project(camera); if (_v.z < 1 && Math.abs(_v.x) < 0.7 && Math.abs(_v.y) < 0.7 && d < bd) { bd = d; best = f; } } if (best) out.push(best); } return out; },
  };
  return api;
}
