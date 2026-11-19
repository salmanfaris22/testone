// A twin-engine helicopter parked on the helipad, made in code like the rest of the site: a white fuselage lofted through
// cross-sections from the nose to the end of the tail boom, its livery (a teal and a light-blue stripe, tinted glass, the door
// lines) painted on one canvas, an engine cowling on the roof, five main-rotor blades at rest and drooping a little, a four-blade
// tail rotor on the fin, a stabiliser with end plates, skids, and a red beacon. About 13.5 m long, 14.8 m with the rotors: inside
// the pad's D-value of 16 m. Local frame: nose to +x, up +y, right +z, skids on y = 0; the main rotor turns over x = MAST.
import * as THREE from 'three';
import { Builder, canvasTex, roundRect, TAU } from './kit.js';

/** the fuselage, nose to tail: [x, half width, top, bottom, squareness of the section] */
const ST = [
  [6.3, 0.06, 1.55, 1.25, 2], [6.02, 0.46, 1.9, 1.02, 2.2], [5.45, 0.8, 2.24, 0.92, 2.5], [4.65, 1.0, 2.56, 0.88, 2.8], [3.6, 1.08, 2.74, 0.87, 3],
  [2.2, 1.1, 2.8, 0.87, 3.1], [0.4, 1.1, 2.8, 0.88, 3.1], [-0.9, 1.04, 2.76, 0.98, 3], [-1.7, 0.84, 2.7, 1.3, 2.6], [-2.5, 0.55, 2.62, 1.85, 2.2],
  [-3.2, 0.38, 2.58, 2.12, 2], [-4.6, 0.3, 2.6, 2.2, 2], [-6.0, 0.23, 2.63, 2.27, 2], [-6.9, 0.17, 2.65, 2.33, 2], [-7.15, 0.04, 2.55, 2.43, 2],
];
const X0 = ST[0][0], LEN = ST[0][0] - ST[ST.length - 1][0];
const MAST = 0.9, HUB_Y = 3.62, BLADE = 6.2;
const DEG = Math.PI / 180;

/** Catmull-Rom through the stations, column by column, `per` steps between each pair */
function stations(per = 5) {
  const out = [], n = ST.length, col = (i, k) => ST[Math.max(0, Math.min(n - 1, i))][k];
  for (let i = 0; i < n - 1; i++) for (let s = 0; s < per; s++) {
    const t = s / per, t2 = t * t, t3 = t2 * t, row = [];
    for (let k = 0; k < 5; k++) { const p0 = col(i - 1, k), p1 = col(i, k), p2 = col(i + 1, k), p3 = col(i + 2, k); row.push(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)); }
    out.push(row);
  }
  out.push(ST[n - 1].slice());
  return out;
}

/** the lofted body: rings of M points round each station (the seam along the belly), closed at both ends */
function fuselage(M = 44) {
  const rows = stations(), pos = [], uv = [], idx = [];
  for (const [x, w, yt, yb, n] of rows) {
    const yc = (yt + yb) / 2, hh = (yt - yb) / 2, e = 2 / n;
    for (let j = 0; j <= M; j++) {
      const th = -Math.PI / 2 + (j / M) * TAU, c = Math.cos(th), s = Math.sin(th);
      pos.push(x, yc + hh * Math.sign(s) * Math.abs(s) ** e, w * Math.sign(c) * Math.abs(c) ** e);
      uv.push((X0 - x) / LEN, j / M);
    }
  }
  const R = M + 1;
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < M; j++) { const a = i * R + j, b = a + R; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  // the nose and the tail end: a fan to the middle of each end ring
  for (const [i, flip] of [[0, true], [rows.length - 1, false]]) {
    const [x, , yt, yb] = rows[i], c = pos.length / 3; pos.push(x + (flip ? 0.03 : -0.03), (yt + yb) / 2, 0); uv.push((X0 - x) / LEN, 0.5);
    for (let j = 0; j < M; j++) { const a = i * R + j; if (flip) idx.push(c, a + 1, a); else idx.push(c, a, a + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** the livery, painted in the body's own (x along it, angle round it) coordinates */
function livery(W) {
  const H = W / 4;
  return canvasTex(W, H, (g) => {
    const u = (x) => ((X0 - x) / LEN) * W, v = (deg) => (((deg + 90) / 360) * H);
    const rect = (x0, x1, a0, a1, r = 0) => { const L = u(Math.max(x0, x1)), Rr = u(Math.min(x0, x1)), T = v(Math.min(a0, a1)), B = v(Math.max(a0, a1)); g.beginPath(); g.roundRect(L, T, Rr - L, B - T, r); };
    const both = (fn) => { fn(1); fn(-1); };            // right side angles a, the left side's 180 - a
    const side = (a, k) => (k > 0 ? a : 180 - a);
    // white paint, the belly a cooler grey
    g.fillStyle = '#f3f5f6'; g.fillRect(0, 0, W, H);
    const bel = g.createLinearGradient(0, 0, 0, H); bel.addColorStop(0, '#c7cdd1'); bel.addColorStop(0.1, '#dfe3e5'); bel.addColorStop(0.16, 'rgba(243,245,246,0)'); bel.addColorStop(0.84, 'rgba(243,245,246,0)'); bel.addColorStop(0.9, '#dfe3e5'); bel.addColorStop(1, '#c7cdd1');
    g.fillStyle = bel; g.fillRect(0, 0, W, H);
    // the stripes along each side, from the nose back along the boom
    both((k) => { g.fillStyle = '#0e6e7e'; rect(5.75, -6.95, side(-21, k), side(-12.5, k)); g.fill(); g.fillStyle = '#5bc0eb'; rect(5.6, -6.95, side(-10.5, k), side(-8, k)); g.fill(); });
    // tinted glass: a dark blue-grey, lighter at the top where it takes the sky
    const glass = (x0, x1, a0, a1, r) => { rect(x0, x1, a0, a1, r); const gr = g.createLinearGradient(0, v(Math.min(a0, a1)), 0, v(Math.max(a0, a1))); gr.addColorStop(0, '#16242e'); gr.addColorStop(1, '#2f4b5c'); g.fillStyle = gr; g.fill(); };
    // the windscreen over the nose, split down the middle, and the chin windows under it
    g.save(); g.beginPath(); g.moveTo(u(5.92), v(30)); g.lineTo(u(4.52), v(17)); g.lineTo(u(4.52), v(163)); g.lineTo(u(5.92), v(150)); g.closePath();
    { const gr = g.createLinearGradient(u(5.92), 0, u(4.52), 0); gr.addColorStop(0, '#2c4757'); gr.addColorStop(1, '#13202a'); g.fillStyle = gr; g.fill(); } g.restore();
    g.fillStyle = '#e9eced'; g.fillRect(u(5.95), v(89), u(4.5) - u(5.95), v(91) - v(89));
    both((k) => glass(5.98, 5.5, side(-27, k), side(-9, k), H * 0.01));
    // the cockpit doors and the cabin's three windows a side
    both((k) => glass(4.45, 3.3, side(6, k), side(38, k), H * 0.012));
    for (const [a, b] of [[2.55, 1.72], [1.45, 0.62], [0.35, -0.48]]) both((k) => glass(a, b, side(7, k), side(31, k), H * 0.02));
    // door lines: the cockpit doors and the big sliding cabin door
    g.strokeStyle = 'rgba(70,82,90,.45)'; g.lineWidth = Math.max(1, W / 1024);
    both((k) => { rect(4.55, 3.18, side(-26, k), side(41, k), H * 0.012); g.stroke(); rect(2.75, -0.62, side(-25, k), side(36, k), H * 0.015); g.stroke(); });
    // a walkway line on the roof and a dark anti-glare patch ahead of the windscreen
    g.fillStyle = 'rgba(40,48,54,.85)'; g.beginPath(); g.ellipse(u(6.08), v(90), u(5.94) - u(6.2), v(118) - v(90), 0, 0, TAU); g.fill();
  }, { repeat: false });
}

/** the helicopter, as a group (nose to +x) */
export function makeHelicopter(mats, { tier = 'high' } = {}) {
  const root = new THREE.Group(); root.name = 'helicopter';
  const tex = livery(tier === 'high' ? 2048 : 1024); tex.flipY = false;           // (painted row by row as v runs, top row first)
  const paint = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.32, metalness: 0.05 });
  const body = new THREE.Mesh(fuselage(), paint); body.castShadow = true; body.receiveShadow = true; root.add(body);

  const b = new Builder(), WHITE = 0xf1f3f4, DARK = 0x2b3035, STEEL = 0x9aa3a9, GREY = 0x5a6268;
  // the engine cowling on the roof, the gearbox fairing over it, the intakes and the exhausts
  b.use('satin').prism(WHITE, roundRect(-1.65, -0.74, 2.9, 0.74, 0.42), 2.66, 3.2);
  b.prism(WHITE, roundRect(0.1, -0.5, 1.75, 0.5, 0.36), 3.2, 3.32);
  b.use('matte'); for (const k of [1, -1]) { b.box(DARK, 0.42, 0.24, 0.05, 2.35, 2.82, k * 0.745); b.box(GREY, 0.36, 0.06, 0.05, -1.25, 2.95, k * 0.745); }
  b.use('metal'); for (const k of [1, -1]) b.rod(DARK, 0.13, [-1.3, 3.0, k * 0.5], [-2.05, 3.05, k * 0.78], 14);
  // the main rotor: the mast, the hub and five blades at rest, each drooping a little to its tip, the tips banded
  b.cyl(GREY, 0.14, 0.32, MAST, 3.3, 0, 16); b.cyl(DARK, 0.34, 0.2, MAST, HUB_Y - 0.1, 0, 20);
  const droop = -0.035;
  for (let k = 0; k < 5; k++) {
    const a = 0.31 + (k * TAU) / 5, mid = 0.35 + (BLADE - 0.35) / 2, c = Math.cos(a), s = -Math.sin(a), dy = Math.sin(droop) * mid;
    b.use('satin').box(DARK, BLADE - 0.35, 0.065, 0.46, MAST + c * mid, HUB_Y - 0.03 + dy - 0.0325, s * mid, a, 0, droop);
    const tip = BLADE - 0.25, ty = Math.sin(droop) * tip; b.box(0xe9b21a, 0.3, 0.068, 0.465, MAST + c * tip, HUB_Y - 0.03 + ty - 0.034, s * tip, a, 0, droop);
  }
  // the tail: the fin (a swept board), the stabiliser on the boom with its end plates, the tail rotor on the fin's left
  const fin = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  b.pushM(fin); b.use('satin').prism(WHITE, [[-6.05, 2.45], [-7.2, 2.45], [-7.45, 3.95], [-6.95, 3.98]], -0.055, 0.055); b.pop();
  b.prism(WHITE, roundRect(-6.0, -1.18, -5.42, 1.18, 0.12), 2.47, 2.53);
  for (const k of [1, -1]) b.box(WHITE, 0.52, 0.44, 0.05, -5.72, 2.28, k * 1.19);
  { const hub = [-6.95, 3.49]; b.use('metal').rod(GREY, 0.045, [hub[0], hub[1], -0.05], [hub[0], hub[1], -0.3], 10); b.ball(GREY, 0.085, hub[0], hub[1], -0.31, 10, 8);
    for (let k = 0; k < 4; k++) { const a = 0.4 + (k * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a); b.use('satin').box(DARK, 1.0, 0.17, 0.035, hub[0] + c * 0.58, hub[1] + s * 0.58 - 0.085, -0.3, 0, 0, a); } }
  // the skids and their cross tubes
  b.use('metal');
  for (const k of [1, -1]) {
    b.pipe(STEEL, 0.055, [[-2.3, 0.06, k * 1.25], [3.3, 0.06, k * 1.25], [3.72, 0.15, k * 1.25], [3.98, 0.36, k * 1.25]], 10);
    for (const x of [2.4, -0.9]) b.pipe(STEEL, 0.06, [[x, 0.06, k * 1.25], [x, 0.5, k * 1.13], [x, 0.84, k * 0.74]], 10);
    b.box(GREY, 0.55, 0.04, 0.22, 1.0, 0.36, k * 1.18);        // the step under the cabin door
  }
  // lights: the red beacon on the fin and on the belly, the navigation lights at the stabiliser tips
  b.use('glow').ball(0xff4433, 0.075, -7.0, 4.02, 0, 10, 8); b.ball(0xff4433, 0.07, 1.2, 0.84, 0, 10, 8);
  b.ball(0x33dd66, 0.05, -5.72, 2.5, 1.22, 8, 6); b.ball(0xff3b30, 0.05, -5.72, 2.5, -1.22, 8, 6);
  root.add(b.build(mats, { name: 'helicopter-parts' }));
  return root;
}
