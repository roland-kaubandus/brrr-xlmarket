# Taxonomy Audit — Agent 3 — Customer Lens (Jobs-to-be-Done)

**Date:** 2026-04-18
**Author:** Agent 3 (customer-lens / JTBD)
**Scope:** XLMarket.eu taxonomy redesign viewed through microbusiness starter archetypes (EE primary, ES secondary), grounded in `docs/research/2026-04-15-b2b-market-research.md`.

---

## 0. Thesis

The v2/v3 taxonomy is **correct but insufficient**. It is a *supply-side* taxonomy — 22 L1s describe what Vevor sells, not what customers are trying to do. XLMarket's actual target customer — the Estonian or Canarian microbusiness founder about to open their first café, auto-detailing bay, landscaping brigade, or tailoring workshop — does not shop "Commercial Refrigeration". They shop "I am opening a café, what do I need to spend €8–15k on to serve the first customer on day one?"

This proposal does not replace the 22 L1 taxonomy. It proposes a **parallel verticals layer** (`/alustajale/[vertical]`, already partially live per the memory file `session_2026-04-17_starter_kits_reimplementation.md`) that is the **primary** entry surface for 60–70% of first-time visitors, while the 22 L1 taxonomy remains the re-order / spare-parts / power-user surface. The two layers share the same product database; they just slice it differently.

The store must be **dual-mode** by construction: vertical/JTBD on top of category/SKU, not in place of it.

---

## 1. Archetypes — Who is actually landing on xlmarket.store?

Below are 7 concrete archetypes derived from EMTAK (EE) and CNAE (ES) registrations, the B2B research doc's sector scoring, and common friction patterns in first-year microbusinesses in the Baltics and Canary Islands.

### 1.1 Jaan, 34 — Landscaping brigade (Tartumaa, EE)

- **Job-to-be-done:** "I have one Ford Transit, one employee, and three signed contracts for summer 2026. I need to be cutting grass on 1 May."
- **Sector / code:** EMTAK 8130 (teenindav tegevus maastiku hooldamiseks).
- **Budget:** €4 000–€7 000 start capital, mostly on Kredex + own savings.
- **First 10 purchases:** ride-on mower or self-propelled mower, string trimmer, hedge trimmer, leaf blower, chainsaw, pressure washer (petrol), small trailer tie-downs, fuel cans + spill tray, PPE kit (helmet, ear defenders, gloves, chainsaw trousers), wheelbarrow + basic hand tools.
- **Decision criteria:** in order — (1) "will it arrive before first job?", (2) price, (3) spare parts availability in 12 months, (4) warranty realism. Brand is secondary *because* Husqvarna is out of reach at this stage.
- **Channel behaviour:** Googles "muruniiduk + ettevõttele soodne", reads Facebook "Maastikuhoolduse ettevõtjad Eestis" group threads, price-compares on hind.ee. Expects Estonian-language checkout.
- **Trust blocker:** petrol equipment reliability and parts. A Vevor ride-on that breaks in June = lost contract.

### 1.2 Liis, 29 — Café / espresso bar (Tallinn Kalamaja or Kadriorg)

- **JTBD:** "I rented 40 m² on 1 March, opening day is 1 May. I have Leader funding approved for equipment."
- **Sector / code:** EMTAK 56301 (baaride tegevus) / 56101.
- **Budget:** €12 000–€25 000 equipment, VAT reclaimable via KMD.
- **First 12 purchases:** 2-group espresso machine, grinder-on-demand, knock box + tamper set, water softener, refrigerated underbar, ice machine (small 25–40 kg/day), chest freezer, dishwasher (undercounter), prep table with sinks (2-compartment), POS + card reader stand, café tables + chairs (8–12 seats), takeaway cup dispenser + waste station.
- **Decision criteria:** (1) will the health inspector accept it? (HACCP, stainless, drain), (2) does the espresso machine have a name her barista recognises (Nuova Simonelli / Sanremo > Vevor), (3) power: 3-phase vs 1-phase, (4) delivery window hitting fit-out, (5) price.
- **Channel behaviour:** Instagram references (saves café interiors), asks roaster supplier for machine recs, uses asitek.ee / maxima.com/ee for reference pricing, lands on XLMarket from Google Ads on "jäämasin kohvikule" or "café setup Eesti".
- **Trust blocker:** espresso machine brand credibility. She **will not** buy the espresso core from Vevor, but she *will* buy ice maker, underbar fridge, chest freezer, dishwasher, tables, and waste station — that is €4–6k of basket XLMarket can genuinely win.

### 1.3 Marko, 41 — Auto detailing bay (Pärnu or Rakvere)

- **JTBD:** "I am leaving my mechanic job to open a one-bay detailer. Wash + interior + ceramic."
- **Sector / code:** EMTAK 45200 (sõidukite hooldus ja remont).
- **Budget:** €5 000–€9 000.
- **First 10 purchases:** petrol pressure washer (180–220 bar), foam cannon, wet-dry vacuum, steam cleaner, rotary polisher + pads kit, water deioniser, air compressor (50–100 L), floor jack + axle stands, LED work lamps (rechargeable), parts washer / drip tray.
- **Decision criteria:** (1) pressure washer PSI at the hose (not the pump), (2) Vevor vs Kärcher in real wear, (3) delivery time before rent runs hot, (4) parts availability, (5) VAT invoice.
- **Channel behaviour:** YouTube ("Vevor pressure washer 1 year later"), Facebook groups "Automehed Eestis", Auto24 banners. Google "survepesur autotöökojale".
- **Trust blocker:** Kärcher brand moat + spare parts. XLMarket wins on total bay cost if it can bundle the peripherals even if the main pressure washer is a draw.

### 1.4 Reet, 38 — Bakery / pagariäri (Viljandi, takeaway + online)

- **JTBD:** "I sell croissants and sourdough at farmer's markets. I want to open a small production kitchen and keep the market + add takeaway."
- **Sector / code:** EMTAK 10711 (leiva ja värskete pagaritoodete tootmine).
- **Budget:** €8 000–€18 000.
- **First 12 purchases:** convection oven (10-tray or 6-tray), spiral mixer (10–20 L), dough sheeter (small), proofer cabinet, retarder, work tables (stainless), ingredient bins, refrigerated display counter, bread slicer, dishwasher, packaging/sealing machine, labelling printer.
- **Decision criteria:** (1) oven consistency at 220 °C across trays, (2) 3-phase availability in her unit, (3) parts + service, (4) HACCP compliance, (5) price.
- **Channel behaviour:** Facebook "Kodumeistrid ja väiketootjad", Toiduliit newsletter, Google "konvektsioonahi pagari", haktek.ee for reference.
- **Trust blocker:** ovens are *the* reliability-critical item; she will pay more for a known brand. Again, everything around the oven — tables, bins, sealers, labellers, dishwasher — is open space for XLMarket.

### 1.5 Andres, 45 — Metal / welding shop (Keila or Narva)

- **JTBD:** "I have a garage at home, I want to go FIE and take gate/railing jobs."
- **Sector / code:** EMTAK 25110 (metallkonstruktsioonide ja -detailide tootmine).
- **Budget:** €3 000–€6 000.
- **First 10 purchases:** MIG/MAG welder (200–250 A), plasma cutter, angle grinder + discs pack, welding table, welding curtain, welding helmet (auto-darkening) + gloves, band saw or chop saw, bench vice, magnetic clamps, extraction fan / welding fume kit.
- **Decision criteria:** (1) duty cycle at advertised amps, (2) consumable availability (MIG tips, nozzles, wire), (3) actual vs marketing specs, (4) warranty.
- **Channel behaviour:** Keevitus.ee, Gitana, Facebook "Keevitajad Eestis", YouTube teardown reviews of Vevor welders.
- **Trust blocker:** duty cycle / amperage honesty. XLMarket must show measured specs, not box labels.

### 1.6 Sander, 31 — Laser + personalisation side-business

- **JTBD:** "I want to make personalised wooden boards, tags, wedding gifts, pet tags."
- **Sector / code:** EMTAK 32990 (mujal liigitamata tootmine) / 74100 (disainiteenused) as FIE.
- **Budget:** €800–€2 500.
- **First 8 purchases:** diode or CO₂ laser engraver (60–80 W), rotary attachment, honeycomb bed, extraction fan + ducting, fire extinguisher (ABC), acrylic / MDF / basswood stock, laser-safe masking, engraving software (not XLMarket scope).
- **Decision criteria:** (1) bed size vs workshop size, (2) software (LightBurn compatibility), (3) safety (enclosure, extraction), (4) community reviews.
- **Channel behaviour:** Reddit r/lasercutting, YouTube, Etsy seller forums. Enters XLMarket via "laser graveerija EU lattu".
- **Trust blocker:** Vevor here is actually *advantaged* — Lasermeister starts at €5k+, so there is no Estonian mid-range. Sander is XLMarket's easiest conversion. See research §3.3.

### 1.7 Carmen, 36 — Canarian limpieza / cleaning contractor (Tenerife Sur)

- **JTBD:** "Empiezo mi empresa de limpieza post-obra y vacacional. Tengo dos empleadas."
- **Sector / code:** CNAE 8121 (limpieza general de edificios) / 8122.
- **Budget:** €3 000–€6 000.
- **First 10 purchases:** petrol or electric pressure washer, industrial wet-dry vacuum, scrubber-dryer (small), window cleaning kit (telescopic + squeegee), microfibre system, chemical dispenser, ladder, janitorial trolley + mop buckets, PPE, transport van racking.
- **Decision criteria:** (1) Spanish-language checkout and support, (2) 220 V Canarian mains compatibility, (3) delivery to Tenerife (not all EU sellers do), (4) VAT/IGIC invoice for Hacienda.
- **Channel behaviour:** Google ES "hidrolimpiadora profesional empresa", WhatsApp peer groups, Milanuncios. Expects Spanish UI.
- **Trust blocker:** shipping cost to the Canary Islands + IGIC (7 % instead of IVA 21 %) — a European VAT receipt is useless locally. XLMarket needs an ES-compliant invoice variant.

(Two more secondary archetypes worth listing but not expanding: **Tõnu**, small-farm owner (EMTAK 0113/0150) buying fuel transfer pumps and pressure washer for tractor; **Eva**, seamstress opening alteration shop (EMTAK 95290) buying industrial sewing machine + steam iron + pressing table — though note Vevor sewing range is thin.)

---

## 2. Starting-vertical catalogue — top 24 verticals XLMarket can serve

Filter criteria applied: (a) EMTAK or CNAE code exists with first-year registrations >50/year in EE or >200/year in ES, (b) Vevor catalogue covers ≥60 % of the starter kit, (c) sector score ≥4.5 in the B2B research doc or clear adjacency.

| # | Vertical (ET) | Vertical (ES) | EMTAK / CNAE | Research alignment |
|---|---|---|---|---|
| 1 | Kohvik / espressobaar | Cafetería / bar de especialidad | 56101 / 56301 · 5630 | HoReCa #1 |
| 2 | Väike restoran / bistroo | Restaurante pequeño | 56101 · 5610 | HoReCa #1 |
| 3 | Pagariäri / kondiitri | Panadería / pastelería | 10711 · 1071 | HoReCa #1 + Printing (labels) |
| 4 | Tänavatoit / food truck | Food truck | 56101 · 5610 | HoReCa #1 |
| 5 | Catering / eine-teenus | Catering | 56210 · 5621 | HoReCa #1 |
| 6 | Maastikuhooldus / haljastus | Jardinería / paisajismo | 8130 · 8130 | Outdoor Power #5 |
| 7 | Lumetõrje + kinnistuhooldus | Mantenimiento de fincas | 8130, 8129 | Outdoor Power |
| 8 | Autopesula / detailing | Detailado de coches | 4520 · 4520 | Auto #4 + Cleaning |
| 9 | Väike autoremont / rehvitöökoda | Taller mecánico / neumáticos | 4520 · 4520 | Auto #4 |
| 10 | Keevitus- / metallitööd | Taller de soldadura | 25110 · 2511 | Welding |
| 11 | Laser + personaliseerimine | Grabado láser / personalización | 32990, 74100 · 3299 | Laser #2 |
| 12 | Puidutöö / väiketisler | Ebanistería / carpintería | 16290 · 1629 | Woodworking |
| 13 | CNC / maker pood | Taller maker / CNC | 32990 · 3299 | Laser/CNC #2 |
| 14 | T-särgid + vinyl print | Serigrafía / vinilo textil | 18129 · 1812 | Printing #3 |
| 15 | Siidit​rükk / promo | Impresión promocional | 18129 · 1812 | Printing #3 |
| 16 | Mesindus + toidupakendamine | Apicultura + envasado | 0149 / 10890 · 0149 | Packaging #3 |
| 17 | Kosmeetika / käsitööseep | Cosmética artesanal | 20420 · 2042 | Packaging #3 |
| 18 | Ilusalong / juuksur | Peluquería / salón | 96021 · 9602 | Salon (watch-list) |
| 19 | Küünetehnika / küünesalong | Manicura / uñas | 96022 · 9602 | Salon |
| 20 | Massaaž / spa | Masaje / spa | 96040 · 9604 | Salon |
| 21 | Puhastusteenus (üldine) | Empresa de limpieza | 81210 · 8121 | Cleaning #7 |
| 22 | Pakiteenus / fulfilment pisike | Micro-fulfilment | 52100 · 5210 | Warehousing |
| 23 | Väike farm + kanalad | Explotación pequeña / aves | 01470 · 0147 | Outdoor Power (pet+livestock) |
| 24 | Haagis-sauna / mobiilne hoolitsus | Sauna móvil | — (FIE) / — | Adjacency (HVAC + boating heaters) |

Each of the 24 gets a dedicated landing page (`/alustajale/kohvik`, `/alustajale/autopesula`, etc.), a starter kit bundle, and a **named curator voice** (see memory `feedback_ai_tone_estonian.md` — "tagasihoidlik, huumoriga kaasa").

---

## 3. Starter kits — concrete category building blocks

For each vertical, an 8–15 item list of *v3 L2 category handles* that make up the starter kit. This is intentionally phrased as categories, not SKUs — the landing page renders the current top-3 products per category, so the kit stays fresh as catalogue rotates.

### 3.1 Kohvik (café)
1. `bar-beverage-service` — espresso machine, grinder
2. `commercial-refrigeration` — underbar + chest freezer
3. `commercial-refrigeration` → ice machine subslug
4. `commercial-sinks-washdown` — 2-compartment + handwash sink
5. `commercial-cooking-equipment` — panini grill, small induction
6. `food-preparation-equipment` — blender, toaster, soup kettle
7. `restaurant-furniture` — tables, chairs, stools
8. `restaurant-storage-shelving` — dry storage
9. `cash-handling` (under Printing/Packaging) — cash drawer, receipt printer stand
10. `waste-recycling` — separated bins
11. `kitchen-hvac-air-curtains` — entrance air curtain, hood
12. `cleaning-janitorial` — mop, bucket, chemical dispenser

### 3.2 Pagariäri (bakery)
1. `commercial-cooking-equipment` → convection / deck oven
2. `food-preparation-equipment` → spiral mixer, dough sheeter
3. `commercial-refrigeration` → retarder, proofer
4. `restaurant-storage-shelving` → ingredient bins, trays
5. `commercial-sinks-washdown`
6. `packaging-sealing-equipment` → bag sealer, shrink wrap
7. `label-makers-printers`
8. `restaurant-furniture` → display counter if takeaway
9. `kitchen-hvac-air-curtains`
10. `ppe` (flour mask, gloves)
11. `cleaning-janitorial`

### 3.3 Maastikuhooldus (landscaping brigade)
1. `outdoor-power-equipment` → mower, trimmer, chainsaw, blower
2. `pressure-washers`
3. `garden-tools-landscaping-supplies`
4. `fuel-transfer-pumps` + cans
5. `ppe` → helmet, ear defenders, chainsaw trousers, gloves
6. `truck-cargo-accessories` → straps, tie-downs
7. `outdoor-power-equipment` → hedge trimmer
8. `workbenches-tool-storage` → van/garage
9. `jacks-lifting` (for mower maintenance)
10. `tool-storage-cases`

### 3.4 Autopesula / detailing
1. `pressure-washers` (with cross-ref from Cleaning)
2. `industrial-vacuums`
3. `car-detailing-care` → polisher, pads, foam cannon
4. `commercial-sinks-washdown` → deioniser tank
5. `air-compressors-pneumatic` → blow gun
6. `ppe`
7. `floor-care-equipment`
8. `waste-recycling` → chemical-safe
9. `commercial-industrial-lighting` → LED work lamps
10. `workbenches-tool-storage`
11. `cleaning-janitorial` → chemicals, microfibre system

### 3.5 Keevitus-/metallitöö
1. `welding-cutting`
2. `welding-safety-apparel`
3. `angle-grinders-metal-cutting-tools`
4. `metal-lathes-mills` (for those scaling up)
5. `hydraulic-press-equipment`
6. `fans-ventilation` (from HVAC — fume extraction)
7. `workbenches-tool-storage`
8. `measuring-layout-tools`
9. `industrial-shelving-racking`
10. `commercial-industrial-lighting`
11. `ppe`
12. `generators-portable-power` (if off-grid site work)

### 3.6 Laser + personaliseerimine
1. `co2-laser-engravers-cutters` or `diode-laser-engravers`
2. `laser-cnc-accessories` → rotary, honeycomb
3. `fans-ventilation` → extraction
4. `ppe` → laser-safety goggles (spec-specific)
5. `workbenches-tool-storage`
6. `signage-display` → material stock staging
7. `cleaning-janitorial` → lens cleaning
8. `air-quality-purification` → HEPA filter

### 3.7 T-särgid + vinyl
1. `screen-printing-heat-press`
2. `vinyl-cutters-plotters`
3. `workbenches-tool-storage`
4. `restaurant-storage-shelving` (as stock shelving) — or Industrial Shelving
5. `signage-display`
6. `label-makers-printers`
7. `packaging-sealing-equipment`
8. `cash-handling`

### 3.8 Ilusalong
1. `barber-salon-chairs`
2. `shampoo-stations-salon-furniture`
3. `personal-care-appliances`
4. `manicure-nail-equipment` (if combined)
5. `commercial-industrial-lighting` → salon LED
6. `interior-lighting`
7. `restaurant-furniture` (waiting area — cross-ref)
8. `cleaning-janitorial`
9. `air-quality-purification` → HEPA for nail/chemical
10. `waste-recycling` → hair + chemical

(Remaining verticals 3.9–3.24 follow the same pattern. Full matrix lives in `/alustajale/<slug>.json` fixtures so Tarmo / ops can edit without code changes.)

---

## 4. Dual-mode navigation — how `/alustajale`, `/arikliendile`, `/hooldus`, and category surfaces coexist

### 4.1 The two modes

| Mode | Mental model | Example query | Surface |
|---|---|---|---|
| **Mode 1 — Browse / Task** | "I know what I need." | "belt sander 150 W" | 22-L1 taxonomy, search, filters |
| **Mode 2 — Vertical / JTBD** | "I'm starting X." | "avan kohviku" | `/alustajale/<vertical>`, `/arikliendile`, starter kits |

Both must render cleanly from the same product corpus. Neither should mask the other.

### 4.2 URL layout

```
/                                 homepage — split hero: "Browse" + "Start a business"
/kategooriad                      L1 grid (22 tiles) — Mode 1 entry
/kategooriad/[slug]               L1/L2 listing — Mode 1
/toode/[handle]                   PDP
/alustajale                       vertical grid (24 tiles) — Mode 2 entry
/alustajale/[vertical]            starter-kit landing — Mode 2
/arikliendile                     B2B landing (VAT, quote, financing) — cross-mode
/hooldus                          consumables & spares — re-order surface
```

`/haru/[slug]` (legacy ET slug) should 301 to `/kategooriad/<en-slug>` per Agent 1 and Agent 2. One canonical URL per category.

### 4.3 Cross-mode linking contract

Every vertical landing page includes a "Too palju ostmiseks? **Sirvi kategooriaid ise**" escape into Mode 1. Every category page includes a "Avad uut äri? **Vaata stardikomplekti**" chip when ≥2 of its products appear in any verticals' kit. This is the mechanism that prevents the two modes from isolating.

### 4.4 Header IA

```
Logo | Sirvi (mega menu) | Alustajale ▼ | Ärikliendile | Hooldus | [search] | Cart | Account
                                    │
                                    ├─ Toitlustus (Kohvik, Restoran, Pagariäri, Catering, Food truck)
                                    ├─ Teenindus (Maastikuhooldus, Autopesula, Puhastus, Sauna)
                                    ├─ Tootmine (Keevitus, Laser, Puidutöö, CNC, T-särgid)
                                    ├─ Ilu & Heaolu (Salong, Küünesalong, Spa)
                                    └─ Muu (Farm, Mesindus, Kosmeetika, Fulfilment)
```

24 verticals grouped into 5 persona clusters in the nav dropdown. Clusters correspond to the research's sector groupings (HoReCa, Services, Manufacturing, Beauty, Agriculture/Other).

### 4.5 Search behaviour per mode

- Mode-1 search box: unchanged MeiliSearch-direct pattern (`/meili/indexes/products/search`). Returns SKUs.
- Mode-2 vertical slug recognition: `q="kohviku avamine"` → highlight `/alustajale/kohvik` as the top "suggestion" card **above** product results. Implementation: a 24-row keyword table in `lib/vertical-aliases.ts`. No additional index work.

---

## 5. Landing-page patterns — what each vertical collection page MUST contain

Every `/alustajale/<vertical>` page (`HomepageShell`-style, per memory `session_2026-04-17_homepage_v3.md`) renders six mandatory sections:

### 5.1 Hero
- One line statement of the JTBD. Example ET: "Avad kohviku. Siit saad köögiseadmed, mööbli ja tarvikud." Not a slogan. Not a sales pitch. Estonian understatement (see memory `feedback_ai_tone_estonian.md`).
- Real photo (atmospheric, not rendered) of the vertical's environment. Memory references the existing 24 nano-banana atmosphere images in `data/category-icons/` — reuse.

### 5.2 Starter kit (the kit itself)
- Grid of 8–15 kit items, each a card with: category icon, category name, first-product thumb and price, price range, "Vaata kõiki" link into Mode 1.
- Sum total at bottom ("Täiskomplekt alates €X"). Updates live from MeiliSearch.
- "Lisa kõik korvi" button (creates a basket pre-filled with one median-price product per category — a real conversion lever, not a gimmick).

### 5.3 FAQ (vertical-specific)
Hard questions only. Examples for `/alustajale/kohvik`:
- Kas Vevor espressomasinad on HoReCa-kõlblikud? (honest answer: grupp vaja tunnistatud brändilt, ümber saab Vevorist).
- Mis 3-faasi nõuded?
- Kuidas käib HACCP + stainless sertifikaat?
- Kas teile on eestikeelne käitusjuhend?
- Mis saab kui seade katki? Garantii, hooldus, varuosad.

5–8 questions per vertical, drafted per research findings. Not AI-generated boilerplate.

### 5.4 Financing & VAT
- KredEx ettevõtlusalustaja link + one-line summary.
- Leader (MAK) info for rural verticals (landscaping, farm, food producer).
- Estonia VAT reclaim note (KMD, 24 % from 2026 per memory `feedback_vat_24_tax_inclusive.md`).
- Spain note for CNAE verticals: IGIC vs IVA for Canarian buyers.
- Invoice options: "ettevõttele" toggle at checkout, reg-kood + KMKR number capture.

### 5.5 Delivery & installation reality
- Explicit shipping windows per kit item (most 3–7 days per CLAUDE.md gotchas).
- "Paigaldust ei tee" disclaimer. Recommend trusted local partners (Electrolux service for ovens, etc.) — not a competitor reveal, a trust signal.
- Return policy plain-text — "14 päeva, katkine toode asendame, paigaldatud seadet ei saa tagastada."

### 5.6 "Teised alustajad küsivad" / social proof
- 2–4 actual or synthesized-but-flagged-as-such first-customer stories. If synthesized, label as such ("näide"). Per memory `mock_data_keelatud` — do not fake testimonials.
- If no real stories yet: show "Sa oled üks esimesi. Kirjuta meile + saad -5% starter-kit'ilt" — convert the honesty into leverage.

### 5.7 Cross-mode escape
- Persistent "Sirvi kõiki kategooriaid ise" button in right-rail.
- Breadcrumb: `Avaleht > Alustajale > Kohvik` (not through the 22-L1 taxonomy).

---

## 6. Trust blockers unique to the first-time microbusiness buyer

The Vevor brand is unknown in the Baltics. The buyer has never bought B2B online before. The payment is €5–20k — large enough that one return killing the cashflow is a real fear. Ignoring this wrecks conversion regardless of taxonomy quality.

| # | Blocker | Mitigation at taxonomy / landing level |
|---|---|---|
| B1 | "Who is Vevor? Will this be junk?" | About page co-linked from every starter kit. Real teardown videos embedded. Honest sector positioning: "Vevor on hea valik kõrvalseadmetele. Peaseadme (espressomasin, ahi) puhul soovitame tunnustatud brändi." Research §3.1 confirms this is factually right. |
| B2 | "What if it breaks?" | Every PDP + every starter kit shows spare parts availability flag, warranty in plain EE. `/hooldus` is a first-class surface in the header, not buried. |
| B3 | "Is CE real?" | Link to `docs/compliance` with CE declarations for the top 50 starter-kit SKUs. Research §7.2 flagged TTJA risk — preempting builds trust. |
| B4 | "Can I get a VAT invoice?" | Checkout "ärikliendile" toggle + company field. Shown on every starter-kit hero banner. |
| B5 | "What if it doesn't arrive for my opening?" | Delivery window per item on the kit card. Express option for ≤3 day delivery on 50 fastest-moving SKUs (keep a local buffer per memory `Lahendus: kohalik laovaru populaarsemate toodete jaoks`, research §7.4). |
| B6 | "My barista/inspector will not accept this brand." | Honesty: say which categories *are not* a Vevor-first recommendation. Link to Asitek / Haktek for the core espresso machine. Losing a €2k espresso sale keeps a €5k basket — worth it. |
| B7 | "Estonian language?" | Every starter-kit page, FAQ, and key PDP has ET. Consumer manuals translated for top 100 SKUs (per `session_2026-04-14_ssr_fix.md` direction). ES equivalent for Canarian verticals. |
| B8 | "I do not know what I need." | That is literally what `/alustajale/<vertical>` is for. This is the product. |
| B9 | "Am I going to be sold to?" | Memory `feedback_ai_tone_estonian.md` — tagasihoidlik, ei müü, ei ole Copilot. Every AI/chat surface must hold this tone. |
| B10 | "Where do I get financing?" | Section 5.4 — KredEx, Leader, bank. Not a promo, just a link. |

Each blocker has a visible signal on the vertical landing page. Taxonomy alone cannot solve them, but if the landing page architecture has slots for them, they get built.

---

## 7. Taxonomy implications — what the customer lens demands of L1/L2/L3 and of the verticals layer

### 7.1 Keep the 22 L1 structure

Both Agent 1 and Agent 2 concluded the v3 22 L1 is structurally sound. The customer-lens view confirms this: every starter kit above maps cleanly into existing v3 L2s. The structure serves Mode 1 (Browse / Task) well.

### 7.2 L2 must live in the database

Agent 1's §2.3 (L2 DB seeding) and Agent 2's §2.4 (132-row L2 fixture) are **prerequisites** for starter kits to render. Kit items reference L2 handles; if L2 is only static in `taxonomy-v3.ts`, kit landing pages can only link to L1 (too coarse). Every starter-kit card must link to L2.

### 7.3 A parallel "verticals" layer

Add a top-level concept that is **not** a category but a **persona × job**:

```
storefront/lib/verticals.ts
├── export interface VerticalDef {
│     slug: string                  // "kohvik"
│     names: { et, en, es }
│     cluster: "toitlustus" | "teenindus" | ...
│     emtak: string[]                // ["56101", "56301"]
│     cnae: string[]                 // ["5610", "5630"]
│     kitItems: KitItem[]            // 8–15 L2 handles + optional filters
│     faqRef: string                 // markdown path
│     hero: { image, tagline_et, tagline_en, tagline_es }
│     financing: FinancingRefs
│     reliabilityNotes: CoreItemBrandAdvice[]
│   }
└── export const VERTICALS: VerticalDef[] = [...24]
```

This is **not** a Medusa category. It is a curated view. Rationale:
- Verticals overlap (café + food truck share 70 % of items) — categories must be disjoint.
- Verticals evolve (new EMTAK codes, seasonal bundles); recategorising products every time is wrong.
- A vertical is editorial: it needs FAQs, financing notes, tone — things categories do not have.

### 7.4 MeiliSearch schema addition (minimal)

Add to each product document:
- `verticals: string[]` — the list of vertical slugs this product's L2 contributes to. Computed at index time from `VERTICALS[].kitItems[].l2Slug`. No DB migration; just a join at indexing.

This lets `/alustajale/<vertical>` pages query MeiliSearch with `filter: "verticals = kohvik"`, consuming the existing direct-from-browser pattern (memory `lib/meilisearch.ts`). Zero backend load.

### 7.5 L3 policy

Agent 1 §5.2 Q2 asked whether L3 needs DB presence. Customer lens answer: **L3 only matters in Mode 1**, and only where the L2 has ≥50 products *or* the vertical kit distinguishes between two L3s (e.g., diode vs CO₂ laser in Laser/CNC kits). Rule of thumb:
- L2 always in DB.
- L3 in DB when (a) L2 >50 products, or (b) verticals kit needs it to distinguish.
- Everything else stays as MeiliSearch facets.

### 7.6 Handle-drift guardrails for verticals

A vertical kit that references `commercial-refrigeration/ice-machines` breaks silently if that L3 is renamed. Require:
- Unit test in `test/verticals.test.ts` that every `kitItems[].l2Slug` resolves to a live Medusa category.
- CI gate on this test before deploy (memory `project_next_session_taxonomy_cleanup.md` — align branches.ts already half-done here).

### 7.7 Slug language policy

Agent 1 and Agent 2 disagree slightly on ES URLs. Customer lens resolves: **vertical slugs are localised per locale** (because the vertical label is what the customer Googles), while **category slugs stay English**.

- `/et/alustajale/kohvik` — ES would be `/es/empezar/cafeteria`, EN `/en/start/cafe`. 24 slugs × 3 languages is tractable editorially.
- `/et/kategooriad/horeca-food-service` — EN slug everywhere (Agent 1 §2.5).

The vertical is a marketing surface; the category is an infrastructure surface. Treat them accordingly.

### 7.8 `/hooldus` surface

Memory says `/hooldus` already exists (`session_2026-04-17_starter_kits_reimplementation.md`). Customer lens implication: `/hooldus` is the **re-order surface** — consumables, spare parts, filters. It must be reachable from:
- Every PDP ("Selle toote tarvikud").
- Every starter kit page ("Pärast avamist vajad ka neid tarvikuid").
- The header (already there).

`/hooldus` primarily filters by `category_handles` matching consumable L3s (e.g., `coffee-grinder-burrs`, `espresso-filters`, `laser-lens`, `welding-consumables`). This requires those L3s to be real categories in the DB — reinforcing §7.5.

---

## 8. What this means for the next sessions

Concretely, in priority order:

1. **Ship Agent 1 / Agent 2's Tier A + Tier B** — the 22-L1 clean-up and L2-in-DB seeding are prerequisites for starter kits to render cleanly.
2. **Ratify the 24-vertical list** with Risto and Tarmo — the list above is research-derived but needs business sign-off (specifically: cut or expand, prioritise).
3. **Build the `VERTICALS` fixture** (`lib/verticals.ts`) and the `/alustajale/[vertical]` template (HomepageShell-style) against 3 pilot verticals — café, landscaping, auto-detailing. These three have the strongest first-year registration rates in EE and the highest Vevor catalogue coverage.
4. **Wire the starter-kit "add all to cart" action.** The product-page/cart infrastructure is already live (memory); this is a Mode-2 specific action that must bundle kit items with a 5 % discount code, driving the single most important conversion metric on the vertical surface.
5. **Replicate to the other 21 verticals** over 6–8 weeks, 3–4 per week, using the 3-pilot template.
6. **Translate to ES** only once 3 EE verticals hit 1 % conversion baseline. Until then, the ES surface is blocker-reduction only: IGIC invoice, Canary Islands shipping badge, Spanish search.

---

## 9. Summary — one paragraph

The 22-L1 taxonomy survives the customer lens intact. What the customer lens adds is a *parallel verticals layer* — `/alustajale/<vertical>` with 24 starter-kit landings driven from a single `VERTICALS` fixture that references L2 category handles — and seven landing-page patterns (hero, kit, FAQ, financing, delivery, social proof, cross-mode escape) grounded in the actual fears of a first-time Estonian or Canarian microbusiness owner. The L2 tier must move from static file into the DB before any of this renders. The vertical surface is Mode 2; the category surface is Mode 1; they share the product corpus but address different mental models, and the header must expose both at equal prominence. Everything else — L3 depth, slug language, `/hooldus` surface, trust-blocker placement — follows from keeping both modes whole.
