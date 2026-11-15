// bare test page for the 3D world (no site UI)
// /dev-world.html?pose=x,y,z,az,pol,dist&night=1&open=hatchery&walk=nursery&area=broodstock&view=pose|inside|plan
import { createWorld } from './world/world.js';
const q = new URLSearchParams(location.search);
const world = await createWorld(document.getElementById('stage'), { onProgress: () => {} });
window.world = world;
world.rig.user = true; world.rig.wheelZoom = true;
if (q.get('area')) { const a = world.areas.byId[q.get('area')]; world.rig.jump(a[q.get('view') || 'pose']); }
if (q.get('pose')) { const [x, y, z, az, pol, dist] = q.get('pose').split(',').map(Number); world.rig.jump({ x, y, z, az, pol, dist }); }
if (q.get('night')) world.env.setNight(true, true);
if (q.get('open')) for (const id of q.get('open').split(',')) world.openArea(id, true);
if (q.get('walk')) {
  const a = world.areas.byId[q.get('walk')]; world.areas.peek(a.id, true);
  world.rig.room = a.rooms ? a : null; world.rig.fov = world.rig.fovGoal = 56; world.camera.fov = 56; world.camera.updateProjectionMatrix();
  world.rig.limits.distMin = 1.5; world.rig.limits.polMax = 1.56; world.rig.jump(a.walk);
  if (q.get('pose')) { const [x, y, z, az, pol, dist] = q.get('pose').split(',').map(Number); const w = a.toWorld(x, z); world.rig.jump({ x: w[0], y, z: w[1], az: az + a.frame.ry, pol, dist }); }
}
world.engine.start();
window.__ready = true;
