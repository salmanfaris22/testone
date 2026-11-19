// The site in English or Arabic. The choice is made before the page paints (a line in index.html sets <html lang dir> from
// ?lang= or the last choice kept in this browser) and read here. In Arabic the dictionary (src/i18n/ar.js, its own chunk, never
// downloaded for English) is loaded first, then every text the page shows is put into Arabic where it appears: the page itself,
// and everything the model writes later (cards, tags, the dock, hints, captions, the control screen), through one watcher on
// the document. The code keeps its English names, so nothing that depends on them changes. Pictures drawn in the 3D world
// (signs, screens, the LED boards) stay as they are: several are in both languages already.
export const LANG = document.documentElement.lang === 'ar' ? 'ar' : 'en';
export const isAr = LANG === 'ar';
const D = isAr ? (await import('./i18n/ar.js')) : null;
const DICT = D ? D.DICT : null, RULES = D ? D.RULES : [];

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const cache = new Map();
/** a text in the current language (unchanged in English, and when the dictionary has nothing for it) */
export function t(s) {
  if (!isAr || s == null) return s;
  const raw = String(s), k = norm(raw); if (!k || !/[A-Za-z]/.test(k)) return raw;
  if (cache.has(k)) return cache.get(k);
  cache.set(k, raw);                         // (held while it is worked out, so a rule that comes back to the same text cannot loop)
  let out = DICT[k];
  if (out === undefined) for (const [re, f] of RULES) { const m = k.match(re); if (m) { const r = f(m, t); if (r != null) { out = r; break; } } }
  // a mark round it or after it ("…," “…”) does not stop a match
  if (out === undefined) {
    const q = k.match(/^([“"«]?)(.*?)([,.:;]?)([”"»]?)$/);
    if (q && (q[1] || q[3] || q[4])) for (const c of [q[2] + q[3], q[2]]) { if (c === k || !c) continue; const r = t(c); if (r !== c) { out = (q[1] ? '«' : '') + r + (c === q[2] ? q[3].replace(',', '،') : '') + (q[4] ? '»' : ''); break; } }
  }
  if (out === undefined) out = raw;
  cache.set(k, out); return out;
}

/* ───── the watcher: text nodes and a few attributes, as they arrive ───── */
const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE']);
const done = new WeakMap();                 // text node → the Arabic it was given (so our own change is not translated again)
function textNode(n) {
  const v = n.nodeValue; if (!v || !/[A-Za-z]/.test(v) || done.get(n) === v) return;
  const p = n.parentNode; if (!p || SKIP.has(p.nodeName) || (p.closest && p.closest('[translate="no"], .notranslate'))) return;
  const k = norm(v), r = t(k); if (r === k || r === v) return;
  const lead = v.match(/^\s*/)[0], tail = v.match(/\s*$/)[0], nv = lead + r + tail; done.set(n, nv); n.nodeValue = nv;
}
function element(el) {
  if (SKIP.has(el.nodeName) || el.getAttribute('translate') === 'no') return;
  for (const a of ATTRS) { const v = el.getAttribute(a); if (v && /[A-Za-z]/.test(v)) { const r = t(v); if (r !== v) el.setAttribute(a, r); } }
}
function walk(root) {
  if (root.nodeType === 3) return textNode(root);
  if (root.nodeType !== 1 && root.nodeType !== 11) return;
  if (root.nodeType === 1) { if (SKIP.has(root.nodeName) || root.getAttribute('translate') === 'no') return; element(root); }
  const it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
  for (let n = it.nextNode(); n; n = it.nextNode()) { if (n.nodeType === 3) textNode(n); else element(n); }
}
/** put the page into Arabic and keep it so as the model writes into it (no-op in English) */
export function startTranslator() {
  if (!isAr) return;
  document.title = t(document.title);
  for (const m of document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]')) m.setAttribute('content', t(m.getAttribute('content')));
  walk(document.body);
  new MutationObserver((list) => {
    for (const r of list) {
      if (r.type === 'characterData') textNode(r.target);
      else if (r.type === 'attributes') element(r.target);
      else for (const n of r.addedNodes) walk(n);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

/** the language buttons: each [data-lang] button switches to the other language and reloads (the choice is kept) */
export function langButtons() {
  for (const b of document.querySelectorAll('[data-lang]')) {
    if (b.dataset.langOn) continue; b.dataset.langOn = '1';
    b.textContent = isAr ? 'English' : 'عربي'; b.setAttribute('lang', isAr ? 'en' : 'ar'); b.setAttribute('translate', 'no');
    b.setAttribute('aria-label', isAr ? 'View the site in English' : 'اعرض الموقع بالعربية');
    b.addEventListener('click', () => {
      const next = isAr ? 'en' : 'ar'; try { localStorage.setItem('lang', next); } catch (e) { /* private mode: the address keeps it */ }
      const u = new URL(location.href); u.searchParams.set('lang', next); location.replace(u.toString());
    });
  }
}
