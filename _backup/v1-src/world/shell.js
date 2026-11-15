// Building shells. Every building is made in two parts:
//   low  – floor and walls up to the cut line (always there)
//   high – upper walls and roof (lifts away and fades when the area opens)
// The cut line gets a dark cap, the way a wall is drawn in section on a plan.
import * as THREE from 'three';
import { C, shade } from './kit.js';

export const CUT = 1.3;

/** split a wall run [0,len] around door openings [{at,w}] → solid spans */
function spans(len, doors = []) {
  const ds = doors.map((d) => [Math.max(0, d.at - d.w / 2), Math.min(len, d.at + d.w / 2)]).sort((a, b) => a[0] - b[0]);
  const out = []; let p = 0;
  for (const [a, b] of ds) { if (a > p + 0.02) out.push([p, a]); p = Math.max(p, b); }
  if (len > p + 0.02) out.push([p, len]);
  return out;
}

/** wall from (x0,z0) to (x1,z1): low part + cap in `lo`, upper part in `hi` (if given) */
export function wallRun(lo, hi, x0, z0, x1, z1, { t = 0.4, h = 5, cut = CUT, hex = C.clay, doors = [], doorH = 2.5, base = 0.12, capHex = C.poche, glass = false, glassHex = C.glass, mullion = 0 } = {}) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz); if (len < 0.05) return;
  const ux = dx / len, uz = dz / len;
  const seg = (b, a0, a1, y0, y1, c, tt = t, bucket = 'matte') => { if (a1 - a0 < 0.02 || y1 - y0 < 0.01) return; b.use(bucket).wall(c, x0 + ux * a0, z0 + uz * a0, x0 + ux * a1, z0 + uz * a1, tt, y0, y1); };
  for (const [a0, a1] of spans(len, doors)) {
    if (glass) {
      seg(lo, a0, a1, base, base + 0.28, hex);                                   // sill
      seg(lo, a0, a1, base + 0.28, cut, glassHex, 0.08, 'glass');
      seg(lo, a0, a1, cut, cut + 0.05, capHex, 0.14);
      if (mullion) for (let s = a0; s <= a1 + 0.01; s += mullion) seg(lo, Math.max(a0, s - 0.05), Math.min(a1, s + 0.05), base, cut, C.alu, 0.16, 'satin');
    } else {
      seg(lo, a0, a1, base, cut, hex);
      seg(lo, a0, a1, cut, cut + 0.05, capHex, Math.max(0.08, t - 0.07));
    }
    if (hi && h > cut) {
      if (glass) {
        seg(hi, a0, a1, cut, h - 0.5, null, 0.1, 'window'); seg(hi, a0, a1, h - 0.5, h, hex);
        if (mullion) for (let s = a0; s <= a1 + 0.01; s += mullion) seg(hi, Math.max(a0, s - 0.06), Math.min(a1, s + 0.06), cut, h - 0.5, C.alu, 0.2, 'satin');
      } else seg(hi, a0, a1, cut, h, hex);
    }
  }
  if (hi) for (const d of doors) { const a0 = Math.max(0, d.at - d.w / 2), a1 = Math.min(len, d.at + d.w / 2), dh = d.h || doorH; if (h > dh) seg(hi, a0, a1, Math.max(cut, dh), h, hex); if (d.shut !== false) seg(hi, a0, a1, base, dh, d.hex || C.steel, 0.12, 'satin'); }
}

/** rectangular hall. sides: n (z0), s (z1), w (x0), e (x1); doors/windows per side measured from the west or north end */
export function hall(lo, hi, o) {
  const { x0, z0, x1, z1, h = 8, cut = CUT, t = 0.5, wall = C.clay, roof = C.roof, floor = C.floorHall, floorMat = 'floorTile', doors = {}, windows = {}, skip = {}, parapet = 0.7, roofKit = true, seed = 1, eave = 0.6, strip = true } = o;
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  lo.use(floorMat).box(floor, w, 0.12, d, cx, 0, cz);
  const side = (k, ax, az, bx, bz) => { if (!skip[k]) wallRun(lo, hi, ax, az, bx, bz, { t, h, cut, hex: wall, doors: doors[k] || [], doorH: 4.2 }); };
  side('n', x0, z0 + t / 2, x1, z0 + t / 2); side('s', x0, z1 - t / 2, x1, z1 - t / 2);
  side('w', x0 + t / 2, z0, x0 + t / 2, z1); side('e', x1 - t / 2, z0, x1 - t / 2, z1);
  if (!hi) return;
  // high-level strip windows
  const win = (k, ax, az, bx, bz, nx, nz) => {
    const spec = windows[k]; if (!spec) return;
    const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len, n = spec.n || Math.floor(len / 7), ww = spec.w || 4.2, y = spec.y ?? h * 0.56, hh = spec.h || 1.3;
    for (let i = 0; i < n; i++) { const a = ((i + 0.5) / n) * len; hi.use('window').box(null, ww, hh, 0.16, ax + ux * a + nx * 0.06, y, az + uz * a + nz * 0.06, -Math.atan2(uz, ux)); }
  };
  win('n', x0, z0, x1, z0, 0, -1); win('s', x0, z1, x1, z1, 0, 1); win('w', x0, z0, x0, z1, -1, 0); win('e', x1, z0, x1, z1, 1, 0);
  // roof slab, parapet and a light strip under the eave (it glows at night)
  hi.use('matte').box(roof, w + eave * 2, 0.4, d + eave * 2, cx, h, cz);
  if (parapet) {
    const p = shade(roof, 1.02), pt = 0.35, y = h + 0.4;
    hi.box(p, w + eave * 2, parapet, pt, cx, y, z0 - eave + pt / 2); hi.box(p, w + eave * 2, parapet, pt, cx, y, z1 + eave - pt / 2);
    hi.box(p, pt, parapet, d + eave * 2, x0 - eave + pt / 2, y, cz); hi.box(p, pt, parapet, d + eave * 2, x1 + eave - pt / 2, y, cz);
  }
  // façade: a blue band under the eave, piers every few metres, a canopy over each small door
  if (o.band !== false) {
    const bh = 0.55, by = h - 1.5, bc = o.bandHex || 0x2a5c7d;
    hi.use('matte').box(bc, w + 0.06, bh, 0.06, cx, by, z0 - 0.02); hi.box(bc, w + 0.06, bh, 0.06, cx, by, z1 + 0.02); hi.box(bc, 0.06, bh, d + 0.06, x0 - 0.02, by, cz); hi.box(bc, 0.06, bh, d + 0.06, x1 + 0.02, by, cz);
    const pier = shade(wall, 0.93);
    for (let x = x0 + 4; x < x1 - 2; x += 8) { hi.box(pier, 0.5, h - cut, 0.14, x, cut, z0 - 0.05); hi.box(pier, 0.5, h - cut, 0.14, x, cut, z1 + 0.05); lo.use('matte').box(pier, 0.5, cut - 0.12, 0.14, x, 0.12, z0 - 0.05); lo.box(pier, 0.5, cut - 0.12, 0.14, x, 0.12, z1 + 0.05); hi.use('matte'); }
    for (let z = z0 + 4; z < z1 - 2; z += 8) { hi.box(pier, 0.14, h - cut, 0.5, x0 - 0.05, cut, z); hi.box(pier, 0.14, h - cut, 0.5, x1 + 0.05, cut, z); lo.use('matte').box(pier, 0.14, cut - 0.12, 0.5, x0 - 0.05, 0.12, z); lo.box(pier, 0.14, cut - 0.12, 0.5, x1 + 0.05, 0.12, z); hi.use('matte'); }
    const can = (k, px, pz, nx, nz, len) => { for (const dd of doors[k] || []) { if ((dd.h || 4.2) > 3) continue; const a = dd.at; hi.use('matte').box(0x2a5c7d, nx ? 1.4 : dd.w + 1, 0.14, nz ? 1.4 : dd.w + 1, px + (nz ? a : 0) + nx * 0.7, 2.75, pz + (nx ? a : 0) + nz * 0.7); } };
    can('n', x0, z0, 0, -1); can('s', x0, z1, 0, 1); can('w', x0, z0, -1, 0); can('e', x1, z0, 1, 0);
  }
  if (strip) { hi.use('glow'); if (!skip.s) hi.box(C.led, w * 0.86, 0.12, 0.12, cx, h - 0.32, z1 + 0.1); if (!skip.w) hi.box(C.led, 0.12, 0.12, d * 0.86, x0 - 0.1, h - 0.32, cz); }
  if (roofKit) roofGear(hi, x0 + 3, z0 + 3, x1 - 3, z1 - 3, h + 0.4, seed);
}

/** rooftop plant: skylights, condensers, vents */
export function roofGear(hi, x0, z0, x1, z1, y, seed = 1) {
  let s = seed * 9301 + 49297; const R = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const w = x1 - x0, d = z1 - z0, n = Math.max(3, Math.round((w * d) / 260));
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * w, z = z0 + R() * d, k = R();
    if (k < 0.45) { hi.use('matte').box(C.roofDark, 3.4, 0.35, 2.2, x, y, z); hi.use('window').box(null, 3, 0.12, 1.8, x, y + 0.35, z); }
    else if (k < 0.75) { hi.use('satin').box(C.steel, 2.2, 1.3, 1.4, x, y, z); hi.use('matte').cyl(C.steelDark, 0.5, 0.1, x, y + 1.3, z, 14); }
    else { hi.use('satin').cyl(C.alu, 0.55, 0.9, x, y, z, 14); hi.cyl(C.steelDark, 0.75, 0.12, x, y + 0.9, z, 14); }
  }
}

/** soft contact shadow around footprints: rects [{x0,z0,x1,z1}], discs [{x,z,r}] */
export function aoSkirts(rects = [], discs = [], reach = 5.5, strength = 0.34) {
  const pos = [], col = [], idx = [];
  const quad = (a, b, c, d, aa, ab, ac, ad) => { const k = pos.length / 3; pos.push(...a, ...b, ...c, ...d); col.push(1, 1, 1, aa, 1, 1, 1, ab, 1, 1, 1, ac, 1, 1, 1, ad); idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  const y = 0.1, s = strength;
  for (const r of rects) {
    const { x0, z0, x1, z1 } = r, e = r.reach || reach, X0 = x0 - e, X1 = x1 + e, Z0 = z0 - e, Z1 = z1 + e;
    quad([x0, y, z0], [x1, y, z0], [x1, y, Z0], [x0, y, Z0], s, s, 0, 0); quad([x1, y, z1], [x0, y, z1], [x0, y, Z1], [x1, y, Z1], s, s, 0, 0);
    quad([x0, y, z1], [x0, y, z0], [X0, y, z0], [X0, y, z1], s, s, 0, 0); quad([x1, y, z0], [x1, y, z1], [X1, y, z1], [X1, y, z0], s, s, 0, 0);
    quad([x0, y, z0], [x0, y, Z0], [X0, y, Z0], [X0, y, z0], s, 0, 0, 0); quad([x1, y, z0], [X1, y, z0], [X1, y, Z0], [x1, y, Z0], s, 0, 0, 0);
    quad([x1, y, z1], [x1, y, Z1], [X1, y, Z1], [X1, y, z1], s, 0, 0, 0); quad([x0, y, z1], [X0, y, z1], [X0, y, Z1], [x0, y, Z1], s, 0, 0, 0);
  }
  for (const d of discs) {
    const n = 40, e = d.reach || reach;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2;
      quad([d.x + Math.cos(a) * d.r, y, d.z + Math.sin(a) * d.r], [d.x + Math.cos(b) * d.r, y, d.z + Math.sin(b) * d.r], [d.x + Math.cos(b) * (d.r + e), y, d.z + Math.sin(b) * (d.r + e)], [d.x + Math.cos(a) * (d.r + e), y, d.z + Math.sin(a) * (d.r + e)], s, s, 0, 0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 4));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0x1b2f3d }));
  m.renderOrder = 1; m.matrixAutoUpdate = false; m.name = 'ao';
  return m;
}
