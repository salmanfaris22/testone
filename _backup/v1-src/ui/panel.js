// The detail panel: an area view (what is in this hall) and an item view (one tank or machine).
import { value, format, history, spark } from '../data/sim.js';
import { speciesById } from '../data/species.js';
import { areaById, AREAS } from '../data/areas.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ICON = {
  back: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 3 4.5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9m0-9l-9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
const STAGE_AREA = { broodstock: 'broodstock', hatchery: 'hatchery', nursery: 'nursery', seacages: 'seacages' };

export function createPanel(el, { onAct }) {
  let timer = null, current = null;
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) { e.preventDefault(); onAct(b.dataset.act, b.dataset.arg); } });
  el.addEventListener('pointerover', (e) => { const b = e.target.closest('[data-act="item"]'); if (b) onAct('hover', b.dataset.arg); });
  el.addEventListener('pointerout', (e) => { const b = e.target.closest('[data-act="item"]'); if (b) onAct('hover', ''); });
  const head = (crumb, num, line, isCode) => `<div class="p-head"><div class="p-crumb">${crumb}</div><div class="p-title"><span class="p-num${isCode ? ' is-code' : ''}">${esc(num)}</span><span class="p-line">${esc(line)}</span></div><button class="p-close" data-act="close" type="button" aria-label="Close panel">${ICON.close}</button></div>`;

  const api = {
    area(a, items, { plan = false } = {}) {
      api.stopLive(); current = { type: 'area', id: a.id };
      const d = areaById[a.id], i = AREAS.findIndex((x) => x.id === a.id);
      const groups = new Map(); for (const it of items) { if (!groups.has(it.group)) groups.set(it.group, []); groups.get(it.group).push(it); }
      const gh = [...groups].map(([g, list]) => `<div class="p-group"><span>${esc(g)}</span><div class="p-items">${list.map((it) => `<button type="button" data-act="item" data-arg="${esc(it.id)}">${chipLabel(it)}</button>`).join('')}</div></div>`).join('');
      el.innerHTML = head(`<span>SKMRC</span><span>Area ${d.n} of 10</span>`, d.n, d.line) + `<div class="p-body">
        <p class="p-tag">${esc(d.tag)}</p><h2>${esc(d.name)}</h2><p class="p-desc">${esc(d.desc)}</p>
        <ul class="p-bul">${d.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        <div class="p-stats">${d.stats.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
        <div class="p-actions"><button class="btn btn-ink" data-act="plan" type="button" aria-pressed="${plan}">${plan ? 'Back to 3D view' : 'See it as a plan'}</button><button class="btn btn-ink" data-act="orbit" type="button">Look around</button></div>
        <div class="p-sub"><h3>Click anything to inspect it</h3><span>${items.length} items</span></div>
        <div class="p-groups">${gh}</div></div>
        <div class="p-foot"><button data-act="prev" type="button">${ICON.back} Previous area</button><span>${i + 1} / 10</span><button data-act="next" type="button">Next area ${ICON.next}</button></div>`;
      el.scrollTop = 0; el.classList.remove('is-min');
    },
    item(it, list) {
      api.stopLive(); current = { type: 'item', id: it.id };
      const d = areaById[it.area], k = list.indexOf(it);
      const sp = it.species && speciesById[it.species];
      const live = it.live && it.live.length ? `<div class="live"><div class="live-head"><b>Readings</b><span>updated <span data-now></span></span></div><div class="live-rows">${it.live.map((s, i) => s.text !== undefined ? `<div class="live-row is-text"><span>${esc(s.k)}</span><b>${esc(s.text)}</b></div>` : `<div class="live-row"><span>${esc(s.k)}</span>${s.d ? `<svg viewBox="0 0 76 22" aria-hidden="true"><path data-sp="${i}" fill="none" stroke="#0e6e7e" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>` : '<i></i>'}<b><span data-v="${i}"></span><small>${esc(s.u || '')}</small></b></div>`).join('')}</div><p class="live-note">Example readings for illustration, not a live feed from the plant.</p></div>` : '';
      const links = [];
      if (sp) links.push(`<button type="button" data-act="species" data-arg="${sp.id}">About ${esc(sp.local)}</button>`);
      if (it.stage && STAGE_AREA[it.stage] && STAGE_AREA[it.stage] !== it.area) links.push(`<button type="button" data-act="area" data-arg="${STAGE_AREA[it.stage]}">Go to ${esc(areaById[STAGE_AREA[it.stage]].short)}</button>`);
      el.innerHTML = head(`<button data-act="up" type="button">${ICON.back}<span>${esc(d.short)}</span></button><span>${esc(it.group)}</span>`, it.code && it.code.length <= 7 ? it.code : d.n, it.kind, !!(it.code && it.code.length <= 7)) + `<div class="p-body">
        <h2>${esc(it.name)}</h2><p class="p-desc">${esc(it.desc)}</p>
        ${it.card ? `<div class="tagcard"><dl>${it.card.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl></div>` : ''}
        ${it.specs ? `<div class="p-stats">${it.specs.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
        ${live}${links.length ? `<div class="p-links">${links.join('')}</div>` : ''}</div>
        <div class="p-foot"><button data-act="iprev" type="button">${ICON.back} Previous</button><span>${k + 1} / ${list.length}</span><button data-act="inext" type="button">Next ${ICON.next}</button></div>`;
      el.scrollTop = 0; el.classList.remove('is-min');
      if (it.live && it.live.length) {
        const tick = () => {
          it.live.forEach((s, i) => { if (s.text !== undefined) return; const v = el.querySelector(`[data-v="${i}"]`); if (v) v.textContent = format(s, value(it, s)); const pth = el.querySelector(`[data-sp="${i}"]`); if (pth) pth.setAttribute('d', spark(history(it, s))); });
          const n = el.querySelector('[data-now]'); if (n) n.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        };
        tick(); timer = setInterval(tick, 1000);
      }
    },
    stopLive() { if (timer) { clearInterval(timer); timer = null; } },
    hover(id) { for (const b of el.querySelectorAll('[data-act="item"]')) b.classList.toggle('is-hover', b.dataset.arg === id); },
    get current() { return current; },
    clear() { api.stopLive(); current = null; },
  };
  return api;
}
const NAMED = /^(EX|AC|OF|MDC|LAB|A|GR|FC|PK|WQ|OX|SF-I|BF-L|UV-L|P1-OF|P1-PL|P1-G|EC|GW)\b/;
const chipLabel = (it) => (/\d/.test(it.code || '') && !NAMED.test(it.code) ? `<b>${esc(it.code)}</b>` : esc(shortName(it)));
function shortName(it) {
  return it.name.replace(/^Exhibition panel: /, '').replace(/^Laboratory (\d+): (.*)$/, '$1 $2').replace(/^Photobioreactors, /, '').replace(/^Phase 1 /, '').replace(/^Marine Discovery Corner/, 'Discovery Corner');
}
