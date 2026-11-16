# SKMRC interactive 3D masterplan

Website for the Sheikh Khalifa Marine Research Centre (Gulf Aquaculture, Umm Al Quwain).
The whole centre is a real-time 3D model: ten areas you can walk into, about 270 things to click, real people at work in every room, an underwater view where every fish can be followed and aged, and a 3D viewer for six native species.

Reference the client asked us to match and beat: `https://kriswa.ae/demos/gulfaquaculture/` (its `3d/` page).
Version 2 (14 November 2026) follows that reference's site plan. Version 1 is kept in `_backup/`.
Version 3 (14 November 2026, later the same day) adds real rigged people, a camera that respects walls, walking with keys or an on-screen stick, dashboards on every screen, printed exhibition panels, a title tag on the selected thing, name plates over every door, an icon list in each area card, far more detailed generator sets and switchgear, and a proper phone layout.
Version 7 (16 November 2026): phone text, buttons, figures and detail sheets fit from 320 px wide, with the model framed above the hero copy. The opening is a continuous 28.8-second gate → Area 08 → complete-site flight, with time-aware camera interpolation, gentle takeoff/landing and one exhibit call-out at a time. Area 08's eight posters are now thin 16:9 TVs with animated photo fish, moving underwater light and English/Arabic titles. Selecting a TV frames the full picture; phone details collapse and expand from the header. These are generated fish animations, not recorded video. The existing fish-photo credits still apply.

Version 7 checks: production build and `tools/check-camera-path.mjs` pass. Chrome screenshots verified at 320×568, 375×667, 390×844, 768×1024, 844×390 and 1440×900; no horizontal page overflow. The complete intro, phone skip, animated TVs, TV framing, tap/expand/scroll/back, reduced motion and no-WebGL fallback pass with no browser errors. Phone sizes are browser emulation; physical devices and Safari were not tested. Previews: [phone](docs/screenshots/v7-phone.png), [fish TV on phone](docs/screenshots/v7-fish-tv-phone.png), [fish TV on desktop](docs/screenshots/v7-fish-tv-desktop.png), [opening on phone](docs/screenshots/v7-intro-phone.png).
Version 6 (16 November 2026): one UAE flag at the gate and one at the drop-off of area 08 (a taller mast and a larger flag) instead of three at each. The opening film now goes from the gate straight to area 08, the Education and Visitor Centre, which stands finished on the blueprint: its roof lifts, what is inside pops up from the floor and nine of its rooms and exhibits are called out one by one with a name tag and a ring of light, then the camera pulls out and the rest of the site fills in as before (roads and services, Phase 1, 2, 3, cages, LFC Hamour), 20.5 s in all. Fish: seven species now wear photographs of the real fish (Shaari, Sobaity, mullet and cobia were drawn before; their pictures are free-licence photographs, credited in `public/fish/CREDITS.md` and in the page footer), with soft cut-out edges, sunlight rippling over their backs, burst-and-glide swimming and small differences in colour from fish to fish. Umm Drais and Naisrah stay drawn (sharper scales, eye and lateral line) until the client confirms which species they are.

Version 5 (15 November 2026, later the same day) rebuilds area 08 to the client's render of the building (a white pebble-shaped shell roof over a curved glass front with the centre's name over the doors, on a raised podium with crescent lawns, steps, a ramp and a glass balustrade, a two-storey wing behind and a bold red wall along the beach), takes out the eight covered nursery cages and the walkway between them, cleans up every road junction (lane lines stop at junctions, rounded kerbs, lawns kept off the roads, no notch at the pump house, no stub into the sand), makes the opening film build the infrastructure first (services, roads, paving, lights) and only then the buildings, lets the hero camera drift slowly like a drone film, and adds the company's own film to the landing page.
Version 4 (15 November 2026, branch `v4-phases-intro-boat`) opens with a film that starts at the gate, where an Emirati host welcomes you, and builds the site from a blueprint phase by phase. The ten areas are grouped and numbered by phase (1, 2, 3). The fish farm moved from the north-east beach (next to the military side) to the south shore in front of Phase 1, with a jetty whose gangway now meets the floating walkway properly. LFC Hamour, the live fish carrier, lies alongside the jetty. Every area has a big LED screen, the UAE flags fly, there are fewer cars and no trees on the beach side, the orange selection brackets are gone, and clicking a fish under water selects its whole group.

## Run it

| Do | Command |
|---|---|
| Install once | `npm install` |
| Work on it | `npm run dev` then open http://localhost:5173 |
| Production build | `npm run build` (output in `dist/`, about 8.2 MB: 3.3 MB site and photos, 4.9 MB people loaded on demand) |
| Check camera motion | `node tools/check-camera-path.mjs` (continuous speed, no overshoot, timing at 24–120 fps, gentle endpoints) |
| Check the build | `npm run preview` then open http://localhost:4173 |
| Deploy | Upload `dist/` to any static host. Not deployed yet. |

Handy links while working: `/#explore` opens straight into the 3D model, `/?nointro` skips the opening film, `/?nogl=1` shows the page without WebGL, and the bare model is at `/dev-world.html` (`?walk=nursery`, `?open=hatchery&area=hatchery&view=inside`, `?night=1`, `?pose=x,y,z,az,pol,dist`).

## What is in it

| Part | What it does |
|---|---|
| Opening film | Starts on the road outside the gatehouse and pushes in to the Emirati host at the name wall (Arabic and English) under the UAE flag, then flies to area 08, whose roof lifts while its rooms and exhibits are called out one by one (`FIRST`, `ISLAND` and the call-out list are at the top of `src/world/intro.js`). The camera rises over a blueprint: road centre lines, then every footprint, draw themselves. Then the site is built the way it really would be: sea water mains and power lines glow on the plan, the roads are paved from the gate inward, the paving flows out to the apron, plazas, lawns and parking, the street lights go up and the red beach wall rises. Only then do the buildings go up, Phase 1, 2, 3: each starts as a glowing slab and rises from the ground with a glowing cut line, a tower crane working beside each phase. The cages surface, LFC Hamour sails in, the trees grow and the camera settles on the hero. 28.8 seconds. Skip button, any scroll or key skips it. Not played for reduced motion, `#explore` or `?nointro` |
| Phases | Phase 1 the original hatchery (area 01), Phase 2 the new hatchery with its plant room and generators (02 to 07), Phase 3 the Marine Innovation Park and the sea (08 to 10). Each tour card names its phase, the first card of each phase opens with a big "Phase N" over the model, the side rail and the dock are grouped P1, P2, P3, the panel header says the phase |
| Hero and scroll tour | The live model behind the headline, with the fish farm and LFC Hamour in front. While the page sits at the top, the camera drifts slowly round the site like a drone film; scrolling flies area to area and lifts each roof |
| The company's film | A dark band, "See the centre at work", between the figures and the company story: a big play button on the client's photo of the building. It opens Gulf Aquaculture's own YouTube film ("An introduction to Gulf Aquaculture", 7 min, the one on gulfaquaculture.com) in a player over the page, from the privacy-enhanced YouTube domain, loaded only when someone presses play. Esc, the cross or a click outside closes it |
| Area 08, the oval hall | Built to the client's render (and the client's photo of the real building): a white shell roof shaped like a pebble, a soft dome with a thick rolled rim that rises and falls round the edge, over a curved glass front with a grid of mullions and two transoms. The centre's name in Arabic (with a small English line) runs on a curved white panel over the doors. The hall stands on a raised podium: crescent lawns in dark-edged planters either side of the entrance court, a glass balustrade round the edge, a broad flight of steps on the axis of the doors, a ramp along the wall beside them, palms on the plaza round it, and three UAE flags. The lab wing behind has an upper floor with a row of small square windows, as in the render. The drop-off loop moved out to make room |
| Roads | Lane lines and edge lines stop short of every junction and roundabout; each road that ends on another has a give-way line and rounded kerbs (asphalt, kerb, walk and edge line follow the curve); lawns are pulled back until they clear every road, kerb, walk and roundabout; the north road runs into the shore road in one smooth bend (no notch by the pump house) and the west road turns into the south road (no stub out into the sand) |
| Explore mode | Orbit, zoom, click a pin or a building |
| Walk in | The default way into an area: the camera comes down, goes in at eye level and the roof stays on. Drag to look round, walk with W A S D (or the on-screen stick on a phone), click a tank or the floor to go there. The camera never passes a wall, and partitions rise to the ceiling |
| Title tag | The selected thing carries its name and three key figures in the model itself. Labels behind a wall are hidden |
| Door name plates | In the walk-in view every room has a name plate over its door (code and name). Click it to go in. A room reached through another one shares that door, one plate above the other |
| Area card | The list of everything in the area sits at the top of the card: an icon tile for each named room or machine, small chips for long runs of numbered tanks |
| Screens | Monitors and control desks show example dashboards. Area 08 has eight 16:9 TVs with animated fish and English/Arabic titles (`exhibit-tv.js`); their shared canvas updates only while visible and nearby, at up to 30 fps desktop / 20 fps phone. Reduced motion keeps a still picture. Other printed posters remain static. |
| LED screens | A big TV-style screen at every area, on the facade that faces the road or on a pylon: area number and name, phase, a rolling key figure, a live trace, a clock, a ticker with the area's facts. Redrawn a few times a second, only when near enough to read. Example data |
| LFC Hamour | The live fish carrier of Jalboot Marine Network (the first in the GCC), modelled from its specification sheet and video: red hull with the name on both bows, white superstructure and wheelhouse with the IMO number, mast and turning radar, four well-tank hatches, crane, three propellers. Click it for the specification (from the PDF) and the photo |
| Fish farm | Off the south shore in front of Phase 1: twelve grow-out cages in three rows (the eight covered nursery cages were taken out). A concrete jetty rises from the shore walk and crosses the rock armour on piles; a hinged gangway drops to a floating landing stage on guide piles, where the work boats tie up. Bollards and fenders on the west face for LFC Hamour |
| From above / Plan | The roof lifts off for a dollhouse view, or a top-down plan with every room named |
| Item panel | Description, the client's photo where there is one, tank card, key figures, example readings. The selected thing gets a soft white ring on the floor (no more orange brackets) |
| Under water | Sea cages, broodstock tanks and the aquarium can be entered below the surface. A bar at the top shows one species at a time |
| Fish card | Click any fish to select its whole group (the school of that species in the cage or tank, one batch of one age): every fish in it gets a soft ring and the card counts them. The camera swims beside the one you clicked. The slider takes the whole group from egg to breeding age; size, length, weight, life stage, group averages and home in the centre follow, with a scale bar |
| Tour | Sweeps over the site, then for each area comes down low, goes inside, looks round and visits two things; at the cages it dives and follows a fish |
| Fly-through, Drone, Night | A one-minute film with captions, free flight with W A S D, lit windows and street lights |
| Sound | A new tap sound on buttons, a two-note chime on selection, and a different bed for outside, tank halls, labs, plant rooms and under water. All made in the browser |
| People and traffic | Real rigged figures: lab staff in gowns and hair nets, technicians in overalls and hi-vis, office staff seated at their desks, school children in the amphitheatre. Most visitors are Emirati: men in white kandura with a white ghutra and black agal, women in black abaya. The Emirati host greets you at the gate and at the visitor centre reception. The visitor centre is kept calm (fewer people). They walk with planted feet, check clipboards, work at tanks, talk and sit. Far away they turn into simple figures. A few cars drive the roads (fewer than before); gulls circle the fish farm. UAE flags fly at the gate and the drop-off |
| Species, cycle, company, contact | Normal page sections. The form opens WhatsApp or email with the message written |

## The ten areas, by phase

| No | Phase | Area | Items | Notes |
|---|---|---|---|---|
| 01 | 1 | Phase 1 Hatchery | 71 | Six buildings: nursery, hatchery, broodstock, offices and stores, plant, power |
| 02 | 2 | Weaning and Nursery | 27 | Six raceways, feed store, biosecure entry |
| 03 | 2 | Larval Rearing Hall | 43 | Thirty tanks, plus the annex: hatchery office and enrichment kitchen |
| 04 | 2 | Live Feed and Algae | 22 | Algae hall, rotifer bay, annex for Artemia and copepods |
| 05 | 2 | Broodstock Building | 21 | Twelve tanks, intake room, pump station by the shore road |
| 06 | 2 | Plant Room | 19 | Adds ozone, degassing tower, heat exchangers |
| 07 | 2 | Generator Room | 9 | Substation kiosk, transformer yard, fire-water tanks |
| 08 | 3 | Education and Visitor Centre | 22 | The client's floor plan inside, turned to run along the shore; outside built to the client's render (oval glass hall, shell roof, podium) |
| 09 | 3 | Research and Administration Wing | 21 | The client's floor plan |
| 10 | 3 | Sea Cage Grow-Out | 17 | Twelve grow-out cages, jetty, gangway and landing stage, LFC Hamour, feed barge, work boat, cameras |

Numbers follow the tour order in `src/data/areas.js`; the roofs, pins, dock and cards all read them from there.

## Where to change things

| To change | Edit |
|---|---|
| Brand, contact details, figures, company story | `src/data/site.js` |
| Phases (names, titles) and which area is in which | `PHASES` and `phase` in `src/data/areas.js` (the order of `AREAS` is the tour order and the numbering) |
| The opening film (timeline, captions, camera keys) | `src/world/intro.js` (`T` holds the timings); the build map, the paving and rising materials and the tower crane in `src/world/intro-build.js` |
| Area 08 outside: shell roof, glass front, name sign, podium, lawns, steps, ramp | `src/world/oval.js`; the outlines (glass, roof, podium) and where the doors face are `OVAL` in `src/world/layout.js` |
| The company's film on the landing page | the `movie` section in `index.html` (YouTube id in `data-movie`), styles at the end of `src/styles/site.css`, the player in `src/main.js` |
| The hero camera drift | `update()` in `src/ui/story.js` |
| The gate: name wall and where the host stands | `GATE` in `src/world/layout.js`; the wall and its sign in `src/world/site.js` |
| LED screens: what they show / where they stand | `src/world/boards.js` (`LIVE` figures) / the list in `buildSite` in `src/world/site.js` |
| Flags | `src/world/flags.js`, placed in `src/world/site.js` |
| LFC Hamour: model and card / where it lies | `src/world/lfc.js` / `LFC_BERTH` in `src/world/layout.js` |
| Fish farm position, jetty, gangway, landing stage | `JETTY`, `CAGES` and `south()` in `src/world/layout.js`; drawn in `src/world/cages.js` |
| Emirati figure (white ghutra) | `ALIAS` and `whiten()` in `src/world/avatars.js` (made from the library's Gulf figure at load time) |
| Names and text of the ten areas | `src/data/areas.js` |
| Species text and facts | `src/data/species.js` |
| How fast each species grows (the age slider) | `src/data/growth.js` |
| Which photo shows in which card | `src/data/photos.js` (files in `public/photos/`) |
| Where buildings, roads and cages stand | `src/world/layout.js` (1.5 m per unit of the reference plan) |
| Land, roads, lawns, parking | `src/world/land.js` (junctions, kerb corners and the fitting of the lawns are worked out from the centre lines in `ROADS`) |
| Halls and their equipment | `src/world/halls.js` (kit of parts in `src/world/equip.js`) |
| Innovation Park rooms | `src/world/park.js` |
| Sea cages, jetty, gangway, landing stage, barge, boats | `src/world/cages.js` |
| Trees, lights, cars, people outdoors, gulls, LED screens, flags | `src/world/site.js` |
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
| 1 | Get a side-view photo. On a plain black or white background it can go straight to step 2. Any other background: cut the fish out first (for example with Apple Vision, `VNGenerateForegroundInstanceMaskRequest`) to a PNG with transparency and use `alpha` in step 2 |
| 2 | `python tools/fishcut.py photo.jpg out/name black|white|alpha flip(0/1) [threshold] [rotate] ` (needs Pillow and numpy). It writes `name.png`, `name.json` and `name_grid.png` |
| 3 | `cwebp -q 88 -alpha_q 100 out/name.png -o public/fish/name.webp` |
| 4 | Read the back and belly line off `name_grid.png` and add an entry to `PHOTO` in `src/world/fish.js`; add the id to `FISH_CUT` in `src/data/photos.js` and the photographer and licence to `public/fish/CREDITS.md` |

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
| Phases | Phase 1 = the original hatchery, Phase 2 = the new hatchery halls with plant room and generators, Phase 3 = Innovation Park and the sea. This grouping is our reading of the plan; the reference demo only names Phase 1, Phase 2 and Phase 4 (sea cages). Confirm. |
| Fish farm position | Moved off the south shore in front of Phase 1, as asked, away from the military side on the north-east. Layout of cages, jetty and gangway is ours, not surveyed. Nothing military is drawn. |
| LFC Hamour | Vessel of Jalboot Marine Network LLC, facts and photo from their specification sheet (LFC final.pdf). Confirm they agree to it being shown at SKMRC and to the photo being used. The model is our illustration. |
| Arabic on the gate name wall | "مركز الشيخ خليفة للأبحاث البحرية", written by us. Needs a native speaker's check, like the exhibition panels. |
| Area 08 outside | Follows the client's render and their photo of the building, not drawings: sizes of the shell, glass and podium, the steps, ramp and lawns are our reading. The name over the doors, "مركز الشيخ خليفة للأبحاث البحرية في إمارة أم القيوين", is copied from the render; needs a native check. The rooms inside still follow the floor plan |
| Nursery cages | Taken out as asked (the eight covered cages by the jetty). Young fish now go from the nursery hall straight to the grow-out cages, starting in a fine-mesh net. Confirm |
| The company's film | Gulf Aquaculture's own YouTube film, the one their website shows. Confirm they are happy for it to play on this site |
| Emirati host | A generic library figure in Emirati dress, not a portrait of anyone. |
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

## Tested, version 4 (15 November 2026, Chrome, M1)

| Check | Result |
|---|---|
| Opening film from the gate to the hero, frame by frame (15.6 s) | Pass: host and name wall, blueprint, Phase 1, 2, 3 rising, cages surfacing, LFC Hamour sailing in, hero text after |
| Skip (button, scroll, key), `?nointro`, `#explore` | Pass |
| Phase banners, phase chips on the cards, rail and dock grouped P1 P2 P3, panel header | Pass |
| Fish farm on the south shore, jetty, gangway meeting the pontoon, LFC Hamour alongside | Pass, looked at close up |
| LFC Hamour card with the PDF facts and photo (credit Jalboot) | Pass |
| LED screens animating, flags flying, Emirati host at the gate and at reception | Pass |
| Under water: click a fish, all 150 of its group ringed, slider grows the whole group, averages update | Pass |
| Selection: soft white floor ring, no orange brackets | Pass |
| Phone width 390: intro caption and skip, hero, dock, sea cages sheet | Pass |
| Not tested | Real phone hardware, Safari, Firefox, sound by ear |

## Tested, version 5 (15 November 2026, Chrome, M1)

| Check | Result |
|---|---|
| Every road junction from above and from the side: lines stop, give-way lines, rounded kerbs, lawns clear, smooth bends at the pump house and the south-west corner | Pass, looked at close up |
| Area 08 from the angle of the client's render, from the front, at the steps and from the beach side; walk-in to the aquarium hall; roof lifted | Pass |
| Fish farm: 8 nursery cages gone, 12 grow-out cages, jetty, gangway, landing stage, LFC Hamour, area 10 card and views | Pass |
| Opening film end to end (19.1 s): infrastructure before buildings, cranes, oval hall built, cages, boat, hero; skip leaves the page as `?nointro` | Pass |
| Landing page: hero drift, film band, player opens and plays the YouTube film, Esc and the cross close it, focus goes back to the button | Pass |
| `npm run build` | Pass |
| Not tested | Real phone hardware, Safari, Firefox, sound by ear |

## How it is built

| Topic | Note |
|---|---|
| Stack | Vite, three.js r187, Lenis, IBM Plex Sans. Buildings, tanks, machines and fish are made in code. The only model files are the people. |
| Walls | Every wall is noted as it is built. The walk-in camera casts a ray as wide as a doorway from the thing you look at back to itself, and stops before a wall, the ceiling or a tall machine. The same list hides labels behind walls and stops you walking through them. |
| Rooms and things | A "zone" (room, office, lab) is entered and looked along; a thing (tank, machine, panel) is looked at from the side with the most clear floor and nobody in the way. |
| Real people | One skinned mesh and one 1536 × 1024 atlas per figure, 53 bones, clips sampled to 16-bit and blended by hand. Walk clips advance with the distance covered, so feet do not slide. At most 44 are skinned at once; the swap distance shrinks if more are near. |
| Screens | Static atlases for dashboards and printed posters; the eight visitor-centre TVs share one animated atlas and one additional draw call. |
| Frames | Each area sits in its own frame (moved and turned). Boxes, poses and people are declared in local metres; picking turns the ray into that frame. |
| Roofs | Each building is two parts: walls up to 1.3 m, and everything above. From above, the top lifts and fades. Walking in, it stays on but stops casting shade, and the glazing turns bright. |
| Walk-in camera | An orbit round the point you stand at, pulled in so it never passes a wall, the ceiling or the aquarium. |
| Fish | Seven species wear photographs (three from the client, four free-licence ones): the cut-out picture on the mid-plane for fins, wrapped round a body lofted from the same outline. Umm Drais and Naisrah are drawn. Light from the surface ripples over their backs, and a fish placed by hand bursts and glides on its own clock. Schools swim in the vertex shader; under water each fish is placed on the CPU. |
| People far away | Seven instanced parts per group, moved every frame: stride, arm swing, lean and reach. |
| Draw calls | About 140 in the overview, 160 to 175 inside a hall or office with people, 18 under water. |
# testone
