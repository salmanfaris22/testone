// usage: node rbconvert.mjs <rawDir> <outDir> [port]   (the Vite dev server of the project must be running)
// Converts every avatar folder in rawDir (one .fbx + *_color.tga) and rawDir/anim/*.fbx.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const [rawArg, outArg, port = '5173'] = process.argv.slice(2);
const RAW = path.resolve(rawArg), OUT = path.resolve(outArg); fs.mkdirSync(OUT, { recursive: true });
const CLIPS = ['walk_neutral', 'walk_stroll_01', 'idle_neutral_01', 'idle_look_around_01', 'gestic_talk_neutral_01', 'work_mid', 'work_table', 'documents_check', 'cell_phone_textmessage', 'sit_table_idle_neutral_01', 'sit_chair_idle_neutral_01', 'gestic_presentation_right_01'];
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
p.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 300)));
await p.route('**/rbraw/**', (route) => { const f = path.join(RAW, decodeURIComponent(new URL(route.request().url()).pathname.split('/rbraw/')[1])); if (fs.existsSync(f) && fs.statSync(f).isFile()) route.fulfill({ path: f }); else route.fulfill({ status: 404, body: '' }); });
await p.goto(`http://localhost:${port}/tools/avatars/convert.html`, { waitUntil: 'load' });
await p.waitForFunction('window.convertAvatar');
const meta = {};
for (const id of fs.readdirSync(RAW).filter((d) => d !== 'anim' && fs.statSync(path.join(RAW, d)).isDirectory()).sort()) {
  const fbx = fs.readdirSync(path.join(RAW, id)).find((f) => f.endsWith('.fbx'));
  const r = await p.evaluate((u) => window.convertAvatar(u), `/rbraw/${id}/${encodeURIComponent(fbx)}`);
  fs.writeFileSync(path.join(OUT, `${id}.bin`), Buffer.from(r.b64, 'base64'));
  meta[id] = { src: fbx, height: r.height, verts: r.verts, tris: r.tris, slots: r.slots };
  console.log(id.padEnd(10), fbx.padEnd(28), `${r.verts} v (${r.raw} raw)`, `${r.tris} t`, `${(r.bytes / 1024).toFixed(0)} kB`, `h ${r.height}`, `bones ${r.bones}`, r.wrapped ? `uv wrapped ${r.wrapped}` : '', r.slots.map((s) => s.name.replace(/^[a-z]+\d+_/, '')).join('+'), r.meshes.length > 1 ? r.meshes.join(',') : '');
}
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));
const list = []; for (const g of ['m', 'f']) for (const c of CLIPS) if (fs.existsSync(path.join(RAW, 'anim', `${g}_${c}.fbx`))) list.push({ name: `${g}_${c}`, url: `/rbraw/anim/${g}_${c}.fbx` });
const a = await p.evaluate((l) => window.convertAnims(l), list);
fs.writeFileSync(path.join(OUT, 'anims.bin'), Buffer.from(a.b64, 'base64'));
console.log('anims', `${(a.bytes / 1024).toFixed(0)} kB`, 'bones', a.bones, 'fingers', a.fingers);
for (const c of a.clips) console.log(' ', c.name.padEnd(28), `src ${c.src}s`, `${c.n} fr @${c.fps}`, 'y', c.y.join('..'), 'drift', c.drift.join(','), 'stride', c.stride);
await b.close();
