// Area registry: each of the ten areas owns a shell that opens, an interior that is
// built the first time it is needed, and a list of things you can click.
// An area may sit in its own frame (moved and turned), so everything it declares is in local metres:
// boxes, poses, pins and people. World positions are worked out here.
import * as THREE from 'three';
import { Builder, clamp, easeIO } from './kit.js';
import { createPeople, wearFor } from './people.js';
import { buildScreens } from './screens.js';
import { rng } from './kit.js';

const NOFRAME = { x: 0, z: 0, ry: 0 };
// groups of machines that are big enough to be mistaken for a room
const SOLID = /^(BF-\d|IP|UVO|SF-I|P1-SF|P1-BF|P1-DF|P1-G|P1-RAS|JT|WB)$/;

export class AreaCtx {
  constructor(area, world) { this.area = area; this.world = world; this.items = []; this.people = []; this.schools = []; this.fry = []; this.updaters = []; this.extra = []; this.aisles = []; }
  /** register something inspectable. box = [x0,y0,z0,x1,y1,z1] in the area's own frame */
  item(o) {
    const a = this.area, b = o.box;
    o.area = a.id; o.id = `${a.id}/${o.code || this.items.length}`; o.frame = a.frame;
    const c = a.toWorld((b[0] + b[3]) / 2, (b[2] + b[5]) / 2);
    o.center = [c[0], (b[1] + b[4]) / 2, c[1]];
    if (o.anchor) { const w = a.toWorld(o.anchor[0], o.anchor[2]); o.anchor = [w[0], o.anchor[1], w[1]]; } else o.anchor = [c[0], b[4] + 0.6, c[1]];
    o.size = Math.max(b[3] - b[0], b[5] - b[2], (b[4] - b[1]) * 1.3);
    // a "zone" is a room or a yard you stand in, not a thing you stand in front of
    if (o.zone === undefined) { const hh = b[4] - b[1]; o.zone = (b[3] - b[0]) * (b[5] - b[2]) >= 30 && hh >= 2 && hh <= 4.6 && !o.swim && !o.solid && !SOLID.test(o.code || ''); }
    if (o.faceAz !== undefined) o.faceAz += a.frame.ry;                    // the side a flat thing is read from
    if (o.view) { const w = a.toWorld(o.view.x, o.view.z); o.view = { ...o.view, x: w[0], z: w[1], az: o.view.az + a.frame.ry }; }   // a hand-picked place to stand
    this.items.push(o); return o;
  }
  /** someone standing or working at a spot; `o` may carry { mode, path, speed, s } */
  person(x, z, ry = 0, hex = 0xf6f8f9, y, o) { const p = { x, z, ry, hex, y, ...o }; this.people.push(p); return p; }
  /** a walkway people may pace along */
  aisle(x0, z0, x1, z1) { this.aisles.push([x0, z0, x1, z1]); }
  school(s) { this.schools.push(s); }
  specks(s) { this.fry.push(s); }
}

export function createAreas(world) {
  const { scene, mats, engine } = world;
  const list = [], byId = {};
  const api = {
    list, byId,
    add(def) {
      const f = def.frame || NOFRAME, c = Math.cos(f.ry), s = Math.sin(f.ry);
      const a = { open: 0, goal: 0, peek: false, items: [], built: false, interior: null, lift: def.lift ?? 7, ...def, frame: f };
      a.toWorld = (x, z) => [f.x + x * c + z * s, f.z - x * s + z * c];
      a.toLocal = (X, Z) => { const dx = X - f.x, dz = Z - f.z; return [dx * c - dz * s, dx * s + dz * c]; };
      const W = (p) => { if (!p) return p; const w = a.toWorld(p.x, p.z); return { ...p, x: w[0], z: w[1], az: p.az + f.ry }; };
      a.pose = W(def.pose); a.inside = W(def.inside); a.plan = W(def.plan); a.walk = W(def.walk);
      if (def.pin) { const w = a.toWorld(def.pin[0], def.pin[2]); a.pin = [w[0], def.pin[1], w[1]]; }
      a.root = new THREE.Group(); a.root.name = a.id; a.root.position.set(f.x, 0, f.z); a.root.rotation.y = f.ry;
      if (a.low) a.root.add(a.low);
      if (a.high) { a.root.add(a.high); a.highMeshes = []; a.high.traverse((m) => { if (m.isMesh) a.highMeshes.push(m); }); }
      scene.add(a.root); a.root.updateMatrixWorld(true);
      list.push(a); byId[a.id] = a;
      return a;
    },
    /** build the interior now (idempotent) */
    ensure(a) {
      if (a.built || !a.makeInterior) return a;
      a.built = true;
      const b = new Builder(), ctx = new AreaCtx(a, world);
      b.scr = []; b.seats = [];
      b.up = new Builder(); b.upH = Math.min(...(a.rooms || [{ h: 5 }]).map((r) => r.h)) - 0.06;       // partitions rise to the ceiling in the walk-in view
      a.makeInterior(b, ctx);
      const g = b.build(mats, { cast: true, receive: true }); g.name = a.id + '-interior';
      a.items = ctx.items; a.updaters = ctx.updaters; if (b.walls) a.walls = (a.walls || []).concat(b.walls);
      // every room gets its door: the nearest doorway on its edge. A room reached through another one shares that room's corridor door.
      { const near = (it, flags) => { const q = it.box; let best = null, bd = 1.7; for (const w of a.walls || []) { if (!w[5] || !flags.includes(w[5])) continue; const mx = (w[0] + w[2]) / 2, mz = (w[1] + w[3]) / 2; if (mx < q[0] - 0.8 || mx > q[3] + 0.8 || mz < q[2] - 0.8 || mz > q[5] + 0.8) continue; const d = Math.min(Math.abs(mx - q[0]), Math.abs(mx - q[3]), Math.abs(mz - q[2]), Math.abs(mz - q[5])); if (d < bd) { bd = d; best = [mx, mz]; } } return best; };
        const zones = a.items.filter((it) => it.zone), put = (it, d, up = 0) => { const w = a.toWorld(d[0], d[1]); it.door = [w[0], 2.55 + up * 0.5, w[1]]; };
        for (const it of zones) { const d = near(it, [1, 2]); if (d) { it._d = d; put(it, d); } }
        for (const it of zones) { if (it._d) continue; const d = near(it, [3]); if (!d) continue; const host = zones.find((o) => o !== it && o._d && d[0] > o.box[0] - 0.8 && d[0] < o.box[3] + 0.8 && d[1] > o.box[2] - 0.8 && d[1] < o.box[5] + 0.8); if (host) put(it, host._d, 1); else put(it, d); }
        // a room with no door of its own (an open bay): the plate goes on the edge nearest to where you walk in
        if (a.walk) { const [wx, wz] = a.toLocal(a.walk.x, a.walk.z); for (const it of zones) { if (it.door) continue; const q = it.box, x = Math.min(q[3], Math.max(q[0], wx)), z = Math.min(q[5], Math.max(q[2], wz)); if (x !== wx || z !== wz) put(it, [x, z]); } } }
      // people at work: about half the desks are taken, and a few chairs at the tables
      { const R = rng(a.id.length * 53 + b.seats.length), office = a.id === 'research' || a.id === 'visitor';
        for (const q of b.seats) { const desk = q.kind === 'desk'; if (R() > (desk ? 0.52 : 0.2)) continue; const k = office ? 'office' : R() < 0.6 ? 'lab' : 'office'; ctx.people.push({ x: q.x, z: q.z, ry: q.ry, y: q.y + 0.02, hex: wearFor(k, R), kind: k, mode: desk ? 'desk' : 'sit' }); } }
      if (ctx.people.length) { const pp = createPeople(mats, ctx.people, { y: 0.12, seed: a.id.length * 7 + ctx.people.length }); g.add(pp.group); a.updaters.push(pp.update); a.people = pp; }
      for (const o of ctx.extra) g.add(o);
      if (b.scr.length) g.add(buildScreens(b.scr));
      if (world.fish && (ctx.schools.length || ctx.fry.length)) { const f = world.fish.populate(ctx.schools, ctx.fry); g.add(f.group); }
      g.visible = a.open > 0.01 || a.alwaysOpen || a.peek;
      a.upper = b.up.build(mats, { cast: false, receive: true }); a.upper.name = a.id + '-upper'; a.upper.visible = a.peek && a.open < 0.01; a.root.add(a.upper);
      a.interior = g; a.root.add(g); a.root.updateMatrixWorld(true);
      for (const it of a.items) world.items.set(it.id, it);
      engine.shadowDirty = true;
      return a;
    },
    open(id, instant) { const a = byId[id]; if (!a) return; api.ensure(a); a.goal = 1; if (instant) { a.open = 0.999; } world.animating = true; return a; },
    close(id, instant) { const a = byId[id]; if (!a) return; a.goal = 0; if (instant) a.open = 0.001; world.animating = true; return a; },
    closeAll(except) { for (const a of list) { if (a.id !== except && a.goal) api.close(a.id); if (a.id !== except && a.peek) api.peek(a.id, false); } },
    /** walk-in view: the roof stays on but stops casting shade, so the hall is lit like a skylit room */
    peek(id, v) {
      const a = byId[id]; if (!a || a.peek === v) return a; if (v) api.ensure(a);
      a.peek = v; if (a.highMeshes) for (const m of a.highMeshes) m.castShadow = !v && !m.userData.noShadow && m.material !== a.roofMats.glass && m.material !== a.roofMats.glow && m.material !== a.roofMats.pane;
      if (a.interior) a.interior.visible = v || a.open > 0.01 || !!a.alwaysOpen;
      if (a.upper) a.upper.visible = v && a.open < 0.01;
      const wm = a.roofMats && a.roofMats.window;       // from indoors the glazing reads as daylight, not as dark glass
      if (wm) { if (!wm.userData.out) wm.userData.out = { c: wm.color.getHex(), r: wm.roughness, m: wm.metalness }; wm.color.setHex(v ? 0xcfe6f4 : wm.userData.out.c); wm.roughness = v ? 0.9 : wm.userData.out.r; wm.metalness = v ? 0 : wm.userData.out.m; wm.userData.inside = v; if (v) { wm.emissive.setHex(0xa9cfe6); wm.emissiveIntensity = 0.75 * (1 - 0.8 * world.env.night); } else { wm.emissive.setHex(0xffd49a); wm.emissiveIntensity = world.env.night * 1.5; } }
      world.env.setIndoor(list.some((o) => o.peek)); a.onPeek && a.onPeek(v); engine.shadowDirty = true; world.animating = true; return a;
    },
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
            for (const m of a.highMeshes) m.castShadow = !a.peek && !m.userData.noShadow && k < 0.35 && m.material !== a.roofMats.glass && m.material !== a.roofMats.glow && m.material !== a.roofMats.pane;
            a.high.updateMatrixWorld(true);
          }
          if (a.interior) a.interior.visible = k > 0.01 || !!a.alwaysOpen || a.peek;
          if (a.upper) a.upper.visible = a.peek && k < 0.01;
          a.onOpen && a.onOpen(k);
        }
        if (a.updaters && a.interior && a.interior.visible) for (const u of a.updaters) u(dt, t);
      }
      world.animating = moving;
    },
  };
  return api;
}

/* ───── picking: ray against item boxes, in each area's own frame ───── */
const _ray = new THREE.Ray(), _lr = new THREE.Ray(), _box = new THREE.Box3(), _hit = new THREE.Vector3(), _ndc = new THREE.Vector2(), _rc = new THREE.Raycaster();
function worldRay(world, cx, cy) {
  const r = world.engine.canvas.getBoundingClientRect();
  _ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  _rc.setFromCamera(_ndc, world.camera); _ray.copy(_rc.ray); return _ray;
}
function toFrame(ray, f, out) {
  if (!f || (!f.ry && !f.x && !f.z)) return out.copy(ray);
  const c = Math.cos(f.ry), s = Math.sin(f.ry), dx = ray.origin.x - f.x, dz = ray.origin.z - f.z;
  out.origin.set(dx * c - dz * s, ray.origin.y, dx * s + dz * c);
  out.direction.set(ray.direction.x * c - ray.direction.z * s, ray.direction.y, ray.direction.x * s + ray.direction.z * c);
  return out;
}
export function pickItem(world, items, cx, cy) {
  const ray = worldRay(world, cx, cy);
  let best = null, bd = Infinity, lf = null;
  for (const it of items) {
    if (it.frame !== lf) { lf = it.frame; toFrame(ray, lf, _lr); }
    const b = it.box; _box.min.set(b[0], b[1], b[2]); _box.max.set(b[3], b[4], b[5]);
    if (_lr.intersectBox(_box, _hit)) { const d = _hit.distanceTo(_lr.origin) - (it.prio || 0) * 14; if (d < bd) { bd = d; best = it; } }
  }
  return best;
}
export function pickArea(world, cx, cy) {
  const ray = worldRay(world, cx, cy);
  let best = null, bd = Infinity;
  for (const a of world.areas.list) {
    toFrame(ray, a.frame, _lr);
    for (const b of a.hit) {
      _box.min.set(b[0], b[1], b[2]); _box.max.set(b[3], b[4], b[5]);
      if (_lr.intersectBox(_box, _hit)) { const d = _hit.distanceToSquared(_lr.origin); if (d < bd) { bd = d; best = a; } }
    }
  }
  return best;
}
/** where a screen point meets the floor (y = 0); null when it looks at the sky */
export function pickFloor(world, cx, cy, y = 0) {
  const ray = worldRay(world, cx, cy); if (ray.direction.y > -0.02) return null;
  const t = (y - ray.origin.y) / ray.direction.y; if (t < 0 || t > 400) return null;
  return [ray.origin.x + ray.direction.x * t, ray.origin.z + ray.direction.z * t];
}
/** world point → screen px (returns null when behind the camera) */
const _v = new THREE.Vector3();
export function project(world, x, y, z, out) {
  _v.set(x, y, z).project(world.camera);
  if (_v.z > 1 || _v.z < -1) return null;
  out.x = (_v.x * 0.5 + 0.5) * world.engine.w; out.y = (-_v.y * 0.5 + 0.5) * world.engine.h; return out;
}
