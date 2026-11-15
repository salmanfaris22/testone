// Area registry: each of the ten areas owns a shell that opens, an interior that is
// built the first time it is needed, and a list of things you can click.
import * as THREE from 'three';
import { Builder, clamp, easeIO, damp } from './kit.js';
import { crowd } from './props.js';

export class AreaCtx {
  constructor(area, world) { this.area = area; this.world = world; this.items = []; this.people = []; this.schools = []; this.fry = []; this.updaters = []; this.extra = []; }
  /** register something inspectable. box = [x0,y0,z0,x1,y1,z1] in world space */
  item(o) {
    o.area = this.area.id; o.id = `${this.area.id}/${o.code || this.items.length}`;
    const b = o.box; if (!o.anchor) o.anchor = [(b[0] + b[3]) / 2, b[4] + 0.6, (b[2] + b[5]) / 2];
    this.items.push(o); return o;
  }
  person(x, z, ry = 0, hex = 0xf6f8f9, y) { this.people.push({ x, z, ry, hex, y }); }
  school(s) { this.schools.push(s); }
  specks(s) { this.fry.push(s); }
}

export function createAreas(world) {
  const { scene, mats, engine } = world;
  const list = [], byId = {};
  const api = {
    list, byId,
    add(def) {
      const a = { open: 0, goal: 0, items: [], built: false, interior: null, lift: def.lift ?? 7, ...def };
      a.root = new THREE.Group(); a.root.name = a.id;
      if (a.low) a.root.add(a.low);
      if (a.high) { a.root.add(a.high); a.highMeshes = []; a.high.traverse((m) => { if (m.isMesh) a.highMeshes.push(m); }); }
      scene.add(a.root);
      list.push(a); byId[a.id] = a;
      return a;
    },
    /** build the interior now (idempotent) */
    ensure(a) {
      if (a.built || !a.makeInterior) return a;
      a.built = true;
      const b = new Builder(), ctx = new AreaCtx(a, world);
      a.makeInterior(b, ctx);
      const g = b.build(mats, { cast: true, receive: true }); g.name = a.id + '-interior';
      if (ctx.people.length) g.add(crowd(mats, ctx.people));
      for (const o of ctx.extra) g.add(o);
      if (world.fish && (ctx.schools.length || ctx.fry.length)) { const f = world.fish.populate(ctx.schools, ctx.fry); g.add(f.group); }
      a.items = ctx.items; a.updaters = ctx.updaters;
      g.visible = a.open > 0.01 || a.alwaysOpen;
      a.interior = g; a.root.add(g);
      for (const it of a.items) world.items.set(it.id, it);
      engine.shadowDirty = true;
      return a;
    },
    open(id, instant) { const a = byId[id]; if (!a) return; api.ensure(a); a.goal = 1; if (instant) { a.open = 0.999; } world.animating = true; return a; },
    close(id, instant) { const a = byId[id]; if (!a) return; a.goal = 0; if (instant) a.open = 0.001; world.animating = true; return a; },
    closeAll(except) { for (const a of list) if (a.id !== except && a.goal) api.close(a.id); },
    update(dt, t) {
      let moving = false;
      for (const a of list) {
        if (a.open !== a.goal) {
          moving = true;
          const sp = dt / (engine.reduced ? 0.25 : 1.15);
          a.open = a.goal > a.open ? Math.min(a.goal, a.open + sp) : Math.max(a.goal, a.open - sp);
          const k = easeIO(clamp(a.open, 0, 1));
          if (a.high) {
            a.high.position.y = k * a.lift; a.high.visible = k < 0.995;
            for (const key in a.roofMats) { const m = a.roofMats[key]; m.opacity = (m.userData.baseOpacity ?? 1) * (1 - k); }
            for (const m of a.highMeshes) m.castShadow = !m.userData.noShadow && k < 0.35 && m.material !== a.roofMats.glass && m.material !== a.roofMats.glow;
            a.high.updateMatrixWorld(true);
          }
          if (a.interior) a.interior.visible = k > 0.01 || !!a.alwaysOpen;
          a.onOpen && a.onOpen(k);
        }
        if (a.updaters && a.interior && a.interior.visible) for (const u of a.updaters) u(dt, t);
      }
      world.animating = moving;
    },
  };
  return api;
}

/* ───── picking: ray against item boxes ───── */
const _ray = new THREE.Ray(), _box = new THREE.Box3(), _hit = new THREE.Vector3(), _ndc = new THREE.Vector2(), _rc = new THREE.Raycaster();
export function pickItem(world, items, cx, cy) {
  const r = world.engine.canvas.getBoundingClientRect();
  _ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  _rc.setFromCamera(_ndc, world.camera); _ray.copy(_rc.ray);
  let best = null, bd = Infinity;
  for (const it of items) {
    const b = it.box; _box.min.set(b[0], b[1], b[2]); _box.max.set(b[3], b[4], b[5]);
    if (_ray.intersectBox(_box, _hit)) { const d = _hit.distanceTo(_ray.origin) - (it.prio || 0) * 14; if (d < bd) { bd = d; best = it; } }
  }
  return best;
}
export function pickArea(world, cx, cy) {
  const r = world.engine.canvas.getBoundingClientRect();
  _ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  _rc.setFromCamera(_ndc, world.camera); _ray.copy(_rc.ray);
  let best = null, bd = Infinity;
  for (const a of world.areas.list) for (const b of a.hit) {
    _box.min.set(b[0], b[1], b[2]); _box.max.set(b[3], b[4], b[5]);
    if (_ray.intersectBox(_box, _hit)) { const d = _hit.distanceToSquared(_ray.origin); if (d < bd) { bd = d; best = a; } }
  }
  return best;
}
/** world point → screen px (returns null when behind the camera) */
const _v = new THREE.Vector3();
export function project(world, x, y, z, out) {
  _v.set(x, y, z).project(world.camera);
  if (_v.z > 1 || _v.z < -1) return null;
  out.x = (_v.x * 0.5 + 0.5) * world.engine.w; out.y = (-_v.y * 0.5 + 0.5) * world.engine.h; return out;
}
