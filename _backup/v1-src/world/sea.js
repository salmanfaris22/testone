// The Gulf: one big shaded plane. Colour comes from real depth over the terrain function,
// so shallows, the beach and the revetment all get the right water without any textures.
import * as THREE from 'three';
import { TERRAIN_GLSL, SEA_Y } from './terrain-fn.js';
import { rng, TAU } from './kit.js';

/** tileable ripple field: rg = slope, a = height */
export function makeRipples(size = 256) {
  const R = rng(7), waves = [];
  for (let i = 0; i < 26; i++) {
    const k = 1 + Math.floor(R() * 11), ang = R() * TAU;
    const kx = Math.round(Math.cos(ang) * k), ky = Math.round(Math.sin(ang) * k);
    if (!kx && !ky) continue;
    waves.push({ kx, ky, a: 1 / Math.pow(Math.hypot(kx, ky), 1.15), p: R() * TAU });
  }
  const norm = waves.reduce((s, w) => s + w.a, 0);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size; let h = 0, gx = 0, gy = 0;
    for (const w of waves) { const ph = TAU * (w.kx * u + w.ky * v) + w.p, c = Math.cos(ph), s = Math.sin(ph); h += w.a * c; gx -= w.a * w.kx * s; gy -= w.a * w.ky * s; }
    const i = (y * size + x) * 4;
    data[i] = Math.max(0, Math.min(255, 127.5 + (gx / norm) * 26)); data[i + 1] = Math.max(0, Math.min(255, 127.5 + (gy / norm) * 26));
    data[i + 2] = 255; data[i + 3] = Math.max(0, Math.min(255, 127.5 + (h / norm) * 127.5 * 2.2));
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}

const SEA_DAY = { shallow: new THREE.Color(0x6adbd2), mid: new THREE.Color(0x2ba3c4), deep: new THREE.Color(0x155f93) };
const SEA_NIGHT = { shallow: new THREE.Color(0x154a60), mid: new THREE.Color(0x0c3048), deep: new THREE.Color(0x061a2d) };

export function createSea(engine, env, ripples) {
  const U = {
    uN: { value: ripples }, uTime: { value: 0 }, uSunDir: { value: env.sunDir }, uSunCol: { value: env.sunCol },
    uShallow: { value: SEA_DAY.shallow.clone() }, uMid: { value: SEA_DAY.mid.clone() }, uDeep: { value: SEA_DAY.deep.clone() },
    uHorizon: { value: env.horizon }, uZenith: { value: env.zenith },
    uFogColor: { value: engine.scene.fog.color }, uFogNear: { value: engine.scene.fog.near }, uFogFar: { value: engine.scene.fog.far },
    uNight: { value: 0 }, uCages: { value: Array.from({ length: 12 }, () => new THREE.Vector3(0, 0, -1)) }, uCageN: { value: 0 }, uCageField: { value: new THREE.Vector3(0, 0, 0) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: true,
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uN; uniform float uTime, uFogNear, uFogFar, uNight;
      uniform vec3 uSunDir, uSunCol, uShallow, uMid, uDeep, uHorizon, uZenith, uFogColor, uCageField;
      uniform vec3 uCages[12]; uniform int uCageN;
      varying vec3 vW;
      ${TERRAIN_GLSL}
      void main(){
        vec2 p = vW.xz;
        vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 V = toCam / dist;
        vec4 a = texture2D(uN, p * 0.021 + uTime * vec2(0.012, 0.008));
        vec4 b = texture2D(uN, p * 0.057 - uTime * vec2(0.017, -0.011));
        vec4 c = texture2D(uN, p * 0.0064 + uTime * vec2(-0.004, 0.006));
        vec2 g = (a.xy - 0.5) + (b.xy - 0.5) * 0.6 + (c.xy - 0.5) * 1.4;
        float fade = 1.0 / (1.0 + dist * 0.0011);
        vec3 N = normalize(vec3(g.x * 0.62 * fade, 1.0, g.y * 0.62 * fade));

        float depth = SEA_Y - terrainH(p);
        float d = landSDF(p);
        float shallow = 1.0 - smoothstep(0.0, 4.4, depth);
        vec3 water = mix(uMid, uShallow, shallow);
        water = mix(water, uDeep, smoothstep(30.0, 460.0, d));
        float web = 1.0 - smoothstep(0.0, 0.035, abs(a.a - b.a));
        water += uShallow * web * shallow * 0.3;

        float F = pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N);
        vec3 skyR = mix(uHorizon, uZenith, pow(clamp(R.y, 0.0, 1.0), 0.5));
        vec3 col = mix(water, skyR, 0.05 + 0.7 * F);
        float sp = max(dot(R, uSunDir), 0.0);
        col += uSunCol * (pow(sp, 380.0) * 2.2 + pow(sp, 50.0) * 0.14) * (1.0 - 0.45 * uNight);

        // surf: a soft edge plus bands that run up the beach
        float wob = (a.a - 0.5) * 1.3;
        float edge = 1.0 - smoothstep(0.02, 0.5, depth + wob * 0.35);
        float bands = smoothstep(0.55, 1.0, sin(depth * 4.6 - uTime * 1.25 + a.a * 5.0)) * (1.0 - smoothstep(0.25, 2.4, depth));
        float foam = clamp(edge + bands * 0.55, 0.0, 1.0) * (0.75 + 0.25 * b.a);
        col = mix(col, vec3(1.0) * (1.0 - 0.72 * uNight), foam * 0.9);
        float alpha = smoothstep(-0.03, 0.3, depth);

        // net pens: let the nets and the fish show through
        float pen = 0.0;
        if (distance(p, uCageField.xy) < uCageField.z) {
          for (int i = 0; i < 12; i++) { if (i >= uCageN) break; float dd = distance(p, uCages[i].xy); pen = max(pen, 1.0 - smoothstep(uCages[i].z - 0.5, uCages[i].z, dd)); }
        }
        col = mix(col, col * 0.62 + uDeep * 0.25, pen);
        alpha = mix(alpha, 0.5 + 0.3 * F, pen);

        float fog = smoothstep(uFogNear, uFogFar, dist);
        col = mix(col, uFogColor, fog);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat);
  mesh.scale.set(20000, 1, 20000); mesh.position.y = SEA_Y; mesh.frustumCulled = false; mesh.renderOrder = -10;
  engine.scene.add(mesh);
  env.onNight((n) => {
    U.uShallow.value.lerpColors(SEA_DAY.shallow, SEA_NIGHT.shallow, n); U.uMid.value.lerpColors(SEA_DAY.mid, SEA_NIGHT.mid, n); U.uDeep.value.lerpColors(SEA_DAY.deep, SEA_NIGHT.deep, n);
    U.uNight.value = n;
  });
  return {
    mesh, uniforms: U,
    setCages(list) {
      let cx = 0, cz = 0; list.forEach((c, i) => { U.uCages.value[i].set(c.x, c.z, c.r); cx += c.x; cz += c.z; });
      U.uCageN.value = list.length; cx /= list.length || 1; cz /= list.length || 1;
      let rad = 0; list.forEach((c) => { rad = Math.max(rad, Math.hypot(c.x - cx, c.z - cz) + c.r + 2); });
      U.uCageField.value.set(cx, cz, rad);
    },
    update(dt, t, camera) { U.uTime.value = t; mesh.position.x = Math.round(camera.position.x / 50) * 50; mesh.position.z = Math.round(camera.position.z / 50) * 50; },
  };
}
