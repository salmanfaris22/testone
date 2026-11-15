// Marks the selected item: corner brackets around its box and a slow ring on the floor.
import * as THREE from 'three';

export function createSelect(world) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xe8862e, depthTest: false, transparent: true, opacity: 0.95, toneMapped: false });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xe8862e, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const group = new THREE.Group(); group.visible = false; group.renderOrder = 20; group.name = 'select';
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64).rotateX(-Math.PI / 2), ringMat); ring.renderOrder = 19;
  let frame = null, t0 = 0;
  world.scene.add(group);
  const bar = (geos, w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); geos.push(g); };
  const api = {
    show(box) {
      api.hide();
      const [x0, y0, z0, x1, y1, z1] = box, yb = Math.max(y0, 0.14), sx = x1 - x0, sy = y1 - yb, sz = z1 - z0;
      const l = Math.min(1.6, Math.min(sx, sz) * 0.22 + 0.25), t = Math.max(0.05, Math.min(0.14, Math.max(sx, sz) * 0.012)), geos = [];
      for (const x of [x0, x1]) for (const z of [z0, z1]) for (const y of [yb, y1]) {
        const dx = x === x0 ? 1 : -1, dz = z === z0 ? 1 : -1, dy = y === yb ? 1 : -1;
        bar(geos, l, t, t, x + (dx * l) / 2, y, z); bar(geos, t, t, l, x, y, z + (dz * l) / 2); bar(geos, t, Math.min(l, sy * 0.4), t, x, y + (dy * Math.min(l, sy * 0.4)) / 2, z);
      }
      // merge by hand (few boxes)
      const pos = [], idx = []; let base = 0;
      for (const g of geos) { const p = g.attributes.position.array, i = g.index.array; for (let k = 0; k < p.length; k++) pos.push(p[k]); for (let k = 0; k < i.length; k++) idx.push(i[k] + base); base += p.length / 3; g.dispose(); }
      const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); mg.setIndex(idx);
      frame = new THREE.Mesh(mg, mat); frame.renderOrder = 20; frame.frustumCulled = false;
      ring.position.set((x0 + x1) / 2, yb + 0.03, (z0 + z1) / 2); const r = Math.hypot(sx, sz) / 2 + 0.6; ring.scale.set(r, 1, r);
      group.add(frame, ring); group.visible = true; t0 = performance.now();
    },
    hide() { if (frame) { group.remove(frame); frame.geometry.dispose(); frame = null; } group.remove(ring); group.visible = false; },
    update() { if (!group.visible) return; const k = ((performance.now() - t0) / 1800) % 1; const s = 1 + k * 0.22; ringMat.opacity = 0.55 * (1 - k); ring.scale.x = ring.scale.z = (ring.userData.r || (ring.userData.r = ring.scale.x)) * s; },
  };
  const show = api.show; api.show = (b) => { ring.userData.r = 0; show(b); ring.userData.r = ring.scale.x; };
  world.updaters.push(() => api.update());
  return api;
}
