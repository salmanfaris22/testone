// bare test page for the 3D world (no site UI) — open /dev-world.html?pose=x,y,z,az,pol,dist&night=1&open=larval
import { createWorld } from './world/world.js';
const q = new URLSearchParams(location.search);
const world = await createWorld(document.getElementById('stage'), { onProgress: () => {} });
window.world = world;
world.rig.user = true; world.rig.wheelZoom = true;
if (q.get('pose')) { const [x, y, z, az, pol, dist] = q.get('pose').split(',').map(Number); world.rig.jump({ x, y, z, az, pol, dist }); }
if (q.get('night')) world.env.setNight(true, true);
if (q.get('open')) for (const id of q.get('open').split(',')) world.openArea(id, true);
world.engine.start();
window.__ready = true;
