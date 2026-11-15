// One definition of the coastline, used by the terrain mesh (JS) and the sea shader (GLSL).
// Ground level is y = 0, the sea surface sits at SEA_Y.
export const SEA_Y = -2.2;
export const LAND = { cx: -35, cz: 26, hx: 252, hz: 206, r: 46, mainZ: 262, blend: 80 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function landSDF(x, z) {
  const L = LAND;
  const qx = Math.abs(x - L.cx) - L.hx + L.r, qz = Math.abs(z - L.cz) - L.hz + L.r;
  const d1 = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - L.r;
  const d2 = L.mainZ - z;
  const h = clamp(0.5 + (0.5 * (d2 - d1)) / L.blend, 0, 1);
  return d2 + (d1 - d2) * h - L.blend * h * (1 - h);
}
export function beachiness(x, z) {
  const west = sstep(-150, -250, x);
  const main = sstep(170, 250, z);
  return Math.max(west, main);
}
/** terrain height (0 on the platform, negative towards the seabed) */
export function terrainH(x, z) {
  const d = landSDF(x, z), b = beachiness(x, z);
  const rev = -7.2 * sstep(-2, 12, d) - 10 * sstep(15, 90, d);
  const bea = -5.7 * sstep(-46, 60, d) - 10 * sstep(60, 160, d);
  return rev + (bea - rev) * b;
}

export const TERRAIN_GLSL = /* glsl */ `
const float SEA_Y = ${SEA_Y.toFixed(2)};
float landSDF(vec2 p){
  vec2 q = abs(p - vec2(${LAND.cx.toFixed(1)}, ${LAND.cz.toFixed(1)})) - vec2(${LAND.hx.toFixed(1)}, ${LAND.hz.toFixed(1)}) + ${LAND.r.toFixed(1)};
  float d1 = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - ${LAND.r.toFixed(1)};
  float d2 = ${LAND.mainZ.toFixed(1)} - p.y;
  float h = clamp(0.5 + 0.5 * (d2 - d1) / ${LAND.blend.toFixed(1)}, 0.0, 1.0);
  return mix(d2, d1, h) - ${LAND.blend.toFixed(1)} * h * (1.0 - h);
}
float beachiness(vec2 p){
  return max(1.0 - smoothstep(-250.0, -150.0, p.x), smoothstep(170.0, 250.0, p.y));
}
float terrainH(vec2 p){
  float d = landSDF(p), b = beachiness(p);
  float rev = -7.2 * smoothstep(-2.0, 12.0, d) - 10.0 * smoothstep(15.0, 90.0, d);
  float bea = -5.7 * smoothstep(-46.0, 60.0, d) - 10.0 * smoothstep(60.0, 160.0, d);
  return mix(rev, bea, b);
}
`;
