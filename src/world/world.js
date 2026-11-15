// Puts the whole model together and exposes what the page needs.
import * as THREE from 'three';
import { Engine } from './engine.js';
import { createEnv } from './env.js';
import { createSea, makeRipples } from './sea.js';
import { makeMaterials } from './materials.js';
import { createLand } from './land.js';
import { Rig } from './rig.js';
import { OVERVIEW } from './layout.js';
import { avatars } from './avatars.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function createWorld(parent, { onProgress = () => {} } = {}) {
  const engine = new Engine(parent);
  const { scene, camera } = engine;
  const env = createEnv(engine);
  const ripples = makeRipples(256);
  const mats = makeMaterials(ripples, env);
  onProgress(0.12); await tick();
  const sea = createSea(engine, env, ripples);
  const land = createLand(scene, mats);
  onProgress(0.3); await tick();
  const rig = new Rig(engine, engine.canvas);
  rig.jump(OVERVIEW);

  const world = { engine, scene, camera, env, mats, sea, land, rig, areas: {}, order: [], updaters: [], THREE };

  avatars.init(world);
  const mods = await import('./build.js');
  await mods.buildAll(world, onProgress);

  let stale = 0;
  engine.onFrame((dt, t) => {
    rig.update(dt);
    env.update(dt, t, camera);
    sea.update(dt, t, camera);
    mats.tick(t);
    for (const u of world.updaters) u(dt, t);
    // shadows: refit while anything moves, then keep refreshing slowly so they can never go stale
    if (rig.moved || world.animating) { env.fitShadow(rig.target, rig.drone ? 180 : rig.cur.dist * rig.fit); engine.shadowDirty = true; stale = 0; }
    else if (++stale % 24 === 0) engine.shadowDirty = true;
  });
  // sprites sized in metres need the current pixels-per-metre factor
  const scaled = []; scene.traverse((o) => { const u = o.material && o.material.userData && o.material.userData.scale; if (u && !scaled.includes(u)) scaled.push(u); });
  world.addScaled = (u) => { if (!scaled.includes(u)) scaled.push(u); u.value = world.pxPerM; };
  engine.onResize = (w, h) => {
    rig.fit = Math.max(1, Math.pow(1.5 / (w / h), 0.85)); rig.moved = true;
    world.pxPerM = (h * engine.dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    for (const u of scaled) u.value = world.pxPerM;
    if (world.fish) world.fish.setScale(world.pxPerM);
  };
  rig.onFov = () => engine.onResize(engine.w, engine.h);
  engine.onResize(engine.w, engine.h);
  env.fitShadow(rig.target, rig.cur.dist * rig.fit);
  return world;
}
