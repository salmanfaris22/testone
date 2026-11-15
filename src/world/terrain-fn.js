// One definition of the coastline, used by the terrain mesh (JS) and the sea shader (GLSL).
// Ground level is y = 0, the sea surface sits at SEA_Y.
// The site is a peninsula: a straight rock-armoured south shore, a diagonal sandy north-east shore
// and a rounded tip at the east end. The land carries on to the west.
import { COAST, LANDLINE } from './layout.js';

export const SEA_Y = -2.2;
const L = { s: LANDLINE.south, e: LANDLINE.east, k: LANDLINE.round, ...COAST };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };

const dS = (x, z) => z - L.s, dE = (x, z) => x - L.e, dN = (x, z) => (x - L.px) * L.nx + (z - L.pz) * L.nz;
/** signed distance to the shore line: negative on land */
export function landSDF(x, z) { return smax(smax(dS(x, z), dE(x, z), L.k), dN(x, z), L.k); }
/** 1 where the shore is beach (north-east and the tip), 0 where it is rock armour (south) */
export function beachiness(x, z) { return 1 - sstep(-34, 4, dS(x, z) - Math.max(dN(x, z), dE(x, z))); }
/** terrain height (0 on the platform, negative towards the seabed) */
export function terrainH(x, z) {
  const d = landSDF(x, z), b = beachiness(x, z);
  const rev = -7.2 * sstep(-2, 12, d) - 10 * sstep(15, 90, d);
  const bea = -3.3 * sstep(-21, 9, d) - 4.2 * sstep(9, 70, d) - 9.5 * sstep(70, 230, d);
  return rev + (bea - rev) * b;
}

const f = (v) => v.toFixed(3);
export const TERRAIN_GLSL = /* glsl */ `
const float SEA_Y = ${SEA_Y.toFixed(2)};
float smaxK(float a, float b, float k){ float h = max(k - abs(a - b), 0.0) / k; return max(a, b) + h * h * k * 0.25; }
float tdS(vec2 p){ return p.y - ${f(L.s)}; }
float tdE(vec2 p){ return p.x - ${f(L.e)}; }
float tdN(vec2 p){ return (p.x - ${f(L.px)}) * ${f(L.nx)} + (p.y - ${f(L.pz)}) * ${f(L.nz)}; }
float landSDF(vec2 p){ return smaxK(smaxK(tdS(p), tdE(p), ${f(L.k)}), tdN(p), ${f(L.k)}); }
float beachiness(vec2 p){ return 1.0 - smoothstep(-34.0, 4.0, tdS(p) - max(tdN(p), tdE(p))); }
float terrainH(vec2 p){
  float d = landSDF(p), b = beachiness(p);
  float rev = -7.2 * smoothstep(-2.0, 12.0, d) - 10.0 * smoothstep(15.0, 90.0, d);
  float bea = -3.3 * smoothstep(-21.0, 9.0, d) - 4.2 * smoothstep(9.0, 70.0, d) - 9.5 * smoothstep(70.0, 230.0, d);
  return mix(rev, bea, b);
}
`;
