// The sea floor of the hall's aquarium, made the way the hall's fish screens draw theirs: dark teal rocks, ribbons of sea
// grass that sway in the swell, a few muted sponges and corals, and sunlight playing over the sand. Used twice: seen from
// above through the glass floor (park.js) and from inside, under the water (dive.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, TAU, canvasTex } from './kit.js';

const _c = new THREE.Color(), _d = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

/** paint one colour into every vertex of a geometry, lighter towards the top (`lift`) */
function paint(g, hex, lift = 0, top = 1) {
  const P = g.attributes.position, col = new Float32Array(P.count * 3);
  _c.setHex(hex); _d.copy(_c).lerp(new THREE.Color(0xdff3e8), 0.5);
  for (let i = 0; i < P.count; i++) { const k = lift ? THREE.MathUtils.smoothstep(P.getY(i) / top, 0.15, 1) * lift : 0; col[i * 3] = _c.r + (_d.r - _c.r) * k; col[i * 3 + 1] = _c.g + (_d.g - _c.g) * k; col[i * 3 + 2] = _c.b + (_d.b - _c.b) * k; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const place = (g, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => g.applyMatrix4(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)));
const keep = (g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; };

/** rounded reef rocks, sitting on their flat undersides: list = [[x, y, z, r, squash]], merged into one mesh */
export function reefRocks(list, { seed = 5, colors = [0x2f5458, 0x264850, 0x33585a, 0x3b5d57] } = {}) {
  const R = rng(seed), parts = [];
  for (const [x, y, z, r, sq = 0.62] of list) {
    const g = new THREE.SphereGeometry(1, 20, 14), P = g.attributes.position, a = R() * 9, b = R() * 9, c = R() * 9;
    for (let i = 0; i < P.count; i++) {
      let px = P.getX(i), py = P.getY(i), pz = P.getZ(i);
      const n = 1 + 0.17 * Math.sin(3.1 * px + a) * Math.sin(2.6 * py + b) * Math.sin(3.4 * pz + c) + 0.06 * Math.sin(8.3 * px + b) * Math.sin(7.1 * pz + a);
      px *= n; py *= n; pz *= n; if (py < -0.2) py = -0.2 + (py + 0.2) * 0.15;          // a flat underside, bedded in the sand
      P.setXYZ(i, px, py + 0.2, pz);
    }
    g.computeVertexNormals();
    paint(g, colors[Math.floor(R() * colors.length)], 0.32, 1.2);
    place(g, x, y, z, R() * TAU, r * (0.85 + R() * 0.3), r * sq, r * (0.8 + R() * 0.35));
    parts.push(keep(g));
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  mesh.name = 'reef-rocks'; mesh.receiveShadow = true; return mesh;
}

/** sea grass in clumps: clumps = [[x, y, z, h]]; one mesh whose blades sway with the swell (uT: a uniform in seconds) */
export function seaGrass(clumps, { uT, seed = 3, blades = 7, colors = [0x2f6f66, 0x3d8a6c, 0x285e5a, 0x4f9468], width = 0.03, sway = 0.1 } = {}) {
  const R = rng(seed), pos = [], col = [], up = [], idx = [], SEG = 7;
  for (const [x, y, z, h] of clumps) {
    const nb = blades + Math.floor(R() * 4);
    for (let b = 0; b < nb; b++) {
      const a = R() * TAU, lean = 0.12 + R() * 0.38, hh = h * (0.5 + R() * 0.65), w = width * (0.7 + R() * 0.7), twist = (R() - 0.5) * 1.2;
      const ox = x + Math.cos(a) * R() * 0.09, oz = z + Math.sin(a) * R() * 0.09, dx = Math.cos(a), dz = Math.sin(a);
      _c.setHex(colors[Math.floor(R() * colors.length)]); const base = pos.length / 3;
      for (let s = 0; s <= SEG; s++) {
        const u = s / SEG, bend = lean * u * u * hh, tw = a + 1.57 + twist * u, ww = w * (1 - u * 0.8), cx = ox + dx * bend, cz = oz + dz * bend, yy = y + hh * u;
        for (const side of [-1, 1]) {
          pos.push(cx + Math.cos(tw) * ww * side, yy, cz + Math.sin(tw) * ww * side);
          const k = 0.55 + 0.45 * u; col.push(_c.r * k, _c.g * k, _c.b * k); up.push(u);
        }
        if (s < SEG) { const i = base + s * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aUp', new THREE.Float32BufferAttribute(up, 1));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uT;
    sh.vertexShader = 'uniform float uT;\nattribute float aUp;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      { float s = aUp * aUp * ${sway.toFixed(3)}; vec3 w = (modelMatrix * vec4(position, 1.0)).xyz;
        transformed.x += (sin(uT * 1.15 + w.x * 0.8 + w.z * 0.35) + 0.4 * sin(uT * 2.3 + w.z * 1.7)) * s;
        transformed.z += (cos(uT * 0.9 + w.z * 0.7 + w.x * 0.2)) * s * 0.7; }`);
  };
  m.customProgramCacheKey = () => `seagrass${sway.toFixed(3)}`;
  const mesh = new THREE.Mesh(g, m); mesh.name = 'sea-grass'; mesh.frustumCulled = false; return mesh;
}

/** sponges and corals in muted colours: list = [[x, y, z, kind, size]], kind 'tube' | 'brain' | 'branch' */
export function softCorals(list, { seed = 7 } = {}) {
  const R = rng(seed), parts = [];
  const TUBE = [0xc8743a, 0x9a5fb0, 0xd09a3a, 0xb8604e], BRAIN = [0x9c9763, 0x8d9a6e, 0xa88f66], BRANCH = [0xc49a7a, 0xb88aa0, 0xcfae84];
  for (const [x, y, z, kind, size = 1] of list) {
    if (kind === 'tube') {
      const n = 3 + Math.floor(R() * 3), hex = TUBE[Math.floor(R() * TUBE.length)];
      for (let k = 0; k < n; k++) {
        const r = (0.05 + R() * 0.035) * size, h = (0.12 + R() * 0.2) * size, a = R() * TAU, d = R() * 0.1 * size;
        const g = new THREE.CylinderGeometry(r * 1.45, r * 0.75, h, 12, 3, true); g.translate(0, h / 2, 0);
        paint(g, hex, 0.18, h); place(g, x + Math.cos(a) * d, y, z + Math.sin(a) * d, 0, 1, 1, 1, (R() - 0.5) * 0.4, (R() - 0.5) * 0.4); parts.push(keep(g));
      }
    } else if (kind === 'brain') {
      const g = new THREE.SphereGeometry(1, 22, 12, 0, TAU, 0, Math.PI / 2), P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const px = P.getX(i), py = P.getY(i), pz = P.getZ(i), n = 1 + 0.05 * Math.sin(px * 22 + Math.sin(pz * 9) * 2) * Math.sin(pz * 19); P.setXYZ(i, px * n, py * n, pz * n); }
      g.computeVertexNormals(); paint(g, BRAIN[Math.floor(R() * BRAIN.length)], 0.12, 1);
      place(g, x, y - 0.02, z, R() * TAU, 0.22 * size, 0.16 * size, 0.2 * size); parts.push(keep(g));
    } else {
      const hex = BRANCH[Math.floor(R() * BRANCH.length)];
      const grow = (x0, y0, z0, dir, len, r, depth) => {
        const g = new THREE.CylinderGeometry(r * 0.7, r, len, 6, 1, false); g.translate(0, len / 2, 0); paint(g, hex, 0.15, len);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        g.applyQuaternion(q); g.translate(x0, y0, z0); parts.push(keep(g));
        if (depth <= 0) return;
        const ex = x0 + dir.x * len, ey = y0 + dir.y * len, ez = z0 + dir.z * len;
        for (let k = 0; k < 2 + (depth > 1 ? 1 : 0); k++) {
          const a = R() * TAU, nd = dir.clone().add(new THREE.Vector3(Math.cos(a) * 0.55, 0.15, Math.sin(a) * 0.55)).normalize();
          grow(ex, ey, ez, nd, len * (0.62 + R() * 0.2), r * 0.72, depth - 1);
        }
      };
      grow(x, y, z, new THREE.Vector3(0, 1, 0), 0.16 * size, 0.035 * size, 2);
    }
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }));
  mesh.name = 'soft-corals'; return mesh;
}

/** the moving net of sunlight on a sea floor, tiled (draw it with additive blending and scroll its offset) */
let caustic = null;
export function causticTexture() {
  if (caustic) return caustic;
  const S = 160, R = rng(41), pts = [];
  for (let i = 0; i < 22; i++) pts.push([R() * S, R() * S]);
  caustic = canvasTex(S, S, (g) => {
    const img = g.createImageData(S, S), D = img.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let f1 = 1e9, f2 = 1e9; const wx = x + 5 * Math.sin((TAU * 2 * y) / S) + 3 * Math.sin((TAU * 3 * (x + y)) / S), wy = y + 5 * Math.sin((TAU * 2 * x) / S) + 3 * Math.cos((TAU * 3 * (x - y)) / S);
      for (const [px, py] of pts) { let dx = Math.abs(((wx - px) % S + S) % S), dy = Math.abs(((wy - py) % S + S) % S); if (dx > S / 2) dx = S - dx; if (dy > S / 2) dy = S - dy; const d = dx * dx + dy * dy; if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
      const e = Math.sqrt(f2) - Math.sqrt(f1), v = Math.pow(Math.max(0, 1 - e / 3.2), 2.6), k = (y * S + x) * 4;
      D[k] = 205 * v; D[k + 1] = 240 * v; D[k + 2] = 255 * v; D[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  return caustic;
}
