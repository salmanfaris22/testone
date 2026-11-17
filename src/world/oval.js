// The oval hall of the Marine Innovation Park, built to the client's render: a white pebble-shaped shell roof with a thick,
// rounded rim over a curved glass front (mullion grid, the centre's name above the doors), standing on a raised podium with
// crescent lawns either side of the entrance, a broad flight of steps, a ramp and a glass balustrade round the edge.
// Everything is in the park frame (metres); the outlines and their ellipse parameter t come from OVAL in layout.js.
import * as THREE from 'three';
import { C, TAU, DEG, canvasTex } from './kit.js';
import { CUT, noteWall, doorLeaf } from './shell.js';
import { OVAL, facade, podium, ovalPt, ovalT, ovalN, ovalRate } from './layout.js';

const O = OVAL, YP = O.yp, TOP = O.top;
const wob = (t) => 1 + 0.022 * Math.sin(3 * t + 0.7) + 0.012 * Math.sin(5 * t + 2.2);
// the shell reaches a little less far at the back, where it comes down against the upper floor of the lab wing
const rimP = (t) => { const w = wob(t); return [O.ra * w * Math.cos(t), O.cz + (O.rb - 1.15 * (1 - Math.sin(t))) * w * Math.sin(t)]; };
/** height of the top of the rim: a slow wave round the shell, as in the render */
const Y0 = 12.1, yR = (t) => Y0 + 0.8 * Math.sin(2 * t + 0.6) + 0.35 * Math.sin(3 * t + 2.0);
const TH = 1.9, BULGE = 0.85, DOME = 3.2;

/** t values from t0 to t1 spaced about `step` metres apart along outline f (t0 < t1) */
export function spaced(f, t0, t1, step) {
  const N = 900, L = [0]; let prev = f(t0);
  for (let i = 1; i <= N; i++) { const p = f(t0 + ((t1 - t0) * i) / N); L.push(L[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1])); prev = p; }
  const n = Math.max(1, Math.round(L[N] / step)), out = []; let j = 0;
  for (let k = 0; k <= n; k++) { const s = (L[N] * k) / n; while (j < N - 1 && L[j + 1] < s) j++; const u = (s - L[j]) / (L[j + 1] - L[j] || 1); out.push(t0 + ((t1 - t0) * (j + u)) / N); }
  return out;
}
/** vertical band along outline f (ts increasing), from y0 to y1, `off` metres outside the line, facing out */
function band(b, f, ts, y0, y1, off, hex) {
  const v = [], n = [], tr = [];
  ts.slice().reverse().forEach((t, i) => {
    const p = f(t), q = ovalN(f, t), x = p[0] + q[0] * off, z = p[1] + q[1] * off;
    const ya = typeof y0 === 'function' ? y0(t) : y0, yb = typeof y1 === 'function' ? y1(t) : y1;
    v.push([x, ya, z], [x, yb, z]); n.push([q[0], 0, q[1]], [q[0], 0, q[1]]);
    if (i) { const a = (i - 1) * 2; tr.push(a, a + 2, a + 3, a, a + 3, a + 1); }
  });
  b._raw(v, n, tr, hex);
}
/** the centre's name, black on a white panel as on the building in the render, with a small English line */
function nameTex() {
  return canvasTex(2048, 200, (g, w, h) => {
    g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#30353a'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#16191c'; g.textBaseline = 'middle'; g.textAlign = 'center';
    const ar = 'مركز الشيخ خليفة للأبحاث البحرية في إمارة أم القيوين';
    let fs = 104; g.direction = 'rtl';
    do { g.font = `700 ${fs}px "Geeza Pro", "Noto Sans Arabic", "Arial", sans-serif`; fs -= 4; } while (g.measureText(ar).width > w * 0.93 && fs > 40);
    g.fillText(ar, w / 2, h * 0.42);
    g.direction = 'ltr'; g.font = '600 36px "IBM Plex Sans", Helvetica, Arial, sans-serif'; g.fillStyle = '#3b4146';
    g.fillText('SHEIKH KHALIFA MARINE RESEARCH CENTRE  ·  UMM AL QUWAIN', w / 2, h * 0.83);
  }, { repeat: false });
}

/**
 * Adds the hall to the park's builders: `lo` (stays when the roof lifts) and `hi` (lifts with the roof).
 * `RO` is the radius of the drum inside; `pol(r, deg)` gives a point round the rotunda centre.
 * Returns the name sign (its own mesh and material, so it fades with the roof) and the entrance it marks.
 */
export function buildOval(lo, hi, { RO, pol }) {
  const T0 = O.t0, T1 = O.t1, TD = ovalT(facade, O.door), TDP = ovalT(podium, O.door);

  /* ───── the shell: a pebble with a soft dome, a thick rolled rim and a soffit back to the glass ───── */
  {
    const NR = 22, NS = 168, verts = [], norms = [], tris = [];
    const P = (rho, t) => { const e = rimP(t); return [e[0] * rho, Y0 + (yR(t) - Y0) * rho * rho + DOME * Math.pow(Math.max(0, 1 - Math.pow(rho, 2.6)), 0.6), O.cz + (e[1] - O.cz) * rho]; };   // a cushion: flat on top, rounding off hard at the edge
    const RHO = (i) => 1 - Math.pow(1 - i / NR, 1.6);                                     // rings bunch up towards the rim, where the curve is
    for (let i = 0; i <= NR; i++) for (let j = 0; j <= NS; j++) verts.push(P(RHO(i), (j / NS) * TAU));
    for (let i = 0; i <= NR; i++) for (let j = 0; j <= NS; j++) {
      const rho = Math.max(0.02, RHO(i)), t = (j / NS) * TAU, a = P(Math.max(0, rho - 0.02), t), b = P(Math.min(1, rho + 0.02), t), c = P(rho, t - 0.01), d = P(rho, t + 0.01);
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - c[0], d[1] - c[1], d[2] - c[2]];
      let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; } const l = Math.hypot(nx, ny, nz) || 1; norms.push(i ? [nx / l, ny / l, nz / l] : [0, 1, 0]);
    }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) { const a = i * (NS + 1) + j, b = a + NS + 1; tris.push(a, a + 1, b, a + 1, b + 1, b); }
    hi.use('matte')._rawUp(verts, norms, tris, 0xeeece7);
    // the rim rolls over and under (five points round a half ellipse), then the soffit runs back in to the head of the glass
    const PR = 6, rv = [], rn = [], rt = [];
    for (let j = 0; j <= NS; j++) {
      const t = (j / NS) * TAU, e = rimP(t), q = ovalN(rimP, t), y = yR(t), f = facade(t);
      for (const ph of [90, 45, 0, -45, -90]) { const c = Math.cos(ph * DEG), s = Math.sin(ph * DEG); rv.push([e[0] + q[0] * BULGE * c, y - TH / 2 + (TH / 2) * s, e[1] + q[1] * BULGE * c]); const l = Math.hypot(c, s * 0.7) || 1; rn.push([(q[0] * c) / l, (s * 0.7) / l, (q[1] * c) / l]); }
      rv.push([f[0], TOP, f[1]]); rn.push([0, -1, 0]);
    }
    for (let j = 0; j < NS; j++) for (let k = 0; k < PR - 1; k++) { const a = j * PR + k, b = a + PR; rt.push(a, b, a + 1, a + 1, b, b + 1); }
    hi._raw(rv, rn, rt, 0xe9e7e1);
  }

  /* ───── the glass front ───── */
  const fts = spaced(facade, T0, T1, 1.2);
  // the doorway (the door frame is 8.9 m wide on the axis of the doors): the glass of the front stops either side of it and over
  // its head, so the doors fill it and, open, show the foyer behind (they used to stand behind a band of glass that never opened)
  const rate = ovalRate(facade, TD), G0 = TD - 4.45 / rate, G1 = TD + 4.45 / rate;
  const tsL = spaced(facade, T0, G0, 1.2), tsR = spaced(facade, G1, T1, 1.2), tsD = spaced(facade, G0, G1, 0.6);
  lo.use('matte'); band(lo, facade, fts, YP, YP + 0.18, 0.02, 0x3c4349);                     // dark base rail (the threshold across the doorway)
  lo.use('window'); for (const ts of [tsL, tsR]) band(lo, facade, ts, YP + 0.18, CUT, 0, null);
  hi.use('window'); for (const ts of [tsL, tsR]) band(hi, facade, ts, CUT, TOP - 0.28, 0, null); band(hi, facade, tsD, 3.75, TOP - 0.28, 0, null);
  hi.use('satin'); band(hi, facade, fts, TOP - 0.28, TOP, 0.04, 0xd6dbde);                    // head of the glass
  for (const y of [3.55, 6.3]) band(hi, facade, fts, y, y + 0.11, 0.07, 0xd9dee1);            // two transoms, as in the render
  for (const t of spaced(facade, T0, T1, 2.75)) {                                             // mullions (none in the doorway: it has its own frame)
    if (t > G0 - 0.4 / rate && t < G1 + 0.4 / rate) continue;
    const p = facade(t), q = ovalN(facade, t), ry = -Math.atan2(-q[0], q[1]), x = p[0] + q[0] * 0.07, z = p[1] + q[1] * 0.07;
    lo.use('satin').box(0xd9dee1, 0.12, CUT - YP, 0.2, x, YP, z, ry); hi.use('satin').box(0xd9dee1, 0.12, TOP - CUT, 0.2, x, CUT, z, ry);
  }
  // the glass front is a wall for the drone and the walk-in camera (the doors are a closed door: they slide apart for the drone)
  { const TDl = TD - 2.25 / ovalRate(facade, TD), TDr = TD + 2.25 / ovalRate(facade, TD), ts = spaced(facade, T0, T1, 2.4);
    for (let i = 1; i < ts.length; i++) { let a = ts[i - 1], b = ts[i]; if (b <= TDl || a >= TDr) { const p = facade(a), q = facade(b); noteWall(lo, p[0], p[1], q[0], q[1], TOP); continue; }
      if (a < TDl) { const p = facade(a), q = facade(TDl); noteWall(lo, p[0], p[1], q[0], q[1], TOP); } if (b > TDr) { const p = facade(TDr), q = facade(b); noteWall(lo, p[0], p[1], q[0], q[1], TOP); } } }
  // the ends: a white return against the office wing, a pier where the glass meets the link to the lab wing
  { const e = facade(T0); lo.use('matte').box(0xf1efe9, 1.9, CUT - YP, 0.45, e[0] + 0.85, YP, e[1]); hi.use('matte').box(0xf1efe9, 1.9, TOP - CUT, 0.45, e[0] + 0.85, CUT, e[1]);
    const w = facade(T1); lo.use('matte').box(0xf1efe9, 0.7, CUT - YP, 0.7, w[0], YP, w[1]); hi.use('matte').box(0xf1efe9, 0.7, TOP - CUT, 0.7, w[0], CUT, w[1]); }
  // the doors: a bright alu frame round four dark glass leaves, a mat outside
  {
    const p = facade(TD), q = ovalN(facade, TD), ry = -Math.atan2(-q[0], q[1]), tx = -q[1], tz = q[0], at = (s, o) => [p[0] + tx * s + q[0] * o, p[1] + tz * s + q[1] * o];
    for (const s of [-4.3, -2.15, 2.15, 4.3]) { const [x, z] = at(s, 0.16); lo.use('satin').box(0xe3e7ea, 0.16, CUT - YP, 0.3, x, YP, z, ry); hi.use('satin').box(0xe3e7ea, 0.16, 3.6 - CUT, 0.3, x, CUT, z, ry); }
    { const [x, z] = at(0, 0.16); hi.use('satin').box(0xe3e7ea, 8.9, 0.3, 0.34, x, 3.6, z, ry);
      // the two outer leaves are fixed; the middle pair slides apart (doorLeaf 'part'), in front of them, when someone (the drone) comes
      for (const sg of [-1, 1]) { const [fx, fz] = at(sg * 3.2, 0.16); lo.use('window').box(null, 2.12, CUT - YP - 0.05, 0.08, fx, YP + 0.02, fz, ry); hi.use('window').box(null, 2.12, 3.6 - CUT, 0.08, fx, CUT, fz, ry); }
      const a = at(-2.15, 0.36), b = at(2.15, 0.36), leaf = doorLeaf(hi, a[0], a[1], b[0], b[1], YP + 0.02, 3.6, { t: 0.06, key: 'window', kind: 'part' });
      const wa = at(-2.15, 0), wb = at(2.15, 0); noteWall(lo, wa[0], wa[1], wb[0], wb[1], 3.6, 1, leaf, 3.6, TOP); }
    { const [x, z] = at(0, 1.8); lo.use('matte').box(0x2e3338, 8.6, 0.02, 2.6, x, YP, z, ry); }
  }

  /* ───── the podium: one slab for the foyer inside the glass and the terrace outside it ───── */
  const TP0 = 14 * DEG, TP1 = 236 * DEG, slab = [];
  for (let t = TP1; t >= TP0 - 1e-6; t -= 2 * DEG) slab.push(podium(t));
  slab.push([38.3, 10.97], [36.4, -2.1], facade(T0), [25.3, -3.1]);                           // along the office wing, in beside the spine
  for (let a = -7; a <= 225; a += 4) slab.push(pol(RO + 0.05, a));                             // round the drum
  slab.push([-18.02, -18.05], facade(T1));                                                     // down the link wall to the end of the glass
  lo.use('paving').prism(0xefece5, slab, 0, YP);
  // the plaza at ground level round the podium, out to the drop-off
  { const pl = []; for (let t = 228 * DEG; t >= 20 * DEG; t -= 2 * DEG) pl.push(ovalPt(O.pa + 10, O.pb + 10, t)); for (let t = 20 * DEG; t <= 228 * DEG; t += 4 * DEG) pl.push(facade(t)); lo.use('paving').poly(0xe7e1d4, pl, 0.044); }

  // the steps down from the entrance court, on the axis of the doors
  const sp = podium(TDP), sq = ovalN(podium, TDP), stx = -sq[1], stz = sq[0], sry = -Math.atan2(stz, stx), SW = 14;
  const sAt = (s, o) => [sp[0] + stx * s + sq[0] * o, sp[1] + stz * s + sq[1] * o];
  for (let k = 1; k <= 3; k++) { const d = 0.42 * k + 1.2, [x, z] = sAt(0, d / 2 - 1.2); lo.use('paving').box(0xf3f0ea, SW, YP - 0.15 * k, d, x, 0, z, sry); }
  for (const s of [-1, 1]) { const [x, z] = sAt(s * (SW / 2 + 0.25), 0.3); lo.use('matte').box(0xf1efe9, 0.5, YP + 0.08, 3.0, x, 0, z, sry); }   // cheek walls

  // the ramp, along the podium wall on the right of the steps, down to the plaza
  const rateP = ovalRate(podium, TDP), tR0 = TDP - (SW / 2 + 0.5) / rateP, RL = 19, tR1 = tR0 - RL / rateP;
  {
    const ts = spaced(podium, tR1, tR0, 1.0), v = [], n = [], tr = [];
    ts.forEach((t, i) => { const p = podium(t), q = ovalN(podium, t), y = YP * ((t - tR1) / (tR0 - tR1)) + 0.02; v.push([p[0] + q[0] * 0.02, y, p[1] + q[1] * 0.02], [p[0] + q[0] * 1.9, y, p[1] + q[1] * 1.9]); n.push([0, 1, 0], [0, 1, 0]); if (i) { const a = (i - 1) * 2; tr.push(a, a + 3, a + 1, a, a + 2, a + 3); } });
    lo.use('paving')._raw(v, n, tr, 0xeae6de);
    lo.use('matte'); band(lo, (t) => podium(t), ts, 0, (t) => YP * ((t - tR1) / (tR0 - tR1)) + 0.02, 1.9, 0xf1efe9);    // its outer face
    lo.use('glass'); band(lo, podium, ts, (t) => YP * ((t - tR1) / (tR0 - tR1)) + 0.02, (t) => YP * ((t - tR1) / (tR0 - tR1)) + 1.02, 1.82, C.glass);
    lo.use('satin').pipe(C.alu, 0.035, ts.map((t) => { const p = podium(t), q = ovalN(podium, t); return [p[0] + q[0] * 1.82, YP * ((t - tR1) / (tR0 - tR1)) + 1.05, p[1] + q[1] * 1.82]; }), 6);
  }

  // glass balustrade round the podium edge, open at the steps
  {
    const gap0 = TDP - (SW / 2) / rateP, gap1 = TDP + (SW / 2) / rateP;
    for (const [a, c] of [[TP0 + 0.6 * DEG, gap0], [gap1, TP1 - 0.6 * DEG]]) {
      const ts = spaced(podium, a, c, 1.6);
      lo.use('glass'); band(lo, podium, ts, YP, YP + 1.0, -0.22, C.glass);
      lo.use('satin').pipe(C.alu, 0.035, ts.map((t) => { const p = podium(t), q = ovalN(podium, t); return [p[0] - q[0] * 0.22, YP + 1.03, p[1] - q[1] * 0.22]; }), 6);
      for (const t of ts) { const p = podium(t), q = ovalN(podium, t); lo.box(C.alu, 0.05, 1.0, 0.05, p[0] - q[0] * 0.22, YP, p[1] - q[1] * 0.22); }
    }
  }

  /* ───── crescent lawns either side of the entrance court, in dark-edged planters ───── */
  {
    const rf = ovalRate(facade, TD), court = 6.2 / rf;
    const lawn = (tA, tB, aIn, aOut, pad) => {
      const at = (t, a, s) => { const f = facade(t), p = podium(t), span = Math.hypot(p[0] - f[0], p[1] - f[1]), k = a + (s * pad) / span; return [f[0] + (p[0] - f[0]) * k, f[1] + (p[1] - f[1]) * k]; };
      const r0 = ovalRate(facade, tA), t0 = tA - pad / r0, t1 = tB + pad / ovalRate(facade, tB), len = (t1 - t0) * r0, n = Math.max(8, Math.ceil(len / 1.2)), out = [], inn = [];
      for (let i = 0; i <= n; i++) {
        const t = t0 + ((t1 - t0) * i) / n, d = Math.min(i, n - i) * (len / n), f = facade(t), p = podium(t), span = Math.hypot(p[0] - f[0], p[1] - f[1]);
        const half = (span * (aOut - aIn)) / 2 + pad, g = d < half ? Math.sqrt(Math.max(0, 1 - (1 - d / half) ** 2)) : 1, mid = (aIn + aOut) / 2;
        out.push(at(t, mid + (aOut - mid) * g, g)); inn.push(at(t, mid - (mid - aIn) * g, -g));
      }
      return out.concat(inn.reverse());
    };
    for (const [a, c] of [[TD + court, 226 * DEG], [20 * DEG, TD - court]]) {
      lo.use('matte').prism(0x353a3f, lawn(a, c, 0.035, 0.7, 0.32), YP, YP + 0.45);
      lo.use('matte').prism(C.grass, lawn(a, c, 0.035, 0.7, 0), YP + 0.02, YP + 0.46, { sides: false });
    }
  }

  /* ───── the name over the doors, on a curved white panel that follows the glass ───── */
  const signMat = new THREE.MeshBasicMaterial({ map: nameTex(), toneMapped: false, transparent: true });
  let sign;
  {
    const half = 8.6 / ovalRate(facade, TD), ts = spaced(facade, TD - half, TD + half, 0.4).reverse(), pos = [], uv = [], idx = [];
    ts.forEach((t, i) => { const p = facade(t), q = ovalN(facade, t), x = p[0] + q[0] * 0.2, z = p[1] + q[1] * 0.2, u = i / (ts.length - 1); pos.push(x, 4.85, z, x, 6.5, z); uv.push(u, 0, u, 1); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    sign = new THREE.Mesh(g, signMat); sign.userData.noShadow = true; sign.name = 'oval-sign';
  }
  return { sign, signMat, door: facade(TD), doorT: TD, steps: sAt(0, 2.6), stepsT: TDP };
}
