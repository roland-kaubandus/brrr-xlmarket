# Taksonoomia audit + ettepanek — Agent 1

## 1. Audit (hetkeseis)

### 1.1 Topeltstruktuur DB-s (P0)

DB-s elab praegu **53 L1 kategooriat** paralleelselt:
- **22 v3 L1** (taxonoomia-v3): `horeca-food-service, welding-metalworking, laser-cnc-digital-fabrication, ...` — vt `/home/brrr/brrr-xlmarket/storefront/lib/taxonomy-v3.ts:21-132`
- **31 legacy L1** (VEVOR otsetõlge): `appliances, automotive, bath, building-materials, cleaning, doors-windows, electrical, flooring, furniture, hardware, health-and-wellness, heating-venting-cooling, holiday-decorations, home-decor, industrial-scientific, kitchen, lighting, lumber-composites, musical-instruments, other, outdoors, paint, playground-sets, plumbing, safety-equipment, smart-home, sports-outdoors, storage-organization, tools, window-treatments, workwear` — vt `/home/brrr/.claude/projects/-home-brrr-brrr-xlmarket/memory/session_2026-04-18_megamenu_audit.md:43`

Tagajärg: `/api/header-categories` tagastab 53 kirjet, MegaMenu küll filtreerib `TAXONOMY_V3.map()` kaudu, aga breadcrumbid ja `/kategooriad/[handle]` rada pääsevad ligi legacy handle'idele. Handle `other` on endiselt avalik 200-na. Näide: `https://xlmarket.store/et/kategooriad/other` — vt `session_2026-04-18_megamenu_audit.md:62`.

### 1.2 Legacy redirect'i kollisioon (P0)

`storefront/next.config.ts:29` suunab `playground-sets` → `fitness-sports-recreation` (308). Aga `taxonomy-v3.ts:119` kasutab samasugust slug'i `playground-sets` v3 subSlug'ina: `subSlugs: [..., "playground-sets", ...]` (L2 "Playground & Outdoor Play" all). Tulemus: v3 MegaMenu linkidele klõps → 308 → L1 leht. Kasutaja ei saa kunagi L2 lehele. Fix: eemalda rida 29.

### 1.3 `lib/branches.ts` ↔ `taxonomy-v3.ts` drift (P0)

`lib/branches.ts` defineerib **24 haru** (read 13–256, arr.length check), aga `taxonomy-v3.ts` defineerib **22 L1**. `/haru` staatiliste marsruutide kataloogis on kaks liigset haru, mida MegaMenu ei näita.

Otsing käsuga `grep -c "name: \"" branches.ts` annab 24. Põhjus: `BRANCHES[0..22]` + 2 tüüpi, mis said `branches.ts` koopia kopeeritud spetsifikatsioonist v2 (24 L1), enne kui v3 taandati 22-le.

### 1.4 L1 v3 jaotus on skewed (P0 — andmekvaliteet)

Migratsioonijärgne jaotus (`session_2026-04-18_megamenu_audit.md:69`):

| slug | n | kommentaar |
|---|---|---|
| horeca-food-service | 1907 | OK |
| automotive-workshop | 1540 | OK |
| hand-power-tools | ~2000 | overloaded "junk drawer" |
| outdoor-power-landscaping | ~1500 | OK |
| construction-building | ~1200 | OK |
| welding-metalworking | ~600 | OK |
| laser-cnc-digital-fabrication | 42 | **LOW** — peaks olema 70+ spec'i järgi |
| music-entertainment | 9 | **LOW** — peaks olema 80+ |
| salon-spa-wellness | 9 | **LOW** — peaks olema 50+ |
| woodworking-carpentry | 24 | **LOW** — peaks olema 150+ |

Põhjus: `vevor-to-v3.json:7-64` `l1_defaults`-id on jämedad (kogu "Musical Instruments" → `music-entertainment`, aga VEVOR productType ei pruugi alati alata tähega "Musical Instruments" — osa helitehnikat jooksebroovib mööda). Mapping vajab auditit `stats.unmappedCategories` loogist (`import-vevor-feed.mjs:71, 455, 554`).

### 1.5 Breadcrumb drift (P1)

`/app/[locale]/kategooriad/[handle]/page.tsx:184-195` kõnnib Medusa `parent_category_id` ahelat. v3 L1-d loodi skripti `migrate-categories-to-v3.mjs:127-149` kaudu lamedaks (ilma parent'ita), aga mõned L2-laadsed handle'id (näiteks `commercial-ovens`) on olemas VEVOR-i aegsest impordist ja neil on veel legacy parent `Kitchen > Appliances`. Breadcrumb näitab vana rada, mitte v3-d.

### 1.6 MeiliSearch 5000 ülempiir (P1)

`/kategooriad/[handle]/page.tsx:138` võtab `estimatedTotalHits` absoluutse tootearvuna. Meili default `maxTotalHits=5000` (pagination settings). `horeca-food-service` (1907) ja `automotive-workshop` (1540) mahuvad veel, aga `hand-power-tools` (~2000) varjab riski kui kasv jätkub. Tulevaste L1-de >5000 korral näitab "2999 products" tegelikust palju väiksemat numbrit. Fix: `PATCH /indexes/products/settings/pagination` `maxTotalHits:20000`.

### 1.7 Stale sitemap (P1 SEO)

`data/feeds/sitemap.xml` (2026-04-14) sisaldab 14 413 URL-i `https://xlmarket.eu` hostiga, sh 100 legacy kategoorialehte. nginx `location = /sitemap.xml` serveerib seda faili, bypassing Next.js `app/sitemap.ts`. Google crawl võtab sealt endiselt legacy URL-id → 308 → raiskab crawl-budget'i. Fix: kustuta static fail, eemalda nginx rule.

### 1.8 Keeleline struktuurne puudus (P1)

Slug-id on inglise keeles (`horeca-food-service`). L1 nimed on inglise + Eesti keeles storeomis (`taxonomy-v3.ts:22` name="HoReCa & Food Service" vs `branches.ts:16` name="Suurköök ja Toitlustus"). ES turu jaoks (Tarmo, roadmap) puuduvad hispaaniakeelsed nimed ja URL-id. Hetkel hakkaks suunatud segment tähendama `/es/kategooriad/horeca-food-service`, mis on SEO-ebaoptimaalne.

### 1.9 `CATEGORY_NAMES` hardcoded legacy (P1)

`app/[locale]/kategooriad/[handle]/page.tsx:21-54` — `CATEGORY_NAMES` map katab ainult vanad VEVOR slug'id. v3 L1-d (kõik 22) kukuvad läbi `humanize()`-i → "Horeca Food Service" (camelCase asemel kena "HoReCa & Food Service"). Peab asendama `TAXONOMY_V3` lookup'iga.

### 1.10 Mixed slug'id `CategoryExplorer.tsx` (P2)

`CategoryExplorer.tsx:19,23,24` sisaldab kärbitud handle'e nagu `laser-cnc-digital`, `hvac-climate`, `plumbing-water`. Need ei ühti v3 full slug'idega. Kas 404 või valele L1-le.

### 1.11 Surnud failid (P2)

- `lib/featured-categories.ts` — unreferenced
- `components/SubcategoryPills.tsx` — unreferenced
- `lib/menu-order.ts` — imporditud ainult surnud CategoryExplorer'ist
- ~115 `THUMB_OVERRIDES` entry `MegaMenu.tsx:14-144` — maintenance koormus tasakaalus taksonoomia stabiilsusega

### 1.12 Extra nimede slugify breakage (P2)

`MegaMenu.tsx:239` ja 366 slugify logic:
```
name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-")
```
annab ümardamata tulemused ("Kitchen HVAC & Air Curtains" → "kitchen-hvac-and-air-curtains"). `THUMB_OVERRIDES:41` mapib selle käsitsi. Kui v3 spec muutub, katkeb.

### 1.13 SEO-risk kokku võttes

1. Paljud URL-id vastavad samale sisule (v3 + legacy + redirect) → duplikaatsisu risk
2. Stale sitemap suunab bot'id vanadele URL-idele → 308 → crawl budget
3. Legacy `/other` URL on live → Google indekseerib tühja lehe
4. `playground-sets` 308 loop MegaMenu lt
5. Keeleline SEO — `/es/*` puudub strukturaalselt

### 1.14 UX-risk

1. Breadcrumb näitab suvalist rada (legacy või v3)
2. MegaMenu ja /haru ei ole sünkros (24 vs 22)
3. ~1500 `hand-power-tools` on ostja jaoks "kõik muu" — liiga jäme
4. Madalad v3 L1-d (music 9, salon 9, woodworking 24) näevad välja tühjad → ostja lahkub

---

## 2. Uus taksonoomia

**Ettepanek: kohandada v3-d, mitte alustada nullist.** v3 struktuur on läbi mõeldud ja heaks kiidetud (`2026-04-16-category-taxonomy-v3.md:17`). Probleemid ei ole struktuuris, vaid teostuses: drift, migratsioonvõla tase, i18n. Jätan 22 L1 alles, teen kohandused.

### 2.1 Muutused v3-s

**Muudatus A: lisada L2 tase DB-sse (hetkel lame)**

v3 migratsioon (`migrate-categories-to-v3.mjs:127-149`) lõi ainult L1-d lamedalt. L2 peab tulema samuti DB-sse, mitte olema ainult `TAXONOMY_V3.subs[]` staatiline. Põhjus: breadcrumb peab töötama, `category_handles` MeiliSearch'is peab sisaldama ka L2-d facet-filtreerimiseks.

**Muudatus B: rename L1 `hand-power-tools` → `general-power-tools`**

`hand-power-tools` on praegu "junk drawer" (~2000 toodet). Paneme täpsustava slug'i, mis ei varja seda fakti.

**Muudatus C: LISADA L1 `bath-bathroom` (või jätta `plumbing-water-systems` alla L2-na)**

Legacy `bath` (~50 toodet) lähevad `plumbing-water-systems`-i alla L2 `bathroom-fixtures`-ina (juba on taxonomy-v3.ts:88). OK.

**Muudatus D: liigutada `playground-sets` spec'ist välja**

Slug on praegu konfliktis redirect'iga. Asenda `playground-sets` → `playground-outdoor-play` (match spec nimega "Playground & Outdoor Play"). Update `taxonomy-v3.ts:119` ja eemalda redirect rida `next.config.ts:29`.

### 2.2 Lõplik L1 loend (22 + slug skeem)

Slug'id jäävad ingliskeelseks (üks-ühele taxonomy-v3.ts-iga), aga L1 nimed elavad i18n-sõnastikus.

| # | slug | nameEn | nameEt | nameEs (roadmap) | ~toodete arv |
|---|------|--------|--------|------------------|--------------|
| 01 | `horeca-food-service` | HoReCa & Food Service | Suurköök ja Toitlustus | HoReCa y Restauración | 1907 |
| 02 | `laser-cnc-digital-fabrication` | Laser, CNC & Digital Fabrication | Laser, CNC ja Digitaaltootmine | Láser, CNC y Fabricación Digital | 42→200+ (after remap) |
| 03 | `welding-metalworking` | Welding & Metalworking | Keevitus ja Metallitöö | Soldadura y Metalurgia | 600 |
| 04 | `printing-packaging-signage` | Printing, Packaging & Signage | Trükk, Pakendamine ja Reklaam | Impresión, Embalaje y Rótulos | 150 |
| 05 | `electrical-energy` | Electrical & Energy | Elekter ja Energia | Electricidad y Energía | 400 |
| 06 | `woodworking-carpentry` | Woodworking & Carpentry | Puidutöö ja Tisleritöö | Carpintería y Ebanistería | 24→150+ |
| 07 | `construction-building` | Construction & Building | Ehitus ja Remont | Construcción y Edificación | 1200 |
| 08 | `cleaning-janitorial` | Cleaning & Janitorial | Puhastusteenindus | Limpieza y Mantenimiento | 80 |
| 09 | `general-power-tools` (RENAMED) | Hand & Power Tools | Käsi- ja Elektritööriistad | Herramientas Manuales y Eléctricas | 2000 |
| 10 | `fuel-lubrication-fluid` | Fuel, Lubrication & Fluid Management | Kütus, Määrded ja Vedelikud | Combustible, Lubricación y Fluidos | 50 |
| 11 | `outdoor-power-landscaping` | Outdoor Power & Landscaping | Aiatehnika ja Maastikuhooldus | Equipos de Exterior y Jardinería | 1500 |
| 12 | `warehousing-material-handling` | Warehousing & Material Handling | Laondus ja Materjalikäitlus | Almacenaje y Manutención | 290 |
| 13 | `hvac-climate-control` | HVAC & Climate Control | Kliima ja Ventilatsioon | HVAC y Climatización | 200 |
| 14 | `plumbing-water-systems` | Plumbing & Water Systems | Torustik ja Veesüsteemid | Fontanería y Sistemas de Agua | 200 |
| 15 | `safety-security-workwear` | Safety, Security & Workwear | Ohutus, Turve ja Tööriietus | Seguridad y Ropa Laboral | 100 |
| 16 | `automotive-workshop` | Automotive & Workshop | Autohooldus ja Töökoda | Automoción y Taller | 1540 |
| 17 | `salon-spa-wellness` | Salon, Spa & Wellness | Salong, Spa ja Heaolu | Salón, Spa y Bienestar | 9→50+ |
| 18 | `office-commercial-interiors` | Office & Commercial Interiors | Kontor ja Äriinterjöör | Oficina e Interiores Comerciales | 200 |
| 19 | `health-medical-supply` | Health & Medical Supply | Tervis ja Meditsiinivarustus | Salud y Material Médico | 60 |
| 20 | `fitness-sports-recreation` | Fitness, Sports & Recreation | Sport, Fitness ja Vaba Aeg | Fitness, Deporte y Ocio | 300 |
| 21 | `boating-camping-outdoor` | Boating, Camping & Outdoor Adventure | Paadindus, Matk ja Seiklus | Náutica, Camping y Aventura | 180 |
| 22 | `music-entertainment` | Music & Entertainment | Muusika ja Meelelahutus | Música y Entretenimiento | 9→80+ |

### 2.3 L2 struktuur (näide mõningate L1-de kohta)

Hoian `taxonomy-v3.md:51-231` spec'i L2-de osas, aga lisan DB-salvestuse (hetkel ainult staatilines failis).

**01 HoReCa & Food Service — 8 L2:**
```
horeca-food-service/
├── commercial-refrigeration         (L2, parent_id = horeca L1 id)
│   ├── commercial-refrigerators     (L3, parent_id = commercial-refrigeration)
│   ├── ice-machines                 (L3)
│   ├── display-cases                (L3)
│   └── bain-maries                  (L3)
├── commercial-cooking-equipment
│   ├── commercial-ovens
│   ├── combi-ovens
│   └── pizza-ovens
├── food-preparation                 (nb: EI `food-preparation-equipment` — slug stabiilsus)
├── bar-beverage-service
│   └── espresso-machines
├── commercial-sinks
├── restaurant-shelving
├── restaurant-furniture
└── kitchen-hvac-air-curtains
```

**02 Laser, CNC & Digital Fabrication — 5 L2:**
```
laser-cnc-digital-fabrication/
├── co2-laser-engraving-machine
├── diode-laser-engraving-machine
├── cnc-routers-and-mills
├── 3d-printers
└── laser-cnc-accessories
    ├── rotary-laser
    ├── honeycomb-tables
    └── cnc-spindles
```

**09 General Power Tools — 6 L2:**
```
general-power-tools/
├── power-tools
├── hand-tools
├── air-compressors-pneumatic
├── measuring-layout
├── power-tool-accessories
└── tool-storage-cases
```

### 2.4 Slug-skeem reeglid

1. **Lühike ja ingliskeelne** — 2-4 sõna, kebab-case
2. **Üksik allikas** — `TAXONOMY_V3`-s `subSlugs: []` + DB parent chain peab kattuma
3. **Ei tohi kollisioneeruda redirect'idega** — eelnevalt kontrollida `next.config.ts CATEGORY_V3_REDIRECTS` võtmeid
4. **Stabiilsus** — slug'i rename = 301 redirect + 12 kuud säilitada
5. **Ei sisu lühendeid, mis võivad muutuda** (`hvac-climate` BAD, `hvac-climate-control` GOOD)

### 2.5 i18n strateegia

**Struktuur: slug = inglise, käivituselahus multi-lang display names.**

Loo `storefront/lib/category-i18n.ts`:

```typescript
export interface CategoryI18n {
  slug: string
  names: { et: string; en: string; es: string }
}

export const CATEGORY_I18N: Record<string, CategoryI18n> = {
  "horeca-food-service": {
    slug: "horeca-food-service",
    names: {
      et: "Suurköök ja Toitlustus",
      en: "HoReCa & Food Service",
      es: "HoReCa y Restauración",
    },
  },
  // ... 22 L1 + ~130 L2
}

export function getCategoryName(slug: string, locale: "et" | "en" | "es"): string {
  return CATEGORY_I18N[slug]?.names[locale] ?? humanize(slug)
}
```

URL skeem: `/{locale}/kategooriad/{slug}` — slug jääb ingliskeelseks. See on praktiline lahendus:
- Slug-stabiilsus üle keelte (üks redirect-tabel, mitte kolm)
- Localised display name breadcrumb'ides ja MegaMenu's
- SEO jaoks teeme `<link rel="alternate" hreflang="es" href="/es/kategooriad/horeca-food-service" />` ja localised `<h1>`

**Alternatiiv (keeldun):** multi-lang slug'id (`/es/categorias/horeca-restauracion`). Mõte hea, aga duplicate tracking kolmekordistub ja URL-mapping tabel kasvab 66 kirjeni (3 × 22). Kaalun alles kui ES turu traffic on >10% kogukäibest.

### 2.6 Cross-reference süsteem

Spec (`2026-04-16-category-taxonomy-v3.md:276-288`) defineerib "See also" lingid. Viimase kollu hakkame rakendama kui L2 on DB-s (mitte ainult staatilises spec'is). Implementatsioon: `lib/category-cross-refs.ts`:

```typescript
export const CROSS_REFS: Record<string, Array<{slug: string; reasonKey: string}>> = {
  "automotive-workshop/car-detailing-and-care": [
    { slug: "outdoor-power-landscaping/pressure-washers", reasonKey: "for-cleaning" }
  ],
  "cleaning-janitorial": [
    { slug: "outdoor-power-landscaping/pressure-washers", reasonKey: "pressure-washers-live-here" }
  ],
  // ... 6-10 pairs from spec
}
```

---

## 3. Auto-kategoriseerimine

### 3.1 Olemasolev süsteem

`backend/src/scripts/resolve-v3-category.mjs:31-46`:

```javascript
export function resolveV3Slug(productType, mp = loadV3Map()) {
  if (!productType) return null
  const parts = productType.split(">").map(s => s.trim())
  const l1 = parts[0] || ""
  const l2 = parts[1] || ""
  if (mp.skip?.includes(l1)) return null
  for (const [needle, slug] of Object.entries(mp.path_contains || {})) {
    if (productType.includes(needle)) return slug
  }
  if (l2 && mp.l1_l2_overrides?.[`${l1}|${l2}`]) {
    return mp.l1_l2_overrides[`${l1}|${l2}`]
  }
  return mp.l1_defaults?.[l1] || null
}
```

Täpsuse järjekord: `path_contains` → `l1_l2_overrides` → `l1_defaults` → `null`. Annab ainult L1 slug'i.

### 3.2 Probleemid praeguses lahenduses

1. **Tagastab ainult L1.** L2 ja L3 jäävad täitmata. Tooted lamedas DB tasemel.
2. **Ei logi unmapped'e.** `stats.unmappedCategories` koguneb aga pole ei salvestatud ega edastatud Slack'i/Huly'sse.
3. **Ei kasuta toote nime/kirjeldust** — ainult `productType` väli VEVOR-ist. Kui VEVOR annab `productType="Other"` (ja 571 feed-is on see ~2% toodetest), jääb kategoriseerimata.
4. **Puudub confidence score.** Kui kaks reeglit täituvad, esimene wins. Ei taga, et see on õigeim valik.
5. **Pole "uus kategooria" tuvastust.** Kui VEVOR lisab uue L1-e (näiteks `3D Printing & Additive`), sai logged aga mitte escaltated.

### 3.3 Uus algoritm — mitme signaali konsensusega

Sihtmärk: anda igale tootele `(L1_slug, L2_slug, L3_slug, confidence)` neljainik.

```typescript
interface CategorizeInput {
  vevorProductType: string | null    // "Tools > Welding & Soldering > MIG Welders"
  title: string                       // "VEVOR MIG Welder 200A Gas/Gasless IGBT"
  description: string
  sellingPoints: string[]
  brand: string
  sku: string
}

interface CategorizeResult {
  l1: string
  l2: string | null
  l3: string | null
  confidence: number     // 0.0-1.0
  method: "vevor-path" | "keyword-match" | "fallback" | "llm"
  needsReview: boolean
}
```

**Algoritm pseudokoodis:**

```typescript
function categorizeProduct(input: CategorizeInput): CategorizeResult {
  // ── STEP 1: VEVOR path resolver (existing + enhanced) ──
  const pathResult = resolveFromVevorPath(input.vevorProductType)
  if (pathResult && pathResult.confidence >= 0.8) {
    return pathResult
  }

  // ── STEP 2: Keyword signals from title + selling points ──
  const keywordResult = resolveFromKeywords(input)
  if (keywordResult.confidence >= 0.7) {
    return keywordResult
  }

  // ── STEP 3: Consensus between path + keyword ──
  if (pathResult && keywordResult.l1 === pathResult.l1) {
    return {
      ...pathResult,
      l2: keywordResult.l2 ?? pathResult.l2,
      l3: keywordResult.l3 ?? pathResult.l3,
      confidence: Math.max(pathResult.confidence, keywordResult.confidence),
      method: "keyword-match"
    }
  }

  // ── STEP 4: Fallback L1 + needsReview ──
  if (pathResult) {
    return { ...pathResult, needsReview: true, confidence: pathResult.confidence * 0.7 }
  }

  // ── STEP 5: LLM tie-breaker (batched, async) ──
  // Queue for nightly batch with Claude Haiku
  queueForLlmCategorization(input)

  return {
    l1: "general-power-tools", // last-resort junk drawer (explicit)
    l2: null,
    l3: null,
    confidence: 0.1,
    method: "fallback",
    needsReview: true
  }
}
```

### 3.4 Signaalid detailselt

**Signal A — VEVOR path (`productType` väli)**

VEVOR annab "L1 > L2 > L3" formaadis, näiteks `"Tools > Welding & Soldering > MIG Welders"`. `vevor-to-v3.json` laiendame L2- ja L3-tasemeni:

```json
{
  "l1_l2_l3_overrides": {
    "Tools|Welding & Soldering|MIG Welders":  { "l1": "welding-metalworking", "l2": "welding-cutting", "l3": "mig-welders" },
    "Tools|Welding & Soldering|TIG Welders":  { "l1": "welding-metalworking", "l2": "welding-cutting", "l3": "tig-welders" },
    "Tools|Welding & Soldering|Plasma Cutters": { "l1": "welding-metalworking", "l2": "welding-cutting", "l3": "plasma-cutters" }
  }
}
```

Confidence: 0.95 kui L1+L2+L3 kõik match'ivad. 0.85 L1+L2. 0.7 ainult L1.

**Signal B — tooteleht keywordid**

Slug-keyword mapping `category-keywords.json`:

```json
{
  "laser-cnc-digital-fabrication/co2-laser-engraving-machine": {
    "required_any": ["laser engraver", "laser cutter", "CO2 laser"],
    "required_none": ["diode", "fiber laser"],
    "boost": ["engraving", "cutting", "MDF", "acrylic"]
  },
  "welding-metalworking/welding-cutting/mig-welders": {
    "required_any": ["MIG welder", "MIG/MAG"],
    "required_none": ["TIG", "stick welder"],
    "boost": ["IGBT", "gas", "gasless", "200A", "140A"]
  }
}
```

Tagasisidestus `(title + description + sellingPoints).toLowerCase()`:
- `required_any` ≥1 match AND `required_none` 0 match → confidence 0.7
- Kui lisaks ≥3 `boost` match → +0.15
- Pikslid arvud tuvastatakse regex'iga (A, V, W, kW, mm)

**Signal C — brand + sku pattern**

VEVOR SKU-d sisaldavad sageli peiteviiteid:
- `VEV-WLD-*` → welding
- `VEV-CNC-*` → CNC
- `VEV-HVC-*` → HVAC

Kui avastan 3+ SKU pattern'i, lisan `sku_patterns.json` resolver'isse kui weak signal (confidence 0.3, kasutan consensus-ringis).

**Signal D — LLM nightly batch (Claude Haiku)**

Kõik `needsReview=true` tooted lähevad järjekorda `/backend/data/categorization-queue.json`. Hommikul 3:00 cron käivitab:

```typescript
async function llmCategorize(products: Product[]) {
  const system = `You are a categorization engine for an industrial tools marketplace.
  Given a product title, description, and VEVOR path, output strict JSON:
  {"l1": "<slug>", "l2": "<slug>|null", "l3": "<slug>|null", "confidence": 0.0-1.0, "reasoning": "..."}
  Valid L1 slugs: ${VALID_L1_SLUGS.join(", ")}`

  const results = await batchCall(products, system, { model: "claude-haiku-4-5" })
  // Cost: ~$0.0003/tool. 500 unmapped nightly = $0.15/päev.
  return results.filter(r => r.confidence >= 0.6)
}
```

Confidence <0.6 tooted lähevad manuaalsesse ülevaatusesse (vt 3.6).

### 3.5 Pipeline-asukoht

```
Cron (4h) feed-sync.sh
  ↓
scripts/import-vevor-feed.mjs (VEVOR XLSX → Medusa API)
  ↓ [per product]
  categorizeProduct(input)        ← uus, asendab resolveV3Slug()
    ↓
  if (confidence >= 0.7) {
    productData.categories = [{ id: l1CatId }, { id: l2CatId }, { id: l3CatId }]
    productData.metadata.categorization = { ...result }
  } else {
    productData.categories = [{ id: fallbackL1CatId }]
    productData.metadata.categorization = { ...result, needsReview: true }
    queueForReview(product)
  }
  ↓
Medusa product.created event
  ↓ (event subscriber)
MeiliSearch sync (document includes category_handles: [l1, l2, l3])
  ↓ (nightly 3:00 AM)
Claude Haiku batch categorization for needsReview queue
  ↓
Slack #xl daily report: "12 products need human review, 48 auto-assigned by LLM"
```

### 3.6 Edge case'id ja tagasilange reeglid

**Edge 1 — VEVOR lisab uue L1 kategooria**

Kui `productType` algab tundmatu L1-ga (nt "Robotics & AI"), resolveV3Slug tagastab null. Uus käitumine:
1. Log → `stats.unmappedCategories`
2. Kui >10 toodet sama uue L1-ga, saatma Slack notifikatsiooni `#xl`
3. Paigutame toote `general-power-tools` alla (junk drawer, explicit)
4. Huly issue luuakse automaatselt "Taxonomy: decide where 'Robotics & AI' belongs"

**Edge 2 — productType="Other"**

Skip list (`vevor-to-v3.json:128`) jätab selle null'iks. Uus käitumine: kukume Signal B (keywords) peale. Kui ikkagi null → LLM (Signal D).

**Edge 3 — sama toode kattub mitme L1-ga**

Näide: "Pressure Washer with Generator" — kas `outdoor-power-landscaping` (pressure washers) või `electrical-energy` (generators)? Spec'i järgi (`2026-04-16-category-taxonomy-v3.md:244`) pressure washers ONLY `outdoor-power-landscaping`, generators ONLY `electrical-energy`. Reegel: **primary function** võidab. Implementeerimine: spec'is defineeritud "duplicate prevention table" → `category-priority.json`:

```json
{
  "pressure-washer": "outdoor-power-landscaping",
  "generator": "electrical-energy"
}
```

Resolver kõigepealt kontrollib priority rules'i (kõige täpsem), siis keyword'id, siis path.

**Edge 4 — toode ilma productType, title too generic**

Näide: `title="VEVOR 2024"`, `productType=""`, `description=""`. LLM tagastab `confidence<0.5`. Paigutame junk drawer'i (`general-power-tools`) `needsReview=true` ja `reviewReason="insufficient-metadata"`. Kuvab hoiatust admin-lehel.

**Edge 5 — VEVOR muudab productType keskel (olemasoleva toote puhul)**

`migrate-categories-to-v3.mjs` on idempotentne, aga ei jälgi *muutusi*. Uus reegel: kui olemasolev toode `UPDATE_EXISTING=true` ja resolveV3Slug annab *teise* L1-e kui praegu:
1. Log diff
2. Kui `confidence >= 0.85` — move automaatselt
3. Kui `confidence 0.6-0.85` — flag review
4. Kui `confidence <0.6` — säilita olemasolev kategooria, log

---

## 4. Migratsiooni plaan

### 4.1 Faasid (TIER-system nagu user ette ütles)

**TIER A — Quick wins (30 min, zero DB risk)**

- A.1 `storefront/next.config.ts:29` kustuta `"playground-sets": "fitness-sports-recreation",` rida
- A.2 `storefront/lib/taxonomy-v3.ts:119` muuda `playground-sets` → `playground-outdoor-play`
- A.3 `storefront/app/[locale]/kategooriad/[handle]/page.tsx:21-54` asenda `CATEGORY_NAMES` hardcoded map TAXONOMY_V3 + CATEGORY_I18N lookup'iga
- A.4 `mv data/feeds/sitemap.xml data/feeds/sitemap.xml.stale` + remove nginx `location = /sitemap.xml` rule
- A.5 Ehita uus `lib/category-i18n.ts` 22 L1 ja ~30 põhilise L2-ga
- A.6 Build + deploy (PM2 reload)

Verify: `curl -I https://xlmarket.store/et/kategooriad/playground-sets` → 200 (olid 308)

**TIER B — DB migration (1-2h, requires backup)**

**Prereq:** `pg_dump -h localhost -p 5435 -U medusa medusa_db > /home/brrr/backups/xlmarket-medusa-$(date +%F).sql`

- B.1 Kirjuta `scripts/migrate-l2-to-db.mjs` — loob DB-sse 22 L1 → ~130 L2 (L2-slug + parent_id=L1.id), ettevalmistus L3-le
- B.2 `node scripts/migrate-categories-to-v3.mjs --execute --delete-orphans` — eemaldab 31 legacy L1 + orphan subtrees
- B.3 Reindex MeiliSearch: `node backend/scripts/index-meilisearch.mjs`
- B.4 `PATCH /indexes/products/settings/pagination` → `maxTotalHits: 20000`
- B.5 `lib/branches.ts` regenereeri TAXONOMY_V3-st (22 entries exact); ideaalis muuda `lib/branches.ts` derived file'iks, mis genereeritakse `taxonomy-v3.ts`-st (single source of truth)

Verify: `docker exec xlmarket-postgres-1 psql -U medusa medusa_db -c "SELECT count(*) FROM product_category WHERE parent_category_id IS NULL;"` → 22 (oli 53).

**TIER C — Auto-categorization upgrade (2-3 sessiooni, separate)**

- C.1 Enne automaatikat: käivita `import-vevor-feed.mjs` manuaalselt, kogu unmapped list → `stats.unmappedCategories`
- C.2 Laienda `vevor-to-v3.json` L2+L3 overrides'iga (madalate L1-de täitmiseks: music 9→80, salon 9→50, woodworking 24→150, laser 42→200)
- C.3 Kirjuta `categorizeProduct()` funktsioon (uus `backend/src/scripts/categorize-product.mjs`) → signalid A + B + consensus
- C.4 Lisa `category-keywords.json` L2/L3 match-reeglid
- C.5 Integreeri `import-vevor-feed.mjs:452-455`-ga (asenda `resolveV3Slug` kutse `categorizeProduct`-iga)
- C.6 LLM batch queue — `backend/data/categorization-queue.json` + cron hommikul 3:00
- C.7 Admin review UI — `/app/needs-review` Medusa admin plugin (Medusa 2 admin extension), kus Tarmo saab näha `confidence <0.7` toodete listi ja klõpsuga kinnitada/parandada

**TIER D — Strategic / SEO / i18n (long-term, fortnight)**

- D.1 `app/sitemap.ts` laiendamine: 22 L1 + kõik L2-d kõigis kolmes keeles
- D.2 `hreflang` alternate linkid kategoorialehel
- D.3 ES localization — Tarmo teeb 22 L1 + L2 nimede tõlked `category-i18n.ts`-sse
- D.4 Cross-reference links implementatsioon (`CROSS_REFS`)
- D.5 Dead files cleanup: `featured-categories.ts`, `SubcategoryPills.tsx`, `menu-order.ts`
- D.6 `CategoryExplorer.tsx` migration v3 full slug'idele

### 4.2 Rollback strateegia

**Tier A rollback:** git revert — kõik failimuudatused pöörduvad hetkega.

**Tier B rollback:**
1. Stop cron jobs (`feed-sync.sh`)
2. `psql medusa_db < /home/brrr/backups/xlmarket-medusa-YYYY-MM-DD.sql`
3. Restart Medusa backend
4. MeiliSearch reindex
5. Notify: Slack `#xl` "Rollback complete"

**Tier C rollback:** Disable `categorizeProduct` call, fallback to legacy `resolveV3Slug`. Säilitame seda funktsiooni `resolve-v3-category.mjs`-s vähemalt 3 kuud pärast Tier C-d.

### 4.3 Verifikatsioonireeglid iga faasi järgi

Iga tier'i lõpus:

```bash
# L1 count on täpselt 22
docker exec xlmarket-postgres-1 psql -U medusa medusa_db -c "
  SELECT count(*) FROM product_category WHERE parent_category_id IS NULL AND is_active = true;
"

# Iga L1 on leitav MeiliSearch facets'is
for slug in horeca-food-service welding-metalworking ...; do
  curl -s "http://127.0.0.1:7700/indexes/products/search" \
    -H "Authorization: Bearer $MEILI_KEY" \
    -d "{\"filter\":\"category_handles = $slug\",\"limit\":1}" | jq '.hits | length'
done

# /et/kategooriad/{slug} tagastab 200 kõigi 22 jaoks
for slug in ...; do
  curl -sI "https://xlmarket.store/et/kategooriad/$slug" | head -1
done

# Legacy slug'id tagastavad 308
for slug in appliances automotive bath kitchen; do
  curl -sI "https://xlmarket.store/et/kategooriad/$slug" | grep -E "HTTP|Location"
done
```

---

## 5. Riskid ja lahtised küsimused

### 5.1 Riskid

**R1 — Migratsiooni poolik olek (KRIITILINE)**

Kui Tier B läbi kukub L1 vahendusel aga enne L2 migratsiooni, saame pooliku struktuuri. Mitigate: käivita Tier B reverse order (kõigepealt loo uued L2-d, kinnita, siis kustuta legacy L1-d). Kui B.1 fail → pole midagi kustutanud veel.

**R2 — MeiliSearch facet cache**

Reindex võib võtta 5-10 min, selle aja jooksul kategooria lehed näitavad valed totalid. Mitigate: maintenance banner "Otsing uuendub, mõni minut..." homepage'il Tier B ajal.

**R3 — SEO rank dropping**

301-de suur lain (31 legacy → 22 v3 + L2 restructure) võib tekitada Google'is turbulentsi. Mitigate:
1. Google Search Console → submit new sitemap
2. Säilita legacy redirect'id 12 kuud
3. Monitor impressions + CTR päevatasemel
4. Kui langus >20% 30 päeva jooksul → reassess

**R4 — VEVOR feed schema drift**

Kui VEVOR muudab `productType` formaati (`>` asemel `/`, või lisab L4-e), `resolve-v3-category.mjs:34` katkeb silentl'y. Mitigate: lisa assert `productType.includes(">") || productType.length === 0` impordi alguses; alarm Slack'i.

**R5 — LLM hallutsinatsioon (Tier C)**

Claude Haiku võib tagastada kehtetu slug'i ("welding-tools" mitte "welding-metalworking"). Mitigate: strict schema Zod-valideerimisega + whitelist check (kui slug ∉ VALID_L1_SLUGS → reject, confidence=0).

**R6 — Tarmole liiga keeruline admin**

Kui auto-kategoriseerimine jätab 50+ toodet päevas needsReview järjekorda, Tarmo ei jõua. Mitigate: confidence treshold tune'ida kuni järjekord <10/päev; automated fallback junk drawer'ile pärast 7 päeva review puudumist.

**R7 — `hand-power-tools` → `general-power-tools` rename**

Rename'b tõstab 2000 toote URL-e. Mitigate: 301 redirect + säilita 24 kuud. Alternatiiv: jäta `hand-power-tools` nimega.

### 5.2 Lahtised küsimused

**Q1 — Kas ES market väärtuslik on piisavalt investeerimiseks struktuuri muutmisse?**

Tarmo on Tenerife'is, ES turu plaan on roadmap'il. Aga kui ES trafic <5% 2026 lõpuks, siis lang-namespaced slug'id on over-engineering. Ettepanek: i18n DISPLAY NAMES ainult nüüd, URL-level nothing. Otsustame ES struktuuri kui Tarmo on live.

**Q2 — Mis L3 reaalselt DB-sse peab jõudma?**

Praegu `TAXONOMY_V3.extra` annab staatilise L3 listi (~5 element L1 kohta). Kui iga L3 peab olema DB-s own-page'iga, see on 22 × 6 × 5 = 660 kategooria leht. Kas me vajame seda SEO-jaoks? Väärtuslik ainult kui long-tail keyword search traffic õigustab. Ettepanek: algul ainult L1+L2 DB-s, L3 genereeritakse pages dünaamiliselt MeiliSearch facet'idest.

**Q3 — `hand-power-tools` ~2000 toote splitimine**

Kas see on "junk drawer" teadlikult või peaksid need jagatama elektritööriistad / käsitööriistad / mõõteriistad iseseisvateks L1-deks? Arutelu: L1-de arv praegu 22 on optimaalne, veel splittimine teeks 24+ ja MegaMenu vist venitamist. Alternatiiv: säilitame L1 aga investeerime tugevasse L2-tasemesse (7 L2 → iga 200-300 toodet).

**Q4 — Kas LLM categorization on turvaline 4h cron'is?**

Kui Claude API on maas või rate limit'i, cron hangib. Mitigate: timeout 30s + retry once + fallback junk drawer. Aga see tähendab ebaühtlust (mõni päev LLM kategoriseeris, teisel päeval ei).

**Q5 — VEVOR `productType=""` tooted**

`import-vevor-feed.mjs:552-554` — kui kaugele peame LLM'iga kompenseerima? Kas teeme eeldusel "VEVOR peab andma category info"? Eskaleerib: kui kategooria on null, kas keeldume toodet üldse importimast?

**Q6 — `branches.ts` tuleviku saatus**

24 vs 22 drift osutab, et `branches.ts` kordab spec'i (`taxonomy-v3.ts`) informatsiooni. Kas generoerime seda ehitus-skriptina (`npm run gen:branches`) TAXONOMY_V3-st + hero-pildid listist? Jah. See eemaldab kogu duplikatsiooni.

**Q7 — Keelevaliku mõju slug'idele**

Kas `horeca-food-service` on kasutajale mõistetav eestikeelne ostja? Olemasolevad kontaktid (Tarmo) ütleks, et Eesti B2B ostjad eelistavad "suurkök-toitlustus" stiilis URL-e. Aga URL-kontrastne analüüs puudub. Vajab otsust kasutajalt.

**Q8 — Semantiline otsing (TIER E)**

Turu-uuring 2026-04-15 mainis AI otsingut. Kas taxonomy on üldse tähtis, kui semantic search ületab browse-paradigma? Ettepanek: taxonomy jääb kui **SEO- ja browse-kasutaja struktuur**, semantic search otsingubox'is. Pole vastuolu.

---

## Kokkuvõte

Säilita v3 22 L1 struktuur, lahenda teostuse võlg TIER A→B→C järjekorras. Auto-kategoriseerimine peab tagastama (L1, L2, L3, confidence) quadruple'i, kasutama 3 signaali (VEVOR path + keyword + LLM konsensus) ja routima low-confidence tooted human review'sse. Migratsioonil peab olema `pg_dump` backup ja reverse-order L2-loomine enne legacy L1-de kustutamist. i18n strateegia: inglise slug-id, kolmes keeles display names DB-s, hreflang linkid SEO-jaoks.
