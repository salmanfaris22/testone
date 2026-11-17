// The drone's dock: a white weatherproof station on its own marked pad by the visitor centre's drop-off, the way drone docks
// stand at research sites that watch their sea cages from the air. Its lid opens in two halves that swing out like wings, the
// drone stands inside on a lift pad with an H on it, a short mast carries a cup anemometer that spins in the wind, a wind vane,
// a GPS puck and a beacon, and a light strip on the front shows green when it is ready and amber while it works.
// The drone takes off from it and comes home to it (rig.js flies it, app.js runs it). Local frame: +x along the dock, y up.
import * as THREE from 'three';
import { Builder, canvasTex, clamp, easeIO } from './kit.js';

const W = 2.5, D = 2.2, H = 1.15, SLAB = 0.14, PAD = 0.58;     // cabinet; the slab under it; the lift pad's height inside
const LID = 0.09, OPEN = 2.55;                                    // lid thickness; how far a half swings (radians)
const WHITE = 0xf1f2ef, GREY = 0xd4d8da, DARK = 0x262b30, STEEL = 0xa9b1b6;

function slabTex() {
  return canvasTex(512, 512, (g, w) => {
    g.clearRect(0, 0, w, w);
    // a landing circle with ticks, and hazard stripes along two edges
    g.strokeStyle = 'rgba(244,190,40,.95)'; g.lineWidth = 14; g.beginPath(); g.arc(w / 2, w / 2, w * 0.42, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 8; for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r0 = w * 0.36, r1 = w * 0.39; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * r0, w / 2 + Math.sin(a) * r0); g.lineTo(w / 2 + Math.cos(a) * r1, w / 2 + Math.sin(a) * r1); g.stroke(); }
    for (const y of [0, w - 26]) for (let x = -40; x < w + 40; x += 40) { g.fillStyle = 'rgba(244,190,40,.95)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20, y); g.lineTo(x + 46, y + 26); g.lineTo(x + 26, y + 26); g.fill(); g.fillStyle = 'rgba(30,32,34,.9)'; g.beginPath(); g.moveTo(x + 20, y); g.lineTo(x + 40, y); g.lineTo(x + 66, y + 26); g.lineTo(x + 46, y + 26); g.fill(); }
  }, { repeat: false });
}
function padTex() {
  return canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#2b3136'; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#e8862e'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, w - 28);
    g.fillStyle = '#f4f4f2'; g.font = '700 150px "IBM Plex Sans Condensed", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', w / 2, w / 2 + 8);
    g.fillStyle = 'rgba(255,255,255,.5)'; for (const [x, y] of [[34, 34], [w - 34, 34], [34, w - 34], [w - 34, w - 34]]) { g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); }
  }, { repeat: false });
}

export function makeDock(world, { x, z, ry = 0 }) {
  const { mats, scene } = world;
  const group = new THREE.Group(); group.name = 'drone-dock'; group.position.set(x, 0, z); group.rotation.y = ry;
  const b = new Builder(), top = SLAB + H;
  // the slab with its markings
  b.use('concrete').box(0xcdc9bf, 6.4, SLAB, 6.4, 0, 0, 0);
  b.use('satin').box(0x9aa1a5, 6.5, 0.04, 0.12, 0, 0, -3.2); b.box(0x9aa1a5, 6.5, 0.04, 0.12, 0, 0, 3.2);
  // the cabinet: four walls, a plinth, vents, the inside and the lift pad
  b.use('satin');
  b.box(GREY, W + 0.1, 0.12, D + 0.1, 0, SLAB, 0);                                                   // plinth
  b.box(WHITE, W, H - 0.12, 0.08, 0, SLAB + 0.12, -D / 2 + 0.04); b.box(WHITE, W, H - 0.12, 0.08, 0, SLAB + 0.12, D / 2 - 0.04);
  b.box(WHITE, 0.08, H - 0.12, D - 0.16, -W / 2 + 0.04, SLAB + 0.12, 0); b.box(WHITE, 0.08, H - 0.12, D - 0.16, W / 2 - 0.04, SLAB + 0.12, 0);
  b.box(GREY, W + 0.02, 0.05, D + 0.02, 0, top - 0.05, 0).box(GREY, W - 0.14, 0.05, D - 0.14, 0, top - 0.05, 0);     // the rim the lid closes on
  for (let i = 0; i < 6; i++) b.box(0xb9bfc3, 0.5, 0.025, 0.02, -0.6 + (i % 2) * 1.2 - 0.0, SLAB + 0.36 + Math.floor(i / 2) * 0.08, D / 2 + 0.005);   // vents on the front
  b.use('matte').box(DARK, W - 0.18, PAD - 0.12, D - 0.18, 0, SLAB + 0.12, 0);                          // the well under the lift pad
  b.use('satin').box(0x3a4147, W - 0.18, 0.04, D - 0.18, 0, SLAB + PAD - 0.04, 0);
  // the mast: weather station, GPS, beacon
  const mx = -W / 2 - 0.45, mz = -D / 2 + 0.15;
  b.use('metal').cyl(STEEL, 0.045, 2.75, mx, SLAB, mz, 10); b.box(STEEL, 0.5, 0.04, 0.06, mx + 0.1, SLAB + 2.38, mz);
  b.use('satin').cyl(0xf4f4f2, 0.075, 0.06, mx, SLAB + 2.75, mz, 16); b.use('glow').ball(0xff9d3a, 0.045, mx + 0.32, SLAB + 2.44, mz, 10, 8);
  b.use('satin').box(DARK, 0.16, 0.1, 0.12, 0, SLAB + 0.55, D / 2 + 0.02);                            // the status panel
  const hull = b.build(mats, { cast: true, receive: true }); group.add(hull);
  const marks = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 6.2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: slabTex(), transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
  marks.position.y = SLAB + 0.006; marks.renderOrder = 1; group.add(marks);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.32, D - 0.32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: padTex(), roughness: 0.7 }));
  pad.position.y = SLAB + PAD + 0.003; pad.receiveShadow = true; group.add(pad);
  // the status strip (its own colour: green ready, amber busy)
  const strip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, 0.035, 0.02), new THREE.MeshBasicMaterial({ color: 0x44e08a, toneMapped: false }));
  strip.position.set(0, SLAB + 0.92, D / 2 + 0.012); group.add(strip);
  // the two halves of the lid, each hinged along an outer edge
  const lids = [-1, 1].map((s) => {
    const lb = new Builder(); lb.use('satin');
    lb.box(WHITE, W / 2, LID, D, (-s * W) / 4, 0, 0).box(GREY, W / 2 - 0.12, 0.02, D - 0.16, (-s * W) / 4, LID, 0);
    lb.box(0xe2e4e3, 0.04, 0.03, D - 0.3, -s * 0.06, LID, 0);                                          // the seal along the meeting edge
    const pivot = new THREE.Group(); pivot.position.set((s * W) / 2, top, 0); pivot.add(lb.build(mats, { cast: true, receive: true })); group.add(pivot);
    return { pivot, s };
  });
  // the anemometer: three cups on arms, turning
  const cups = new THREE.Group(); cups.position.set(mx, SLAB + 2.58, mz);
  { const cb = new Builder(); cb.use('satin'); cb.cyl(STEEL, 0.012, 0.1, 0, -0.05, 0, 6);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2, cx = Math.cos(a) * 0.15, cz = Math.sin(a) * 0.15; cb.rod(STEEL, 0.008, [0, 0.02, 0], [cx, 0.02, cz], 5); cb.ball(0xf4f4f2, 0.035, cx, 0.02, cz, 8, 6); }
    cups.add(cb.build(mats, { cast: false, receive: false })); }
  group.add(cups);
  scene.add(group); group.updateMatrixWorld(true);

  let open = 0, spin = 0, busy = false;
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const api = {
    group,
    /** where the drone stands in the dock (world), its heading there, and the height of the pad under it */
    rest: new THREE.Vector3(x, SLAB + PAD, z), yaw: ry + Math.PI / 2, padY: SLAB + PAD, top,
    get open() { return open; },
    /** 0 closed .. 1 open */
    setOpen(k) {
      open = clamp(k, 0, 1); const e = easeIO(open);
      for (const l of lids) l.pivot.rotation.z = -l.s * OPEN * e;
      engine().shadowDirty = true;
    },
    setBusy(v) { if (busy === v) return; busy = v; strip.material.color.setHex(v ? 0xffa53a : 0x44e08a); },
    update(dt) { spin += dt * (2.2 + Math.sin(performance.now() * 0.00031) * 0.7); cups.rotation.y = spin; },
    /** a point out from the dock, `d` metres along its front (+z) and `side` to its side, at height y (world) */
    around(d, side, y) { return new THREE.Vector3(x + side * cs + d * sn, y, z - side * sn + d * cs); },
  };
  const engine = () => world.engine;
  world.updaters.push((dt) => { if (group.visible) api.update(dt); });
  return api;
}
