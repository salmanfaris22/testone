# SKMRC interactive 3D masterplan

Website for the Sheikh Khalifa Marine Research Centre (Gulf Aquaculture, Umm Al Quwain).
The whole centre is a real-time 3D model: ten areas you can walk into, 279 things to click, real people at work in every room, an underwater view where every fish can be followed and aged, and a 3D viewer for six native species.

Reference the client asked us to match and beat: `https://kriswa.ae/demos/gulfaquaculture/` (its `3d/` page).
Version 2 (14 November 2026) follows that reference's site plan. Version 1 is kept in `_backup/`.
Version 3 (14 November 2026, later the same day) adds real rigged people, a camera that respects walls, walking with keys or an on-screen stick, dashboards on every screen, printed exhibition panels, a title tag on the selected thing, name plates over every door, an icon list in each area card, far more detailed generator sets and switchgear, and a proper phone layout.

## Run it

| Do | Command |
|---|---|
| Install once | `npm install` |
| Work on it | `npm run dev` then open http://localhost:5173 |
| Production build | `npm run build` (output in `dist/`, about 9.5 MB: 3.5 MB site and photos, 6 MB people loaded on demand) |
| Check the build | `npm run preview` then open http://localhost:4173 |
| Deploy | Upload `dist/` to any static host. Not deployed yet. |

Handy links while working: `/#explore` opens straight into the 3D model, `/?nogl=1` shows the page without WebGL, and the bare model is at `/dev-world.html` (`?walk=nursery`, `?open=hatchery&area=hatchery&view=inside`, `?night=1`, `?pose=x,y,z,az,pol,dist`).

## What is in it

| Part | What it does |
|---|---|
| Hero and scroll tour | The live model behind the headline; scrolling flies area to area and lifts each roof |
| Explore mode | Orbit, zoom, click a pin or a building |
| Walk in | The default way into an area: the camera comes down, goes in at eye level and the roof stays on. Drag to look round, walk with W A S D (or the on-screen stick on a phone), click a tank or the floor to go there. The camera never passes a wall, and partitions rise to the ceiling |
| Title tag | The selected thing carries its name and three key figures in the model itself. Labels behind a wall are hidden |
| Door name plates | In the walk-in view every room has a name plate over its door (code and name). Click it to go in. A room reached through another one shares that door, one plate above the other |
| Area card | The list of everything in the area sits at the top of the card: an icon tile for each named room or machine, small chips for long runs of numbered tanks |
| Screens | Every monitor, wall display and control desk shows a dashboard (production, accounts, water quality, alarms, orders, PCR, microscope). The eight exhibition panels are printed in English and Arabic with the client's fish photos. Example data |
| From above / Plan | The roof lifts off for a dollhouse view, or a top-down plan with every room named |
| Item panel | Description, the client's photo where there is one, tank card, key figures, example readings |
| Under water | Sea cages, broodstock tanks and the aquarium can be entered below the surface. A bar at the top shows one species at a time |
| Fish card | Click any fish to swim beside it. A slider takes it from egg to breeding age; its size, length, weight, life stage and home in the centre follow, with a scale bar |
| Tour | Sweeps over the site, then for each area comes down low, goes inside, looks round and visits two things; at the cages it dives and follows a fish |
| Fly-through, Drone, Night | A one-minute film with captions, free flight with W A S D, lit windows and street lights |
| Sound | A new tap sound on buttons, a two-note chime on selection, and a different bed for outside, tank halls, labs, plant rooms and under water. All made in the browser |
| People and traffic | Real rigged figures: lab staff in gowns and hair nets, technicians in overalls and hi-vis, office staff seated at their desks, visitors in local and western dress, school children in the amphitheatre. They walk with planted feet, check clipboards, work at tanks, talk and sit. Far away they turn into simple figures. Cars drive the roads; gulls circle the beach |
| Species, cycle, company, contact | Normal page sections. The form opens WhatsApp or email with the message written |

## The ten areas

| No | Area | Items | Notes |
|---|---|---|---|
| 01 | Education and Visitor Centre | 22 | The client's floor plan, turned to run along the shore |
| 02 | Research and Administration Wing | 21 | The client's floor plan |
| 03 | Weaning and Nursery | 27 | Six raceways, feed store, biosecure entry |
| 04 | Larval Rearing Hall | 43 | Thirty tanks, plus the annex: hatchery office and enrichment kitchen |
| 05 | Live Feed and Algae | 22 | Algae hall, rotifer bay, annex for Artemia and copepods |
| 06 | Broodstock Building | 21 | Twelve tanks, intake room, pump station by the shore road |
| 07 | Plant Room | 19 | Adds ozone, degassing tower, heat exchangers |
| 08 | Generator Room | 9 | Substation kiosk, transformer yard, fire-water tanks |
| 09 | Phase 1 Hatchery | 71 | Six buildings: nursery, hatchery, broodstock, offices and stores, plant, power |
| 10 | Sea Cage Grow-Out | 24 | Eight covered nursery cages and twelve grow-out cages |

## Where to change things

| To change | Edit |
|---|---|
| Brand, contact details, figures, company story | `src/data/site.js` |
| Names and text of the ten areas | `src/data/areas.js` |
| Species text and facts | `src/data/species.js` |
| How fast each species grows (the age slider) | `src/data/growth.js` |
| Which photo shows in which card | `src/data/photos.js` (files in `public/photos/`) |
| Where buildings, roads and cages stand | `src/world/layout.js` (1.5 m per unit of the reference plan) |
| Land, roads, lawns, parking | `src/world/land.js` |
| Halls and their equipment | `src/world/halls.js` (kit of parts in `src/world/equip.js`) |
| Innovation Park rooms | `src/world/park.js` |
| Sea cages, walkway, barge, boat | `src/world/cages.js` |
| Trees, lights, cars, people outdoors, gulls | `src/world/site.js` |
| How people move | `src/world/people.js` (who stands where), `src/world/avatars.js` (the rigged figures and their clips) |
| Which figure plays which job | `CAST` in `src/world/avatars.js` (files in `public/people/`) |
| What is on the screens and exhibition panels | `src/world/screens.js` |
| Room dressing (boards, cabinets, lockers, copier) | end of `src/world/equip.js`, placed in `src/world/park.js` |
| Where the camera may stand | Walls are recorded as they are built (`noteWall` in `shell.js`); a hand-picked spot is `view: P(...)` on an item |
| The underwater view | `src/world/dive.js` |
| Fish shapes and skins | `src/world/fish.js` (`PHOTO` for photo fish, `FISH` for drawn ones) |
| Where you stand when you walk into an area | `walk: P(...)` in each `areas.add({...})` |
| Sounds | `src/ui/audio.js` |
| Page text and sections | `index.html`, styles in `src/styles/` |

### Adding a photo fish

| Step | Do |
|---|---|
| 1 | Get a side-view photo on a plain black or white background |
| 2 | `python tools/fishcut.py photo.jpg out/name black|white flip(0/1) [threshold] [rotate] ` (needs Pillow and numpy). It writes `name.png`, `name.json` and `name_grid.png` |
| 3 | `cwebp -q 88 -alpha_q 100 out/name.png -o public/fish/name.webp` |
| 4 | Read the back and belly line off `name_grid.png` and add an entry to `PHOTO` in `src/world/fish.js` |

### The people

| Step | Do |
|---|---|
| Source | Microsoft Rocketbox avatar library, MIT licence (copy in `public/people/LICENSE-Rocketbox.md`). 17 figures and 12 animation clips for men and for women |
| 1 | Put each figure's `.fbx` and `*_color.tga` in its own folder under a raw folder, the clips in `raw/anim/` |
| 2 | With `npm run dev` running: `node tools/avatars/run.mjs <raw> <out>` (needs `playwright-core` and Chrome). It writes one `.bin` per figure, `anims.bin` and `meta.json` |
| 3 | `python tools/avatars/atlas.py <raw> <out>` then `cwebp -q 80 -alpha_q 90` on each PNG |
| 4 | Copy the `.bin` and `.webp` files to `public/people/` and add the name to `CAST` |

## Check with the client before going live

| Item | Now |
|---|---|
| Logo | A simple drawn mark. Swap in the real logo. |
| Contact details | Email, phone, WhatsApp and head office are the ones on gulfaquaculture.com |
| Number of laboratories | The model and text say 14 (from the reference demo). gulfaquaculture.com says 16. |
| Sea cages | The reference shows grow-out cages as Phase 4. gulfaquaculture.com says the company sells fry and does not run grow-out. Confirm how to present area 10. |
| Seabream species | Our text says Sobaity (*Sparidentex hasta*). gulfaquaculture.com names *Sparus aurata*. |
| Figures (20 million fry, 18,000 m², 26 systems) | From the reference demo. Not on gulfaquaculture.com. |
| Photos | All from gulfaquaculture.com. Five were taken at the first hatchery (Balghailam) and are captioned so. Some show visitors: confirm they may be used. The red snapper picture looks like a stock image. |
| Fish growth by age | Typical published figures for farmed fish, not this hatchery's records |
| Room names in the Innovation Park | Discovery Corners and the building name are from the site signs. Other room names are our labels. |
| Tank counts and equipment per hall | Plausible layouts, not surveyed |
| Readings on tanks and machines | Example values, labelled as such on every card |
| Umm Drais and Naisrah | Scientific names not confirmed, shown as such |
| Position of buildings | Follows the reference site plan, not a survey. The pump station is moved 9 m to clear the road bend. |
| Arabic version | Not built. Fonts and layout are ready for it. |
| Arabic on the exhibition panels | Eight short titles and the centre's name, written by us. Needs a native speaker's check. |
| Dashboards on the screens | Example figures, marked "example data" on each screen |
| The people | Generic library figures, not portraits of staff. Dress follows the client's photos (blue gown, hair net) where the library allows. |

## Tested (14 November 2026, Chrome, M1)

| Check | Result |
|---|---|
| Overview and top-down map against the reference | Same arrangement of land, roads, buildings and cages (compared by eye) |
| Walk-in view in all ten areas | Pass |
| Item click in walk-in and from-above views, exhibition panel card | Pass |
| Dive into a sea cage and a broodstock tank, pick a fish, age slider | Pass |
| Guided tour from the start and from area 10 | Pass, no errors |
| Night inside a hall | Pass |
| Scrolling page: hero, scroll tour, company, species | Pass |
| Phone width 390 | Walk-in, dive and fish card pass |
| Frame time at 1920 × 1080 | 16.7 ms (60 fps) in overview, walk-in, Phase 1 and dive |
| Plan view, fly-through film, drone, an item out in the yard | Pass (smoke test, no errors) |
| Not re-tested in version 2 | Tablet width, reduced motion, `?nogl=1` by eye, sound by ear, Safari and Firefox |

## Tested, version 3 (14 November 2026, Chrome, M1)

| Check | Result |
|---|---|
| Every item view in the nine walk-in areas (255 views, contact sheets) | Camera inside the room, or outside for yard items, in every one. Reception is hand-tuned. A few are close to pipework or a catwalk railing |
| Views that showed only a wall or the roof (Laboratory 8, Discovery Corner 2, open-plan office) | Fixed |
| Real people: standing, working, walking, seated, children | Pass, looked at close up |
| Walk with the on-screen stick at phone size; sheet scrolls; sheet slides down while walking | Pass (6 m walked in the test) |
| Title tag, species filter, drawn-fish thumbnails, icon list at the top of the area card | Pass |
| Door name plates: one for every room in all ten areas; click one in the lab corridor | Pass (went into Laboratory 5) |
| "See it in 3D" buttons in the production cycle list, after leaving and re-entering | Pass. They did nothing useful before: the 3D engine sleeps that far down the page and was not woken |
| Overview, walk, from above, plan, night, dive and fish card, tour into areas 1 and 2 | Pass, no console errors |
| Frame time at 1920 × 1080 | 16.7 ms (60 fps) in overview, office with seated staff, hatchery and dive |
| Production build | Pass. `dist/` 9.5 MB, of which the people are 6 MB and load only when you come close |
| Not tested | Real phone hardware, Safari, Firefox, tablet width, reduced motion, sound by ear, the whole tour to the end |

## How it is built

| Topic | Note |
|---|---|
| Stack | Vite, three.js r187, Lenis, IBM Plex Sans. Buildings, tanks, machines and fish are made in code. The only model files are the people. |
| Walls | Every wall is noted as it is built. The walk-in camera casts a ray as wide as a doorway from the thing you look at back to itself, and stops before a wall, the ceiling or a tall machine. The same list hides labels behind walls and stops you walking through them. |
| Rooms and things | A "zone" (room, office, lab) is entered and looked along; a thing (tank, machine, panel) is looked at from the side with the most clear floor and nobody in the way. |
| Real people | One skinned mesh and one 1536 × 1024 atlas per figure, 53 bones, clips sampled to 16-bit and blended by hand. Walk clips advance with the distance covered, so feet do not slide. At most 44 are skinned at once; the swap distance shrinks if more are near. |
| Screens | Two canvases (16 dashboards, 8 exhibition panels) drawn once; every screen in a building is a quad in one mesh. |
| Frames | Each area sits in its own frame (moved and turned). Boxes, poses and people are declared in local metres; picking turns the ray into that frame. |
| Roofs | Each building is two parts: walls up to 1.3 m, and everything above. From above, the top lifts and fades. Walking in, it stays on but stops casting shade, and the glazing turns bright. |
| Walk-in camera | An orbit round the point you stand at, pulled in so it never passes a wall, the ceiling or the aquarium. |
| Fish | Three species wear the client's photos: the cut-out picture on the mid-plane for fins, wrapped round a body lofted from the same outline. The rest are drawn. Schools swim in the vertex shader; under water each fish is placed on the CPU. |
| People far away | Seven instanced parts per group, moved every frame: stride, arm swing, lean and reach. |
| Draw calls | About 140 in the overview, 160 to 175 inside a hall or office with people, 18 under water. |
# testone
