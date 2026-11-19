// The round LED screen in the floor of the exhibition hall (area 09), under the walk-on glass, where the aquarium used to be.
// It plays what the hall's fish TVs play (exhibit-tv.js), made round: deep blue-teal water lit from the middle (the globe hangs
// over it), slow rays of light turning, the sunlight net drifting across, specks of sea snow, and the client's fish (the licensed
// photo cut-outs) swimming round in rings, big ones near and small faint ones further off, their bodies waving as on the TVs.
// A ring of lettering runs round the rim. All of it is drawn on the graphics card: no picture is redrawn and sent each frame.
import * as THREE from 'three';
import { FISH_CUT } from '../data/photos.js';
import { loadPhoto, rng, TAU } from './kit.js';
import { causticTexture } from './reef.js';

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
 * The fish of one species, as one batch of flat photo cut-outs lying on the screen. Each body waves as it swims: the wave runs
 * from head to tail and grows towards the tail, as on the TVs (the photos face left: the head is at the low end of the picture).
 */
function speciesBatch(id, count, uTime) {
  const dot = document.createElement('canvas'); dot.width = dot.height = 2;                // (transparent until the photo is in)
  const tex = new THREE.Texture(dot); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true;
  const uAmp = { value: 0.03 / 0.45 };
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.02, side: THREE.DoubleSide, toneMapped: false });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime; sh.uniforms.uAmp = uAmp;
    sh.vertexShader = 'uniform float uTime, uAmp;\nattribute float aPhase, aAlpha;\nvarying float vAlpha;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      { float u = clamp(position.x + 0.5, 0.0, 1.0); transformed.y += sin(uTime * 3.6 + aPhase - u * 6.0) * u * u * uAmp; vAlpha = aAlpha; }`);
    sh.fragmentShader = 'varying float vAlpha;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.a *= vAlpha;');
  };
  mat.customProgramCacheKey = () => 'floor-fish';
  const geo = new THREE.PlaneGeometry(1, 1, 20, 1);
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
  geo.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1));
  const mesh = new THREE.InstancedMesh(geo, mat, count); mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.name = `floor-fish-${id}`;
  const batch = { mesh, aspect: 0.45, n: 0 };
  loadPhoto(FISH_CUT[id]).then((p) => {
    if (!p) return; tex.image = p.image; tex.flipY = p.flipY; tex.needsUpdate = true;
    batch.aspect = p.image.height / p.image.width; uAmp.value = 0.03 / batch.aspect;
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
  const batches = {};
  for (const id of new Set(fish.map((f) => f.sp))) { const b = speciesBatch(id, fish.filter((f) => f.sp === id).length, uTime); batches[id] = b; group.add(b.mesh); }
  for (const f of fish) { const b = batches[f.sp]; f.b = b; f.i = b.n++; b.mesh.geometry.attributes.aPhase.setX(f.i, f.ph); b.mesh.geometry.attributes.aAlpha.setX(f.i, f.alpha); b.mesh.renderOrder = f.alpha < 1 ? 2 : 3; }

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
  };
  for (const f of fish) place(f, 0);
  for (const b of Object.values(batches)) { b.mesh.instanceMatrix.needsUpdate = true; b.mesh.geometry.attributes.aPhase.needsUpdate = true; b.mesh.geometry.attributes.aAlpha.needsUpdate = true; }

  return {
    group,
    update(dt, t) {
      uTime.value = t; words.offset.x = -t * 0.004;
      for (const f of fish) place(f, t);
      for (const b of Object.values(batches)) b.mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
