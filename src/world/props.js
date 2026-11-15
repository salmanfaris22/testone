// Life around the buildings: palms, trees, solar street lights, vehicles, people.
import * as THREE from 'three';
import { Builder, C, shade, rng, TAU, DEG, mixHex, canvasTex } from './kit.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();

export function geoOf(build, key = 'matte') {
  const b = new Builder(); build(b);
  const bucket = b.buckets.get(key); return bucket.toGeometry();
}

/* ───────────── vegetation ───────────── */
function palmGeo(seed) {
  const R = rng(seed);
  return geoOf((b) => {
    let x = 0, z = 0; const lean = (R() - 0.5) * 0.16, dir = R() * TAU, H = 7.2, n = 7;
    for (let i = 0; i < n; i++) {
      const t = i / n, r0 = 0.3 - t * 0.12, y = t * H;
      b.cyl(i % 2 ? C.trunk : shade(C.trunk, 0.88), r0, H / n + 0.05, x, y, z, 8, r0 - 0.02);
      x += Math.cos(dir) * lean * (i + 1) * 0.3; z += Math.sin(dir) * lean * (i + 1) * 0.3;
    }
    b.ball(shade(C.trunk, 0.8), 0.42, x, H + 0.1, z, 8, 6);
    const fr = 11;
    for (let i = 0; i < fr; i++) {
      const a = (i / fr) * TAU + R() * 0.3, droop = 0.25 + R() * 0.3, len = 3.2 + R() * 0.9;
      const ca = Math.cos(a), sa = Math.sin(a);
      let px = x, py = H + 0.25, pz = z, pitch = 0.5 - droop * 0.4;
      for (let k = 0; k < 4; k++) {
        const sl = len / 4, w = [0.75, 0.9, 0.7, 0.36][k];
        const hx = Math.cos(pitch) * sl, hy = Math.sin(pitch) * sl;
        b.boxC(k % 2 ? C.palm : C.palmDark, sl * 1.05, 0.05, w, px + ca * hx * 0.5, py + hy * 0.5, pz + sa * hx * 0.5, -a, 0, pitch);
        px += ca * hx; py += hy; pz += sa * hx; pitch -= droop * 0.55 + 0.12;
      }
    }
  });
}
function treeGeo(seed) {
  const R = rng(seed);
  return geoOf((b) => {
    b.cyl(C.woodDark, 0.16, 2.2, 0, 0, 0, 7, 0.11);
    const g = [0x8fcf9f, 0x7cc492, 0xa3d9ac];
    b.ico(g[0], 1.75, 0, 3.3, 0, 0.82, R() * 3, 1); b.ico(g[1], 1.25, 1.0, 2.9, 0.4, 0.8, R() * 3, 1); b.ico(g[2], 1.15, -0.8, 3.0, -0.6, 0.8, R() * 3, 1); b.ico(g[1], 1.0, 0.1, 4.2, 0.3, 0.8, R() * 3, 1);
  });
}
function shrubGeo() { return geoOf((b) => { b.ico(0x86c494, 0.8, 0, 0.45, 0, 0.7, 0.3, 1); b.ico(0x76b888, 0.55, 0.55, 0.35, 0.2, 0.7, 1.1, 1); b.ico(0x97d1a2, 0.5, -0.45, 0.32, -0.3, 0.7, 2.1, 1); }); }

export function instanced(geo, mat, list, { cast = true, receive = false, tint = false } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach((o, i) => {
    _m.compose(_p.set(o.x, o.y || 0, o.z), _q.setFromEuler(_e.set(0, o.ry || 0, 0)), _s.set(o.s || 1, (o.s || 1) * (o.sy || 1), o.s || 1));
    im.setMatrixAt(i, _m); if (tint) im.setColorAt(i, _c.setHex(o.hex ?? 0xffffff));
  });
  im.castShadow = cast; im.receiveShadow = receive; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.matrixAutoUpdate = false;
  return im;
}

export function plantTrees(scene, mats, { palms, trees, shrubs }) {
  const g = new THREE.Group(); g.name = 'plants';
  const pg = [palmGeo(4), palmGeo(9)];
  const half = [[], []]; palms.forEach((p, i) => half[i % 2].push(p));
  half.forEach((l, i) => l.length && g.add(instanced(pg[i], mats.leaf, l)));
  if (trees.length) { const tg = [treeGeo(2), treeGeo(5)]; const h2 = [[], []]; trees.forEach((p, i) => h2[i % 2].push(p)); h2.forEach((l, i) => l.length && g.add(instanced(tg[i], mats.matte, l))); }
  if (shrubs.length) g.add(instanced(shrubGeo(), mats.matte, shrubs));
  scene.add(g); return g;
}

/* ───────────── solar street lights (as on site) ───────────── */
export function streetLights(scene, mats, env, list) {
  const geo = geoOf((b) => {
    b.cyl(0xe9ecee, 0.11, 8.2, 0, 0, 0, 8, 0.07);
    b.boxC(0xe9ecee, 2.0, 0.09, 0.09, 0.95, 8.0, 0, 0, 0, 0.1);
    b.boxC(0xd8dcdf, 0.9, 0.12, 0.36, 1.75, 8.02, 0);
    b.boxC(0x24364a, 1.5, 0.05, 0.9, -0.1, 8.75, 0, 0, 0, -0.42);      // solar panel
    b.cyl(0xcfd4d7, 0.2, 0.25, 0, 0, 0, 8);
  });
  const g = new THREE.Group(); g.name = 'lights';
  g.add(instanced(geo, mats.matte, list, { cast: true }));
  // halo sprites + pools of light on the ground, shown as night comes
  const n = list.length, pos = new Float32Array(n * 3);
  list.forEach((o, i) => { const c = Math.cos(o.ry || 0), s = Math.sin(o.ry || 0); pos[i * 3] = o.x + 1.75 * c; pos[i * 3 + 1] = 7.9; pos[i * 3 + 2] = o.z - 1.75 * s; });
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const halo = new THREE.Points(pg, glowPointsMat(env, 5.2, 0xffe2a8));
  halo.frustumCulled = false; halo.renderOrder = 6; g.add(halo);
  const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: radialTex(), color: 0xffd9a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), n);
  list.forEach((o, i) => { _m.compose(_p.set(pos[i * 3], 0.16, pos[i * 3 + 2]), _q.identity(), _s.set(26, 1, 26)); pool.setMatrixAt(i, _m); });
  pool.renderOrder = 4; pool.visible = false; pool.matrixAutoUpdate = false; g.add(pool);
  env.onNight((v) => { pool.visible = v > 0.02; pool.material.opacity = v * 0.5; });
  scene.add(g); return g;
}
let _radial;
export function radialTex() {
  if (_radial) return _radial;
  _radial = canvasTex(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(0.6, 'rgba(255,255,255,.14)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, { repeat: false });
  return _radial;
}
/** additive round sprites sized in metres; brightness follows the night value */
export function glowPointsMat(env, size, hex, always = 0) {
  const U = { uSize: { value: size }, uColor: { value: new THREE.Color(hex) }, uNight: { value: 0 }, uAlways: { value: always }, uScale: { value: 1 } };
  const m = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uSize, uScale; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(220.0, uSize * uScale / max(-mv.z, 1.0)); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uNight, uAlways; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = pow(max(1.0 - d, 0.0), 2.4) * 0.85 + smoothstep(0.24, 0.0, d) * 0.9; a *= max(uNight, uAlways); if (a < 0.003) discard; gl_FragColor = vec4(uColor * a, a); }`,
  });
  env.onNight((v) => { U.uNight.value = v; });
  m.userData.scale = U.uScale;
  return m;
}

/* ───────────── vehicles ───────────── */
export function car(b, x, z, ry, hex = C.white, y = 0.07) {
  b.push(x, y, z, ry);
  b.use('satin').box(hex, 4.3, 0.62, 1.78, 0, 0.3, 0); b.box(hex, 2.3, 0.56, 1.6, -0.25, 0.92, 0);
  b.use('window').box(null, 2.34, 0.4, 1.63, -0.25, 0.98, 0);
  b.use('matte'); for (const sx of [-1.35, 1.35]) for (const sz of [-0.85, 0.85]) b.rod(C.rubber, 0.33, [sx, 0.33, sz - 0.1], [sx, 0.33, sz + 0.1], 12);
  b.pop();
}
export function bus(b, x, z, ry, y = 0.07) {       // the white staff coaster seen on site
  b.push(x, y, z, ry);
  b.use('satin').box(C.white, 7.0, 2.25, 2.1, 0, 0.42, 0); b.box(C.white, 0.5, 1.5, 2.0, 3.55, 0.42, 0);
  b.use('window').box(null, 5.6, 0.75, 2.14, -0.3, 1.5, 0); b.box(null, 0.1, 0.9, 1.8, 3.78, 1.25, 0);
  b.use('matte').box(0x2a5c7d, 6.9, 0.1, 2.12, 0, 1.18, 0);
  for (const sx of [-2.3, 2.4]) for (const sz of [-0.98, 0.98]) b.rod(C.rubber, 0.42, [sx, 0.42, sz - 0.12], [sx, 0.42, sz + 0.12], 12);
  b.pop();
}
/** live-fish transport truck with insulated tanks */
export function fishTruck(b, x, z, ry, y = 0.07) {
  b.push(x, y, z, ry);
  b.use('satin').box(C.white, 2.2, 2.2, 2.3, 3.4, 0.5, 0); b.use('window').box(null, 0.1, 0.8, 1.9, 4.52, 1.6, 0);
  b.use('matte').box(C.steelDark, 8.4, 0.3, 2.3, -0.2, 0.55, 0);
  for (let i = 0; i < 3; i++) { b.use('satin').box(0x2f86ab, 1.9, 1.5, 2.1, -3.2 + i * 2.1, 0.85, 0); b.box(C.white, 1.0, 0.1, 1.0, -3.2 + i * 2.1, 2.35, 0); }
  b.use('satin').cyl(C.pipeO2, 0.2, 1.3, 1.9, 0.85, 0.7, 10); b.cyl(C.pipeO2, 0.2, 1.3, 1.9, 0.85, -0.7, 10);
  b.use('matte'); for (const sx of [-3.0, -1.6, 3.4]) for (const sz of [-1.05, 1.05]) b.rod(C.rubber, 0.5, [sx, 0.5, sz - 0.14], [sx, 0.5, sz + 0.14], 12);
  b.pop();
}
export function forklift(b, x, z, ry, y = 0.12) {
  b.push(x, y, z, ry);
  b.use('satin').box(C.orange, 1.7, 0.8, 1.1, 0, 0.3, 0); b.box(C.black, 0.9, 1.3, 1.0, -0.2, 1.1, 0);
  b.box(C.steelDark, 0.1, 2.2, 0.9, 0.95, 0.2, 0); b.box(C.steelDark, 1.1, 0.06, 0.12, 1.55, 0.25, 0.3); b.box(C.steelDark, 1.1, 0.06, 0.12, 1.55, 0.25, -0.3);
  b.use('matte'); for (const sx of [-0.6, 0.6]) for (const sz of [-0.55, 0.55]) b.rod(C.rubber, 0.28, [sx, 0.28, sz - 0.08], [sx, 0.28, sz + 0.08], 10);
  b.pop();
}
/** flagpole with the UAE flag */
export function flag(b, x, z, ry = 0, h = 11) {
  b.push(x, 0, z, ry);
  b.use('satin').cyl(0xe6e9eb, 0.09, h, 0, 0, 0, 8, 0.05); b.ball(0xd9b25a, 0.14, 0, h + 0.1, 0, 8, 6);
  const fw = 2.7, fh = 1.35, y = h - fh - 0.2;
  b.use('matte').box(0xc8102e, fw * 0.25, fh, 0.04, 0.08 + fw * 0.125, y, 0);
  b.box(0x00843d, fw * 0.75, fh / 3, 0.04, 0.08 + fw * 0.625, y + (fh * 2) / 3, 0); b.box(0xf7f7f5, fw * 0.75, fh / 3, 0.04, 0.08 + fw * 0.625, y + fh / 3, 0); b.box(0x16181a, fw * 0.75, fh / 3, 0.04, 0.08 + fw * 0.625, y, 0);
  b.pop();
}
/** shade canopy over a row of parking bays */
export function carport(b, x0, z, x1, y = 0.07) {
  const len = x1 - x0, n = Math.round(len / 6.4);
  b.use('satin'); for (let i = 0; i <= n; i++) { const x = x0 + (i / n) * len; b.cyl(0xe6e9eb, 0.1, 2.9, x, y, z + 2.2, 8); b.rod(0xe6e9eb, 0.07, [x, y + 2.9, z + 2.2], [x, y + 3.3, z - 2.6], 6); }
  b.use('matte').boxC(0xf6f4ef, len + 1.2, 0.12, 5.6, (x0 + x1) / 2, y + 3.25, z - 0.2, 0, -0.085);
}
export function workBoat(b, x, z, ry, y) {
  b.push(x, y, z, ry);
  const hull = [[-5, -1.5], [3.2, -1.5], [5.6, 0], [3.2, 1.5], [-5, 1.5]];
  b.use('satin').prism(0xf4f1ea, hull, -0.5, 0.75); b.use('matte').prism(0x2d6f8f, hull.map((p) => [p[0] * 1.01, p[1] * 1.02]), -0.5, -0.05);
  b.use('matte').prism(C.clayCool, hull.map((p) => [p[0] * 0.93, p[1] * 0.85]), 0.75, 0.8, { sides: false });
  b.use('satin').box(C.white, 2.4, 1.7, 2.0, -2.4, 0.8, 0); b.use('window').box(null, 2.44, 0.6, 2.04, -2.4, 1.6, 0); b.use('matte').box(C.orange, 2.7, 0.12, 2.3, -2.4, 2.5, 0);
  b.use('satin').box(0x2f86ab, 1.6, 0.9, 1.6, 1.4, 0.8, 0); b.rod(C.steelDark, 0.06, [3.6, 0.8, 0], [3.6, 2.6, 0], 6); b.rod(C.steelDark, 0.05, [3.6, 2.6, 0], [1.6, 2.2, 0], 6);
  b.pop();
}

/* people live in people.js */
export { WEAR, wearFor } from './people.js';
