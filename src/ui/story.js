// The scroll tour: scrolling flies the camera from area to area and lifts each roof in turn.
import { AREAS } from '../data/areas.js';
import { P } from '../world/rig.js';
import { clamp, lerp, smooth, TAU } from '../world/kit.js';

export const HERO = P(-40, 0, -40, -1.25, 1.14, 620);
const DIVE = P(150, -2.2, -330, -0.6, 1.34, 80);
const LEAD = 0.52;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createStory(world, { onExplore, scrollTo }) {
  const { rig, areas } = world;
  const stepsEl = document.getElementById('tour-steps'), railEl = document.getElementById('tour-rail');
  stepsEl.innerHTML = AREAS.map((a, i) => `<article class="step" data-area="${a.id}" id="area-${a.id}"><div class="step-card">
    <div class="step-top"><span class="step-n">${a.n}</span><span class="step-tag">${esc(a.tag)}</span></div>
    <h3>${esc(a.name)}</h3><p class="step-desc">${esc(a.desc)}</p>
    <div class="step-stats">${a.stats.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
    <div class="step-actions"><button class="btn btn-ink" type="button" data-open="${a.id}">Open this area in 3D</button><span class="step-count">${i + 1} of 10</span></div>
  </div></article>`).join('');
  railEl.innerHTML = `<ol>${AREAS.map((a) => `<li><button type="button" data-rail="${a.id}" aria-label="${a.n} ${esc(a.name)}">${a.n}<span>${esc(a.short)}</span></button></li>`).join('')}</ol>`;
  stepsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) onExplore(b.dataset.open); });
  railEl.addEventListener('click', (e) => { const b = e.target.closest('[data-rail]'); if (b) scrollTo(document.getElementById('area-' + b.dataset.rail), 0.34); });
  const steps = [...stepsEl.children], rail = [...railEl.querySelectorAll('button')], N = AREAS.length;

  // camera keys along the tour position τ (τ = i while area i is on screen)
  const keys = [{ t: -1, p: HERO }];
  AREAS.forEach((a, i) => { const A = areas.byId[a.id]; keys.push({ t: i + 0.1, p: A.pose }, { t: i + 0.5, p: A.inside }, { t: i + 0.84, p: A.inside }); });
  keys.push({ t: N + 0.12, p: DIVE }, { t: N + 0.6, p: DIVE });
  for (let i = 1; i < keys.length; i++) { const a = keys[i - 1].p, b = { ...keys[i].p }; let d = (b.az - a.az) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; b.az = a.az + d; keys[i].p = b; }
  const out = P(0, 0, 0, 0, 0, 0);
  function poseAt(tau) {
    let i = 0; while (i < keys.length - 2 && tau > keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1], k = smooth(clamp((tau - a.t) / (b.t - a.t), 0, 1));
    for (const key of ['x', 'y', 'z', 'az', 'pol']) out[key] = lerp(a.p[key], b.p[key], k);
    // long hops pull back a little in the middle so the move reads as a flight, not a slide
    const hop = Math.hypot(b.p.x - a.p.x, b.p.z - a.p.z);
    out.dist = lerp(a.p.dist, b.p.dist, k) + Math.sin(Math.PI * k) * Math.min(120, hop * 0.22);
    return out;
  }

  let active = true, tau = -1, cur = -2, metrics = null, sway = 0;
  const measure = () => { const r = stepsEl.getBoundingClientRect(); metrics = { top: r.top + scrollY, stepH: steps[0].offsetHeight, vh: innerHeight }; };
  measure(); addEventListener('resize', measure);
  const api = {
    HERO, DIVE,
    get tau() { return tau; },
    setActive(v) { const was = active; active = v; if (v && !was) { cur = -2; rig.lambda = 4.2; } },
    measure,
    /** call every frame with the scroll position */
    update(y, dt) {
      // LEAD sets how far up the screen a step must be before its area takes over (keeps card and roof in step)
      const m = metrics, raw = (y + m.vh * LEAD - m.top) / m.stepH;
      tau = raw < 0 ? -1 + clamp(y / Math.max(1, m.top - m.vh * LEAD), 0, 1) : raw;
      if (!active) return;
      const p = poseAt(tau);
      sway += dt; const g = rig.goal;
      const sw = tau < -0.4 ? Math.sin(sway * 0.13) * 0.06 * (1 - smooth(clamp((tau + 1) / 0.6, 0, 1))) : 0;
      rig.flight = null; rig.path = null;
      g.x = p.x; g.y = p.y; g.z = p.z; g.az = p.az + sw; g.pol = p.pol; g.dist = p.dist;
      const idx = Math.floor(tau), f = tau - idx, open = idx >= 0 && idx < N && f > 0.3 && f < 0.95 ? AREAS[idx].id : null;
      if (open !== api.open) { api.open = open; for (const a of areas.list) { if (a.id === open) areas.open(a.id); else if (a.goal) areas.close(a.id); } }
      const on = clamp(Math.floor(tau + 0.06), -1, N - 1);
      if (on !== cur) { cur = on; rail.forEach((b, i) => b.classList.toggle('is-on', i === on)); api.onStep && api.onStep(on); }
    },
  };
  return api;
}
