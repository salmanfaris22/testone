// Brand and contact details in one place. Values marked CONFIRM came from the client's
// reference demo and should be checked with the client before going live.
export const SITE = {
  brand: 'Gulf Aquaculture',
  centre: 'Sheikh Khalifa Marine Research Centre',
  short: 'SKMRC',
  place: 'Umm Al Quwain, United Arab Emirates',
  operatedSince: 'November 2025',
  // contact details as published on gulfaquaculture.com (November 2026)
  email: 'info@gulfaquaculture.com',
  whatsapp: '971563386655',
  whatsappLabel: '+971 56 338 6655',
  phone: '+97122346000',
  phoneLabel: '+971 2 234 6000',
  office: 'Head office: 7th Floor, East Tower, Abu Dhabi Mall, P.O. Box 55345, Abu Dhabi',
  website: 'gulfaquaculture.com',
};

// The company, in its own published facts (gulfaquaculture.com). The wording of ABOUT and STORY is ours;
// VISION and MISSION are the company's own statements, quoted.
export const ABOUT = 'Gulf Aquaculture is a marine fish hatchery company and a subsidiary of Emirates Consortium (EmCon). It raises fry of high-value fish that are native to the Gulf and supplies them to farms across the region, so that farmers can build their businesses on local species rather than imported ones.';
export const STORY = [
  { when: 'January 2023', what: 'Founded, with a pilot hatchery on Balghailam Island in Abu Dhabi.' },
  { when: '2024', what: 'Hamour larvae and fry produced at scale for the first time, and the first fry sold to commercial farms in the Gulf.' },
  { when: 'November 2025', what: 'The UAE Government awards the long-term lease of the Sheikh Khalifa Marine Research Centre in Umm Al Quwain.' },
  { when: 'Today', what: 'Two sites: SKMRC, one of the largest marine hatcheries in the region, and the Balghailam pilot hatchery, which is being expanded.' },
];
export const VISION = 'To be the premier catalyst for a self-sustaining Gulf aquaculture ecosystem.';
export const MISSION = 'To fortify regional food security by pioneering the production of high-quality, locally adapted marine fish fry.';

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
  { id: 'distribution', n: 5, name: 'Harvest and distribution', area: 'nursery', item: 'nursery/PK-1', time: 'To order', text: 'Fry are counted, packed with oxygen and delivered to farms in the UAE and the region. Every batch is traceable back to its parents.' },
];
