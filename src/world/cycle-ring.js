// The production cycle drawn round one sea cage, as the client's own film shows it: a thin ring on the water round the cage, white
// on one side and orange on the other, with the five phases on it as round badges (broodstock, hatchery, nursery, sea cage
// grow-out, distribution), each a line icon in white on deep blue. Every badge is a thing you can open: its card says what
// happens in that phase and goes to the building where it happens. It shows while area 12 is being looked at (world.cycleOn).
import * as THREE from 'three';
import { canvasTex, TAU } from './kit.js';
import { CYCLE } from '../data/site.js';
import { areaById } from '../data/areas.js';
import { P } from './rig.js';

const RING = 27, BADGE = 4.3, HALF = RING + BADGE + 1.2;       // metres: the ring's radius, a badge's, half the picture's width
/** the five badges round the ring, clockwise from the top of the area's own view; `icon` is drawn by ICONS */
export const PHASE_BADGES = [
  { id: 'broodstock', icon: 'fish', name: 'Broodstock', a: -90 },
  { id: 'larval', icon: 'eggs', name: 'Hatchery', a: -18 },
  { id: 'nursery', icon: 'tank', name: 'Nursery', a: 54 },
  { id: 'growout', icon: 'cage', name: 'Sea cage grow-out', a: 126 },
  { id: 'distribution', icon: 'box', name: 'Distribution', a: 198 },
];

/** line icons in a box from -1 to 1 (the caller scales and strokes) */
const ICONS = {
  fish(g) {
    g.beginPath(); g.ellipse(-0.08, 0, 0.6, 0.34, 0, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(0.5, 0); g.lineTo(0.92, -0.34); g.lineTo(0.86, 0); g.lineTo(0.92, 0.34); g.closePath(); g.stroke();
    g.beginPath(); g.arc(-0.42, -0.07, 0.055, 0, TAU); g.fill();
    g.beginPath(); g.arc(-0.2, 0, 0.26, -0.9, 0.9); g.stroke();
  },
  eggs(g) {
    for (const [row, y] of [[1, -0.52], [2, -0.18], [3, 0.16], [4, 0.5]]) for (let i = 0; i < row; i++) {
      const x = (i - (row - 1) / 2) * 0.36; g.beginPath(); g.arc(x, y, 0.15, 0, TAU); g.stroke(); g.beginPath(); g.arc(x - 0.05, y - 0.05, 0.035, 0, TAU); g.fill();
    }
  },
  tank(g) {
    g.beginPath(); g.roundRect(-0.74, -0.55, 1.48, 1.1, 0.12); g.stroke();
    g.beginPath(); g.moveTo(-0.74, -0.3); for (let i = 0; i <= 8; i++) g.lineTo(-0.74 + i * 0.185, -0.3 + (i % 2 ? -0.05 : 0.05)); g.stroke();
    g.beginPath(); g.ellipse(0.12, 0.12, 0.24, 0.12, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(0.34, 0.12); g.lineTo(0.5, 0.0); g.lineTo(0.5, 0.24); g.closePath(); g.stroke();
    for (const [x, y, r] of [[-0.42, -0.02, 0.06], [-0.48, 0.2, 0.045], [-0.38, 0.38, 0.035]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
    g.beginPath(); g.moveTo(-0.6, 0.55); g.quadraticCurveTo(-0.3, 0.38, 0, 0.5); g.quadraticCurveTo(0.3, 0.38, 0.6, 0.52); g.stroke();
  },
  cage(g) {
    g.beginPath(); g.ellipse(0, -0.34, 0.72, 0.22, 0, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(-0.72, -0.34); g.lineTo(-0.72, 0.3); g.ellipse(0, 0.3, 0.72, 0.22, 0, Math.PI, 0, true); g.lineTo(0.72, -0.34); g.stroke();
    for (const y of [-0.02, 0.22]) { g.beginPath(); for (let i = 0; i <= 12; i++) { const x = -0.6 + i * 0.1; if (i) g.lineTo(x, y + Math.sin(i * 1.4) * 0.05); else g.moveTo(x, y); } g.stroke(); }
  },
  box(g) {
    g.beginPath(); g.moveTo(-0.62, -0.05); g.lineTo(0.62, -0.05); g.lineTo(0.62, 0.62); g.lineTo(-0.62, 0.62); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(-0.62, -0.05); g.lineTo(-0.86, -0.3); g.moveTo(0.62, -0.05); g.lineTo(0.86, -0.3); g.stroke();
    g.beginPath(); g.ellipse(0, -0.24, 0.36, 0.16, -0.2, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(0.33, -0.3); g.lineTo(0.56, -0.46); g.lineTo(0.5, -0.16); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(-0.3, 0.3); g.lineTo(0.3, 0.3); g.stroke();
  },
};

function ringTex(px) {
  return canvasTex(px, px, (g, w) => {
    const k = w / (2 * HALF), c = w / 2, at = (m) => m * k, rad = (d) => (d * Math.PI) / 180;
    g.clearRect(0, 0, w, w); g.lineCap = 'round'; g.lineJoin = 'round';
    // the ring: white from the top round the right, orange round the left, broken where the badges sit
    const gap = (BADGE + 1.0) / RING;
    for (let i = 0; i < PHASE_BADGES.length; i++) {
      const a0 = rad(PHASE_BADGES[i].a) + gap, a1 = rad(PHASE_BADGES[(i + 1) % PHASE_BADGES.length].a + (i === PHASE_BADGES.length - 1 ? 360 : 0)) - gap;
      g.strokeStyle = i >= 3 ? '#e98a3a' : 'rgba(255,255,255,.92)';
      g.lineWidth = at(0.26); g.beginPath(); g.arc(c, c, at(RING), a0, a1); g.stroke();
    }
    // a short stalk from each badge in to the cage's rim
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = at(0.18);
    for (const b of PHASE_BADGES) { const a = rad(b.a); g.beginPath(); g.moveTo(c + Math.cos(a) * at(RING - BADGE), c + Math.sin(a) * at(RING - BADGE)); g.lineTo(c + Math.cos(a) * at(20.6), c + Math.sin(a) * at(20.6)); g.stroke(); }
    // the badges: deep blue, a white rim, the icon in white line
    for (const b of PHASE_BADGES) {
      const a = rad(b.a), x = c + Math.cos(a) * at(RING), y = c + Math.sin(a) * at(RING);
      g.fillStyle = 'rgba(9,30,58,.94)'; g.beginPath(); g.arc(x, y, at(BADGE), 0, TAU); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = at(0.3); g.beginPath(); g.arc(x, y, at(BADGE - 0.15), 0, TAU); g.stroke();
      g.save(); g.translate(x, y); const s = at(BADGE * 0.58); g.scale(s, s); g.lineWidth = 0.075; g.strokeStyle = '#fff'; g.fillStyle = '#fff'; ICONS[b.icon](g); g.restore();
    }
  }, { repeat: false });
}

const FLY = 9, BOB = 0.45, SWAY = 0.022;      // metres the ring hovers over the water, how far it bobs; its sway (radians)
const backOut = (t) => { const s = 1.4; t -= 1; return t * t * ((s + 1) * t + s) + 1; };

/** the ring round cage `c` (its centre x, z) on water level `Y`, turned so its top faces up the screen from `az`; items into ctx.
 *  It flies (Jeffry, 20 Nov): as area 12 opens it lifts off the water and hovers FLY m over the cage, bobbing and swaying
 *  slowly, its shadow on the water below */
export function buildCycleRing(world, c, Y, az, ctx) {
  const tex = ringTex(world.engine && world.engine.tier === 'low' ? 1024 : 2048);
  const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
  const disc = new THREE.Mesh(geo, mat); disc.rotation.y = az; disc.renderOrder = 5;
  const fly = new THREE.Group(); fly.add(disc); fly.position.set(c.x, Y + 0.25, c.z); fly.name = 'cycle-ring'; fly.visible = false;
  // the shadow: the same picture in black on the water, thrown away from the sun by the height it flies at
  const smat = new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
  const shadow = new THREE.Mesh(geo, smat); shadow.rotation.y = az; shadow.renderOrder = 4; shadow.scale.setScalar(1.03); shadow.visible = false;
  const sd = (world.env && world.env.sunDir) || new THREE.Vector3(0.42, 0.74, 0.52).normalize(), sx = -sd.x / Math.max(0.2, sd.y), sz = -sd.z / Math.max(0.2, sd.y);
  ctx.extra.push(fly, shadow);
  // where each badge is in the world (the picture's top, canvas y = 0, faces -z before the turn)
  const ca = Math.cos(az), sa = Math.sin(az), place = (deg) => { const a = (deg * Math.PI) / 180, lx = Math.cos(a) * RING, lz = Math.sin(a) * RING; return [c.x + lx * ca + lz * sa, c.z - lx * sa + lz * ca]; };
  PHASE_BADGES.forEach((b, i) => {
    const ph = CYCLE.find((p) => p.id === b.id) || {}, [x, z] = place(b.a);
    ctx.item({ code: `PH-${i + 1}`, group: 'From egg to sea', name: b.name, kind: `Phase ${i + 1} of 5 · ${ph.time || ''}`.replace(/ · $/, ''), box: [x - BADGE, Y + FLY - 1, z - BADGE, x + BADGE, Y + FLY + 1.2, z + BADGE], prio: 3 - i * 0.1,
      desc: ph.text || '', link: ph.area, look: P(c.x, Y, c.z, az, 0.62, 128), specs: [[`${i + 1} of 5`, 'Phase'], [ph.time || '', 'When'], [ph.area && areaById[ph.area] ? `${areaById[ph.area].n}` : '', ph.area && areaById[ph.area] ? areaById[ph.area].short : '']].filter((r) => r[0]) });
  });
  // in: it fades in on the water and rises over 1.6 s with a little overshoot; out: it sinks back as it fades
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let k = 0, up = 0;
  world.updaters.push((dt, t = 0) => {
    const want = world.cycleOn ? 1 : 0;
    if (k !== want) k = want > k ? Math.min(1, k + dt * 2.5) : Math.max(0, k - dt * 3);
    up = want ? Math.min(1, up + dt / 1.6) : Math.max(0, up - dt * 2);
    const on = k > 0.01; fly.visible = shadow.visible = on; if (!on) return;
    const lift = FLY * (want ? backOut(up) : up * up), hover = still ? 0 : Math.min(1, up * 1.5);
    const y = lift + hover * BOB * Math.sin(t * 1.3);
    fly.position.y = Y + 0.25 + y;
    fly.rotation.x = hover * SWAY * Math.sin(t * 0.9 + 1.1); fly.rotation.z = hover * SWAY * Math.sin(t * 0.7);
    mat.opacity = k;
    const night = world.env ? world.env.night || 0 : 0;
    smat.opacity = k * 0.2 * (1 - 0.7 * night) * clampShadow(y);
    shadow.position.set(c.x + sx * y, Y + 0.2, c.z + sz * y);
  });
  return fly;
}
/** the shadow is crisp and darker just over the water, softer and paler as the ring climbs */
const clampShadow = (y) => 1 - 0.35 * Math.min(1, Math.max(0, y / FLY));
