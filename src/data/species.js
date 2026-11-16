// Native Gulf species raised at the centre. Trade facts come from the client's material;
// biology is standard reference data (FishBase). `tbc: true` marks what the hatchery team still has to confirm.
export const SPECIES = [
  {
    id: 'hamour', local: 'Hamour', common: 'Orange-spotted grouper', sci: 'Epinephelus coioides', status: 'In production',
    line: 'The most prized fish on Gulf tables, and the slowest to grow.',
    about: 'Hamour is a reef predator with firm white flesh and the highest market price of any local fish. Wild stocks in the Gulf are under heavy fishing pressure, so hatchery-raised fry matter both for farms and for restocking.',
    facts: [['120 cm', 'Largest recorded length'], ['Reefs, estuaries, mangroves', 'Where it lives'], ['Fish, shrimp, crabs', 'What it eats'], ['Female first, later male', 'How it breeds']],
    farm: 'Stocked in sea cages. Slow growing, premium value.',
    supply: ['First Hamour fry sold to the local market in 2024', 'Juveniles supplied to a local company since 2024', 'Part of the 20 million fry target for 2026'],
    anatomy: [
      { at: [0.05, -0.02], side: 'l', t: 'Large mouth', d: 'An ambush hunter that swallows prey whole.' },
      { at: [0.42, -0.07], side: 'd', t: 'Orange-brown spots', d: 'The pattern that gives the species its name.' },
      { at: [0.5, 0.17], side: 'u', t: 'Spined dorsal fin', d: 'Eleven strong spines, raised when threatened.' },
      { at: [0.95, 0.0], side: 'r', t: 'Rounded tail', d: 'Built for short bursts, not long chases.' },
    ],
    stages: ['broodstock', 'hatchery', 'nursery', 'seacages'],
  },
  {
    id: 'hamra', local: 'Hamra', common: 'Malabar red snapper', sci: 'Lutjanus malabaricus', status: 'In production',
    line: 'Hardy, fast growing and well suited to sea cages.',
    about: 'A warm-water snapper with good growth and a clean, sweet flesh that sells well across the Middle East. It converts feed efficiently and reaches harvest size on a predictable schedule.',
    facts: [['100 cm', 'Largest recorded length'], ['Coastal and offshore reefs', 'Where it lives'], ['Fish, crustaceans, squid', 'What it eats'], ['12 to 100 m', 'Usual depth']],
    farm: 'Low-density cages or well-managed land systems. Efficient feed conversion.',
    supply: ['Hatchery and nursery production alongside grouper', 'Juveniles supplied to a local company since 2024', 'Oman fry supply agreement from December 2025'],
    anatomy: [
      { at: [0.1, 0.07], side: 'l', t: 'Steep forehead', d: 'A deep head with a pointed snout.' },
      { at: [0.48, -0.1], side: 'd', t: 'Even red body', d: 'Rose-red above, silvery pink below.' },
      { at: [0.95, 0.0], side: 'r', t: 'Straight-edged tail', d: 'A broad, nearly square tail fin.' },
    ],
    stages: ['broodstock', 'hatchery', 'nursery', 'seacages'],
  },
  {
    id: 'shiqra', local: 'Shiqra', common: 'Mangrove red snapper', sci: 'Lutjanus argentimaculatus', status: 'In production',
    line: 'Born in the mangroves, grown out at sea.',
    about: 'Young Shiqra live in mangrove creeks and river mouths, then move to offshore reefs as adults. It tolerates a wide range of salinity, which makes it forgiving to farm.',
    facts: [['150 cm', 'Largest recorded length'], ['Mangroves when young, reefs as adults', 'Where it lives'], ['Fish and crustaceans', 'What it eats'], ['Wide salinity range', 'Tolerance']],
    farm: 'Low-density cages or land-based systems, with predictable harvest value.',
    supply: ['Mangrove snapper broodstock held at SKMRC', 'Fry volumes to be confirmed by the hatchery team'],
    anatomy: [
      { at: [0.5, 0.2], side: 'u', t: 'Bronze to copper-red flanks', d: 'Each scale has a darker centre.' },
      { at: [0.04, -0.02], side: 'l', t: 'Strong canine teeth', d: 'A powerful jaw for crabs and fish.' },
      { at: [0.95, 0.0], side: 'r', t: 'Slightly notched tail', d: 'More swept than the Hamra tail.' },
    ],
    stages: ['broodstock', 'hatchery', 'nursery', 'seacages'],
  },
  {
    id: 'shaari', local: 'Shaari', common: 'Spangled emperor', sci: 'Lethrinus nebulosus', status: 'Core species',
    line: 'A reef fish with blue-flecked scales and a delicate flavour.',
    about: 'Shaari is one of the best-loved fish in UAE markets. It lives over seagrass, sand and coral, and adapts well to warm-water farming. Along with Hamour and red snapper it is a current focus of the nursery.',
    facts: [['87 cm', 'Largest recorded length'], ['Seagrass, sand and coral reefs', 'Where it lives'], ['Crabs, molluscs, sea urchins', 'What it eats'], ['Female first, later male', 'How it breeds']],
    farm: 'Adaptable to warm-water aquaculture. Farming details to be confirmed by the hatchery team.',
    supply: ['Shaari broodstock held at SKMRC', 'A nursery focus species for 2026'],
    anatomy: [
      { at: [0.06, 0.03], side: 'l', t: 'Long sloping snout', d: 'Used to dig prey out of sand.' },
      { at: [0.55, 0.2], side: 'u', t: 'Blue spangles', d: 'A pale blue spot on each scale.' },
      { at: [0.24, -0.1], side: 'd', t: 'Blue cheek lines', d: 'Three streaks running from the eye.' },
      { at: [0.95, 0.0], side: 'r', t: 'Forked tail', d: 'A faster swimmer than the groupers.' },
    ],
    stages: ['broodstock', 'hatchery', 'nursery', 'seacages'],
  },
  {
    id: 'seabream', local: 'Sobaity', common: 'Sobaity seabream', tab: 'Seabream', sci: 'Sparidentex hasta', status: 'In production',
    line: 'The region\'s most familiar farmed fish.',
    about: 'Seabream has been farmed in the Gulf for decades, so its feeding, breeding and health care are well understood. It prefers slightly cooler water than grouper and snapper and spawns in winter.',
    facts: [['50 cm', 'Largest recorded length'], ['Shallow coastal water', 'Where it lives'], ['Molluscs, crustaceans, small fish', 'What it eats'], ['Male first, later female', 'How it breeds']],
    farm: 'Well-understood protocols. Suits mixed-species farms, retail and hospitality supply.',
    supply: ['Seabream broodstock held at SKMRC', 'Oman: Red snapper and seabream fry supply agreement from December 2025'],
    anatomy: [
      { at: [0.45, 0.24], side: 'u', t: 'Deep silver body', d: 'Tall and flat from side to side.' },
      { at: [0.45, -0.13], side: 'd', t: 'Faint lengthwise lines', d: 'Dark lines following the rows of scales.' },
      { at: [0.95, 0.0], side: 'r', t: 'Forked tail', d: 'Dark edged and deeply forked.' },
    ],
    stages: ['broodstock', 'hatchery', 'nursery', 'seacages'],
  },
  {
    id: 'ummdrais', local: 'Umm Drais', common: 'Gulf red snapper', sci: null, status: 'Under evaluation', tbc: true,
    line: 'A local red snapper being assessed for the programme.',
    about: 'Umm Drais is a deep-bodied red reef fish valued in local markets. It is being evaluated in the broodstock development programme as a way to widen the range of species grown out at sea.',
    facts: [['To be confirmed', 'Scientific name'], ['Gulf reefs', 'Where it lives'], ['Local fish markets', 'Demand'], ['Candidate', 'Programme status']],
    farm: 'Under evaluation. Register interest and the team will share results as they come in.',
    supply: ['Not yet available as fry'],
    anatomy: [],
    stages: ['broodstock'],
  },
];
export const speciesById = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
/** breeders that swim in the tanks but have no page of their own: what to call them */
export const OTHER_FISH = {
  mullet: { local: 'Mullet', common: 'Grey mullet', sci: 'Mugilidae' },
  cobia: { local: 'Cobia', common: 'Black kingfish', sci: 'Rachycentron canadum' },
  naisrah: { local: 'Naisrah', common: 'Local snapper', sci: null },
};

// Other breeders held in the broodstock building (client list).
export const BROODSTOCK_TANKS = [
  { sp: 'hamour', name: 'Hamour', sci: 'Epinephelus coioides' },
  { sp: 'seabream', name: 'Seabream', sci: 'Sparidentex hasta' },
  { sp: 'shaari', name: 'Shaari', sci: 'Lethrinus nebulosus' },
  { sp: 'shiqra', name: 'Mangrove snapper', sci: 'Lutjanus argentimaculatus' },
  { sp: 'mullet', name: 'Mullet', sci: 'Mugilidae' },
  { sp: 'cobia', name: 'Cobia', sci: 'Rachycentron canadum' },
  { sp: 'naisrah', name: 'Naisrah', sci: null },
  { sp: 'hamour', name: 'Hamour, second line', sci: 'Epinephelus coioides' },
];
