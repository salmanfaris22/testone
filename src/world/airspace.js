// Where the drone may fly: over the ground and the sea, round the buildings and into them. Walls stop it (it hops the low ones),
// a closed door opens as it comes and lets it through once it is open, it passes under the head of a doorway but not through the
// wall above, a roof is a floor from above and a ceiling from inside, and the tanks and machines in a hall are things to fly over
// (the low ones) or round (the tall ones). It also says where the drone's camera may stand (never behind a wall or over a ceiling)
// and shows the inside of a building the drone is near, through its doors and windows, lit as indoors once the drone is in.
// Every wall, door and room is in its area's own frame (shell.js noteWall / doorLeaf, the areas' rooms and envelopes).
import { SEA_Y, landSDF } from './terrain-fn.js';
import { placeLeaf } from './kit.js';
import { SMALL } from './layout.js';

/** the stretch of coast the drone may go: the whole site, the road in, the beach and well out to sea [x0, x1, z0, z1] */
export const BOUNDS = [-1400, 1100, -1100, 1000];
export const ALT_MAX = 600;
const CLEAR = 0.55;                 // the drone's centre stays this far over whatever is under it
const R = 0.46;                     // ...and this far from a wall's centre line
const OPEN = 0.8;                   // a door this far open lets it through

export function createAirspace(world) {
  const { areas } = world;
  // each area: a world box round it (to skip it fast), and the top of its tallest part
  const zones = areas.list.filter((a) => a.hit && a.hit.length).map((a) => {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, top = 0;
    for (const b of a.hit) { for (const [x, z] of [[b[0], b[2]], [b[3], b[2]], [b[3], b[5]], [b[0], b[5]]]) { const w = a.toWorld(x, z); x0 = Math.min(x0, w[0]); x1 = Math.max(x1, w[0]); z0 = Math.min(z0, w[1]); z1 = Math.max(z1, w[1]); } top = Math.max(top, b[4]); }
    const rooms = (a.rooms || []).concat(a.envelope || []);
    return { a, x0: x0 - 16, x1: x1 + 16, z0: z0 - 16, z1: z1 + 16, top, rooms: rooms.length ? rooms : null };
  });
  // two small buildings that are not areas: the gatehouse and the workshop by the east lawn
  const solids = SMALL.slice(0, 2).map((b) => [b.x0, b.z0, b.x1, b.z1, b.h + 0.7]);
  const inRoom = (r, x, z) => (r.circle ? (x - r.x) ** 2 + (z - r.z) ** 2 < r.r * r.r : r.ellipse ? ((x - r.x) / r.a) ** 2 + ((z - r.z) / r.b) ** 2 < 1 : x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
  const roomAt = (Z, x, z) => { if (Z.rooms) for (const r of Z.rooms) if (inRoom(r, x, z)) return r; return null; };
  const hitTop = (a, x, z) => { let y = 0; for (const b of a.hit) if (x > b[0] - 0.5 && x < b[3] + 0.5 && z > b[2] - 0.5 && z < b[5] + 0.5) y = Math.max(y, b[4]); return y; };
  const near = (Z, x, z, m = 0) => x > Z.x0 - m && x < Z.x1 + m && z > Z.z0 - m && z < Z.z1 + m;
  /** is a thing in a hall something to fly over (low) or round (tall)? zones, rooms and huge things are neither */
  const solidItem = (it) => !it.zone && it.size < 34 && it.box[4] - it.box[1] > 0.25;

  /** what is under and over a point: { floor, ceil, zone, room } (floor already has the drone's clearance in it) */
  function space(x, y, z, out = {}) {
    let floor = landSDF(x, z) < 6 ? 0 : SEA_Y, ceil = ALT_MAX, zone = null, room = null;
    for (const Z of zones) {
      if (!near(Z, x, z)) continue;
      const a = Z.a, [lx, lz] = a.toLocal(x, z);
      if (Z.rooms) {
        const r = roomAt(Z, lx, lz); if (!r) continue;
        if (y < r.h + 0.3) {                       // inside, under its roof: the floor, and the low things on it
          ceil = Math.min(ceil, r.h - 0.42); zone = Z; room = r; let f = 0.14;
          if (a.items) for (const it of a.items) { if (!solidItem(it)) continue; const b = it.box; if (b[4] < r.h - 1.7 && lx > b[0] - 0.3 && lx < b[3] + 0.3 && lz > b[2] - 0.3 && lz < b[5] + 0.3) f = Math.max(f, b[4] + 0.05); }
          floor = Math.max(floor, f);
        } else floor = Math.max(floor, Math.max(r.h + 0.5, hitTop(a, lx, lz)));       // on the roof
      } else for (const b of a.hit) if (lx > b[0] && lx < b[3] && lz > b[2] && lz < b[5]) floor = Math.max(floor, b[4] + 0.2);
    }
    for (const s of solids) if (x > s[0] && x < s[2] && z > s[1] && z < s[3]) floor = Math.max(floor, s[4]);
    out.floor = floor + CLEAR; out.ceil = ceil; out.zone = zone; out.room = room; return out;
  }
  /** a wall entry blocks at height y? (an opening lets the drone through under its head, once a closed door is open) */
  const blocks = (w, y) => {
    const d = w[5];
    if (!d) return y < w[4] + 0.15;
    const head = w[7] ?? 99, wallTop = w[8] ?? w[4];
    if (y > head - 0.22) return head < 98 && y < wallTop + 0.15;                     // the wall over the doorway
    return d === 1 && !(w[6] && w[6].open > OPEN) && y < w[4] + 0.15;               // a closed door
  };
  /** keep a point (world) out of the walls, tall machines and small buildings. q is where it was (to know which side it came from).
   *  Returns the push it was given [dx, dz] (0, 0 when nothing was in the way). */
  const push = [0, 0];
  function collide(p, q) {
    push[0] = 0; push[1] = 0;
    for (const Z of zones) {
      if (!near(Z, p.x, p.z)) continue;
      const a = Z.a, W = a.walls; let [lx, lz] = a.toLocal(p.x, p.z); const ql = a.toLocal(q.x, q.z); let moved = false;
      if (W) for (let i = 0; i < W.length; i++) {
        const w = W[i]; if (!blocks(w, p.y)) continue;
        const ex = w[2] - w[0], ez = w[3] - w[1], L2 = ex * ex + ez * ez; if (L2 < 1e-6) continue;
        const u = Math.max(0, Math.min(1, ((lx - w[0]) * ex + (lz - w[1]) * ez) / L2)), cx = w[0] + ex * u, cz = w[1] + ez * u;
        let dx = lx - cx, dz = lz - cz, d = Math.hypot(dx, dz); if (d >= R) continue;
        if (d < 1e-4) { const L = Math.sqrt(L2), side = (ql[0] - w[0]) * ez - (ql[1] - w[1]) * ex >= 0 ? 1 : -1; dx = (ez / L) * side; dz = (-ex / L) * side; d = 1; }
        else { dx /= d; dz /= d; }
        lx = cx + dx * R; lz = cz + dz * R; moved = true;
      }
      // inside a hall: round the tall machines (filters, columns, the aquarium), out of the solid middle of a round room
      const r = Z.rooms && roomAt(Z, lx, lz);
      if (r && p.y < r.h) {
        if (a.items) for (const it of a.items) {
          if (!solidItem(it)) continue; const b = it.box; if (b[4] < r.h - 1.7 || p.y > b[4] + 0.2) continue;
          if (lx > b[0] - R && lx < b[3] + R && lz > b[2] - R && lz < b[5] + R) {
            const o = [[b[0] - R - lx, 0], [b[3] + R - lx, 0], [0, b[2] - R - lz], [0, b[5] + R - lz]].sort((m, n) => Math.abs(m[0] + m[1]) - Math.abs(n[0] + n[1]))[0];
            lx += o[0]; lz += o[1]; moved = true;
          }
        }
        if (r.inner) { const ox = lx - r.x, oz = lz - r.z, d = Math.hypot(ox, oz), m = r.inner + R; if (d < m) { const k = d > 1e-4 ? m / d : 1; lx = r.x + ox * k; lz = r.z + (d > 1e-4 ? oz * k : m); moved = true; } }
      }
      if (moved) { const w = a.toWorld(lx, lz); push[0] += w[0] - p.x; push[1] += w[1] - p.z; p.x = w[0]; p.z = w[1]; }
    }
    for (const s of solids) {
      if (p.y > s[4] || p.x < s[0] - R || p.x > s[2] + R || p.z < s[1] - R || p.z > s[3] + R) continue;
      const o = [[s[0] - R - p.x, 0], [s[2] + R - p.x, 0], [0, s[1] - R - p.z], [0, s[3] + R - p.z]].sort((m, n) => Math.abs(m[0] + m[1]) - Math.abs(n[0] + n[1]))[0];
      p.x += o[0]; p.z += o[1]; push[0] += o[0]; push[1] += o[1];
    }
    return push;
  }
  /** the first wall between two points (world) at the heights along the line: a fraction 0..1 of the way (1: nothing) */
  function sight(a3, b3) {
    let f = 1;
    for (const Z of zones) {
      if (!near(Z, a3.x, a3.z, 6) && !near(Z, b3.x, b3.z, 6)) continue;
      const a = Z.a, W = a.walls; if (!W) continue;
      const [ax, az] = a.toLocal(a3.x, a3.z), [bx, bz] = a.toLocal(b3.x, b3.z), dx = bx - ax, dz = bz - az;
      for (let i = 0; i < W.length; i++) {
        const w = W[i], ex = w[2] - w[0], ez = w[3] - w[1], den = dx * ez - dz * ex; if (den > -1e-9 && den < 1e-9) continue;
        const qx = w[0] - ax, qz = w[1] - az, t = (qx * ez - qz * ex) / den; if (t <= 0 || t >= f) continue;
        const u = (qx * dz - qz * dx) / den; if (u < -0.02 || u > 1.02) continue;
        if (blocks(w, a3.y + (b3.y - a3.y) * t)) f = t;
      }
    }
    return f;
  }

  /* ───── doors: they open as the drone comes, close again behind it ───── */
  const active = new Set();                 // doors that are open, opening or closing
  function doors(p, dt) {
    const here = new Set();
    for (const Z of zones) {
      if (!near(Z, p.x, p.z, 10)) continue;
      const a = Z.a; if (!a.doors || !a.doors.length) continue; const [lx, lz] = a.toLocal(p.x, p.z);
      for (const d of a.doors) {
        const mx = (d.x0 + d.x1) / 2, mz = (d.z0 + d.z1) / 2, half = Math.hypot(d.x1 - d.x0, d.z1 - d.z0) / 2;
        d.want = Math.hypot(lx - mx, lz - mz) < Math.max(7.5, half + 4.5) && p.y < d.y1 + 3.5 ? 1 : 0; here.add(d);
        if (d.want || d.open) active.add(d);
      }
    }
    for (const d of active) {
      if (!here.has(d)) d.want = 0;                       // left behind: it closes
      const sp = dt / (d.kind === 'roll' ? 1.25 : 0.75), o = d.open;
      d.open = d.want ? Math.min(1, o + sp) : Math.max(0, o - sp);
      if (d.open !== o) placeLeaf(d); else if (!d.open && !d.want) active.delete(d);
    }
  }
  /** every door shut (when the drone lands) */
  function shutAll() { for (const Z of zones) for (const d of Z.a.doors || []) { d.want = 0; if (d.open) { d.open = 0; placeLeaf(d); } } active.clear(); }
  /** a gentle hand through a doorway: close to an open door and heading for it, the drone is drawn to the middle of it */
  function guide(p, v, dt) {
    for (const Z of zones) {
      if (!near(Z, p.x, p.z)) continue;
      const a = Z.a, W = a.walls; if (!W) continue; const [lx, lz] = a.toLocal(p.x, p.z), lv = a.toLocal(p.x + v.x, p.z + v.z), vx = lv[0] - lx, vz = lv[1] - lz;
      for (const w of W) {
        const d = w[5]; if (!d || d === 3 || (d === 1 && !(w[6] && w[6].open > 0.5))) continue;
        const ex = w[2] - w[0], ez = w[3] - w[1], L = Math.hypot(ex, ez); if (L < 0.8) continue;
        const ux = ex / L, uz = ez / L, mx = (w[0] + w[2]) / 2, mz = (w[1] + w[3]) / 2, s = (lx - mx) * ux + (lz - mz) * uz, n = (lx - mx) * -uz + (lz - mz) * ux;
        if (Math.abs(n) > 3 || Math.abs(s) > L / 2 + 1.2 || p.y > (w[7] ?? 99) - 0.3) continue;
        const toward = (vx * -uz + vz * ux) * n < 0; if (!toward) continue;
        const room = Math.max(0, L / 2 - R - 0.08), want = Math.max(-room, Math.min(room, s)); if (Math.abs(want - s) < 1e-3) continue;
        const k = Math.min(1, dt * 7) * (1 - Math.abs(n) / 3), ds = (want - s) * k, nx = lx + ux * ds, nz = lz + uz * ds, wv = a.toWorld(nx, nz);
        p.x = wv[0]; p.z = wv[1]; return;
      }
    }
  }

  /* ───── the inside of a building the drone is near shows; the one it is in is lit as indoors ───── */
  let builtOne = 0;
  function look(p, inZone) {
    builtOne = 0;
    for (const Z of zones) {
      const a = Z.a; if (!a.rooms && !a.envelope) continue;
      const dx = Math.max(Z.x0 + 16 - p.x, 0, p.x - (Z.x1 - 16)), dz = Math.max(Z.z0 + 16 - p.z, 0, p.z - (Z.z1 - 16)), dd = Math.hypot(dx, dz);
      const close = dd < 34 && p.y < Z.top + 12;
      if (close && !a.built) { if (builtOne) continue; builtOne = 1; }            // one new inside a frame, at most
      if (close !== !!a.near) areas.near(a.id, close);
      const inside = !!inZone && inZone.a === a; if (inside !== !!a.peek) areas.peek(a.id, inside);
    }
  }
  function reset() { shutAll(); for (const Z of zones) { if (Z.a.near) areas.near(Z.a.id, false); if (Z.a.peek) areas.peek(Z.a.id, false); } }
  return { space, collide, sight, doors, guide, look, reset, shutAll, zones };
}
