// UAE flags that fly: a cloth of 24 × 12 cells moved in the vertex shader, fixed at the hoist and free at the fly end.
// All flags stream the same way (the breeze off the Gulf) but each has its own phase, so they never move in step.
import * as THREE from 'three';
import { Builder, canvasTex } from './kit.js';

const FW = 2.8, FH = 1.4;          // the UAE flag is 1:2
let _tex = null;
function flagTex() {
  if (_tex) return _tex;
  _tex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#00843d'; g.fillRect(0, 0, w, h / 3);
    g.fillStyle = '#f7f7f5'; g.fillRect(0, h / 3, w, h / 3);
    g.fillStyle = '#16181a'; g.fillRect(0, (2 * h) / 3, w, h / 3 + 1);
    g.fillStyle = '#c8102e'; g.fillRect(0, 0, w / 4, h);
  }, { repeat: false });
  return _tex;
}

/**
 * list: [{ x, z, h }] pole positions (ground y = 0) and heights. `wind` is the direction the flags stream towards (radians, three.js rotation.y).
 * Returns { group, update(dt, t) }.
 */
export function createFlags(mats, list, { wind = -2.36 } = {}) {
  const group = new THREE.Group(); group.name = 'flags';
  // poles and finials: one merged mesh
  const b = new Builder();
  for (const f of list) { const h = f.h || 11; b.use('satin').cyl(0xe6e9eb, 0.09, h, f.x, 0, f.z, 8, 0.05); b.ball(0xd9b25a, 0.14, f.x, h + 0.1, f.z, 8, 6); b.use('satin').cyl(0xcfd4d7, 0.28, 0.35, f.x, 0, f.z, 10); }
  group.add(b.build(mats, { cast: true }));

  const U = { uT: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ map: flagTex(), side: THREE.DoubleSide, roughness: 0.78, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = U.uT;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uT;
        // height of the cloth at (u along the flag 0..1, v up the hoist) plus its slope along u, for the normal
        vec3 flagWave(vec2 p, float ph) {
          float u = clamp(p.x / ${FW.toFixed(2)}, 0.0, 1.0), k = 2.6, sp = 5.2;
          float a = 0.30 * u + 0.05;
          float w1 = sin(p.x * k - uT * sp + ph + p.y * 0.55), w2 = sin(p.x * 5.3 - uT * 8.7 + ph * 1.7 - p.y * 1.3);
          float z = (w1 * a + w2 * 0.06 * u) * u;
          float dz = (cos(p.x * k - uT * sp + ph + p.y * 0.55) * k * a + cos(p.x * 5.3 - uT * 8.7 + ph * 1.7 - p.y * 1.3) * 5.3 * 0.06 * u) * u;
          float sag = -0.12 * u * u * (0.6 + 0.4 * sin(uT * 0.7 + ph));
          return vec3(z, dz, sag);
        }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float fph = modelMatrix[3].x * 0.37 + modelMatrix[3].z * 0.21;
        vec3 fw = flagWave(position.xy, fph);
        objectNormal = normalize(vec3(-fw.y, 0.0, 1.0));`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.z += fw.x; transformed.y += fw.z; transformed.x -= abs(fw.x) * 0.18;`);
  };
  const geo = new THREE.PlaneGeometry(FW, FH, 24, 12); geo.translate(FW / 2 + 0.1, 0, 0);
  for (const f of list) {
    const h = f.h || 11, m = new THREE.Mesh(geo, mat);
    m.position.set(f.x, h - FH / 2 - 0.25, f.z); m.rotation.y = wind; m.castShadow = true; m.frustumCulled = false;
    group.add(m);
  }
  return { group, update: (dt, t) => { U.uT.value = t; } };
}
