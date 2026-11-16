// The detail panel: an area (what is in this hall), an item (one tank or machine),
// the view from under water, and one fish with its age slider.
import { value, format, history, spark } from '../data/sim.js';
import { speciesById, OTHER_FISH } from '../data/species.js';
import { areaById, AREAS } from '../data/areas.js';
import { AREA_PHOTO, ITEM_PHOTO, SPECIES_PHOTO, FISH_CUT } from '../data/photos.js';
import { itemIcon } from './icons.js';
import { lengthAt, weightAt, stageAt, maxAge, fmtAge, fmtLen, fmtWeight, GROWTH } from '../data/growth.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ICON = {
  back: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 3 4.5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9m0-9l-9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  walk: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.6" cy="2.9" r="1.4"/><path d="M8.2 5.4 6 8.2l1.9 1.6-.6 3.9M8.2 5.4l2.4 2 1.9.5M6.6 10.6 4.4 13.4"/></svg>',
  top: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M8 2 14 5.2 8 8.4 2 5.2z"/><path d="M2 8.4 8 11.6l6-3.2M2 11.2 8 14.4l6-3.2" stroke-linecap="round"/></svg>',
  plan: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="2.2" y="2.2" width="11.6" height="11.6" rx="1"/><path d="M2.2 7h5.4v6.8M7.6 2.2v2.4M10.4 7h3.4"/></svg>',
  dive: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.8 4.2c1.6-1.4 3.2-1.4 4.8 0s3.2 1.4 4.8 0 2.2-1 2.8-.6"/><path d="M3 10.4c2-2.6 6.4-2.6 8.4 0-2 2.6-6.4 2.6-8.4 0zM11.4 10.4l2.4-1.8v3.6z"/></svg>',
};
const STAGE_AREA = { broodstock: 'broodstock', hatchery: 'hatchery', nursery: 'nursery', seacages: 'seacages' };
const U_POW = 2.4;                                    // the slider gives the first weeks of life room to breathe
const STAGES = [['egg', 'Egg'], ['larva', 'Larva'], ['fry', 'Fry'], ['fingerling', 'Fingerling'], ['juvenile', 'Growing on'], ['market', 'Market size'], ['brood', 'Breeding age']];

const figure = (p) => (p ? `<figure class="p-photo${p.tall ? ' is-tall' : ''}"><img src="${esc(p.src)}" alt="${esc(p.cap)}" loading="lazy" decoding="async" style="aspect-ratio:${p.r || '16 / 10'}"><figcaption>${esc(p.cap)}. Photo: ${esc(p.credit || 'Gulf Aquaculture')}</figcaption></figure>` : '');
const views = (view, sea) => `<div class="p-views" role="group" aria-label="How to look at this area">${[['walk', sea ? 'Dive in' : 'Walk in', sea ? ICON.dive : ICON.walk], ['top', 'From above', ICON.top], ['plan', 'Plan', ICON.plan]].map(([k, l, ic]) => `<button type="button" data-act="view" data-arg="${k}" aria-pressed="${view === k}">${ic}<span>${l}</span></button>`).join('')}</div>`;

export function createPanel(el, { onAct, thumb = () => '' }) {
  const pic = (id) => FISH_CUT[id] || thumb(id);
  let timer = null, current = null;
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && b.tagName !== 'INPUT') { e.preventDefault(); onAct(b.dataset.act, b.dataset.arg); } });
  el.addEventListener('input', (e) => { if (e.target.matches('[data-act="age"]')) onAct('age', +e.target.value / 1000); });
  el.addEventListener('pointerover', (e) => { const b = e.target.closest('[data-act="item"]'); if (b) onAct('hover', b.dataset.arg); });
  el.addEventListener('pointerout', (e) => { const b = e.target.closest('[data-act="item"]'); if (b) onAct('hover', ''); });
  const head = (crumb, num, line, isCode) => `<div class="p-head"><div class="p-crumb">${crumb}</div><div class="p-title"><span class="p-num${isCode ? ' is-code' : ''}">${esc(num)}</span><span class="p-line">${esc(line)}</span></div><button class="p-close" data-act="close" type="button" aria-label="Close panel">${ICON.close}</button></div>`;
  const liveBlock = (it) => it.live && it.live.length ? `<div class="live"><div class="live-head"><b>Readings</b><span>updated <span data-now></span></span></div><div class="live-rows">${it.live.map((s, i) => s.text !== undefined ? `<div class="live-row is-text"><span>${esc(s.k)}</span><b>${esc(s.text)}</b></div>` : `<div class="live-row"><span>${esc(s.k)}</span>${s.d ? `<svg viewBox="0 0 76 22" aria-hidden="true"><path data-sp="${i}" fill="none" stroke="#0e6e7e" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>` : '<i></i>'}<b><span data-v="${i}"></span><small>${esc(s.u || '')}</small></b></div>`).join('')}</div><p class="live-note">Example readings for illustration, not a live feed from the plant.</p></div>` : '';
  const startLive = (it) => {
    if (!it.live || !it.live.length) return;
    const tick = () => {
      it.live.forEach((s, i) => { if (s.text !== undefined) return; const v = el.querySelector(`[data-v="${i}"]`); if (v) v.textContent = format(s, value(it, s)); const pth = el.querySelector(`[data-sp="${i}"]`); if (pth) pth.setAttribute('d', spark(history(it, s))); });
      const n = el.querySelector('[data-now]'); if (n) n.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    tick(); timer = setInterval(tick, 1000);
  };

  const api = {
    area(a, items, { view = 'walk' } = {}) {
      api.stopLive(); current = { type: 'area', id: a.id };
      const d = areaById[a.id], i = AREAS.findIndex((x) => x.id === a.id);
      const groups = new Map(); for (const it of items) { if (!groups.has(it.group)) groups.set(it.group, []); groups.get(it.group).push(it); }
      // named things get a tile with an icon; long runs of numbered tanks stay as small chips so the list keeps short
      const gh = [...groups].map(([g, list]) => {
        const run = list.length >= 5 && list.every((it) => /\d/.test(it.code || '') && !NAMED.test(it.code));
        return `<section class="p-group${run ? ' is-run' : ''}"><h4>${itemIcon(list[0])}<span>${esc(g)}</span><em>${list.length}</em></h4><div class="p-items">${list.map((it) => (run
          ? `<button type="button" data-act="item" data-arg="${esc(it.id)}" title="${esc(it.name)}"><b>${esc(it.code)}</b></button>`
          : `<button type="button" data-act="item" data-arg="${esc(it.id)}">${itemIcon(it)}<span><b>${esc(tileName(it))}</b><em>${esc(it.code || '')}</em></span></button>`)).join('')}</div></section>`;
      }).join('');
      el.innerHTML = head(`<span>Phase ${d.phase}</span><span>Area ${d.n} of 10</span>`, d.n, d.line) + `<div class="p-body">
        <p class="p-tag">${esc(d.tag)}</p><h2>${esc(d.name)}</h2>
        ${views(view, a.id === 'seacages')}
        <div class="p-sub is-top"><h3>What is here</h3><span>${items.length} things to open</span></div>
        <div class="p-groups">${gh}</div>
        <div class="p-sub"><h3>About this area</h3></div>
        <p class="p-desc">${esc(d.desc)}</p>
        ${figure(AREA_PHOTO[a.id])}
        <ul class="p-bul">${d.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        <div class="p-stats">${d.stats.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
        <div class="p-actions"><button class="btn btn-ink" data-act="orbit" type="button">Look around</button><button class="btn btn-ink" data-act="tourhere" type="button">Tour from here</button></div></div>
        <div class="p-foot"><button data-act="prev" type="button">${ICON.back} Previous area</button><span>${i + 1} / 10</span><button data-act="next" type="button">Next area ${ICON.next}</button></div>`;
      el.scrollTop = 0; el.classList.remove('is-min');
    },
    item(it, list, { view = 'walk' } = {}) {
      api.stopLive(); current = { type: 'item', id: it.id };
      const d = areaById[it.area], k = list.indexOf(it);
      const sp = it.species && speciesById[it.species];
      const links = [];
      if (sp) links.push(`<button type="button" data-act="species" data-arg="${sp.id}">About ${esc(sp.local)}</button>`);
      if (it.stage && STAGE_AREA[it.stage] && STAGE_AREA[it.stage] !== it.area) links.push(`<button type="button" data-act="area" data-arg="${STAGE_AREA[it.stage]}">Go to ${esc(areaById[STAGE_AREA[it.stage]].short)}</button>`);
      if (it.link && areaById[it.link] && it.link !== it.area) links.push(`<button type="button" data-act="area" data-arg="${it.link}">See it for real: ${esc(areaById[it.link].short)}</button>`);
      el.innerHTML = head(`<button data-act="up" type="button">${ICON.back}<span>${esc(d.short)}</span></button><span>${esc(it.group)}</span>`, it.code && it.code.length <= 7 ? it.code : d.n, it.kind, !!(it.code && it.code.length <= 7)) + `<div class="p-body">
        <div class="p-chips"><span>${esc(d.short)}</span><span>${esc(it.group)}</span><span>${k + 1} of ${list.length}</span></div>
        <div class="p-titlerow">${itemIcon(it)}<h2>${esc(it.name)}</h2></div><p class="p-desc">${esc(it.desc)}</p>
        ${it.specs ? `<div class="p-tiles">${it.specs.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
        ${it.swim ? `<div class="p-cta"><button class="btn btn-solid p-dive" data-act="dive" data-arg="${esc(it.id)}" type="button">${ICON.dive}<span>See the fish under water</span></button></div>` : ''}
        ${figure(ITEM_PHOTO[it.id])}
        ${it.card ? `<div class="tagcard is-rows"><h3>Details</h3><dl>${it.card.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl></div>` : ''}
        ${liveBlock(it)}${links.length ? `<div class="p-links">${links.join('')}</div>` : ''}
        <div class="p-sub"><h3>Look at it</h3></div>${views(view === 'plan' ? 'top' : view, false).replace(/<button[^>]*data-arg="plan".*?<\/button>/, '')}</div>
        <div class="p-foot"><button data-act="iprev" type="button">${ICON.back} Previous</button><span>${k + 1} / ${list.length}</span><button data-act="inext" type="button">Next ${ICON.next}</button></div>`;
      el.scrollTop = 0; el.classList.remove('is-min');
      startLive(it);
    },
    pic,
    /** under water in a cage or tank, nobody picked yet */
    dive(it, species) {
      api.stopLive(); current = { type: 'dive', id: it.id };
      const d = areaById[it.area];
      const rows = species.map((id) => { const s = speciesById[id] || OTHER_FISH[id]; return `<button type="button" class="fishrow" data-act="pickfish" data-arg="${esc(id)}">${pic(id) ? `<img src="${pic(id)}" alt="" loading="lazy">` : '<i></i>'}<span><b>${esc(s ? s.local : id)}</b><em>${esc(s ? s.common : '')}</em></span>${ICON.next}</button>`; }).join('');
      el.innerHTML = head(`<button data-act="surface" type="button">${ICON.back}<span>Back to the surface</span></button><span>${esc(d.short)}</span>`, it.code && it.code.length <= 7 ? it.code : d.n, 'Under water', !!(it.code && it.code.length <= 7)) + `<div class="p-body">
        <h2>${esc(it.name)}</h2>
        <p class="p-desc">You are below the surface, inside the ${it.swim.net ? 'net' : it.swim.glass ? 'aquarium' : 'tank'}. Drag to look round. Click any fish to swim beside it, read about it and see how it grows.</p>
        <div class="p-sub"><h3>Living here</h3><span>${it.swim.n} shown</span></div><div class="fishrows">${rows}</div>
        ${it.card ? `<div class="tagcard"><dl>${it.card.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl></div>` : ''}
        ${it.specs ? `<div class="p-stats">${it.specs.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
        ${liveBlock(it)}</div>
        <div class="p-foot"><button data-act="surface" type="button">${ICON.back} Back to the surface</button><span></span><span></span></div>`;
      el.scrollTop = 0; el.classList.remove('is-min'); startLive(it);
    },
    /** one fish: who it is, and a slider that takes it from egg to breeding age */
    fish(info, it) {
      api.stopLive(); current = { type: 'fish', id: info.sp };
      const s = speciesById[info.sp] || { local: info.sp, common: '', sci: null, about: '', facts: [], ...OTHER_FISH[info.sp] }, g = GROWTH[info.sp] || GROWTH.naisrah, max = maxAge(info.sp);
      // growth curve
      const W = 320, H = 96, pts = []; for (let i = 0; i <= 60; i++) { const a = max * Math.pow(i / 60, 1.6); pts.push(`${i ? 'L' : 'M'}${((a / max) * W).toFixed(1)} ${(H - 6 - (lengthAt(info.sp, a) / g.Linf) * (H - 14)).toFixed(1)}`); }
      el.innerHTML = head(`<button data-act="fishback" type="button">${ICON.back}<span>Back to the school</span></button><span>${esc(it ? it.name : '')}</span>`, s.local, s.common, true) + `<div class="p-body">
        <h2>${esc(s.local)}</h2><p class="sp-names">${esc(s.common)}${s.sci ? `, <i>${esc(s.sci)}</i>` : ''}</p>
        ${info.n > 1 ? `<p class="fishgroup"><b>${info.n} ${esc(s.local)}</b> selected together: the whole group in this ${it && it.swim && it.swim.net ? 'cage' : it && it.swim && it.swim.glass ? 'aquarium' : 'tank'} is one batch of one age. Move the slider and they all grow.</p>` : ''}
        <div class="age">
          <div class="age-top"><span>Age</span><b data-f="age"></b></div>
          <input type="range" min="0" max="1000" step="1" value="0" data-act="age" aria-label="Age of this group of fish, from egg to breeding age">
          <div class="age-ends"><span>Egg</span><span>${max} years</span></div>
          <ol class="age-stages">${STAGES.map(([k, l]) => `<li data-st="${k}">${l}</li>`).join('')}</ol>
        </div>
        <div class="p-stats"><div><b data-f="len"></b><span>Length</span></div><div><b data-f="wt"></b><span>Weight</span></div><div><b data-f="stage"></b><span>Life stage</span></div></div>
        ${info.n > 1 ? `<div class="p-stats p-stats-group"><div><b>${info.n}</b><span>Fish in the group</span></div><div><b data-f="avglen"></b><span>Average length</span></div><div><b data-f="avgwt"></b><span>Average weight</span></div></div>` : ''}
        <div class="tagcard"><dl><dt>Lives in</dt><dd data-f="where"></dd><dt>At this age</dt><dd class="is-plain" data-f="text"></dd></dl></div>
        <div class="p-links"><button type="button" data-act="fisharea" data-f="go"></button></div>
        <figure class="growth"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Length against age"><path d="${pts.join('')}" fill="none" stroke="#0e6e7e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line data-f="gx" y1="0" y2="${H}" stroke="#e8862e" stroke-width="1.5"/><circle data-f="gd" r="4.5" fill="#e8862e" stroke="#fff" stroke-width="1.5"/></svg><figcaption>Length against age. Typical growth for farmed fish in warm water, not this hatchery's own records.</figcaption></figure>
        ${figure(SPECIES_PHOTO[info.sp])}
        <p class="p-desc">${esc(s.about || '')}</p>
        ${s.facts && s.facts.length ? `<dl class="sp-facts">${s.facts.map(([v, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
        ${speciesById[info.sp] ? `<div class="p-links"><button type="button" data-act="species" data-arg="${esc(info.sp)}">More about ${esc(s.local)}</button></div>` : ''}</div>
        <div class="p-foot"><button data-act="fishback" type="button">${ICON.back} Back to the school</button><span></span><button data-act="fishnext" type="button">Another fish ${ICON.next}</button></div>`;
      el.scrollTop = 0; el.classList.remove('is-min');
      el.querySelector('[data-act="age"]').value = Math.round(Math.pow(info.age / max, 1 / U_POW) * 1000);
      api.fishUpdate(info);
    },
    fishUpdate(info) {
      if (!current || current.type !== 'fish') return;
      const q = (k) => el.querySelector(`[data-f="${k}"]`), st = stageAt(info.sp, info.age), g = GROWTH[info.sp] || GROWTH.naisrah, max = maxAge(info.sp), W = 320, H = 96;
      q('age').textContent = fmtAge(info.age); q('len').textContent = fmtLen(lengthAt(info.sp, info.age)); q('wt').textContent = fmtWeight(weightAt(info.sp, info.age)); q('stage').textContent = st.name;
      if (q('avglen') && info.avgCm !== undefined) { q('avglen').textContent = fmtLen(info.avgCm); q('avgwt').textContent = fmtWeight(info.avgG); }
      q('where').textContent = st.where; q('text').textContent = st.text; const go = q('go'); go.textContent = `Go to ${areaById[st.area].short}`; go.dataset.arg = st.area;
      const x = (info.age / max) * W, y = H - 6 - (lengthAt(info.sp, info.age) / g.Linf) * (H - 14); q('gx').setAttribute('x1', x); q('gx').setAttribute('x2', x); q('gd').setAttribute('cx', x); q('gd').setAttribute('cy', y);
      for (const li of el.querySelectorAll('[data-st]')) li.classList.toggle('is-on', li.dataset.st === st.key);
    },
    ageFromSlider(u, sp) { return maxAge(sp) * Math.pow(u, U_POW); },
    stopLive() { if (timer) { clearInterval(timer); timer = null; } },
    hover(id) { for (const b of el.querySelectorAll('[data-act="item"]')) b.classList.toggle('is-hover', b.dataset.arg === id); },
    get current() { return current; },
    clear() { api.stopLive(); current = null; },
  };
  return api;
}
const NAMED = /^(EX|AC|OF|MDC|LAB|A|GR|FC|PK|WQ|OX|SF-I|BF-L|UV-L|P1-OF|P1-PL|P1-G|EC|GW|FS|BIO|HO|EK|OZ|DG|HX|PS|RMU|P1-[A-Z]{2,})\b/;
const chipLabel = (it) => (/\d/.test(it.code || '') && !NAMED.test(it.code) ? `<b>${esc(it.code)}</b>` : esc(shortName(it)));
const tileName = (it) => shortName(it).replace(/^\d+ (?=\D)/, '');
function shortName(it) {
  return it.name.replace(/^(Exhibition panel|Fish screen): /, '').replace(/^Laboratory (\d+): (.*)$/, '$1 $2').replace(/^Photobioreactors, /, '').replace(/^Phase 1 /, '').replace(/^Marine Discovery Corner/, 'Discovery Corner');
}
