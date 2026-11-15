// Explore mode: the full-screen interactive model with its controls.
import { AREAS, areaById } from '../data/areas.js';
import { OVERVIEW } from '../world/layout.js';
import { pickArea, pickItem } from '../world/areas.js';
import { P } from '../world/rig.js';
import { clamp } from '../world/kit.js';
import { createLabels } from './labels.js';
import { createPanel } from './panel.js';
import { createSelect } from '../world/select.js';
import { createAudio } from './audio.js';

const I = (d) => `<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  film: I('<rect x="1.8" y="4.2" width="8.6" height="7.6" rx="1.6"/><path d="M10.4 7l3.8-2v6l-3.8-2"/>'),
  drone: I('<circle cx="3.6" cy="3.6" r="1.9"/><circle cx="12.4" cy="3.6" r="1.9"/><circle cx="3.6" cy="12.4" r="1.9"/><circle cx="12.4" cy="12.4" r="1.9"/><path d="M5 5l6 6M11 5l-6 6"/>'),
  tour: I('<path d="M5 3.2v9.6l7.6-4.8z" fill="currentColor"/>'),
  night: I('<path d="M12.8 9.7A5.3 5.3 0 0 1 6.3 3.2 5.3 5.3 0 1 0 12.8 9.7z"/>'),
  sound: I('<path d="M2.5 6.2h2.2L8 3.5v9L4.7 9.8H2.5z"/><path d="M10.3 6a3 3 0 0 1 0 4M12 4.3a5.3 5.3 0 0 1 0 7.4"/>'),
  home: I('<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>'),
};
const FILM = [
  { p: P(-20, 0, -40, -0.9, 1.0, 640), t: 0, cap: ['Umm Al Quwain, United Arab Emirates', 'Sheikh Khalifa Marine Research Centre'] },
  { p: P(-196, 4, -34, -1.55, 1.2, 128), t: 9, cap: ['Marine Innovation Park', 'Where the public meets the science.'] },
  { p: P(-146, 4, -56, -0.25, 1.14, 156), t: 8, cap: ['Research and Administration Wing', 'The science behind every fish.'] },
  { p: P(14, 3, 4, 0.3, 1.2, 132), t: 9, cap: ['Weaning and Nursery', 'Grown with patience.'] },
  { p: P(84, 3, 0, 0.9, 1.12, 122), t: 7, cap: ['Larval Rearing Hall', 'Where life begins.'] },
  { p: P(134, 3, -8, 1.55, 1.14, 112), t: 6, cap: ['Live Feed and Algae', 'Tiny food, big future.'] },
  { p: P(36, 3, -92, 2.4, 1.1, 134), t: 8, cap: ['Broodstock Building', 'Strong parents, strong stock.'] },
  { p: P(124, 3, -96, 2.95, 1.1, 122), t: 6, cap: ['Plant Room and Generators', 'Quietly keeping it all alive.'] },
  { p: P(40, -1, -292, 3.7, 1.24, 150), t: 10, cap: ['Sea Cage Grow-Out', 'Back to the Gulf.'] },
  { p: P(40, 0, -240, 4.5, 1.02, 400), t: 8, cap: ['From broodstock to the sea', 'Local species in local waters.'] },
  { p: P(OVERVIEW.x, 0, OVERVIEW.z, OVERVIEW.az + Math.PI * 2, OVERVIEW.pol, OVERVIEW.dist), t: 9, cap: null },
];

export function createApp(world, hooks) {
  const { rig, env, areas, engine } = world;
  const $ = (s) => document.querySelector(s);
  const body = document.body, appEl = $('#app'), dock = $('#dock'), ctrl = $('#app-ctrl'), hint = $('#hint'), backBtn = $('#app-back'), panelEl = $('#panel');
  const filmEl = $('#film'), filmCap = $('#film-cap'), hud = $('#hud');
  const labels = createLabels(world, $('#labels')), select = createSelect(world), audio = createAudio();
  const S = { exploring: false, area: null, item: null, plan: false, night: false, tour: null, film: false, drone: false };
  const coarse = () => innerWidth <= 760;
  let hoverXY = null, lastHover = null;

  /* ───── controls ───── */
  const pills = {};
  [['film', 'Fly-through', true], ['drone', 'Drone'], ['tour', 'Tour'], ['night', 'Night'], ['sound', 'Sound'], ['home', 'Overview']].forEach(([k, label, heroP]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pill' + (heroP ? ' pill-hero' : ''); b.innerHTML = `${ICON[k]}<span>${label}</span>`; b.title = label; b.setAttribute('aria-label', label);
    if (k === 'night' || k === 'sound' || k === 'tour') b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => act(k)); ctrl.appendChild(b); pills[k] = b;
  });
  AREAS.forEach((a) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.id = a.id; b.innerHTML = `<b>${a.n}</b><span>${a.short}</span>`; b.setAttribute('aria-label', `${a.n} ${a.name}`); b.title = a.name; b.addEventListener('click', () => { stopTour(); goArea(a.id); }); dock.appendChild(b); });
  labels.buildPins(AREAS.map((a) => ({ ...a, pin: areas.byId[a.id].pin })), (id) => { if (!S.exploring) hooks.enter(id); else { stopTour(); goArea(id); } }, (id) => labels.markPin(id));

  const panel = createPanel(panelEl, {
    onAct(a, arg) {
      if (a === 'close') { if (S.item) upToArea(); else overview(); }
      else if (a === 'item') goItem(arg);
      else if (a === 'hover') { const it = arg && world.items.get(arg); if (it) { select.show(it.box); labels.tip(it); } else if (!S.item) { select.hide(); labels.tip(null); } else { const cur = world.items.get(S.item); select.show(cur.box); labels.tip(null); } }
      else if (a === 'prev' || a === 'next') stepArea(a === 'next' ? 1 : -1);
      else if (a === 'iprev' || a === 'inext') stepItem(a === 'inext' ? 1 : -1);
      else if (a === 'up') upToArea();
      else if (a === 'plan') { S.plan = !S.plan; goArea(S.area); }
      else if (a === 'orbit') { rig.drift = 0.07; rig.idle = 99; setTimeout(() => { rig.drift = 0; }, 14000); }
      else if (a === 'area') goArea(arg);
      else if (a === 'species') { exit(); hooks.goSpecies(arg); }
    },
  });
  panelEl.addEventListener('click', (e) => { if (coarse() && e.target.closest('.p-head') && !e.target.closest('button')) panelEl.classList.toggle('is-min'); });

  /* ───── state changes ───── */
  const setShift = () => { const open = body.classList.contains('has-panel'); if (coarse()) rig.setShift(0, open ? engine.h * 0.2 : 0); else rig.setShift(open ? 203 : 0, 0); };
  const setBack = () => { backBtn.querySelector('span').textContent = S.item ? `Back to ${areaById[S.area].short}` : S.area ? 'Back to overview' : 'Back to the site'; };
  const setDock = () => { for (const b of dock.children) b.classList.toggle('is-on', b.dataset.id === S.area); const on = dock.querySelector('.is-on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); };
  const itemsOf = (a) => (S.plan && a.planWith ? a.items.concat(areas.byId[a.planWith].items) : a.items);

  function overview(fly = true) {
    S.area = null; S.item = null; S.plan = false; select.hide(); areas.closeAll(); labels.clearTags(); labels.clearRooms(); labels.tip(null); labels.showPins(true);
    body.classList.remove('has-panel'); panel.clear(); setShift(); setBack(); setDock();
    rig.limits.distMin = 30; rig.limits.distMax = 980; rig.limits.box = [-330, 250, -430, 290]; rig.limits.polMax = 1.4;
    if (fly) rig.flyTo(OVERVIEW, { dur: 1.8 });
    hint.textContent = matchMedia('(pointer: coarse)').matches ? 'Drag to orbit. Pinch to zoom. Tap a pin.' : 'Drag to orbit. Scroll to zoom. Click a pin or a building.';
    audio.scene(S.night ? 'night' : 'outside'); hooks.onArea && hooks.onArea(null);
  }
  function goArea(id) {
    const a = areas.byId[id]; if (!a) return;
    S.area = id; S.last = id; S.item = null; select.hide(); labels.tip(null);
    areas.ensure(a); const partner = S.plan && a.planWith ? areas.byId[a.planWith] : null; if (partner) areas.ensure(partner);
    for (const o of areas.list) if (o !== a && o !== partner && o.goal) areas.close(o.id);
    areas.open(id); if (partner) areas.open(partner.id);
    const pose = S.plan ? a.plan : a.inside;
    rig.limits.distMin = 8; rig.limits.distMax = Math.max(260, pose.dist * 2.4); rig.limits.polMax = id === 'seacages' ? 1.42 : 1.36;
    rig.limits.box = [pose.x - 170, pose.x + 170, pose.z - 150, pose.z + 150];
    body.classList.add('has-panel'); setShift();
    rig.flyTo(pose, { dur: 1.9, hop: 0.2 });
    panel.area(a, a.items, { plan: S.plan }); setBack(); setDock();
    labels.showPins(false);
    if (S.plan) { labels.clearTags(); labels.setRooms(itemsOf(a).filter((it) => !/^(EX-|SPN|EC$|CW$|SW$|F-0|CY$)/.test(it.code)).map((it) => (a.planWith ? it : { ...it, short: it.code }))); }
    else { labels.clearRooms(); labels.setTags(a.items.filter((it) => it.label), (iid) => { stopTour(); goItem(iid); }); }
    hint.textContent = S.plan ? 'Plan view. Click any room or item to inspect it.' : matchMedia('(pointer: coarse)').matches ? 'Tap any tank, machine or label.' : 'Click any tank, machine, room or label to inspect it.';
    audio.scene(id === 'seacages' ? 'sea' : 'hall'); audio.blip(); hooks.onArea && hooks.onArea(id);
    world.prebuild && world.prebuild();
  }
  function goItem(iid) {
    const it = world.items.get(iid); if (!it) return;
    if (it.area !== S.area && !(S.plan && areas.byId[S.area] && areas.byId[S.area].planWith === it.area)) goArea(it.area);
    if (S.plan) { S.plan = false; labels.clearRooms(); const a0 = areas.byId[it.area]; S.area = it.area; labels.setTags(a0.items.filter((x) => x.label), goItem); setDock(); }
    S.item = iid; select.show(it.box); labels.tip(null);
    const b = it.box, size = Math.max(b[3] - b[0], b[5] - b[2], (b[4] - b[1]) * 1.3);
    const pol = clamp(rig.goal.pol, 0.6, 1.02);
    rig.flyTo(P((b[0] + b[3]) / 2, clamp((b[1] + b[4]) / 2, 0, 3), (b[2] + b[5]) / 2, rig.goal.az, pol, clamp(size * 2.5 + 9, 15, 120)), { dur: 1.2, hop: 0 });
    body.classList.add('has-panel'); setShift();
    panel.item(it, areas.byId[it.area].items); setBack(); audio.blip();
  }
  function upToArea() { if (!S.area) return overview(); S.item = null; select.hide(); const a = areas.byId[S.area]; panel.area(a, a.items, { plan: S.plan }); rig.flyTo(S.plan ? a.plan : a.inside, { dur: 1.3, hop: 0 }); setBack(); }
  function stepArea(d) { const i = AREAS.findIndex((a) => a.id === S.area); goArea(AREAS[(i + d + AREAS.length) % AREAS.length].id); }
  function stepItem(d) { const it = world.items.get(S.item); if (!it) return; const list = areas.byId[it.area].items, i = list.indexOf(it); goItem(list[(i + d + list.length) % list.length].id); }

  /* ───── tour, film, drone ───── */
  function startTour() {
    stopFilm(); stopDrone(); const i = Math.max(0, AREAS.findIndex((a) => a.id === S.area));
    S.tour = { i, t: 0 }; pills.tour.setAttribute('aria-pressed', 'true'); pills.tour.querySelector('span').textContent = 'Stop tour'; S.plan = false; goArea(AREAS[i].id);
  }
  function stopTour() { if (!S.tour) return; S.tour = null; pills.tour.setAttribute('aria-pressed', 'false'); pills.tour.querySelector('span').textContent = 'Tour'; }
  function startFilm() {
    stopTour(); stopDrone(); overview(false); labels.showPins(false); S.film = true; body.classList.add('filming'); filmEl.hidden = false;
    rig.user = false; setCap(FILM[0].cap);
    rig.playPath(FILM, { onLeg: (i) => { const c = FILM[Math.min(FILM.length - 1, i + 1)].cap; if (i > 0) setCap(c); }, done: stopFilm });
    audio.scene('outside');
  }
  let capT = null;
  function setCap(c) { filmCap.classList.add('is-out'); clearTimeout(capT); capT = setTimeout(() => { if (!c) return; filmCap.querySelector('small').textContent = c[0]; filmCap.querySelector('b').textContent = c[1]; filmCap.classList.remove('is-out'); }, 520); }
  function stopFilm() { if (!S.film) return; S.film = false; rig.stopPath(); body.classList.remove('filming'); filmEl.hidden = true; rig.user = S.exploring; if (S.exploring) overview(); }
  function startDrone() {
    stopTour(); stopFilm(); if (S.area) overview(false); labels.showPins(false); S.drone = true; body.classList.add('droning'); hud.hidden = false; rig.enterDrone();
    engine.canvas.focus && engine.canvas.focus();
  }
  function stopDrone() { if (!S.drone) return; S.drone = false; rig.exitDrone(); body.classList.remove('droning'); hud.hidden = true; if (S.exploring) { labels.showPins(true); rig.limits.distMin = 30; } }
  function act(k) {
    if (k === 'film') startFilm();
    else if (k === 'drone') startDrone();
    else if (k === 'tour') (S.tour ? stopTour() : startTour());
    else if (k === 'night') setNight(!S.night);
    else if (k === 'sound') audio.toggle().then((v) => { pills.sound.setAttribute('aria-pressed', String(!!v)); if (v) audio.scene(S.area ? (S.area === 'seacages' ? 'sea' : 'hall') : S.night ? 'night' : 'outside'); });
    else if (k === 'home') { stopTour(); overview(); }
  }
  function setNight(v) { S.night = v; env.setNight(v); body.classList.toggle('night', v); pills.night.setAttribute('aria-pressed', String(v)); pills.night.querySelector('span').textContent = v ? 'Day' : 'Night'; if (!S.area) audio.scene(v ? 'night' : 'outside'); }

  /* ───── enter / leave ───── */
  function enter(areaId) {
    if (S.exploring) { if (areaId) goArea(areaId); return; }
    S.exploring = true; appEl.hidden = false; void appEl.offsetWidth; body.classList.add('exploring');
    rig.user = true; rig.wheelZoom = true; rig.drift = 0; rig.lambda = 6.5; hooks.lock(true);
    if (areaId) goArea(areaId); else overview();
    world.prebuild && world.prebuild();
  }
  function exit() {
    if (!S.exploring) return;
    stopTour(); stopFilm(); stopDrone(); const last = S.area || S.last; S.last = null;
    S.exploring = false; S.area = null; S.item = null; S.plan = false; select.hide(); labels.clearTags(); labels.clearRooms(); labels.tip(null);
    body.classList.remove('exploring', 'has-panel', 'pointing'); panel.clear(); rig.setShift(0, 0); rig.user = false; rig.wheelZoom = false;
    rig.limits.distMin = 9; rig.limits.distMax = 980; rig.limits.box = [-330, 250, -430, 290]; rig.limits.polMax = 1.4;
    if (S.night) setNight(false);
    setTimeout(() => { if (!S.exploring) appEl.hidden = true; }, 400);
    hooks.lock(false); hooks.onExit(last);
  }
  backBtn.addEventListener('click', () => { if (S.item) upToArea(); else if (S.area) overview(); else exit(); });
  $('#film-stop').addEventListener('click', stopFilm); $('#hud-exit').addEventListener('click', stopDrone);
  for (const b of hud.querySelectorAll('[data-pad]')) {
    const k = b.dataset.pad, set = (v) => { const d = rig.drone; if (!d) return; if (k === 'f') d.touch.f = v; else if (k === 'b') d.touch.f = -v; else if (k === 'u') d.touch.u = v; else d.touch.u = -v; };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); set(1); }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => set(0));
  }
  addEventListener('keydown', (e) => {
    if (!S.exploring || (e.target.closest && e.target.closest('input,textarea'))) return;
    if (e.key === 'Escape') { if (S.film) stopFilm(); else if (S.drone) stopDrone(); else if (S.item) upToArea(); else if (S.area) overview(); else exit(); }
    else if (S.drone || S.film) return;
    else if (e.key === 'ArrowRight') { stopTour(); S.item ? stepItem(1) : S.area ? stepArea(1) : goArea(AREAS[0].id); }
    else if (e.key === 'ArrowLeft') { stopTour(); S.item ? stepItem(-1) : S.area ? stepArea(-1) : goArea(AREAS[9].id); }
  });

  /* ───── pointer on the model ───── */
  rig.onUser = () => { if (S.tour) stopTour(); rig.drift = 0; };
  rig.onHover = (x, y) => { hoverXY = [x, y]; };
  rig.onTap = (x, y) => {
    if (S.film) return stopFilm(); if (S.drone) return;
    if (!S.exploring) { const a = pickArea(world, x, y); if (a) hooks.enter(a.id); return; }
    stopTour();
    if (S.area) {
      const a = areas.byId[S.area], it = pickItem(world, itemsOf(a), x, y);
      if (it) return goItem(it.id);
      const o = pickArea(world, x, y);
      if (o && o.id !== S.area && !(S.plan && a.planWith === o.id)) return goArea(o.id);
      if (S.item) upToArea();
    } else { const a = pickArea(world, x, y); if (a) goArea(a.id); }
  };
  engine.canvas.addEventListener('pointerleave', () => { hoverXY = null; if (lastHover) { lastHover = null; labels.tip(null); labels.markPin(null); body.classList.remove('pointing'); if (S.item) select.show(world.items.get(S.item).box); else select.hide(); } });

  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  world.updaters.push((dt) => {
    labels.update();
    if (hoverXY && !S.film && !S.drone && !rig.pointers.size) {
      const [x, y] = hoverXY; hoverXY = null; let hit = null;
      if (S.exploring && S.area) { hit = pickItem(world, itemsOf(areas.byId[S.area]), x, y); if (hit !== lastHover) { lastHover = hit; labels.tip(hit && hit.id !== S.item ? hit : null); panel.hover(hit ? hit.id : ''); if (hit) select.show(hit.box); else if (S.item) select.show(world.items.get(S.item).box); else select.hide(); } }
      else { hit = pickArea(world, x, y); if (hit !== lastHover) { lastHover = hit; labels.markPin(hit ? hit.id : null); } }
      body.classList.toggle('pointing', !!hit);
    }
    if (S.tour) { S.tour.t += dt; if (S.tour.t > 11) { S.tour.t = 0; S.tour.i = (S.tour.i + 1) % AREAS.length; goArea(AREAS[S.tour.i].id); } }
    if (S.drone && rig.drone) {
      const d = rig.drone, deg = ((Math.atan2(Math.sin(d.yaw), -Math.cos(d.yaw)) * 180) / Math.PI + 360) % 360;
      hud.querySelector('[data-hud=hdg]').textContent = `${dirs[Math.round(deg / 45) % 8]} ${String(Math.round(deg)).padStart(3, '0')}°`;
      hud.querySelector('[data-hud=alt]').textContent = `${Math.max(0, Math.round(d.pos.y))} m`;
      hud.querySelector('[data-hud=spd]').textContent = `${Math.round(d.vel.length() * 3.6)} km/h`;
    }
  });
  addEventListener('resize', () => { if (S.exploring) setShift(); });

  return { S, enter, exit, goArea, goItem, overview, labels, audio, setNight };
}
