// The car of the opening film: a black Land Rover Defender 110 (the current one), as the client asked. No model file: the body
// is one smooth skin lofted from the real car's proportions (4.76 m long, 2.0 m wide, 1.97 m high, 3.02 m between the axles):
// a side profile (floor line, shoulder line, roof line), a plan outline and a boxy cross-section with the shoulder ledge, an
// upright glasshouse and tight corners; the squared wheel arches are cut into it. Glass, the alpine windows in the roof's
// shoulder, the dark cladding round the sills, arches and bumpers, the pillars, the wing vents and the door shuts are thin
// patches laid on the same surface, so they follow it exactly. Then the things that make it a Defender: round lamps in
// square housings, the slot grille, the skid plate, the spare wheel on the side-hinged tail door, the upright tail lamps,
// the expedition roof rack, side steps and mud flaps. Paint is a clear-coated black, glass is dark and mirror-smooth.
// Local frame: +x forward, y = 0 the road, +z the right-hand side, the origin midway between the axles.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder, clamp, canvasTex } from './kit.js';

const AXLE = 1.511, TRACK = 0.852, WHEEL_R = 0.405, X0 = -2.4, X1 = 2.356;
const ARCH_A = 0.6, ARCH_B = 0.565, ARCH_N = 3.2;          // the arches are squared off: a superellipse, 1.2 m wide
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** shape-preserving curve through [x, value] keys (no overshoot between them) */
function curve(keys) {
  const n = keys.length, h = [], d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) { h[i] = keys[i + 1][0] - keys[i][0]; d[i] = (keys[i + 1][1] - keys[i][1]) / h[i]; }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : ((h[i - 1] + h[i]) * 3) / ((2 * h[i] + h[i - 1]) / d[i - 1] + (h[i] + 2 * h[i - 1]) / d[i]);
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1]; if (x >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (x > keys[i + 1][0]) i++;
    const t = (x - keys[i][0]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * keys[i][1] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * keys[i + 1][1] + (t3 - t2) * h[i] * m[i + 1];
  };
}
// side view, tail to nose: the floor line (it rises under both overhangs), the shoulder (level along the doors, falling a
// little along the bonnet to its rounded leading edge) and how tall the glasshouse stands on it (an upright screen from the
// scuttle at x = 0.92, a flat roof, a tail that is all but vertical)
const yBot = curve([[X0, 0.68], [-2.28, 0.6], [-2.12, 0.47], [-1.9, 0.44], [1.9, 0.44], [2.12, 0.47], [2.26, 0.52], [X1, 0.56]]);
const yBelt = curve([[X0, 1.262], [-2.3, 1.268], [-1.0, 1.27], [0.92, 1.268], [1.6, 1.252], [2.1, 1.228], [2.26, 1.2], [2.32, 1.165], [X1, 1.1]]);
const hGlass = curve([[X0, 0.585], [-2.37, 0.625], [-2.28, 0.645], [-1.5, 0.652], [0, 0.655], [0.44, 0.648], [0.54, 0.6], [0.62, 0.4706], [0.8, 0.1794], [0.88, 0.05], [0.93, 0], [X1, 0]]);      // (the screen is a flat pane: the keys between 0.54 and 0.88 lie on one line)
// plan view: half the width, square with tight corners
const wBody = curve([[X0, 0.9], [-2.37, 0.95], [-2.3, 0.972], [-2.0, 0.976], [1.9, 0.976], [2.2, 0.965], [2.3, 0.93], [X1, 0.84]]);

const NS = 27;                 // points round half a cross-section, from the middle of the floor up the side to the middle of the roof
/** half a cross-section at x: NS × [z, y, dark]. 0..3 floor, 4..6 sill corner, 7..12 door side, 13 shoulder, 14 glass sill,
 *  15..19 glasshouse side, 20..22 roof corner, 23..26 roof (26 = centre line) */
function half(x, out) {
  const yb = yBot(x), belt = yBelt(x), hg = Math.max(0, hGlass(x)), wb = wBody(x), rb = 0.05, side0 = yb + rb;
  let arch = 0; for (const xw of [AXLE, -AXLE]) { const q = Math.abs(x - xw) / ARCH_A; if (q < 1) arch = Math.max(arch, WHEEL_R + ARCH_B * Math.pow(1 - Math.pow(q, ARCH_N), 1 / ARCH_N)); }
  const yo = Math.max(yb, arch);                                               // where the outer skin starts here (the arch lifts it)
  const zs = (y) => { const t = clamp((y - side0) / (belt - side0), 0, 1); return wb - 0.014 * (2 * t - 1) ** 2; };      // slab sides, barely bowed
  let k = 0; const put = (z, y, c = 0) => { const p = out[k++]; p[0] = z; p[1] = y; p[2] = c; };
  put(0, yb, 1); put(wb * 0.5, yb, 1); put(wb - 0.37, yb, 1); put(wb - 0.33, yo, 1);
  const z0 = zs(side0); put(z0 - rb, yo, arch > yb ? 1 : 0);
  put(z0 - rb + rb * 0.707, yo + rb - rb * 0.707); put(z0, yo + rb);
  const s0 = Math.max(side0, yo + rb);
  for (let i = 1; i <= 6; i++) { const y = s0 + (belt - 0.01 - s0) * (i / 6); put(zs(y), y); }
  // the shoulder: a ledge 5 cm deep, then the glasshouse, nearly upright, into a tight roof corner
  const wg0 = zs(belt) - 0.05, e = Math.min(0.01, hg * 0.2), rr = Math.min(0.07, hg * 0.45), wr = wg0 - 0.075 * (hg / 0.65), yr = belt + hg;
  put(zs(belt) - 0.008, belt); put(wg0, belt + e);
  for (let i = 1; i <= 5; i++) { const v = i / 5; put(wg0 - (wg0 - wr) * v, belt + e + (hg - rr - e) * v); }
  for (const a of [1 / 3, 2 / 3, 1]) put(wr - rr + rr * Math.cos((a * Math.PI) / 2), yr - rr + rr * Math.sin((a * Math.PI) / 2));
  const wt = wr - rr, bonnet = 1 - clamp(hg / 0.2, 0, 1);                       // the bonnet has a raised middle
  for (const q of [0.72, 0.45, 0.2, 0]) put(wt * q, yr + 0.012 * (1 - q * q) + bonnet * 0.03 * (1 - sstep(0.5, 0.8, q)));
  return out;
}
const blank = () => Array.from({ length: NS }, () => [0, 0, 0]);
const _h = blank();
/** how far out the body side is at (x, y) */
const zAt = (x, y) => { const yb = yBot(x), belt = yBelt(x), t = clamp((y - yb - 0.05) / (belt - yb - 0.05), 0, 1); return wBody(x) - 0.014 * (2 * t - 1) ** 2; };

/** the body: rings of the cross-section every 2.4 cm along the length, joined, closed flat at the nose and the tail */
function bodyGeometry(paint, under) {
  const xs = []; for (let x = X0; x < X1 - 0.012; x += 0.024) xs.push(x); xs.push(X1);
  const ring = 2 * NS - 2, pos = [], col = [], idx = [], cp = new THREE.Color(paint), cu = new THREE.Color(under);
  for (const x of xs) {
    half(x, _h);
    for (let j = 0; j < ring; j++) { const m = j < NS ? j : ring - j, p = _h[m], c = p[2] ? cu : cp; pos.push(x, p[1], j < NS ? p[0] : -p[0]); col.push(c.r, c.g, c.b); }
  }
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ring; j++) { const a = i * ring + j, b = i * ring + ((j + 1) % ring), c = a + ring, d = b + ring; idx.push(a, b, c, b, d, c); }
  for (const [i, flip] of [[0, false], [xs.length - 1, true]]) {             // the tail and the nose: flat faces with their own corners, so the edge stays crisp
    const base = pos.length / 3; let y = 0;
    for (let j = 0; j < ring; j++) { const q = (i * ring + j) * 3; pos.push(pos[q], pos[q + 1], pos[q + 2]); col.push(cp.r, cp.g, cp.b); y += pos[q + 1] / ring; }
    const c = pos.length / 3; pos.push(xs[i], y, 0); col.push(cp.r, cp.g, cp.b);
    for (let j = 0; j < ring; j++) { const a = base + j, b = base + ((j + 1) % ring); if (flip) idx.push(c, a, b); else idx.push(c, b, a); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  // make sure it faces outward: the door skin on the right-hand side must look to +z
  const probe = Math.floor(xs.length / 2) * ring + 10; if (g.attributes.normal.getZ(probe) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } g.computeVertexNormals(); }
  return g;
}
/** a patch of the body's surface, between stations xa and xb and between points ia and ib of the cross-section, lifted `lift` off it; both sides unless `side` is given */
function skin(xa, xb, ia, ib, lift = 0.006, nr = 6, side = 0) {
  const nx = Math.max(1, Math.round(Math.abs(xb - xa) / 0.03)), pos = [], idx = [], at = (f) => { const i = Math.min(NS - 2, Math.floor(f)), k = f - i; return [_h[i][0] + (_h[i + 1][0] - _h[i][0]) * k, _h[i][1] + (_h[i + 1][1] - _h[i][1]) * k]; };
  for (const s of side ? [side] : [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= nx; i++) {
      const x = xa + ((xb - xa) * i) / nx; half(x, _h);
      for (let j = 0; j <= nr; j++) {
        const f = ia + ((ib - ia) * j) / nr, p = at(f), a = at(Math.max(0, f - 0.3)), b = at(Math.min(NS - 1, f + 0.3));
        let nz = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nz, ny) || 1; nz /= l; ny /= l;
        pos.push(x, p[1] + ny * lift, s * (p[0] + nz * lift));
      }
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < nr; j++) { const a = base + i * (nr + 1) + j, b = a + 1, c = a + nr + 1, d = c + 1; if (s > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const box = (w, h, d, x, y, z, rz = 0, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
/** a disc or tube whose axis runs along x (lamps, the spare's hub): radius r, length l, centred at (x, y, z) */
const drum = (r, l, x, y, z, seg = 24) => { const g = new THREE.CylinderGeometry(r, r, l, seg); g.rotateZ(Math.PI / 2); g.translate(x, y, z); return g; };
const ringX = (r, tube, x, y, z) => { const g = new THREE.TorusGeometry(r, tube, 10, 32); g.rotateY(Math.PI / 2); g.translate(x, y, z); return g; };
/** a tube along x (side steps, rack bars) */
const tubeX = (r, x0, x1, y, z, seg = 12) => drum(r, x1 - x0, (x0 + x1) / 2, y, z, seg);
const join = (list) => mergeGeometries(list.map((g) => { const q = g.index ? g.toNonIndexed() : g; q.deleteAttribute('uv'); if (q.attributes.color) q.deleteAttribute('color'); return q; }), false);
const both = (f) => [f(1), f(-1)];

/** one wheel: an all-terrain tyre, a 20 inch alloy with five split spokes, its hub, nuts and the brake disc behind. `out` = the side that shows */
function wheel(mats, out, turn) {
  const wb = new Builder();
  wb.pushM(turn);                                                              // lathes turn round y: lay that along the axle
  wb.use('matte').lathe(0x101214, [[0.262, -0.125], [0.3, -0.142], [0.368, -0.138], [0.397, -0.12], [0.405, -0.094], [0.397, -0.088], [0.397, -0.07], [0.405, -0.064], [0.405, -0.012], [0.397, -0.007], [0.397, 0.007], [0.405, 0.012], [0.405, 0.064], [0.397, 0.07], [0.397, 0.088], [0.405, 0.094], [0.397, 0.12], [0.368, 0.138], [0.3, 0.142], [0.262, 0.125]], 0, 0, 0, 40);
  wb.use('satin').lathe(0x15181b, [[0.265, 0.12], [0.25, 0.115], [0.238, 0], [0.25, -0.115], [0.265, -0.12]], 0, 0, 0, 36);          // the rim's barrel, gloss black, seen from inside
  wb.use('metal').torus(0xc5ccd1, 0.257, 0.009, 0, 0.113 * out, 0, 8, 40);                                                        // its machined lip
  wb.pop();
  // split spokes: two bright bars each, from the hub out to the rim, dished towards the face
  wb.use('metal'); for (let k = 0; k < 5; k++) for (const o of [-0.17, 0.17]) { const a = (k / 5) * Math.PI * 2 + o, a0 = (k / 5) * Math.PI * 2 + o * 0.3; wb.rod(0xcfd5d9, 0.017, [Math.cos(a0) * 0.06, Math.sin(a0) * 0.06, out * 0.062], [Math.cos(a) * 0.25, Math.sin(a) * 0.25, out * 0.104], 6); }
  wb.use('satin').rod(0x15181b, 0.075, [0, 0, out * 0.02], [0, 0, out * 0.078], 18); wb.use('metal').rod(0xb9c0c5, 0.04, [0, 0, out * 0.078], [0, 0, out * 0.088], 14);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.63; wb.use('metal').rod(0x9aa2a8, 0.011, [Math.cos(a) * 0.057, Math.sin(a) * 0.057, out * 0.076], [Math.cos(a) * 0.057, Math.sin(a) * 0.057, out * 0.092], 6); }
  wb.use('metal').rod(0x71787d, 0.185, [0, 0, out * 0.0], [0, 0, out * 0.016], 28);                                           // brake disc
  return wb.build(mats, { cast: true, receive: false });
}

export function makeDefender(mats, { paint = 0x0d1012 } = {}) {
  const group = new THREE.Group(); group.name = 'intro-car';
  const body = new THREE.Group(); group.add(body);                      // everything that rides on the springs
  const M = {
    // (the scene's reflections are kept low for the buildings; a black car lives on its reflections, so it carries more of them)
    paint: new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.72, roughness: 0.27, clearcoat: 1, clearcoatRoughness: 0.025, envMapIntensity: 4.6 }),
    plain: new THREE.MeshPhysicalMaterial({ color: paint, metalness: 0.72, roughness: 0.27, clearcoat: 1, clearcoatRoughness: 0.025, envMapIntensity: 4.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x33434d, metalness: 0.55, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 5.5 }),     // smoky glass: it reads against the black body
    trim: new THREE.MeshStandardMaterial({ color: 0x353a3e, roughness: 0.82, metalness: 0.04, envMapIntensity: 1.6 }),     // the grained cladding: a shade lighter than the paint
    black: new THREE.MeshStandardMaterial({ color: 0x0b0d0f, roughness: 0.22, metalness: 0.6, envMapIntensity: 4 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xc9cfd3, roughness: 0.28, metalness: 0.95, envMapIntensity: 3 }),
    head: new THREE.MeshStandardMaterial({ color: 0xf2f6f8, roughness: 0.1, metalness: 0.2, emissive: 0xfff6e4, emissiveIntensity: 2.2 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0x1a2227, metalness: 0.6, roughness: 0.05, clearcoat: 1, envMapIntensity: 2.4, emissive: 0xdfeeff, emissiveIntensity: 0.25 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x8c0f0c, roughness: 0.2, metalness: 0.1, emissive: 0xff1c12, emissiveIntensity: 0.8 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xf2a23a, roughness: 0.3, emissive: 0xff9a1e, emissiveIntensity: 0.4 }),
    badge: new THREE.MeshStandardMaterial({ color: 0x0f3b2a, roughness: 0.3, metalness: 0.4 }),
  };
  const mesh = (g, m, cast = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = false; body.add(o); return o; };
  mesh(bodyGeometry(paint, 0x08090a), M.paint);

  /* ───── glass ───── */
  mesh(join([
    skin(0.56, 0.872, 20.4, 26, 0.008, 8),                                                     // windscreen
    skin(-0.4, 0.84, 14.35, 18.85, 0.007), skin(-1.42, -0.5, 14.35, 18.85, 0.007), skin(-2.3, -1.5, 14.35, 18.85, 0.007),      // side windows
    skin(-0.5, -0.4, 14.35, 18.85, 0.008), skin(-1.5, -1.42, 14.35, 18.85, 0.008),            // B and C pillars, gloss black
    skin(-2.02, -0.6, 20.25, 22.55, 0.006, 3),                                                // the alpine windows along the roof's shoulder
    skin(-1.05, 0.34, 23.35, 26, 0.006, 4),                                                   // the glass roof
    box(0.02, 0.47, 1.34, X0 - 0.004, 1.57, 0),                                               // tail door window
  ]), M.glass);
  /* ───── cladding, grained dark grey: sills, the flares round both arches, both bumpers; and the rest of the dark fittings ───── */
  mesh(join([
    skin(X0 + 0.012, X1 - 0.012, 4, 8.3, 0.02, 5),
    skin(0.865, 0.975, 8.75, 11.35, 0.012, 4),                                                // the vent in each front wing
    skin(0.88, 0.99, 22.6, 26, 0.012, 4),                                                     // scuttle under the windscreen
    box(0.07, 0.15, 1.14, X1 + 0.012, 0.665, 0),                                              // the big lower air intake
    ...both((s) => box(0.06, 0.12, 0.15, X1 + 0.006, 0.675, s * 0.71)),                       // fog-lamp pockets in the bumper corners
    box(0.07, 0.2, 1.84, X0 - 0.012, 0.77, 0),                                                // rear bumper
    ...both((s) => box(0.03, 0.27, 0.3, AXLE - 0.64, 0.45, s * 0.845)), ...both((s) => box(0.03, 0.27, 0.3, -AXLE - 0.64, 0.45, s * 0.845)),      // mud flaps
    ...both((s) => box(0.1, 0.05, 0.14, 0.8, 1.335, s * 1.02)),                               // mirror stalks
    ...[-0.75, 0.0, 0.7].flatMap((x) => both((s) => box(0.06, 0.06, 0.1, x, 0.43, s * 0.985))),   // side-step brackets
    box(0.34, 0.02, 0.02, 0.94, 1.285, 0.3, 0, 0.45), box(0.34, 0.02, 0.02, 0.94, 1.285, -0.32, 0, 0.45),      // wipers at rest
  ]), M.trim);
  // door shuts and the fuel flap: hairlines that catch the light
  mesh(join([skin(0.836, 0.846, 8.3, 12.95, 0.003, 5), skin(-0.455, -0.445, 8.3, 12.95, 0.003, 5), skin(-1.465, -1.455, 8.3, 12.95, 0.003, 5)]), M.black, false);
  /* ───── gloss black fittings: mirrors, door handles, lamp housings, the grille slot, tail lamp bars, roof rack frame, aerial ───── */
  const rackY = 2.04, rx0 = -2.05, rx1 = 0.3, rz = 0.64;
  mesh(join([
    ...both((s) => box(0.11, 0.2, 0.24, 0.84, 1.4, s * 1.115)),
    ...[-0.27, -1.27].flatMap((x) => both((s) => box(0.2, 0.03, 0.04, x, 1.13, s * (zAt(x, 1.13) + 0.018)))),
    ...both((s) => box(0.05, 0.225, 0.335, X1 + 0.004, 0.965, s * 0.665)),                    // headlamp housings
    box(0.04, 0.075, 0.99, X1 + 0.004, 0.975, 0),                                             // the grille slot between them
    ...both((s) => box(0.035, 0.56, 0.165, X0 - 0.006, 1.25, s * 0.785)),                     // tail lamp bars
    box(0.05, 0.03, 1.3, X0 + 0.03, 1.862, 0),                                                // the lip over the tail door
    tubeX(0.02, rx0, rx1, rackY, rz), tubeX(0.02, rx0, rx1, rackY, -rz), box(0.04, 0.04, rz * 2, rx0, rackY, 0), box(0.04, 0.04, rz * 2, rx1, rackY, 0),
    ...[rx0 + 0.12, (rx0 + rx1) / 2, rx1 - 0.12].flatMap((x) => both((s) => box(0.07, 0.11, 0.05, x, rackY - 0.06, s * rz))),
    box(0.2, 0.055, 0.05, -2.18, 1.955, 0, 0.3),
  ]), M.black);
  /* ───── bright work: skid plates, side steps, rack slats, lamp rims ───── */
  mesh(join([
    box(0.16, 0.085, 0.86, X1 - 0.03, 0.55, 0, -0.35), ...both((s) => box(0.03, 0.05, 0.07, X1 + 0.05, 0.575, s * 0.24)),       // front skid plate and its tow-eye covers
    box(0.14, 0.07, 0.8, X0 + 0.03, 0.665, 0, 0.3),
    ...both((s) => tubeX(0.036, -0.87, 0.87, 0.41, s * 1.03)),
    ...Array.from({ length: 9 }, (_, i) => box(0.075, 0.016, rz * 2 - 0.05, rx0 + 0.2 + (i * (rx1 - rx0 - 0.4)) / 8, rackY, 0)),
    ...both((s) => ringX(0.094, 0.009, X1 + 0.03, 0.965, s * 0.715)),
  ]), M.silver);
  /* ───── lamps ───── */
  mesh(join([...both((s) => ringX(0.074, 0.012, X1 + 0.034, 0.965, s * 0.715)),              // the ring of light round each main lamp
    ...both((s) => box(0.03, 0.05, 0.055, X1 + 0.03, 1.01, s * 0.565)), ...both((s) => box(0.03, 0.05, 0.055, X1 + 0.03, 0.925, s * 0.565)),
    ...both((s) => box(0.02, 0.035, 0.07, X1 + 0.04, 0.675, s * 0.71))]), M.head, false);
  mesh(join(both((s) => drum(0.062, 0.03, X1 + 0.028, 0.965, s * 0.715))), M.lens, false);
  mesh(join([...both((s) => box(0.03, 0.105, 0.105, X0 - 0.024, 1.4, s * 0.785)), ...both((s) => box(0.03, 0.105, 0.105, X0 - 0.024, 1.26, s * 0.785)),
    box(0.02, 0.018, 0.5, X0 + 0.0, 1.853, 0), ...both((s) => box(0.02, 0.04, 0.16, X0 - 0.05, 0.8, s * 0.72))]), M.tail, false);
  mesh(join([...both((s) => box(0.03, 0.06, 0.06, X0 - 0.024, 1.125, s * 0.785)), ...both((s) => box(0.04, 0.03, 0.05, 0.87, 1.4, s * 1.24))]), M.amber, false);
  mesh(join([(() => { const g = new THREE.CircleGeometry(0.05, 24); g.scale(1.75, 0.82, 1); g.rotateY(Math.PI / 2); g.translate(X1 + 0.026, 0.975, 0); return g; })()]), M.badge, false);
  // lettering on the bonnet's leading edge and on the tail door, number plates
  const word = canvasTex(512, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#e9edf0'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.font = '600 44px "IBM Plex Sans Condensed", "Arial Narrow", Arial, sans-serif'; const t = 'DEFENDER', sp = 56, x0 = w / 2 - (sp * (t.length - 1)) / 2; for (let i = 0; i < t.length; i++) g.fillText(t[i], x0 + i * sp, h / 2 + 2); }, { repeat: false });
  const wordMat = new THREE.MeshStandardMaterial({ map: word, transparent: true, alphaTest: 0.35, metalness: 0.8, roughness: 0.3, color: 0xe4e8ea });
  { const top = (x) => half(x, _h)[26][1], xa = X1 - 0.003, xb = X1 - 0.05, ya = top(xa), dy = top(xb) - ya, len = Math.hypot(xa - xb, dy), hgt = Math.min(0.07, len * 0.92);      // it lies on the slope of the leading edge
    const f = new THREE.Mesh(new THREE.PlaneGeometry(hgt * 8, hgt), wordMat); f.position.set((xa + xb) / 2 + (dy / len) * 0.006, ya + dy / 2 + ((xa - xb) / len) * 0.006, 0); f.rotation.set(-Math.atan2(xa - xb, dy), Math.PI / 2, 0, 'YXZ'); body.add(f);
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.0425), wordMat); r.position.set(X0 - 0.002, 0.96, 0.6); r.rotation.y = -Math.PI / 2; body.add(r); }
  const plateTex = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#f4f5f3'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1b2227'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = '#1b2227'; g.textBaseline = 'middle'; g.font = '600 20px Arial, sans-serif'; g.fillText('UAQ', 16, 34); g.font = '700 40px Arial, sans-serif'; g.textAlign = 'right'; g.fillText('35721', w - 16, 35); }, { repeat: false });
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5 });
  for (const [x, y, z, ry, w] of [[X1 + 0.05, 0.8, 0, Math.PI / 2, 0.5], [X0 - 0.004, 0.96, -0.6, -Math.PI / 2, 0.36]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), plateMat); p.position.set(x, y, z); p.rotation.y = ry; body.add(p); }
  mesh(join([box(0.02, 0.145, 0.52, X1 + 0.038, 0.8, 0)]), M.trim, false);                     // the plate's plinth on the bumper
  // the spare wheel on the tail door
  { const sp = new THREE.Group(); sp.rotation.y = -Math.PI / 2; sp.position.set(X0 - 0.15, 1.13, 0); sp.add(wheel(mats, 1, new THREE.Matrix4().makeRotationX(Math.PI / 2))); body.add(sp); }
  // its shadow where it meets the road: soft, dark under the floor
  const shadowTex = canvasTex(128, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.filter = 'blur(7px)'; g.fillStyle = 'rgba(0,0,0,.95)'; g.beginPath(); g.roundRect(18, 14, w - 36, h - 28, 12); g.fill(); g.filter = 'none'; }, { repeat: false, srgb: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.6, depthWrite: false, color: 0x05080a }));
  shadow.position.y = 0.012; shadow.renderOrder = 2; group.add(shadow);

  // road wheels: they turn on their own axis as the car moves; the calipers stay put
  const wheels = [], turn = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  for (const x of [AXLE, -AXLE]) for (const s of [1, -1]) {
    const w = new THREE.Group(); w.position.set(x, WHEEL_R, s * TRACK); w.add(wheel(mats, s, turn)); group.add(w); wheels.push(w);
    const cb = new Builder(); cb.use('satin').boxC(0x1b1d1f, 0.15, 0.085, 0.05, x - 0.12, WHEEL_R + 0.1, s * (TRACK + 0.025), 0, 0, 0.7); group.add(cb.build(mats, { cast: false, receive: false }));
  }
  let spin = 0, pitch = 0, lamp = 0.8;
  return {
    group, length: X1 - X0 + 0.28, axle: AXLE, track: TRACK,
    /** the car has moved d metres forward: turn the wheels */
    roll(d) { spin -= d / WHEEL_R; for (const w of wheels) w.rotation.z = spin; },
    /** how it sits on its springs: `acc` in m/s² (braking dips the nose, pulling away lifts it); brake lights come on when it slows */
    ride(acc, dt) {
      pitch += (clamp(acc * 0.0052, -0.02, 0.014) - pitch) * Math.min(1, dt * 5); lamp += ((acc < -0.6 ? 3 : 0.8) - lamp) * Math.min(1, dt * 9);
      body.rotation.z = pitch; M.tail.emissiveIntensity = lamp;
    },
    dispose() { group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); for (const k in M) M[k].dispose(); wordMat.dispose(); word.dispose(); plateMat.dispose(); plateTex.dispose(); shadowTex.dispose(); },
  };
}
