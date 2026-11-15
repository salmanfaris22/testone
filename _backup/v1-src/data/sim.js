// Example readings for tanks and machines. Values drift smoothly and repeatably around a set point,
// so the model feels alive without pretending to be connected to the real plant.
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const dayFrac = (ms) => { const d = new Date(ms); return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400; };

/** value of one sensor at time ms */
export function value(item, s, ms = Date.now()) {
  if (s.text !== undefined) return s.text;
  const k = hash(item.id + s.k), t = ms / 1000;
  if (s.rise) return s.v * (0.18 + 0.82 * Math.min(1, dayFrac(ms) * 1.25)) + (s.d || 0) * Math.sin(t / 5 + k * 9);
  if (!s.d) return s.v;
  const n = Math.sin(t / 41 + k * 31) * 0.5 + Math.sin(t / 13 + k * 17) * 0.3 + Math.sin(t / 3.7 + k * 7) * 0.2;
  return s.v + n * s.d;
}
export function format(s, v) {
  if (typeof v === 'string') return v;
  if (s.big || Math.abs(v) >= 10000) return Math.round(v).toLocaleString('en-US');
  return v.toFixed(s.p ?? 1);
}
/** the last n samples, one every `step` seconds */
export function history(item, s, n = 36, step = 20) {
  const now = Date.now(), out = [];
  for (let i = n - 1; i >= 0; i--) out.push(value(item, s, now - i * step * 1000));
  return out;
}
/** svg path for a sparkline in a w×h box */
export function spark(vals, w = 76, h = 22) {
  let lo = Math.min(...vals), hi = Math.max(...vals); if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.18; lo -= pad; hi += pad;
  return vals.map((v, i) => `${i ? 'L' : 'M'}${((i / (vals.length - 1)) * w).toFixed(1)} ${(h - ((v - lo) / (hi - lo)) * h).toFixed(1)}`).join('');
}
