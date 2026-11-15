// Hatchery, plant-room, lab and office equipment, drawn from primitives.
// Every function takes the builder plus a position on the floor and returns the
// bounding box [x0,y0,z0,x1,y1,z1] that the picker uses.
import { C, shade, TAU, DEG } from './kit.js';

const F = 0.12; // finished floor level inside buildings

/* ───────────── tanks ───────────── */
export function roundTank(b, x, z, r, h, { wall = C.grp, water = C.waterTank, level = 0.86, rim = 0.14, y = F, seg = 30, pipe = C.pipeSea, standpipe = true, inlet = true } = {}) {
  b.use('satin').cyl(wall, r, h, x, y, z, seg, r, true);
  b.cylIn(shade(wall, 0.72), r - rim, h - 0.06, x, y + 0.06, z, seg);
  b.ring(shade(wall, 1.06), r, r - rim, x, y + h, z, seg);
  b.use('matte').disc(shade(wall, 0.5), r - rim, x, y + 0.07, z, seg);
  b.use('water').disc(water, r - rim, x, y + h * level, z, seg);
  if (standpipe) { b.use('satin').cyl(C.pipeDrain, Math.max(0.07, r * 0.045), h * level + 0.35, x, y, z, 8); b.cyl(C.steelDark, Math.max(0.12, r * 0.09), 0.05, x, y + h * level + 0.35, z, 10); }
  if (inlet) b.use('satin').pipe(pipe, Math.max(0.05, r * 0.03), [[x + r + 0.5, y, z + r * 0.3], [x + r + 0.5, y + h + 0.35, z + r * 0.3], [x + r * 0.62, y + h + 0.35, z + r * 0.3], [x + r * 0.62, y + h * level + 0.1, z + r * 0.3]], 8);
  return [x - r, 0, z - r, x + r, y + h, z + r];
}
/** conical-bottom larval tank on legs */
export function coneTank(b, x, z, r, { hCyl = 1.5, hCone = 0.9, leg = 0.35, wall = C.grp, water = C.waterGreen, y = F, seg = 26 } = {}) {
  const y0 = y + leg;
  b.use('satin');
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.6; b.cyl(C.steelDark, 0.05, leg + hCone, x + Math.cos(a) * r * 0.92, y, z + Math.sin(a) * r * 0.92, 6); }
  b.cyl(wall, 0.16, hCone, x, y0, z, seg, r, true);
  b.cyl(wall, r, hCyl, x, y0 + hCone, z, seg, r, true);
  b.cylIn(shade(wall, 0.74), r - 0.07, hCyl - 0.04, x, y0 + hCone + 0.04, z, seg);
  b.ring(shade(wall, 1.06), r + 0.03, r - 0.08, x, y0 + hCone + hCyl, z, seg);
  b.cyl(C.pipeDrain, 0.07, leg, x, y, z, 8);
  b.use('water').disc(water, r - 0.07, x, y0 + hCone + hCyl * 0.88, z, seg);
  b.use('satin').cyl(C.alu, 0.07, hCyl * 0.9, x, y0 + hCone, z, 8);            // banjo screen / standpipe
  b.pipe(C.pipeAir, 0.03, [[x + r * 0.5, y0 + hCone + hCyl + 0.5, z], [x + r * 0.5, y0 + hCone + hCyl * 0.4, z]], 6);
  return [x - r, 0, z - r, x + r, y0 + hCone + hCyl, z + r];
}
/** long nursery raceway with inlet manifold and outlet screen */
export function raceway(b, x0, z0, x1, z1, { h = 1.05, wall = C.grpBlue, water = C.waterTank, y = F, t = 0.14 } = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, long = w > d;
  b.use('satin');
  b.box(wall, w, h, t, cx, y, z0 + t / 2); b.box(wall, w, h, t, cx, y, z1 - t / 2);
  b.box(wall, t, h, d, x0 + t / 2, y, cz); b.box(wall, t, h, d, x1 - t / 2, y, cz);
  b.use('matte').box(shade(wall, 0.55), w - t, 0.06, d - t, cx, y, cz);
  b.use('water').quad(water, w - t * 2, d - t * 2, cx, y + h * 0.84, cz);
  b.use('satin');
  if (long) {
    b.pipe(C.pipeSea, 0.07, [[x0 - 0.5, y + h + 0.25, z0 + 0.4], [x0 - 0.5, y + h + 0.25, z1 - 0.4]], 8);
    for (let i = 0; i < 3; i++) { const z = z0 + ((i + 0.5) / 3) * d; b.pipe(C.pipeSea, 0.04, [[x0 - 0.5, y + h + 0.25, z], [x0 + 0.5, y + h + 0.25, z], [x0 + 0.5, y + h * 0.7, z]], 6); }
    b.box(C.alu, 0.08, h * 0.95, d - t * 2, x1 - 1.2, y, cz);                 // outlet screen
    b.cyl(C.pipeDrain, 0.12, 0.6, x1 + 0.2, y, cz, 8);
  } else {
    b.pipe(C.pipeSea, 0.07, [[x0 + 0.4, y + h + 0.25, z0 - 0.5], [x1 - 0.4, y + h + 0.25, z0 - 0.5]], 8);
    b.box(C.alu, w - t * 2, h * 0.95, 0.08, cx, y, z1 - 1.2);
  }
  return [x0, 0, z0, x1, y + h, z1];
}
/** rectangular GRP tank (older Phase 1 units, incubators) */
export function squareTank(b, x, z, w, d, h, { wall = C.grp, water = C.waterTank, y = F } = {}) {
  const t = 0.1;
  b.use('satin');
  b.box(wall, w, h, t, x, y, z - d / 2 + t / 2); b.box(wall, w, h, t, x, y, z + d / 2 - t / 2);
  b.box(wall, t, h, d, x - w / 2 + t / 2, y, z); b.box(wall, t, h, d, x + w / 2 - t / 2, y, z);
  b.use('matte').box(shade(wall, 0.55), w - t, 0.05, d - t, x, y, z);
  b.use('water').quad(water, w - t * 2, d - t * 2, x, y + h * 0.85, z);
  return [x - w / 2, 0, z - d / 2, x + w / 2, y + h, z + d / 2];
}

/* ───────────── live feed ───────────── */
export function photobioreactor(b, x, z, hex, { h = 2.6, r = 0.3, y = F } = {}) {
  b.use('satin').cyl(C.steelDark, r + 0.07, 0.22, x, y, z, 14);
  b.use('glow').cyl(hex, r - 0.04, h - 0.1, x, y + 0.22, z, 12);
  b.use('glass').cyl(C.glass, r, h, x, y + 0.22, z, 14, r, true);
  b.use('satin').cyl(C.steel, r + 0.04, 0.14, x, y + 0.22 + h, z, 14);
  return [x - r, 0, z - r, x + r, y + h + 0.4, z + r];
}
/** conical culture vessel on a stand (rotifers, Artemia, copepods) */
export function cultureCone(b, x, z, hex, { r = 0.75, h = 1.6, y = F } = {}) {
  b.use('satin');
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; b.cyl(C.steelDark, 0.04, 1.0, x + Math.cos(a) * r * 0.85, y, z + Math.sin(a) * r * 0.85, 6); }
  b.torus(C.steelDark, r * 0.9, 0.04, x, y + 1.0, z, 6, 20);
  b.use('glow').cyl(hex, 0.1, 0.7, x, y + 0.42, z, 16, r * 0.86, false);
  b.cyl(hex, r * 0.86, h - 0.9, x, y + 1.12, z, 16);
  b.use('glass').cyl(C.glass, 0.12, 0.72, x, y + 0.4, z, 16, r, true);
  b.cyl(C.glass, r, h - 0.7, x, y + 1.12, z, 16, r, true);
  b.use('satin').cyl(C.pipeDrain, 0.05, 0.4, x, y, z, 6);
  b.pipe(C.pipeAir, 0.025, [[x, y + h + 0.9, z], [x, y + 1.3, z]], 5);
  return [x - r, 0, z - r, x + r, y + h + 0.5, z + r];
}

/* ───────────── water treatment ───────────── */
export function sandFilter(b, x, z, r, h, { hex = C.grpBlue, y = F } = {}) {
  b.use('satin');
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.5; b.cyl(C.steelDark, 0.07, 0.5, x + Math.cos(a) * r * 0.75, y, z + Math.sin(a) * r * 0.75, 6); }
  b.cyl(hex, r, h, x, y + 0.5, z, 22);
  b.dome(hex, r, x, y + 0.5 + h, z, 22, 6, 0.5);
  b.cyl(C.steelDark, r * 0.28, 0.18, x, y + 0.5 + h + r * 0.48, z, 12);
  b.pipe(C.pipeSea, 0.09, [[x - r - 0.25, y + 0.25, z], [x - r - 0.25, y + h * 0.9, z], [x - r * 0.9, y + h * 0.9, z]], 8);
  b.pipe(C.pipeTreat, 0.09, [[x + r + 0.25, y + 0.25, z], [x + r + 0.25, y + 0.9, z], [x + r * 0.9, y + 0.9, z]], 8);
  b.use('matte').cyl(C.black, 0.13, 0.04, x - r - 0.25, y + h * 0.9 + 0.2, z, 10);
  return [x - r - 0.4, 0, z - r, x + r + 0.4, y + h + r * 0.6 + 0.6, z + r];
}
/** UV steriliser bank: stainless tubes on a rack */
export function uvBank(b, x, z, { n = 4, len = 2.6, ry = 0, y = F } = {}) {
  b.push(x, 0, z, ry);
  b.use('satin').box(C.steelDark, 0.1, 1.5, n * 0.5 + 0.2, -len / 2, y, 0); b.box(C.steelDark, 0.1, 1.5, n * 0.5 + 0.2, len / 2, y, 0);
  for (let i = 0; i < n; i++) { const zz = (i - (n - 1) / 2) * 0.5; b.use('metal').rod(C.alu, 0.16, [-len / 2, y + 0.5 + (i % 2) * 0.55, zz], [len / 2, y + 0.5 + (i % 2) * 0.55, zz], 12); }
  b.use('satin').box(C.clayCool, 0.5, 1.5, 0.3, 0, y, n * 0.25 + 0.5); b.use('glow').box(0xb48cff, 0.3, 0.16, 0.02, 0, y + 1.1, n * 0.25 + 0.66);
  b.pop();
  return rot([-len / 2 - 0.2, 0, -n * 0.25 - 0.3, len / 2 + 0.2, y + 1.7, n * 0.25 + 0.8], x, z, ry);
}
/** moving-bed biofilter: big open reactor */
export function biofilter(b, x, z, r, h, { y = F } = {}) {
  roundTank(b, x, z, r, h, { wall: C.grpDark, water: C.waterBrown, level: 0.9, standpipe: false, inlet: false, y });
  b.use('satin').torus(C.pipeAir, r * 0.55, 0.05, x, y + 0.2, z, 6, 24);
  b.pipe(C.pipeAir, 0.05, [[x + r + 0.3, y, z], [x + r + 0.3, y + h + 0.4, z], [x, y + h + 0.4, z], [x, y + h * 0.6, z]], 6);
  return [x - r, 0, z - r, x + r, y + h + 0.5, z + r];
}
export function drumFilter(b, x, z, { ry = 0, y = F, s = 1 } = {}) {
  b.push(x, 0, z, ry, s);
  b.use('satin').box(C.steel, 3.0, 1.5, 1.7, 0, y, 0); b.use('metal').rod(C.alu, 0.62, [-1.2, y + 1.55, 0], [1.2, y + 1.55, 0], 16);
  b.use('satin').box(C.clayCool, 0.5, 1.1, 0.35, 1.2, y + 0.3, 1.05); b.use('glow').box(C.green, 0.12, 0.12, 0.02, 1.2, y + 1.15, 1.24);
  b.use('satin').pipe(C.pipeSea, 0.12, [[-1.9, y + 0.6, 0], [-1.5, y + 0.6, 0]], 8); b.pipe(C.pipeDrain, 0.12, [[1.5, y + 0.4, 0], [2.0, y + 0.4, 0]], 8);
  b.pop();
  return rot([-2 * s, 0, -1 * s, 2 * s, (y + 2.2) * s, 1.3 * s], x, z, ry);
}
export function skimmer(b, x, z, { r = 0.55, h = 3.2, y = F } = {}) {
  b.use('satin').cyl(C.steelDark, r + 0.08, 0.2, x, y, z, 16);
  b.use('glass').cyl(C.glass, r, h * 0.7, x, y + 0.2, z, 16, r, true);
  b.use('glow').cyl(0xeaf7fb, r - 0.06, h * 0.66, x, y + 0.22, z, 12);
  b.use('satin').cyl(C.grp, r, h * 0.14, x, y + 0.2 + h * 0.7, z, 16, r * 0.45); b.cyl(C.white, r * 0.7, h * 0.14, x, y + 0.2 + h * 0.84, z, 16);
  b.pipe(C.pipeAir, 0.04, [[x + r + 0.2, y, z], [x + r + 0.2, y + 0.7, z], [x + r * 0.8, y + 0.7, z]], 6);
  return [x - r, 0, z - r, x + r, y + h, z + r];
}
export function oxygenCone(b, x, z, { r = 0.6, h = 2.4, y = F } = {}) {
  b.use('satin').cyl(C.steelDark, 0.06, 0.4, x - r * 0.6, y, z, 6); b.cyl(C.steelDark, 0.06, 0.4, x + r * 0.6, y, z, 6); b.cyl(C.steelDark, 0.06, 0.4, x, y, z + r * 0.6, 6);
  b.cyl(C.white, r, h, x, y + 0.4, z, 18, 0.16);
  b.pipe(C.pipeO2, 0.04, [[x, y + h + 0.9, z], [x, y + h + 0.4, z]], 6);
  return [x - r, 0, z - r, x + r, y + h + 0.9, z + r];
}
export function pump(b, x, z, { ry = 0, s = 1, hex = C.pipeSea, y = F } = {}) {
  b.push(x, 0, z, ry, s);
  b.use('matte').box(C.steelDark, 1.5, 0.14, 0.6, 0, y, 0);
  b.use('satin').rod(hex, 0.26, [-0.65, y + 0.42, 0], [0.1, y + 0.42, 0], 12); b.cyl(C.steel, 0.3, 0.26, 0.38, y + 0.14, 0, 14);
  b.rod(C.steelDark, 0.08, [0.38, y + 0.4, 0], [0.38, y + 0.95, 0], 8); b.rod(C.steelDark, 0.08, [0.38, y + 0.32, 0], [0.95, y + 0.32, 0], 8);
  b.pop();
  return rot([-0.8 * s, 0, -0.4 * s, 1.0 * s, (y + 1) * s, 0.4 * s], x, z, ry);
}
export function blower(b, x, z, { ry = 0, y = F } = {}) {
  b.push(x, 0, z, ry);
  b.use('satin').box(C.clayCool, 1.5, 1.3, 1.0, 0, y, 0); b.use('matte').box(C.steelDark, 1.2, 0.5, 0.04, 0, y + 0.5, 0.5);
  b.use('satin').pipe(C.pipeAir, 0.1, [[0, y + 1.3, 0], [0, y + 2.1, 0]], 8);
  b.pop();
  return rot([-0.8, 0, -0.6, 0.8, y + 2.1, 0.6], x, z, ry);
}
/** heat pump / chiller with top fans */
export function chiller(b, x, z, { ry = 0, w = 3.2, y = F } = {}) {
  b.push(x, 0, z, ry);
  b.use('satin').box(C.clayCool, w, 1.7, 1.3, 0, y, 0); b.use('matte').box(C.steelDark, w * 0.9, 0.8, 0.03, 0, y + 0.5, 0.66);
  for (let i = 0; i < 2; i++) { b.use('matte').cyl(C.black, 0.46, 0.06, (i - 0.5) * w * 0.5, y + 1.7, 0, 16); b.use('satin').cyl(C.steel, 0.12, 0.1, (i - 0.5) * w * 0.5, y + 1.7, 0, 8); }
  b.pop();
  return rot([-w / 2, 0, -0.7, w / 2, y + 1.9, 0.7], x, z, ry);
}
/** control cabinet with a live screen */
export function panel(b, x, z, { ry = 0, w = 1.6, h = 2.0, hex = C.clayCool, screen = C.screen, y = F } = {}) {
  b.push(x, 0, z, ry);
  b.use('satin').box(hex, w, h, 0.5, 0, y, 0);
  b.use('glow').box(screen, w * 0.62, h * 0.3, 0.02, 0, y + h * 0.55, 0.26);
  b.box(C.green, 0.07, 0.07, 0.02, -w * 0.3, y + h * 0.38, 0.26); b.box(C.yellow, 0.07, 0.07, 0.02, -w * 0.15, y + h * 0.38, 0.26); b.box(C.red, 0.07, 0.07, 0.02, 0, y + h * 0.38, 0.26);
  b.pop();
  return rot([-w / 2, 0, -0.3, w / 2, y + h, 0.3], x, z, ry);
}
/** operator desk with a wall of screens (SCADA) */
export function controlDesk(b, x, z, { ry = 0, w = 4.2, y = F } = {}) {
  b.push(x, 0, z, ry);
  b.use('satin').box(C.clayCool, w, 0.78, 1.0, 0, y, 0); b.use('matte').box(C.ink, w + 0.1, 0.05, 1.1, 0, y + 0.78, 0);
  for (let i = 0; i < 3; i++) { const xx = (i - 1) * (w / 3.2); b.use('matte').box(C.black, 1.05, 0.62, 0.05, xx, y + 0.95, -0.25, 0, -0.12); b.use('glow').box(i === 1 ? C.screen : 0x8fd0ff, 0.96, 0.54, 0.02, xx, y + 0.99, -0.21, 0, -0.12); }
  b.use('matte').box(C.navy, 0.5, 0.5, 0.5, -0.8, y, 0.95); b.box(C.navy, 0.5, 0.5, 0.5, 0.8, y, 0.95);
  b.pop();
  return rot([-w / 2, 0, -0.6, w / 2, y + 1.6, 1.2], x, z, ry);
}

/* ───────────── power ───────────── */
export function genset(b, x, z, { ry = 0, y = F } = {}) {
  b.push(x, 0, z, ry);
  b.use('matte').box(C.steelDark, 5.6, 0.3, 1.9, 0, y, 0);
  b.use('satin').box(0x3a6f9a, 2.6, 1.5, 1.4, -0.4, y + 0.3, 0);                 // engine block
  b.rod(C.steel, 0.62, [1.0, y + 1.05, 0], [2.5, y + 1.05, 0], 16);                // alternator
  b.box(C.clayCool, 0.9, 1.9, 1.7, -2.3, y + 0.3, 0); b.use('matte').box(C.black, 0.04, 1.4, 1.3, -2.76, y + 0.55, 0);   // radiator
  b.use('metal').pipe(C.alu, 0.12, [[-0.2, y + 1.8, 0.3], [-0.2, y + 3.2, 0.3], [1.4, y + 3.2, 0.3]], 8);
  b.use('satin').box(C.clayCool, 0.7, 1.3, 0.4, 2.2, y + 0.3, 0.9); b.use('glow').box(C.green, 0.3, 0.18, 0.02, 2.2, y + 1.25, 1.11);
  b.pop();
  return rot([-2.9, 0, -1.0, 2.9, y + 3.3, 1.2], x, z, ry);
}
export function switchgear(b, x, z, { ry = 0, n = 6, y = F } = {}) {
  b.push(x, 0, z, ry);
  for (let i = 0; i < n; i++) {
    const xx = (i - (n - 1) / 2) * 0.82;
    b.use('satin').box(i % 3 === 1 ? C.clayCool : C.alu, 0.8, 2.2, 0.8, xx, y, 0);
    b.use('glow').box(C.green, 0.06, 0.06, 0.02, xx - 0.2, y + 1.7, 0.41); b.box(i % 4 === 2 ? C.yellow : C.green, 0.06, 0.06, 0.02, xx, y + 1.7, 0.41);
    b.use('matte').box(C.steelDark, 0.5, 0.5, 0.02, xx, y + 0.9, 0.41);
  }
  b.pop();
  return rot([-n * 0.41, 0, -0.45, n * 0.41, y + 2.2, 0.45], x, z, ry);
}
export function transformer(b, x, z, { ry = 0, y = 0.05 } = {}) {
  b.push(x, 0, z, ry);
  b.use('matte').box(C.clayCool, 3.6, 0.25, 2.8, 0, y, 0);
  b.use('satin').box(0x6c8a99, 2.2, 2.0, 1.5, 0, y + 0.25, 0);
  for (let i = 0; i < 7; i++) { b.box(0x5c7888, 0.06, 1.5, 0.5, -0.9 + i * 0.3, y + 0.5, 1.0); b.box(0x5c7888, 0.06, 1.5, 0.5, -0.9 + i * 0.3, y + 0.5, -1.0); }
  for (let i = 0; i < 3; i++) { b.cyl(0xcfd6d9, 0.09, 0.6, -0.6 + i * 0.6, y + 2.25, 0, 8); b.use('matte').cyl(C.woodDark, 0.13, 0.12, -0.6 + i * 0.6, y + 2.45, 0, 8); b.use('satin'); }
  b.cyl(0x6c8a99, 0.32, 0.9, 1.5, y + 1.7, 0, 12);
  b.pop();
  return rot([-1.8, 0, -1.4, 1.8, y + 3, 1.4], x, z, ry);
}
/** horizontal tank on saddles (diesel) */
export function hTank(b, x, z, { len = 5, r = 1.0, ry = 0, hex = C.clayCool, y = 0.05 } = {}) {
  b.push(x, 0, z, ry);
  b.use('matte').box(C.steelDark, 0.3, 0.6, r * 1.8, -len * 0.3, y, 0); b.box(C.steelDark, 0.3, 0.6, r * 1.8, len * 0.3, y, 0);
  b.use('satin').rod(hex, r, [-len / 2, y + 0.5 + r, 0], [len / 2, y + 0.5 + r, 0], 18);
  b.ball(hex, r, -len / 2, y + 0.5 + r, 0, 14, 10); b.ball(hex, r, len / 2, y + 0.5 + r, 0, 14, 10);
  b.cyl(C.steelDark, 0.14, 0.3, 0, y + 0.5 + r * 2, 0, 8);
  b.pop();
  return rot([-len / 2 - r, 0, -r, len / 2 + r, y + 0.9 + r * 2, r], x, z, ry);
}
/** tall vertical vessel (liquid oxygen, header tank) */
export function vTank(b, x, z, { r = 1.3, h = 6, hex = C.white, y = 0.05, legs = true } = {}) {
  b.use('satin');
  if (legs) for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.78; b.cyl(C.steelDark, 0.08, 0.9, x + Math.cos(a) * r * 0.8, y, z + Math.sin(a) * r * 0.8, 6); }
  const y0 = y + (legs ? 0.8 : 0);
  b.cyl(hex, r, h, x, y0, z, 22); b.dome(hex, r, x, y0 + h, z, 22, 6, 0.45); b.cyl(C.steelDark, 0.12, 0.25, x, y0 + h + r * 0.43, z, 8);
  return [x - r, 0, z - r, x + r, y0 + h + r * 0.5, z + r];
}

/* ───────────── lab ───────────── */
/** lab bench with sink, shelf and instruments. len along x (before ry) */
export function labBench(b, x, z, { len = 4, ry = 0, island = false, y = F, kit = 0 } = {}) {
  b.push(x, 0, z, ry);
  const d = island ? 1.5 : 0.75;
  b.use('satin').box(C.white, len, 0.86, d, 0, y, 0);
  b.use('matte').box(0x8d9aa3, len + 0.06, 0.05, d + 0.06, 0, y + 0.86, 0);
  if (island) { b.use('satin').box(C.alu, len * 0.9, 0.04, 0.3, 0, y + 1.45, 0); b.box(C.alu, 0.05, 0.55, 0.05, -len * 0.42, y + 0.9, 0); b.box(C.alu, 0.05, 0.55, 0.05, len * 0.42, y + 0.9, 0); }
  else { b.use('satin').box(C.white, len, 0.5, 0.32, 0, y + 1.5, -0.2); }
  b.use('metal').box(C.alu, 0.5, 0.03, 0.4, len * 0.34, y + 0.9, 0); b.rod(C.alu, 0.02, [len * 0.34, y + 0.9, -0.16], [len * 0.34, y + 1.2, -0.16], 6);
  // instruments
  const k = kit % 4, xx = -len * 0.22;
  if (k === 0) { b.use('satin').box(C.ink, 0.2, 0.06, 0.26, xx, y + 0.91, 0); b.cyl(C.white, 0.05, 0.3, xx, y + 0.97, -0.06, 8); b.box(C.ink, 0.12, 0.08, 0.16, xx, y + 1.22, 0.02, 0, 0.5); }          // microscope
  else if (k === 1) { b.use('satin').box(C.clayCool, 0.5, 0.36, 0.44, xx, y + 0.91, 0); b.use('glow').box(C.screen, 0.2, 0.08, 0.02, xx, y + 1.12, 0.23); }                                                 // centrifuge
  else if (k === 2) { b.use('satin').box(C.white, 0.42, 0.3, 0.36, xx, y + 0.91, 0); b.use('glow').box(0x9ee6b0, 0.22, 0.12, 0.02, xx, y + 1.06, 0.19); }                                                   // analyser
  else { b.use('glass'); for (let i = 0; i < 4; i++) b.cyl(C.waterClear, 0.05, 0.22, xx - 0.3 + i * 0.2, y + 0.91, 0.05, 8); }                                                                                 // flasks
  b.use('matte').cyl(C.navy, 0.2, 0.06, -len * 0.05, y + 0.62, d / 2 + 0.45, 12); b.use('satin').cyl(C.steelDark, 0.03, 0.62, -len * 0.05, y, d / 2 + 0.45, 6);                                          // stool
  b.pop();
  return rot([-len / 2, 0, -d / 2 - 0.1, len / 2, y + 2, d / 2 + 0.7], x, z, ry);
}
export function fumeHood(b, x, z, { ry = 0, y = F, w = 1.5 } = {}) {
  b.push(x, 0, z, ry);
  b.use('satin').box(C.white, w, 0.9, 0.85, 0, y, 0); b.box(C.white, w, 1.4, 0.12, 0, y + 0.9, -0.36);
  b.box(C.white, 0.08, 1.4, 0.85, -w / 2 + 0.04, y + 0.9, 0); b.box(C.white, 0.08, 1.4, 0.85, w / 2 - 0.04, y + 0.9, 0); b.box(C.white, w, 0.3, 0.85, 0, y + 2.3, 0);
  b.use('glass').box(C.glass, w - 0.16, 0.8, 0.03, 0, y + 1.5, 0.4);
  b.use('glow').box(0xdff3ff, w - 0.3, 0.04, 0.3, 0, y + 2.26, 0);
  b.use('metal').cyl(C.alu, 0.18, 1.2, 0, y + 2.6, -0.1, 10);
  b.pop();
  return rot([-w / 2, 0, -0.45, w / 2, y + 3.8, 0.45], x, z, ry);
}
export function fridge(b, x, z, { ry = 0, w = 0.8, h = 1.95, hex = C.white, y = F, glass = false } = {}) {
  b.push(x, 0, z, ry);
  b.use('satin').box(hex, w, h, 0.7, 0, y, 0);
  if (glass) { b.use('glow').box(0xcfefff, w - 0.16, h - 0.5, 0.02, 0, y + 0.3, 0.36); } else b.use('metal').box(C.alu, 0.03, h * 0.5, 0.04, w * 0.36, y + h * 0.3, 0.37);
  b.pop();
  return rot([-w / 2, 0, -0.35, w / 2, y + h, 0.4], x, z, ry);
}
export function shelving(b, x, z, { ry = 0, len = 3, h = 2.1, y = F, hex = C.alu } = {}) {
  b.push(x, 0, z, ry);
  b.use('satin'); for (const sx of [-len / 2, len / 2]) for (const sz of [-0.25, 0.25]) b.box(hex, 0.05, h, 0.05, sx, y, sz);
  for (let i = 0; i < 4; i++) { b.box(hex, len, 0.04, 0.55, 0, y + 0.2 + i * 0.6, 0); if (i < 3) for (let j = 0; j < Math.floor(len / 0.6); j++) b.use('matte').box([C.clayWarm, 0x9fb7c4, C.wood, C.white][(i + j) % 4], 0.42, 0.34, 0.4, -len / 2 + 0.35 + j * 0.6, y + 0.24 + i * 0.6, 0), b.use('satin'); }
  b.pop();
  return rot([-len / 2, 0, -0.3, len / 2, y + h, 0.3], x, z, ry);
}

/* ───────────── office / public ───────────── */
export function chair(b, x, z, ry = 0, hex = C.navy, y = F) {
  b.push(x, 0, z, ry);
  b.use('matte').box(hex, 0.46, 0.07, 0.46, 0, y + 0.42, 0); b.box(hex, 0.46, 0.48, 0.06, 0, y + 0.49, -0.21);
  b.use('satin').cyl(C.steelDark, 0.03, 0.42, 0, y, 0, 6); b.cyl(C.steelDark, 0.24, 0.03, 0, y, 0, 8);
  b.pop();
}
export function desk(b, x, z, { ry = 0, w = 1.6, d = 0.75, y = F, top = C.oak, screen = true, seat = C.navy } = {}) {
  b.push(x, 0, z, ry);
  b.use('matte').box(top, w, 0.05, d, 0, y + 0.72, 0);
  b.use('satin').box(C.white, 0.05, 0.72, d - 0.1, -w / 2 + 0.05, y, 0); b.box(C.white, 0.05, 0.72, d - 0.1, w / 2 - 0.05, y, 0);
  if (screen) { b.use('matte').box(C.black, 0.56, 0.34, 0.03, 0, y + 0.9, -0.18); b.use('glow').box(0xa8dcf3, 0.5, 0.28, 0.01, 0, y + 0.93, -0.16); b.use('satin').box(C.steelDark, 0.06, 0.14, 0.06, 0, y + 0.77, -0.2); }
  b.pop();
  if (seat !== null) { const s = Math.sin(ry), c = Math.cos(ry); chair(b, x + s * 0.62, z + c * 0.62, ry + Math.PI, seat, y); }
  return rot([-w / 2, 0, -d / 2, w / 2, y + 1.3, d / 2 + 0.9], x, z, ry);
}
/** cluster of 4 workstations facing each other */
export function deskPod(b, x, z, { ry = 0, y = F, seat = C.navy } = {}) {
  b.push(x, 0, z, ry);
  desk(b, -0.82, -0.4, { ry: Math.PI, y, seat }); desk(b, 0.82, -0.4, { ry: Math.PI, y, seat }); desk(b, -0.82, 0.4, { y, seat }); desk(b, 0.82, 0.4, { y, seat });
  b.use('matte').box(0x9fb7c4, 3.2, 0.45, 0.04, 0, y + 0.77, 0);
  b.pop();
  return rot([-1.7, 0, -1.6, 1.7, y + 1.3, 1.6], x, z, ry);
}
export function roundTable(b, x, z, { r = 0.6, seats = 4, y = F, top = C.white, seat = C.orange, alt = C.white } = {}) {
  b.use('satin').cyl(top, r, 0.05, x, y + 0.72, z, 20); b.cyl(C.steelDark, 0.05, 0.72, x, y, z, 6); b.cyl(C.steelDark, r * 0.5, 0.03, x, y, z, 12);
  for (let i = 0; i < seats; i++) { const a = (i / seats) * TAU + 0.4; chair(b, x + Math.cos(a) * (r + 0.42), z + Math.sin(a) * (r + 0.42), Math.atan2(-Math.cos(a), -Math.sin(a)), i % 2 ? alt : seat, y); }
  return [x - r - 0.9, 0, z - r - 0.9, x + r + 0.9, y + 1.1, z + r + 0.9];
}
export function meetingTable(b, x, z, { ry = 0, len = 4.2, w = 1.3, y = F, top = C.oak, seat = C.navy, screen = true } = {}) {
  b.push(x, 0, z, ry);
  b.use('matte').box(top, len, 0.06, w, 0, y + 0.72, 0); b.use('satin').box(C.white, len * 0.6, 0.72, 0.3, 0, y, 0);
  const n = Math.floor(len / 0.75);
  for (let i = 0; i < n; i++) { const xx = (i - (n - 1) / 2) * 0.75; chair(b, xx, -w / 2 - 0.4, 0, seat, y); chair(b, xx, w / 2 + 0.4, Math.PI, seat, y); }
  if (screen) { b.use('matte').box(C.black, 0.08, 1.0, 1.7, len / 2 + 1.0, y + 0.9, 0); b.use('glow').box(C.screen, 0.02, 0.88, 1.56, len / 2 + 0.95, y + 0.96, 0); }
  b.pop();
  return rot([-len / 2 - 0.3, 0, -w / 2 - 0.9, len / 2 + 1.1, y + 1.9, w / 2 + 0.9], x, z, ry);
}
export function sofa(b, x, z, { ry = 0, len = 2, hex = 0x8aa6b5, y = F } = {}) {
  b.push(x, 0, z, ry);
  b.use('matte').box(hex, len, 0.4, 0.85, 0, y, 0); b.box(shade(hex, 0.9), len, 0.4, 0.2, 0, y + 0.4, -0.33); b.box(shade(hex, 0.9), 0.18, 0.2, 0.85, -len / 2 + 0.09, y + 0.4, 0); b.box(shade(hex, 0.9), 0.18, 0.2, 0.85, len / 2 - 0.09, y + 0.4, 0);
  b.pop();
  return rot([-len / 2, 0, -0.45, len / 2, y + 0.8, 0.45], x, z, ry);
}
/** touch-screen kiosk on a pedestal */
export function kiosk(b, x, z, { ry = 0, y = F, hex = C.white, screen = C.screen } = {}) {
  b.push(x, 0, z, ry);
  b.use('satin').box(hex, 0.7, 0.85, 0.4, 0, y, 0); b.box(hex, 0.9, 0.08, 0.6, 0, y + 0.9, 0.05, 0, -0.5);
  b.use('glow').box(screen, 0.78, 0.02, 0.48, 0, y + 0.97, 0.07, 0, -0.5);
  b.pop();
  return rot([-0.5, 0, -0.4, 0.5, y + 1.3, 0.5], x, z, ry);
}
/** tall printed exhibition panel */
export function banner(b, x, z, { ry = 0, w = 1.8, h = 2.6, hex = C.teal, y = F } = {}) {
  b.push(x, 0, z, ry);
  b.use('matte').box(C.clayCool, w + 0.1, 0.08, 0.4, 0, y, 0); b.box(hex, w, h, 0.07, 0, y + 0.08, 0);
  b.use('glow').box(shade(hex, 1.5), w * 0.72, h * 0.34, 0.01, 0, y + 0.08 + h * 0.52, 0.04);
  b.use('matte').box(C.white, w * 0.72, 0.1, 0.01, 0, y + 0.08 + h * 0.38, 0.04); b.box(C.white, w * 0.5, 0.06, 0.01, -w * 0.11, y + 0.08 + h * 0.3, 0.04);
  b.pop();
  return rot([-w / 2, 0, -0.25, w / 2, y + h + 0.1, 0.25], x, z, ry);
}
/** wall-mounted display screen */
export function wallScreen(b, x, z, { ry = 0, w = 3.2, h = 1.8, y = 1.2, hex = C.screen } = {}) {
  b.push(x, 0, z, ry);
  b.use('matte').box(C.black, w + 0.12, h + 0.12, 0.08, 0, y, 0); b.use('glow').box(hex, w, h, 0.02, 0, y + 0.06, 0.05);
  b.pop();
  return rot([-w / 2, 0, -0.2, w / 2, y + h, 0.3], x, z, ry);
}
export function planter(b, x, z, { r = 0.45, y = F, hex = C.palm } = {}) {
  b.use('matte').cyl(C.clayWarm, r, 0.6, x, y, z, 14, r * 0.8); b.ball(hex, r * 1.25, x, y + 1.15, z, 10, 8, 1.1); b.ball(shade(hex, 0.86), r * 0.9, x + r * 0.5, y + 0.95, z + r * 0.3, 8, 6);
}
/** stacked feed sacks or boxes on a pallet */
export function pallet(b, x, z, { ry = 0, y = F, hex = C.clayWarm, n = 3 } = {}) {
  b.push(x, 0, z, ry);
  b.use('matte').box(C.wood, 1.2, 0.14, 1.0, 0, y, 0);
  for (let i = 0; i < n; i++) { b.box(shade(hex, 1 - i * 0.04), 1.1, 0.28, 0.9, (i % 2) * 0.04, y + 0.14 + i * 0.28, 0); }
  b.pop();
  return rot([-0.6, 0, -0.5, 0.6, y + 0.14 + n * 0.28, 0.5], x, z, ry);
}
/** steel service walkway (grating) with handrails, along x or z */
export function catwalk(b, x0, z0, x1, z1, { y = 1.9, w = 1.2, rail = true, legsEvery = 6 } = {}) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, px = -uz, pz = ux;
  b.use('metal').wall(0xaab4ba, x0, z0, x1, z1, w, y - 0.07, y);
  if (rail) for (const s of [-1, 1]) {
    const ox = px * (w / 2) * s, oz = pz * (w / 2) * s;
    b.use('satin').rod(C.yellow, 0.035, [x0 + ox, y + 1.0, z0 + oz], [x1 + ox, y + 1.0, z1 + oz], 6); b.rod(C.yellow, 0.025, [x0 + ox, y + 0.5, z0 + oz], [x1 + ox, y + 0.5, z1 + oz], 6);
    for (let a = 0; a <= len + 0.01; a += 2) b.rod(C.yellow, 0.03, [x0 + ux * a + ox, y, z0 + uz * a + oz], [x0 + ux * a + ox, y + 1.0, z0 + uz * a + oz], 6);
  }
  for (let a = 0.5; a <= len; a += legsEvery) for (const s of [-1, 1]) b.use('satin').cyl(C.steelDark, 0.05, y - 0.07, x0 + ux * a + px * (w / 2 - 0.1) * s, F, z0 + uz * a + pz * (w / 2 - 0.1) * s, 6);
  return [Math.min(x0, x1) - w / 2, 0, Math.min(z0, z1) - w / 2, Math.max(x0, x1) + w / 2, y + 1, Math.max(z0, z1) + w / 2];
}
/** steps up to a walkway */
export function steps(b, x, z, { ry = 0, h = 1.9, w = 1.0 } = {}) {
  b.push(x, 0, z, ry); const n = Math.round(h / 0.19);
  for (let i = 0; i < n; i++) b.use('metal').box(0xaab4ba, w, 0.04, 0.26, 0, F + (i + 1) * (h - F) / n - 0.04, -i * 0.26);
  b.use('satin').rod(C.yellow, 0.03, [w / 2, F + 0.9, 0.1], [w / 2, h + 0.9, -n * 0.26], 6); b.rod(C.yellow, 0.03, [-w / 2, F + 0.9, 0.1], [-w / 2, h + 0.9, -n * 0.26], 6);
  b.pop();
}
/** overhead cable / pipe tray on hangers along a line */
export function pipeRack(b, pts, y, colours = [C.pipeSea, C.pipeTreat, C.pipeO2], r = 0.09) {
  b.use('satin');
  colours.forEach((hex, i) => { const off = (i - (colours.length - 1) / 2) * (r * 2.8); b.pipe(hex, r, pts.map((p, k) => { const a = pts[Math.max(0, k - 1)], c = pts[Math.min(pts.length - 1, k + 1)]; const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1; return [p[0] - (dz / l) * off, y, p[1] + (dx / l) * off]; }), 8); });
}

/** rotate a local box about y at (x,z) → world AABB */
export function rot(bx, x, z, ry) {
  const c = Math.cos(ry), s = Math.sin(ry), xs = [bx[0], bx[3]], zs = [bx[2], bx[5]];
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const lx of xs) for (const lz of zs) { const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c; x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); z0 = Math.min(z0, wz); z1 = Math.max(z1, wz); }
  return [x0, bx[1], z0, x1, bx[4], z1];
}
export { F as FLOOR };
