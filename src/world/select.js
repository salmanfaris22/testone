// Marks the selected item quietly: a soft light ring on the floor that breathes out. (The orange corner brackets are gone: the client found them distracting.)
// Only the sea cages are marked (a ring on the water round a cage reads well); round anything else, the globe in 09's hall
// among them, Jeffry found it got in the way (18 November), so they are shown as they are.
import * as THREE from 'three';

/** is this thing marked when it is chosen or pointed at (the ring here, and the card with its figures over it, labels.js)? */
export const marked = (it) => !!it && it.area === 'seacages' && it.group === 'Grow-out cages';

export function createSelect(world) {
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const group = new THREE.Group(); group.visible = false; group.renderOrder = 20; group.name = 'select';
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 72).rotateX(-Math.PI / 2), ringMat); ring.renderOrder = 19;
  let t0 = 0, r0 = 1;
  world.scene.add(group); group.add(ring);
  const api = {
    show(it) {
      if (!marked(it)) { group.visible = false; return; }
      const box = it.box || it, f = it.frame; group.position.set(f ? f.x : 0, 0, f ? f.z : 0); group.rotation.y = f ? f.ry : 0;
      const [x0, y0, z0, x1, , z1] = box, yb = Math.max(y0, 0.14), sx = x1 - x0, sz = z1 - z0;
      ring.position.set((x0 + x1) / 2, yb + 0.03, (z0 + z1) / 2); r0 = Math.hypot(sx, sz) / 2 + 0.5; ring.scale.set(r0, 1, r0);
      group.visible = true; t0 = performance.now();
    },
    /** kept for callers: there are no brackets to fold away any more */
    soft() {},
    hide() { group.visible = false; },
    update() { if (!group.visible) return; const k = ((performance.now() - t0) / 2200) % 1, s = 1 + k * 0.18; ringMat.opacity = 0.38 * (1 - k); ring.scale.x = ring.scale.z = r0 * s; },
  };
  world.updaters.push(() => api.update());
  return api;
}
