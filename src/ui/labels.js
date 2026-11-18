// HTML labels pinned to points in the 3D model: area pins, item tags, room names, a hover tip.
import { project } from '../world/areas.js';

export function createLabels(world, root) {
  const p = { x: 0, y: 0 };
  let pins = [], tags = [], rooms = [], free = [], doors = [], pinsOn = false, tipAt = null, focusAt = null, frame = 0;
  const tip = document.createElement('div'); tip.className = 'tip'; root.appendChild(tip);
  const focus = document.createElement('div'); focus.className = 'focus-tag'; root.appendChild(focus);
  /** is there a wall between the camera and a point? (walk-in view: a label behind a wall would only confuse) */
  const behindWall = (area, x, y, z) => {
    const W = area && area.walls; if (!W) return false; const cam = world.camera.position, [ox, oz] = area.toLocal(cam.x, cam.z), [tx, tz] = area.toLocal(x, z), lx = tx - ox, lz = tz - oz;
    for (let i = 0; i < W.length; i++) { const w = W[i], ex = w[2] - w[0], ez = w[3] - w[1], den = lx * ez - lz * ex; if (den > -1e-9 && den < 1e-9) continue; const qx = w[0] - ox, qz = w[1] - oz, t = (qx * ez - qz * ex) / den; if (t < 0.02 || t > 0.96) continue; const u = (qx * lz - qz * lx) / den; if (u < 0 || u > 1) continue; if (cam.y + (y - cam.y) * t < w[4]) return true; }
    return false;
  };
  // (labels only ever move by transform, and nothing here reads the page's layout back, so a frame never waits on the page)
  const place = (el, x, y, z, pad = 40, tail = '') => {
    const s = project(world, x, y, z, p);
    if (!s || s.x < -pad || s.y < -pad || s.x > world.engine.w + pad || s.y > world.engine.h + pad) { if (el._on !== false) { el.style.display = 'none'; el._on = false; } return false; }
    if (el._on !== true) { el.style.display = ''; el._on = true; }
    const tr = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0)${tail}`; if (tr !== el._tr) { el._tr = tr; el.style.transform = tr; } return true;
  };
  const api = {
    buildPins(areas, onClick, onHover) {
      pins = areas.map((a, i) => {
        const el = document.createElement('button'); el.type = 'button'; el.className = 'pin'; el.style.setProperty('--i', i);
        el.innerHTML = `<b><i>${a.n}</i></b><span>${a.name}</span>`; el.setAttribute('aria-label', `${a.n} ${a.name}`); el.tabIndex = -1;
        el.addEventListener('click', (e) => { e.stopPropagation(); onClick(a.id); });
        el.addEventListener('pointerenter', () => onHover && onHover(a.id)); el.addEventListener('pointerleave', () => onHover && onHover(null));
        el.style.display = 'none'; el._on = false; root.appendChild(el);
        return { el, a };
      });
    },
    showPins(v, except = null) { pinsOn = v; for (const q of pins) { q.hide = !v || q.a.id === except; if (q.hide) { q.el.style.display = 'none'; q.el._on = false; } } },
    markPin(id) { for (const q of pins) q.el.classList.toggle('is-on', q.a.id === id); },
    setTags(items, onClick) {
      api.clearTags();
      tags = items.map((it) => {
        const el = document.createElement('button'); el.type = 'button'; el.className = 'tag'; el.tabIndex = -1;
        el.innerHTML = `<i></i><span><b>${it.name}</b><em>${it.kind}</em></span>`;
        el.addEventListener('click', (e) => { e.stopPropagation(); onClick(it.id); });
        el.style.display = 'none'; el._on = false; root.appendChild(el);
        return { el, it };
      });
    },
    clearTags() { for (const t of tags) t.el.remove(); tags = []; },
    /** one more tag (the opening film calls things out one by one): it pops in and cannot be clicked */
    addTag(it, cls = 'tag-film') { const el = document.createElement('div'); el.className = `tag ${cls}`; el.innerHTML = `<i></i><span><b>${it.name}</b><em>${it.kind || ''}</em></span>`; el.style.display = 'none'; el._on = false; root.appendChild(el); tags.push({ el, it, film: true }); },
    /** a name plate over the door of every room (walk-in view); click it to go in */
    setDoors(items, onClick) {
      api.clearDoors();
      doors = items.map((it) => { const el = document.createElement('button'); el.type = 'button'; el.className = 'door'; el.tabIndex = -1; el.title = `Go into ${it.name}`;
        el.innerHTML = `<span><b>${it.code || ''}</b>${it.name.replace(/^Laboratory \d+: /, '').replace(/^Marine /, '')}</span>`;
        el.addEventListener('click', (e) => { e.stopPropagation(); onClick(it.id); }); el.style.display = 'none'; el._on = false; root.appendChild(el); return { el, it, d: 1e9, occ: true }; });
    },
    clearDoors() { for (const t of doors) t.el.remove(); doors = []; },
    setRooms(items) {
      api.clearRooms();
      rooms = items.map((it) => { const el = document.createElement('div'); el.className = 'room'; el.textContent = it.short || it.name.replace(/^Laboratory (\d+).*/, 'Lab $1').replace(/^(Exhibition panel|Exhibition wall|Fish screen): /, ''); el.style.display = 'none'; el._on = false; root.appendChild(el); return { el, it }; });
    },
    clearRooms() { for (const r of rooms) r.el.remove(); rooms = []; },
    /** loose tags placed by screen position (fish under water): list of { name, kind, ref } */
    setFree(list, onClick) {
      api.clearFree();
      free = list.map((o) => { const el = document.createElement('button'); el.type = 'button'; el.className = 'tag tag-free'; el.tabIndex = -1; el.innerHTML = `<i></i><span><b>${o.name}</b><em>${o.kind || ''}</em></span>`; el.addEventListener('click', (e) => { e.stopPropagation(); onClick(o.ref); }); el.style.display = 'none'; el._on = false; root.appendChild(el); return { el, o }; });
      return free;
    },
    putFree(i, x, y) { const f = free[i]; if (!f) return; if (x === null) { if (f.el._on !== false) { f.el.style.display = 'none'; f.el._on = false; } return; } if (f.el._on !== true) { f.el.style.display = ''; f.el._on = true; } f.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; },
    clearFree() { for (const f of free) f.el.remove(); free = []; },
    hideTags(v) { for (const t of tags) t.el.style.visibility = v ? 'hidden' : ''; },
    occl: null,                                  // the area whose walls hide labels (walk-in view), or null
    pinClear: null,
    /** the name and key figures of the selected thing, pinned to it in the model */
    focus(it) {
      focusAt = it || null; focus.classList.remove('is-on');
      if (!it || it.isDisplay) return; // the TV already carries its title; keep its picture unobstructed
      const figs = (it.specs || []).slice(0, 3).map(([v, k]) => `<span><b>${v}</b>${k}</span>`).join('');
      focus.innerHTML = `<div class="ft-card"><small>${it.code || ''}${it.group ? ` · ${it.group}` : ''}</small><strong>${it.name}</strong>${figs ? `<div class="ft-figs">${figs}</div>` : ''}</div><i class="ft-stem"></i><i class="ft-dot"></i>`;
      clearTimeout(focus._t); focus._t = setTimeout(() => { if (focusAt === it) focus.classList.add('is-on'); }, 900);
    },
    tip(it) {
      tipAt = it || null;
      if (!it) { tip.classList.remove('is-on'); return; }
      tip.innerHTML = `<b>${it.name}</b><em>${it.kind || ''}</em>`; tip.classList.add('is-on');
    },
    update() {
      // (pinClear(x, y) may keep pins off part of the screen: under the menu bar, or behind the words of the hero)
      if (pinsOn) for (const q of pins) if (!q.hide && place(q.el, q.a.pin[0], q.a.pin[1], q.a.pin[2]) && api.pinClear && !api.pinClear(p.x, p.y)) { q.el.style.display = 'none'; q.el._on = false; }
      frame++;
      tags.forEach((t, i) => {
        const a = t.it.anchor;
        if (api.occl && (frame + i) % 6 === 0) t.occ = behindWall(api.occl, a[0], Math.min(a[1], 2.4), a[2]); else if (!api.occl) t.occ = false;
        if (t.occ || t.it === focusAt) { if (t.el._on !== false) { t.el.style.display = 'none'; t.el._on = false; } }
        else if (place(t.el, a[0], a[1], a[2], 10) && t.film) { const left = p.x > world.engine.w * (world.engine.w <= 760 ? 0.5 : 0.7); if (left !== t.left) { t.left = left; t.el.classList.toggle('is-left', left); } }      // near the right edge a film tag opens to the left
      });
      if (doors.length) {
        // the nearest few, not behind a wall, and not the room you are standing in
        const cam = world.camera.position, A = api.occl, show = !!A, off = (t) => { if (t.el._on !== false) { t.el.style.display = 'none'; t.el._on = false; } };
        if (show && frame % 8 === 0) { const [cx, cz] = A.toLocal(cam.x, cam.z); for (const t of doors) { const d = t.it.door, q = t.it.box; t.d = Math.hypot(d[0] - cam.x, d[2] - cam.z); t.inside = cx > q[0] && cx < q[3] && cz > q[2] && cz < q[5]; t.occ = t.d > 38 || t.inside || t.it === focusAt || behindWall(A, d[0], 1.9, d[2]); } doors.sort((p, q) => p.d - q.d); let n = 0; for (const t of doors) { t.on = !t.occ && n < 9; if (t.on) n++; } }
        for (const t of doors) { if (!show || !t.on) { off(t); continue; } const d = t.it.door; if (place(t.el, d[0], d[1], d[2], 0)) t.el.style.opacity = t.d > 26 ? '0.75' : '1'; }
      }
      if (focusAt) {
        // sits above the thing; kept clear of the side panel and the controls
        const it = focusAt, c = it.center, E = world.engine, phone = E.w <= 760, top = it.zone ? Math.min(2.3, it.box[4]) : Math.min(it.box[4] + 0.25, it.center[1] + 2.6), s = project(world, c[0], top, c[2], p);
        if (!s) focus.style.display = 'none';
        else { focus.style.display = ''; const minY = phone ? 236 : 218, tight = s.y < minY - 6; let x = Math.max(phone ? 124 : 160, Math.min(E.w - (phone ? 124 : 590), s.x)); const y = Math.max(minY, Math.min(E.h - (phone ? 300 : 190), s.y));
          if (tight && !phone) x = s.x - 330 > 170 ? s.x - 330 : Math.min(E.w - 590, s.x + 330);      // no room above it: stand beside it instead
          focus.classList.toggle('is-side', tight); focus.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; }
      }
      for (const r of rooms) { const c = r.it.center; place(r.el, c[0], 1.4, c[2], 0, ' translate(-50%,-50%)'); }
      if (tipAt) { const a = tipAt.anchor, s = project(world, a[0], a[1], a[2], p); if (s) tip.style.transform = `translate3d(${(s.x + 14).toFixed(1)}px,${(s.y - 34).toFixed(1)}px,0)`; }
    },
  };
  return api;
}
