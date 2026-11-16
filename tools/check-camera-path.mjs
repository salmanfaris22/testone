import assert from 'node:assert/strict';
import { Rig, P } from '../src/world/rig.js';

const keys = [
  { p: P(0, 1, 0, 3.05, 1.4, 30) },
  { p: P(20, 3, -10, -3.05, 1.0, 120), t: 0.7 },
  { p: P(65, 3, -20, -2.8, 0.7, 150), t: 2.3 },
  { p: P(80, 0, -5, -2.6, 1.1, 300), t: 1.2 },
];
function rig(done, onLeg) {
  const r = Object.create(Rig.prototype); r.cur = { ...keys[0].p }; r.goal = { ...r.cur };
  r.playPath(keys, { done, onLeg }); return r;
}
function at(time) { const r = rig(); r._path(time); return r.goal; }
const fields = Object.keys(keys[0].p), eps = 1e-5;
for (const time of [0.7, 3.0]) {
  const left = at(time - eps), mid = at(time), right = at(time + eps);
  for (const key of fields) {
    const v0 = (mid[key] - left[key]) / eps, v1 = (right[key] - mid[key]) / eps;
    assert.ok(Math.abs(v1 - v0) < 0.03, `${key}: velocity discontinuity at ${time}`);
  }
}
for (let t = 0; t < 4.2; t += 0.01) {
  const p = at(t), leg = t < 0.7 ? 0 : t < 3 ? 1 : 2;
  for (const key of fields.filter(k => k !== 'az')) {
    const a = keys[leg].p[key], b = keys[leg + 1].p[key];
    assert.ok(p[key] >= Math.min(a, b) - 1e-8 && p[key] <= Math.max(a, b) + 1e-8, `${key}: overshoot at ${t}`);
  }
  assert.ok(p.az >= 3.05 && p.az < 3.7, 'yaw takes the short route across ±π');
}
// Uneven rendering must not discard time at segment boundaries.
for (const fps of [24, 30, 60, 120]) {
  const r = rig(); let remaining = 3.83;
  while (remaining > 1e-10) { const dt = Math.min(1 / fps, remaining); r._path(dt); remaining -= dt; }
  for (const key of fields) assert.ok(Math.abs(r.goal[key] - at(3.83)[key]) < 1e-7, `${fps} fps timing drift: ${key}`);
}
const legs = []; let completed = 0;
const r = rig(() => completed++, i => legs.push(i)); r._path(5);
assert.equal(completed, 1); assert.equal(r.path, null); assert.deepEqual(legs, [0, 1, 2]);
assert.equal(r.goal.dist, 300);
for (const t of [0, 4.2]) {
  const a = at(Math.max(0, t - eps)), b = at(Math.min(4.2, t + eps));
  for (const key of fields) assert.ok(Math.abs(b[key] - a[key]) / eps < 0.03, `${key}: abrupt endpoint`);
}
console.log('Camera path: continuous velocity, bounded poses, short yaw, 24–120 fps timing, completion and gentle endpoints passed.');
