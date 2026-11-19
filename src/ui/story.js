// The scroll tour: scrolling flies the camera from area to area and lifts each roof in turn.
// It starts where a visitor does (08, 09), goes through the new hatchery (02 to 07), then the original one (01), and ends at sea (10, 11): TOUR in data/areas.js.
import { TOUR, CHAPTERS, PHASES } from '../data/areas.js';
import { P } from '../world/rig.js';
import { clamp, lerp, smooth, TAU } from '../world/kit.js';
import { itemIcon } from './icons.js';
import { shortName } from './panel.js';

// The hero is the view Jeffry picked from the drone (17 November): 34 m up over the drop-off of the Innovation Park, across the
// shell roof of 08 and the arch to the Phase 2 halls, the beach and the sea cages. It was framed on a 2.54 : 1 window with a 50°
// lens; a narrower window steps back along the same line (heroPose) so the roof of 08 and the arch both stay in the picture.
// The opening film ends on it. The tour ends low over the grow-out cages.
export const HERO = { ...P(-168.93, 0, -116.32, -2.1141, 1.1639, 87.2), fov: 50, aspect: 2.54 };
/** the hero pose for a window of this shape: the same line of sight, further back on narrower windows */
export const heroPose = (w, h) => {
  const asp = Math.max(0.3, w / Math.max(1, h)), want = Math.min(2.4, Math.max(1, Math.pow(HERO.aspect / asp, 0.62)));
  const fit = Math.max(1, Math.pow(1.5 / asp, 0.85));          // the rig already steps back this far on an upright screen (world.js)
  return { ...HERO, dist: HERO.dist * Math.max(1, want / fit) };
};
const DIVE = P(-64, -2.2, 500, 2.95, 1.34, 80);
const LEAD = 0.52;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const CTA = { seacages: 'Dive in', lfc: 'See the boat' };
const ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHIPS = 2;                           // how many things each card offers to go straight to (the card is kept short)

export function createStory(world, { onExplore, onFocus, scrollTo }) {
  const { rig, areas } = world;
  const stepsEl = document.getElementById('tour-steps'), railEl = document.getElementById('tour-rail'), N = TOUR.length;
  // the card is short: number and name, three figures, a few things to go straight to and the way in. The words about the
  // area wait behind "Read more" (they open inside the card, above its buttons)
  stepsEl.innerHTML = TOUR.map((a, i) => { const ph = PHASES[a.phase - 1], ch = CHAPTERS[a.id]; return `<article class="step${ch ? ' step-first' : ''}" data-area="${a.id}" data-phase="${a.phase}" id="area-${a.id}">${ch ? `<div class="phase-banner" aria-hidden="true"><b>${esc(ch[0])}</b><span>${esc(ch[1])}</span></div>` : ''}<div class="step-card"><i class="sc-bar" aria-hidden="true"></i>
    <header class="sc-head"><span class="sc-n">${a.n}</span><div class="sc-meta"><p class="sc-eye">${esc(ph.name)} · ${esc(a.tag)}</p><h3>${esc(a.name)}</h3></div></header>
    <ul class="sc-stats">${a.stats.map(([v, l]) => `<li><b>${esc(v)}</b><span>${esc(l)}</span></li>`).join('')}</ul>
    <div class="sc-items" data-items="${a.id}" hidden><div></div></div>
    <div class="sc-text" id="sc-text-${a.id}" hidden><p class="sc-line">${esc(a.line)}</p><p class="sc-desc">${esc(a.desc)}</p></div>
    <footer class="sc-foot"><button class="sc-go" type="button" data-open="${a.id}"><span>${CTA[a.id] || 'Walk in'}</span>${ARROW}</button><button class="sc-more" type="button" data-more aria-expanded="false" aria-controls="sc-text-${a.id}">Read more</button><span class="sc-count"><b>${String(i + 1).padStart(2, '0')}</b> / ${N}</span></footer>
  </div></article>`; }).join('');
  railEl.innerHTML = `<ol>${TOUR.map((a) => `${CHAPTERS[a.id] ? `<li class="rail-ph" aria-hidden="true">P${a.phase}</li>` : ''}<li><button type="button" data-rail="${a.id}" aria-label="${a.n} ${esc(a.name)}, Phase ${a.phase}">${a.n}<span>${esc(a.short)} · Phase ${a.phase}</span></button></li>`).join('')}</ol>`;
  stepsEl.addEventListener('click', (e) => {
    const f = e.target.closest('[data-focus]'); if (f) { onFocus(f.dataset.focus); return; }
    const b = e.target.closest('[data-open]'); if (b) { onExplore(b.dataset.open); return; }
    const m = e.target.closest('[data-more]');
    if (m) {
      const card = m.closest('.step-card'), open = card.classList.toggle('is-open'); card.querySelector('.sc-text').hidden = !open; m.textContent = open ? 'Less' : 'Read more'; m.setAttribute('aria-expanded', String(open));
      // an opened card must fit on the screen: if it now runs past the bottom, the page moves up just enough
      if (open) requestAnimationFrame(() => { const over = card.getBoundingClientRect().bottom - (innerHeight - 14); if (over > 1) scrollTo(scrollY + over, 0); });
    }
  });
  railEl.addEventListener('click', (e) => { const b = e.target.closest('[data-rail]'); if (b) scrollTo(document.getElementById('area-' + b.dataset.rail), 0.34); });
  const steps = [...stepsEl.children], bars = steps.map((s) => s.querySelector('.sc-bar')), rail = [...railEl.querySelectorAll('button')], LFC = TOUR.findIndex((a) => a.id === 'lfc');

  // the things each card offers: the area's labelled items, most important first. Interiors are built when first needed, so the chips arrive then.
  const filled = new Set();
  function fill(id) {
    const A = areas.byId[id]; if (filled.has(id) || !A || !A.built || !A.items.length) return;
    filled.add(id);
    const box = stepsEl.querySelector(`[data-items="${id}"]`), named = A.items.filter((it) => it.label).sort((p, q) => (q.prio || 0) - (p.prio || 0));
    const list = (named.length ? named : A.items).slice(0, CHIPS), more = A.items.length - list.length;
    box.lastElementChild.innerHTML = list.map((it) => `<button type="button" data-focus="${esc(it.id)}" title="${esc(it.name)}">${itemIcon(it)}<span>${esc(shortName(it))}</span></button>`).join('') + (more > 0 ? `<button type="button" class="is-more" data-open="${id}">+${more} more</button>` : '');
    box.hidden = false;
  }

  // Camera keys along the tour position τ (τ = i while area i is on screen): the view of the building, then the view into it,
  // held while its card is read. They make one smooth rail: each pose part runs on its own curve through its keys, with
  // shape-preserving slopes (the weighted harmonic mean of the two neighbouring legs, zero where a leg turns back), so the
  // camera never overshoots a view (no swing past a roof, no dip below a view) and rests only where it holds.
  // The point the camera looks at, and its heading, arrive at a building a little later (ARRIVE) than its tilt and distance
  // reach the outside view (0.1): one is still under way while the other turns, so the camera sweeps on from the flight
  // between two buildings into the view inside the next without the stop it would make if all of them turned at once.
  const ARRIVE = 0.22, LOOK = ['x', 'y', 'z', 'az'], ORBIT = ['pol', 'dist'];
  const track = (at) => {
    const ks = [{ t: -1, p: heroPose(world.engine.w, world.engine.h) }];
    TOUR.forEach((a, i) => { const A = areas.byId[a.id]; ks.push({ t: i + at, p: A.pose }, { t: i + 0.5, p: A.inside }, { t: i + 0.84, p: A.inside }); });
    ks.push({ t: N + 0.12, p: DIVE }, { t: N + 0.6, p: DIVE });
    for (let i = 1; i < ks.length; i++) { const a = ks[i - 1].p, b = { ...ks[i].p }; let d = (b.az - a.az) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; b.az = a.az + d; ks[i].p = b; }
    return { ks, m: [] };
  };
  const look = track(ARRIVE), orbit = track(0.1);
  const fit = (R, parts) => {
    const ks = R.ks, same = (p, q) => parts.every((k) => Math.abs(p[k] - q[k]) < 1e-6);
    R.m = ks.map((k, i) => {
      const m = {}, rest = !i || i === ks.length - 1 || same(k.p, ks[i - 1].p) || same(k.p, ks[i + 1].p);
      for (const key of parts) {
        if (rest) { m[key] = 0; continue; }
        const h0 = k.t - ks[i - 1].t, h1 = ks[i + 1].t - k.t, a = (k.p[key] - ks[i - 1].p[key]) / h0, b = (ks[i + 1].p[key] - k.p[key]) / h1, w0 = 2 * h1 + h0, w1 = h1 + 2 * h0;
        m[key] = a * b <= 0 ? 0 : (w0 + w1) / (w0 / a + w1 / b);
      }
      return m;
    });
  };
  const fitRail = () => { fit(look, LOOK); fit(orbit, ORBIT); };
  const out = P(0, 0, 0, 0, 0, 0), seg = { u: 0, hop: 0 };
  /** evaluate one track's parts at τ (cubic Hermite), and say where in its leg τ is */
  const along = (R, parts, tau) => {
    const ks = R.ks; let i = 0; while (i < ks.length - 2 && tau > ks[i + 1].t) i++;
    const a = ks[i], b = ks[i + 1], h = b.t - a.t, u = clamp((tau - a.t) / h, 0, 1), u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = 3 * u2 - 2 * u3, h11 = u3 - u2, ma = R.m[i], mb = R.m[i + 1];
    for (const key of parts) out[key] = h00 * a.p[key] + h10 * h * ma[key] + h01 * b.p[key] + h11 * h * mb[key];
    seg.u = u; seg.hop = Math.hypot(b.p.x - a.p.x, b.p.z - a.p.z);
  };
  function poseAt(tau) {
    along(orbit, ORBIT, tau); along(look, LOOK, tau);
    // long hops pull back a little in the middle so the move reads as a flight, not a slide (sin² starts and ends level)
    const s = Math.sin(Math.PI * seg.u); out.dist += s * s * Math.min(120, seg.hop * 0.22);
    return out;
  }

  let active = true, tau = -1, cur = -2, metrics = null, sway = 0, barAt = -1;
  const measure = () => {
    const r = stepsEl.getBoundingClientRect(); metrics = { top: r.top + scrollY, stepH: steps[0].offsetHeight, vh: innerHeight };
    // the hero steps back on a narrower window (and the next key keeps its turn short)
    const h = heroPose(world.engine.w, world.engine.h);
    for (const { ks } of [look, orbit]) { const d = (h.az - ks[1].p.az) % TAU; ks[0].p = { ...h, az: ks[1].p.az + (d > Math.PI ? d - TAU : d < -Math.PI ? d + TAU : d) }; }
    fitRail();
  };
  measure(); addEventListener('resize', measure);
  const api = {
    HERO, DIVE, open: null,
    get tau() { return tau; },
    setActive(v) { const was = active; active = v; if (v && !was) { cur = -2; api.open = undefined; rig.lambda = 4.2; } if (!v && world.cages && world.cages.sail) world.cages.sail(0); },
    measure,
    /** fill in the chips of every area whose inside has been built by now */
    refresh() { for (const a of TOUR) fill(a.id); },
    /** call every frame with the scroll position */
    update(y, dt) {
      // LEAD sets how far up the screen a step must be before its area takes over (keeps card and roof in step)
      const m = metrics, raw = (y + m.vh * LEAD - m.top) / m.stepH;
      tau = raw < 0 ? -1 + clamp(y / Math.max(1, m.top - m.vh * LEAD), 0, 1) : raw;
      if (!active) return;
      const p = poseAt(tau);
      // at the top of the page the camera hangs over the drop-off like a drone, drifting a little, and settles as the tour begins
      sway += dt; const g = rig.goal, hk = tau < -0.4 ? 1 - smooth(clamp((tau + 1) / 0.6, 0, 1)) : 0;
      const sw = Math.sin(sway * 0.085) * 0.07 * hk, sd = 1 + Math.sin(sway * 0.06 + 1.1) * 0.035 * hk, sp = Math.sin(sway * 0.071 + 0.4) * 0.018 * hk;
      rig.flight = null; rig.path = null;
      g.x = p.x; g.y = p.y; g.z = p.z; g.az = p.az + sw; g.pol = p.pol + sp; g.dist = p.dist * sd;
      // the hero's wider lens closes to the tour's as the first area comes in
      rig.fovGoal = lerp(HERO.fov, 32, smooth(clamp((tau + 1) / 1.05, 0, 1)));
      const idx = Math.floor(tau), f = tau - idx, open = idx >= 0 && idx < N && f > 0.3 && f < 0.95 ? TOUR[idx].id : null;
      // LFC Hamour casts off when its step scrolls in, and sails out to the cages as you scroll through it
      if (world.cages && world.cages.sail) world.cages.sail(idx < LFC ? 0 : idx > LFC ? 1 : smooth(clamp((f - 0.12) / 0.72, 0, 1)));
      if (open !== api.open) { api.open = open; for (const a of areas.list) { if (a.id === open) areas.open(a.id); else if (a.goal) areas.close(a.id); } if (open) fill(open); }
      const on = tau >= N ? -1 : clamp(Math.floor(tau + 0.06), -1, N - 1);          // past the last area no card is up (phones hold the card on screen)
      if (on !== cur) {
        cur = on; world.cycleOn = on >= 0 && TOUR[on].id === 'seacages'; rail.forEach((b, i) => b.classList.toggle('is-on', i === on)); steps.forEach((s, i) => s.classList.toggle('is-on', i === on)); if (on >= 0) fill(TOUR[on].id); api.onStep && api.onStep(on);
        if (world.soon && on + 1 < N) world.soon(TOUR[on + 1].id);              // the next area's inside is built while this card is read
      }
      // the line along the top of the card fills as you scroll through its area
      if (on >= 0) { const k = Math.round(clamp(tau - on, 0, 1) * 250) / 250; if (k !== barAt) { barAt = k; bars[on].style.transform = `scaleX(${k})`; } }
    },
  };
  api.refresh();
  return api;
}
