// Brand and contact details in one place. Values marked CONFIRM came from the client's
// reference demo and should be checked with the client before going live.
export const SITE = {
  brand: 'Gulf Aquaculture',
  centre: 'Sheikh Khalifa Marine Research Centre',
  short: 'SKMRC',
  place: 'Umm Al Quwain, United Arab Emirates',
  operatedSince: 'November 2025',
  email: 'info@gulfaquaculture.com',          // CONFIRM
  whatsapp: '971501518905',                    // CONFIRM
  whatsappLabel: '+971 50 151 8905',           // CONFIRM
  website: 'gulfaquaculture.com',
};

export const NUMBERS = [
  { v: '20', unit: 'million', l: 'fry targeted for 2026', note: 'Hamour, red snapper and Shaari from the nursery' },
  { v: '18,000', unit: 'm²', l: 'of hatchery space', note: 'Two production streams, Phase 1 and Phase 2' },
  { v: '14', unit: '', l: 'laboratories', note: 'Provisioned for ISO/IEC 17025' },
  { v: '7', unit: '', l: 'broodstock species', note: 'Bred on site, all year' },
  { v: '26', unit: '', l: 'recirculating systems', note: 'Monitored from one control room' },
  { v: '15', unit: 'years', l: 'concession', note: 'Operated by Gulf Aquaculture since November 2025' },
];

// The production cycle, in order. `area` links each phase to a place in the 3D model.
export const CYCLE = [
  { id: 'broodstock', n: 1, name: 'Broodstock', area: 'broodstock', time: 'All year', text: 'Adult fish of seven native species are held in large tanks. Light and temperature follow the seasons so they spawn naturally, and floating eggs are collected each morning.' },
  { id: 'larval', n: 2, name: 'Hatching and larval rearing', area: 'hatchery', time: 'Day 0 to 25', text: 'Eggs hatch in conical tanks. For the first weeks the larvae eat live feed grown next door: microalgae, then rotifers, then Artemia.' },
  { id: 'nursery', n: 3, name: 'Weaning and nursery', area: 'nursery', time: 'Day 25 to 90', text: 'Juveniles move from live feed to dry feed, are graded by size and grow into fry strong enough to travel.' },
  { id: 'growout', n: 4, name: 'Sea cage grow-out', area: 'seacages', time: 'Month 3 onward', text: 'Fingerlings go to open-sea cages early. They finish growing in natural Gulf water, which keeps energy use on land low.' },
  { id: 'distribution', n: 5, name: 'Harvest and distribution', area: 'nursery', time: 'To order', text: 'Fry are counted, packed with oxygen and delivered to farms in the UAE and the region. Every batch is traceable back to its parents.' },
];
