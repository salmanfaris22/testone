// Terrain, roads, paving and lawns.
import * as THREE from 'three';
import { Builder, C, lin, rng, roundRect, smoothPath, arcPts, DEG, TAU, mixHex } from './kit.js';
import { terrainH, landSDF, beachiness, SEA_Y } from './terrain-fn.js';
import { PARK, HATCH, BROOD, INTAKE, PLANT, GEN, P1, ROADS } from './layout.js';

function axis(dense0, dense1, step, far) {
  const a = []; for (let v = dense0; v <= dense1 + 1e-6; v += step) a.push(v);
  let s = step, v = dense1; while (v < far) { s *= 1.28; v += s; a.push(v); }
  s = step; v = dense0; const b = []; while (v > -far) { s *= 1.28; v -= s; b.push(v); }
  return b.reverse().concat(a);
}

export function createLand(scene, mats) {
  /* ───── terrain heightfield ───── */
  const xs = axis(-450, 380, 4.5, 9000), zs = axis(-330, 420, 4.5, 9000);
  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3), col = new Uint8Array(nx * nz * 3);
  const sand = lin(C.sand), wet = lin(C.sandWet), rock = lin(C.rock), rockD = lin(C.rockDark), bed = lin(0xb7c7a2), dune = lin(0xe9dcbd);
  const R = rng(3);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = xs[i], z = zs[j], k = (j * nx + i) * 3;
    let h = terrainH(x, z);
    const far = Math.max(0, z - 300) / 600;                          // gentle dunes inland
    if (h > -0.01 && far > 0) h += (Math.sin(x * 0.011 + z * 0.006) * 1.6 + Math.sin(x * 0.027 - z * 0.019) * 0.7) * Math.min(1, far);
    pos[k] = x; pos[k + 1] = h; pos[k + 2] = z;
    const b = beachiness(x, z);
    let c;
    if (h > -0.02) c = far > 0 ? mix3(sand, dune, Math.min(1, far * 1.5)) : sand;
    else {
      const w = sm(SEA_Y + 1.0, SEA_Y - 0.25, h);
      const beachC = mix3(sand, wet, w), rockC = mix3(rock, rockD, w * 0.7 + (R() - 0.5) * 0.25);
      c = mix3(rockC, beachC, b);
      if (h < SEA_Y - 0.3) c = mix3(c, bed, sm(SEA_Y - 0.3, SEA_Y - 2.5, h));
    }
    col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2];
  }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(col, 3, true)); tg.setIndex(new THREE.BufferAttribute(idx, 1));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, mats.ground); terrain.receiveShadow = true; terrain.matrixAutoUpdate = false; terrain.name = 'terrain';
  scene.add(terrain);

  /* ───── hardscape ───── */
  const b = new Builder();
  const W = ROADS.w;
  const road = (pts, w = W, { smoothK = 0, closed = false, side = true } = {}) => {
    const p = smoothK ? smoothPath(pts, smoothK, closed) : pts;
    if (side) { b.use('paving').ribbon(C.paving, p, w + 7, 0.03, closed); b.use('matte').ribbon(C.kerb, p, w + 0.9, 0.05, closed); }
    b.use('asphalt').ribbon(C.asphalt, p, w, 0.07, closed);
    // centre dashes
    b.use('matte');
    let acc = 0; const n = p.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = p[i], c = p[(i + 1) % n], len = Math.hypot(c[0] - a[0], c[1] - a[1]); if (len < 1e-3) continue;
      const ry = -Math.atan2(c[1] - a[1], c[0] - a[0]);
      let s = (6 - (acc % 6)) % 6;
      for (; s < len; s += 6) { const t = s / len; b.quad(0xf4f1ea, 2.6, 0.16, a[0] + (c[0] - a[0]) * t, 0.085, a[1] + (c[1] - a[1]) * t, ry); }
      acc += len;
    }
  };
  const { ave, north, east, south, crossA, crossB } = ROADS;
  // perimeter loop with soft corners
  const loop = roundRect(ave, north, east, south, 16, 8);
  road(loop, W, { closed: true });
  road([[ave, crossA], [east, crossA]]); road([[ave, crossB], [east, crossB]]);
  // roundabout and the road in from the mainland
  const rb = { x: ave, z: south + 34, r: 13 };
  b.use('paving').disc(C.paving, rb.r + 7, rb.x, 0.03, rb.z, 48); b.use('matte').disc(C.kerb, rb.r + 3.95, rb.x, 0.05, rb.z, 48);
  b.use('asphalt').ring(C.asphalt, rb.r + 3.5, rb.r - 3.5, rb.x, 0.07, rb.z, 56);
  b.use('matte').prism(C.grass, arcPts(rb.r - 3.9, 0, TAU, rb.x, rb.z, 10 * DEG), 0, 0.28);
  road([[ave, south - 1], [ave, rb.z - rb.r]]);
  road([[ave, rb.z + rb.r], [ave, 300], [-62, 420], [-30, 620], [40, 900], [160, 1400]], W, { smoothK: 8 });
  // visitor road: from the roundabout round to the Innovation Park forecourt
  const vr = [[rb.x - rb.r, rb.z], [-118, 196], [-168, 150], [-204, 96], [-232, 44], [-246, 10], [-250, -22]];
  road(vr, 6.5, { smoothK: 8 });
  b.use('paving').disc(C.paving, 16, -250, 0.03, -30, 40); b.use('asphalt').disc(C.asphalt, 11.5, -250, 0.07, -30, 40); b.use('matte').prism(C.grass, arcPts(4.2, 0, TAU, -250, -30, 12 * DEG), 0, 0.3);
  // car park road
  road([[ave, 62], [-110, 62], [-176, 62], [-196, 82]], 6.5, { smoothK: 6 });

  // forecourt and terrace of the Innovation Park
  const px = PARK.x, pz = PARK.z;
  b.use('paving').prism(C.floorStone, arcPts(34.5, 0, TAU, px, pz, 5 * DEG), 0, 0.06, { sides: false });
  b.use('paving').poly(C.paving, roundRect(px - 24, pz - 56, px + 124, pz + 26, 6), 0.04);
  b.use('paving').poly(C.paving, [[px - 30, pz + 22], [px + 6, pz + 34], [px - 30, pz + 66], [px - 62, pz + 34]], 0.045); // entrance apron towards the drop-off
  // car park
  b.use('asphalt').poly(shadeHex(C.asphalt, 1.12), roundRect(-180, 14, -92, 56, 3), 0.06);
  for (let i = 0; i < 26; i++) { const x = -176 + i * 3.2; b.use('matte').quad(0xf1eee6, 0.14, 5.4, x, 0.075, 19.5); b.quad(0xf1eee6, 0.14, 5.4, x, 0.075, 50.5); if (i % 2 === 0 && i < 25) { b.quad(0xf1eee6, 0.14, 5.4, x, 0.075, 32); b.quad(0xf1eee6, 0.14, 5.4, x, 0.075, 38); } }

  // working yards around the production buildings
  const yard = (r, m = 7, hex = C.clayCool) => b.use('paving').poly(hex, roundRect(r.x0 - m, r.z0 - m, r.x1 + m, r.z1 + m, 3), 0.04);
  yard(HATCH, 8); yard(BROOD, 8); yard(INTAKE, 4); yard(PLANT, 7); yard({ x0: GEN.x0, x1: GEN.x1 + 20, z0: GEN.z0, z1: GEN.z1 }, 7);
  yard({ x0: P1.a.x0, x1: P1.b.x1, z0: P1.a.z0, z1: P1.gen.z1 + 4 }, 7);
  // seaside promenade behind the Innovation Park
  b.use('paving').ribbon(C.paving, smoothPath([[-268, -30], [-262, -110], [-222, -152], [-150, -160], [-82, -160]], 8), 5, 0.035);

  // lawns
  const lawn = (pts, h = 0.22, hex = C.grass) => b.use('matte').prism(hex, pts, 0, h);
  lawn(roundRect(-196, 68, -86, 150, 14));                    // between car park road and roundabout
  lawn(roundRect(-150, 96, -96, 138, 10), 0.34, C.grassDark);
  lawn(roundRect(ave + 8, crossB + 8, ave + 26, south - 8, 6));
  lawn(roundRect(-66, -140, -44, crossA - 8, 6));
  lawn(roundRect(-160, -150, -84, -100, 12));                 // sea lawn north of the labs
  lawn(roundRect(-252, -104, -226, -66, 10));
  lawn(roundRect(-240, 30, -216, 60, 9));
  lawn(roundRect(east + 6, -100, east + 15, 120, 4), 0.2, C.grassDark);
  lawn(roundRect(168, 122, 186, 160, 6));
  for (let i = 0; i < 9; i++) lawn(roundRect(-64, -32 + i * 21.5, -52, -16 + i * 21.5, 3), 0.25);  // planters along the avenue

  const g = b.build(mats, { cast: false });
  g.name = 'hardscape'; scene.add(g);

  /* ───── revetment rocks ───── */
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, flatShading: true }), 1500);
  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), cc = new THREE.Color();
  let n = 0, guard = 0;
  while (n < 1500 && guard++ < 90000) {
    const x = -310 + R() * 560, z = -205 + R() * 460, d = landSDF(x, z);
    if (d < 0.5 || d > 9.5 || beachiness(x, z) > 0.2) continue;
    const s = 0.7 + R() * 1.25; e.set(R() * 6, R() * 6, R() * 6);
    m4.compose(v.set(x, terrainH(x, z) + s * 0.25, z), qt.setFromEuler(e), sc.set(s * (0.8 + R() * 0.6), s * (0.6 + R() * 0.4), s * (0.8 + R() * 0.6)));
    rocks.setMatrixAt(n, m4); cc.setHex(mixHex(C.rock, C.rockDark, R())); rocks.setColorAt(n, cc); n++;
  }
  rocks.count = n; rocks.castShadow = true; rocks.receiveShadow = true; rocks.instanceMatrix.needsUpdate = true; if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  rocks.name = 'rocks'; scene.add(rocks);
  return { terrain, hardscape: g, rocks, roundabout: rb, visitorRoad: vr };
}
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function shadeHex(hex, f) { const c = new THREE.Color(hex).multiplyScalar(f); return c.getHex(); }
