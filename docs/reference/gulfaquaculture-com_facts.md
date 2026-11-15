# Gulf Aquaculture: facts from gulfaquaculture.com

Crawled 2026-11-14 with curl. Raw HTML is in `html/`, parser scripts in `tools/`.
Everything below is what the client's own site says. "not on the site" = looked for, not published there. Nothing is guessed.

## 0. What the site really has

The site is a small WordPress + Elementor site (server-rendered, no JS-only text). The main nav has **4 items only**: About Us, Our Services, Our Gallery, Contact Us. There are **no** Operations, Assets, Species, Growth, People or News pages.

| Page | URL | Last modified | What is on it |
|---|---|---|---|
| Home | https://gulfaquaculture.com/ | 2026-10-22 | About, Vision & Mission, Our Species, Our Production, species logic, contact (most of the facts) |
| About Us | https://gulfaquaculture.com/about-us/ | 2026-02-03 | Same 4 About paragraphs as Home |
| Our Services | https://gulfaquaculture.com/our-services/ | 2025-03-08 | One line about labs + captioned species photos |
| Our Gallery | https://gulfaquaculture.com/our-gallery/ | 2026-02-03 | 7 photos, no captions |
| Contact Us | https://gulfaquaculture.com/contact-us/ | 2026-02-11 | Email, phone, fax, WhatsApp, PO box, contact form, QR code image |
| Fish Farms in Middle East (not in nav, in sitemap) | https://gulfaquaculture.com/fish-farms-in-middle-east/ | 2024-12-20 | SEO text: fry supply, sustainability, support services |
| Home old (not in nav, in sitemap) | https://gulfaquaculture.com/home-old/ | 2026-01-29 | Old tagline + 3 species captions + background video |

Blog posts / news: the WordPress posts API returns an empty list (0 posts).

How it was collected: the 7 pages above (all pages in the site's sitemap and its public `wp-json` page list), plus the site's public `wp-json` media list for image sizes and a few images that are not placed on a page. The open file listing of `/wp-content/uploads/` was looked at for the dated month folders only; other folders there were not browsed.

## 1. Company

Source: https://gulfaquaculture.com/ and https://gulfaquaculture.com/about-us/ (same text on both)

| Item | Fact (from the site) |
|---|---|
| Name | Gulf Aquaculture |
| Parent | "a subsidiary of the Emirates Consortium LLC ("EmCon")" |
| What they are | Marine fish hatchery company; produces fry of high-value, endemic (local) species for fish farms in the Gulf |
| Founded | "Established in January 2023 on a private island in Abu Dhabi" (pilot hatchery on Balghailam Island) |
| SKMRC | "awarded a long-term lease for the prestigious Sheikh Khalifa Marine Research Centre (SKMRC) in Umm Al Quwain by the UAE Government in November 2025" |
| How they describe SKMRC | "one of the largest and most advanced marine hatcheries in the region"; also "One of the world's largest and most technologically advanced marine fish hatcheries, based at the Sheikh Khalifa Marine Research Centre in Umm Al Quwain, supported by a pilot hatchery on Balghailam Island" |
| Team | "a globally sourced team of leading aquaculture experts" (no names) |
| Business model | Sells fry only: "By supplying fry rather than attempting to operate the full grow-out value chain, we enable marine farms, distributors, and processors to build their operations..." |
| Tagline (home hero) | "Transforming Aquaculture in the Middle East By Pivoting to Local Species" |
| Old tagline (home-old) | "We strive to contribute to the Gulf's marine aquaculture industry by introducing the highest quality Red Snapper and Grouper fry for fish farms in the GCC region" |
| Partners | not on the site (only the parent EmCon and the UAE Government as lessor are named) |
| Certification | "quality certification in process" (home-old and fish-farms page, 2024 text) |
| Legal / trade name | "Gulf Aquaculture, the trade name for Balghailam Fish Farm LLC ... under its holding company Emirates Consortium LLC (EmCon)" (text printed inside the image https://gulfaquaculture.com/wp-content/uploads/2024/10/banner.jpeg, 2024; in the media library, not on a current page) |
| Logo tagline | "FRESH • LOCAL • NATURAL" (printed in the logo on the same 2024 images) |
| 2024 slogan | "Pivoting Middle East Aquaculture to Local Species" (title on image https://gulfaquaculture.com/wp-content/uploads/2024/10/gallery-2.jpeg) |
| Video | The home page embeds one YouTube video: https://youtu.be/QwZ2BvfbzRg (autoplay, loop). Not opened (off the client's domain). |

**Vision** (home): "To be the premier catalyst for a self-sustaining Gulf aquaculture ecosystem. We envision a future where the Arabian Gulf, Oman Sea, and Red Sea are global benchmarks for marine innovation, powered by the natural resilience of indigenous species and cutting-edge ecological stewardship."

**Mission** (home): "Our mission is to fortify regional food security by pioneering the production of high-quality, locally adapted marine fish fry. By bridging the gap between advanced biotechnology and sustainable farming practices, we provide the essential foundation that empowers regional fish farmers to achieve long-term commercial success and environmental harmony."

### Key dates

| Date | Event | Source |
|---|---|---|
| January 2023 | Company established on a private island in Abu Dhabi (Balghailam Island pilot hatchery) | home, about |
| 2024 | "critical industry breakthrough by successfully scaling the production of Orange-spotted Grouper larvae and fry for commercial farms throughout the Gulf" | home, about |
| 2024 | "the hatchery reached a milestone in 2024 with the successful sale of grouper fry to commercial fish farms" | text inside banner.jpeg (2024 image) |
| November 2025 | Long-term lease of SKMRC, Umm Al Quwain, awarded by the UAE Government | home, about |
| ongoing | "actively expanding our Balghailam Island operations to significantly increase fry production capacity" | home, about |

## 2. Facility figures (everything numeric on the site)

| Figure | Value | Applies to | Source |
|---|---|---|---|
| Marine biology laboratories | **16** "high-tech marine biology laboratories" in the Marine Innovation Park | SKMRC | home, about |
| Annual production capacity | **two million larvae** per year | the **pilot** facility (Balghailam Island), not SKMRC | home, about |
| Species produced as fry | 3 groups: Grouper, Red Snapper, Seabream | company | home |
| Hatchery sites | 2: SKMRC (Umm Al Quwain) + pilot hatchery (Balghailam Island, Abu Dhabi) | company | home |
| Areas in m² | not on the site | | |
| SKMRC fry / larvae capacity per year | not on the site | | |
| Number of tanks | not on the site | | |
| RAS systems (count or type) | not on the site (the word RAS is not used) | | |
| Phases (Phase 1 / Phase 2) | not on the site | | |
| Sea cages (number, size) | not on the site (the company says it does not do grow-out) | | |
| Water treatment / plant room / generators | not on the site | | |
| Staff numbers | not on the site | | |

## 3. Operations per stage

Source for all bullets unless noted: https://gulfaquaculture.com/ ("Our production: 01. what we produce / 02. How we produce" and "our Species").

**Whole chain**
- "Fully integrated facilities managing broodstock, live feed systems, larval rearing, nursery conditioning, and dedicated microbiology and virology laboratories."
- "Each batch is reared through broodstock management, larval rearing, and nursery phases within controlled environments."
- "End-to-end hatchery management that minimizes stress, improves survival and predictability, and delivers healthy, high-quality fry to customers."
- "Continuous monitoring and control of water quality parameters such as temperature, salinity, dissolved oxygen, and microbial balance."

**Broodstock (area 06)**
- "Broodstock maintained under controlled environmental conditions to support consistent spawning cycles and preserve genetic diversity."
- Grouper fry "are produced through controlled broodstock, larval, and nursery phases".
- Sea water: at the pilot facility, "a pristine, naturally filtered seawater system sourced from on-site boreholes, ensuring optimal health without reliance on chemical treatments" (this sentence is about the Balghailam pilot hatchery; SKMRC sea water intake: not on the site).
- Tank count, tank size, broodstock numbers: not on the site.

**Hatchery / larval rearing (area 04, 09)**
- "Larval rearing supported by in-house cultures of live feeds, including rotifers, copepods, and microalgae, with continuous microbiological testing for stability and suitability."
- Red Snapper fry "are reared using live feed systems and microbiology monitoring during the larval phase, supporting stable development during the most sensitive stages of early growth."
- 2024: scaled production of Orange-spotted Grouper larvae and fry for commercial farms throughout the Gulf.
- Pilot facility capacity: two million larvae per year. SKMRC larval capacity: not on the site.

**Live feed and algae (area 05)**
- In-house cultures of **rotifers, copepods and microalgae**.
- "continuous microbiological testing for stability and suitability" of the live feeds.
- Artemia: not on the site (not mentioned).
- A home page photo shows tall green/yellow algae culture columns (see photos manifest).

**Weaning and nursery (area 03)**
- "Structured nursery phase with gradual feed weaning, behavioural conditioning, and size grading to ensure uniform and resilient fry."
- Aim (Grouper): "consistent size grading, stable early feeding behaviour, and smooth transfer into nursery tanks or sea cages".

**Grow-out / sea cages (area 10)**
- Gulf Aquaculture does **not** describe its own sea cages. It supplies fry "rather than attempting to operate the full grow-out value chain".
- Grouper "is a high-value species commonly stocked in marine cage systems".
- Red Snapper "adapts well to low-density cage systems and properly managed land-based systems".
- Customers named: "marine farms, distributors, and processors"; "commercial farms throughout the Gulf".
- Number and size of sea cages: not on the site.

**Research labs (area 02)**
- SKMRC "incorporates a unique Marine Innovation Park, featuring 16 high-tech marine biology laboratories."
- "This collaborative ecosystem is designed to attract world-class scientists, fostering groundbreaking research in marine biology and environmental science that will catalyze the sustainable growth of aquaculture across the UAE and the wider region."
- "dedicated microbiology and virology laboratories" (home, How we produce).
- Pilot facility: "supported by a fully integrated water quality and microbiology laboratory".
- Services page (https://gulfaquaculture.com/our-services/): "Highest industry standard labs for fish health and water quality testings".
- "a rigorous, science-driven approach to biosecurity".

**Visitor / education centre (area 01)**
- The site names the building/complex "Marine Innovation Park" (16 labs, "collaborative ecosystem ... to attract world-class scientists"). Two home page photos show the Marine Innovation Park building (round glass building with a white wave roof).
- Education centre, visitor centre, tours, opening hours: not on the site.

**Plant room, generators, Phase 1 (areas 07, 08, 09)**
- not on the site. (Only general line: continuous monitoring and control of temperature, salinity, dissolved oxygen, microbial balance.)

**Services offered to farms** (https://gulfaquaculture.com/fish-farms-in-middle-east/, 2024 text)
- Fry supply produced "under strict biosecurity standards"; personalized consultation on which fry suits a farm.
- "Technical Assistance", "Training Programs" for farm staff, "Research and Development".
- Biosecurity protocols: "monitoring water quality, implementing hygiene practices".

## 4. Species

| # | English name | Local name on site (transliteration) | Scientific name | Where listed | Facts on the site |
|---|---|---|---|---|---|
| 1 | Orange-spotted Grouper | "Hamoor" | *Epinephelus coioides* | home, about, services, home-old | High-value; "commonly stocked in marine cage systems"; "firm texture, strong market pricing, and cultural importance across the GCC and Asia"; native to regional waters, "good resilience to local salinity and temperature ranges"; 2024 breakthrough species |
| 2 | Malabar Red Snapper | "Hamra" | *Lutjanus malabaricus* | home, about, services, home-old | See Red Snapper facts below; fish-farms page: "highly sought after for its flavor and texture" |
| 3 | Mangrove Red Snapper | "Shiqra" | *Lutjanus argentimaculatus* | home, about, services, home-old | See Red Snapper facts below; fish-farms page: "prized for its adaptability and robust growth" |
| 4 | Seabream | not on the site | *Sparus aurata* "and regional warm-water variants" | home only | "prefers slightly cooler temperatures than Grouper and Snapper"; "one of the most commonly farmed marine species in the region"; for "mixed-species production, retail supply chains, and hospitality segments" |
| 5 | Hybrid Grouper | not on the site | Tiger Grouper *Epinephelus fuscoguttatus* x Giant Grouper *Epinephelus lanceolatus* | services page (photo captions only) | No text facts; 2 photos |

Red Snapper (home, "Mangrove & Malabar Snappers, *Lutjanus* spp."): "a hardy warm-water species with favourable growth characteristics, attractive culinary traits, and strong commercial acceptance in Middle Eastern markets"; "adapts well to low-density cage systems and properly managed land-based systems"; "efficient feed conversion and predictable harvest values"; fry reared with live feed systems and microbiology monitoring.

Not on the site for any species: Arabic-script names, size, market weight, growth time, price, fry sizes sold.

Why local species (home, "why local species wins the gulf" / "our species logic"):
- Gulf waters have "high salinity, elevated temperatures, and natural seasonal variation"; local species are adapted to this.
- Suited species have "lower stress levels, improved immune response, and more stable growth performance", giving "higher survival rates, reduced operational complexity, and lower long-term costs".
- Less need for "energy-intensive cooling systems and excessive water treatment".
- Hatchery fry "reduces pressure on wild stocks", "supports food security by shortening supply chains", and "decreases reliance on imported fry".

Things to double check with the client (the site contradicts itself):
- The fish-farms page writes "Orange-spotted Grouper (Hamoor): The Epinephelus fuscoguttatus"; every other page says *Epinephelus coioides* (fuscoguttatus is the Tiger Grouper).
- Two image file names say "orange-spotted-grouper-aka-hamra"; the visible captions say "Hamoor" for grouper and "Hamra" for Malabar Red Snapper.
- Home/about text calls *Lutjanus malabaricus* just "Red Snapper".

## 5. People / leadership

not on the site (no names, no roles, no team page). Only: "a globally sourced team of leading aquaculture experts".

## 6. Contact

| Item | Value | Source |
|---|---|---|
| Head office address | Head Office - 7th Floor, East Tower, Abu Dhabi Mall, P.O. Box 55345, Abu Dhabi, UAE | home (get in touch) |
| Postal address | P.O. Box 55345, Abu Dhabi, United Arab Emirates | contact |
| SKMRC street address / map / coordinates | not on the site (only "Umm Al Quwain") | |
| Phone | +971 2 234 6000 | home, contact |
| Fax | +971 2 234 6001 | home, contact |
| WhatsApp | +971 56 338 6655 (link https://wa.me/+971563386655) | home, contact |
| Email | info@gulfaquaculture.com (decoded from the Cloudflare email-protection code on both pages) | home, contact |
| Website | gulfaquaculture.com | home |
| Contact form | Contact Form 7 form on https://gulfaquaculture.com/contact-us/ | contact |
| QR code | image `wp-content/uploads/2024/10/qr-code.png` on the contact page (target not decoded) | contact |
| Social links (Facebook, Instagram, LinkedIn, X, TikTok) | not on the site | |
| YouTube | No channel link; one embedded video on the home page: https://youtu.be/QwZ2BvfbzRg | home |
| Footer | "© 2024 Gulf Aquaculture. All rights reserved." | all pages |

Ignore: the contact page markup also holds a theme placeholder link `tel:345-922-5588` on the icons; it is not the client's number.

## 7. News

not on the site. There is no news page and the WordPress posts list is empty. The only dated statements are the key dates in section 1.

## 8. Photo notes (details in photos/manifest.json)

- 32 web copies are in `photos/` (WebP, longest side 1400 px or less); originals are in `photos-raw/`.
- The home page section "OUR BEST PORTFOLIO" is one collage image, not separate photos. The four pictures were cut out of the collage, so they are small (about 510 to 705 px wide).
- Photos uploaded in January 2026 (home page) go with the SKMRC text: Marine Innovation Park building (its name sign is readable), white hatchery buildings, algae columns, lab corridor, round tank under blue light. The site gives no captions, so "SKMRC" is taken from the upload date and context.
- Gallery and About photos uploaded in October 2024 are from before the SKMRC lease (November 2025), so they show the Balghailam Island pilot hatchery, not SKMRC (signs "NURSERY TANK N 1 / N 17", shelf label "BROODSTOCK"). The site has no captions for them.
- The sea cage aerial used as the home "About Us" background looks like a stock photo of a cold-water farm, not the client's site. It is kept as `seacages-aerial-stock.webp` and flagged `stock_looking` in the manifest.
- Several photos show visitors whose faces can be recognised (corridor, blue-light tank, tank hall). They are on the client's own site, but the client should OK using them again.
- Left out on purpose: logo, favicon, QR code, two Fishbase distribution maps, two stock underwater fish-school backgrounds (`our-production.jpg`, `...Presentation-2-1.png`), the dark page-title background (`breadcrumb.png`), `banner.jpeg` (same aerial as `pilot-hatchery-aerial` with text printed on it), two event photos in the 4-photo collage (people at a conference, not the facility), and the old home background video `bg-video.mp4` (76 MB; sampled frames show the same drone pass over the pilot hatchery as `pilot-hatchery-aerial`).
