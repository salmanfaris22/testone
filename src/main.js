// Boot: build the 3D model, then wire the page, the scroll tour and explore mode around it.
import '@fontsource/ibm-plex-sans/300.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans-condensed/500.css';
import '@fontsource/ibm-plex-sans-condensed/600.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import { startTranslator, langButtons, isAr } from './i18n.js';
import './styles/base.css';
import './styles/site.css';
import './styles/app.css';
import Lenis from 'lenis';
import { SITE, NUMBERS, CYCLE, ABOUT, STORY, VISION, MISSION } from './data/site.js';
import { SPECIES } from './data/species.js';
import { TOUR } from './data/areas.js';

// kept local so the 3D engine (and three.js) stays out of the first chunk
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const hasWebGL = () => { try { return !!(window.WebGL2RenderingContext && document.createElement('canvas').getContext('webgl2')); } catch { return false; } };

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const body = document.body;
history.scrollRestoration = 'manual';
// English or Arabic (i18n.js): the page is put into Arabic now, and whatever the model writes later as it appears
startTranslator(); langButtons();
// the look of the scroll tour's cards: glass (default), caption or paper. ?card=caption previews one, ?pick shows a switch.
{
  const q = new URLSearchParams(location.search), LOOKS = ['glass', 'caption', 'paper'];
  body.dataset.card = LOOKS.includes(q.get('card')) ? q.get('card') : 'glass';
  if (q.has('pick')) {
    const el = document.createElement('div'); el.className = 'card-pick'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Card look');
    el.innerHTML = `<span>Card look</span>${LOOKS.map((k, i) => `<button type="button" data-look="${k}" aria-pressed="${k === body.dataset.card}">${i + 1} ${k[0].toUpperCase()}${k.slice(1)}</button>`).join('')}`;
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-look]'); if (!b) return; body.dataset.card = b.dataset.look; for (const o of el.querySelectorAll('button')) o.setAttribute('aria-pressed', String(o === b)); });
    body.appendChild(el);
  }
}

/* ───── static content from data ───── */
$('#cycle-list').innerHTML = CYCLE.map((c) => `<li><span class="cy-n">${c.n}</span><div class="cy-name"><h3>${esc(c.name)}</h3><p class="cy-time">${esc(c.time)}</p></div><p class="cy-text">${esc(c.text)}</p><button class="btn btn-ink cy-go" type="button" data-goto="${c.area}"${c.item ? ` data-item="${c.item}"` : ''}>See it in 3D</button></li>`).join('');
$('#figures-grid').innerHTML = NUMBERS.map((n) => `<div><dt>${esc(n.v)}${n.unit ? `<small>${esc(n.unit)}</small>` : ''}</dt><dd><b>${esc(n.l)}</b><span>${esc(n.note)}</span></dd></div>`).join('');
$('#f-species').innerHTML = SPECIES.map((s) => `<label><input type="checkbox" name="sp" value="${esc(s.local)}"><span>${esc(s.local)}</span></label>`).join('');
$('#c-wa').textContent = SITE.whatsappLabel; $('#c-wa').href = `https://wa.me/${SITE.whatsapp}`;
$('#c-tel').textContent = SITE.phoneLabel; $('#c-tel').href = `tel:${SITE.phone}`; $('#c-office').textContent = SITE.office.replace(/^Head office: /, '');
$('#co-about').textContent = ABOUT; $('#co-vision').textContent = `“${VISION}”`; $('#co-mission').textContent = `“${MISSION}”`;
$('#co-time').innerHTML = STORY.map((s) => `<li><b>${esc(s.when)}</b><span>${esc(s.what)}</span></li>`).join('');
$('#c-mail').textContent = SITE.email; $('#c-mail').href = `mailto:${SITE.email}`; $('#c-place').textContent = SITE.place;

/* ───── enquiry form: opens WhatsApp or the mail app with the message written out ───── */
const form = $('#enquiry');
const syncForm = () => { const fry = form.topic.value === 'Fry order'; $('#f-fry').hidden = !fry; $('#f-species').hidden = !(fry || form.topic.value === 'Research'); };
form.addEventListener('change', syncForm); syncForm();
form.addEventListener('submit', (e) => {
  e.preventDefault(); const via = (e.submitter && e.submitter.dataset.via) || 'wa', f = new FormData(form);
  const name = (f.get('name') || '').trim(); $('#f-err').hidden = !!name; if (!name) { form.name.focus(); return; }
  const sp = f.getAll('sp'), lines = [`Enquiry: ${f.get('topic')}`, `Name: ${name}`];
  if (f.get('org')) lines.push(`Organisation: ${f.get('org')}`); if (sp.length && !$('#f-species').hidden) lines.push(`Species: ${sp.join(', ')}`);
  if (!$('#f-fry').hidden) { if (f.get('qty')) lines.push(`Quantity: ${f.get('qty')}`); if (f.get('when')) lines.push(`Needed: ${f.get('when')}`); }
  if (f.get('msg')) lines.push('', f.get('msg'));
  const text = lines.join('\n');
  window.open(via === 'wa' ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}` : `mailto:${SITE.email}?subject=${encodeURIComponent(`${f.get('topic')} enquiry from ${name}`)}&body=${encodeURIComponent(text)}`, via === 'wa' ? '_blank' : '_self', 'noopener');
});

/* ───── smooth scrolling ───── */
const lenis = reduced ? null : new Lenis({ lerp: 0.11, wheelMultiplier: 0.95, smoothWheel: true, syncTouch: false });
const scrollTo = (target, at = 0, immediate = false) => {
  const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY + (typeof target === 'number' ? 0 : target.offsetHeight * at) - (at ? 0 : 0);
  if (lenis) lenis.scrollTo(y, { immediate, duration: 1.4 }); else scrollTo0(y, immediate);
};
const scrollTo0 = (y, immediate) => window.scrollTo({ top: y, behavior: immediate || reduced ? 'auto' : 'smooth' });
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return; const id = a.getAttribute('href').slice(1), el = id === 'top' ? document.documentElement : document.getElementById(id); if (!el) return;
  const to = id === 'species' ? el.querySelector('.species-stage') : el;
  e.preventDefault(); scrollTo(id === 'top' ? 0 : to.getBoundingClientRect().top + scrollY + (id === 'masterplan' ? innerHeight * 0.35 : 0));
});
const top = $('#topbar'), navLinks = [...document.querySelectorAll('.nav a')];
const secs = ['masterplan', 'species', 'cycle', 'contact'].map((id) => document.getElementById(id));   // (the company section sits between cycle and contact)

/* ───── the model ───── */
let world = null, app = null, story = null, species = null, intro = null;
const ldPct = $('#ld-pct'), ldMsg = $('#ld-msg');
let shown = 0, target = 0.04;
// the loading screen: the plan draws itself with the progress (--p), the words say what is being built, a fact comes up now and then
const loaderEl = $('#loader'), ldFact = $('#ld-fact');
const LD_FACTS = NUMBERS.map((n) => `${n.v}${n.unit ? ` ${n.unit}` : ''} · ${n.l}`).concat(['Built in three phases, from the original hatchery to the Innovation Park', 'Native Gulf species, raised from egg to sea cage']);
let ldFactI = -1, ldFactT = 0;
const ldTick = setInterval(() => {
  shown += (target - shown) * 0.2; ldPct.textContent = Math.round(shown * 100); loaderEl.style.setProperty('--p', shown.toFixed(3));
  if (target < 0.9) ldMsg.textContent = shown < 0.3 ? 'Drawing the site' : shown < 0.62 ? 'Building the halls' : 'Filling the tanks';
  if ((ldFactT -= 50) <= 0) { ldFactT = 2600; ldFact.classList.add('is-out'); setTimeout(() => { ldFactI = (ldFactI + 1) % LD_FACTS.length; ldFact.textContent = LD_FACTS[ldFactI]; ldFact.classList.remove('is-out'); }, 420); }
}, 50);
const done = () => { clearInterval(ldTick); ldPct.textContent = '100'; loaderEl.style.setProperty('--p', '1'); setTimeout(() => body.classList.remove('is-loading'), 90); };

async function boot() {
  if (!hasWebGL() || new URLSearchParams(location.search).has('nogl')) { body.classList.add('no-gl'); fallbackSteps(); done(); return; }
  try {
    // the opening film: from the gate to area 09, then the rest of the site fills in phase by phase (skipped for reduced motion, #explore and ?nointro)
    const q = new URLSearchParams(location.search), wantIntro = !reduced && location.hash !== '#explore' && !q.has('nointro') && scrollY < 40;
    // ask for every module the first picture needs at once, while the fonts come in (one after another they cost a round trip each)
    const worldMod = import('./world/world.js'), uiMods = Promise.all([import('./ui/app.js'), import('./ui/story.js'), import('./ui/species.js')]), introMod = wantIntro ? import('./world/intro.js') : null;
    await Promise.race([Promise.all([document.fonts.load('600 40px "IBM Plex Sans Condensed"'), document.fonts.load('600 40px "IBM Plex Sans"')]), new Promise((r) => setTimeout(r, 1000))]).catch(() => {});
    const { createWorld } = await worldMod;
    target = 0.1;
    world = await createWorld($('#stage'), { onProgress: (p) => { target = 0.1 + p * 0.75; } });
    window.__world = world;
    // the graphics driver compiles the site's shaders on its own threads while the page and the film are set up
    const shaders = world.engine.renderer.compileAsync(world.scene, world.camera).catch(() => {});
    const [{ createApp }, { createStory, HERO, heroPose }, { createSpecies }] = await uiMods;
    const hero = () => heroPose(world.engine.w, world.engine.h);
    const heroLens = () => { const r = world.rig; r.fov = r.fovGoal = HERO.fov; world.camera.fov = HERO.fov; world.camera.updateProjectionMatrix(); if (r.onFov) r.onFov(HERO.fov); };
    const countItems = () => { const n = world.items.size; if (n > 60) $('#fact-items').textContent = `${Math.floor(n / 10) * 10}+`; if (story) story.refresh(); };
    const lock = (v) => { if (lenis) (v ? lenis.stop() : lenis.start()); document.documentElement.style.overflow = v ? 'hidden' : ''; };
    story = createStory(world, { onExplore: (id) => app.enter(id, 'walk'), onFocus: (iid) => app.enterItem(iid), scrollTo: (el, at) => scrollTo(el, at) });
    app = createApp(world, {
      lock, enter: (id, view) => app.enter(id, view),
      storyOpen: () => (story && !species.active ? story.open : null),      // the area whose roof the scroll tour has lifted: its things can be clicked from the page
      busy: () => !!(intro && intro.playing),
      onExit: (last) => { story.setActive(true); lastY = -1; if (last) { const el = document.getElementById('area-' + last); if (el) scrollTo(el.getBoundingClientRect().top + scrollY + el.offsetHeight * 0.36, 0, true); } },
      goSpecies: (id) => { species.select(id, true); scrollTo($('.species-stage').getBoundingClientRect().top + scrollY, 0, true); },
      onArea: () => {},
    });
    // on the page, the area pins keep clear of the menu bar and of the hero's words (in the model they go anywhere)
    app.labels.pinClear = (x, y) => app.S.exploring || (y > 100 && !(innerWidth > 900 && x < Math.min(innerWidth * 0.54, 780) && y > 150));
    // entering from far down the page (the cycle list, the footer): the engine sleeps there, so wake it first
    const enter = app.enter; app.enter = (id, view) => { world.engine.setActive(true); story.setActive(false); species.setActive(false); veil.style.opacity = 0; enter(id, view); };
    species = createSpecies(world, { onGoto: (id) => app.enter(id), onAsk: (name) => { for (const c of form.querySelectorAll('[name=sp]')) c.checked = c.value === name; form.topic.value = 'Fry order'; syncForm(); scrollTo($('#contact').getBoundingClientRect().top + scrollY); } });
    // the language switch in the model's own controls too
    { const lp = document.createElement('button'); lp.type = 'button'; lp.className = 'pill pill-lang'; lp.dataset.lang = ''; const ctl = $('#app-ctrl'); if (ctl) { ctl.appendChild(lp); langButtons(); } }
    if (introMod) { const { createIntro } = await introMod; intro = createIntro(world, { hero }); window.__intro = intro; }
    // otherwise open a little high and wide, then settle into the hero view as the loader lifts
    else if (reduced) { world.rig.jump(hero()); heroLens(); world.rig.lambda = 4.2; }
    else { const h = hero(); world.rig.jump({ ...h, dist: h.dist * 1.45, pol: h.pol - 0.12, az: h.az + 0.22 }); heroLens(); world.rig.lambda = 1.5; setTimeout(() => { if (!app.S.exploring) world.rig.lambda = 4.2; }, 3200); }
    target = 0.92; ldMsg.textContent = 'Warming up';
    await shaders; await world.engine.renderer.compileAsync(world.scene, world.camera).catch(() => {});
    // a slow phone that is already late skips the film's warm-up drawing: the loader must be gone by 3 s
    if (intro) { intro.prepare({ quick: performance.now() > 2100 }); body.classList.add('intro'); lock(true); story.setActive(false); }
    world.engine.start();
    // let the first two frames draw under the loader, then lift it at once
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    target = 1; done();
    lastY = -1; window.__app = app;
    setTimeout(() => app.audio.prime(), 1500);                    // the first sound then starts at once (audio.js)
    if (intro) setTimeout(() => runIntro(lock, countItems), 120);
    else setTimeout(() => world.prebuild && world.prebuild().then(countItems), 1800);
    if (location.hash === '#explore') setTimeout(() => app.enter(), 600);
  } catch (err) {
    console.error(err); body.classList.add('no-gl'); fallbackSteps(); done();
  }
}
/** plays the opening film with its captions; a scroll, a key or the button skips to the end */
function runIntro(lock, countItems) {
  const el = $('#intro'), cap = el.querySelector('.intro-cap'), chips = [...el.querySelectorAll('.intro-phases li')];
  el.hidden = false; let capT = null;
  intro.onCaption = (small, big) => { cap.classList.add('is-out'); clearTimeout(capT); if (!small) return; capT = setTimeout(() => { cap.querySelector('small').textContent = small; cap.querySelector('b').textContent = big; cap.classList.remove('is-out'); }, 430); };
  const callout = el.querySelector('.intro-callout');
  intro.onCall = (it) => {
    app.labels.clearTags();
    callout.hidden = !it;
    if (!it) return;
    callout.querySelector('small').textContent = `08 · ${it.code}`;
    callout.querySelector('span').textContent = it.name;
    if (innerWidth > 760) app.labels.addTag(it);
  };
  intro.onPhase = (k) => chips.forEach((c, i) => { c.classList.toggle('is-on', i === k - 1); c.classList.toggle('is-done', i < k - 1); });
  const skip = () => intro.finish(true), onKey = (e) => { if (['Space', 'ArrowDown', 'PageDown', 'Escape', 'Enter', 'End'].includes(e.code)) { e.preventDefault(); skip(); } };
  el.querySelector('.intro-skip').addEventListener('click', skip, { once: true });
  addEventListener('wheel', skip, { passive: true }); addEventListener('touchmove', skip, { passive: true }); addEventListener('keydown', onKey);
  intro.play().then(() => {
    removeEventListener('wheel', skip); removeEventListener('touchmove', skip); removeEventListener('keydown', onKey);
    cap.classList.add('is-out'); chips.forEach((c) => { c.classList.remove('is-on'); c.classList.add('is-done'); }); setTimeout(() => { el.hidden = true; }, 700);
    body.classList.remove('intro'); if (!app.S.exploring) { lock(false); story.setActive(true); } lastY = -1;
    setTimeout(() => world.prebuild && world.prebuild().then(countItems), 1200);
  });
}
function fallbackSteps() {
  $('#tour-steps').innerHTML = TOUR.map((a) => `<article class="step"><div class="step-card"><header class="sc-head"><span class="sc-n">${a.n}</span><div class="sc-meta"><p class="sc-eye">Phase ${a.phase} · ${esc(a.tag)}</p><h3>${esc(a.name)}</h3></div></header><ul class="sc-stats">${a.stats.map(([v, l]) => `<li><b>${esc(v)}</b><span>${esc(l)}</span></li>`).join('')}</ul><div class="sc-text"><p class="sc-line">${esc(a.line)}</p><p class="sc-desc">${esc(a.desc)}</p></div></div></article>`).join('');
}

/* ───── per-frame page logic ───── */
const veil = $('#veil'), railEl = $('#tour-rail');
let lastY = -1, speciesTop = 0, speciesEnd = 0;
const measure = () => { const s = $('#species'), st = s.querySelector('.species-stage'); speciesTop = st.getBoundingClientRect().top + scrollY; speciesEnd = s.getBoundingClientRect().top + scrollY + s.offsetHeight; if (story) story.measure(); };
addEventListener('resize', measure); addEventListener('load', measure); setTimeout(measure, 800);
let prev = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (lenis) lenis.raf(now);
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
  const y = scrollY, vh = innerHeight;
  if (y !== lastY) {
    lastY = y;
    const overModel = y < speciesEnd - vh * 0.5, inSpecies = y > speciesTop - vh * 0.5 && y < speciesEnd - vh * 0.08;
    const inContact = !!secs[3] && y >= secs[3].offsetTop - 60, underwater = speciesEnd > 0 && y > speciesTop - vh * 0.5 && y < speciesEnd - 40;
    top.classList.toggle('is-solid', speciesEnd > 0 && !inContact && !underwater && y > vh * 0.45);
    top.classList.toggle('is-dark', inContact || underwater);
    let here = -1; secs.forEach((s, i) => { if (s && y >= s.offsetTop - vh * 0.4) here = i; }); navLinks.forEach((a, i) => a.classList.toggle('is-here', i === here));
    if (world && !(app && app.S.exploring) && !(intro && intro.playing)) {
      world.engine.setActive(y < speciesEnd - 4);
      const d = (y + vh - speciesTop) / vh;                         // how far the species section has come in
      veil.style.opacity = d <= 0.12 ? 0 : d < 0.5 ? smooth((d - 0.12) / 0.38) : d < 0.92 ? 1 - smooth((d - 0.5) / 0.42) : 0;
      species.setActive(d >= 0.5 && y < speciesEnd - 4);
      app.labels.showPins(y < vh * 0.55 && !species.active && innerWidth > 760);
      railEl.style.opacity = story.tau > -0.2 && y < speciesTop - vh ? 1 : 0;
    }
  }
  // (the hero is framed as Jeffry picked it: no sideways shift on a wide screen; on a phone the model sits above the words)
  if (intro && intro.playing) { const w = innerWidth > 900, k = intro.settleProgress; world.rig.setShift(0, w ? 0 : innerHeight * 0.2 * k); if (app) app.labels.showPins(false); }
  else if (world && story && !(app && app.S.exploring)) {
    if (!species.active) story.update(y, dt);
    const wide = innerWidth > 900, k = 1 - smooth(clamp((story.tau + 1) / 0.7, 0, 1));
    world.rig.setShift(0, wide ? 0 : innerHeight * 0.2 * k);
  }
}
if (!world) requestAnimationFrame(frame);
boot().then(() => { measure(); if (world) { world.updaters.push((dt, t) => species.update(dt, t)); } });

/* ───── the company's film: it plays in place, at the top of its section (YouTube's privacy-enhanced domain, loaded only when asked for) ───── */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-movie]'); if (!b) return;
  const box = b.closest('.movie-player') || $('#movie-player'); if (!box) return;
  box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.movie)}?autoplay=1&rel=0&playsinline=1" title="Gulf Aquaculture film" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  box.classList.add('is-playing'); const f = box.querySelector('iframe'); f.tabIndex = 0; f.focus({ preventScroll: true });
});

/* ───── buttons outside the model ───── */
document.addEventListener('click', (e) => {
  const ex = e.target.closest('[data-explore]'); if (ex && app) { app.enter(); return; }
  const g = e.target.closest('#page [data-goto]'); if (g && app && !g.closest('#species-card')) { app.enter(g.dataset.goto); if (g.dataset.item) setTimeout(() => app.goItem(g.dataset.item), 2600); }
});
