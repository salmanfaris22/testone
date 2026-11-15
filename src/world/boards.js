// A big LED screen at every area, like the outdoor displays at the entrance of a hall: the area's number and name, its phase,
// a rolling key figure, a live trace and a news ticker. Each screen is a small canvas redrawn a few times a second
// (round robin, only when it is near enough to read), so ten of them cost almost nothing.
import * as THREE from 'three';
import { Builder } from './kit.js';
import { PHASES, areaById } from '../data/areas.js';

const TW = 512, TH = 288;
const FONT = '"IBM Plex Sans", Arial, sans-serif', FONTC = '"IBM Plex Sans Condensed", "Arial Narrow", sans-serif';
const TEAL = '#35c4c0', ORANGE = '#e8862e', WHITE = '#f4f8f8', MUTE = 'rgba(214,232,236,.72)';

/** figures that tick on each screen (example data, labelled as such) */
const LIVE = {
  phase1: [['Header tank level', 82, '%', 0.4], ['Fry in nursery', 1.42, 'M', 0.002], ['Water temperature', 26.4, '°C', 0.05]],
  nursery: [['Fry ready this week', 412000, '', 900], ['Weaning feed today', 186, 'kg', 0.6], ['Oxygen', 7.1, 'mg/L', 0.04]],
  hatchery: [['Larvae in tanks', 3.42, 'M', 0.004], ['Survival, average', 64, '%', 0.08], ['Tank temperature', 26.3, '°C', 0.04]],
  livefeed: [['Rotifers today', 2.1, 'bn', 0.004], ['Algae columns', 48, 'running', 0], ['Light hours', 24, 'h', 0]],
  broodstock: [['Eggs collected today', 1.86, 'M', 0.003], ['Breeding tanks', 12, 'in use', 0], ['Sea water in', 410, 'm³/h', 1.2]],
  plantroom: [['Water reused', 92, '%', 0.08], ['UV dose', 38, 'mJ/cm²', 0.15], ['Pumps running', 14, 'of 16', 0]],
  genroom: [['Grid', 100, '% supply', 0], ['Generators ready', 3, 'of 3', 0], ['Fuel in tanks', 87, '%', 0.02]],
  visitor: [['Visitors today', 184, '', 0.05], ['Next guided tour', 15, 'min', 0], ['Aquarium', 26.0, '°C', 0.03]],
  research: [['Samples tested today', 96, '', 0.03], ['Laboratories', 14, 'in use', 0], ['Water checks', 'All clear', '', 0]],
  seacages: [['Fish at sea', 2.6, 'M', 0.002], ['Feed delivered today', 1840, 'kg', 1.4], ['LFC Hamour', 'Alongside', '', 0]],
};

function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const fmt = (v, step) => (typeof v === 'string' ? v : v >= 10000 ? Math.round(v).toLocaleString('en-US') : step && step < 0.01 ? v.toFixed(2) : step && step < 1 && v < 100 ? v.toFixed(1) : String(Math.round(v)));

function makeScreen(id) {
  const a = areaById[id], ph = PHASES[a.phase - 1], live = (LIVE[id] || []).map((q) => ({ k: q[0], v: q[1], u: q[2], step: q[3] }));
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const trace = Array.from({ length: 64 }, (_, i) => 0.5 + Math.sin(i * 0.37) * 0.16 + Math.sin(i * 1.3) * 0.05);
  const ticker = `${a.name} · ${a.line} · ${a.bullets.join(' · ')} · ${ph.name}: ${ph.title} · `;
  let tw = 0;
  const draw = (t) => {
    for (const q of live) if (q.step && typeof q.v === 'number') q.v += (Math.random() - 0.48) * q.step;
    trace.shift(); trace.push(Math.min(0.92, Math.max(0.08, trace[trace.length - 1] + (Math.random() - 0.5) * 0.09 + (0.5 - trace[trace.length - 1]) * 0.06)));
    // background: deep sea blue with a slow light sweep
    const bg = g.createLinearGradient(0, 0, TW, TH); bg.addColorStop(0, '#08283a'); bg.addColorStop(1, '#0c4a5c'); g.fillStyle = bg; g.fillRect(0, 0, TW, TH);
    const sx = ((t * 60) % (TW * 2)) - TW * 0.5, sw = g.createLinearGradient(sx - 120, 0, sx + 120, 0); sw.addColorStop(0, 'rgba(255,255,255,0)'); sw.addColorStop(0.5, 'rgba(255,255,255,.05)'); sw.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sw; g.fillRect(0, 0, TW, TH);
    // header: number, name, phase
    g.fillStyle = ORANGE; g.font = `600 64px ${FONTC}`; g.textBaseline = 'alphabetic'; g.fillText(a.n, 20, 70);
    const nx = 20 + g.measureText(a.n).width + 14;
    g.fillStyle = WHITE; g.font = `500 27px ${FONT}`; let name = a.name; while (g.measureText(name).width > TW - nx - 20 && name.length > 4) name = name.slice(0, -2); g.fillText(name === a.name ? name : name + '…', nx, 44);
    g.font = `600 15px ${FONTC}`; const pt = `${ph.name.toUpperCase()} · ${ph.title.toUpperCase()}`, pw = g.measureText(pt).width + 22;
    rr(g, nx, 54, pw, 24, 12); g.strokeStyle = ORANGE; g.lineWidth = 2; g.stroke(); g.fillStyle = ORANGE; g.fillText(pt, nx + 11, 71);
    // live badge and clock
    const on = Math.sin(t * 4) > -0.2; g.fillStyle = on ? '#ff4d3d' : 'rgba(255,77,61,.35)'; g.beginPath(); g.arc(TW - 92, 104, 6, 0, 7); g.fill();
    g.fillStyle = WHITE; g.font = `600 15px ${FONTC}`; g.fillText('LIVE', TW - 80, 109);
    const d = new Date(), hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0'); g.fillStyle = MUTE; g.fillText(`${hh}:${mm}`, TW - 80, 128);
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(20, 90, TW - 40, 1);
    // rolling key figure (slides up every 4 s)
    if (live.length) {
      const cyc = t / 4, i = Math.floor(cyc) % live.length, f = cyc - Math.floor(cyc), slide = f > 0.86 ? (f - 0.86) / 0.14 : 0, q = live[i], nq = live[(i + 1) % live.length];
      g.save(); g.beginPath(); g.rect(20, 96, 280, 104); g.clip();
      for (const [qq, off] of [[q, -slide * 104], [nq, (1 - slide) * 104]]) {
        if (off >= 104) continue;
        g.fillStyle = MUTE; g.font = `500 17px ${FONT}`; g.fillText(qq.k, 20, 124 + off);
        g.fillStyle = WHITE; g.font = `600 52px ${FONTC}`; const v = fmt(qq.v, qq.step); g.fillText(v, 20, 180 + off);
        if (qq.u) { const vw = g.measureText(v).width; g.fillStyle = TEAL; g.font = `500 22px ${FONTC}`; g.fillText(qq.u, 28 + vw, 180 + off); }
      }
      g.restore();
    }
    // live trace
    const x0 = 312, y0 = 140, w = TW - x0 - 20, h = 62;
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; for (let k = 0; k <= 3; k++) { g.beginPath(); g.moveTo(x0, y0 + (h * k) / 3); g.lineTo(x0 + w, y0 + (h * k) / 3); g.stroke(); }
    const grd = g.createLinearGradient(0, y0, 0, y0 + h); grd.addColorStop(0, 'rgba(53,196,192,.35)'); grd.addColorStop(1, 'rgba(53,196,192,0)');
    g.beginPath(); trace.forEach((v, k) => { const x = x0 + (w * k) / (trace.length - 1), y = y0 + h - v * h; k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.lineTo(x0 + w, y0 + h); g.lineTo(x0, y0 + h); g.closePath(); g.fillStyle = grd; g.fill();
    g.beginPath(); trace.forEach((v, k) => { const x = x0 + (w * k) / (trace.length - 1), y = y0 + h - v * h; k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.strokeStyle = TEAL; g.lineWidth = 2.5; g.stroke();
    const ly = y0 + h - trace[trace.length - 1] * h; g.fillStyle = ORANGE; g.beginPath(); g.arc(x0 + w, ly, 4.5, 0, 7); g.fill();
    g.fillStyle = MUTE; g.font = `500 13px ${FONT}`; g.fillText('Last hour', x0, y0 - 8);
    // a small fish crosses now and then
    const fx = ((t * 38 + id.length * 90) % (TW + 200)) - 100, fy = 226 + Math.sin(t * 2.1) * 4;
    if (fx > -60 && fx < TW + 60) { g.fillStyle = 'rgba(232,134,46,.9)'; g.beginPath(); g.ellipse(fx, fy, 15, 6.5, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(fx - 13, fy); g.lineTo(fx - 25, fy - 7); g.lineTo(fx - 25, fy + 7); g.closePath(); g.fill(); g.fillStyle = '#08283a'; g.beginPath(); g.arc(fx + 8, fy - 1.5, 1.6, 0, 7); g.fill(); }
    // ticker
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, TH - 38, TW, 38); g.fillStyle = ORANGE; g.fillRect(0, TH - 38, 6, 38);
    g.font = `500 17px ${FONT}`; if (!tw) tw = g.measureText(ticker).width;
    const off = (t * 70) % tw; g.fillStyle = WHITE; g.save(); g.beginPath(); g.rect(14, TH - 38, TW - 14, 38); g.clip(); g.fillText(ticker, 18 - off, TH - 13); g.fillText(ticker, 18 - off + tw, TH - 13); g.restore();
    g.fillStyle = 'rgba(214,232,236,.45)'; g.font = `400 11px ${FONT}`; g.fillText('Example data', TW - 86, TH - 46);
    tex.needsUpdate = true;
  };
  draw(0);
  return { tex, draw };
}

/**
 * list: [{ id, x, z, ry, y = 2.6, w = 5.6, wall = false }] world positions; the picture faces (sin ry, cos ry).
 * wall: mounted flat on a facade (no posts); otherwise a free-standing pylon on two posts.
 */
export function createBoards(world, list) {
  const { mats, camera } = world;
  const group = new THREE.Group(); group.name = 'led-boards';
  const b = new Builder(), screens = [];
  for (const s of list) {
    const w = s.w || 5.6, h = w * (TH / TW), y = s.y ?? 2.6, bez = 0.16, depth = s.wall ? 0.22 : 0.42;
    b.push(s.x, 0, s.z, s.ry);
    if (!s.wall) {
      for (const sx of [-w * 0.32, w * 0.32]) { b.use('satin').box(0x3a4650, 0.32, y + 0.2, 0.32, sx, 0, -0.05); b.box(0x2a333b, 0.6, 0.2, 0.6, sx, 0, -0.05); }
      b.use('satin').box(0x2a333b, w + bez * 2 + 0.1, 0.14, depth + 0.16, 0, y + h + bez * 2, -0.05);          // a thin cap against the sun
    }
    b.use('satin').box(0x161c21, w + bez * 2, h + bez * 2, depth, 0, y, -depth / 2 + 0.02);                      // the cabinet and bezel
    b.use('matte').box(0x2a333b, w * 0.5, 0.06, 0.02, 0, y + 0.05, 0.03);
    b.pop();
    const sc = makeScreen(s.id), m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: sc.tex, toneMapped: false }));
    m.position.set(s.x + Math.sin(s.ry) * 0.035, y + bez + h / 2, s.z + Math.cos(s.ry) * 0.035); m.rotation.y = s.ry; m.name = `board-${s.id}`;
    group.add(m); screens.push({ ...sc, mesh: m, id: s.id, x: s.x, z: s.z, t: Math.random() * 3 });
  }
  group.add(b.build(mats, { cast: true }));
  let k = 0, acc = 0;
  const update = (dt, t) => {
    acc += dt; if (acc < 1 / 36) return; acc = 0;                       // one screen per tick, about 3 to 4 refreshes a second each
    for (let n = 0; n < screens.length; n++) {
      const s = screens[(k + n) % screens.length]; const dx = camera.position.x - s.x, dz = camera.position.z - s.z;
      if (dx * dx + dz * dz > 520 * 520 || !s.mesh.visible) continue;
      s.draw(t + s.t); k = (k + n + 1) % screens.length; return;
    }
  };
  return { group, update, screens };
}

