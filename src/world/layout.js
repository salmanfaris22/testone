// Where everything stands (metres, x east, z south, ground y = 0).
// The masterplan follows the client's site plan as shown in the reference demo, at 1.5 m per plan unit:
// a peninsula with a diagonal north-east shore, the hatchery row, Phase 1 south of the avenue,
// the Innovation Park at the west end and the cages off the north-east beach.
export const K = 1.5;

/** north-east shore: a point on it, its direction (towards the tip) and the seaward normal */
export const COAST = { px: -76.5, pz: -243, dx: 0.802, dz: 0.597, nx: 0.597, nz: -0.802 };
/** point at `u` metres along the shore and `f` metres out to sea */
export const coast = (u, f) => [COAST.px + COAST.dx * u + COAST.nx * f, COAST.pz + COAST.dz * u + COAST.nz * f];
export const LANDLINE = { south: 168, east: 277.5, round: 46 };
/** the paved apron sits 22.5 m back from the shore line */
export const APRON = { west: -267, south: 156, east: 255, back: 22.5 };

/* ───── local frames: world = frame + rotate(local) ───── */
/** Marine Innovation Park: rotunda centre, long axis turned 35.5° to run along the shore */
export const PARK = { x: 0, z: 0 };
export const PARK_FRAME = { x: -161.25, z: -163.125, ry: -Math.atan2(0.714, 1) };
/** the three halls of the Phase 2 hatchery share one frame (their interiors were laid out in it) */
export const HATCH_FRAME = { x: -132.25, z: -23.25, ry: 0 };
export const HATCH = { x0: -38.375, x1: 134.125, z0: -28.5, z1: 24, nurseryX1: 46, larvalX1: 109.75, annexX0: 74.125, annexZ1: 45.75, h: 11, annexH: 7.5 };
export const BROOD_FRAME = { x: 13.975, z: 63.25, ry: 0 };
export const BROOD = { x0: -8.35, x1: 61.025, z0: -112, z1: -42.625, h: 12 };
export const INTAKE = { x0: 23.525, x1: 34.775, z0: -125.125, z1: -112, h: 7 };
/** the plant room interior is turned a quarter: local +x runs north, local +z runs east */
export const PLANT_FRAME = { x: 190.875, z: 99.3, ry: Math.PI / 2 };
export const PLANT = { x0: 84.3, x1: 124, z0: -115.875, z1: -84, h: 9.5 };
export const GEN = { x0: 120, x1: 136.875, z0: 1.875, z1: 18.75, h: 6.5 };
export const P1 = {
  a: { x0: -210, x1: -86.25, z0: 54.375, z1: 112.5, h: 10.5 },       // nursery and weaning
  b: { x0: -86.25, x1: -37.5, z0: 48.75, z1: 135, h: 10.5 },         // hatchery
  c: { x0: -24.375, x1: 48.75, z0: 46.875, z1: 93.75, h: 10 },       // broodstock
  d: { x0: -18.75, x1: 58.125, z0: 99.375, z1: 135, h: 8.5 },        // office, lab and stores
  e: { x0: 69.375, x1: 140.625, z0: 46.875, z1: 80.625, h: 9.5 },    // plant room
  f: { x0: 76.875, x1: 140.625, z0: 105, z1: 127.5, h: 7.5 },        // generator and workshop
};
export const PUMP = { x0: -3, x1: 15.75, z0: -83, z1: -64.625, h: 8 };            // sea water pump station (nudged clear of the road bend)
export const SMALL = [
  { x0: 163.125, x1: 174.375, z0: 50.625, z1: 63.75, h: 5.5 },                     // gatehouse and security
  { x0: 166.5, x1: 187.5, z0: 71.25, z1: 88.125, h: 7 },                           // workshop and stores
  { x0: 138, x1: 147, z0: 6, z1: 15, h: 5 },                                       // substation kiosk
];
export const FIRE = { x: 223.5, z: 108, w: 24, d: 19.5, r: 4.5, h: 6.75 };
/** the way in: the name wall just inside the gatehouse, and where the Emirati host stands to greet you (the intro starts here) */
export const GATE = { sign: [-295.5, -61.4], host: [-300.2, -64.0], hostRy: -1.78 };

/* ───── roads (centre lines) ───── */
export const RB_W = { x: -240, z: -75, r: 16.5 }, RB_E = { x: 195, z: 136.875, r: 15 };
export const ROADS = {
  w: 10.5, walk: 3.3,
  entry: [[-1350, -75], [RB_W.x - RB_W.r, -75]],
  west: [[RB_W.x, RB_W.z + RB_W.r], [RB_W.x, 151.125]],
  north: [[-223.125, -73.125], [-41.25, -71.25], [-18.75, -80.625], [7.5, -106.5]],
  shore: [[7.5, -106.5], [168.75, 7.5], [187.5, 30], [194.25, 52.5], [194.25, 121.875]],
  avenue: [[RB_W.x, 31.875], [142.5, 31.875], [151.875, 41.25], [151.875, 151.125]],
  south: [[-270, 151.125], [183.75, 151.125], [RB_E.x - 3, 151.4]],
  cross: [[-178.125, -68.25], [-178.125, 30]],
  drive: [[RB_W.x, RB_W.z - RB_W.r], [-243, -106], [-236, -124], [-222, -139]],
};
export const DROP = { x: -210, z: -144, r: 12.5 };
export const LAWNS = [[-226, -120, -198, -84, 9], [-236, -214, -200, -168, 10], [-169.5, -117, -135, -87, 4.5], [-228.75, -63.75, -183.75, 24.375, 6], [-262.5, 39, -246, 147, 3], [156, 40.5, 192, 147, 4.5]];
export const PARKING = [[-131, -119], [-90, -90], [-76, -81.5], [-130, -81.5]];

/* ───── sea cages: off the south shore, in front of Phase 1 ─────
   (they used to sit off the north-east beach, which borders the military side; the client asked for them here)
   Two rows of covered nursery cages close in, twelve grow-out cages further out, a jetty with a gangway down to a floating walkway. */
/** point `u` metres along the south shore (that is, x) and `f` metres out to sea */
export const south = (u, f) => [u, LANDLINE.south + f];
/** the jetty runs straight out from the shore at x = u; deck top `y`; the gangway drops to the walkway between the nursery rows */
export const JETTY = { u: -138, f0: -8, f1: 40, w: 4.2, y: 0.62, foot: 53, way: 66 };
export const CAGES = {
  small: { r: 12.75, list: [0, 1, 2, 3].flatMap((u) => [-1, 1].map((f) => south(-114 + u * 30, JETTY.way + f * 16.5))) },
  big: { r: 19.5, list: [0, 1, 2].flatMap((u) => [0, 1, 2, 3].map((f) => south(-150 + f * 57, 152 + u * 57))) },
};
/** LFC Hamour, the live fish carrier, lies alongside the west face of the jetty, bow out to sea (its local +x is the bow) */
export const LFC_BERTH = { x: JETTY.u - JETTY.w / 2 - 1.6 - 7, z: LANDLINE.south + 32, ry: -Math.PI / 2 };
export const OVERVIEW = { x: -20, y: 0, z: 90, az: -0.85, pol: 0.98, dist: 900 };
export const CAM_BOX = [-520, 430, -560, 520];
