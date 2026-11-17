// The control-room screen: click a control room in the model and its big monitor opens over the page, with everything on it.
// Three pages: Overview (key figures, the water loop drawn live, trends, events), the 26 recirculating systems one by one,
// and every reading of every tank and machine in the model. All figures are examples (data/sim.js), like the item cards.
import { value, format, history } from '../data/sim.js';
import { AREAS, areaById } from '../data/areas.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pad2 = (n) => String(n).padStart(2, '0');
const clock = (d = new Date()) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

/* the 26 recirculating systems: which hall, what each one serves, its set points, and a thing in the model to show for it */
const GROUPS = [
  { area: 'hatchery', n: 10, name: (i) => `Larval row L${Math.floor(i / 2) + 1}, tanks ${i % 2 ? '4 to 6' : '1 to 3'}`, item: (i) => `hatchery/L${Math.floor(i / 2) + 1}T${i % 2 ? 4 : 1}`, set: [26.2, 6.7, 39.0, 8.1, 85] },
  { area: 'nursery', n: 6, name: (i) => `Weaning and nursery line ${i + 1}`, find: /raceway|Weaning|Nursery/i, set: [27.0, 6.4, 39.2, 8.0, 140] },
  { area: 'broodstock', n: 6, name: (i) => `Broodstock tanks ${i * 2 + 1} and ${i * 2 + 2}`, find: /Broodstock tank|tank/i, set: [24.6, 6.9, 39.4, 8.1, 110] },
  { area: 'livefeed', n: 2, name: (i) => (i ? 'Rotifer and Artemia cultures' : 'Algae and green water'), find: /Rotifer|Photobioreactor|culture/i, set: [25.0, 7.2, 32.0, 8.2, 24] },
  { area: 'phase1', n: 2, name: (i) => (i ? 'Phase 1 broodstock loop' : 'Phase 1 hatchery loop'), item: () => 'phase1/P1-RAS', set: [26.0, 6.6, 39.1, 8.1, 95] },
];
const SENSORS = [
  { k: 'Temperature', key: 'temp', u: '°C', d: 0.18, p: 1, band: 0.5 }, { k: 'Dissolved oxygen', key: 'o2', u: 'mg/L', d: 0.28, p: 1, band: 0.75 },
  { k: 'Salinity', key: 'sal', u: 'ppt', d: 0.12, p: 1, band: 0.35 }, { k: 'pH', key: 'ph', u: '', d: 0.035, p: 2, band: 0.1 }, { k: 'Flow', key: 'flow', u: 'm³/h', d: 2.4, p: 0, band: 7 },
];
const SYSTEMS = []; GROUPS.forEach((g) => { for (let i = 0; i < g.n; i++) { const n = SYSTEMS.length + 1; SYSTEMS.push({ id: `RAS-${pad2(n)}`, n, area: g.area, name: g.name(i), item: g.item ? g.item(i) : null, find: g.find, sens: SENSORS.map((s, j) => ({ ...s, v: g.set[j] * (1 + ((n * 37 + j * 11) % 9 - 4) * 0.0035) })) }); } });
const EVENTS = ['Drum filter DF-L# backwash complete', 'Feed dosed, larval row L#', 'Oxygen trim valve adjusted, RAS-##', 'UV-L1 dose check passed', 'Biofilter BF-L1 ammonia 0.04 mg/L', 'Make-up water valve opened 40 s', 'Sea water intake pump P# running', 'Night light schedule loaded, row L#', 'Protein skimmer PS-L# cup emptied', 'Temperature set point confirmed, RAS-##', 'Green-water dose sent, row L#', 'Daily sensor calibration logged'];
const ROOMS = { RAS: ['RAS control room', 'All 26 recirculating systems'], SCADA: ['Life-support control room', 'Pumps, filters, oxygen and temperature'], 'P1-CR': ['Phase 1 control room', 'Mirrors the main life-support screens'] };

export function createControl(world, { onGo }) {
  const el = document.createElement('div'); el.className = 'ctl'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Control room screen');
  document.body.appendChild(el);
  let timer = null, tab = 'over', sel = SYSTEMS[0], from = null, back = null, events = [], watch = null, watchT = 0, filter = '', query = '', rows = [];
  const read = (sys, key, ms) => { const s = sys.sens.find((q) => q.key === key); return value({ id: sys.id }, s, ms); };
  const fmt = (sys, key) => { const s = sys.sens.find((q) => q.key === key); return format(s, read(sys, key)); };
  const stateOf = (sys) => (watch === sys ? 'watch' : 'ok');
  const spark = (vals, w, h, lo, hi, y0 = 0) => vals.map((v, i) => `${i ? 'L' : 'M'}${((i / (vals.length - 1)) * w).toFixed(1)} ${(y0 + h - Math.min(1, Math.max(0, (v - lo) / (hi - lo || 1))) * h).toFixed(1)}`).join('');
  const addEvent = (text, level = 0, at = new Date()) => { events.unshift({ t: clock(at).slice(0, 5), text, level }); events.length = Math.min(events.length, 9); };
  const randomEvent = () => EVENTS[Math.floor(Math.random() * EVENTS.length)].replace('##', pad2(1 + Math.floor(Math.random() * 26))).replace('#', String(1 + Math.floor(Math.random() * 5)));

  /* ───── pages ───── */
  const head = () => `<header class="ctl-head"><div class="ctl-brand"><i></i><div><b>${esc(from[0])}</b><span>${esc(from[1])}</span></div></div>
    <nav class="ctl-tabs" role="tablist">${[['over', 'Overview'], ['sys', '26 systems'], ['all', 'Every reading']].map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${tab === k}">${l}</button>`).join('')}</nav>
    <div class="ctl-stat"><span class="ctl-ok"><i></i><b data-c="online">26 / 26</b> online</span><span class="ctl-al" data-c="alarm"></span><span class="ctl-clock" data-c="clock"></span><button class="ctl-x" type="button" data-close aria-label="Close the control screen">&times;</button></div></header>`;
  const kpi = (k, id, u, note) => `<div class="ctl-kpi"><span>${k}</span><b><span data-c="${id}">–</span><small>${u}</small></b><em>${note}</em></div>`;
  // the loop of the selected system, drawn as the operators see it: boxes for each step, water running along the pipes between them
  const mimic = () => {
    const N = [[70, 78, 'Tanks', 'm-o2', 'mg/L O₂'], [212, 78, 'Drum filter', 'm-flow', 'm³/h'], [354, 78, 'Biofilter', 'm-nh3', 'mg/L NH₃'], [496, 78, 'Skimmer', 'm-orp', 'mV'], [638, 78, 'UV', 'm-uv', 'mJ/cm²'], [496, 214, 'Oxygen cone', 'm-o2out', 'mg/L'], [212, 214, 'Heat pump', 'm-temp', '°C']];
    return `<svg class="ctl-mimic" viewBox="0 30 720 250" role="img" aria-label="The water loop of the selected system">
      <path class="pipe" d="M70 78H638V214H70Z"/><path class="pipe flow" d="M70 78H638V214H70Z"/>
      ${N.map(([x, y, name, id, u]) => `<g transform="translate(${x} ${y})"><rect x="-58" y="-34" width="116" height="68" rx="12"/><circle class="led" cx="44" cy="-21" r="4.5"/><text class="nm" y="-12">${name}</text><text class="vl" y="14" data-c="${id}">–</text><text class="un" y="28">${u}</text></g>`).join('')}
      <g transform="translate(354 214)"><circle class="pump" r="22"/><path class="fan" d="M0 -13 5 0 0 13 -5 0Z M-13 0 0 -5 13 0 0 5Z"/><text class="un" y="42">Pumps 2 of 3</text></g>
      <text class="cap" x="70" y="268" data-c="m-name"></text></svg>`;
  };
  const over = () => `<div class="ctl-over">
    <div class="ctl-kpis">${kpi('Recirculating flow', 'k-flow', 'm³/h', 'All 26 loops')}${kpi('Water reused', 'k-reuse', '%', 'Make-up 4.8 %')}${kpi('Dissolved oxygen', 'k-o2', 'mg/L', 'Average, all tanks')}${kpi('Temperature', 'k-temp', '°C', 'Average, all tanks')}${kpi('Power', 'k-kw', 'kW', 'Pumps, blowers, UV')}${kpi('Oxygen in store', 'k-lox', '%', 'Liquid oxygen tank')}</div>
    <section class="ctl-card ctl-loop"><h3><span>Water loop</span><em data-c="loop-id"></em></h3>${mimic()}</section>
    <section class="ctl-card ctl-trend"><h3><span>Last 30 minutes</span><em><i class="c1"></i>Temperature <i class="c2"></i>Oxygen <i class="c3"></i>pH</em></h3>
      <svg viewBox="0 0 600 190" preserveAspectRatio="none" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<line class="grid" x1="0" x2="600" y1="${10 + i * 42.5}" y2="${10 + i * 42.5}"/>`).join('')}<path class="t1" data-t="temp"/><path class="t2" data-t="o2"/><path class="t3" data-t="ph"/></svg></section>
    <section class="ctl-card ctl-events"><h3><span>Alarms and events</span><em data-c="ev-open"></em></h3><ol data-c="events"></ol></section>
    <section class="ctl-card ctl-halls"><h3><span>By hall</span><em>systems · oxygen · temperature</em></h3><div data-c="halls"></div></section>
  </div>`;
  const sysPage = () => `<div class="ctl-sys"><div class="ctl-grid">${SYSTEMS.map((s) => `<button type="button" class="ctl-tile" data-sys="${s.id}" aria-pressed="${s === sel}"><span class="t-top"><b>${s.id}</b><i></i></span><span class="t-name">${esc(s.name)}</span><span class="t-vals"><span><b data-s="${s.id}:temp"></b>°C</span><span><b data-s="${s.id}:o2"></b>O₂</span><span><b data-s="${s.id}:flow"></b>m³/h</span></span></button>`).join('')}</div>
    <aside class="ctl-card ctl-detail" data-c="detail"></aside></div>`;
  const detail = () => `<h3><span>${sel.id}</span><em>${esc(areaById[sel.area].n)} · ${esc(areaById[sel.area].short)}</em></h3><p class="d-name">${esc(sel.name)}</p>
    <div class="d-rows">${sel.sens.map((s) => `<div class="d-row"><span>${s.k}</span><svg viewBox="0 0 120 26" preserveAspectRatio="none" aria-hidden="true"><path data-d="${s.key}"/></svg><b><span data-dv="${s.key}"></span><small>${s.u}</small></b><i><u data-db="${s.key}"></u></i></div>`).join('')}</div>
    <p class="d-state" data-c="d-state"></p><button type="button" class="ctl-go" data-go="${sel.id}">See it in the 3D model</button>`;
  const allPage = () => `<div class="ctl-all"><div class="ctl-filters"><input type="search" placeholder="Find a tank or a machine" aria-label="Find a tank or a machine" value="${esc(query)}"><div class="ctl-chips"><button type="button" data-f="" aria-pressed="${!filter}">Everything</button>${AREAS.map((a) => `<button type="button" data-f="${a.id}" aria-pressed="${filter === a.id}">${a.n} ${esc(a.short)}</button>`).join('')}</div></div>
    <div class="ctl-table" data-c="table" tabindex="0"></div><p class="ctl-count" data-c="count"></p></div>`;
  const body = () => (tab === 'over' ? over() : tab === 'sys' ? sysPage() : allPage());
  function render() {
    el.innerHTML = `<div class="ctl-screen">${head()}<main class="ctl-main">${body()}</main><footer class="ctl-foot"><span>Sheikh Khalifa Marine Research Centre · central monitoring</span><span>Example readings for illustration, not a live feed from the plant</span></footer></div>`;
    if (tab === 'sys') el.querySelector('[data-c="detail"]').innerHTML = detail();
    if (tab === 'all') table();
    tick();
  }
  /** every item of the model that has readings, as rows; clicking one goes to it in 3D */
  function table() {
    const box = el.querySelector('[data-c="table"]'); if (!box) return; const q = query.trim().toLowerCase();
    rows = []; for (const a of AREAS) { if (filter && filter !== a.id) continue; const A = world.areas.byId[a.id]; for (const it of (A && A.items) || []) { if (!it.live || !it.live.length) continue; if (q && !(`${it.name} ${it.code} ${it.kind}`.toLowerCase().includes(q))) continue; rows.push(it); } }
    box.innerHTML = rows.length ? rows.map((it, i) => `<button type="button" class="ctl-row" data-item="${esc(it.id)}"><span class="r-area">${areaById[it.area].n}</span><span class="r-name"><b>${esc(it.name)}</b><em>${esc(it.kind || '')}</em></span><span class="r-vals">${it.live.slice(0, 4).map((s, j) => `<span><em>${esc(s.k)}</em><b data-r="${i}:${j}"></b></span>`).join('')}</span></button>`).join('') : '<p class="ctl-empty">Nothing matches. Try another word or another hall.</p>';
    el.querySelector('[data-c="count"]').textContent = `${rows.length} tanks and machines with readings · click one to see it in the model`;
    box.scrollTop = 0;
  }

  /* ───── once a second ───── */
  const set = (id, v) => { const n = el.querySelector(`[data-c="${id}"]`); if (n && n.textContent !== v) n.textContent = v; };
  function tick() {
    if (el.hidden) return; const now = Date.now();
    // one system drifts towards its limit now and then, the operators see it and it settles: that is what the screen is for
    if (now > watchT) { if (watch) { addEvent(`${watch.id} oxygen back in range`, 0); watch = null; watchT = now + 14000 + Math.random() * 16000; } else { watch = SYSTEMS[Math.floor(Math.random() * SYSTEMS.length)]; addEvent(`${watch.id} oxygen trending low, cone output raised`, 1); watchT = now + 16000; } }
    else if (Math.random() < 0.12) addEvent(randomEvent(), 0);
    set('clock', clock()); const al = el.querySelector('[data-c="alarm"]'); if (al) { al.textContent = watch ? '1 to watch' : 'No alarms'; al.classList.toggle('is-watch', !!watch); }
    if (tab === 'over') {
      let flow = 0, o2 = 0, temp = 0; for (const s of SYSTEMS) { flow += read(s, 'flow'); o2 += read(s, 'o2'); temp += read(s, 'temp'); }
      set('k-flow', Math.round(flow).toLocaleString('en-US')); set('k-reuse', (95.2 + Math.sin(now / 9000) * 0.15).toFixed(1)); set('k-o2', (o2 / 26).toFixed(2)); set('k-temp', (temp / 26).toFixed(1));
      set('k-kw', Math.round(186 + Math.sin(now / 5000) * 6 + Math.sin(now / 1700) * 2).toString()); set('k-lox', (71.4 - ((now / 60000) % 30) * 0.02).toFixed(1));
      set('loop-id', `${sel.id} · ${sel.name}`); set('m-name', `${sel.id}  ·  ${sel.name}  ·  ${areaById[sel.area].name}`);
      set('m-o2', fmt(sel, 'o2')); set('m-flow', fmt(sel, 'flow')); set('m-temp', fmt(sel, 'temp'));
      set('m-nh3', (0.04 + Math.sin(now / 21000 + sel.n) * 0.012).toFixed(2)); set('m-orp', Math.round(318 + Math.sin(now / 15000 + sel.n) * 9).toString()); set('m-uv', Math.round(118 + Math.sin(now / 11000 + sel.n) * 4).toString()); set('m-o2out', (read(sel, 'o2') + 2.9).toFixed(1));
      el.querySelectorAll('[data-t]').forEach((p, lane) => { const s = sel.sens.find((q) => q.key === p.dataset.t), vals = history({ id: sel.id }, s, 60, 30); p.setAttribute('d', spark(vals, 600, 62, s.v - s.band, s.v + s.band, 6 + lane * 58)); });
      const ev = el.querySelector('[data-c="events"]'); if (ev) ev.innerHTML = events.map((e) => `<li class="lv${e.level}"><i></i><time>${e.t}</time><span>${esc(e.text)}</span></li>`).join('');
      set('ev-open', watch ? '1 open' : 'All clear');
      const halls = el.querySelector('[data-c="halls"]'); if (halls) halls.innerHTML = GROUPS.map((g) => { const list = SYSTEMS.filter((s) => s.area === g.area), a = areaById[g.area]; const mo = list.reduce((t, s) => t + read(s, 'o2'), 0) / list.length, mt = list.reduce((t, s) => t + read(s, 'temp'), 0) / list.length; return `<button type="button" data-hall="${g.area}"><span><b>${a.n}</b>${esc(a.short)}</span><em>${list.length}</em><em>${mo.toFixed(1)} mg/L</em><em>${mt.toFixed(1)} °C</em><i class="${list.includes(watch) ? 'is-watch' : ''}"></i></button>`; }).join('');
    } else if (tab === 'sys') {
      for (const n of el.querySelectorAll('[data-s]')) { const [id, key] = n.dataset.s.split(':'), s = SYSTEMS[+id.slice(4) - 1], v = fmt(s, key); if (n.textContent !== v) n.textContent = v; }
      for (const t of el.querySelectorAll('.ctl-tile')) t.classList.toggle('is-watch', watch && t.dataset.sys === watch.id);
      for (const s of sel.sens) {
        const v = read(sel, s.key), dv = el.querySelector(`[data-dv="${s.key}"]`); if (!dv) break; dv.textContent = format(s, v);
        el.querySelector(`[data-d="${s.key}"]`).setAttribute('d', spark(history({ id: sel.id }, s, 40, 20), 120, 26, s.v - s.band, s.v + s.band));
        el.querySelector(`[data-db="${s.key}"]`).style.left = `${Math.min(100, Math.max(0, 50 + ((v - s.v) / s.band) * 50)).toFixed(1)}%`;
      }
      const st = el.querySelector('[data-c="d-state"]'); if (st) { const w = stateOf(sel) === 'watch'; st.textContent = w ? 'Oxygen trending low. Cone output raised, watching.' : 'Running normally. All readings inside their bands.'; st.classList.toggle('is-watch', w); }
    } else {
      const box = el.querySelector('[data-c="table"]'); if (!box || !rows.length) return;
      const rh = (box.firstElementChild && box.firstElementChild.offsetHeight) || 56, i0 = Math.max(0, Math.floor(box.scrollTop / rh) - 2), i1 = Math.min(rows.length, i0 + Math.ceil(box.clientHeight / rh) + 4);
      for (let i = i0; i < i1; i++) { const it = rows[i]; it.live.slice(0, 4).forEach((s, j) => { const n = box.querySelector(`[data-r="${i}:${j}"]`); if (!n) return; const v = s.text !== undefined ? s.text : `${format(s, value(it, s))}${s.u ? ` ${s.u}` : ''}`; if (n.textContent !== v) n.textContent = v; }); }
    }
  }

  /* ───── in and out ───── */
  function close() {
    if (el.hidden) return; el.classList.remove('is-on'); clearInterval(timer); timer = null;
    setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 260);
    world.engine.setActive(true); if (back && back.focus) back.focus({ preventScroll: true });
  }
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-close]')) return close();
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; if (tab === 'all' && world.prebuild) world.prebuild().then(() => { if (!el.hidden && tab === 'all') table(); }); return render(); }
    const s = e.target.closest('[data-sys]'); if (s) { sel = SYSTEMS[+s.dataset.sys.slice(4) - 1]; for (const b of el.querySelectorAll('.ctl-tile')) b.setAttribute('aria-pressed', String(b === s)); el.querySelector('[data-c="detail"]').innerHTML = detail(); return tick(); }
    const h = e.target.closest('[data-hall]'); if (h) { sel = SYSTEMS.find((q) => q.area === h.dataset.hall); tab = 'sys'; return render(); }
    const f = e.target.closest('[data-f]'); if (f) { filter = f.dataset.f; for (const b of el.querySelectorAll('[data-f]')) b.setAttribute('aria-pressed', String(b === f)); table(); return tick(); }
    const g = e.target.closest('[data-go]'); if (g) { const A = world.areas.byId[sel.area]; world.areas.ensure(A); const it = (sel.item && world.items.get(sel.item)) || (sel.find && A.items.find((q) => sel.find.test(q.name))) || null; close(); return onGo(sel.area, it ? it.id : null); }
    const r = e.target.closest('[data-item]'); if (r) { const it = world.items.get(r.dataset.item); close(); if (it) onGo(it.area, it.id); }
  });
  el.addEventListener('input', (e) => { if (e.target.matches('input[type=search]')) { query = e.target.value; table(); tick(); } });
  el.addEventListener('scroll', (e) => { if (e.target.matches && e.target.matches('.ctl-table')) tick(); }, true);
  addEventListener('keydown', (e) => { if (!el.hidden && e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); close(); } }, true);

  return {
    get isOpen() { return !el.hidden; },
    /** open the screen of a control room item (its code picks the title; all three rooms see the same plant) */
    open(it) {
      from = ROOMS[it && it.code] || ROOMS.RAS; back = document.activeElement; tab = 'over';
      if (!events.length) { const now = Date.now(); [['Night shift handover logged', 420], ['Sea water intake open', 300], ['Generator weekly test passed', 190], ['UV-L1 lamp hours 7,900', 95, 1], ['Drum filter DF-L2 backwash complete', 44], ['Intake pump P3 started', 12]].forEach(([t, m, lv]) => addEvent(t, lv || 0, new Date(now - m * 60000))); }
      watchT = Date.now() + 9000; el.hidden = false; render(); void el.offsetWidth; el.classList.add('is-on');
      clearInterval(timer); timer = setInterval(tick, 1000);
      setTimeout(() => { if (!el.hidden) world.engine.setActive(false); }, 420);        // the model rests behind the screen
      const x = el.querySelector('.ctl-x'); if (x) x.focus({ preventScroll: true });
    },
    close,
  };
}
