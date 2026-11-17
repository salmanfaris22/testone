// Helpers for the opening film's construction sequence (used only by intro.js):
// a reveal map that says when each patch of ground gets built (roads from the gate inward, then the paving flows out from them),
// material copies that reveal the hardscape by that map, material copies that build an area from the ground up with a glowing
// cut line, and a tower crane.
import * as THREE from 'three';
import { Builder, C } from './kit.js';
import { ROADS, RB_W, RB_E, DROP } from './layout.js';

const SQRT2 = Math.SQRT2;
const INF = 1e9;

/* ───── world position for the fragment shader (works for plain and instanced meshes) ───── */
const VERT_DECL = '#include <common>\nvarying vec3 vRvW;';
const VERT_POS = `#include <project_vertex>
  vec4 rvWp = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    rvWp = instanceMatrix * rvWp;
  #endif
  vRvW = ( modelMatrix * rvWp ).xyz;`;
const withWorldPos = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', VERT_DECL).replace('#include <project_vertex>', VERT_POS); };

/* ───── the reveal map ───── */
/**
 * When each bit of the hardscape appears, in seconds after paving starts.
 * Roads: distance along the road network from the gate, at a speed that paves the farthest road in `roadDur`.
 * Everything else (apron, pads, plazas, lawns, parking): flows out from the nearest paved road at `flowSpeed` m/s.
 * West of the gate (the public road) is there from the start, and so is the road `pre(x, z)` says is (the drive in: only its road,
 * not the sand beside it). `island` ({ x, z, r }) is ground built before the rest (round area 08): the paving spreads out from it and
 * from the drive in as well as from the gate, so no road ever stands cut off at its edge.
 */
export function revealMap(world, { gateX, roadDur = 2.8, flowSpeed = 64, flowDelay = 0.2, cell = 2, pre = null, island = null } = {}) {
  const box = new THREE.Box3().setFromObject(world.land.hardscape);
  const x0 = Math.max(box.min.x - 4, gateX - 14), z0 = box.min.z - 4;
  const W = Math.ceil((box.max.x + 4 - x0) / cell) + 1, H = Math.ceil((box.max.z + 4 - z0) / cell) + 1, N = W * H;
  const mask = new Uint8Array(N);
  const stamp = (x, z, r) => {
    const i0 = Math.max(0, Math.floor((x - r - x0) / cell)), i1 = Math.min(W - 1, Math.ceil((x + r - x0) / cell));
    const j0 = Math.max(0, Math.floor((z - r - z0) / cell)), j1 = Math.min(H - 1, Math.ceil((z + r - z0) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const dx = x0 + i * cell - x, dz = z0 + j * cell - z; if (dx * dx + dz * dz <= r * r) mask[j * W + i] = 1; }
  };
  for (const [name, pts] of Object.entries(world.land.roads || {})) {
    if (!pts || pts.length < 2) continue;
    const w = name === 'cross' || name === 'drive' ? 9 : ROADS.w, hw = name === 'rbW' || name === 'rbE' ? ROADS.w / 2 + 2.6 : w / 2 + ROADS.walk + 0.4;
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(len / (cell * 0.5)));
      for (let s = 0; s <= n; s++) { const x = a[0] + ((b[0] - a[0]) * s) / n, z = a[1] + ((b[1] - a[1]) * s) / n; if (x > x0 - hw && x < x0 + W * cell + hw) stamp(x, z, hw); }
    }
  }
  for (const rb of [RB_W, RB_E]) if (rb) stamp(rb.x, rb.z, rb.r + ROADS.w / 2 + 2.4);
  if (DROP) stamp(DROP.x, DROP.z, DROP.r + 3);

  // distance along the roads from the gate (repeated chamfer sweeps, restricted to road cells)
  const d = new Float32Array(N).fill(INF), co = cell, cd = cell * SQRT2;
  const inIsland = (x, z) => !!island && Math.hypot(x - island.x, z - island.z) < island.r;
  const built = (x, z) => x < gateX + 2 || (pre && pre(x, z)) || inIsland(x, z);           // road there before the paving starts: it spreads from here
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (mask[k] && built(x0 + i * cell, z0 + j * cell)) d[k] = 0; }
  const fwd = [[-1, 0, co], [-1, -1, cd], [0, -1, co], [1, -1, cd]], bwd = [[1, 0, co], [1, 1, cd], [0, 1, co], [-1, 1, cd]];
  for (let it = 0; it < 60; it++) {
    let changed = false;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!mask[k]) continue; let v = d[k]; for (const [di, dj, c] of fwd) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const q = jj * W + ii; if (mask[q] && d[q] + c < v) v = d[q] + c; } if (v < d[k]) { d[k] = v; changed = true; } }
    for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { const k = j * W + i; if (!mask[k]) continue; let v = d[k]; for (const [di, dj, c] of bwd) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const q = jj * W + ii; if (mask[q] && d[q] + c < v) v = d[q] + c; } if (v < d[k]) { d[k] = v; changed = true; } }
    if (!changed) break;
  }
  let dMax = 1; for (let k = 0; k < N; k++) if (d[k] < INF && d[k] > dMax) dMax = d[k];
  const roadSpeed = dMax / roadDur;

  // the paving flows out from the roads (two chamfer sweeps, no obstacles)
  const f = new Float32Array(N).fill(INF);
  for (let k = 0; k < N; k++) if (d[k] < INF) f[k] = d[k] / roadSpeed + flowDelay;
  if (island) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (inIsland(x0 + i * cell, z0 + j * cell)) f[j * W + i] = 0;
  const fo = cell / flowSpeed, fdg = (cell * SQRT2) / flowSpeed;
  const ffwd = [[-1, 0, fo], [-1, -1, fdg], [0, -1, fo], [1, -1, fdg]], fbwd = [[1, 0, fo], [1, 1, fdg], [0, 1, fo], [-1, 1, fdg]];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; let v = f[k]; for (const [di, dj, c] of ffwd) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const q = jj * W + ii; if (f[q] + c < v) v = f[q] + c; } f[k] = v; }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { const k = j * W + i; let v = f[k]; for (const [di, dj, c] of fbwd) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const q = jj * W + ii; if (f[q] + c < v) v = f[q] + c; } f[k] = v; }

  const rv = new Float32Array(N), half = new Uint16Array(N);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, x = x0 + i * cell, z = z0 + j * cell;
    let v = d[k] < INF ? d[k] / roadSpeed : f[k];
    if (pre && mask[k] && pre(x, z)) v = -4;                         // the way in that the film drives: its road built from the first frame, no blueprint over it
    if (x < gateX - 2) v = -10;                                      // outside the gate: the public road is already there
    rv[k] = Math.min(60, v); half[k] = THREE.DataUtils.toHalfFloat(rv[k]);
  }
  const tex = new THREE.DataTexture(half, W, H, THREE.RedFormat, THREE.HalfFloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.generateMipmaps = false; tex.needsUpdate = true;
  /** bilinear sample in world metres; 0 outside the map */
  const sample = (x, z) => {
    const u = (x - x0) / cell, v = (z - z0) / cell; if (u < 0 || v < 0 || u > W - 1 || v > H - 1) return 0;
    const i = Math.min(W - 2, Math.floor(u)), j = Math.min(H - 2, Math.floor(v)), fu = u - i, fv = v - j, k = j * W + i;
    return (rv[k] * (1 - fu) + rv[k + 1] * fu) * (1 - fv) + (rv[k + W] * (1 - fu) + rv[k + W + 1] * fu) * fv;
  };
  // when the last of the hardscape is down: rasterise its triangles to see which cells it covers
  let flowMax = 0;
  world.land.hardscape.updateMatrixWorld(true);
  world.land.hardscape.traverse((m) => {
    if (!m.isMesh) return;
    const P = m.geometry.attributes.position.array, I = m.geometry.index ? m.geometry.index.array : null, n = I ? I.length : P.length / 3, e = m.matrixWorld.elements;
    const X = (i) => e[0] * P[i * 3] + e[4] * P[i * 3 + 1] + e[8] * P[i * 3 + 2] + e[12], Z = (i) => e[2] * P[i * 3] + e[6] * P[i * 3 + 1] + e[10] * P[i * 3 + 2] + e[14];
    for (let q = 0; q + 2 < n; q += 3) {
      const ia = I ? I[q] : q, ib = I ? I[q + 1] : q + 1, ic = I ? I[q + 2] : q + 2;
      const ax = X(ia), az = Z(ia), bx = X(ib), bz = Z(ib), cx = X(ic), cz = Z(ic), den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(den) < 1e-6) continue;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / cell)), i1 = Math.min(W - 1, Math.ceil((Math.max(ax, bx, cx) - x0) / cell));
      const j0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - z0) / cell)), j1 = Math.min(H - 1, Math.ceil((Math.max(az, bz, cz) - z0) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = x0 + i * cell, pz = z0 + j * cell, l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / den, l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / den;
        if (l1 >= -0.02 && l2 >= -0.02 && l1 + l2 <= 1.02) flowMax = Math.max(flowMax, rv[j * W + i]);
      }
    }
  });
  // texel centres sit at x0 + i * cell, so the box is shifted half a cell
  const uBox = new THREE.Vector4(x0 - cell / 2, z0 - cell / 2, 1 / (W * cell), 1 / (H * cell));
  return { tex, uBox, sample, roadDur, roadSpeed, dMax, W, H, cell, x0, z0, end: flowMax };
}

/* ───── hardscape: appears where the map says, low things first, with a warm glow on the front ───── */
const GROUND_FRAG_DECL = '#include <common>\nvarying vec3 vRvW;\nuniform sampler2D uRvMap; uniform vec4 uRvBox; uniform vec4 uRvPre; uniform float uRvP, uRvRise;';
const RV_AT = `vec2 rvUV = ( vRvW.xz - uRvBox.xy ) * uRvBox.zw;
  float rvAt = ( rvUV.x < 0.0 || rvUV.y < 0.0 || rvUV.x > 1.0 || rvUV.y > 1.0 ) ? -10.0 : texture2D( uRvMap, rvUV ).r;
  float rvAge = uRvP - rvAt;
  // the island built first (centre x, z, radius, and w: 1 once it has finished spreading): built long ago, or, while it spreads,
  // just built at its edge (so its edge glows and rises like every other paving front)
  float rvIs = distance( vRvW.xz, uRvPre.xy );
  if ( rvIs < uRvPre.z ) { rvAge = uRvPre.w < 0.999 ? ( uRvPre.z - rvIs ) / 10.0 : 9.0; rvAt = max( rvAt, -4.0 ); }`;
export function groundMat(src, G) {
  const m = src.clone();
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uRvMap: G.map, uRvBox: G.box, uRvP: G.p, uRvRise: G.rise, uRvPre: G.pre });
    withWorldPos(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', GROUND_FRAG_DECL)
      .replace('void main() {', `void main() {
  ${RV_AT}
  if ( rvAge < 0.0 || vRvW.y > rvAge * uRvRise + 0.03 ) discard;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
  float rvGlow = ( 1.0 - smoothstep( 0.0, 0.34, rvAge ) ) * step( -5.0, rvAt );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, vec3( 1.0, 0.71, 0.38 ), rvGlow * 0.78 );`);
  };
  m.customProgramCacheKey = () => 'introGround';
  return m;
}
/** the same test for a shader of our own (the blueprint paper fades where the ground is built) */
export const RV_GLSL = { decl: 'uniform sampler2D uRvMap; uniform vec4 uRvBox; uniform vec4 uRvPre; uniform float uRvP;', at: RV_AT };

/* ───── buildings: rise from the ground with a glowing cut line, solid where the cut opens a wall ───── */
const RISE_FRAG_DECL = '#include <common>\nvarying vec3 vRvW;\nuniform float uRiseH, uRiseG;';
export function riseMat(src, R) {
  const m = src.clone();
  const cut = src.isMeshStandardMaterial && !(src.transparent && src.opacity < 0.95);
  if (cut) { m.side = THREE.DoubleSide; m.shadowSide = THREE.BackSide; }
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRiseH = R.h; sh.uniforms.uRiseG = R.g;
    withWorldPos(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', RISE_FRAG_DECL)
      .replace('void main() {', 'void main() {\n  if ( vRvW.y > uRiseH ) discard;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
  float rsD = uRiseH - vRvW.y;
  float rsBand = ( 1.0 - smoothstep( 0.0, 0.6, rsD ) ) * uRiseG, rsCore = ( 1.0 - smoothstep( 0.0, 0.09, rsD ) ) * uRiseG;
  ${cut ? 'if ( !gl_FrontFacing ) gl_FragColor.rgb = vec3( 0.80, 0.78, 0.74 );' : ''}
  gl_FragColor.rgb = mix( gl_FragColor.rgb, vec3( 1.0, 0.68, 0.34 ), rsBand * 0.85 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, vec3( 1.0, 0.96, 0.88 ), rsCore );`);
  };
  m.customProgramCacheKey = () => (cut ? 'introRiseCut' : 'introRise');
  return m;
}
/** shadow pass for a rising area: the same cut, so the shadow grows with the building */
export function riseDepth(R) {
  const m = new THREE.MeshDepthMaterial();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRiseH = R.h;
    withWorldPos(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRvW;\nuniform float uRiseH;').replace('void main() {', 'void main() {\n  if ( vRvW.y > uRiseH ) discard;');
  };
  m.customProgramCacheKey = () => 'introRiseDepth';
  return m;
}

/* ───── a tower crane: the mast stands still, the top (jib, counter-jib, cab, hook) slews ───── */
export function makeCrane(mats, { H = 38, jib = 46, cjib = 14 } = {}) {
  const Y = C.yellow, dark = 0x3b4248, light = 0xf2f2ef, conc = 0xbdb9b0;
  const mb = new Builder(), s = 1.05;
  mb.use('concrete').box(conc, 6.4, 1.1, 6.4, 0, 0, 0);
  mb.use('satin');
  const corner = [[-s, -s], [s, -s], [s, s], [-s, s]];
  // chunky enough to read from the air: at 500 m a mast 2.1 m across is only a few pixels wide
  for (const [x, z] of corner) mb.rod(Y, 0.2, [x, 1.1, z], [x, H, z], 6);
  for (let y = 1.1, k = 0; y < H - 0.2; y += 2.5, k++) {
    const y2 = Math.min(H, y + 2.5);
    for (let c = 0; c < 4; c++) {
      const a = corner[c], b = corner[(c + 1) % 4];
      mb.rod(Y, 0.1, [a[0], y2, a[1]], [b[0], y2, b[1]], 4);
      if (k % 2) mb.rod(Y, 0.09, [a[0], y, a[1]], [b[0], y2, b[1]], 4); else mb.rod(Y, 0.09, [b[0], y, b[1]], [a[0], y2, a[1]], 4);
    }
  }
  const mast = mb.build(mats, { cast: true }); mast.name = 'crane-mast';

  const tb = new Builder(), yb = H + 1.0, yt = H + 2.9;
  tb.use('satin').cyl(dark, 1.5, 0.9, 0, H, 0, 16);                                   // slewing ring
  tb.use('matte').box(light, 2.3, 2.2, 2.2, 1.9, H - 1.1, 1.8); tb.use('window').box(null, 2.32, 0.9, 1.6, 1.9, H - 0.1, 1.8);   // cab
  tb.use('satin');
  // jib: a triangular truss out along +x
  for (const z of [-0.75, 0.75]) tb.rod(Y, 0.17, [1.2, yb, z], [jib, yb, z], 6);
  tb.rod(Y, 0.17, [1.2, yt, 0], [jib, yb + 0.6, 0], 6);
  for (let x = 1.2, k = 0; x < jib - 0.5; x += 2.6, k++) {
    const x2 = Math.min(jib, x + 2.6), top = (u) => yt + ((yb + 0.6 - yt) * (u - 1.2)) / (jib - 1.2);
    for (const z of [-0.75, 0.75]) tb.rod(Y, 0.08, [k % 2 ? x : x2, yb, z], [k % 2 ? x2 : x, top(k % 2 ? x2 : x), 0], 4);
    tb.rod(Y, 0.07, [x2, yb, -0.75], [x2, yb, 0.75], 4);
  }
  // counter-jib along -x with its ballast
  for (const z of [-0.8, 0.8]) tb.rod(Y, 0.16, [-1.2, yb, z], [-cjib, yb, z], 6);
  for (let x = -1.2; x > -cjib; x -= 2.4) tb.rod(Y, 0.08, [x, yb, -0.8], [x - 2.4, yb, 0.8], 4);
  tb.use('concrete'); for (let k = 0; k < 3; k++) tb.box(conc, 1.1, 2.6, 2.2, -cjib + 1.2 + k * 1.2, yb - 2.2, 0);
  tb.use('matte').box(dark, 2.4, 1.2, 1.4, -cjib + 5.6, yb + 0.1, 0);                  // hoist winch
  // tower head and the pendant ties
  tb.use('satin'); for (const [x, z] of corner) tb.rod(Y, 0.14, [x, yb, z], [0, H + 9.5, 0], 6);
  tb.rod(0x9aa3a9, 0.03, [0, H + 9.5, 0], [jib * 0.66, yt - 0.5, 0], 4); tb.rod(0x9aa3a9, 0.03, [0, H + 9.5, 0], [-cjib + 0.6, yb + 0.2, 0], 4);
  tb.use('glow').ball(C.red, 0.28, 0, H + 9.8, 0, 8, 6); tb.ball(C.red, 0.22, jib, yb + 0.9, 0, 8, 6);
  const top = tb.build(mats, { cast: true }); top.name = 'crane-top';

  // trolley and hook block hang from the jib and run in and out
  const hb = new Builder(), drop = 15;
  hb.use('satin').box(dark, 1.6, 0.6, 1.8, 0, yb - 0.6, 0);
  hb.rod(0x30363b, 0.035, [-0.25, yb - 0.6, 0], [-0.25, yb - drop, 0], 4); hb.rod(0x30363b, 0.035, [0.25, yb - 0.6, 0], [0.25, yb - drop, 0], 4);
  hb.use('matte').box(Y, 0.9, 1.1, 0.7, 0, yb - drop - 1.1, 0); hb.use('satin').torus(dark, 0.32, 0.08, 0, yb - drop - 1.5, 0, 6, 16);
  const hook = hb.build(mats, { cast: true }); hook.name = 'crane-hook';
  top.add(hook);

  const root = new THREE.Group(); root.name = 'crane'; root.add(mast, top);
  return { root, top, hook, H, jib };
}
