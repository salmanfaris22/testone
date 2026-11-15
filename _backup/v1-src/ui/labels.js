// HTML labels pinned to points in the 3D model: area pins, item tags, room names, a hover tip.
import { project } from '../world/areas.js';

export function createLabels(world, root) {
  const p = { x: 0, y: 0 };
  let pins = [], tags = [], rooms = [], pinsOn = false, tipAt = null;
  const tip = document.createElement('div'); tip.className = 'tip'; root.appendChild(tip);
  const place = (el, x, y, z, pad = 40) => {
    const s = project(world, x, y, z, p);
    if (!s || s.x < -pad || s.y < -pad || s.x > world.engine.w + pad || s.y > world.engine.h + pad) { if (el._on !== false) { el.style.display = 'none'; el._on = false; } return false; }
    if (el._on !== true) { el.style.display = ''; el._on = true; }
    el.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0)`; return true;
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
    setRooms(items) {
      api.clearRooms();
      rooms = items.map((it) => { const el = document.createElement('div'); el.className = 'room'; el.textContent = it.short || it.name.replace(/^Laboratory (\d+).*/, 'Lab $1').replace(/^Exhibition panel: /, ''); el.style.display = 'none'; el._on = false; root.appendChild(el); return { el, it }; });
    },
    clearRooms() { for (const r of rooms) r.el.remove(); rooms = []; },
    tip(it) {
      tipAt = it || null;
      if (!it) { tip.classList.remove('is-on'); return; }
      tip.innerHTML = `<b>${it.name}</b><em>${it.kind || ''}</em>`; tip.classList.add('is-on');
    },
    update() {
      if (pinsOn) for (const q of pins) if (!q.hide) place(q.el, q.a.pin[0], q.a.pin[1], q.a.pin[2]);
      for (const t of tags) { const a = t.it.anchor; place(t.el, a[0], a[1], a[2], 10); }
      for (const r of rooms) { const b = r.it.box; if (place(r.el, (b[0] + b[3]) / 2, 1.4, (b[2] + b[5]) / 2, 0)) { const w = r.el.offsetWidth; r.el.style.transform += ` translate(-50%,-50%)`; } }
      if (tipAt) { const a = tipAt.anchor, s = project(world, a[0], a[1], a[2], p); if (s) tip.style.transform = `translate3d(${(s.x + 14).toFixed(1)}px,${(s.y - 34).toFixed(1)}px,0)`; }
    },
  };
  return api;
}
