// The twelve areas of the centre, numbered in the order the scroll tour visits them (Jeffry, 18 November): 01 and 02 the
// Innovation Park, where a visitor arrives, 03 to 09 the new hatchery (05 is the RAS control room in the larval hall's building),
// 10 the original Phase 1 hatchery, 11 LFC Hamour, the boat, and 12 the sea cages it serves. Each keeps the phase it was built in.
// Facts are the client's; the wording is ours.
/** the centre was built in phases; the tour, the dock and the intro follow them in order */
export const PHASES = [
  { n: 1, name: 'Phase 1', title: 'The original hatchery', line: 'Where production began: six buildings south of the avenue.' },
  { n: 2, name: 'Phase 2', title: 'The new hatchery', line: 'Nursery, larval, live feed and broodstock halls, with the plant room and generators that keep them alive.' },
  { n: 3, name: 'Phase 3', title: 'Innovation Park and the sea', line: 'Science, education and the sea cages, served by the live fish carrier LFC Hamour.' },
];
export const AREAS = [
  {
    id: 'visitor', n: '01', phase: 3, name: 'Education and Visitor Centre', short: 'Visitor Centre', tag: 'Marine Innovation Park',
    line: 'Where the public meets the science.',
    desc: 'The round building at the entrance is the Marine Innovation Park. Under its white shell roof are an exhibition hall built round a 12.8 m fish floor screen under walk-on glass, with a turning globe of the Earth over it, an amphitheatre, and the Marine Discovery Corners where school groups work hands-on.',
    bullets: ['Exhibition hall with a round fish floor screen and a 4.4 m globe', 'Amphitheatre for talks and school visits', 'Marine Discovery Corners 1 and 2', 'Staff canteen opening onto the palm courtyard'],
    stats: [['12.8 m', 'Fish floor screen'], ['2', 'Discovery Corners'], ['1', 'Amphitheatre']],
  },
  {
    id: 'research', n: '02', phase: 3, name: 'Research and Administration Wing', short: 'Research Wing', tag: 'Laboratories and offices',
    line: 'The science behind every fish.',
    desc: 'Two wings reach out from the rotunda around a palm courtyard. One holds the laboratories that test water and screen fish for disease every day. The other holds the offices of the Gulf Aquaculture team.',
    bullets: ['Testing for viruses, bacteria and parasites', 'Daily water-quality analysis for every tank', 'Laboratories provisioned for ISO/IEC 17025', 'Open to visiting researchers and universities'],
    stats: [['14', 'Laboratories'], ['1,200 m²', 'Office space'], ['ISO/IEC 17025', 'Provisioned for']],
  },
  {
    id: 'nursery', n: '03', phase: 2, name: 'Weaning and Nursery', short: 'Nursery', tag: 'Hatchery building, west hall',
    line: 'Grown with patience.',
    desc: 'Young fish arrive here at about 25 days old. Over the next two months they learn to take dry feed, are graded by size and grow into fry ready for the sea cages or for delivery to other farms.',
    bullets: ['Current focus: Hamour, red snapper and Shaari', 'Rail feeders give small, frequent meals', 'Fry are graded, counted and packed with oxygen here'],
    stats: [['20 M', 'Fry target 2026'], ['3', 'Focus species'], ['Day 25 to 90', 'Stage']],
  },
  {
    id: 'hatchery', n: '04', phase: 2, name: 'Larval Rearing Hall', short: 'Larval Hall', tag: 'Hatchery building, centre hall',
    line: 'Where life begins.',
    desc: 'Fertilised eggs are stocked into conical tanks and hatch within a day. The first weeks are the most delicate part of the whole cycle, so every tank runs on its own recirculating loop and is watched around the clock.',
    bullets: ['Three species produced through the year', 'Capacity above 20 million larvae a year', 'Green-water culture and live feed dosed several times a day'],
    stats: [['20 M+', 'Larvae a year'], ['3', 'Species a year'], ['26', 'Recirculating systems']],
  },
  {
    id: 'rascontrol', n: '05', phase: 2, name: 'RAS Control Room', short: 'RAS Control', tag: 'Larval hall, east end',
    line: 'Every tank, watched at once.',
    desc: 'The room at the east end of the larval hall from which the centre\'s 26 recirculating systems are run. Temperature, salinity, oxygen and day length are tracked for every tank on its screens, and any drift pages the duty team, day and night.',
    bullets: ['One console for all 26 recirculating systems', 'Every reading of every tank, live, on its big screen', 'Alarms by SMS and app, 24 hours a day'],
    stats: [['26', 'Systems'], ['24/7', 'Monitoring'], ['SMS + app', 'Alarms']],
  },
  {
    id: 'livefeed', n: '06', phase: 2, name: 'Live Feed and Algae', short: 'Live Feed', tag: 'Hatchery building, east hall',
    line: 'Tiny food, big future.',
    desc: 'Newly hatched larvae are too small for any dry feed. This hall grows what they can eat: microalgae in lit columns, then rotifers, Artemia and copepods, each enriched before it goes to the tanks.',
    bullets: ['Seven species of microalgae, all year', 'Rotifers, Artemia and copepods', 'Cultures harvested and dosed daily'],
    stats: [['7', 'Algae species'], ['3', 'Live feeds'], ['24 h', 'Lighting']],
  },
  {
    id: 'broodstock', n: '07', phase: 2, name: 'Broodstock Building', short: 'Broodstock', tag: 'Breeding stock and sea water intake',
    line: 'Strong parents, strong stock.',
    desc: 'The parent fish live here in large round tanks fed with filtered Gulf water from the intake room next door. Light and temperature follow the seasons so each species spawns naturally.',
    bullets: ['Seabream, Hamour, Shaari and mangrove snapper', 'Mullet, cobia and Naisrah', 'Eggs collected every morning and sent to the larval hall'],
    stats: [['7', 'Species'], ['12', 'Breeding tanks'], ['All year', 'Spawning']],
  },
  {
    id: 'plantroom', n: '08', phase: 2, name: 'Plant Room', short: 'Plant Room', tag: 'Water treatment and life support',
    line: 'Quietly keeping it all alive.',
    desc: 'Every litre that reaches a tank passes through here first. Sand filters take out particles, biofilters convert waste, ultraviolet light kills pathogens, and the control room watches all of it.',
    bullets: ['Sand filtration, biofiltration and UV', 'Water is cleaned and reused', 'Alarms reach the team day and night'],
    stats: [['24/7', 'Life support'], ['4', 'Treatment steps'], ['1', 'Control room']],
  },
  {
    id: 'genroom', n: '09', phase: 2, name: 'Generator Room', short: 'Generators', tag: 'Back-up power',
    line: 'Never a moment off.',
    desc: 'Fish cannot wait out a power cut. If the grid fails, the generators start on their own within seconds and carry the pumps, oxygen and controls until power returns.',
    bullets: ['Standby generators with automatic start', 'Transformer, substation kiosk and switchgear', 'Fire-water tanks and pump'],
    stats: [['3', 'Generators'], ['Seconds', 'To start'], ['N+1', 'Redundancy']],
  },
  {
    id: 'phase1', n: '10', phase: 1, name: 'Phase 1 Hatchery', short: 'Phase 1', tag: 'The original buildings',
    line: 'Where it all started.',
    desc: 'The first production stream of the centre, in six buildings south of the avenue: a nursery and weaning hall, a hatchery, a broodstock hall, offices with a hall laboratory and stores, and its own plant room, header tanks and generators.',
    bullets: ['Nursery, weaning and office', 'Hatchery and broodstock halls', 'Own plant room, header tanks and generators'],
    stats: [['6', 'Buildings'], ['3', 'Header tanks'], ['18,000 m²', 'With Phase 2']],
  },
  {
    id: 'lfc', n: '11', phase: 3, name: 'LFC Hamour', short: 'LFC Hamour', tag: 'Live fish carrier',
    line: 'Live fry, carried by sea.',
    desc: 'The first live fish carrier in the GCC, run by Jalboot Marine Network, berths at the jetty in front of Phase 1. Its four built-in wells keep oxygen, temperature and water quality steady while fry travel from the hatchery to the cages, so they arrive calm and healthy. Scroll on and it casts off for the sea cages, area 12.',
    bullets: ['Four live-fish wells, about 360 m³', 'Oxygen generator, heat pump and filtration on board', 'Fish pump with optical counting', 'Berths along the west face of the jetty'],
    stats: [['31.9 m', 'Length'], ['360 m³', 'Live-fish wells'], ['1st', 'In the GCC']],
  },
  {
    id: 'seacages', n: '12', phase: 3, name: 'Sea Cage Grow-Out', short: 'Sea Cages', tag: 'Open sea',
    line: 'Back to the Gulf.',
    desc: 'Fingerlings leave the nursery for round floating cages off the south shore, in front of the Phase 1 hatchery. They grow to market size in nine open cages in natural Gulf water, under a bird net, starting in a fine-mesh net and moving to a wider one as they grow. LFC Hamour, the first live fish carrier in the GCC, berths at the jetty. Dive in to swim with the fish.',
    bullets: ['Native species in their own water', 'Nine grow-out cages, three rows of three, each under a bird net', 'A jetty and gangway down to a floating landing stage, fed from the barge', 'LFC Hamour moves live fry with oxygen and temperature kept steady'],
    stats: [['9', 'Cages'], ['Open sea', 'Water'], ['Bird net', 'Over every cage']],
  },
];
export const areaById = Object.fromEntries(AREAS.map((a) => [a.id, a]));
export const phaseOf = (a) => PHASES[(typeof a === 'string' ? areaById[a] : a).phase - 1];

/** The scroll tour, the guided tour and the fly-through start where a visitor does, at the Innovation Park (01, 02), then go
 *  through the new hatchery (03 to 09, with the RAS control room as 05), then the original one (10), and end at sea (11, 12):
 *  the areas are numbered in this order. */
export const TOUR = ['visitor', 'research', 'nursery', 'hatchery', 'rascontrol', 'livefeed', 'broodstock', 'plantroom', 'genroom', 'phase1', 'lfc', 'seacages'].map((id) => areaById[id]);
/** the chapter banner that opens over the model at these steps of the tour: [big, small] */
export const CHAPTERS = { visitor: ['Phase 3', 'Marine Innovation Park'], nursery: ['Phase 2', 'The new hatchery'], phase1: ['Phase 1', 'The original hatchery'], lfc: ['Phase 3', 'Out to sea'] };
