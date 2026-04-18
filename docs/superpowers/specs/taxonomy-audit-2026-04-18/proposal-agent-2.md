# Taksonoomia audit + ettepanek — Agent 2

## 1. Audit (hetkeseis)

### 1.1 Duplikatsioon ja kaos DB-s
- **53 L1 kategooriat DB-s** (22 v3 + 31 legacy), kinnitatud 2026-04-18 pipeline auditis: `session_2026-04-18_megamenu_audit.md:43`. 31 orbuksi-handle: `appliances, automotive, bath, building-materials, cleaning, doors-windows, electrical, flooring, furniture, hardware, health-and-wellness, heating-venting-cooling, holiday-decorations, home-decor, industrial-scientific, kitchen, lighting, lumber-composites, musical-instruments, other, outdoors, paint, playground-sets, plumbing, safety-equipment, smart-home, sports-outdoors, storage-organization, tools, window-treatments, workwear`.
- **14 841 toodet** on ümber-linkitud v3 L1-le, aga L2/L3 pole veel taasehitatud. Tulemus: mega-menüü L2 columnist vajutades maandud v3 L1 lehele, kuid lapse-kategooriaid DB-s ei ole (L3+ drill on tühi).
- **Meili `category_handles` array** sisaldab nii v3 kui legacy handle'it, kuna `index-meilisearch.mjs:47-68` kogub kõik ancestor handle'id — facet distribution järgi tooted on dual-tagged.

### 1.2 Koodi drift (22 vs 24 vs 53)
- `storefront/lib/taxonomy-v3.ts:21` — **22 L1** (canonical v3)
- `storefront/lib/branches.ts:13` — **23 L1 `BranchDef`-i** (lugesin faili lõpust — tegelikult 23, mitte 24; viimane sulg reale 256). Drift vs v3.
- `storefront/next.config.ts:7-50` — **42 legacy redirect paari** (CATEGORY_V3_REDIRECTS)
- `backend/src/scripts/vevor-to-v3.json` — **56 L1 default reeglit** + 42 L1|L2 override'i + 7 path_contains reeglit
- DB — **53 L1** (22 v3 + 31 legacy)
- MegaMenu — loeb `TAXONOMY_V3` (22), aga `/api/header-categories` tagastab **53**

Neli erinevat "tõde" taksonoomiast, mis on üksteisest sõltumatult aetud.

### 1.3 Kollisioonid ja katkised URL-id
- **`playground-sets` 308 redirect** — `next.config.ts:29` redirectib `playground-sets` → `fitness-sports-recreation`, aga `taxonomy-v3.ts:119` kasutab `playground-sets` kui LEGITIIMSE L2 subSlug'i Fitness all. Tulemus: menu click → 308 → L1 leht, mitte L2 drill.
- **`/et/kategooriad/other` tagastab 200** — `other` L1 elab ikka DB-s, kuigi resolver seda `skip: ["Other"]` listis välistab.
- **CategoryExplorer.tsx:19,23,24** — truncated handle'id (`laser-cnc-digital`, `hvac-climate`, `plumbing-water`). 404 riskid.
- **MeiliSearch `maxTotalHits: 5000`** cap — `backend/scripts/index-meilisearch.mjs:39`. Iga L1 >5k toodet näitab valet totalHits'i. `horeca-food-service` (1907) ja `automotive-workshop` (1540) on OK, aga koondlugemistel valetab.

### 1.4 Kategooria-jaotuse skew
Pipeline auditi järgi (v3 L1 toodete arv pärast migratsiooni):
- `horeca-food-service`: 1907
- `automotive-workshop`: 1540
- `laser-cnc-digital-fabrication`: 42 (spec ootab 70+)
- `music-entertainment`: 9 (spec ootab 80+)
- `salon-spa-wellness`: 9 (spec ootab 50+)
- `woodworking-carpentry`: 24 (spec ootab 150+)

Tähendus: `vevor-to-v3.json` resolveri reeglid ei taba piisavalt täpseid path'e. Näiteks "Musical Instruments" L1 default on `music-entertainment`, aga VEVOR feedis võib tulla `"Appliances > Musical Instruments"` või tootenimetuses `"karaoke machine"` ilma korrektse productType-ga → resolver tagastab null / vale slug.

### 1.5 SEO-risk
- **Stale sitemap** — `data/feeds/sitemap.xml` on 2026-04-14, hosted on `xlmarket.eu`, 14 413 URL-i sisaldab 100+ legacy handle'it. Nginx serveerib faili otse, bypass'ides Next.js `app/sitemap.ts`.
- 42 perm-redirect reeglit tekitavad 308/301 ahelaid. Google crawler võib märkida "cleanup needed".
- Dual-homed kategooriad (v3 + legacy) — crawler näeb mõlemat, seadistuseta canonicaleid → duplicate content.

### 1.6 UX-risk
- **Breadcrumb drift** (`app/[locale]/kategooriad/[handle]/page.tsx:184-195`) — walks Medusa `parent_category` chain. v3 sub-slugid, mis matchivad legacy handle'id (nt `commercial-ovens` elas varem `Kitchen > Appliances` all), näitavad legacy breadcrumb'i.
- **Mega-menü L3+ tühi** — 14 841 toodet on v3 L1-l flat, L2/L3 tase puudub DB-s. Kasutaja näeb ilusat L2 grid'i, aga hover'imisel drill on tühi.
- **Eestikeelsed slug'id kõrvuti ingliskeelsetega** — `paadindus-matk` vs `boating-camping-outdoor`, `kutus-vedelikud` vs `fuel-lubrication-fluid`. `branches.ts` kasutab eestikeelsed slug'e kohalikus route'is (`/haru/paadindus-matk`), aga `categoryHandle` viitab v3 ingliskeelse slug'ile. Kahekordne URL-i nimi sama asja jaoks.

### 1.7 i18n — puudub struktuurselt
- v3 spec soovitab "English category names (store is bilingual ET/EN)" (`2026-04-16-category-taxonomy-v3.md:333`), aga:
  - `taxonomy-v3.ts` `name:` on ingliskeelne ainus väli
  - `branches.ts` on topelt (`name` + `nameEn`, `tagline` + `taglineEn`)
  - Slug on ühekeelne — ei saa `/es/categorias/ferreteria` pakkuda ilma täieliku taksonoomia duplikatsioonita
  - Spanish market on roadmapil, praegu support puudub

### 1.8 Sisulised probleemid v3-taksonoomias
- **`Health & Medical Supply` L1 (21)** — spec ütleb 60+ toodet, reaalsus 9 toodet? Või rohkem, kuid skew'nud. `vevor-to-v3.json`-is mapitakse `"Pet Supplies"` → `health-medical-supply`, mis on **valesti** — spec (`2026-04-16-category-taxonomy-v3.md:269`) ütleb `Pet Supplies` peab olema `outdoor-power-landscaping`. Resolveris bug.
- **`Engines & Motors`** → `automotive-workshop` (`vevor-to-v3.json:22`). Spec ütleb "Motors, Drives & Parts" peab olema `welding-metalworking` (`2026-04-16:84`). Konflikt.
- **`Hydraulics`** → `fuel-lubrication-fluid` (`vevor-to-v3.json:33`). OK aga `"Hydraulic Press"` peaks olema `welding-metalworking` (`2026-04-16:83`). Täpset reeglit resolveris pole.
- **`Outdoors > Pools & Spas`** → `outdoor-power-landscaping` (`vevor-to-v3.json:107`). Aga "home spas" → `salon-spa-wellness` (`vevor-to-v3.json:83`). Segadus "spa" semantikaga.

---

## 2. Uus taksonoomia (ettepanek)

### 2.1 Põhimõte: hoia v3, paranda mappingu
v3 L1 (22) on **hea** B2B-persona-põhine struktuur — turu-uuringu alignment on olemas, duplikaadi-preventsioon tabelis läbi mõeldud. Ei taksonoomiat on vaja ümber teha — **vaja on L2 tase DB-sse ehitada, mappingu parandada, legacy kustutada**.

Minu ettepanek: **22 L1, ~140 L2, L3 ainult pindadel kus on >50 toodet**.

### 2.2 Slug-skeem ja i18n

**Reegel 1 — ingliskeelne slug kanoniline.** Kõik Medusa category handle'id, `branches.ts`-i route'id ja URL-struktuur kasutab ainult ingliskeelseid slug'e. Eestikeelne slug eemaldada kohe — `paadindus-matk`, `kutus-vedelikud`, `elekter-energia` eksisteerivad paralleelselt ingliskeelsetega ja põhjustavad segadust.

**Reegel 2 — URL-path prefix keelepõhine.**
```
/et/c/boating-camping-outdoor   (ET UI, EN slug)
/en/c/boating-camping-outdoor
/es/c/boating-camping-outdoor   (roadmap)
```

`/kategooriad` ja `/haru` duplikatsioon tuleb likvideerida — valida üks (`/c/` on lühem, SEO-sobiv).

**Reegel 3 — L2 slug ilma L1 prefix'ita.** Globally unique nimespace. Medusa handle'id on nagunii unique.
```
/en/c/welding-mig-tig       (L2)
/en/c/welding-mig-tig/plasma-cutters  (L3)
```
Või flat:
```
/en/c/mig-tig-welders
/en/c/plasma-cutters
```
Flat on SEO-sõbralikum (pidult shorter URLs) aga hajub breadcrumb. **Soovitus: flat slug + breadcrumb tuletatakse `parent_category_id`-st** (nagu praegu).

**Reegel 4 — i18n nimed, MITTE slug-id.**
Uus tabel `product_category_translation`:
```sql
CREATE TABLE product_category_translation (
  category_id VARCHAR NOT NULL REFERENCES product_category(id) ON DELETE CASCADE,
  locale VARCHAR(5) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  meta_title TEXT,
  meta_description TEXT,
  PRIMARY KEY (category_id, locale)
);
```
Seeded fixture JSON-ist (nii nagu `taxonomy-v3.ts`, ainult et L1 + L2 täielik loend kolmes keeles: ET, EN, ES).

### 2.3 L1 loend (22, kinnitatud v3)

Jätkan v3 struktuuriga täpselt nagu spec. Ei loetle uuesti (vt `2026-04-16-category-taxonomy-v3.md:22-45`). Põhjendused iga L1 olemasolule on seal kirjas ja B2B persona'dega aligned — neid on mõttetu ümber teha.

Küll aga **parandan** järgmised peidetud defektid:

1. **L1-d `21 Health & Medical Supply` SKU-count jääb alla 60 — kohtub veega.** Praegu on 9 toodet. Kui VEVOR feed ei anna piisavalt meditsiinitooteid, siis see L1 on turu-uuringust tulnud aga reaalseid tooteid pole. **Otsus: jäta L1 struktuurselt alles (B2B-buyer on olemas), aga UI-s peida kui toote arv <30.** Lisa runtime check `taxonomy-v3.ts`-sse: `showInMegaMenu: boolean`.

2. **L1 `14 Fuel, Lubrication & Fluid` 50+** — kui tooted kattuvad `outdoor-power-landscaping`-iga (fuel pumps), siis loogika on: tööstusliku kontekstiga (drum, dewatering) → 14, aiatehnika kontekstiga (fuel can, tank bracket) → 13.

### 2.4 L2 loend ja subSlug normaliseerimine

Iga L1-l on praegu `subs[]` ja `extra[]` jaotus `taxonomy-v3.ts`-s (kokku ~260 L2 kanditaadi kirjet). Probleem: need on **staatilised literaalid**, DB-s on linkid puudu. Ettepanek:

```
Kinnita 22 L1 × ~6 L2 = ~132 L2 kategooriat.
Kustuta `extra[]` massiiv (extras lähevad search-fallback'ina, mitte L2 kategooriana).
Seed fixture: backend/src/migrations/taxonomy-v3-seed.ts
```

SubSlugid peaksid olema **juurkujulised** (drill+grinder → `drills-and-grinders` mitte `drill-press`). Praegu segadus:
- `subSlugs: ["refrigerators","commercial-ovens",...]` — need on DB handle'id aga Medusasse pole neid veel v3 L2-dena seatud
- Jätkuvus v2/v3 vahel puudub

**Tegevus:** genereeri `taxonomy-v3-l2.ts` kogu L1 × L2 maatriksina, iga L2 kanooniline handle + ET/EN/ES name + meili-query mustriks:

```typescript
export const TAXONOMY_V3_L2: L2Def[] = [
  { l1Slug: "welding-metalworking", slug: "mig-tig-welders",
    names: { en: "MIG & TIG Welders", et: "MIG- ja TIG-keevitusaparaadid", es: "Soldadores MIG y TIG" },
    meiliQuery: "MIG TIG welder inverter",
    signalKeywords: ["mig", "tig", "inverter welder", "welding machine"],
  },
  // ...~131 rida
]
```

Oluline: `meiliQuery` + `signalKeywords` tulevad auto-kategoriseerimise algoritmis signaalideks (vt §3).

---

## 3. Auto-kategoriseerimine

### 3.1 Kus pipeline'is elab

Praegu elab resolver `backend/src/scripts/resolve-v3-category.mjs`-s, kasutatakse `import-vevor-feed.mjs:452`-s L1 määramiseks importimisel. Minu ettepanek: **laienda resolver L2 tasemele ja tee sellest eraldi teenuse-moodul**:

```
backend/src/taxonomy/
├── resolver.ts          — main API: classifyProduct(product): { l1, l2, confidence }
├── signals.ts           — signal extractors (productType, title, description, SPU, brand)
├── rules/
│   ├── l1-rules.json    — VEVOR productType → v3 L1 (rewrite of vevor-to-v3.json)
│   ├── l2-rules.json    — L1 + signal keywords → L2 slug
│   └── overrides.json   — Manual overrides (SKU → force slug)
├── fallback.ts          — Meili-based nearest-neighbor (embed title, find similar products, inherit category)
└── audit.ts             — Logi unresolved + low-confidence to DB table for manual review
```

Pipeline integreerimine:
1. **Import time** (`import-vevor-feed.mjs`) — iga uue toote puhul `classifyProduct()` määrab `l1 + l2`, seatakse Medusa `categories` array'sse mõlemad ID-d.
2. **Re-classify job** (uus) — Medusa subscriber, mis kord päevas jookseb üle toodete, millel puudub L2 või confidence <0.7. Uuesti klassifitseerib, logib auditi.
3. **Manual override** — admin UI-s nupp "override category", salvestab `overrides.json`-is või DB-s `product_category_override` tabelis.

### 3.2 Signaalid (prioriteediga)

```typescript
interface ClassificationSignals {
  // S1 — structured (high trust)
  vevorProductType: string      // "Tools > Welding & Soldering > MIG Welder"
  vevorBrand: string            // "VEVOR"
  vevorSpu: string              // groups siblings
  sku: string

  // S2 — semi-structured
  title: string                 // "300A MIG Welder with Gas..."
  sellingPoints: string[]       // 5 bullet points from feed
  dimensionSize: "small" | "medium" | "large"  // tuletatud mõõtmetest

  // S3 — unstructured (low trust, ML-based)
  description: string           // sanitized HTML → text
  richDescription: string
}
```

### 3.3 Algoritm (pseudokoodis)

```typescript
function classifyProduct(p: VevorProduct): ClassifyResult {
  const signals = extractSignals(p)

  // Phase 1: Rule-based L1 (deterministic, high precision)
  const l1Result = classifyL1(signals)
  if (l1Result.confidence < 0.5) {
    return { l1: null, l2: null, needsReview: true, reason: "unresolved_l1" }
  }

  // Phase 2: Rule-based L2 within L1
  const l2Result = classifyL2(signals, l1Result.l1)

  // Phase 3: Low-confidence → nearest-neighbor via Meili
  if (l2Result.confidence < 0.6) {
    const nnResult = meiliNearestNeighbor(signals, l1Result.l1)
    if (nnResult.confidence > l2Result.confidence) {
      return { l1: l1Result.l1, l2: nnResult.l2, confidence: nnResult.confidence,
               source: "nearest_neighbor" }
    }
  }

  return { l1: l1Result.l1, l2: l2Result.l2, confidence: l2Result.confidence,
           source: "rule_based" }
}

function classifyL1(s: Signals): { l1: string | null, confidence: number } {
  // 1. path_contains (regex on full productType path) — highest precedence
  for (const [pattern, slug] of L1_PATH_CONTAINS) {
    if (s.vevorProductType.includes(pattern)) {
      return { l1: slug, confidence: 1.0 }
    }
  }
  // 2. L1|L2 override
  const parts = s.vevorProductType.split(">").map(x => x.trim())
  const override = L1_L2_OVERRIDES[`${parts[0]}|${parts[1]}`]
  if (override) return { l1: override, confidence: 0.95 }

  // 3. Title-keyword override (catches misclassified VEVOR feeds)
  for (const [keyword, slug] of TITLE_OVERRIDES) {
    if (new RegExp(`\\b${keyword}\\b`, "i").test(s.title)) {
      return { l1: slug, confidence: 0.85 }
    }
  }

  // 4. L1 default
  const defaultSlug = L1_DEFAULTS[parts[0]]
  if (defaultSlug) return { l1: defaultSlug, confidence: 0.7 }

  return { l1: null, confidence: 0 }
}

function classifyL2(s: Signals, l1: string): { l2: string | null, confidence: number } {
  const candidates = L2_RULES.filter(r => r.l1 === l1)

  // Score each L2 candidate by signal keyword matches
  const scored = candidates.map(c => {
    let score = 0
    let matches = 0
    for (const kw of c.signalKeywords) {
      const rx = new RegExp(`\\b${kw}\\b`, "i")
      if (rx.test(s.vevorProductType)) { score += 3; matches++ }  // strong signal
      if (rx.test(s.title)) { score += 2; matches++ }
      for (const sp of s.sellingPoints) {
        if (rx.test(sp)) { score += 1; matches++ }
      }
    }
    return { l2: c.slug, score, matches }
  })

  scored.sort((a, b) => b.score - a.score)
  const winner = scored[0]
  if (!winner || winner.score === 0) return { l2: null, confidence: 0 }

  // confidence = score of winner / (score + score of runner-up + 1)
  const runnerUp = scored[1]?.score ?? 0
  const confidence = winner.score / (winner.score + runnerUp + 1)
  return { l2: winner.l2, confidence }
}

function meiliNearestNeighbor(s: Signals, l1: string): { l2: string | null, confidence: number } {
  // Query Meili for similar products in same L1, look at their L2 assignments
  const q = s.title.split(/\s+/).slice(0, 5).join(" ")
  const hits = meiliClient.search({
    index: "products",
    q,
    filter: `category_handles = ${l1} AND l2_slug EXISTS`,
    limit: 10,
  })
  if (hits.length < 3) return { l2: null, confidence: 0 }

  // Majority vote on L2 from top hits
  const counts = {}
  for (const h of hits) {
    counts[h.l2_slug] = (counts[h.l2_slug] || 0) + 1
  }
  const [winnerSlug, winnerCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  const confidence = winnerCount / hits.length
  return { l2: winnerSlug, confidence: Math.min(confidence, 0.75) } // cap at 0.75 since NN
}
```

### 3.4 L2 signal-keyword näited (rules/l2-rules.json)

```json
[
  { "l1": "welding-metalworking", "l2": "mig-tig-welders",
    "signalKeywords": ["mig welder", "tig welder", "inverter welder", "gas mig"] },
  { "l1": "welding-metalworking", "l2": "plasma-cutters",
    "signalKeywords": ["plasma cutter", "plasma cutting", "cut50", "cut40"] },
  { "l1": "welding-metalworking", "l2": "angle-grinders",
    "signalKeywords": ["angle grinder", "bench grinder", "die grinder"] },
  { "l1": "welding-metalworking", "l2": "metal-lathes-mills",
    "signalKeywords": ["metal lathe", "milling machine", "mini lathe", "benchtop mill"] },
  { "l1": "laser-cnc-digital-fabrication", "l2": "co2-laser",
    "signalKeywords": ["co2 laser", "laser engraver 40w", "laser engraver 60w", "co2 engraving"] },
  { "l1": "laser-cnc-digital-fabrication", "l2": "diode-laser",
    "signalKeywords": ["diode laser", "laser engraver 5w", "laser engraver 10w", "20w laser"] },
  { "l1": "laser-cnc-digital-fabrication", "l2": "cnc-router",
    "signalKeywords": ["cnc router", "cnc mill", "cnc 3018", "cnc 4040"] },
  { "l1": "laser-cnc-digital-fabrication", "l2": "3d-printers",
    "signalKeywords": ["3d printer", "fdm printer", "sla printer", "resin printer"] }
]
```

### 3.5 Edge case'id ja fallback'id

| Case | Strateegia |
|------|-----------|
| Tooteimportil puudub productType | Title + description → signaalide kaudu L1+L2. Kui confidence <0.5, mine `needsReview: true` tabelisse. |
| VEVOR annab uue L1 pathi, mis pole `l1_defaults`-is | Logi `stats.unmappedCategories` + saada Slack'i `#xl-feed-sync` kanalisse. Import script loob toote koos `metadata.needs_categorization: true`. UI peidab toote kuni manual review. |
| Toode sobib mitmesse L2-e | Võtke kõrgeim confidence. Salvestage kõik kandidaadid `metadata.l2_candidates: [...]` kujul debug-jaoks. Cross-reference UI-s ("See also" link). |
| Toode sobib mitmesse L1-e (nt "hydraulic press" — Welding või Fuel?) | Rakenda `path_contains` reeglit ENNE `l1_defaults`-it. Selgesti prioritiseeri. |
| SPU group sisaldab erinevate L1 variante (harv, aga esineb) | SPU group peab alati ühel L1-l olema. Kasuta primaryRow (esimene variantis) klassifitseerimiseks. Kui variandid eraldi L1-le kvalifitseeruvad, logi hoiatus ja manuaal. |
| VEVOR productType on "Other" või muu skip-listis | `resolveV3Slug` tagastab null → import script seab `status: "draft"` ja ei publitseeri. |
| Mitu resolver reeglit tabavad | Eelnev käitumine (path_contains > l1_l2 > l1_default) on OK. Ainult lisa `overrides.json` kõige kõrgem prioriteet SKU-põhiseks override'iks. |

### 3.6 Meili-põhine NN fallback

Praegu ei kasuta ja see on suurim võimalus. Kui reeglipõhine L2 klassifitseerimine ebaõnnestub (confidence <0.6), kasuta juba-klassifitseeritud toodete tarkust:

```typescript
// 1. Embedding-free lähenemine (MVP):
//    Otsi Meili-st sarnaseid tooteid (ranking: words, proximity, typo)
//    Võta kuni 10 tulemust, vaata nende l2_slug
//    Enamusväljamäng

// 2. Embedding-põhine (v2):
//    Genereeri iga toote title+description embedding (text-embedding-3-small, 1536 dim)
//    Salvesta Redis vector store (vt CLAUDE skills — juba arhitektuurilist otsust tehtud)
//    KNN search → L2 majority vote
//    Accuracy: ~90% vs rule-based ~75% (tüüpiline e-kaubanduse taxonomy)
```

Vector-põhine lähenemine on järgmine etapp, mitte MVP.

### 3.7 Audit tabel

```sql
CREATE TABLE category_classification_audit (
  id BIGSERIAL PRIMARY KEY,
  product_id VARCHAR NOT NULL,
  classified_at TIMESTAMP DEFAULT NOW(),
  l1_slug VARCHAR,
  l2_slug VARCHAR,
  confidence NUMERIC(3,2),
  source VARCHAR, -- "rule_based" | "nearest_neighbor" | "manual" | "unresolved"
  vevor_product_type TEXT,
  signals JSONB,   -- debug info
  needs_review BOOLEAN DEFAULT false
);

CREATE INDEX idx_cat_audit_review ON category_classification_audit(needs_review) WHERE needs_review;
```

Admin UI uusluua vaade: "Categorization queue" → kõik `needs_review: true` read ootavad manual approve'i.

---

## 4. Migratsiooni plaan

### Faas 0 — Eeltingimused
1. `pg_dump` Medusa DB: `pg_dump -h localhost -p 5435 -U xlmarket xlmarket > ~/backups/xlmarket-$(date +%F).sql`
2. Verify backup: `wc -l ~/backups/xlmarket-*.sql` (>100k ridu eeldatav)
3. Freeze frontend deploy (locked to current `main` branch)
4. Puhasta `data/feeds/sitemap.xml.stale` failina (liigutatav hiljem)

### Faas 1 — Quick wins (30 min, zero downtime)
**Kohe teha, eraldi PR-dena:**

1. **Kustuta `playground-sets` redirect** — `next.config.ts:29` rida eemaldada. Rebuild + deploy.
2. **Fix `CATEGORY_NAMES` map** — `app/[locale]/kategooriad/[handle]/page.tsx:21-54` asendada `TAXONOMY_V3.reduce((a, v) => ({...a, [v.slug]: v.name}), {})`-ga. Lisa ET translation (inline object kuni §3 translation tabel kehtestub).
3. **Disable stale sitemap** — `mv data/feeds/sitemap.xml data/feeds/sitemap.xml.stale`. Kontrolli nginx konfig (`/etc/nginx/sites-enabled/xlmarket.store`): kas on `location = /sitemap.xml` eraldi rule? Kui jah, kustuta see — lase Next.js `app/sitemap.ts` teha.
4. **Align `branches.ts` → TAXONOMY_V3** — 22 exact entries. Eemalda 2 orbu (audit ütleb 24, tegelikult 23). Diff tööriistaga: `diff <(jq -r '.[] .slug' taxonomy-v3.json) <(jq -r '.[] .slug' branches.json)`.

### Faas 2 — DB konsolidatsioon (1-2h, requires backup)
**Ära alusta ilma backupita!**

1. **Seed v3 L2 kategooriate struktuur** — uus script `scripts/seed-v3-l2-categories.mjs`:
   ```
   Sisend: taxonomy-v3-l2.ts (uus fixture)
   Iga L2-le: POST /admin/product-categories { name, handle, parent_category_id: <v3 L1 id> }
   Output: ~132 uut L2 kategooriat
   ```

2. **Re-classify kõik tooted** — uue resolver'iga (L1 + L2):
   ```
   node scripts/reclassify-all-products.mjs --execute
   ```
   Iga toote `metadata.vevor_product_type` + title + description → `classifyProduct()` → Medusa `POST /admin/products/:id { categories: [l1_id, l2_id] }`.

   Batch 50. Progress logimine iga 500. Audit kirje igale klassifikatsioonile.

3. **Delete orphan L1 + L3 categories** — ettevaatlikult:
   ```
   node scripts/migrate-categories-to-v3.mjs --execute --delete-orphans
   ```
   See script (juba olemas) kustutab legacy L1-d, mil pole product linke. Pärast faasi 2.2 kõik 31 legacy peaks olema 0-product'i.

4. **Reindex MeiliSearch**:
   ```
   cd backend && node scripts/index-meilisearch.mjs
   curl -X PATCH 'http://127.0.0.1:7700/indexes/products/settings/pagination' \
     -H "Authorization: Bearer $MEILI_KEY" \
     -d '{"maxTotalHits": 20000}'
   ```

5. **Verifitseeri** smoke test'iga:
   ```
   curl -s https://xlmarket.store/et/kategooriad/horeca-food-service | grep -oP 'product-card' | wc -l
   curl -s https://xlmarket.store/et/kategooriad/playground-sets -I  # 200, mitte 308
   curl -s https://xlmarket.store/sitemap.xml | head -30
   ```

### Faas 3 — Storefront alignment (2-3h)

1. **Uus unified routes** — kustuta `/haru/` route (või redirect → `/kategooriad/`). Praegu topelt, maintenance burden.
2. **CategoryExplorer.tsx slugide fix** — `laser-cnc-digital` → `laser-cnc-digital-fabrication` jms.
3. **MegaMenu uuenda** — L2 list tuleb nüüd DB-st (mitte `TAXONOMY_V3.subs` staatilisest literaalist). Fetch `/api/header-categories` tagastab täielik 22 × ~6 struktuur, MegaMenu kasutab seda.
4. **Dead files remove:**
   - `storefront/lib/featured-categories.ts`
   - `storefront/components/SubcategoryPills.tsx`
   - `storefront/lib/menu-order.ts`

### Faas 4 — i18n struktuur (4-6h, separate sprint)

1. Loo `product_category_translation` tabel (backend migration).
2. Seed `taxonomy-v3-i18n.json` — kolm keelt, 22 L1 + 132 L2 = 462 rida käsitsi tõlget (ET + EN + ES).
3. Category page lookup: `SELECT name FROM product_category_translation WHERE category_id = $1 AND locale = $2`.
4. URL-prefix lookup (`/et/c/<slug>`) + fallback EN kui tõlge puudub.
5. hreflang tagid: `<link rel="alternate" hreflang="es" href="/es/c/<slug>">`.

### Faas 5 — Auto-categorization v2 (separate sprint)

1. Uus `backend/src/taxonomy/` moodul.
2. `rules/l1-rules.json` + `rules/l2-rules.json` — migreeri `vevor-to-v3.json`-st ja laienda L2-le.
3. Audit tabel + admin UI vaade.
4. (Later) Meili NN fallback.
5. (Later) Embedding-based NN (Redis Stack vector search).

### Rollback strateegia

**Punkt iga faasi tagasi:**

- **Faas 1** — iga PR reverted individuaalselt (git revert). Zero data loss.
- **Faas 2** — DB backup restore:
  ```
  docker exec -i xlmarket-postgres-1 psql -U xlmarket xlmarket < ~/backups/xlmarket-YYYY-MM-DD.sql
  cd backend && node scripts/index-meilisearch.mjs  # reindex
  ```
  Taastamise aeg: ~10 min (eeldusel 100k ridu toote-tabelis).
- **Faas 3** — git revert frontend koodimuudatused. DB ei puudutatud.
- **Faas 4** — uue tabeli drop, translation fallback EN-le.

**Trigger for rollback:**
- Error rate >2% Sentry'is pärast deploy.
- Category pages 500 status rate >0.5%.
- MeiliSearch hits drop >5% baseline'ist.

---

## 5. Riskid ja lahtised küsimused

### 5.1 Suured riskid

**R1 — Re-classify pikkus ja failure rate.** 14 841 toote puhul @ 100ms per Medusa API call = 25 min. Aga Medusa admin API ühildub batch update'iga halvasti — vajadusel 2-3 tundi sekventsiaalselt. Meili reindex lisab 10 min. **Mitigation:** run off-peak (öösel), monitor error rate, rollback plan valmis.

**R2 — L2 auto-classify accuracy <80%.** Mis siis, kui reeglid tabavad ainult 60%? Siis saab 6000 toodet `needsReview` staatusega, mis on kasutaja Tarmo töökoormus. **Mitigation:** kirjuta algul reeglid top 10 L1-le (mis sisaldavad 80% tooteid), jäta väikesed (music, salon, health) manual-only.

**R3 — Breadcrumb drift jääb.** Kui v3 L2 kategooriatel on sama handle kui legacy L2-l (e.g. `commercial-ovens` — oli v2 `Kitchen > Commercial Ovens`, on v3 `HoReCa > Commercial Cooking > Commercial Ovens`), siis Medusa ei luba duplicate handle'it. **Mitigation:** prefix L2 handle'id L1-i nimega: `horeca-commercial-ovens` (aga see on kole URL). Või vali alternatiivne handle: `commercial-kitchen-ovens`. Või jäta Medusal uuesti loomine — kustuta enne migratsiooni kõik legacy kategooriad.

**R4 — VEVOR feed struktuur muutub.** Kui VEVOR muudab oma productType kategooriapuud, resolver läheb lahti kiilust. **Mitigation:** `stats.unmappedCategories` alarming, weekly audit job, dashboard `/admin/categorization-health`.

### 5.2 Keskmised riskid

**R5 — SEO dip migratsiooni ajal.** 308 redirectid kogunevad, Google crawler võib näidata page authority dip 2-4 nädalat. **Mitigation:** 301 permanent redirects (juba on `permanent: true`), XML sitemap kohene uuendamine, Google Search Console nimekiri.

**R6 — `branches.ts` vs `taxonomy-v3.ts` sünkroonia.** Need on tegelikult sama info kaks kohta. **Mitigation:** ühenda `branches.ts` → `TAXONOMY_V3.extras` (tagline, heroImg, heroGradient). Ainus tõde on `taxonomy-v3.ts`.

**R7 — Meili `maxTotalHits: 5000` cap.** Kui v3 L1 kasvab >5k tooteks (horeca on juba 1900), pole probleem praegu. Aga peale kategooria konsolidatsiooni + uusi tooteid, hädavajalik tõsta 20000-le.

### 5.3 Lahtised küsimused

**Q1 — `/haru/` vs `/kategooriad/` — kumba hoida?** Ma soovitan `/c/` (lühem, SEO-positive), aga hetkel on mõlemad. Kasutaja (Tarmo) peab otsustama ET SEO-traction'i põhjal. Praegu `/haru/` on 24 staatilist route'i, `/kategooriad/` on dünaamilne.

**Q2 — ES turu roadmap — millal?** i18n struktuur (§4 faas 4) on märkimisväärne töö (4-6h). Kui ES turg on >6 kuu kaugusel, ära ehita seda veel. Aga peab vähemalt olema **plan** — ei tohi nüüd URL-struktuuri lukku panna viisiks, mis ES-i takistab.

**Q3 — Kas `/haru/` slug (eesti) peaks mapima EN canonical slug'ile?**
Ehk `/et/haru/paadindus-matk` → `301 /et/kategooriad/boating-camping-outdoor`? Kui jah, mul jääb 22 rida 301-redirect juurde. Kui ei, säilitame eestikeelsed slug'id kui "fancy" routes — aga UX-punkteeritud.

**Q4 — Cross-reference linkid ("See also")** on v3 specis (lk 280-288) aga koodis implementeeritud pole. Kas see peaks olema DB-väli (`related_categories` junction table) või staatiline config? Staatilise eelis: mitte DB-dep. DB-eelis: admin saab muuta.

**Q5 — Embedding-põhine kategoriseerimine (§3.6 v2)** — kas tuleb sel aastal? Sellest sõltub kas investeerida Redis vector stack'i või hoida rule-based (koodi lihtsus).

**Q6 — SPU group L1 konflikt** — mis juhtub kui SPU group'is on erinevate vanausaldus-kategooriatega variante? Praegu `import-vevor-feed.mjs:452` kasutab `primaryRow` — aga variandi title erinevused võivad signaale segada. Vajab test case'i.

**Q7 — Soolase mandaat: 24% VAT tax-inclusive** (feedback_vat_24_tax_inclusive.md memory'st). See ei mõjuta taksonoomiat otse, aga mõjutab toodete hinnakäsitlust kategooria lehel. Peab olema synchronous kategoriseerimise sprintiga.
