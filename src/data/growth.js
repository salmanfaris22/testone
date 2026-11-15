// How each species grows, for the age slider in the underwater view.
// Length follows a von Bertalanffy curve, weight a length-weight power law. The figures are typical
// values for farmed fish in warm water (rounded from published growth studies), not measurements
// from this hatchery: the hatchery team should replace them with their own records.
export const GROWTH = {
  hamour: { Linf: 95, K: 0.31, a: 0.0145, b: 3.0, max: 9, mature: 3.5, market: 900 },
  hamra: { Linf: 80, K: 0.34, a: 0.016, b: 2.95, max: 8, mature: 3, market: 600 },
  shiqra: { Linf: 90, K: 0.3, a: 0.02, b: 2.9, max: 9, mature: 3.5, market: 700 },
  shaari: { Linf: 68, K: 0.32, a: 0.017, b: 3.0, max: 8, mature: 3, market: 500 },
  seabream: { Linf: 58, K: 0.42, a: 0.021, b: 3.0, max: 7, mature: 2, market: 400 },
  mullet: { Linf: 60, K: 0.36, a: 0.012, b: 3.0, max: 7, mature: 2.5, market: 450 },
  cobia: { Linf: 150, K: 0.38, a: 0.006, b: 3.1, max: 9, mature: 2.5, market: 4000 },
  naisrah: { Linf: 55, K: 0.4, a: 0.02, b: 3.0, max: 7, mature: 2, market: 350 },
};
const T0 = -0.0068;                                   // so a newly hatched larva is about 2 mm long
const G = (sp) => GROWTH[sp] || GROWTH.naisrah;
/** length in centimetres at an age in years */
export const lengthAt = (sp, yrs) => { const g = G(sp); return g.Linf * (1 - Math.exp(-g.K * (Math.max(0, yrs) - T0))); };
/** weight in grams at an age in years */
export const weightAt = (sp, yrs) => { const g = G(sp); return g.a * Math.pow(lengthAt(sp, yrs), g.b); };
/** age in years at which a weight in grams is reached */
export function ageAtWeight(sp, grams) { const g = G(sp), L = Math.pow(grams / g.a, 1 / g.b); return L >= g.Linf * 0.995 ? g.max : T0 - Math.log(1 - L / g.Linf) / g.K; }
export const maxAge = (sp) => G(sp).max;

const DAY = 1 / 365;
/** the life stage at an age, and where in the centre a fish of that age lives */
export function stageAt(sp, yrs) {
  const g = G(sp), w = weightAt(sp, yrs);
  if (yrs < 1.2 * DAY) return { key: 'egg', name: 'Egg', area: 'hatchery', where: 'Incubators, Larval Rearing Hall', text: 'A floating egg under a millimetre across. It hatches in about a day.' };
  if (yrs < 25 * DAY) return { key: 'larva', name: 'Larva', area: 'hatchery', where: 'Larval Rearing Hall', text: 'Feeds on live rotifers, then Artemia, in green water. The most delicate weeks of its life.' };
  if (yrs < 90 * DAY) return { key: 'fry', name: 'Fry', area: 'nursery', where: 'Weaning and Nursery', text: 'Learns to take dry feed, is graded by size and grows strong enough to travel.' };
  if (w < g.market * 0.12) return { key: 'fingerling', name: 'Fingerling', area: 'seacages', where: 'Grow-out cages', text: 'Its first weeks at sea, in a fine-mesh net hung inside a grow-out cage.' };
  if (w < g.market) return { key: 'juvenile', name: 'Growing on', area: 'seacages', where: 'Grow-out cages', text: 'Putting on weight in open Gulf water, fed several times a day.' };
  if (yrs < g.mature) return { key: 'market', name: 'Market size', area: 'seacages', where: 'Grow-out cages', text: 'Ready for harvest. A few of the best are kept back as future breeders.' };
  return { key: 'brood', name: 'Breeding age', area: 'broodstock', where: 'Broodstock Building', text: 'Old enough to spawn. Breeders are kept for years and known one by one.' };
}
export function fmtAge(yrs) {
  const d = yrs * 365;
  if (d < 1.5) return `${Math.round(d * 24)} hours`;
  if (d < 100) return `${Math.round(d)} days`;
  if (yrs < 2) return `${Math.round(yrs * 12)} months`;
  return `${yrs.toFixed(1)} years`;
}
export function fmtLen(cm) { return cm < 1 ? `${(cm * 10).toFixed(1)} mm` : cm < 10 ? `${cm.toFixed(1)} cm` : `${Math.round(cm)} cm`; }
export function fmtWeight(g) { return g < 0.1 ? `${Math.max(1, Math.round(g * 1000))} mg` : g < 10 ? `${g.toFixed(1)} g` : g < 1000 ? `${Math.round(g)} g` : `${(g / 1000).toFixed(g < 10000 ? 2 : 1)} kg`; }
