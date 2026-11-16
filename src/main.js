// Boot: build the 3D model, then wire the page, the scroll tour and explore mode around it.
import '@fontsource/ibm-plex-sans/300.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans-condensed/500.css';
import '@fontsource/ibm-plex-sans-condensed/600.css';
import './styles/base.css';
import './styles/site.css';
import './styles/app.css';
import Lenis from 'lenis';
import { SITE, NUMBERS, CYCLE, ABOUT, STORY, VISION, MISSION } from './data/site.js';
import { SPECIES } from './data/species.js';
import { AREAS } from './data/areas.js';

// kept local so the 3D engine (and three.js) stays out of the first chunk
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const hasWebGL = () => { try { return !!(window.WebGL2RenderingContext && document.createElement('canvas').getContext('webgl2')); } catch { return false; } };

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const body = document.body;
history.scrollRestoration = 'manual';

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
const ldTick = setInterval(() => { shown += (target - shown) * 0.2; ldPct.textContent = Math.round(shown * 100); }, 50);
const done = () => { clearInterval(ldTick); ldPct.textContent = '100'; body.classList.remove('is-loading'); };

async function boot() {
  if (!hasWebGL() || new URLSearchParams(location.search).has('nogl')) { body.classList.add('no-gl'); fallbackSteps(); done(); return; }
  try {
    await Promise.race([Promise.all([document.fonts.load('600 40px "IBM Plex Sans Condensed"'), document.fonts.load('600 40px "IBM Plex Sans"')]), new Promise((r) => setTimeout(r, 1800))]).catch(() => {});
    const { createWorld } = await import('./world/world.js');
    target = 0.1;
    world = await createWorld($('#stage'), { onProgress: (p) => { target = 0.1 + p * 0.75; } });
    window.__world = world;
    const [{ createApp }, { createStory, HERO }, { createSpecies }] = await Promise.all([import('./ui/app.js'), import('./ui/story.js'), import('./ui/species.js')]);
    const countItems = () => { const n = world.items.size; if (n > 60) $('#fact-items').textContent = `${Math.floor(n / 10) * 10}+`; };
    const lock = (v) => { if (lenis) (v ? lenis.stop() : lenis.start()); document.documentElement.style.overflow = v ? 'hidden' : ''; };
    story = createStory(world, { onExplore: (id) => app.enter(id), scrollTo: (el, at) => scrollTo(el, at) });
    app = createApp(world, {
      lock, enter: (id) => app.enter(id),
      onExit: (last) => { story.setActive(true); lastY = -1; if (last) { const el = document.getElementById('area-' + last); if (el) scrollTo(el.getBoundingClientRect().top + scrollY + el.offsetHeight * 0.36, 0, true); } },
      goSpecies: (id) => { species.select(id, true); scrollTo($('.species-stage').getBoundingClientRect().top + scrollY, 0, true); },
      onArea: () => {},
    });
    // entering from far down the page (the cycle list, the footer): the engine sleeps there, so wake it first
    const enter = app.enter; app.enter = (id) => { world.engine.setActive(true); story.setActive(false); species.setActive(false); veil.style.opacity = 0; enter(id); };
    species = createSpecies(world, { onGoto: (id) => app.enter(id), onAsk: (name) => { for (const c of form.querySelectorAll('[name=sp]')) c.checked = c.value === name; form.topic.value = 'Fry order'; syncForm(); scrollTo($('#contact').getBoundingClientRect().top + scrollY); } });
    // the opening film: from the gate, the site is built phase by phase (skipped for reduced motion, #explore and ?nointro)
    const q = new URLSearchParams(location.search), wantIntro = !reduced && location.hash !== '#explore' && !q.has('nointro') && scrollY < 40;
    if (wantIntro) { const { createIntro } = await import('./world/intro.js'); intro = createIntro(world, { hero: HERO }); window.__intro = intro; }
    // otherwise open a little high and wide, then settle into the hero view as the loader lifts
    else if (reduced) { world.rig.jump(HERO); world.rig.lambda = 4.2; }
    else { world.rig.jump({ ...HERO, dist: HERO.dist * 1.32, pol: HERO.pol - 0.17, az: HERO.az - 0.14 }); world.rig.lambda = 1.5; setTimeout(() => { if (!app.S.exploring) world.rig.lambda = 4.2; }, 3200); }
    target = 0.92; ldMsg.textContent = 'Warming up';
    await world.engine.renderer.compileAsync(world.scene, world.camera).catch(() => {});
    if (intro) { intro.prepare(); body.classList.add('intro'); lock(true); story.setActive(false); }
    world.engine.start();
    await new Promise((r) => setTimeout(r, 350));
    target = 1; setTimeout(done, 260);
    lastY = -1; window.__app = app;
    if (intro) setTimeout(() => runIntro(lock, countItems), 420);
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
  $('#tour-steps').innerHTML = AREAS.map((a) => `<article class="step"><div class="step-card"><div class="step-top"><span class="step-n">${a.n}</span><span class="step-tag">${esc(a.tag)}</span></div><h3>${esc(a.name)}</h3><p class="step-desc">${esc(a.desc)}</p></div></article>`).join('');
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
  if (intro && intro.playing) { const w = innerWidth > 900, k = smooth(clamp((intro.time - 12.6) / 2.4, 0, 1)); world.rig.setShift(w ? -innerWidth * 0.16 * k : 0, w ? 0 : -innerHeight * 0.1 * k); if (app) app.labels.showPins(false); }
  else if (world && story && !(app && app.S.exploring)) {
    if (!species.active) story.update(y, dt);
    const wide = innerWidth > 900, k = 1 - smooth(clamp((story.tau + 1) / 0.7, 0, 1));
    world.rig.setShift(wide ? -innerWidth * 0.16 * k : 0, wide ? 0 : -innerHeight * 0.1 * k);
  }
}
if (!world) requestAnimationFrame(frame);
boot().then(() => { measure(); if (world) { world.updaters.push((dt, t) => species.update(dt, t)); } });

/* ───── the company's film: a YouTube player over the page (privacy-enhanced domain, only loaded when asked for) ───── */
{
  const modal = $('#movie-modal'), frame = modal && modal.querySelector('.movie-frame'); let back = null;
  const close = () => { if (!modal || modal.hidden) return; modal.hidden = true; frame.innerHTML = ''; if (lenis) lenis.start(); if (back) back.focus(); };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-movie]');
    if (b && modal) { back = b; frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.movie)}?autoplay=1&rel=0&playsinline=1" title="Gulf Aquaculture film" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`; modal.hidden = false; if (lenis) lenis.stop(); modal.querySelector('.movie-x').focus(); return; }
    if (modal && !modal.hidden && (e.target === modal || e.target.closest('.movie-x'))) close();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ───── buttons outside the model ───── */
document.addEventListener('click', (e) => {
  const ex = e.target.closest('[data-explore]'); if (ex && app) { app.enter(); return; }
  const g = e.target.closest('#page [data-goto]'); if (g && app && !g.closest('#species-card')) { app.enter(g.dataset.goto); if (g.dataset.item) setTimeout(() => app.goItem(g.dataset.item), 2600); }
});
