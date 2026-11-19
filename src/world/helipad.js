// The helipad, where the client's map shows it (their Google Maps screenshot, Nov 2026): out past the west roundabout on the
// open sand south of the salt lagoon, beside the west road, with a short paved way in from the road. Laid out the way a
// surface-level heliport is: a concrete FATO (the final approach and take-off area) with white marks round its edge, the
// TLOF (where the skids touch down) edged in white with green lights, a yellow touchdown circle, a white H along the approach,
// the mass limit, a ring of pavers round it, a windsock on its mast, and flood and edge lights that come on at night.
// It is part of the hardscape, so the opening film paves it with the rest of the ground.
import * as THREE from 'three';
import { canvasTex, rng, TAU } from './kit.js';
import { glowPointsMat, radialTex } from './props.js';
import { HELI } from './layout.js';
import { makeHelicopter } from './helicopter.js';

const PAD_Y = 0.1, RING_Y = 0.075;

/** the markings, drawn over the FATO disc (1024 px across its diameter, the H's uprights along local x) */
function padTex(R, D) {
  return canvasTex(1024, 1024, (g, w) => {
    const k = w / (2 * R), c = w / 2, at = (m) => m * k, rnd = rng(17);
    // concrete in square slabs, a little weathered, darker where the skids land
    g.fillStyle = '#d3d0c8'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 2600; i++) { const x = rnd() * w, y = rnd() * w, s = 1 + rnd() * 3; g.fillStyle = rnd() < 0.5 ? 'rgba(120,115,105,.07)' : 'rgba(255,255,255,.08)'; g.fillRect(x, y, s, s); }
    g.strokeStyle = 'rgba(110,106,98,.42)'; g.lineWidth = 2;
    for (let m = -R; m <= R; m += 5) { g.beginPath(); g.moveTo(c + at(m), 0); g.lineTo(c + at(m), w); g.moveTo(0, c + at(m)); g.lineTo(w, c + at(m)); g.stroke(); }
    // the TLOF: a slightly darker, rougher surface with its white edge line
    const tl = D / 2 + 0.6;
    g.fillStyle = '#b4b8b4'; g.beginPath(); g.arc(c, c, at(tl), 0, TAU); g.fill();
    const sm = g.createRadialGradient(c, c, 0, c, c, at(tl)); sm.addColorStop(0, 'rgba(70,72,72,.16)'); sm.addColorStop(0.55, 'rgba(70,72,72,.08)'); sm.addColorStop(1, 'rgba(70,72,72,0)');
    g.fillStyle = sm; g.beginPath(); g.arc(c, c, at(tl), 0, TAU); g.fill();
    g.strokeStyle = '#f6f6f2'; g.lineWidth = at(0.3); g.beginPath(); g.arc(c, c, at(tl - 0.15), 0, TAU); g.stroke();
    // the touchdown and positioning circle (yellow, inner diameter half the D-value)
    g.strokeStyle = '#f1c21b'; g.lineWidth = at(0.5); g.beginPath(); g.arc(c, c, at(D / 4 + 0.25), 0, TAU); g.stroke();
    // the H: 4 m tall, 3 m wide, strokes 0.75 m; its uprights run along the approach (local x)
    g.fillStyle = '#f8f8f4';
    g.fillRect(c - at(2), c - at(1.5), at(4), at(0.75)); g.fillRect(c - at(2), c + at(0.75), at(4), at(0.75)); g.fillRect(c - at(0.375), c - at(1.5), at(0.75), at(3));
    // the mass limit (tonnes) and the D-value, read from the approach side
    g.save(); g.translate(c + at(6.4), c); g.rotate(-Math.PI / 2); g.font = `700 ${at(1.25)}px "IBM Plex Sans Condensed", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('8t', 0, 0); g.restore();
    g.save(); g.translate(c - at(R - 2.2), c); g.rotate(-Math.PI / 2); g.font = `700 ${at(0.95)}px "IBM Plex Sans Condensed", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`D ${D}`, 0, 0); g.restore();
    // the FATO's edge: white dashes inside the kerb
    g.fillStyle = '#f6f6f2';
    const n = Math.round((TAU * (R - 0.6)) / 3.6);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; g.save(); g.translate(c + Math.cos(a) * at(R - 0.6), c + Math.sin(a) * at(R - 0.6)); g.rotate(a + Math.PI / 2); g.fillRect(-at(0.75), -at(0.2), at(1.5), at(0.4)); g.restore(); }
  }, { repeat: false });
}
/** salmon pavers laid in a basket weave, with sandy joints */
function paverTex() {
  return canvasTex(256, 256, (g, w) => {
    const rnd = rng(23), q = w / 8;
    g.fillStyle = '#a98a7c'; g.fillRect(0, 0, w, w);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const tone = ['#c98f78', '#c08671', '#cf9a82', '#ba7e69'][Math.floor(rnd() * 4)], x = i * q, y = j * q;
      g.fillStyle = tone;
      if ((i + j) % 2) { g.fillRect(x + 1.5, y + 1.5, q - 3, q / 2 - 2.5); g.fillRect(x + 1.5, y + q / 2 + 1, q - 3, q / 2 - 2.5); }
      else { g.fillRect(x + 1.5, y + 1.5, q / 2 - 2.5, q - 3); g.fillRect(x + q / 2 + 1, y + 1.5, q / 2 - 2.5, q - 3); }
    }
    for (let i = 0; i < 900; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(90,60,50,.06)' : 'rgba(255,240,230,.07)'; g.fillRect(rnd() * w, rnd() * w, 2, 2); }
  });
}
function signTex() {
  return canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = '#1d5fae'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4f6f8'; g.lineWidth = 5; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#f4f6f8'; g.font = '700 74px "IBM Plex Sans Condensed", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', w / 2, 62);
    g.font = '600 19px "IBM Plex Sans Condensed", Arial, sans-serif'; g.fillText('HELIPAD', w / 2, 122);
  }, { repeat: false });
}

export function buildHelipad(world) {
  const { env, mats } = world;
  const { x, z, r, fato, D, ry, sock, path } = HELI;
  const g = new THREE.Group(); g.name = 'helipad'; g.position.set(x, 0, z);
  const add = (m, cast = false) => { m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; };
  const flat = (geo, y) => { geo.rotateX(-Math.PI / 2); geo.translate(0, y, 0); return geo; };

  // the pad itself, its kerb, and the paver ring round it
  const padMat = new THREE.MeshStandardMaterial({ map: padTex(fato, D), roughness: 0.86, metalness: 0 });
  const pad = add(new THREE.Mesh(flat(new THREE.CircleGeometry(fato, 128), PAD_Y), padMat)); pad.rotation.y = ry;
  const kerbMat = new THREE.MeshStandardMaterial({ color: 0xe4e1da, roughness: 0.8 });
  add(new THREE.Mesh(flat(new THREE.RingGeometry(fato, fato + 0.25, 128), PAD_Y + 0.01), kerbMat));
  add(new THREE.Mesh(new THREE.CylinderGeometry(fato + 0.25, fato + 0.25, PAD_Y + 0.01, 128, 1, true).translate(0, (PAD_Y + 0.01) / 2, 0), kerbMat));
  const pav = paverTex(); pav.repeat.set(r / 2.2, r / 2.2);
  const pavMat = new THREE.MeshStandardMaterial({ map: pav, roughness: 0.92, metalness: 0 });
  add(new THREE.Mesh(flat(new THREE.RingGeometry(fato + 0.2, r - 0.3, 128, 2), RING_Y), pavMat));
  add(new THREE.Mesh(flat(new THREE.RingGeometry(r - 0.32, r, 128), RING_Y + 0.008), kerbMat));
  add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, RING_Y + 0.008, 128, 1, true).translate(0, (RING_Y + 0.008) / 2, 0), kerbMat));
  // the paved way in from the west road's footway, kerbed both sides
  { const x0 = path.x0 - x, x1 = path.x1 - x, zc = path.z - z, len = x1 - x0, pv = paverTex(); pv.repeat.set(len / 2.2, path.w / 2.2);
    const way = add(new THREE.Mesh(flat(new THREE.PlaneGeometry(len, path.w), RING_Y - 0.004), new THREE.MeshStandardMaterial({ map: pv, roughness: 0.92 }))); way.position.set((x0 + x1) / 2, 0, zc);
    for (const s of [-1, 1]) { const k = add(new THREE.Mesh(new THREE.BoxGeometry(len - 0.4, 0.1, 0.22), kerbMat)); k.position.set((x0 + x1) / 2 + 0.2, 0.05, zc + s * (path.w / 2 + 0.11)); } }

  // edge lights: green round the TLOF, white round the FATO (flush fittings by day, glowing at night)
  const green = new THREE.MeshStandardMaterial({ color: 0x1f7a3c, emissive: 0x39ff7a, emissiveIntensity: 0.35, roughness: 0.3 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe9eef0, emissive: 0xf4fbff, emissiveIntensity: 0.2, roughness: 0.3 });
  const tl = D / 2 + 0.6, gp = [], wp = [];
  const lightAt = (rr, n, mat, geo, out, off = 0) => { for (let i = 0; i < n; i++) { const a = (i / n) * TAU + off, px = Math.cos(a) * rr, pz = Math.sin(a) * rr; const m = add(new THREE.Mesh(geo, mat)); m.position.set(px, PAD_Y, pz); out.push(x + px, 0.32, z + pz); } };
  lightAt(tl + 0.35, 16, green, new THREE.CylinderGeometry(0.1, 0.12, 0.06, 12), gp);
  lightAt(fato - 0.2, 12, white, new THREE.SphereGeometry(0.13, 12, 6, 0, TAU, 0, Math.PI / 2), wp, Math.PI / 12);
  const halo = (pts, size, hex) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const p = new THREE.Points(geo, glowPointsMat(env, size, hex)); p.frustumCulled = false; p.renderOrder = 6; return p; };
  const halos = [halo(gp, 3.2, 0x5dff93), halo(wp, 3.6, 0xf2f8ff)];
  // two low floodlights at the paver ring's edge, and the light they lay on the pad at night
  const post = new THREE.MeshStandardMaterial({ color: 0x8e979c, roughness: 0.45, metalness: 0.6 }), lamp = new THREE.MeshStandardMaterial({ color: 0x30363a, emissive: 0xf4fbff, emissiveIntensity: 0, roughness: 0.4 });
  for (const a of [ry + 0.9, ry + 0.9 + Math.PI]) {
    const px = Math.cos(a) * (r - 1.1), pz = Math.sin(a) * (r - 1.1);
    const p = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.3, 10), post), true); p.position.set(px, 0.65, pz);
    const h = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.36), lamp), true); h.position.set(px * 0.985, 1.36, pz * 0.985); h.rotation.set(0, -a, -0.35);
  }
  const pool = new THREE.Mesh(flat(new THREE.PlaneGeometry(2 * fato + 6, 2 * fato + 6), PAD_Y + 0.03), new THREE.MeshBasicMaterial({ map: radialTex(), color: 0xeef5ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  pool.renderOrder = 4; pool.visible = false; g.add(pool);

  // the sign at the mouth of the way in
  { const sx = path.x1 - x - 1.4, sz = path.z - z - path.w / 2 - 1.1;
    const p = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 8), post), true); p.position.set(sx, 1.05, sz);
    const s = add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.05), post), true); s.position.set(sx, 1.95, sz);
    const face = new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.5 });
    for (const k of [-1, 1]) { const f = add(new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.7), face)); f.position.set(sx, 1.95, sz + k * 0.027); f.rotation.y = k > 0 ? 0 : Math.PI; } }

  // the windsock: a white mast with a red top, the sock in orange and white bands on a swivel, a red light on top
  const wx = Math.cos(sock.a) * sock.r, wz = Math.sin(sock.a) * sock.r, H = 6;
  const mastW = new THREE.MeshStandardMaterial({ color: 0xf0f1ee, roughness: 0.5 }), red = new THREE.MeshStandardMaterial({ color: 0xd8322b, roughness: 0.5 });
  const base = add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.25, 16), kerbMat)); base.position.set(wx, 0.12, wz);
  const mast = add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, H, 12), mastW), true); mast.position.set(wx, H / 2, wz);
  const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 12), red), true); cap.position.set(wx, H - 0.3, wz);
  const beacon = add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3a2a, toneMapped: false }))); beacon.position.set(wx, H + 0.08, wz);
  const swivel = new THREE.Group(); swivel.position.set(wx, H - 0.45, wz); g.add(swivel);
  const ringM = add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 6, 24).rotateY(Math.PI / 2), post), true); swivel.add(ringM); ringM.position.set(0.2, 0, 0);
  const arm = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 6).rotateZ(Math.PI / 2), post)); swivel.add(arm); arm.position.set(0.1, 0, 0);
  const orange = new THREE.MeshStandardMaterial({ color: 0xff5a1a, roughness: 0.75, side: THREE.DoubleSide }), cloth = new THREE.MeshStandardMaterial({ color: 0xf3f2ee, roughness: 0.75, side: THREE.DoubleSide });
  const segs = []; let parent = swivel, at = 0.2;
  for (let i = 0; i < 5; i++) {
    const r0 = 0.42 - i * 0.055, r1 = 0.42 - (i + 1) * 0.055, L = 0.72;
    const j = new THREE.Group(); j.position.set(at, 0, 0); parent.add(j);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, 18, 1, true).rotateZ(Math.PI / 2).translate(L / 2, 0, 0), i % 2 ? cloth : orange);
    m.castShadow = true; j.add(m); segs.push(j); parent = j; at = L;
  }
  // a small lamp lights the sock at night
  const sockLamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), lamp); sockLamp.position.set(wx, H + 0.25, wz); g.add(sockLamp);

  env.onNight((v) => {
    green.emissiveIntensity = 0.35 + 2.6 * v; white.emissiveIntensity = 0.2 + 2.2 * v; lamp.emissiveIntensity = 2.4 * v;
    pool.visible = v > 0.02; pool.material.opacity = v * 0.34;
  });
  // the wind: mostly steady, now and then gusting; the sock swings round a little and its bands ripple
  const yaw0 = -sock.wind;
  world.updaters.push((dt, t) => {
    const gust = 0.5 + 0.5 * Math.sin(t * 0.23) * Math.sin(t * 0.61 + 1), droop = 0.55 - 0.42 * gust;
    swivel.rotation.y = yaw0 + 0.16 * Math.sin(t * 0.17) + 0.05 * Math.sin(t * 0.9);
    for (let i = 0; i < segs.length; i++) { const s = segs[i]; s.rotation.z = -(i ? droop * 0.22 : droop * 0.5) + 0.035 * Math.sin(t * 7.1 - i * 0.9) * (0.4 + gust); s.rotation.y = 0.05 * Math.sin(t * 5.3 - i * 1.1) * (0.4 + gust); }
    beacon.visible = (t * 0.8) % 1 < 0.55;
  });

  world.land.hardscape.add(g);
  for (const h of halos) world.scene.add(h);
  // the helicopter parked on the pad, its mast over the touchdown circle, turned a little off the H (its own group, so the opening
  // film does not pave it with the ground: it comes with the people and the traffic)
  const heli = makeHelicopter(mats, { tier: world.engine && world.engine.tier });
  const hr = HELI.craft ? HELI.craft.ry : 0;
  heli.position.set(x - Math.cos(hr) * 0.9, PAD_Y, z + Math.sin(hr) * 0.9); heli.rotation.y = hr;
  world.scene.add(heli);
  return g;
}

/** is (x, z) on the helipad or its way in (planting keeps off it) */
export function onHelipad(px, pz, pad = 2) {
  const { x, z, r, path } = HELI;
  if (Math.hypot(px - x, pz - z) < r + pad) return true;
  return px > path.x0 - pad && px < path.x1 + pad && Math.abs(pz - path.z) < path.w / 2 + pad;
}
