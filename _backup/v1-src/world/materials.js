// Shared surface types. Colour lives in vertex colours, so the whole model needs only these.
import * as THREE from 'three';
import { canvasTex, rng } from './kit.js';

export function makeMaterials(ripples, env) {
  const R = rng(11);
  const tile = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(40,70,90,.2)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  });
  tile.repeat.set(1 / 1.2, 1 / 1.2);
  const paving = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,70,40,.16)'; g.lineWidth = 2;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { const ox = (y % 2) * 32; g.strokeRect(x * 64 + ox - 64, y * 32, 64, 32); g.strokeRect(x * 64 + ox, y * 32, 64, 32); }
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(120,95,60,${R() * 0.07})`; g.fillRect(R() * w, R() * h, 3, 3); }
  });
  paving.repeat.set(1 / 2.4, 1 / 2.4);
  const asphalt = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = R(); g.fillStyle = v > 0.5 ? `rgba(255,255,255,${R() * 0.1})` : `rgba(0,0,0,${R() * 0.16})`; g.fillRect(R() * w, R() * h, 2, 2); }
  });
  asphalt.repeat.set(1 / 4, 1 / 4);

  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, ...o });
  const m = {
    matte: std({ roughness: 0.9, metalness: 0 }),
    satin: std({ roughness: 0.42, metalness: 0.02 }),
    metal: std({ roughness: 0.34, metalness: 0.82 }),
    floorTile: std({ roughness: 0.78, metalness: 0, map: tile }),
    paving: std({ roughness: 0.95, metalness: 0, map: paving }),
    asphalt: std({ roughness: 0.96, metalness: 0, map: asphalt }),
    ground: std({ roughness: 1, metalness: 0 }),
    leaf: std({ roughness: 0.85, metalness: 0, side: THREE.DoubleSide }),
    cloth: std({ roughness: 0.8, metalness: 0 }),
    glass: std({ roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.5 }),
    window: new THREE.MeshStandardMaterial({ color: 0x3f6278, roughness: 0.12, metalness: 0.55, emissive: 0xffd49a, emissiveIntensity: 0, envMapIntensity: 1.3 }),
    water: std({ roughness: 0.07, metalness: 0, transparent: true, opacity: 0.6, depthWrite: false, normalMap: ripples, normalScale: new THREE.Vector2(0.28, 0.28), emissive: 0x2fa9c7, emissiveIntensity: 0, envMapIntensity: 1.3 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    decal: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  };
  m.water.userData.flow = true;
  env.onNight((n) => {
    m.window.emissiveIntensity = n * 1.5;
    m.water.emissiveIntensity = n * 0.55;
  });
  m.tick = (t) => { ripples.offset.set(t * 0.02, t * 0.013); };
  /** per-building copies for the parts that lift away, so each roof can fade on its own */
  m.roofSet = () => {
    const set = {
      matte: m.matte.clone(), satin: m.satin.clone(), metal: m.metal.clone(), window: m.window.clone(), glow: m.glow.clone(),
      glass: m.glass.clone(), paving: m.paving.clone(),
    };
    for (const k in set) { set[k].transparent = true; set[k].userData.baseOpacity = set[k].opacity; }
    env.onNight((n) => { set.window.emissiveIntensity = n * 1.5; });
    return set;
  };
  return m;
}
