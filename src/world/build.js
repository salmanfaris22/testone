// Builds every area and the life around them.
import { createAreas } from './areas.js';
import { buildHalls } from './halls.js';
import { buildPark } from './park.js';
import { buildCages } from './cages.js';
import { buildSite } from './site.js';
import { buildHelipad } from './helipad.js';
import { createFish } from './fish.js';
import { AREAS } from '../data/areas.js';
import { uploadNow } from './screens.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
export const ORDER = AREAS.map((a) => a.id);       // phase order

export async function buildAll(world, onProgress) {
  world.items = new Map(); uploadNow.renderer = world.engine.renderer;
  world.areas = createAreas(world);
  world.fish = createFish(world);
  world.park = buildPark(world); onProgress(0.45); await tick();
  buildHalls(world); onProgress(0.62); await tick();
  world.cages = buildCages(world); onProgress(0.7); await tick();
  buildSite(world); buildHelipad(world); onProgress(0.8); await tick();
  world.areas.list.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  world.areas.ensure(world.areas.byId.seacages);
  world.updaters.push((dt, t) => world.areas.update(dt, t));
  world.openArea = (id, instant) => world.areas.open(id, instant);
  world.closeArea = (id, instant) => world.areas.close(id, instant);
  /** build the remaining interiors one per idle slice, so opening a roof never waits */
  world.prebuild = async () => {
    for (const a of world.areas.list) { if (!a.built) { world.areas.ensure(a); await new Promise((r) => (window.requestIdleCallback || setTimeout)(r, { timeout: 400 })); } }
    // once everything is built, draw every inside once, inside one frame and under the normal picture, so no roof ever stalls as it lifts
    if (world._warmed || world.areas.list.some((a) => !a.built)) return; world._warmed = true;
    let done = false; const stop = world.engine.onFrame(() => {
      if (done) return; done = true; setTimeout(stop, 0);
      const L = world.areas.list;
      for (const a of L) if (a.updaters && !(a.interior && a.interior.visible)) for (const u of a.updaters) { try { u(1 / 60, world.engine.t); } catch (e) { /* only a warm-up */ } }
      world.warm(() => { for (const a of L) { if (a.interior) { a._wv = a.interior.visible; a.interior.visible = true; } if (a.upper) { a._uv = a.upper.visible; a.upper.visible = true; } } },
        () => { for (const a of L) { if (a.interior) a.interior.visible = a._wv; if (a.upper) a.upper.visible = a._uv; } });
    });
  };
  onProgress(0.9);
}
