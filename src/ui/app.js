// Explore mode: the full-screen interactive model with its controls.
// Three ways to look at an area: walk in at eye level (the roof stays on), from above (the roof lifts off),
// or as a plan. Tanks with fish can be entered under water, where every fish can be followed and aged.
import { AREAS, TOUR, areaById } from '../data/areas.js';
import { speciesById, OTHER_FISH } from '../data/species.js';
import { OVERVIEW, CAM_BOX } from '../world/layout.js';
import { pickArea, pickItem, pickFloor } from '../world/areas.js';
import { P, DRONE_SPEED } from '../world/rig.js';
import { makeDrone } from '../world/drone.js';
import { makeDock } from '../world/dock.js';
import { createAirspace } from '../world/airspace.js';
import { SEA_Y, landSDF } from '../world/terrain-fn.js';
import { clamp } from '../world/kit.js';
import { createLabels } from './labels.js';
import { createPanel } from './panel.js';
import { createSelect } from '../world/select.js';
import { createAudio } from './audio.js';
import { createDive } from '../world/dive.js';
import { createControl } from './control.js';

const I = (d) => `<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  film: I('<rect x="1.8" y="4.2" width="8.6" height="7.6" rx="1.6"/><path d="M10.4 7l3.8-2v6l-3.8-2"/>'),
  drone: I('<circle cx="3.6" cy="3.6" r="1.9"/><circle cx="12.4" cy="3.6" r="1.9"/><circle cx="3.6" cy="12.4" r="1.9"/><circle cx="12.4" cy="12.4" r="1.9"/><path d="M5 5l6 6M11 5l-6 6"/>'),
  tour: I('<path d="M5 3.2v9.6l7.6-4.8z" fill="currentColor"/>'),
  night: I('<path d="M12.8 9.7A5.3 5.3 0 0 1 6.3 3.2 5.3 5.3 0 1 0 12.8 9.7z"/>'),
  sound: I('<path d="M2.5 6.2h2.2L8 3.5v9L4.7 9.8H2.5z"/><path d="M10.3 6a3 3 0 0 1 0 4M12 4.3a5.3 5.3 0 0 1 0 7.4"/>'),
  home: I('<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>'),
};
const SOUND = { visitor: 'visitor', research: 'lab', nursery: 'hall', hatchery: 'hall', rascontrol: 'machines', livefeed: 'hall', broodstock: 'hall', plantroom: 'machines', genroom: 'machines', phase1: 'hall', seacages: 'sea', lfc: 'sea' };
const NICE = [[0.001, '1 mm'], [0.002, '2 mm'], [0.005, '5 mm'], [0.01, '1 cm'], [0.02, '2 cm'], [0.05, '5 cm'], [0.1, '10 cm'], [0.2, '20 cm'], [0.5, '50 cm'], [1, '1 m']];

export function createApp(world, hooks) {
  const { rig, env, areas, engine } = world;
  const $ = (s) => document.querySelector(s);
  const body = document.body, appEl = $('#app'), dock = $('#dock'), ctrl = $('#app-ctrl'), hint = $('#hint'), backBtn = $('#app-back'), panelEl = $('#panel');
  const filmEl = $('#film'), filmCap = $('#film-cap'), hud = $('#hud');
  const labels = createLabels(world, $('#labels')), select = createSelect(world), audio = createAudio(), dive = createDive(world);
  world.updaters.push((dt, t) => dive.update(dt, t));
  const veil = document.createElement('div'); veil.className = 'dive-veil'; appEl.appendChild(veil);
  const scaleEl = document.createElement('div'); scaleEl.className = 'fishscale'; scaleEl.innerHTML = '<i></i><span></span>'; scaleEl.hidden = true; $('#labels').appendChild(scaleEl);
  const FILM = [{ p: { ...OVERVIEW, az: OVERVIEW.az - 0.5, dist: OVERVIEW.dist * 1.1 }, t: 0, cap: ['Umm Al Quwain, United Arab Emirates', 'Sheikh Khalifa Marine Research Centre'] },
    ...TOUR.map((a, i) => { const q = areas.byId[a.id].pose; return { p: { ...q, y: 3, az: q.az + (i % 2 ? 0.5 : -0.4), pol: 1.16, dist: q.dist * 0.72 }, t: i === 0 ? 9 : 7, cap: [a.name, a.line] }; }),
    { p: { ...OVERVIEW, az: OVERVIEW.az + Math.PI * 2 }, t: 10, cap: null }];
  const S = { exploring: false, area: null, item: null, view: 'walk', night: false, tour: null, film: false, drone: false, dive: null, fish: null, arrived: false };
  const coarse = () => innerWidth <= 760, touch = matchMedia('(pointer: coarse)').matches;
  let hoverXY = null, lastHover = null, tagT = 0, fishTags = [];

  /* ───── controls ───── */
  const pills = {};
  [['film', 'Fly-through', true], ['drone', 'Drone'], ['tour', 'Tour'], ['night', 'Night'], ['sound', 'Sound'], ['home', 'Overview']].forEach(([k, label, heroP]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pill' + (heroP ? ' pill-hero' : ''); b.innerHTML = `${ICON[k]}<span>${label}</span>`; b.title = label; b.setAttribute('aria-label', label);
    if (k === 'night' || k === 'sound' || k === 'tour') b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => act(k)); ctrl.appendChild(b); pills[k] = b;
  });
  AREAS.forEach((a, i) => {
    if (i === 0 || AREAS[i - 1].phase !== a.phase) { const t = document.createElement('i'); t.className = 'dock-ph'; t.textContent = `P${a.phase}`; t.title = `Phase ${a.phase}`; dock.appendChild(t); }
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = a.id; b.innerHTML = `<b>${a.n}</b><span>${a.short}</span>`; b.setAttribute('aria-label', `${a.n} ${a.name}, Phase ${a.phase}`); b.title = `${a.name} (Phase ${a.phase})`; b.addEventListener('click', () => { stopTour(); goArea(a.id); }); dock.appendChild(b); });
  labels.buildPins(AREAS.map((a) => ({ ...a, pin: areas.byId[a.id].pin })), (id) => { if (!S.exploring) hooks.enter(id); else { stopTour(); goArea(id); } }, (id) => labels.markPin(id));
  appEl.addEventListener('click', (e) => { if (e.target.closest('button')) audio.click(); }, true);

  const panel = createPanel(panelEl, {
    thumb: (id) => (world.fish && world.fish.thumb ? world.fish.thumb(id) : ''),
    onAct(a, arg) {
      if (a !== 'hover' && a !== 'age') stopTour();
      if (a === 'close') { if (S.fish) selectFish(null); else if (S.dive) leaveDive(); else if (S.item) upToArea(); else overview(); }
      else if (a === 'item') goItem(arg);
      else if (a === 'hover') { const it = arg && world.items.get(arg); if (it) { select.show(it); labels.tip(it); } else if (!S.item) { select.hide(); labels.tip(null); } else { select.show(world.items.get(S.item)); labels.tip(null); } }
      else if (a === 'prev' || a === 'next') stepArea(a === 'next' ? 1 : -1);
      else if (a === 'iprev' || a === 'inext') stepItem(a === 'inext' ? 1 : -1);
      else if (a === 'up') upToArea();
      else if (a === 'view') setView(arg);
      else if (a === 'orbit') { rig.drift = 0.07; rig.idle = 99; setTimeout(() => { rig.drift = 0; }, 14000); }
      else if (a === 'tourhere') runTour(Math.max(0, TOUR.findIndex((x) => x.id === S.area)));
      else if (a === 'area' || a === 'fisharea') { if (S.dive) leaveDive(true); goArea(arg); }
      else if (a === 'species') { exit(); hooks.goSpecies(arg); }
      else if (a === 'dive') { const it = world.items.get(arg); if (it) diveInto(it); }
      else if (a === 'control') { const it = world.items.get(arg); if (it) control.open(it); }
      else if (a === 'surface') leaveDive();
      else if (a === 'filter') setFilter(arg || null);
      else if (a === 'fishback') selectFish(null);
      else if (a === 'fishnext') { const list = dive.fish, i = list.indexOf(S.fish); selectFish(list[(i + 1 + Math.floor(list.length / 3)) % list.length]); }
      else if (a === 'pickfish') { const f = nearestOf(arg); if (f) selectFish(f); }
      else if (a === 'age' && S.fish) { dive.setAge(panel.ageFromSlider(arg, S.fish.sp)); panel.fishUpdate(dive.info()); }
    },
  });
  panelEl.addEventListener('click', (e) => { if (coarse() && e.target.closest('.p-head') && !e.target.closest('button')) { panelEl.classList.toggle('is-min'); setShift(); } });

  // the control rooms: their screen opens over the page (control.js); from it, any system or tank can be shown in the model
  let ctlT = null;
  const control = createControl(world, { onGo: (area, iid) => { stopTour(); if (iid) goItem(iid); else goArea(area); } });

  /* ───── walking stick (touch screens) ───── */
  const stick = document.createElement('div'); stick.className = 'stick'; stick.setAttribute('role', 'application'); stick.setAttribute('aria-label', 'Walk: drag in the direction you want to go');
  stick.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 13l7 9H43zM50 87l7-9H43zM13 50l9-7v14zM87 50l-9-7v14z" fill="currentColor"/></svg><b></b>'; appEl.appendChild(stick);
  {
    let id = null, cx = 0, cy = 0; const R = 40, knob = stick.querySelector('b');
    const set = (x, y) => { const d = Math.hypot(x, y), k = d > R ? R / d : 1; x *= k; y *= k; knob.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; const dead = d < 7 ? 0 : 1; rig.walkIn.s = (x / R) * dead; rig.walkIn.f = (-y / R) * dead; };
    stick.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); stopTour(); id = e.pointerId; try { stick.setPointerCapture(id); } catch {} const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stick.classList.add('is-on'); set(e.clientX - cx, e.clientY - cy); });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e.clientX - cx, e.clientY - cy); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; stick.classList.remove('is-on'); knob.style.transform = ''; rig.walkIn.f = rig.walkIn.s = 0; };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end); stick.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  rig.onWalk = () => {
    if (S.item) { S.item = null; select.hide(); labels.focus(null); const a = areas.byId[S.area]; panel.area(a, a.items, { view: S.view }); setBack(); }
    rig.goal.dist = clamp(rig.goal.dist, 3.5, 8); rig.goal.pol = clamp(rig.goal.pol, 1.3, 1.5); if (coarse() && !panelEl.classList.contains('is-min')) sheet(true);
  };

  /* ───── helpers ───── */
  const setShift = () => { const open = body.classList.contains('has-panel'), min = panelEl.classList.contains('is-min'); if (coarse()) { rig.setShift(0, open ? engine.h * (min ? 0.05 : 0.2) : 0); dive.shift(0, open ? engine.h * (min ? 0.06 : 0.24) : 0); } else { rig.setShift(open ? 203 : 0, 0); dive.shift(open ? 203 : 0, 0); } };
  const WFOV = (zone) => (coarse() ? 76 : zone ? 62 : 56);                 // a phone held upright needs a wider lens indoors
  const sheet = (min) => { if (!coarse()) return; panelEl.classList.toggle('is-min', min); setShift(); };
  const WALKHINT = () => (touch ? 'Drag to look round. Use the stick to walk. Tap a tank or a machine to go to it.' : 'Drag to look round. W A S D to walk. Click a tank, a machine or the floor to go there.');
  const setBack = () => { backBtn.querySelector('span').textContent = S.fish ? 'Back to the school' : S.dive ? 'Back to the surface' : S.item ? `Back to ${areaById[S.area].short}` : S.area ? 'Back to overview' : 'Back to the site'; };
  const setDock = () => { for (const b of dock.children) b.classList.toggle('is-on', b.dataset.id === S.area); const on = dock.querySelector('.is-on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); };
  const itemsOf = (a) => (S.view === 'plan' && a.planWith ? a.items.concat(areas.byId[a.planWith].items) : a.items);
  const setHint = (t) => { hint.textContent = t; };
  const inRooms = (a, x, z) => { if (!a.rooms) return false; const [lx, lz] = a.toLocal(x, z); return a.rooms.some((r) => (r.circle ? Math.hypot(lx - r.x, lz - r.z) < r.r : lx > r.x0 && lx < r.x1 && lz > r.z0 && lz < r.z1)); };
  const outdoors = () => { rig.room = null; rig.fovGoal = 32; rig.limits.polMin = 0.12; body.classList.remove('walking'); };
  /** people standing between a point and where the camera would be (they would fill the picture) */
  function inTheWay(a, x, z, az, len) {
    const pp = a.people && a.people.state; if (!pp) return 0;
    const [ox, oz] = a.toLocal(x, z), la = az - a.frame.ry, ux = Math.sin(la), uz = Math.cos(la); let n = 0;
    for (const q of pp) {
      if (q.segs) continue; const rx = q.x - ox, rz = q.z - oz, along = rx * ux + rz * uz, side = Math.abs(rx * uz - rz * ux);
      if (along > 0.7 && along < len + 0.6 && side < 0.6) n++;                       // on the line of sight
      else if (Math.hypot(rx - ux * len, rz - uz * len) < 2.4) n += 0.6;             // or looming right beside the lens
    }
    return n;
  }
  /**
   * where to stand to look at something: the direction with the most clear floor behind the camera and nobody in the way.
   * `spread` limits how far from az0 it may turn (flat things such as panels are read from the front).
   */
  function bestAz(a, x, y, z, az0, pol, want, spread = Math.PI, turn = 0.75) {
    const prev = rig.room; rig.room = a; let best = az0, bs = -1e9; const sp = Math.sin(pol), cp = Math.cos(pol);
    const offs = spread < 1 ? [0, 0.3, -0.3, 0.6, -0.6] : Array.from({ length: 24 }, (_, k) => ((k % 2 ? -1 : 1) * Math.ceil(k / 2) * Math.PI) / 12);
    for (const off of offs) {
      const az = az0 + off, lim = Math.min(want, rig._roomLimit({ x, y, z }, sp * Math.sin(az), cp, sp * Math.cos(az), want));
      const score = lim - Math.abs(off) * (spread < 1 ? 2.2 : turn) - inTheWay(a, x, z, az, lim) * 4;
      if (score > bs) { bs = score; best = az; }
    }
    rig.room = prev; return best;
  }

  /* ───── state changes ───── */
  function overview(fly = true) {
    if (S.dive) leaveDive(true);
    S.area = null; S.item = null; S.arrived = false; select.hide(); labels.focus(null); labels.occl = null; areas.closeAll(); outdoors(); labels.clearTags(); labels.clearDoors(); labels.clearRooms(); labels.tip(null); labels.showPins(true);
    body.classList.remove('has-panel'); panel.clear(); setShift(); setBack(); setDock();
    rig.limits.distMin = 30; rig.limits.distMax = 1250; rig.limits.box = CAM_BOX.slice(); rig.limits.polMax = 1.4;
    if (fly) rig.flyTo(OVERVIEW, { dur: 2.0 });
    setHint(touch ? 'Drag to orbit. Pinch to zoom. Tap a pin.' : 'Drag to orbit. Scroll to zoom. Click a pin or a building.');
    audio.scene(S.night ? 'night' : 'outside'); hooks.onArea && hooks.onArea(null);
  }
  function arrive(a) {
    if (S.area !== a.id || S.view !== 'walk' || S.dive) return;
    rig.room = a.rooms ? a : null; rig.limits.distMax = 28; S.arrived = true;
  }
  function goArea(id, { view = S.view, instant = false } = {}) {
    const a = areas.byId[id]; if (!a) return;
    if (S.dive) leaveDive(true);
    const same = S.area === id;
    S.area = id; S.last = id; S.item = null; S.view = view; select.hide(); labels.tip(null); labels.focus(null); labels.occl = view === 'walk' && id !== 'seacages' ? a : null;
    areas.ensure(a); const partner = view === 'plan' && a.planWith ? areas.byId[a.planWith] : null; if (partner) areas.ensure(partner);
    for (const o of areas.list) if (o !== a && o !== partner) { if (o.goal) areas.close(o.id); if (o.peek) areas.peek(o.id, false); }
    rig.limits.box = [a.pose.x - 280, a.pose.x + 280, a.pose.z - 260, a.pose.z + 260]; rig.limits.polMin = 0.12;
    body.classList.add('has-panel'); panelEl.classList.remove('is-min'); setShift();
    const sea = id === 'seacages';
    if (view === 'walk' && sea) {
      // the walk-in view of the cages is a dive: skim out low over the water, then go under
      outdoors(); rig.limits.distMin = 8; rig.limits.distMax = 700; rig.limits.polMax = 1.44; S.arrived = false;
      rig.flyTo(a.walk, { dur: instant ? 0.01 : 2.4, hop: 0.12, done: () => { if (S.area === 'seacages' && S.view === 'walk' && !S.dive && !S.item) diveInto(world.items.get('seacages/SC-05')); } });
    } else if (view === 'walk') {
      if (a.goal) areas.close(id); areas.peek(id, true); body.classList.add('walking');
      rig.fovGoal = WFOV(); rig.limits.polMin = 0.5; rig.limits.polMax = 1.56; rig.limits.distMin = 1.6;
      if (same && rig.room === a) { rig.flyTo(a.walk, { dur: 1.3, hop: 0 }); S.arrived = true; }
      else {
        rig.room = null; S.arrived = false; rig.limits.distMax = 1250;
        if (instant) { rig.jump(a.walk); arrive(a); }
        else rig.playPath([{ p: { ...rig.cur } }, { p: { ...a.walk, pol: 1.2, dist: a.walk.dist + 58 }, t: 1.8 }, { p: a.walk, t: 1.6 }], { done: () => arrive(a) });
      }
    } else {
      if (a.peek) areas.peek(id, false); outdoors(); areas.open(id); if (partner) areas.open(partner.id);
      const pose = view === 'plan' ? a.plan : a.inside;
      rig.limits.distMin = 8; rig.limits.distMax = Math.max(300, pose.dist * 2.4); rig.limits.polMax = sea ? 1.42 : 1.36; S.arrived = false;
      rig.flyTo(pose, { dur: instant ? 0.01 : 1.9, hop: 0.2 });
    }
    panel.area(a, a.items, { view }); setBack(); setDock();
    labels.showPins(false);
    if (view === 'plan') { labels.clearTags(); labels.setRooms(itemsOf(a).filter((it) => !/^(EX-|SPN|EC$|CW$|SW$|F-0|CY$)/.test(it.code)).map((it) => (a.planWith ? it : { ...it, short: it.code }))); }
    else { labels.clearRooms(); labels.setTags(a.items.filter((it) => it.label && !(view === 'walk' && it.door)), (iid) => { stopTour(); goItem(iid); }); }
    if (view === 'walk' && !sea) labels.setDoors(a.items.filter((it) => it.door), (iid) => { stopTour(); goItem(iid); }); else labels.clearDoors();
    setHint(view === 'plan' ? 'Plan view. Click any room or item to inspect it.' : view === 'walk' && !sea ? WALKHINT() : touch ? 'Tap any tank, machine or label.' : 'Click any tank, machine, room or label to inspect it.');
    audio.scene(SOUND[id] || 'hall'); if (!same) audio.whoosh(); hooks.onArea && hooks.onArea(id);
    world.prebuild && world.prebuild();
  }
  function setView(v) { if (!S.area) return; const it = S.item; S.view = v; goArea(S.area, { view: v }); if (it && v !== 'plan') goItem(it); }
  function goItem(iid) {
    const it = world.items.get(iid); if (!it) return;
    if (S.dive) leaveDive(true);
    if (it.area !== S.area && !(S.view === 'plan' && areas.byId[S.area] && areas.byId[S.area].planWith === it.area)) goArea(it.area, { view: S.view === 'plan' ? 'top' : S.view });
    const a = areas.byId[it.area];
    if (S.view === 'plan') { S.view = 'top'; labels.clearRooms(); S.area = it.area; labels.setTags(a.items.filter((x) => x.label), goItem); setDock(); setHint(touch ? 'Tap any tank, machine or label.' : 'Click any tank, machine, room or label to inspect it.'); }
    S.item = iid; labels.tip(null); labels.focus(it);
    if (S.view === 'walk' && it.zone) select.hide(); else { select.show(it); if (S.view === 'walk') setTimeout(() => { if (S.item === iid && S.view === 'walk' && !lastHover) select.soft(); }, 1500); }       // inside a room there is nothing to bracket
    const c = it.center, size = it.size;
    if (S.view === 'walk' && a.id !== 'seacages') {
      rig.stopPath(); rig.flight = null; S.arrived = true; body.classList.add('walking');
      if (it.view) { rig.room = a; rig.fovGoal = it.isDisplay && coarse() ? 86 : WFOV(it.zone); rig.limits.polMin = 0.5; rig.limits.polMax = 1.56; rig.limits.distMin = 1.6; rig.limits.distMax = 28; rig.flyTo(it.view, { dur: 1.4, hop: 0 }); }
      else if (!it.out && inRooms(a, c[0], c[2])) {
        // a room: stand inside it and look along it. A thing: stand on the side that faces the middle of the room, so walls stay behind it.
        const [lx, lz] = a.toLocal(c[0], c[2]), rm = a.rooms.find((r) => (r.circle ? Math.hypot(lx - r.x, lz - r.z) < r.r : lx > r.x0 && lx < r.x1 && lz > r.z0 && lz < r.z1)), mid = rm && !it.zone ? a.toWorld(rm.circle ? rm.x : clamp(lx, rm.x0 + 9, rm.x1 - 9), rm.circle ? rm.z : (rm.z0 + rm.z1) / 2) : null;
        const far = mid && Math.hypot(mid[0] - c[0], mid[1] - c[2]) > 2.5, y = it.zone ? 1.6 : clamp(c[1], 1.1, 2.4), want = (it.zone ? clamp(size * 0.8, 5, 15) : clamp(size * 1.15 + 3.2, 4.2, 18)) * (coarse() ? 1.2 : 1), pol = it.zone ? (size < 14 ? 1.3 : 1.4) : 1.37;
        const az = it.faceAz !== undefined ? bestAz(a, c[0], y, c[2], it.faceAz, pol, want, 0.62) : bestAz(a, c[0], y, c[2], far ? Math.atan2(mid[0] - c[0], mid[1] - c[2]) : rig.goal.az, pol, want, Math.PI, it.zone ? 0.12 : 0.75);
        rig.room = a; rig.fovGoal = WFOV(it.zone); rig.limits.polMin = 0.5; rig.limits.polMax = 1.56; rig.limits.distMin = 1.6; rig.limits.distMax = 28;
        rig.flyTo(P(c[0], y, c[2], az, pol, want), { dur: 1.4, hop: 0 });
      } else {
        // something in the yard outside: step out to it
        // the camera goes to the far side from the building, so the building is behind the thing, not in front of it
        rig.room = null; rig.fovGoal = 42; rig.limits.polMin = 0.3; rig.limits.polMax = 1.46; rig.limits.distMin = 6; rig.limits.distMax = 400;
        const [qx, qz] = a.toLocal(c[0], c[2]), r0 = a.rooms && a.rooms.find((r) => !r.circle) || null, ctr = r0 ? a.toWorld((r0.x0 + r0.x1) / 2, (r0.z0 + r0.z1) / 2) : [a.pose.x, a.pose.z];
        const away = Math.hypot(c[0] - ctr[0], c[2] - ctr[1]) > 3 && !it.zone ? Math.atan2(c[0] - ctr[0], c[2] - ctr[1]) : rig.goal.az;
        rig.flyTo(P(c[0], clamp(c[1], 0.8, 4), c[2], away, 1.2, clamp(size * 2.0 + 14, 18, 130)), { dur: 1.6, hop: 0.1 });
      }
    } else {
      const pol = clamp(rig.goal.pol, 0.6, 1.02);
      rig.flyTo(P(c[0], clamp(c[1], 0, 3), c[2], rig.goal.az, pol, clamp(size * 2.5 + 9, 15, 150)), { dur: 1.2, hop: 0 });
    }
    body.classList.add('has-panel'); panel.item(it, a.items, { view: S.view });
    panelEl.classList.toggle('is-min', coarse() && !!it.isDisplay); setShift(); setBack(); audio.select();
    // a control room: once the camera is in front of the console, its screen comes up
    clearTimeout(ctlT); if (it.control && !S.tour) ctlT = setTimeout(() => { if (S.item === iid && S.exploring && !S.tour && !S.drone && !S.film) control.open(it); }, 1900);
  }
  function upToArea() {
    if (!S.area) return overview(); S.item = null; select.hide(); labels.focus(null); const a = areas.byId[S.area];
    panel.area(a, a.items, { view: S.view }); setBack();
    if (S.view === 'walk' && S.area !== 'seacages') { rig.room = a.rooms ? a : null; rig.fovGoal = WFOV(); rig.limits.polMin = 0.5; rig.limits.polMax = 1.56; rig.limits.distMin = 1.6; rig.limits.distMax = 28; rig.flyTo(a.walk, { dur: 1.4, hop: 0 }); }
    else rig.flyTo(S.view === 'plan' ? a.plan : S.view === 'walk' ? a.walk : a.inside, { dur: 1.3, hop: 0 });
  }
  function stepArea(d) { const i = AREAS.findIndex((a) => a.id === S.area); goArea(AREAS[(i + d + AREAS.length) % AREAS.length].id); }
  function stepItem(d) { const it = world.items.get(S.item); if (!it) return; const list = areas.byId[it.area].items, i = list.indexOf(it); goItem(list[(i + d + list.length) % list.length].id); }

  /* ───── under water: show one species only ───── */
  const diveBar = document.createElement('div'); diveBar.className = 'dive-bar'; diveBar.setAttribute('role', 'group'); diveBar.setAttribute('aria-label', 'Which fish to show'); appEl.appendChild(diveBar);
  diveBar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { stopTour(); setFilter(b.dataset.sp || null); } });
  function setFilter(sp) {
    dive.filter(sp); for (const b of diveBar.children) b.setAttribute('aria-pressed', String((b.dataset.sp || null) === sp));
    fishTags.forEach((t) => { t.f = null; }); tagT = 0; if (S.fish && sp && S.fish.sp !== sp) selectFish(nearestOf(sp));
  }
  function buildDiveBar(ids) {
    diveBar.innerHTML = `<button type="button" data-sp="" aria-pressed="true"><span>All fish</span></button>` + ids.map((id) => { const s = speciesById[id] || {}, src = panel.pic(id); return `<button type="button" data-sp="${id}" aria-pressed="false">${src ? `<img src="${src}" alt="">` : ''}<span>${s.local || id}</span></button>`; }).join('');
    diveBar.hidden = ids.length < 2;
  }

  /* ───── under water ───── */
  let veilT = null;
  const fade = (fn) => { clearTimeout(veilT); veil.classList.add('is-on'); veilT = setTimeout(() => { fn(); veilT = setTimeout(() => veil.classList.remove('is-on'), 120); }, engine.reduced ? 60 : 430); };
  function diveInto(it) {
    if (!it || !it.swim) return;
    if (S.area !== it.area) { S.area = it.area; setDock(); }
    S.item = it.id; S.dive = it; S.fish = null; select.hide(); labels.tip(null); labels.focus(null); labels.hideTags(true); labels.showPins(false);
    const sw = it.swim, kind = sw.net ? 'cage' : sw.glass ? 'glass' : 'tank';
    audio.splash();
    fade(() => {
      dive.enter({ kind, r: (sw.net || sw.tank || 6) - (kind === 'cage' ? 0.3 : 0.15), depth: sw.depth || (kind === 'tank' ? 1.45 : 6), sp: sw.sp, n: sw.n || 30, grams: sw.grams, age: sw.age || (kind === 'tank' ? 5 : 2.2), seed: it.id.length });
      engine.altCamera = dive.camera; dive.resize(); engine.view = { scene: dive.scene, camera: dive.camera };
      body.classList.add('diving', 'has-panel'); body.classList.remove('walking'); rig.user = false; setShift();
      const ids = [...new Set(dive.fish.map((f) => f.sp))];
      buildDiveBar(ids); panel.dive(it, ids); setBack(); audio.scene('under');
      fishTags = labels.setFree(ids.map((id) => ({ name: (speciesById[id] || OTHER_FISH[id] || {}).local || id, kind: (speciesById[id] || OTHER_FISH[id] || {}).common || '', ref: id })), (id) => { stopTour(); const f = nearestOf(id); if (f) selectFish(f); });
      setHint(touch ? 'Drag to look round. Tap any fish to follow it.' : 'Drag to look round. Click any fish to follow it. Scroll to zoom.');
    });
  }
  function leaveDive(quiet = false) {
    if (!S.dive) return; const it = S.dive;
    S.dive = null; S.fish = null; labels.clearFree(); fishTags = []; scaleEl.hidden = true;
    const back = () => { dive.exit(); engine.view = { scene: world.scene, camera: world.camera }; engine.altCamera = null; body.classList.remove('diving'); rig.user = S.exploring; labels.hideTags(false); };
    if (quiet) { clearTimeout(veilT); veil.classList.remove('is-on'); back(); return; }
    fade(() => { back(); S.item = it.id; if (it.area === 'seacages') { S.view = 'top'; goArea('seacages', { view: 'top' }); } goItem(it.id); audio.scene(SOUND[it.area] || 'hall'); });
  }
  const nearestOf = (sp) => { let best = null, bd = Infinity; for (const f of dive.fish) if (f.sp === sp) { const d = f.pos.distanceTo(dive.camera.position); if (d < bd) { bd = d; best = f; } } return best; };
  function selectFish(f) {
    dive.select(f); S.fish = f || null; setBack();
    if (f) { panel.fish(dive.info(), S.dive); audio.select(); setHint('Drag to swing round the fish. Move the age slider to watch it grow.'); }
    else if (S.dive) { panel.dive(S.dive, [...new Set(dive.fish.map((x) => x.sp))]); scaleEl.hidden = true; setHint(touch ? 'Drag to look round. Tap any fish to follow it.' : 'Drag to look round. Click any fish to follow it. Scroll to zoom.'); }
  }
  rig.onDrag = (dx, dy) => { if (!S.dive) return false; if (S.tour) stopTour(); dive.look(dx, dy); return true; };
  rig.onWheel = (dy) => { if (!S.dive) return false; dive.zoom(dy); return true; };

  /* ───── tour, film, drone ───── */
  let capT = null, sleepers = [];
  function setCap(c) { filmCap.classList.add('is-out'); clearTimeout(capT); capT = setTimeout(() => { if (!c) return; filmCap.querySelector('small').textContent = c[0]; filmCap.querySelector('b').textContent = c[1]; filmCap.classList.remove('is-out'); }, 520); }
  const sleep = (s) => new Promise((r) => { sleepers.push(setTimeout(r, s * 1000)); });
  /** the guided tour: a sweep over the site, then down to each area, in through the door, round the hall and up to two things worth a closer look */
  async function runTour(from = 0) {
    stopFilm(); stopDrone(); stopTour();
    const tk = {}; S.tour = tk; const ok = () => S.tour === tk && S.exploring;
    pills.tour.setAttribute('aria-pressed', 'true'); pills.tour.querySelector('span').textContent = 'Stop tour';
    body.classList.add('touring'); filmEl.hidden = false; filmEl.classList.add('is-tour');
    if (from === 0) {
      overview(false); labels.showPins(false); setCap(['Sheikh Khalifa Marine Research Centre', 'Umm Al Quwain, United Arab Emirates']);
      rig.jump({ ...OVERVIEW, az: OVERVIEW.az - 0.55, dist: OVERVIEW.dist * 1.3, pol: 0.78 });
      rig.playPath([{ p: { ...rig.cur } }, { p: { ...OVERVIEW, az: OVERVIEW.az - 0.1, dist: OVERVIEW.dist * 0.95, pol: 1.0 }, t: 4.5 }, { p: { ...OVERVIEW, az: OVERVIEW.az + 0.3, dist: OVERVIEW.dist * 0.72, pol: 1.12 }, t: 4 }]);
      await sleep(8.2);
    }
    for (let i = from; i < TOUR.length && ok(); i++) {
      const d = TOUR[i], a = areas.byId[d.id];
      setCap([`${d.n}  ${d.name}`, d.line]); for (const b of dock.children) b.classList.toggle('is-on', b.dataset.id === d.id);
      // come down low past the building
      if (S.dive) leaveDive(true); S.item = null; select.hide(); labels.clearTags(); labels.clearDoors(); labels.clearRooms(); body.classList.remove('has-panel'); setShift(); outdoors(); areas.closeAll();
      rig.limits.distMin = 8; rig.limits.distMax = 1250; rig.limits.polMax = 1.42; rig.limits.box = CAM_BOX.slice();
      rig.flyTo({ ...a.pose, y: 3, pol: 1.17, dist: a.pose.dist * 0.66, az: a.pose.az + (i % 2 ? 0.4 : -0.35) }, { dur: 3.4, hop: 0.14 });
      await sleep(3.5); if (!ok()) break;
      goArea(d.id, { view: 'walk' });
      if (d.id === 'seacages') {
        await sleep(4.4); if (!ok()) break;                                  // skims out, then goes under
        await sleep(3.2); if (!ok()) break;
        if (S.dive && dive.fish.length) selectFish(dive.fish[Math.min(5, dive.fish.length - 1)]);
        await sleep(6); if (!ok()) break;
        selectFish(null); await sleep(2.2); if (!ok()) break; leaveDive(true); continue;
      }
      await sleep(4.4); if (!ok()) break;
      rig.drift = i % 2 ? -0.11 : 0.11; rig.idle = 99; await sleep(4); rig.drift = 0; if (!ok()) break;
      for (const it of a.items.filter((x) => x.label && inRooms(a, x.center[0], x.center[2])).slice(0, 2)) { goItem(it.id); await sleep(4.6); if (!ok()) break; }
    }
    if (S.tour === tk) { stopTour(); if (S.exploring) overview(); }
  }
  function stopTour() {
    if (!S.tour) return; S.tour = null; for (const t of sleepers) clearTimeout(t); sleepers = []; rig.drift = 0;
    pills.tour.setAttribute('aria-pressed', 'false'); pills.tour.querySelector('span').textContent = 'Tour';
    body.classList.remove('touring'); filmEl.classList.remove('is-tour'); if (!S.film) filmEl.hidden = true;
    if (S.area && S.view === 'walk' && !S.arrived && !S.dive && S.area !== 'seacages') { rig.stopPath(); arrive(areas.byId[S.area]); }
  }
  function startFilm() {
    stopTour(); stopDrone(); overview(false); labels.showPins(false); S.film = true; body.classList.add('filming'); filmEl.hidden = false;
    rig.user = false; setCap(FILM[0].cap);
    rig.playPath(FILM, { onLeg: (i) => { const c = FILM[Math.min(FILM.length - 1, i + 1)].cap; if (i > 0) setCap(c); }, done: stopFilm });
    audio.scene('outside');
  }
  function stopFilm() { if (!S.film) return; S.film = false; rig.stopPath(); body.classList.remove('filming'); filmEl.hidden = true; rig.user = S.exploring; if (S.exploring) overview(); }
  // the drone: the craft itself (drone.js), its dock by the drop-off of the Innovation Park (dock.js), how it flies (rig.js),
  // the space it flies in (airspace.js: walls, doors, roofs, ceilings, the insides of the buildings), its sound and its controls
  const droneCraft = makeDrone(world); let droneT0 = 0, droneSnd = false, droneThr = -1, droneOn = false, droneStatus = '';
  const droneDock = makeDock(world, { x: -207, z: -126, ry: -2.11 }); droneDock.out = 1.03;           // it faces the drop-off; the drone takes off towards the site
  const air = createAirspace(world); world.dock = droneDock; world.air = air;
  const _g = {};
  /** the height of whatever is under a point (ground, sea, a roof, a tank, or the floor of the hall the drone is in) */
  const floorAt = (x, y, z) => air.space(x, y, z, _g).floor - 0.55;
  const hudSpeed = hud.querySelector('.hud-speed'), hudSnd = $('#hud-snd'), hudStatus = hud.querySelector('[data-hud=status]'), hudExit = $('#hud-exit');
  const setStatus = (t) => { if (t === droneStatus) return; droneStatus = t; hudStatus.textContent = t; hudStatus.hidden = !t; };
  const setSpeed = (i) => { const d = rig.drone; if (!d) return; d.level = clamp(i, 0, DRONE_SPEED.length - 1); d.boost = 1; for (const b of hudSpeed.children) b.setAttribute('aria-pressed', String(+b.dataset.speed === d.level)); };
  hudSpeed.addEventListener('click', (e) => { const b = e.target.closest('[data-speed]'); if (b) setSpeed(+b.dataset.speed); });
  const syncSnd = () => { pills.sound.setAttribute('aria-pressed', String(audio.on)); hudSnd.setAttribute('aria-pressed', String(audio.on)); };
  hudSnd.addEventListener('click', () => { droneSnd = false; audio.toggle().then(() => { syncSnd(); if (audio.on) { audio.scene('outside'); droneOn = false; } }); });
  function startDrone() {
    stopTour(); stopFilm(); if (S.area || S.dive) overview(false); labels.showPins(false); select.hide(); labels.tip(null);
    S.drone = true; body.classList.add('droning'); hud.hidden = false; droneT0 = performance.now(); droneThr = -1; droneOn = false;
    rig.enterDrone(droneDock, air); setSpeed(1); setStatus('Taking off from the dock'); hudExit.textContent = 'Land the drone'; droneDock.setBusy(true);
    // a drone is heard as well as seen: its rotors come on with it (the Sound button in the corner turns them off)
    if (audio.on) { audio.scene('outside'); syncSnd(); }
    else { droneSnd = true; audio.toggle(true).then((v) => { syncSnd(); if (v && S.drone) { audio.scene('outside'); droneOn = false; } }); }
    engine.canvas.focus && engine.canvas.focus();
  }
  /* the mouse lock: the pointer disappears and the mouse steers the drone (L or the button; Esc gives the pointer back) */
  const lockBtn = $('#hud-lock'); let unlockedAt = -1e9;
  const locked = () => document.pointerLockElement === engine.canvas;
  const toggleLock = () => { if (locked()) document.exitPointerLock(); else if (S.drone && engine.canvas.requestPointerLock) { try { const r = engine.canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* not allowed here */ } } };
  lockBtn.addEventListener('click', toggleLock);
  document.addEventListener('pointerlockchange', () => {
    const on = locked(); lockBtn.setAttribute('aria-pressed', String(on)); lockBtn.querySelector('span').textContent = on ? 'Unlock mouse' : 'Lock mouse';
    body.classList.toggle('mouse-locked', on); if (!on) unlockedAt = performance.now();
  });
  document.addEventListener('mousemove', (e) => { const d = rig.drone; if (!locked() || !d || d.phase !== 'fly') return; d.gy -= e.movementX * 0.0024; d.gp = clamp(d.gp - e.movementY * 0.002, -1.2, 0.3); });
  /** Esc or "Land the drone": it flies itself home and lands in the dock (from inside a building it is brought out first);
   *  pressed again while it does that, it is put straight in */
  function landDrone() {
    const d = rig.drone; if (!S.drone || !d) return;
    if (d.phase !== 'fly') { rig.droneHome(true); return; }
    if (d.inside) { setStatus('Back out to the dock'); fade(() => rig.droneOverDock()); }
    else { rig.droneHome(); setStatus('Flying home to the dock'); }
    hudExit.textContent = 'Land now';
  }
  /** straight back in the dock and out of drone mode (leaving the model, starting the tour or the film) */
  function stopDrone() { if (!S.drone) return; rig.droneHome(true); finishDrone(); }
  function finishDrone() {
    if (!S.drone) return; S.drone = false; const d = rig.drone; if (locked()) document.exitPointerLock();
    if (d) { d.motor = 0; d.thr = 0; d.bob = 0; d.size = 1; d.tiltX = d.tiltZ = 0; droneCraft.update(d, 0, engine.t, null); }      // it stays parked in the dock
    droneCraft.hideShadow(); air.reset(); droneDock.setOpen(0); droneDock.setBusy(false);
    const at = droneDock.rest.clone(); at.y += 1; rig.exitDrone(at); body.classList.remove('droning'); hud.hidden = true; setStatus('');
    audio.drone(false); droneOn = false; if (droneSnd && audio.on) audio.toggle(false).then(syncSnd); droneSnd = false;
    if (S.exploring) { labels.showPins(true); rig.limits.distMin = 30; setHint(touch ? 'Drag to orbit. Pinch to zoom. Tap a pin.' : 'Drag to orbit. Scroll to zoom. Click a pin or a building.'); }
  }
  function act(k) {
    if (k === 'film') startFilm();
    else if (k === 'drone') startDrone();
    else if (k === 'tour') (S.tour ? stopTour() : runTour(0));
    else if (k === 'night') setNight(!S.night);
    else if (k === 'sound') audio.toggle().then((v) => { pills.sound.setAttribute('aria-pressed', String(!!v)); if (v) { audio.scene(S.dive ? 'under' : S.area ? SOUND[S.area] : S.night ? 'night' : 'outside'); audio.click(); } });
    else if (k === 'home') { stopTour(); overview(); }
  }
  function setNight(v) { S.night = v; env.setNight(v); body.classList.toggle('night', v); pills.night.setAttribute('aria-pressed', String(v)); pills.night.querySelector('span').textContent = v ? 'Day' : 'Night'; if (!S.area) audio.scene(v ? 'night' : 'outside'); }

  /* ───── enter / leave ───── */
  function enter(areaId, view) {
    if (view) S.view = view;
    if (S.exploring) { if (areaId) goArea(areaId); return; }
    S.exploring = true; appEl.hidden = false; void appEl.offsetWidth; body.classList.add('exploring');
    rig.user = true; rig.wheelZoom = true; rig.drift = 0; rig.lambda = 6.5; hooks.lock(true);
    if (areaId) goArea(areaId); else overview();
    world.prebuild && world.prebuild();
  }
  function exit() {
    if (!S.exploring) return;
    stopTour(); stopFilm(); stopDrone(); clearTimeout(ctlT); control.close(); if (S.dive) leaveDive(true); const last = S.area || S.last; S.last = null;
    S.exploring = false; S.area = null; S.item = null; S.view = 'walk'; select.hide(); labels.focus(null); labels.occl = null; areas.closeAll(); outdoors(); labels.clearTags(); labels.clearDoors(); labels.clearRooms(); labels.tip(null);
    body.classList.remove('exploring', 'has-panel', 'pointing'); panel.clear(); rig.setShift(0, 0); rig.user = false; rig.wheelZoom = false;
    rig.limits.distMin = 9; rig.limits.distMax = 1250; rig.limits.box = CAM_BOX.slice(); rig.limits.polMax = 1.4;
    if (S.night) setNight(false);
    setTimeout(() => { if (!S.exploring) appEl.hidden = true; }, 400);
    hooks.lock(false); hooks.onExit(last);
  }
  /** from the page (a chip on a tour card, or a click on the model while scrolling): open the model straight at one thing,
   *  seen from above with the roof off, the way the scroll tour was showing it, so the move is short */
  function enterItem(iid) {
    const it = world.items.get(iid); if (!it) return false;
    if (!S.exploring) hooks.enter(it.area, 'top');
    goItem(iid); return true;
  }
  const stepBack = () => { if (S.fish) selectFish(null); else if (S.dive) leaveDive(); else if (S.item) upToArea(); else if (S.area) overview(); else exit(); };
  backBtn.addEventListener('click', () => { stopTour(); stepBack(); });
  $('#film-stop').addEventListener('click', () => { if (S.tour) stopTour(); else stopFilm(); }); $('#hud-exit').addEventListener('click', landDrone);
  for (const b of hud.querySelectorAll('[data-pad]')) {
    const k = b.dataset.pad, set = (v) => { const d = rig.drone; if (!d) return; if (k === 'u' || k === 'd') d.touch.u = k === 'u' ? v : -v; else d.touch.yaw = k === 'r' ? v : -v; };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); set(1); }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => set(0)); b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  { // the drone's stick (touch screens): forward and back, left and right
    const st = $('#hud-stick'), knob = st.querySelector('b'), Rr = 44; let id = null, cx = 0, cy = 0;
    const set = (x, y) => { const d = Math.hypot(x, y), k = d > Rr ? Rr / d : 1; x *= k; y *= k; knob.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; const dr = rig.drone; if (!dr) return; const dead = d < 7 ? 0 : 1; dr.touch.s = (x / Rr) * dead; dr.touch.f = (-y / Rr) * dead; };
    st.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); id = e.pointerId; try { st.setPointerCapture(id); } catch {} const r = st.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; st.classList.add('is-on'); set(e.clientX - cx, e.clientY - cy); });
    st.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e.clientX - cx, e.clientY - cy); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; st.classList.remove('is-on'); knob.style.transform = ''; if (rig.drone) rig.drone.touch.f = rig.drone.touch.s = 0; };
    st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end); st.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  addEventListener('keydown', (e) => {
    if (!S.exploring || (e.target.closest && e.target.closest('input,textarea'))) return;
    if (e.key === 'Escape') { if (S.drone && (locked() || performance.now() - unlockedAt < 450)) return;       // that Esc gave the mouse back
      stopTour(); if (S.film) stopFilm(); else if (S.drone) landDrone(); else stepBack(); }
    else if (S.drone) { if (/^Digit[1-4]$/.test(e.code)) setSpeed(+e.code.slice(5) - 1); else if (e.code === 'KeyL') toggleLock(); return; }
    else if (S.film || S.dive) return;
    else if (e.key === 'ArrowRight') { stopTour(); S.item ? stepItem(1) : S.area ? stepArea(1) : goArea(AREAS[0].id); }
    else if (e.key === 'ArrowLeft') { stopTour(); S.item ? stepItem(-1) : S.area ? stepArea(-1) : goArea(AREAS[AREAS.length - 1].id); }
  });

  /* ───── pointer on the model ───── */
  rig.onUser = () => { if (S.tour) stopTour(); rig.drift = 0; if (coarse() && S.area && !S.dive && rig.pointers.size && !panelEl.classList.contains('is-min') && body.classList.contains('has-panel')) sheet(true); if (S.area && S.view === 'walk' && !S.arrived && S.area !== 'seacages' && !S.dive) arrive(areas.byId[S.area]); };
  rig.onHover = (x, y) => { hoverXY = [x, y]; };
  rig.onTap = (x, y) => {
    if (S.film) return stopFilm(); if (S.drone) return;
    if (!S.exploring) {
      if (hooks.busy && hooks.busy()) return;
      // on the page: a thing under the lifted roof goes straight to that thing, a building opens its area
      const open = hooks.storyOpen && hooks.storyOpen(), oa = open && areas.byId[open], it = oa && oa.items.length ? pickItem(world, oa.items, x, y) : null;
      if (it) { enterItem(it.id); return; }
      const a = pickArea(world, x, y); if (a) hooks.enter(a.id); return;
    }
    stopTour();
    if (S.dive) { const f = dive.pick(x, y); if (f) selectFish(f); else if (S.fish) selectFish(null); return; }
    if (S.area) {
      const a = areas.byId[S.area], it = pickItem(world, itemsOf(a), x, y);
      if (it && it.control && it.id === S.item) { clearTimeout(ctlT); control.open(it); return; }      // the console you are standing at: its screen
      if (it) return goItem(it.id);
      if (S.view === 'walk' && rig.room === a) { const f = pickFloor(world, x, y, 0.1); if (f && inRooms(a, f[0], f[1])) { if (S.item) { S.item = null; select.hide(); labels.focus(null); panel.area(a, a.items, { view: S.view }); setBack(); } rig.flyTo({ ...rig.goal, x: f[0], z: f[1], y: 1.5, dist: clamp(rig.goal.dist, 6, 14) }, { dur: 1.1, hop: 0 }); } return; }
      const o = pickArea(world, x, y);
      if (o && o.id !== S.area && !(S.view === 'plan' && a.planWith === o.id)) return goArea(o.id);
      if (S.item) upToArea();
    } else { const a = pickArea(world, x, y); if (a) goArea(a.id); }
  };
  engine.canvas.addEventListener('pointerleave', () => { hoverXY = null; if (lastHover) { lastHover = null; labels.tip(null); labels.markPin(null); body.classList.remove('pointing'); if (S.item && !S.dive) select.show(world.items.get(S.item)); else select.hide(); } });

  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], sp = { x: 0, y: 0, ppm: 0 };
  world.updaters.push((dt) => {
    labels.update();
    if (S.dive) {
      if (hoverXY && !rig.pointers.size) { const [x, y] = hoverXY; hoverXY = null; body.classList.toggle('pointing', !!dive.pick(x, y)); }
      // a name tag on the nearest fish of each species, re-chosen now and then so it does not hop about
      tagT -= dt; if (tagT <= 0) { tagT = 1.4; const near = dive.tags(); fishTags.forEach((t) => { t.f = near.find((f) => f.sp === t.o.ref) || null; }); }
      fishTags.forEach((t, i) => { const s = t.f && !S.fish ? dive.screen(t.f, sp) : null; if (s && s.x > 40 && s.x < engine.w - (coarse() ? 40 : 460) && s.y > 90 && s.y < engine.h - 110) labels.putFree(i, s.x, s.y - Math.max(18, t.f.len * s.ppm * 0.22)); else labels.putFree(i, null); });
      if (S.fish) { const s = dive.screen(S.fish, sp); if (s) { const L = S.fish.len, pick = NICE.filter(([m]) => m <= Math.max(0.001, L * 0.8)).pop() || NICE[0], w = pick[0] * s.ppm; scaleEl.hidden = false; scaleEl.style.transform = `translate3d(${(s.x - w / 2).toFixed(1)}px,${(s.y + Math.max(26, L * s.ppm * 0.3) + 14).toFixed(1)}px,0)`; scaleEl.firstChild.style.width = `${w.toFixed(1)}px`; scaleEl.lastChild.textContent = pick[1]; } else scaleEl.hidden = true; }
      return;
    }
    if (hoverXY && !S.film && !S.drone && !rig.pointers.size) {
      const [x, y] = hoverXY; hoverXY = null; let hit = null;
      if (S.exploring && S.area) { hit = pickItem(world, itemsOf(areas.byId[S.area]), x, y); if (hit !== lastHover) { lastHover = hit; labels.tip(hit && hit.id !== S.item ? hit : null); panel.hover(hit ? hit.id : ''); const cur = S.item && world.items.get(S.item), walkZone = (q) => S.view === 'walk' && q && q.zone; if (hit && !walkZone(hit)) select.show(hit); else if (cur && !walkZone(cur)) select.show(cur); else select.hide(); } }
      else {
        // on the page, under the roof the scroll tour has lifted: name the thing under the pointer and ring it
        const open = !S.exploring && hooks.storyOpen && !(hooks.busy && hooks.busy()) ? hooks.storyOpen() : null, oa = open && areas.byId[open];
        hit = oa && oa.items.length ? pickItem(world, oa.items, x, y) : null;
        if (hit) { if (hit !== lastHover) { lastHover = hit; labels.tip(hit); select.show(hit); labels.markPin(null); } }
        else { if (lastHover && lastHover.box) { labels.tip(null); select.hide(); } hit = pickArea(world, x, y); if (hit !== lastHover) { lastHover = hit; labels.markPin(hit ? hit.id : null); } }
      }
      body.classList.toggle('pointing', !!hit);
    }
    // a tip left on something whose roof has since closed (the page scrolled on)
    if (!S.exploring && lastHover && lastHover.box && !(hooks.storyOpen && hooks.storyOpen() === lastHover.area)) { lastHover = null; labels.tip(null); select.hide(); body.classList.remove('pointing'); }
    if (S.drone && rig.drone) {
      const d = rig.drone, deg = ((Math.atan2(Math.sin(d.yaw), -Math.cos(d.yaw)) * 180) / Math.PI + 360) % 360, sec = (performance.now() - droneT0) / 1000;
      droneCraft.update(d, dt, engine.t, floorAt);
      // the dock's lid: open for the take-off, shut again behind it, open for the landing; doors open as the drone comes;
      // the inside of a building it is near shows, and the one it is in is lit as indoors
      if (d.phase === 'fly' && d.pt > 1.0) d.lid = Math.max(0, d.lid - dt / 1.1);
      if (Math.abs(droneDock.open - d.lid) > 1e-3) droneDock.setOpen(d.lid);
      air.doors(d.pos, dt); air.look(d.pos, d.phase === 'fly' && d.sp ? d.sp.zone : null);
      const on = (d.motor ?? 1) > 0.04; if (on !== droneOn) { droneOn = on; audio.drone(on); }
      if (d.phase === 'fly') setStatus(d.inside ? `Inside ${areaById[d.inside.id] ? `${areaById[d.inside.id].n} · ${areaById[d.inside.id].name}` : ''}` : '');
      else if (d.phase === 'land') setStatus('Landing in the dock');
      hud.querySelector('[data-hud=hdg]').textContent = `${dirs[Math.round(deg / 45) % 8]} ${String(Math.round(deg)).padStart(3, '0')}°`;
      hud.querySelector('[data-hud=alt]').textContent = `${Math.max(0, Math.round(d.pos.y - Math.max(0, floorAt(d.pos.x, d.pos.y, d.pos.z))))} m`;
      hud.querySelector('[data-hud=spd]').textContent = `${Math.round(d.kmh)} km/h`;
      hud.querySelector('[data-hud=time]').textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
      hud.querySelector('[data-hud=bat]').textContent = `${Math.max(5, 100 - Math.floor(sec / 22))}%`;
      if (Math.abs(d.thr - droneThr) > 0.015) { droneThr = d.thr; audio.droneSet(d.thr); }
      if (d.phase === 'done') finishDrone();
    }
  });
  addEventListener('resize', () => { if (S.exploring) setShift(); if (S.dive) dive.resize(); });

  return { S, enter, enterItem, exit, control, goArea, goItem, overview, setView, diveInto, leaveDive, selectFish, runTour, stopTour, labels, audio, setNight, dive };
}
