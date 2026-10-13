# EN-PAKETT — piloot-raport (20 kategooriat)

> Partii: `enpack-pilot-2026-10-13` · DB: staging (k33g) · 2026-10-13
> STOP-punkt enne täis-backfilli (Tarmo kinnitust ootab).

## 1. Tulemus kokkuvõttes

| Kontroll | Tulem |
|---|---|
| EN-nimed (konsensus Sonnet+Opus + Fable-värav) | **20/20** (EN≠ET, stiil ühtlane) |
| SEO (ET+EN, kogu-kategooria, Sonnet Batch) | **20/20** (seoClaimGate läbitud 1. katsel, 0 regen) |
| genyM → gen-category-tree (DB → nav-JSON) | OK, 1970 sõlme |
| ET-nav puutumatu | ✓ (name_et muutmata, ainult name_en + SEO lisatud) |
| Taksonoomia-invariandid (`check-taxonomy-invariants`) | **28 pass · 0 warn · 0 crit** |
| Tootekadu (`product_category_product`) | **0** (19332 → 19332; kategooriad 1973 → 1973) |

**Struktuuri EI muudetud** — ainult `name_en` (`taxonomy_node_translation` locale='en') + SEO (`taxonomy_node_seo`). Seega 0 toote-ümberpaigutust, 0 L3 lisatud/kustutatud.

## 2. URL/slug-mõju (kinnitatud ENNE backfilli — nõue täidetud)

**name_en muutmine EI muuda ühtegi URL-i.** Handle = kinnitatud `slug`-väli tabelis `product_category`, nimest sõltumatu. 301-masin (migration 010 trigger) reageerib ainult `slug`-i muutusele — `name_en` seda ei puuduta. **→ Backfill on URL-ohutu**, olemasolevad EN/ET lingid jäävad kehtima, 0 redirecti vaja.

## 3. EN-nimed (20 kat) — ET → EN

| name_et (ET-nav, muutmata) | name_en (uus) |
|---|---|
| Lumeharjad ja jääkraabitsad | Snow Brushes & Ice Scrapers |
| Õhkvedrustuse komplektid ja kompressorid | Air Suspension Kits & Compressors |
| Autovalgustus ja LED-tuled | Automotive Lighting & LED Lights |
| Astmelauad ja astmed | Running Boards & Steps |
| Vintsi trossid ja taasteplokid | Winch Ropes & Snatch Blocks |
| Lemmiklooma-väravad | Pet Gates |
| Meditsiinitarvikud | Medical Supplies |
| Grilliplaadid | Grill Griddles |
| Veekogu-umbrohurehad | Aquatic Weed Rakes |
| Porta power komplektid | Porta Power Kits |
| Nutikodu ja ilm | Smart Home & Weather |
| Põrandaliistkütte katted | Baseboard Heater Covers |
| Väetise- ja seemnelaotajad | Spreaders & Seeders |
| Jahutusega ettevalmistusjaamad | Refrigerated Prep Tables |
| Ekspositsioonistendid ja displeid | Display Stands & Fixtures |
| Puuritera-teritajad | Drill Bit Sharpeners |
| Geriaatrilised toolid | Geriatric Chairs |
| Suusa- ja kaitseprillid | Ski & Snow Goggles |
| Signaali blokeerivad Faraday tarvikud | Faraday Bags & Signal Blocking Accessories |
| Pukseerimisketid ja -ahelad | Tow Chains |

Stiil: Title Case, "&" (mitte "and"), terminid glossary-kooskõlas. Kõik läbisid Fable nime-värava (kliendi-arusaadavus + eestikeelsus ET-poolel).

## 4. SEO-näidised (3 täis-näidet — ET + EN, kogu-kategooria, 0 numbrit/lubadust)

### Smart Home & Weather (Nutikodu ja ilm)
- **tagline_et:** Nutikas kodu, kontrolli all ilm
- **tagline_en:** Smart home, weather under control
- **description_et:** Nutikodu ja ilmajaamade kategoorias leiad seadmed, mis aitavad kodu mugavamaks ja turvalisemaks muuta ning ilmaolusid jälgida. Sobivad nii tehnikahuvilisele kui ka igapäevasele kasutajale, kes soovib kodu kaugjuhtida või keskkonnatingimusi kontrolli all hoida. Valikul tasub mõelda, millist tüüpi seadet vajad ja kuidas see sinu kodu süsteemiga ühildub.
- **description_en:** The Smart Home & Weather category features devices that make your home more comfortable and secure while helping you track weather conditions. Suitable for both tech enthusiasts and everyday users who want to control their home remotely or monitor environmental conditions. When choosing, consider the type of device you need and how well it fits with your home setup.

### Pet Gates (Lemmiklooma-väravad)
- **tagline_et:** Turvaline piir lemmikule kodus
- **tagline_en:** A safe boundary for your pet
- **description_et:** Lemmiklooma-väravad aitavad piirata koera või kassi liikumist kodus ning hoida lemmiku eemal teatud ruumidest või trepikojast. Valikus on nii vabalt seisvad kui seina külge kinnitatavad lahendused erinevatele ukseavadele ja koridoridele. Valides tasub jälgida värava sobivust ruumi laiusega, materjali vastupidavust ja kinnitusviisi, mis sobib just sinu kodule.
- **description_en:** Pet gates help control where your dog or cat can roam around the home, keeping them away from certain rooms or staircases. The range includes both freestanding and wall-mounted options suited to different doorways and hallways. When choosing, consider how well the gate fits your space, the sturdiness of the material, and a mounting style that works for your home.

### Refrigerated Prep Tables (Jahutusega ettevalmistusjaamad)
- **tagline_et:** Värsked lisandid käeulatuses, alati jahedana
- **tagline_en:** Fresh toppings at hand, always chilled
- **description_et:** Jahutusega ettevalmistusjaamad on köögimööbli ja külmaseadme ühendus, kus toorained püsivad käepärast ja samal ajal jahedana. Sobivad kohvikutele, pitseeriatele ja restoranidele, kus vaja kiiresti võileibu, salateid või pitsasid valmistada. Valikul tasub jälgida korpuse ja kaane materjali, pannide paigutust ning seadme üldmõõtu, et see sobiks köögi tööpinnaga.
- **description_en:** Refrigerated prep stations combine worktop convenience with built-in cooling, keeping ingredients fresh and within easy reach. They suit cafés, pizzerias and restaurants that need quick access to chilled toppings for sandwiches, salads or pizzas. When choosing one, consider the housing and lid material, pan layout and overall size to match your kitchen counter.

## 5. Ohutus / tagasipööratavus (HARD RULE #6)

- **Undo:** `node scripts/en-pack-undo.mjs enpack-pilot-2026-10-13` (taastab iga node'i eelmise seisu; prev==null → DELETE).
- **Stack-lukk:** backfill + undo võtavad `xl-stack-write.lock` (HARD RULE #9), DRY ei lukusta.
- **Resume:** ledger `done` → katkenud backfill jätkub samast kohast; usage-limit → ohutu stopp + Telegram.

## 6. Täis-backfilli plaan (pärast kinnitust)

1. `node scripts/en-pack-backfill.mjs --all --execute` (~1970 kat, Batch API -50%, stack-lukk, resume).
2. Deploy: genyM → gen-category-tree → push **mõlemad harud** (main + taxonomy-v4) → Coolify storefront redeploy. (Struktuur muutumatu → Meili-reindeks pole vaja; nimed/SEO on build-time bundle → push+redeploy.)
3. Hook: `classify-etapp2-create.mjs` kirjutab uue L3 `name_en`+SEO DB-sse (sama `en-name.mjs`+`l3-gates` moodulid — HARD RULE #5).

**STOP siin — ootan kinnitust täis-backfilliks.**
