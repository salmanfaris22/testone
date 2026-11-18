// Eight widescreen exhibits share one animated texture and one draw call.
// Existing licensed fish cut-outs swim through a gently lit underwater scene.
import * as THREE from 'three';
import { FISH_CUT } from '../data/photos.js';

const PROGRAMMES = [
  ['Hamour', 'الهامور', 'Orange-spotted grouper', 'hamour'],
  ['Shaari', 'الشعري', 'Spangled emperor', 'shaari'],
  ['Red snappers', 'الحمرا', 'Hamra and Shiqra', 'hamra'],
  ['Seabream', 'السبيطي', 'Silver seabream', 'seabream'],
  ['From egg to sea', 'من البيضة إلى البحر', 'A life in Gulf waters', 'hamour'],
  ['Live feed', 'الغذاء الحي', 'Where marine life begins', 'mullet'],
  ['Clean water', 'مياه نظيفة', 'Water that sustains life', 'cobia'],
  ['Restocking the Gulf', 'إثراء مخزون الخليج', 'Native species, local waters', 'shiqra'],
];
const FONT = '"IBM Plex Sans", Arial, sans-serif';
const AR = '"Geeza Pro", "Noto Sans Arabic", Tahoma, sans-serif';
const TAU = Math.PI * 2;

function backdrop(w, h, k) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  const sea = g.createLinearGradient(0, 0, w * 0.4, h);
  sea.addColorStop(0, k % 2 ? '#267f92' : '#1e859c'); sea.addColorStop(0.45, '#0c526d'); sea.addColorStop(1, '#041d34');
  g.fillStyle = sea; g.fillRect(0, 0, w, h);
  // Seabed and distant rocks remain behind the moving school.
  for (let j = 0; j < 3; j++) {
    g.fillStyle = ['#124456', '#0a3545', '#082c3c'][j]; g.beginPath(); g.moveTo(0, h);
    for (let i = 0; i <= 24; i++) g.lineTo(w * i / 24, h * (0.75 + j * 0.055) + Math.sin(i * 0.7 + k + j) * h * 0.035);
    g.lineTo(w, h); g.fill();
  }
  for (let j = 0; j < 12; j++) {
    const x = ((j * 73 + k * 31) % 512) / 512 * w, y = h * (0.9 + Math.sin(j * 3) * 0.025);
    g.fillStyle = j % 2 ? '#315459' : '#244751'; g.beginPath(); g.ellipse(x, y, w * (0.015 + (j % 3) * 0.009), h * 0.026, -0.3, 0, TAU); g.fill();
    if (j % 3) continue;
    g.strokeStyle = '#30686a'; g.lineWidth = w * 0.004; g.lineCap = 'round';
    for (let s = -1; s <= 1; s++) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + s * w * 0.025, y - h * 0.09, x + s * w * 0.018, y - h * 0.18); g.stroke(); }
  }
  return canvas;
}

function fish(g, img, x, y, width, time, flip = false, opacity = 1) {
  if (!img) return;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, height = width * ih / iw;
  g.save(); g.translate(x, y); g.scale(flip ? -1 : 1, 1); g.globalAlpha = opacity;
  if (opacity < 1) {
    // Distant translucent fish use one image so overlapping strips cannot form seams.
    g.rotate(Math.sin(time * 1.2) * 0.025); g.drawImage(img, -width / 2, -height / 2, width, height); g.restore(); return;
  }
  // Keep the head steady, with a small travelling wave along the body and tail.
  const strips = 20, slice = iw / strips;
  for (let j = 0; j < strips; j++) {
    const u = j / strips, sway = Math.sin(time * 3.6 - u * 6) * u * u * width * 0.018;
    g.drawImage(img, slice * j, 0, slice, ih, -width / 2 + width * u, -height / 2 + sway, width / strips + 0.5, height);
  }
  g.restore();
}

export function createExhibitTVs(list, engine) {
  const w = engine.coarse ? 384 : 512, h = w * 9 / 16, cols = 4, rows = 2;
  const canvas = document.createElement('canvas'); canvas.width = w * cols; canvas.height = h * rows;
  const g = canvas.getContext('2d', { alpha: false });
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.anisotropy = 4;
  const backgrounds = PROGRAMMES.map((_, k) => backdrop(w, h, k)), images = {};
  let dirty = true, last = -Infinity;

  const draw = (time) => {
    PROGRAMMES.forEach(([title, arabic, sub, id], k) => {
      const t = time + k * 2.3, sx = (k % cols) * w, sy = Math.floor(k / cols) * h;
      g.save(); g.translate(sx, sy); g.beginPath(); g.rect(0, 0, w, h); g.clip();
      g.drawImage(backgrounds[k], 0, 0);
      // Soft shafts and drifting particles make the display read as moving water.
      g.globalCompositeOperation = 'screen';
      for (let j = 0; j < 4; j++) {
        const x = w * (0.12 + j * 0.27 + Math.sin(t * 0.16 + j) * 0.03);
        const beam = g.createLinearGradient(x, 0, x + w * 0.2, h * 0.9);
        beam.addColorStop(0, 'rgba(128,236,239,.15)'); beam.addColorStop(1, 'rgba(128,236,239,0)');
        g.fillStyle = beam; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w * 0.045, 0); g.lineTo(x + w * 0.3, h); g.lineTo(x + w * 0.16, h); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      for (let j = 0; j < 22; j++) {
        const x = ((j * 71.3 + t * (2 + j % 3)) % 512) / 512 * w;
        const y = ((j * 37.7 - t * (2 + j % 4)) % 288 + 288) % 288 / 288 * h;
        g.fillStyle = `rgba(198,241,242,${0.12 + (j % 3) * 0.06})`; g.beginPath(); g.arc(x, y, w * (0.001 + (j % 3) * 0.0008), 0, TAU); g.fill();
      }
      const img = images[id];
      const count = k === 7 ? 6 : 3;
      for (let j = 0; j < count; j++) {
        const x = w * (1.2 - ((t * 0.022 + j * 0.37) % 1.5));
        fish(g, img, x, h * (0.3 + (j % 3) * 0.15) + Math.sin(t * 0.6 + j) * h * 0.025, w * (0.14 + j % 2 * 0.06), t + j, false, 0.38 + j % 2 * 0.17);
      }
      const growth = k === 4 ? 0.78 + Math.sin(time * 0.18) * 0.2 : 1;
      fish(g, img, w * (0.5 + Math.sin(t * 0.22) * 0.09), h * (0.51 + Math.sin(t * 0.55) * 0.03), w * 0.58 * growth, t);
      const shade = g.createLinearGradient(0, h * 0.57, 0, h);
      shade.addColorStop(0, 'rgba(2,15,28,0)'); shade.addColorStop(1, 'rgba(2,15,28,.88)');
      g.fillStyle = shade; g.fillRect(0, h * 0.57, w, h * 0.43);
      const scale = w / 512; g.scale(scale, scale); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      g.fillStyle = '#b4e8e7'; g.font = `500 11px ${FONT}`; g.fillText('GULF AQUACULTURE  /  MARINE LIFE', 20, 25);
      g.textAlign = 'right'; g.fillText(`${String(k + 1).padStart(2, '0')} / 08`, 492, 25);
      g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `500 ${title.length > 16 ? 23 : 27}px ${FONT}`; g.fillText(title, 20, 239);
      g.fillStyle = '#aed1d8'; g.font = `400 12px ${FONT}`; g.fillText(sub, 20, 260);
      g.direction = 'rtl'; g.textAlign = 'right'; g.fillStyle = '#d0eeed'; g.font = `500 19px ${AR}`; g.fillText(arabic, 492, 260); g.direction = 'ltr';
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(20, 275, 472, 1.5);
      g.fillStyle = '#55d2cc'; g.fillRect(20, 275, 472 * ((time / 36 + k * 0.07) % 1), 1.5);
      g.restore();
    });
    tex.needsUpdate = true; dirty = false;
  };
  draw(0);
  // when a fish picture or the fonts arrive, draw the screens again straight away and send the picture to the graphics card now,
  // rather than leaving it for the first frame the screens are seen in (that frame would stall)
  // (the pictures arrive one after another: the redraw waits for a calm frame with the rest of the background work, so the
  // screens are redrawn and sent once for all of them that have come by then, not once a picture)
  let settling = false;
  const settle = () => {
    if (settling) return; settling = true;
    const run = () => { settling = false; draw(Math.max(0, last)); try { engine.renderer.initTexture(tex); } catch (e) { /* drawn on first use instead */ } };
    if (engine.later) engine.later(run, 'fish screens: photos'); else setTimeout(run, 220);
  };
  for (const id of new Set(PROGRAMMES.map(p => p[3]))) {
    // each photo is decoded and scaled down to the size the screens draw it at (the biggest fish is 0.58 of a screen wide) off the
    // main thread, so painting the screens never has to send a full-size photo to the graphics card in the middle of a frame
    const img = new Image(); img.src = FISH_CUT[id];
    img.decode().then(() => {
      const W = Math.min(img.naturalWidth, Math.round(w * 0.72)), H = Math.round((W * img.naturalHeight) / img.naturalWidth);
      return (window.createImageBitmap ? createImageBitmap(img, { resizeWidth: W, resizeHeight: H, resizeQuality: 'high' }) : Promise.reject()).catch(() => img);
    }).then((pic) => { images[id] = pic; settle(); }, () => {});
  }
  document.fonts.ready.then(settle);

  const pos = [], uv = [], indices = [];
  list.forEach((q, i) => {
    const tile = q.tile - 200, x = (tile % cols) * w, y = Math.floor(tile / cols) * h;
    const u0 = (x + 1) / canvas.width, u1 = (x + w - 1) / canvas.width, v1 = 1 - (y + 1) / canvas.height, v0 = 1 - (y + h - 1) / canvas.height;
    pos.push(...q.p); uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
    const a = i * 4; indices.push(a, a + 1, a + 2, a, a + 2, a + 3);
  });
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); mesh.name = 'fish-tv-screens';
  const center = new THREE.Vector3();
  return { mesh, update(dt, t) {
    if (engine.reduced && !dirty) return;
    if (!dirty && t - last < (engine.coarse ? 1 / 20 : 1 / 30)) return;
    center.copy(geometry.boundingSphere.center).applyMatrix4(mesh.matrixWorld);
    if (!dirty && engine.camera.position.distanceToSquared(center) > 180 * 180) return;
    last = t; draw(engine.reduced ? 0 : t);
  } };
}
