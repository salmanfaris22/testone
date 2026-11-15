// Sky, sun, fill light, fog and the day ↔ night blend.
import * as THREE from 'three';
import { clamp, lerp } from './kit.js';

const DAY = {
  zenith: new THREE.Color(0x4d9fe6), horizon: new THREE.Color(0xdff0fa), ground: new THREE.Color(0xcfe3ee),
  fog: new THREE.Color(0xd6e9f5), sun: new THREE.Color(0xfff0d9), sunI: 4.1, hemiSky: new THREE.Color(0xdfe9f5), hemiGround: new THREE.Color(0xd6c7a8), hemiI: 0.6,
  fill: new THREE.Color(0xcfe2ff), fillI: 0.28, env: 0.32, exposure: 1.0,
};
const NIGHT = {
  zenith: new THREE.Color(0x040a18), horizon: new THREE.Color(0x1d3152), ground: new THREE.Color(0x0a1424),
  fog: new THREE.Color(0x0b1626), sun: new THREE.Color(0x9fc2ff), sunI: 0.42, hemiSky: new THREE.Color(0x40609c), hemiGround: new THREE.Color(0x121a26), hemiI: 0.55,
  fill: new THREE.Color(0x35508a), fillI: 0.16, env: 0.16, exposure: 1.0,
};

export function createEnv(engine) {
  const { scene, renderer } = engine;
  const sunDir = new THREE.Vector3(0.42, 0.74, 0.52).normalize(); // towards the sun (south-east, high)

  const hemi = new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGround, DAY.hemiI);
  const sun = new THREE.DirectionalLight(DAY.sun, DAY.sunI);
  sun.castShadow = true;
  const sz = engine.tier === 'low' ? 2048 : 4096;
  sun.shadow.mapSize.set(sz, sz);
  sun.shadow.camera.near = 50; sun.shadow.camera.far = 1500;
  sun.shadow.bias = -0.0001; sun.shadow.normalBias = 0.1; sun.shadow.radius = 1.8;
  const fill = new THREE.DirectionalLight(DAY.fill, DAY.fillI);
  fill.position.set(-0.6, 0.5, -0.6);
  scene.add(hemi, sun, sun.target, fill);

  scene.fog = new THREE.Fog(DAY.fog.clone(), 900, 4200);

  // sky dome
  const skyU = {
    uZenith: { value: DAY.zenith.clone() }, uHorizon: { value: DAY.horizon.clone() }, uGround: { value: DAY.ground.clone() },
    uSunDir: { value: sunDir.clone() }, uSunCol: { value: DAY.sun.clone() }, uNight: { value: 0 }, uTime: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = position; vec4 p = modelViewMatrix * vec4(position * 100.0, 1.0); gl_Position = projectionMatrix * vec4(p.xyz, 1.0); gl_Position.z = gl_Position.w * 0.9999; }`,
      fragmentShader: /* glsl */ `
        varying vec3 vDir; uniform vec3 uZenith, uHorizon, uGround, uSunDir, uSunCol; uniform float uNight, uTime;
        float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        void main(){
          vec3 d = normalize(vDir); float h = d.y;
          vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.42));
          col = mix(col, uGround, 1.0 - smoothstep(-0.18, 0.0, h));
          float s = max(dot(d, uSunDir), 0.0);
          float disc = smoothstep(0.9994, 0.99975, s);
          col += uSunCol * (disc * mix(2.0, 0.9, uNight) + pow(s, 48.0) * mix(0.22, 0.10, uNight) + pow(s, 6.0) * mix(0.07, 0.03, uNight));
          if (uNight > 0.01 && h > 0.0) {
            vec3 g = floor(d * 260.0); float st = hash(g);
            float tw = 0.75 + 0.25 * sin(uTime * 1.7 + st * 90.0);
            col += vec3(0.9, 0.95, 1.0) * step(0.9972, st) * tw * uNight * smoothstep(0.02, 0.3, h) * (0.4 + 0.6 * fract(st * 57.0));
          }
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  );
  sky.frustumCulled = false; sky.renderOrder = -1000; sky.matrixAutoUpdate = false;
  scene.add(sky);

  // image-based light from a tiny gradient scene (soft reflections on glass, water, steel)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `varying vec3 v; void main(){ v = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 v; void main(){ vec3 d = normalize(v); float h = d.y;
      vec3 c = mix(vec3(0.92,0.96,1.0), vec3(0.38,0.62,0.95), pow(clamp(h,0.0,1.0),0.5));
      c = mix(c, vec3(0.72,0.66,0.55), 1.0 - smoothstep(-0.3,0.0,h));
      float s = max(dot(d, normalize(vec3(0.42,0.74,0.52))),0.0); c += vec3(1.0,0.93,0.8) * (pow(s,90.0)*6.0 + pow(s,8.0)*0.35);
      gl_FragColor = vec4(c,1.0); }`,
  })));
  const envRT = pmrem.fromScene(envScene, 0.02);
  scene.environment = envRT.texture; scene.environmentIntensity = DAY.env;
  pmrem.dispose();

  const env = {
    sunDir, sun, hemi, fill, sky, night: 0, nightGoal: 0, cur: {},
    listeners: [],
    onNight(fn) { this.listeners.push(fn); },
    setNight(v, instant = false) { this.nightGoal = v ? 1 : 0; if (instant) { this.night = this.nightGoal; this.apply(); } },
    apply() {
      const n = this.night;
      skyU.uZenith.value.lerpColors(DAY.zenith, NIGHT.zenith, n);
      skyU.uHorizon.value.lerpColors(DAY.horizon, NIGHT.horizon, n);
      skyU.uGround.value.lerpColors(DAY.ground, NIGHT.ground, n);
      skyU.uSunCol.value.lerpColors(DAY.sun, NIGHT.sun, n);
      skyU.uNight.value = n;
      scene.fog.color.lerpColors(DAY.fog, NIGHT.fog, n);
      sun.color.lerpColors(DAY.sun, NIGHT.sun, n); sun.intensity = lerp(DAY.sunI, NIGHT.sunI, n);
      hemi.color.lerpColors(DAY.hemiSky, NIGHT.hemiSky, n); hemi.groundColor.lerpColors(DAY.hemiGround, NIGHT.hemiGround, n); hemi.intensity = lerp(DAY.hemiI, NIGHT.hemiI, n);
      fill.color.lerpColors(DAY.fill, NIGHT.fill, n); fill.intensity = lerp(DAY.fillI, NIGHT.fillI, n);
      scene.environmentIntensity = lerp(DAY.env, NIGHT.env, n);
      for (const fn of this.listeners) fn(n);
      engine.shadowDirty = true;
    },
    horizon: skyU.uHorizon.value, zenith: skyU.uZenith.value, sunCol: skyU.uSunCol.value,
    update(dt, t, camera) {
      skyU.uTime.value = t;
      if (this.night !== this.nightGoal) {
        const d = dt / 1.6; this.night = this.nightGoal > this.night ? Math.min(1, this.night + d) : Math.max(0, this.night - d);
        this.apply();
      }
      sky.matrix.makeTranslation(camera.position.x, camera.position.y, camera.position.z);
      sky.matrixWorldNeedsUpdate = true;
    },
    /** keep the shadow map tight around what the camera looks at */
    fitShadow(target, dist) {
      const level = Math.round(Math.log2(clamp(dist * 0.62, 46, 420) / 46) * 2) / 2;
      const half = 46 * Math.pow(2, level);
      const cam = sun.shadow.camera;
      const texel = (half * 2) / sun.shadow.mapSize.x;
      // snap the focus point to shadow texels to stop crawling
      _up.set(0, 1, 0); _right.crossVectors(_up, sunDir).normalize(); _up.crossVectors(sunDir, _right).normalize();
      const rx = Math.round(target.dot(_right) / texel) * texel, uy = Math.round(target.dot(_up) / texel) * texel, fz = target.dot(sunDir);
      _c.set(0, 0, 0).addScaledVector(_right, rx).addScaledVector(_up, uy).addScaledVector(sunDir, fz);
      if (cam.right !== half) {
        const reach = half * 1.25 + 70;                       // depth range hugs the scene so the bias stays in centimetres
        cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half; cam.near = 700 - reach; cam.far = 700 + reach; cam.updateProjectionMatrix();
        sun.shadow.normalBias = texel * 1.4; sun.shadow.bias = -0.035 / (reach * 2);
      }
      sun.target.position.copy(_c); sun.position.copy(_c).addScaledVector(sunDir, 700);
      sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
    },
  };
  env.apply();
  return env;
}
const _up = new THREE.Vector3(), _right = new THREE.Vector3(), _c = new THREE.Vector3();
