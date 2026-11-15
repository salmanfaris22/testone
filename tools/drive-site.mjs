// usage: node site.mjs <outDir> <prefix> '<json steps>' [w] [h]
// steps: [[jsExpression, waitMs, shotName|null], ...] run inside the page after the app has entered explore mode
import { chromium } from 'playwright-core';
const [out, prefix, stepsJson, w = '1600', h = '900', url = 'http://localhost:5174/#explore'] = process.argv.slice(2);
const steps = JSON.parse(stepsJson);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!/favicon|404/.test(t)) console.log(m.type().toUpperCase(), t.slice(0, 500)); } });
p.on('pageerror', (e) => console.log('PAGEERR', String(e.stack || e).slice(0, 900)));
await p.goto(url, { waitUntil: 'load', timeout: 60000 });
await p.waitForFunction(() => window.__app && window.__world, null, { timeout: 60000 });
await p.waitForTimeout(2500);
for (const [js, wait, name] of steps) {
  if (js) { try { const r = await p.evaluate(js); if (r !== undefined && r !== null) console.log('→', JSON.stringify(r).slice(0, 400)); } catch (e) { console.log('STEPERR', js.slice(0, 80), String(e).slice(0, 400)); } }
  await p.waitForTimeout(wait);
  if (name) await p.screenshot({ path: `${out}/${prefix}-${name}.png` });
}
await b.close();
