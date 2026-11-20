// The round LED screen in the floor of the exhibition hall (area 09), under the walk-on glass, where the aquarium used to be.
// It plays what the hall's fish TVs play (exhibit-tv.js), made round: deep blue-teal water lit from the middle (the globe hangs
// over it), slow rays of light turning, the sunlight net drifting across, specks of sea snow, and the client's fish (the licensed
// photo cut-outs) swimming round in rings, big ones near and small faint ones further off, their bodies waving as on the TVs.
// A ring of lettering runs round the rim. All of it is drawn on the graphics card: no picture is redrawn and sent each frame.
import * as THREE from 'three';
import { FISH_CUT } from '../data/photos.js';
import { loadPhoto, rng, TAU } from './kit.js';
import { causticTexture } from './reef.js';
import { PHOTO, FISH } from './fish.js';

/**
 * A fish seen from above, made from its side photograph: the floor is looked down on, so every fish shows its back.
 * Each point of the back is read off the photo where the body's round section meets that height (the middle line of the top
 * view is the photo's back line, its edges the photo's middle), shaded round, with the pectoral fins out to the sides, the eyes
 * on the sides of the head and the tail fin edge-on behind. Head to the left, like the photos. Returns a canvas.
 */
export function dorsalPicture(id, img) {
  const S = PHOTO[id], F = FISH[id], E = S.env, A = S.aspect, iw = img.width, ih = img.height;
  const sc = document.createElement('canvas'); sc.width = iw; sc.height = ih; const sg = sc.getContext('2d', { willReadFrequently: true }); sg.drawImage(img, 0, 0);
  const src = sg.getImageData(0, 0, iw, ih).data;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const at = (x) => { let i = 0; while (i < E.length - 2 && x > E[i + 1][0]) i++; const a = E[i], b = E[i + 1], k = cl((x - a[0]) / (b[0] - a[0]), 0, 1), q = k * k * (3 - 2 * k) * 0.35 + k * 0.65; return [a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q]; };
  const x0 = E[0][0], x1 = E[E.length - 1][0]; let hmax = 0; for (const e of E) hmax = Math.max(hmax, (e[1] - e[2]) / 2);
  const px = (xs, y) => { const c = cl(Math.round(xs * iw), 0, iw - 1), r = cl(Math.round((0.5 - y / A) * ih), 0, ih - 1); return (r * iw + c) * 4; };
  const OW = 512, OH = Math.round(OW * 0.34), cy = OH / 2, out = new ImageData(OW, OH), d = out.data;
  const fin = new THREE.Color(F.c.fin), eyeX = (F.eye ? F.eye[0] : 0.1), pf0 = Math.max(x0 + 0.16, eyeX + 0.1);
  // where the tail fin ends: the last column with picture along the body's middle line
  const [tpE, btE] = at(x1), cE = (tpE + btE) / 2; let tailEnd = x1; for (let xs = x1; xs < 1; xs += 1 / OW) if (src[px(xs, cE) + 3] > 100) tailEnd = xs;
  const last = new Int32Array(OH).fill(-1);          // per row, where the last colour came from (the thin tail stalk carries it on)
  for (let i = 0; i < OW; i++) {
    const xs = (i + 0.5) / OW;
    let hw = 0, c = 0, hh = 0;
    if (xs >= x0 && xs <= x1) { const t = Math.pow((xs - x0) / (x1 - x0), 1 / 1.1), [tp, bt] = at(xs); c = (tp + bt) / 2; hh = Math.max(0.002, (tp - bt) / 2);
      hw = (Math.max(0.004, hmax * S.wr * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.62) * (0.55 + 0.45 * hh / hmax)) + 0.006 * (1 - Math.abs(2 * t - 1))) * OW; }
    const tail = xs > x1 && xs <= tailEnd, tw = tail ? (1.2 + 3.2 * Math.pow((xs - x1) / Math.max(0.01, tailEnd - x1), 1.4)) : 0;      // the fin edge-on, flaring a little
    const pk = (xs - pf0) / 0.13, pfw = pk > 0 && pk < 1 ? 0.085 * OW * Math.pow(Math.sin(Math.PI * Math.pow(pk, 0.7)), 0.9) : 0;   // pectoral fins
    for (let j = 0; j < OH; j++) {
      const o = (j * OW + i) * 4, dy = Math.abs(j + 0.5 - cy);
      if (hw > 0 && dy < hw + 1) {
        // (just inside the back line, and on down towards the middle if that point of the picture is clear: fin gaps, the snout)
        const l = Math.min(1, dy / hw), round = Math.sqrt(1 - l * l), sh = (0.6 + 0.4 * round) * (1 + 0.1 * Math.exp(-(l * l) / 0.05));
        let yq = c + hh * 0.86 * round, k = px(xs, yq); for (let q = 0; q < 14 && src[k + 3] < 200; q++) { yq -= hh * 0.07; k = px(xs, yq); }
        if (src[k + 3] < 200) { k = px(xs, c); if (src[k + 3] < 120) { if (last[j] < 0) continue; k = last[j]; } }      // (the thin tail stalk)
        last[j] = k;
        d[o] = cl(src[k] * sh, 0, 255); d[o + 1] = cl(src[k + 1] * sh, 0, 255); d[o + 2] = cl(src[k + 2] * sh, 0, 255); d[o + 3] = 255 * cl(hw + 0.5 - dy, 0, 1);
        // the eyes, on the sides of the head
        const ex = (xs - eyeX) * OW, ey = dy - hw * 0.74, er = Math.max(1.6, 0.0085 * OW);
        if (ex * ex + ey * ey < er * er) { d[o] = 14; d[o + 1] = 16; d[o + 2] = 18; }
      } else if (pfw > 0 && dy < hw + pfw) {
        const u = (dy - hw) / pfw, a = (1 - u) * 0.6; d[o] = fin.r * 255; d[o + 1] = fin.g * 255; d[o + 2] = fin.b * 255; d[o + 3] = 255 * a;
      } else if (tail && dy < tw) {
        const k = px(xs, cE); d[o] = src[k] * 0.8; d[o + 1] = src[k + 1] * 0.8; d[o + 2] = src[k + 2] * 0.8; d[o + 3] = 230 * cl(tw - dy, 0, 1);
      }
    }
  }
  const cv = document.createElement('canvas'); cv.width = OW; cv.height = OH; cv.getContext('2d').putImageData(out, 0, 0);
  return cv;
}

const lin = (hex) => new THREE.Color(hex);                        // (a colour in the renderer's working space)

const SCREEN_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SCREEN_FS = /* glsl */ `
uniform float uTime; uniform sampler2D uCaus; uniform vec3 uCore, uMid, uEdge, uRay;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x);
  // the water: lit from the middle, deep at the rim
  vec3 col = mix(uCore, uMid, smoothstep(0.0, 0.62, r)); col = mix(col, uEdge, smoothstep(0.5, 1.0, r));
  // rays of light from the middle, turning slowly (two sets, so they never line up the same way twice)
  float w1 = 0.5 + 0.5 * sin(a * 7.0 + uTime * 0.11 + sin(a * 3.0 - uTime * 0.07) * 1.4);
  float w2 = 0.5 + 0.5 * sin(a * 12.0 - uTime * 0.083 + 1.7);
  col += uRay * (pow(w1, 3.0) * 0.6 + pow(w2, 6.0) * 0.4) * smoothstep(1.02, 0.15, r) * smoothstep(0.0, 0.2, r) * 0.2;
  // the sunlight net drifting over the sea floor
  vec2 cu = vUv * 3.4 + vec2(uTime * 0.013, uTime * 0.009) + 0.05 * vec2(sin(uTime * 0.11), cos(uTime * 0.09));
  float caus = texture2D(uCaus, cu).r * 0.62 + texture2D(uCaus, cu * 1.41 + vec2(0.31, 0.17) - uTime * 0.007).r * 0.38;
  col += uRay * caus * 0.15 * smoothstep(1.0, 0.25, r);
  // sea snow: sparse specks drifting across
  vec2 q = p * 26.0 + vec2(uTime * 0.19, -uTime * 0.12), id = floor(q), f = fract(q) - 0.5;
  float h = hash(id); vec2 o = vec2(hash(id + 3.7), hash(id + 9.1)) - 0.5;
  col += vec3(0.75, 0.95, 1.0) * smoothstep(0.09, 0.0, length(f - o * 0.7)) * step(0.86, h) * (0.1 + 0.16 * h) * smoothstep(1.0, 0.6, r);
  // the edge of the screen: darker towards the rim, then a thin line of light
  col *= mix(1.0, 0.5, smoothstep(0.84, 1.0, r));
  col += uRay * smoothstep(0.982, 0.993, r) * (1.0 - smoothstep(0.993, 1.0, r)) * 0.3;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** a flat ring (r0 to r1) whose texture runs round it: u along the circle (clockwise seen from above, so lettering reads left to
 *  right for someone at the rim), v from the rim (0) to the inside (1) */
function ringGeometry(r0, r1, seg, repeats) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * TAU, c = Math.cos(t), s = Math.sin(t), u = (-i / seg) * repeats;
    pos.push(c * r1, 0, s * r1, c * r0, 0, s * r0); uv.push(u, 0, u, 1);
    if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function letteringTexture() {
  const W = 4096, H = 96, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'); g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(214,244,246,0.9)'; g.textBaseline = 'middle'; g.font = '500 44px "IBM Plex Sans", Arial, sans-serif';
  const words = ['GULF AQUACULTURE', 'MARINE LIFE', 'SHEIKH KHALIFA MARINE RESEARCH CENTRE', 'FROM EGG TO SEA'];
  let x = 40; const gap = 150;
  for (let k = 0; x < W - 200; k++) { const w = words[k % words.length]; if ('letterSpacing' in g) g.letterSpacing = '9px'; g.fillText(w, x, H / 2); x += g.measureText(w).width + gap; g.beginPath(); g.arc(x - gap / 2, H / 2, 5, 0, TAU); g.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

/**
 * The fish of one species, as one batch of photo cut-outs on the screen. Each body waves as it swims: the wave runs from head to
 * tail and grows towards the tail, as on the TVs (the photos face left: the head is at the low end of the picture).
 * They are drawn as if seen down through the water, as under water (dive.js): the deeper a fish swims the more the sea's colour
 * takes it, the sunlight net drifts over its back, and it throws a soft shadow on the bottom, further off the higher it swims.
 */
const WATER_TINT = 0x15718a;
function speciesBatch(id, count, uTime, U) {
  const dot = document.createElement('canvas'); dot.width = dot.height = 2;                // (transparent until the photo is in)
  const tex = new THREE.Texture(dot); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true;
  const uAmp = { value: 0.03 / 0.45 };
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.02, side: THREE.DoubleSide, toneMapped: false });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime, uAmp, uCaus: U.caus, uWater: U.water, uR: U.r });
    sh.vertexShader = 'uniform float uTime, uAmp;\nattribute float aPhase, aAlpha, aDepth;\nvarying float vAlpha, vDepth;\nvarying vec2 vFxz;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      { float u = clamp(position.x + 0.5, 0.0, 1.0); transformed.y += sin(uTime * 3.6 + aPhase - u * 6.0) * u * u * uAmp; vAlpha = aAlpha; vDepth = aDepth;
        vec4 fw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fw = instanceMatrix * fw;
        #endif
        vFxz = fw.xz; }`);
    sh.fragmentShader = 'uniform float uTime, uR;\nuniform sampler2D uCaus;\nuniform vec3 uWater;\nvarying float vAlpha, vDepth;\nvarying vec2 vFxz;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  diffuseColor.a *= vAlpha;
  // the same sunlight net as on the bottom (SCREEN_FS), playing over the fish; the sea's colour over it, more the deeper it swims
  { vec2 fuv = vFxz / (2.0 * uR) + 0.5, cu = fuv * 3.4 + vec2(uTime * 0.013, uTime * 0.009) + 0.05 * vec2(sin(uTime * 0.11), cos(uTime * 0.09));
    float caus = texture2D(uCaus, cu).r * 0.62 + texture2D(uCaus, cu * 1.41 + vec2(0.31, 0.17) - uTime * 0.007).r * 0.38;
    diffuseColor.rgb *= 0.78 + caus * 0.55 * (1.0 - vDepth);
    diffuseColor.rgb = mix(diffuseColor.rgb, uWater, 0.2 + vDepth * 0.6); }`);
  };
  mat.customProgramCacheKey = () => 'floor-fish-water';
  const geo = new THREE.PlaneGeometry(1, 1, 20, 1);
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
  geo.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1));
  geo.setAttribute('aDepth', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
  const mesh = new THREE.InstancedMesh(geo, mat, count); mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.name = `floor-fish-${id}`;
  // its shadow on the bottom: the same outline, soft (a blurred level of the picture), dark and faint
  const shMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uTime, uAmp }, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    vertexShader: `uniform float uTime, uAmp; attribute float aPhase, aAlpha, aDepth; varying vec2 vUv; varying float vA;
      void main() { vUv = uv; vec3 p = position; float u = clamp(p.x + 0.5, 0.0, 1.0); p.y += sin(uTime * 3.6 + aPhase - u * 6.0) * u * u * uAmp;
        vA = aAlpha * (1.0 - 0.7 * aDepth); gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vA;
      void main() { float a = texture2D(map, vUv, 2.5).a; gl_FragColor = vec4(0.0, 0.04, 0.08, a * 0.42 * vA); }`,
  });
  const shadow = new THREE.InstancedMesh(geo, shMat, count); shadow.frustumCulled = false; shadow.instanceMatrix.setUsage(THREE.DynamicDrawUsage); shadow.name = `floor-fish-shadow-${id}`; shadow.renderOrder = 2;
  const batch = { mesh, shadow, aspect: 0.45, n: 0 };
  loadPhoto(FISH_CUT[id]).then((p) => {
    if (!p) return;
    // (made a moment later, one species at a time, so no frame waits on all seven)
    // (a new texture, not a new picture in the old one: that one may already be on the graphics card at its 2 × 2 size)
    setTimeout(() => { let cv = null; try { cv = dorsalPicture(id, p.image); } catch (e) { /* the side view stays */ }
      const nt = new THREE.Texture(cv || p.image); nt.colorSpace = THREE.SRGBColorSpace; nt.anisotropy = 8; nt.flipY = cv ? true : p.flipY; nt.needsUpdate = true;
      batch.aspect = cv ? cv.height / cv.width : p.image.height / p.image.width; uAmp.value = 0.03 / batch.aspect;
      mat.map = nt; shMat.uniforms.map.value = nt; tex.dispose(); }, 60 + Object.keys(PHOTO).indexOf(id) * 50);
  });
  return batch;
}

/** radius: of the screen; y: its height. Returns the group (in the hall's own frame, centred on the screen) and its updater */
export function createFloorScreen({ radius, y }) {
  const group = new THREE.Group(); group.name = 'floor-screen';
  const uTime = { value: 0 };
  // the picture
  const screen = new THREE.Mesh(new THREE.CircleGeometry(radius, 128).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uTime, uCaus: { value: causticTexture() }, uCore: { value: lin(0x2a93aa) }, uMid: { value: lin(0x0d5a74) }, uEdge: { value: lin(0x05233a) }, uRay: { value: lin(0x9fe9f2) } },
    vertexShader: SCREEN_VS, fragmentShader: SCREEN_FS, toneMapped: false,
  }));
  screen.position.y = y; screen.renderOrder = 1; group.add(screen);
  // the lettering round the rim, drifting slowly round
  const words = letteringTexture(), ring = new THREE.Mesh(ringGeometry(radius - 0.46, radius - 0.16, 256, 2), new THREE.MeshBasicMaterial({ map: words, transparent: true, depthWrite: false, opacity: 0.55, toneMapped: false }));
  ring.position.y = y + 0.002; ring.renderOrder = 2; group.add(ring);

  // the fish: [species, ring radius, speed (m/s, + anticlockwise seen from above), length (m), opacity]
  const R = rng(909);
  const SIZE = 0.78;                    // every fish a little smaller than first drawn (Jeffry, 19 Nov), so the screen reads as water, not a poster
  const plan = [
    // near and big (the TVs' hero fish), in two rings going opposite ways
    ['hamour', 3.4, -0.46, 2.7, 1], ['shaari', 3.4, -0.46, 2.3, 1], ['mullet', 3.4, -0.46, 1.9, 1],
    ['cobia', 4.75, 0.52, 2.6, 1], ['hamra', 4.75, 0.52, 2.1, 1], ['seabream', 4.75, 0.52, 1.7, 1], ['shiqra', 4.75, 0.52, 2.0, 1], ['hamour', 4.75, 0.52, 2.3, 1],
    // small and faint, further off: a school under the globe and a few round the edge
    ['seabream', 2.0, 0.32, 0.9, 0.55], ['seabream', 2.0, 0.32, 0.84, 0.5], ['seabream', 2.0, 0.32, 0.88, 0.45], ['shaari', 2.0, 0.32, 0.78, 0.4],
    ['hamra', 5.55, -0.36, 0.76, 0.42], ['mullet', 5.55, -0.36, 0.84, 0.4], ['shiqra', 5.55, -0.36, 0.72, 0.38],
  ];
  const rings = {}; for (const f of plan) (rings[f[1]] = rings[f[1]] || []).push(f);
  const fish = [];
  for (const r0 of Object.keys(rings)) { const list = rings[r0]; list.forEach((f, k) => { const school = Number(r0) < 2.5; fish.push({ sp: f[0], r0: f[1], v: f[2], len: f[3] * SIZE, alpha: f[4], a0: school ? 0.62 * k + R() * 0.15 : (k / list.length) * TAU + R() * 0.4, ph: R() * TAU, wob: R() * TAU }); }); }
  const batches = {}, U = { caus: screen.material.uniforms.uCaus, water: { value: lin(WATER_TINT) }, r: { value: radius } };
  for (const id of new Set(fish.map((f) => f.sp))) { const b = speciesBatch(id, fish.filter((f) => f.sp === id).length, uTime, U); batches[id] = b; group.add(b.shadow, b.mesh); }
  // how deep each swims (0 just under the glass, 1 down by the bottom): the big near ones high, the small faint ones low
  for (const f of fish) { const b = batches[f.sp]; f.b = b; f.i = b.n++; f.depth = f.alpha < 1 ? 0.62 + (1 - f.alpha) * 0.5 : 0.08 + R() * 0.12; const A = b.mesh.geometry.attributes; A.aPhase.setX(f.i, f.ph); A.aAlpha.setX(f.i, f.alpha); A.aDepth.setX(f.i, f.depth); b.mesh.renderOrder = f.alpha < 1 ? 3 : 4; }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), qy = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), S = new THREE.Vector3();
  const place = (f, t) => {
    // round its ring, a little in and out, with a gentle burst-and-glide in its speed
    const ang = f.a0 + (f.v / f.r0) * (t + Math.sin(t * 0.8 + f.wob) * 0.35), rr = f.r0 + Math.sin(t * 0.27 + f.wob) * 0.22;
    const x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
    // the way it is heading (along the ring, turned a little by the in and out)
    const s = Math.sign(f.v), dx = -Math.sin(ang) * s + Math.cos(ang) * Math.cos(t * 0.27 + f.wob) * 0.05, dz = Math.cos(ang) * s + Math.sin(ang) * Math.cos(t * 0.27 + f.wob) * 0.05;
    const th = Math.atan2(dz, -dx);                                                     // the photo's head (its left end) points along (dx, dz)
    qy.setFromAxisAngle(Y, th); q.multiplyQuaternions(qy, qx);
    // the back (the photo's top) towards the middle, so the fish nearest someone at the rim is the right way up for them
    const flip = (-dz * -x + dx * -z) > 0 ? 1 : -1;
    P.set(x, y + (f.alpha < 1 ? 0.003 : 0.005), z); S.set(f.len, f.len * f.b.aspect * flip, 1);
    f.b.mesh.setMatrixAt(f.i, m.compose(P, q, S));
    // the shadow: out from the middle (the light is over the globe), further and a touch bigger the higher the fish swims
    const off = 0.12 + 0.42 * (1 - f.depth), rl = Math.hypot(x, z) || 1, k = 1.04 + 0.08 * (1 - f.depth);
    P.set(x + (x / rl) * off, y + 0.002, z + (z / rl) * off); S.multiplyScalar(k); S.z = 1;
    f.b.shadow.setMatrixAt(f.i, m.compose(P, q, S));
  };
  for (const f of fish) place(f, 0);
  for (const b of Object.values(batches)) { b.mesh.instanceMatrix.needsUpdate = true; b.shadow.instanceMatrix.needsUpdate = true; const A = b.mesh.geometry.attributes; A.aPhase.needsUpdate = true; A.aAlpha.needsUpdate = true; A.aDepth.needsUpdate = true; }

  return {
    group,
    update(dt, t) {
      uTime.value = t; words.offset.x = -t * 0.004;
      for (const f of fish) place(f, t);
      for (const b of Object.values(batches)) { b.mesh.instanceMatrix.needsUpdate = true; b.shadow.instanceMatrix.needsUpdate = true; }
    },
  };
}
