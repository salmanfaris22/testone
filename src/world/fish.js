// Procedural fish. Each species has its own body profile, fins and painted skin, so a Hamour
// reads as a Hamour. Schools are instanced and swim entirely on the GPU.
import * as THREE from 'three';
import { canvasTex, rng, TAU, clamp } from './kit.js';

const VF = 0.3125;              // the skin canvas covers ±VF body lengths vertically
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const env = (t, a, b) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, a))), b);

/* body: hT/hB = back and belly height, a = where the body is deepest (<1 = further forward),
   bT/bB = bluntness, w = half width, p = tail stalk, tail = fin shape. All in body lengths. */
export const FISH = {
  hamour: { hT: 0.132, hB: 0.122, a: 0.8, bT: 0.6, bB: 0.72, w: 0.09, p: 0.044, tail: 'round', tl: 0.17, th: 0.14, dorsal: [0.3, 0.9, 0.072, 1], anal: [0.64, 0.86, 0.058], eye: [0.105, 0.5],
    c: { back: '#6d5d45', side: '#b9a47b', belly: '#eee4cb', fin: '#8b7655', finTip: '#5d4d38' }, skin: 'hamour' },
  hamra: { hT: 0.19, hB: 0.15, a: 0.62, bT: 0.7, bB: 0.8, w: 0.074, p: 0.04, tail: 'trunc', tl: 0.17, th: 0.17, dorsal: [0.3, 0.88, 0.085, 1], anal: [0.64, 0.84, 0.07], eye: [0.125, 0.42],
    c: { back: '#c0443a', side: '#e36a5c', belly: '#f6d3ca', fin: '#d9584c', finTip: '#a8362f' }, skin: 'scales' },
  shiqra: { hT: 0.158, hB: 0.132, a: 0.68, bT: 0.68, bB: 0.78, w: 0.078, p: 0.042, tail: 'notch', tl: 0.17, th: 0.155, dorsal: [0.3, 0.88, 0.075, 1], anal: [0.64, 0.84, 0.062], eye: [0.12, 0.44],
    c: { back: '#6b5644', side: '#a96f52', belly: '#e0c1ab', fin: '#7d4a3c', finTip: '#55322a' }, skin: 'shiqra' },
  shaari: { hT: 0.168, hB: 0.14, a: 0.74, bT: 0.9, bB: 0.86, w: 0.07, p: 0.036, tail: 'fork', tl: 0.19, th: 0.2, dorsal: [0.33, 0.88, 0.07, 1], anal: [0.66, 0.84, 0.058], eye: [0.19, 0.5],
    c: { back: '#8b8757', side: '#cfc089', belly: '#f2ebd4', fin: '#d9c69a', finTip: '#c58f7a' }, skin: 'shaari' },
  seabream: { hT: 0.2, hB: 0.172, a: 0.62, bT: 0.72, bB: 0.8, w: 0.06, p: 0.036, tail: 'fork', tl: 0.19, th: 0.2, dorsal: [0.3, 0.88, 0.07, 1], anal: [0.66, 0.84, 0.055], eye: [0.12, 0.42],
    c: { back: '#66757f', side: '#c6d0d6', belly: '#f4f6f6', fin: '#8d99a1', finTip: '#39444b' }, skin: 'lines' },
  mullet: { hT: 0.1, hB: 0.1, a: 0.8, bT: 0.7, bB: 0.75, w: 0.075, p: 0.04, tail: 'fork', tl: 0.18, th: 0.15, dorsal: [0.58, 0.8, 0.06, 0], anal: [0.64, 0.8, 0.05], eye: [0.07, 0.4],
    c: { back: '#58686f', side: '#b8c4c8', belly: '#f1f3f1', fin: '#8b9aa0', finTip: '#5b6a70' }, skin: 'lines' },
  cobia: { hT: 0.082, hB: 0.078, a: 0.84, bT: 0.6, bB: 0.66, w: 0.07, p: 0.03, tail: 'lunate', tl: 0.19, th: 0.19, dorsal: [0.46, 0.9, 0.07, 0], anal: [0.6, 0.88, 0.055], eye: [0.07, 0.3],
    c: { back: '#3d3630', side: '#6a5d50', belly: '#ece7dc', fin: '#3a332e', finTip: '#231f1c' }, skin: 'cobia' },
  naisrah: { hT: 0.17, hB: 0.15, a: 0.66, bT: 0.74, bB: 0.8, w: 0.064, p: 0.036, tail: 'fork', tl: 0.18, th: 0.18, dorsal: [0.3, 0.88, 0.07, 1], anal: [0.66, 0.84, 0.055], eye: [0.12, 0.42],
    c: { back: '#7c8791', side: '#d0d6d8', belly: '#f6f6f2', fin: '#d6c98a', finTip: '#a99a55' }, skin: 'plain' },
  ummdrais: { hT: 0.205, hB: 0.165, a: 0.6, bT: 0.72, bB: 0.8, w: 0.074, p: 0.04, tail: 'notch', tl: 0.17, th: 0.17, dorsal: [0.3, 0.88, 0.085, 1], anal: [0.64, 0.84, 0.07], eye: [0.125, 0.42],
    c: { back: '#b53d38', side: '#dd6457', belly: '#f3cdc3', fin: '#cf5045', finTip: '#9d302b' }, skin: 'scales' },
};
export const MIX = ['hamour', 'shaari', 'hamra', 'seabream', 'shiqra', 'hamra', 'shaari'];

/* Seven species wear photographs of the real fish: three are the client's own pictures, four are free-licence photographs
   (credits in public/fish/CREDITS.md). The picture is cut out (tools/fishcut.py), laid on the mid-plane for the fins,
   and wrapped round a body lofted from the outline measured off the same picture: x = share of the length from
   the snout, then the back and the belly line, in body lengths above the picture's centre line. */
export const PHOTO = {
  hamour: { src: 'fish/hamour.webp', aspect: 0.4422, wr: 0.6,
    env: [[0.012, -0.012, -0.03], [0.03, 0.022, -0.045], [0.06, 0.04, -0.062], [0.1, 0.053, -0.08], [0.15, 0.073, -0.09], [0.2, 0.09, -0.099], [0.25, 0.099, -0.106], [0.3, 0.104, -0.111], [0.4, 0.106, -0.112], [0.5, 0.104, -0.111], [0.6, 0.094, -0.1], [0.7, 0.07, -0.078], [0.75, 0.052, -0.064], [0.8, 0.03, -0.052], [0.83, 0.024, -0.046]] },
  shiqra: { src: 'fish/shiqra.webp', aspect: 0.4125, wr: 0.44,
    env: [[0.012, -0.06, -0.082], [0.04, -0.01, -0.1], [0.1, 0.038, -0.122], [0.2, 0.097, -0.149], [0.3, 0.124, -0.169], [0.4, 0.13, -0.178], [0.5, 0.116, -0.175], [0.6, 0.089, -0.161], [0.7, 0.046, -0.122], [0.75, 0.023, -0.098], [0.8, 0.0, -0.076], [0.83, -0.006, -0.07]] },
  hamra: { src: 'fish/hamra.webp', aspect: 0.4203, wr: 0.42,
    env: [[0.014, -0.02, -0.045], [0.05, 0.04, -0.06], [0.1, 0.066, -0.083], [0.2, 0.116, -0.11], [0.3, 0.155, -0.134], [0.4, 0.167, -0.148], [0.5, 0.162, -0.151], [0.6, 0.128, -0.141], [0.7, 0.07, -0.118], [0.75, 0.034, -0.092], [0.79, 0.012, -0.086], [0.82, 0.006, -0.08]] },
  shaari: { src: 'fish/shaari.webp', aspect: 0.4016, wr: 0.42,
    env: [[0.012, -0.014, -0.05], [0.05, 0.017, -0.06], [0.1, 0.056, -0.07], [0.15, 0.103, -0.086], [0.2, 0.14, -0.1], [0.25, 0.155, -0.112], [0.3, 0.162, -0.12], [0.4, 0.158, -0.131], [0.5, 0.142, -0.135], [0.6, 0.115, -0.126], [0.7, 0.072, -0.1], [0.75, 0.048, -0.069], [0.8, 0.033, -0.053], [0.83, 0.03, -0.055]] },
  seabream: { src: 'fish/seabream.webp', aspect: 0.4938, wr: 0.38,
    env: [[0.012, 0.02, -0.027], [0.05, 0.059, -0.046], [0.1, 0.09, -0.07], [0.15, 0.114, -0.085], [0.2, 0.131, -0.097], [0.3, 0.147, -0.109], [0.4, 0.149, -0.12], [0.5, 0.141, -0.13], [0.6, 0.122, -0.127], [0.7, 0.063, -0.077], [0.75, 0.052, -0.059], [0.8, 0.042, -0.048], [0.83, 0.04, -0.046]] },
  mullet: { src: 'fish/mullet.webp', aspect: 0.2516, wr: 0.8,
    env: [[0.012, 0.01, -0.024], [0.05, 0.027, -0.045], [0.1, 0.042, -0.062], [0.2, 0.07, -0.078], [0.3, 0.085, -0.088], [0.4, 0.092, -0.09], [0.5, 0.093, -0.09], [0.6, 0.087, -0.085], [0.7, 0.07, -0.07], [0.75, 0.05, -0.052], [0.8, 0.035, -0.042], [0.83, 0.03, -0.036]] },
  cobia: { src: 'fish/cobia.webp', aspect: 0.3297, wr: 0.82,
    env: [[0.012, 0.016, -0.013], [0.05, 0.03, -0.023], [0.1, 0.046, -0.032], [0.2, 0.065, -0.05], [0.3, 0.077, -0.06], [0.4, 0.087, -0.06], [0.5, 0.075, -0.054], [0.6, 0.059, -0.045], [0.7, 0.041, -0.03], [0.75, 0.034, -0.023], [0.8, 0.026, -0.016], [0.83, 0.024, -0.013]] },
};
export function photoGeometry(id, nx = 14, nr = 8) {
  const S = PHOTO[id], E = S.env, pos = [], uv = [], idx = [], A = S.aspect;
  const at = (x) => { let i = 0; while (i < E.length - 2 && x > E[i + 1][0]) i++; const a = E[i], b = E[i + 1], k = clamp((x - a[0]) / (b[0] - a[0]), 0, 1), q = k * k * (3 - 2 * k) * 0.35 + k * 0.65; return [a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q]; };
  const x0 = E[0][0], x1 = E[E.length - 1][0]; let hmax = 0; for (const e of E) hmax = Math.max(hmax, (e[1] - e[2]) / 2);
  const push = (x, y, z) => { pos.push(x, y, z); uv.push(0.5 - x, 0.5 + y / A); return pos.length / 3 - 1; };
  // body
  for (let i = 0; i <= nx; i++) {
    const t = i / nx, xs = x0 + (x1 - x0) * Math.pow(t, 1.1), [tp, bt] = at(xs), c = (tp + bt) / 2, hh = Math.max(0.002, (tp - bt) / 2);
    const w = Math.max(0.004, hmax * S.wr * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.62) * (0.55 + 0.45 * hh / hmax)) + 0.006 * (1 - Math.abs(2 * t - 1));
    for (let j = 0; j < nr; j++) { const a = (j / nr) * TAU, sn = Math.sin(a), cs = Math.cos(a); push(0.5 - xs, c + hh * Math.sign(sn) * Math.pow(Math.abs(sn), 0.84), w * Math.sign(cs) * Math.pow(Math.abs(cs), 0.8)); }
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nr; j++) { const a = i * nr + j, b = i * nr + ((j + 1) % nr), c = a + nr, d = b + nr; idx.push(a, b, c, b, d, c); }
  const body = (nx + 1) * nr;
  // the picture on the mid-plane: fins, tail and the outline of the head
  const nc = Math.max(8, Math.round(nx * 1.4));
  for (let i = 0; i <= nc; i++) { const x = 0.5 - i / nc; push(x, A / 2, 0); push(x, -A / 2, 0); }
  for (let i = 0; i < nc; i++) { const a = body + i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2)); g.setIndex(idx);
  g.computeVertexNormals();
  const n = g.attributes.normal;
  for (let i = 0; i < body; i++) { const st = Math.floor(i / nr), cy = (pos[st * nr * 3 + 1] + pos[(st * nr + nr / 2) * 3 + 1]) / 2, y = pos[i * 3 + 1] - cy, z = pos[i * 3 + 2]; if (n.getY(i) * y + n.getZ(i) * z < 0) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); }
  for (let i = body; i < pos.length / 3; i++) n.setXYZ(i, 0, 0, 1);
  return g;
}

const prof = (s) => {
  const bf = 1 - s.tl;
  return {
    bf,
    top: (t) => s.hT * env(t, s.a, s.bT) + s.p * sm(0.62, 1, t),
    bot: (t) => s.hB * env(t, s.a * 0.94, s.bB) + s.p * sm(0.62, 1, t),
    wid: (t) => s.w * env(t, s.a * 1.08, 0.68) + 0.011 * sm(0.6, 1, t),
    x: (t) => 0.5 - t * bf,
  };
};
function tailOutline(s, xp) {
  const p = s.p, L = s.tl, H = s.th, xt = xp - L, o = [[xp + 0.01, p]];
  if (s.tail === 'round') for (let i = 0; i <= 12; i++) { const a = (-1 + (2 * i) / 12) * 1.25; o.push([xp - L * (0.42 + 0.58 * Math.cos(a * 0.9)), -Math.sin(a) * H * 0.98]); }
  else if (s.tail === 'trunc') o.push([xp - L * 0.55, H * 0.82], [xt, H], [xt + L * 0.06, H * 0.45], [xt + L * 0.09, 0], [xt + L * 0.06, -H * 0.45], [xt, -H], [xp - L * 0.55, -H * 0.82]);
  else if (s.tail === 'notch') o.push([xp - L * 0.5, H * 0.74], [xt, H], [xt + L * 0.12, H * 0.42], [xt + L * 0.2, 0], [xt + L * 0.12, -H * 0.42], [xt, -H], [xp - L * 0.5, -H * 0.74]);
  else if (s.tail === 'fork') o.push([xp - L * 0.42, H * 0.56], [xt, H], [xt + L * 0.2, H * 0.34], [xt + L * 0.46, 0], [xt + L * 0.2, -H * 0.34], [xt, -H], [xp - L * 0.42, -H * 0.56]);
  else o.push([xp - L * 0.3, H * 0.5], [xt - L * 0.04, H], [xt + L * 0.24, H * 0.36], [xt + L * 0.56, 0], [xt + L * 0.24, -H * 0.36], [xt - L * 0.04, -H], [xp - L * 0.3, -H * 0.5]);
  o.push([xp + 0.01, -p]);
  return o;
}
const finH = (s, k, spiny) => Math.pow(Math.sin(Math.PI * clamp(k, 0.02, 0.98)), 0.55) * (spiny ? 1 - 0.22 * sm(0.3, 0.55, k) * (1 - sm(0.55, 0.75, k)) : 1);

export function fishGeometry(id, nx = 14, nr = 8) {
  const s = FISH[id], P = prof(s), pos = [], uv = [], idx = [];
  const push = (x, y, z) => { pos.push(x, y, z); uv.push(0.5 - x, 0.5 + y / (2 * VF)); return pos.length / 3 - 1; };
  for (let i = 0; i <= nx; i++) {
    const t = Math.pow(i / nx, 1.15), x = P.x(t), tp = P.top(t), bt = P.bot(t), w = P.wid(t);
    for (let j = 0; j < nr; j++) { const a = (j / nr) * TAU, sn = Math.sin(a), cs = Math.cos(a); push(x, (sn >= 0 ? tp : bt) * Math.sign(sn) * Math.pow(Math.abs(sn), 0.86), w * Math.sign(cs) * Math.pow(Math.abs(cs), 0.8)); }
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nr; j++) { const a = i * nr + j, b = i * nr + ((j + 1) % nr), c = a + nr, d = b + nr; idx.push(a, b, c, b, d, c); }
  // tail fin
  const xp = P.x(1), to = tailOutline(s, xp), c0 = push(xp + 0.03, 0, 0), tb = to.map((p) => push(p[0], p[1], 0));
  for (let i = 0; i < tb.length - 1; i++) idx.push(c0, tb[i], tb[i + 1]);
  // dorsal and anal fins
  const strip = (t0, t1, h, dir, spiny) => { const n = Math.max(6, Math.round(nx * 0.9)); let pa = -1, pb = -1;
    for (let i = 0; i <= n; i++) { const k = i / n, t = t0 + (t1 - t0) * k, x = P.x(t), base = (dir > 0 ? P.top(t) : P.bot(t)) * 0.8, hh = h * finH(s, k, spiny) * (spiny && i % 2 && k < 0.5 ? 0.9 : 1);
      const a = push(x, dir * base, 0), b = push(x - hh * 0.35, dir * (base / 0.8 + hh), 0);
      if (i) idx.push(pa, a, pb, a, b, pb); pa = a; pb = b; } };
  strip(s.dorsal[0], s.dorsal[1], s.dorsal[2], 1, s.dorsal[3]); strip(s.anal[0], s.anal[1], s.anal[2], -1, 0);
  // pectoral and pelvic fins
  for (const sd of [-1, 1]) {
    const t = 0.3, x = P.x(t), w = P.wid(t), y = -P.bot(t) * 0.3;
    const a = push(x, y + 0.02, sd * w * 0.92), b = push(x - 0.13, y + 0.035, sd * (w + 0.055)), c = push(x - 0.115, y - 0.045, sd * (w + 0.04)), d = push(x - 0.01, y - 0.03, sd * w * 0.92);
    idx.push(a, b, c, a, c, d);
    const e = push(P.x(0.36), -P.bot(0.36) * 0.9, sd * 0.012), f = push(P.x(0.36) - 0.09, -P.bot(0.4) - 0.045, sd * 0.03), g = push(P.x(0.44), -P.bot(0.44) * 0.92, sd * 0.012);
    idx.push(e, f, g);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2)); g.setIndex(idx);
  g.computeVertexNormals();
  // make the body normals point outward (winding differs between halves of the loft)
  const n = g.attributes.normal, body = (nx + 1) * nr;
  for (let i = 0; i < body; i++) { const y = pos[i * 3 + 1], z = pos[i * 3 + 2]; if (n.getY(i) * y + n.getZ(i) * z < 0) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); }
  return g;
}

export function fishTexture(id, W = 1024) {
  const s = FISH[id], P = prof(s), H = Math.round(W * VF * 2), R = rng(id.length * 131 + id.charCodeAt(0));
  const X = (x) => (0.5 - x) * W, Y = (y) => (0.5 - y / (2 * VF)) * H;
  return canvasTex(W, H, (g) => {
    g.fillStyle = s.c.fin; g.fillRect(0, 0, W, H);
    // fins with rays
    const fg = g.createLinearGradient(0, 0, 0, H); fg.addColorStop(0, s.c.finTip); fg.addColorStop(0.5, s.c.fin); fg.addColorStop(1, s.c.finTip); g.fillStyle = fg; g.fillRect(0, 0, W, H);
    const tg = g.createLinearGradient(X(P.x(1)), 0, 0 + W, 0); tg.addColorStop(0, s.c.fin); tg.addColorStop(1, s.c.finTip); g.fillStyle = tg; g.fillRect(X(P.x(1)) - 4, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = W / 600;
    for (let i = 0; i < 90; i++) { const x = (i / 90) * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + W * 0.035, H * 0.5); g.lineTo(x, H); g.stroke(); }
    for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(X(P.x(1)), Y(0)); g.lineTo(W, Y(0) + i * (H / 22)); g.stroke(); }
    // body silhouette
    const N = 80, body = new Path2D();
    for (let i = 0; i <= N; i++) { const t = i / N; body[i ? 'lineTo' : 'moveTo'](X(P.x(t)), Y(P.top(t))); }
    for (let i = N; i >= 0; i--) { const t = i / N; body.lineTo(X(P.x(t)), Y(-P.bot(t))); }
    body.closePath();
    g.save(); g.clip(body);
    const bg = g.createLinearGradient(0, Y(s.hT), 0, Y(-s.hB)); bg.addColorStop(0, s.c.back); bg.addColorStop(0.3, s.c.back); bg.addColorStop(0.52, s.c.side); bg.addColorStop(0.78, s.c.side); bg.addColorStop(1, s.c.belly);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const xr = (t) => X(P.x(t)), u = W / 1024;
    // soft blotches, so the flank is not one flat colour
    for (let i = 0; i < 46; i++) { const t = 0.1 + R() * 0.85, cx = xr(t), cy = Y(-P.bot(t) + (P.top(t) + P.bot(t)) * R()), r = (26 + R() * 60) * u, gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, R() < 0.55 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.11)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); }
    // scales: staggered rows of overlapping arcs behind the gill cover, each with a darker base and a lit free edge
    { const r = 9.5 * u, dx = r * 1.5, dy = r * 1.02, x0 = xr(0.235), x1 = xr(0.99); let row = 0;
      for (let y = Y(s.hT) - r; y < Y(-s.hB) + r; y += dy, row++) for (let x = x0 + (row % 2) * dx * 0.5; x < x1; x += dx) {
        g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1.5 * u; g.beginPath(); g.arc(x, y, r, -1.25, 1.25); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1.1 * u; g.beginPath(); g.arc(x - 1.8 * u, y, r, -0.95, 0.95); g.stroke();
      } }
    if (s.skin === 'hamour') {
      for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(60,45,25,.2)'; g.beginPath(); const x = xr(0.3 + k * 0.145); g.moveTo(x - 26 * u, Y(s.hT)); g.lineTo(x + 34 * u, Y(s.hT)); g.lineTo(x + 70 * u, Y(-s.hB)); g.lineTo(x + 10 * u, Y(-s.hB)); g.fill(); }
      for (let i = 0; i < 520; i++) { const t = 0.03 + R() * 0.96, yy = -P.bot(t) * 0.55 + (P.top(t) + P.bot(t) * 0.55) * R(); const r = (t < 0.24 ? 3.2 : 4.4 + R() * 3.6) * u; g.fillStyle = `rgba(${196 + R() * 26},${104 + R() * 34},${34 + R() * 20},${0.6 + R() * 0.3})`; g.beginPath(); g.ellipse(xr(t), Y(yy), r * 1.1, r, 0, 0, TAU); g.fill(); }
    } else if (s.skin === 'shaari') {
      g.strokeStyle = 'rgba(206,170,60,.22)'; g.lineWidth = 3 * u; for (let k = 0; k < 6; k++) { g.beginPath(); for (let i = 0; i <= 40; i++) { const t = 0.26 + (i / 40) * 0.72; g[i ? 'lineTo' : 'moveTo'](xr(t), Y(-P.bot(t) * 0.6 + (P.top(t) + P.bot(t) * 0.6) * (k + 0.6) / 6.6)); } g.stroke(); }
      for (let k = 0; k < 9; k++) for (let i = 0; i < 44; i++) { const t = 0.27 + (i / 44) * 0.7 + (k % 2) * 0.008, yy = -P.bot(t) * 0.66 + (P.top(t) * 0.92 + P.bot(t) * 0.66) * (k + 0.5) / 9; g.fillStyle = 'rgba(96,186,224,.86)'; g.beginPath(); g.ellipse(xr(t), Y(yy), 3.3 * u, 2.6 * u, 0, 0, TAU); g.fill(); }
      g.strokeStyle = 'rgba(72,168,214,.9)'; g.lineWidth = 3.4 * u; const ex = xr(s.eye[0]), ey = Y(P.top(s.eye[0]) * s.eye[1]); for (const [dx, dy] of [[-0.7, 0.75], [-0.3, 0.95], [0.12, 0.98]]) { g.beginPath(); g.moveTo(ex + dx * 16 * u, ey + dy * 16 * u); g.lineTo(ex + dx * 74 * u - 10 * u, ey + dy * 74 * u); g.stroke(); }
    } else if (s.skin === 'shiqra') {
      for (let k = 0; k < 10; k++) for (let i = 0; i < 40; i++) { const t = 0.26 + (i / 40) * 0.72 + (k % 2) * 0.009, yy = -P.bot(t) * 0.8 + (P.top(t) * 0.94 + P.bot(t) * 0.8) * (k + 0.5) / 10; g.fillStyle = 'rgba(52,30,22,.4)'; g.beginPath(); g.ellipse(xr(t), Y(yy), 4.2 * u, 3.4 * u, 0, 0, TAU); g.fill(); }
      const sh = g.createLinearGradient(0, Y(s.hT), 0, Y(-s.hB)); sh.addColorStop(0.35, 'rgba(190,96,60,0)'); sh.addColorStop(0.75, 'rgba(196,92,60,.34)'); sh.addColorStop(1, 'rgba(190,96,60,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, H);
    } else if (s.skin === 'scales') {
      g.strokeStyle = 'rgba(120,20,16,.2)'; g.lineWidth = 2 * u; for (let k = 0; k < 11; k++) { g.beginPath(); for (let i = 0; i <= 40; i++) { const t = 0.24 + (i / 40) * 0.74; g[i ? 'lineTo' : 'moveTo'](xr(t) - k * 5 * u, Y(-P.bot(t) * 0.8 + (P.top(t) * 0.96 + P.bot(t) * 0.8) * (k + 0.4) / 11) - (i / 40) * 18 * u); } g.stroke(); }
      const hl = g.createLinearGradient(0, Y(s.hT), 0, Y(-s.hB)); hl.addColorStop(0.4, 'rgba(255,220,210,0)'); hl.addColorStop(0.62, 'rgba(255,224,214,.22)'); hl.addColorStop(0.8, 'rgba(255,220,210,0)'); g.fillStyle = hl; g.fillRect(0, 0, W, H);
    } else if (s.skin === 'lines') {
      g.strokeStyle = 'rgba(40,52,60,.3)'; g.lineWidth = 2.2 * u; for (let k = 0; k < 8; k++) { g.beginPath(); for (let i = 0; i <= 40; i++) { const t = 0.25 + (i / 40) * 0.73; g[i ? 'lineTo' : 'moveTo'](xr(t), Y(-P.bot(t) * 0.5 + (P.top(t) * 0.9 + P.bot(t) * 0.5) * (k + 0.5) / 8)); } g.stroke(); }
      const hl = g.createLinearGradient(0, Y(s.hT), 0, Y(-s.hB)); hl.addColorStop(0.45, 'rgba(255,255,255,0)'); hl.addColorStop(0.62, 'rgba(255,255,255,.4)'); hl.addColorStop(0.8, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fillRect(0, 0, W, H);
    } else if (s.skin === 'cobia') {
      g.fillStyle = 'rgba(240,236,224,.85)'; g.beginPath(); for (let i = 0; i <= 40; i++) { const t = 0.2 + (i / 40) * 0.78; g[i ? 'lineTo' : 'moveTo'](xr(t), Y(P.top(t) * 0.12)); } for (let i = 40; i >= 0; i--) { const t = 0.2 + (i / 40) * 0.78; g.lineTo(xr(t), Y(-P.bot(t) * 0.16)); } g.fill();
    }
    // back shading and a soft belly light
    const sd = g.createLinearGradient(0, Y(s.hT), 0, Y(-s.hB)); sd.addColorStop(0, 'rgba(0,0,0,.26)'); sd.addColorStop(0.22, 'rgba(0,0,0,0)'); sd.addColorStop(0.9, 'rgba(255,255,255,0)'); sd.addColorStop(1, 'rgba(255,255,255,.28)'); g.fillStyle = sd; g.fillRect(0, 0, W, H);
    // a band of light along the upper flank, and the lateral line arching from the gill cover to the tail stalk
    { const hb = g.createLinearGradient(0, Y(s.hT), 0, Y(-s.hB)); hb.addColorStop(0.28, 'rgba(255,255,255,0)'); hb.addColorStop(0.41, 'rgba(255,255,255,.17)'); hb.addColorStop(0.55, 'rgba(255,255,255,0)'); g.fillStyle = hb; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(0,0,0,.26)'; g.lineWidth = 2 * u; g.setLineDash([7 * u, 5 * u]); g.beginPath(); for (let i = 0; i <= 40; i++) { const t = 0.24 + (i / 40) * 0.74; g[i ? 'lineTo' : 'moveTo'](xr(t), Y(P.top(t) * (0.5 - 0.42 * sm(0.24, 0.9, t)))); } g.stroke(); g.setLineDash([]); }
    // gill cover, mouth, eye
    g.strokeStyle = 'rgba(0,0,0,.34)'; g.lineWidth = 3.4 * u; g.beginPath(); g.ellipse(xr(0.19), Y((P.top(0.25) - P.bot(0.25)) * 0.36), 30 * u, (P.top(0.25) + P.bot(0.25)) * 0.68 * (H / (2 * VF)) * 0.5, 0, -1.1, 1.2); g.stroke();
    g.lineWidth = 3 * u; g.beginPath(); g.moveTo(xr(0.0), Y(-P.bot(0.02) * 0.2)); g.quadraticCurveTo(xr(0.04), Y(-P.bot(0.06) * 0.55), xr(0.085), Y(-P.bot(0.09) * 0.42)); g.stroke();
    const ex = xr(s.eye[0]), ey = Y(P.top(s.eye[0]) * s.eye[1]), er = 15 * u;
    // the eye: a shaded socket, a golden iris that darkens to its rim, the pupil and a point of light
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.arc(ex, ey, er * 1.16, 0, TAU); g.fill();
    { const ig = g.createRadialGradient(ex, ey, er * 0.4, ex, ey, er); ig.addColorStop(0, '#c79a3c'); ig.addColorStop(0.7, '#ead9a4'); ig.addColorStop(1, '#5d4c2f'); g.fillStyle = ig; g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill(); }
    g.fillStyle = '#0b0f13'; g.beginPath(); g.arc(ex, ey, er * 0.56, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(ex - er * 0.24, ey - er * 0.27, er * 0.19, 0, TAU); g.fill();
    g.restore();
  }, { repeat: false, aniso: 8 });
}

/* ───────── swimming material ───────── */
export function createFish(world) {
  const thumbs = {};
  const uTime = { value: 0 }, geo = {}, mat = {}, hiGeo = {}, loader = new THREE.TextureLoader();
  const getGeo = (id) => geo[id] || (geo[id] = PHOTO[id] ? photoGeometry(id, 12, 8) : fishGeometry(id, 12, 8));
  const photoTex = (id) => { const t = loader.load(import.meta.env.BASE_URL + PHOTO[id].src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const uRip = world.sea && world.sea.uniforms ? world.sea.uniforms.uN : { value: null };
  const getMat = (id) => {
    if (mat[id]) return mat[id];
    // photographed fish: alpha-to-coverage gives the fins a soft, anti-aliased edge instead of a stair-stepped cut
    const m = PHOTO[id]
      ? new THREE.MeshStandardMaterial({ map: photoTex(id), roughness: 0.42, metalness: 0.06, side: THREE.DoubleSide, envMapIntensity: 0.8, alphaTest: 0.5, alphaToCoverage: true })
      : new THREE.MeshStandardMaterial({ map: fishTexture(id, world.engine.tier === 'low' ? 512 : 1024), roughness: 0.46, metalness: 0.1, side: THREE.DoubleSide, envMapIntensity: 0.9 });
    m.onBeforeCompile = swim;
    mat[id] = m; return m;
  };
  /** the fish swims in the vertex shader; ripples of sunlight play over its back in the fragment shader */
  function swim(sh) {
      sh.uniforms.uTime = uTime; sh.uniforms.uRip = uRip;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec4 aPath; attribute vec4 aMove; attribute float aMode; uniform float uTime;
          varying vec3 vFishW; varying float vFishUp;
          vec2 fFwd; vec2 fSide; vec3 fCentre;`)
        .replace('#include <beginnormal_vertex>', `
          float fTh = aMove.y * 6.2831853 + uTime * aMove.z;
          vec2 fCs = vec2(cos(fTh), sin(fTh));
          vec2 fT = vec2(-aPath.z * fCs.y, aPath.w * fCs.x) * sign(aMove.z + 1e-5);
          fFwd = mix(normalize(fT + vec2(1e-5, 0.0)), vec2(cos(aMove.z), sin(aMove.z)), aMode);
          fSide = vec2(-fFwd.y, fFwd.x);
          fCentre = vec3(aPath.x + aPath.z * fCs.x * (1.0 - aMode), aMove.x + sin(uTime * 0.7 + aMove.y * 40.0) * 0.07 * aMove.w, aPath.y + aPath.w * fCs.y * (1.0 - aMode));
          vec3 objectNormal = vec3(fFwd.x * normal.x + fSide.x * normal.z, normal.y, fFwd.y * normal.x + fSide.y * normal.z);
          vFishUp = normal.y;`)
        .replace('#include <begin_vertex>', `
          vec3 fp = position;
          float fFlex = smoothstep(0.3, -0.5, fp.x);
          // a fish that is placed by hand (under water, in the studio) bursts and glides on its own clock:
          // the tail beats harder and a little faster for a few seconds, then the fish coasts
          float fGaitPh = uTime * 0.45 + aMove.y * 31.4;
          float fBeat = uTime * mix(4.0 + min(9.0, abs(aMove.z) * 30.0), 4.4, aMode) + aMove.y * 31.0 - aMode * 2.4 * cos(fGaitPh);
          float fAmp = mix(1.0, 0.7 + 0.42 * sin(fGaitPh), aMode);
          float fWave = sin(fBeat - fp.x * 5.6);
          fp.z += fWave * (0.012 + 0.085 * fFlex * fFlex) * fAmp;
          // the head turns a touch against the tail
          fp.z -= sin(fBeat - 0.6) * 0.03 * fp.x * (1.0 - fFlex) * fAmp;
          fp *= aMove.w;
          vec3 transformed = fCentre + vec3(fFwd.x * fp.x + fSide.x * fp.z, fp.y, fFwd.y * fp.x + fSide.y * fp.z);`)
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 fWp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            fWp = instanceMatrix * fWp;
          #endif
          vFishW = (modelMatrix * fWp).xyz;`);
      // sunlight through the moving surface ripples over the back, and the belly sits in its own shade
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uRip; uniform float uTime; varying vec3 vFishW; varying float vFishUp;`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          {
            vec2 fq = vFishW.xz;
            float fa = texture2D(uRip, fq * 0.31 + uTime * vec2(0.05, 0.031)).a, fb = texture2D(uRip, fq * 0.74 - uTime * vec2(0.07, -0.043)).a;
            float fCaus = 1.0 - smoothstep(0.0, 0.07, abs(fa - fb));
            float fUp = smoothstep(-0.1, 0.75, vFishUp);
            diffuseColor.rgb *= (1.0 + 0.6 * fCaus * fUp) * mix(0.8, 1.0, smoothstep(-0.9, 0.15, vFishUp));
          }`);
  }
  /* the selected fish glows: a second skin of light drawn over it, strongest along its edges */
  const glowMat = {}, glowU = { value: 0 };
  const getGlow = (id) => {
    if (glowMat[id]) return glowMat[id];
    const m = getMat(id).clone();
    m.transparent = true; m.blending = THREE.AdditiveBlending; m.depthWrite = false; m.alphaToCoverage = false; m.fog = false; m.envMapIntensity = 0;
    m.onBeforeCompile = (sh) => {
      swim(sh); sh.uniforms.uGlow = glowU;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n          uniform float uGlow;')
        .replace('#include <opaque_fragment>', `{
            float fEdge = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.0);
            outgoingLight = (outgoingLight * 0.1 + vec3(0.55, 0.93, 1.0) * (0.035 + 0.5 * fEdge)) * uGlow;
          }
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'fish-glow';
    glowMat[id] = m; return m;
  };
  world.updaters.push((dt, t) => { uTime.value = t; });

  const speckU = { uTime, uScale: { value: 600 }, uColor: { value: new THREE.Color(0x24333d) } };
  const speckMat = new THREE.ShaderMaterial({
    uniforms: speckU, transparent: true, depthWrite: false,
    vertexShader: `attribute vec2 aPh; uniform float uTime, uScale; varying float vA;
      void main(){ vec3 p = position; float a = uTime * (0.5 + aPh.x) + aPh.x * 60.0; p.x += sin(a) * 0.45 + sin(a * 0.37 + aPh.x * 9.0) * 0.3; p.z += cos(a * 0.83) * 0.45; p.y += sin(a * 1.7) * 0.05;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aPh.y * uScale / -mv.z, 1.0, 14.0); vA = clamp(aPh.y * uScale / -mv.z, 0.0, 1.0); }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c * vec2(1.0, 1.9)); if (d > 0.5) discard; gl_FragColor = vec4(uColor, 0.82 * vA); }`,
  });
  speckMat.userData.scale = speckU.uScale;

  const api = {
    uTime, FISH, PHOTO,
    /** schools: [{x,z,rx,rz,r0,y0,y1,n,sp,len,speed}], fry: [{x0,z0,x1,z1,y,n,size,round}] → group */
    populate(schools, fry = []) {
      const group = new THREE.Group(); group.name = 'fish'; const R = rng(schools.length * 17 + fry.length + 3), by = {};
      for (const s of schools) for (let i = 0; i < s.n; i++) {
        const id = s.sp === 'mix' ? MIX[i % MIX.length] : FISH[s.sp] ? s.sp : 'naisrah', f = (s.r0 ?? 0.3) + (1 - (s.r0 ?? 0.3)) * Math.sqrt(R());
        (by[id] || (by[id] = [])).push([s.x, s.z, s.rx * f, s.rz * f, s.y0 + (s.y1 - s.y0) * R(), R(), (s.speed || 0.12) * (0.75 + R() * 0.5) / Math.max(0.35, f) * (R() < 0.88 ? 1 : -1), s.len * (0.82 + R() * 0.36), 0]);
      }
      for (const id in by) group.add(api.mesh(id, by[id]));
      if (fry.length) {
        const pos = [], ph = [];
        for (const f of fry) for (let i = 0; i < f.n; i++) {
          let x, z; if (f.round) { const a = R() * TAU, r = Math.sqrt(R()) * (f.x1 - f.x0) / 2; x = (f.x0 + f.x1) / 2 + Math.cos(a) * r; z = (f.z0 + f.z1) / 2 + Math.sin(a) * r; } else { x = f.x0 + R() * (f.x1 - f.x0); z = f.z0 + R() * (f.z1 - f.z0); }
          pos.push(x, f.y - R() * 0.25, z); ph.push(R(), f.size * (0.7 + R() * 0.6));
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('aPh', new THREE.BufferAttribute(new Float32Array(ph), 2));
        const pts = new THREE.Points(g, speckMat); pts.frustumCulled = false; pts.renderOrder = 1; group.add(pts);
      }
      return { group };
    },
    /** rows: [cx, cz, rx, rz, y, phase, speed, size, mode] */
    mesh(id, rows, hi = false) {
      const g = (hi ? (hiGeo[id] || (hiGeo[id] = PHOTO[id] ? photoGeometry(id, 46, 20) : fishGeometry(id, 56, 20))) : getGeo(id)).clone();
      const n = rows.length, aPath = new Float32Array(n * 4), aMove = new Float32Array(n * 4), aMode = new Float32Array(n);
      rows.forEach((r, i) => { aPath.set([r[0], r[1], r[2], r[3]], i * 4); aMove.set([r[4], r[5], r[6], r[7]], i * 4); aMode[i] = r[8] || 0; });
      g.setAttribute('aPath', new THREE.InstancedBufferAttribute(aPath, 4)); g.setAttribute('aMove', new THREE.InstancedBufferAttribute(aMove, 4)); g.setAttribute('aMode', new THREE.InstancedBufferAttribute(aMode, 1));
      const m = new THREE.InstancedMesh(g, getMat(id), n); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.name = 'fish-' + id;
      // no two fish of a school are quite the same: a little lighter or darker, a touch warmer or cooler
      if (n > 1) { const Q = rng(n * 31 + id.length * 7), col = new THREE.Color(); for (let i = 0; i < n; i++) { const v = 0.84 + Q() * 0.2, w = (Q() - 0.5) * 0.07; m.setColorAt(i, col.setRGB(v * (1 + w), v, v * (1 - w))); } m.instanceColor.needsUpdate = true; }
      return m;
    },
    /** one fish drawn in light over the real one (place it with setMatrixAt(0, m); `gait` is that fish's own clock so the tails beat together) */
    glow(id, gait = 0) {
      const g = (hiGeo[id] || (hiGeo[id] = PHOTO[id] ? photoGeometry(id, 46, 20) : fishGeometry(id, 56, 20))).clone();
      g.setAttribute('aPath', new THREE.InstancedBufferAttribute(new Float32Array(4), 4)); g.setAttribute('aMove', new THREE.InstancedBufferAttribute(new Float32Array([0, gait, 0, 1]), 4)); g.setAttribute('aMode', new THREE.InstancedBufferAttribute(new Float32Array([1]), 1));
      const m = new THREE.InstancedMesh(g, getGlow(id), 1); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.renderOrder = 5; m.name = 'fish-glow';
      return m;
    },
    /** how strongly the glow shows, 0 to 1 */
    glowLevel: glowU,
    setScale(v) { speckU.uScale.value = v; },
    /** a small side-on picture of a drawn species, for lists (the photographed ones have their own cut-outs) */
    thumb(id, w = 368, h = 176) {
      if (thumbs[id] !== undefined) return thumbs[id];
      try {
        const r = world.engine.renderer, geo = fishGeometry(id, 30, 12); geo.computeBoundingBox(); const bb = geo.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
        const sx = (bb.max.x - bb.min.x) * 0.54, sy = Math.max((bb.max.y - bb.min.y) * 0.56, (sx * h) / w), hw = Math.max(sx, (sy * w) / h), hh = (hw * h) / w;
        const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-hw, hw, hh, -hh, 0.01, 20), tex = fishTexture(id, 512);
        sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }))); cam.position.set(cx, cy, -5); cam.lookAt(cx, cy, 0);        // from the far side, so the head points left like the photographs
        const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
        const prev = r.getRenderTarget(), col = r.getClearColor(new THREE.Color()), al = r.getClearAlpha(), tm = r.toneMapping; r.toneMapping = THREE.NoToneMapping;
        r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(sc, cam);
        const px = new Uint8Array(w * h * 4); r.readRenderTargetPixels(rt, 0, 0, w, h, px); r.setRenderTarget(prev); r.setClearColor(col, al); r.toneMapping = tm;
        const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), im = g.createImageData(w, h);
        for (let y = 0; y < h; y++) im.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
        g.putImageData(im, 0, 0); rt.dispose(); geo.dispose(); tex.dispose(); thumbs[id] = c.toDataURL('image/png');
      } catch (e) { thumbs[id] = ''; }
      return thumbs[id];
    },
  };
  return api;
}
