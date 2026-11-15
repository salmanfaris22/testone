// The client's own photographs (from gulfaquaculture.com), used in the cards of the matching areas.
// `site: 'first'` marks pictures taken at the company's first hatchery rather than at SKMRC.
const P = (f) => `${import.meta.env.BASE_URL}photos/${f}`;
export const AREA_PHOTO = {
  visitor: { src: P('visitor.webp'), cap: 'The Marine Innovation Park at SKMRC', r: '960 / 561' },
  research: { src: P('research.webp'), cap: 'Visitors in the laboratory corridor at SKMRC', r: '532 / 514', tall: true },
  nursery: { src: P('nursery.webp'), cap: 'Nursery tanks at Gulf Aquaculture\'s first hatchery', r: '4 / 3', site: 'first' },
  hatchery: { src: P('hatchery.webp'), cap: 'The hatchery building at SKMRC', r: '1400 / 712' },
  livefeed: { src: P('livefeed.webp'), cap: 'Microalgae columns at SKMRC', r: '704 / 948', tall: true },
  broodstock: { src: P('broodstock.webp'), cap: 'A broodstock tank at SKMRC, under blue light', r: '532 / 416' },
  plantroom: { src: P('plantroom.webp'), cap: 'Service buildings at SKMRC', r: '1400 / 724' },
  phase1: { src: P('phase1.webp'), cap: 'A tank hall at SKMRC', r: '470 / 300' },
};
export const ITEM_PHOTO = {
  'livefeed/A-1': AREA_PHOTO.livefeed,
  'broodstock/B-01': { src: P('broodstock-3.webp'), cap: 'Adult Hamour at Gulf Aquaculture\'s first hatchery', r: '4 / 3', site: 'first' },
  'broodstock/B-02': { src: P('broodstock-2.webp'), cap: 'Looking over a broodstock tank at SKMRC', r: '512 / 654', tall: true },
  'broodstock/B-05': AREA_PHOTO.broodstock,
  'nursery/N-02': { src: P('nursery-2.webp'), cap: 'Juveniles in a nursery tank, first hatchery', r: '4 / 3', site: 'first' },
  'research/LAB-01': { src: P('research-2.webp'), cap: 'Sample work at the clean bench, first hatchery', r: '4 / 3', site: 'first' },
  'research/LAB-07': AREA_PHOTO.research,
  'visitor/EX-1': { src: P('hamour-adult.webp'), cap: 'An adult Hamour, the orange-spotted grouper', r: '4 / 3' },
  'visitor/EX-3': { src: P('hamra-juvenile.webp'), cap: 'A young Hamra, the Malabar red snapper', r: '852 / 524' },
};
export const SPECIES_PHOTO = {
  hamour: { src: P('hamour-juvenile.webp'), cap: 'A young Hamour from the hatchery', r: '852 / 560' },
  hamra: { src: P('hamra-juvenile.webp'), cap: 'A young Hamra from the hatchery', r: '852 / 524' },
};
export const FISH_CUT = { hamour: `${import.meta.env.BASE_URL}fish/hamour.webp`, hamra: `${import.meta.env.BASE_URL}fish/hamra.webp`, shiqra: `${import.meta.env.BASE_URL}fish/shiqra.webp` };
