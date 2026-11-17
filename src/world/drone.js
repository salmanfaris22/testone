// The drone you fly in "Drone" mode: a graphite quadcopter that rides in the upper part of the picture, seen from just behind.
// It leans the way it is going, banks into turns, its rotors spin up with the throttle, its tail lights blink, and a soft
// shadow under it on the ground shows how high it is. The flying itself is in rig.js (_drone); this only draws it.
// Local frame: +z is the nose, +y up, +x the port (left) side. About 1.1 m across the motors.
import * as THREE from 'three';
import { Builder, clamp, canvasTex } from './kit.js';
import { SEA_Y, landSDF } from './terrain-fn.js';

const BODY = 0x262c32, ARM = 0x343b42, TRIM = 0xe8862e, ALU = 0xc7ced3, DARK = 0x14181b;
const SCALE = 1.55, R = 0.34;            // motors sit R out along x and z

export function makeDrone(world) {
  const { mats, scene } = world;
  const group = new THREE.Group(); group.name = 'drone'; group.visible = false;
  const b = new Builder();
  // fuselage: a slim shell, a raised battery cover with an orange stripe, a GPS puck, the tail
  b.use('satin');
  b.box(BODY, 0.2, 0.075, 0.44, 0, -0.035, 0); b.box(BODY, 0.16, 0.05, 0.3, 0, 0.04, -0.02);
  b.boxC(BODY, 0.17, 0.06, 0.1, 0, 0.012, 0.25, 0, 0.5, 0);                                   // the nose, raked
  b.boxC(BODY, 0.15, 0.05, 0.09, 0, 0.008, -0.25, 0, -0.42, 0);
  b.box(TRIM, 0.165, 0.008, 0.07, 0, 0.09, 0.07); b.box(0x3a424a, 0.11, 0.022, 0.16, 0, 0.09, -0.07);
  b.cyl(0xdfe4e7, 0.034, 0.016, 0, 0.112, -0.07, 14);
  // arms out to the four motors, each with its motor can, a cap and a leg
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const mx = sx * R, mz = sz * R;
    b.use('satin').rod(ARM, 0.021, [sx * 0.085, 0.012, sz * 0.13], [mx, 0.03, mz], 8);
    b.box(ARM, 0.05, 0.018, 0.05, mx, 0.012, mz);
    b.use('metal').cyl(ALU, 0.04, 0.05, mx, 0.03, mz, 16); b.use('satin').cyl(DARK, 0.03, 0.012, mx, 0.08, mz, 12);
    b.use('satin').rod(ARM, 0.011, [mx * 0.72, 0.0, mz * 0.72], [mx * 0.8, -0.2, mz * 0.86], 6);
    b.use('matte').ball(DARK, 0.022, mx * 0.8, -0.2, mz * 0.86, 8, 6);
  }
  // the camera on its gimbal under the nose
  b.use('satin').box(ARM, 0.07, 0.03, 0.06, 0, -0.065, 0.15); b.rod(ARM, 0.012, [-0.05, -0.085, 0.15], [0.05, -0.085, 0.15], 6);
  b.use('satin').ball(DARK, 0.052, 0, -0.105, 0.16, 16, 12); b.use('window').cyl(null, 0.03, 0.022, 0, -0.116, 0.2, 14);
  b.use('glow').box(0x8fffb0, 0.012, 0.012, 0.004, 0.05, 0.0, 0.283); b.box(0x8fffb0, 0.012, 0.012, 0.004, -0.05, 0.0, 0.283);     // nose lights, always on
  const hull = b.build(mats, { cast: true, receive: false }); group.add(hull);
  // tail lights: they blink, so they are their own little mesh
  const tb = new Builder(); tb.use('glow'); for (const sx of [-1, 1]) { tb.box(0xff3b30, 0.03, 0.016, 0.006, sx * 0.045, 0.0, -0.292); tb.ball(0xff3b30, 0.016, sx * R, 0.0, -R - 0.03, 8, 6); }
  const tail = tb.build(mats, { cast: false, receive: false }); group.add(tail);
  // rotors: two blades each and the blur they make when they turn
  const blurTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, w * 0.06, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(20,24,28,0)'); gr.addColorStop(0.2, 'rgba(20,24,28,.34)'); gr.addColorStop(0.86, 'rgba(20,24,28,.2)'); gr.addColorStop(0.94, 'rgba(235,240,243,.42)'); gr.addColorStop(1, 'rgba(20,24,28,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }, { repeat: false });
  const blurMat = new THREE.MeshBasicMaterial({ map: blurTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.9 });
  const blurGeo = new THREE.CircleGeometry(0.2, 28).rotateX(-Math.PI / 2);
  const rotors = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pb = new Builder(); pb.use('satin');
    pb.boxC(DARK, 0.38, 0.006, 0.034, 0, 0, 0, 0, 0, 0.07); pb.boxC(DARK, 0.034, 0.006, 0.38, 0, 0, 0, 0, 0.07, 0);
    const blades = pb.build(mats, { cast: false, receive: false }), disc = new THREE.Mesh(blurGeo, blurMat);
    const r = new THREE.Group(); r.position.set(sx * R, 0.095, sz * R); r.add(blades, disc); group.add(r);
    rotors.push({ r, blades, dir: sx * sz });
  }
  group.scale.setScalar(SCALE); scene.add(group);
  // where it is over the ground: a soft dark patch straight below it
  const shadowTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(0.5, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }, { repeat: false, srgb: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.4, color: 0x04121a }));
  shadow.visible = false; shadow.renderOrder = 6; shadow.name = 'drone-shadow'; scene.add(shadow);

  let spin = 0;
  return {
    group,
    /** d is rig.drone: { pos, yaw, tiltX, tiltZ, thr, motor (0 the rotors stand still, 1 running), bob (0 standing, 1 hovering),
     *  size (1 outdoors, smaller indoors) }; floor(x, y, z) is the height of whatever is under it */
    update(d, dt, t, floor) {
      const bob = d.bob ?? 1, motor = d.motor ?? 1;
      group.visible = true; group.scale.setScalar(SCALE * (d.size ?? 1));
      group.position.set(d.pos.x, d.pos.y + (Math.sin(t * 1.9) * 0.045 + Math.sin(t * 3.1) * 0.02) * bob, d.pos.z);
      group.rotation.set(d.tiltX + Math.sin(t * 2.3) * 0.012 * bob, d.yaw, d.tiltZ + Math.sin(t * 1.7 + 1) * 0.014 * bob, 'YXZ');
      spin += (48 + 70 * d.thr) * motor * dt;
      // at speed the blades are only their blur; standing, they are blades
      for (const q of rotors) { q.r.rotation.y = spin * q.dir + q.dir; q.blades.visible = d.thr < 0.16 || motor < 0.55; }
      blurMat.opacity = 0.9 * clamp((motor - 0.25) / 0.5, 0, 1);
      tail.visible = motor > 0.05 && (t * 1.25) % 1 < 0.5;
      const gy = floor ? floor(d.pos.x, d.pos.y, d.pos.z) : (landSDF(d.pos.x, d.pos.z) < 0 ? 0 : SEA_Y), alt = Math.max(0, d.pos.y - gy), sz = (1.6 + alt * 0.11) * (d.size ?? 1);
      shadow.visible = alt < 140 && alt > 0.5; shadow.position.set(d.pos.x, gy + 0.03, d.pos.z); shadow.scale.set(sz, 1, sz); shadow.material.opacity = 0.42 * clamp(1 - alt / 140, 0, 1) * clamp((alt - 0.5) / 1.5, 0, 1);
    },
    hide() { group.visible = false; shadow.visible = false; },
    hideShadow() { shadow.visible = false; },
  };
}
