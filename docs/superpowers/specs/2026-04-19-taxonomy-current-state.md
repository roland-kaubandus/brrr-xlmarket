# Taksonoomia v3 — Current State (2026-04-19)

**Staatus:** Live, commit `306a5d5` main-is.
**Verifitseeritud:** 2026-04-19 14:52 UTC.
**Eelmine spec:** `docs/superpowers/specs/2026-04-18-taxonomy-final-design.md` on ARHIIV — kirjeldab 22 L1 → 18 L1 migratsiooniteed, v2 resolverit ja vana `vevor-to-v3.json` mappingut. See dokument asendab selle kui autoritatiivne **lõppseisu** kirjeldus; järgmised sessioonid peavad toetuma siia.

---

## §1 — Executive summary

XLMarket taksonoomia on **staatiline, hardcoded, inglise-keelne SSoT-puu**, mille allikas on `backend/src/data/taxonomy.yaml` (13 212 rida). Puu on **18 L1 kategooriat** ja **3 977 sõlme** kokku, sügavusega L1..L7. Tooted seotakse oma **sügavaima teada-oleva leaf'iga** (enamus L3-L5 tasemel), mitte enam L1-le nagu v2-s.

VEVOR feed'i path-id mapitakse leaf-slug'idele hardcoded failis `backend/src/taxonomy/rules/vevor-path-to-leaf.json` (2 692 entrit, 100% confidence exact match). Resolver pipeline (`backend/src/taxonomy/resolver.mjs`) käivitab uue **stage S1.5** (path_to_leaf_exact) enne vanu heuristilisi stages — see tagab, et iga 4-tunnine feed sync ei lükka enam tooteid tagasi L1-le.

Peamised muudatused vs v2 (2026-04-18):
- 22 L1 → **18 L1** (konsolideeritud, vt §2)
- 176 sõlme → **3 977 sõlme** (L1..L7 sügavus lubatud)
- Tootearvu/alamkategooria piirangud eemaldatud (kasutaja otsus 2026-04-18)
- Inglise keel on SSoT, teised keeled tehakse hiljem selle peale
- Uus resolver-stage S1.5 path_to_leaf_exact primary lookup

---

## §2 — L1 struktuur (18 L1)

Täpne järjekord `category-tree.generated.json` `order` väljast. Tootearvud pärit invariants seisust (2026-04-19 14:52).

| # | handle | name_en | L1 cat product bindings |
|---|--------|---------|-------------------------|
| 1 | `horeca-food-service` | HoReCa & Food Service | 1 |
| 2 | `renewable-energy-batteries` | Renewable Energy & Batteries | 0 |
| 3 | `automotive-workshop` | Automotive & Workshop | 1 |
| 4 | `cleaning-janitorial` | Cleaning & Janitorial | 0 |
| 5 | `crafts-sewing-printing` | Crafts, Sewing & Printing | 0 |
| 6 | `salon-spa-wellness` | Salon, Spa & Wellness | 0 |
| 7 | `health-medical-supply` | Health & Medical Supply | 0 |
| 8 | `fitness-sports-games` | Fitness, Sports & Games | 0 |
| 9 | `boating-camping-outdoor` | Boating, Camping & Outdoor Adventure | 0 |
| 10 | `music-entertainment` | Music & Entertainment | 0 |
| 11 | `pets-wildlife-clinic` | Pets, Wildlife, Veterinary & Kennels | 0 |
| 12 | `kids-playgrounds` | Kids & Playgrounds | 0 |
| 13 | `backyard-landscaping-farm` | Backyard, Landscaping & Farm | 0 |
| 14 | `construction-building` | Construction & Building | 0 |
| 15 | `safety-security-workwear` | Safety, Security & Workwear | 0 |
| 16 | `hand-power-tools` | Hand, Power & Specialty Tools | 0 |
| 17 | `warehousing-material-handling` | Warehousing & Material Handling | 0 |
| 18 | `office-commercial-interiors` | Office & Commercial Interiors | 0 |

**Märkus L1 tootearvude kohta:** DB `product_category_product` seob 2 toodet L1-ga (INV-32 outlier artefakt — vt §9). Koondtootearvu L1 sub-tree kohta kuvab storefront sügavaimate leaf'ide kogusumma kaudu (Meili `taxonomy.ancestors` facet).

**Põhimõtted (kasutaja 2026-04-18 otsus):**
- Inglise keel = SSoT. Eesti/hispaania tõlked tehakse hiljem `name_et` / `name_es` väljadega (INV-06 praegu WARN — kõik 18 L1 on ainult inglise keeles YAML-is).
- **Piiranguid pole** — iga L1 on MegaMenu-s nähtav olenemata tootearvust, iga alamtase lubatud, INV-12 (vana product-count piirang) on deprecated.
- Atmosfääri-pilt iga L1 kohta oodatav, 6-t uut genereeriti 2026-04-19 hommikul.

---

## §3 — Sügavus ja sõlmede arv

**Kokku 3 977 sõlme**, jaotus level-de kaupa (verifitseeritud `storefront/lib/category-tree.generated.json`):

| Level | Sõlmede arv | Role |
|-------|-------------|------|
| L1 | 18 | Top-level kategooriad, MegaMenu root |
| L2 | 405 | Põhilised alamkategooriad |
| L3 | 1 363 | Tootepere-tasand |
| L4 | 1 472 | Sügavaim üldjuhtum leaf |
| L5 | 619 | Spetsiifilised variandid |
| L6 | 88 | Harvad edge-case leaf'id |
| L7 | 12 | Üksikud VEVOR-path'i finaalid |

**Miks sügavam kui v2:** VEVOR feed pakub path'e kuni "Kitchen > Tableware & Bar > Brewing Equipment > Split Type Water Alcohol Distiller" (4 level-d) ja hulk path'e jõuavad ka 5-7 level-ni. Me säilitame neid intact, et toote-leht saaks näidata täielikku hierarhiat ja kategooria-leht saaks filtreerida sub-tree kohta (Meili `taxonomy.ancestors`).

**DB taxonomy_node_meta** (status=active) jaotus:

| Level | DB kirjeid |
|-------|-----------|
| L1 | 28 |
| L2 | 512 |
| L3 | 1 332 |
| L4 | 1 455 |
| L5 | 615 |
| L6 | 84 |
| L7 | 11 |

DB totaal (4 037) ületab tree totaali (3 977) — vahe 60 on tekkinud vanematest v2/v3 migratsiooni artefaktidest (INV-32 dupe-artefakt vt §9, INV-05 on clean). Uute v3-sõlmedega DB-s on `level_check` constraint laiendatud 1..10-ni (spec arhiiv §14.5).

---

## §4 — SSoT ja andmevoog

### Single Source of Truth layering

1. **`backend/src/data/taxonomy.yaml`** (13 212 rida) — kogu puu hierarhia, name_en, name_et (puudu enamikes), image_path aliases. MUUDA AINULT SIIN.
2. **`backend/src/taxonomy/rules/vevor-path-to-leaf.json`** (2 692 entrit) — VEVOR path string → leaf_slug. Iga entry näide: `"Kitchen > Dessert Makers > Ice Cream Machines > Commercial Soft Ice Cream Machine": "commercial-soft-ice-cream-machine"`. Regenereeritakse `scripts/bootstrap-taxonomy-v3.mjs` käivitamisel.
3. **`storefront/lib/category-tree.generated.json`** (3 977 sõlme, 49 008 rida) — storefront-i snapshot YAML-ist. Regen käsk: `node scripts/gen-category-tree.mjs`.
4. **`storefront/lib/slug-redirects.generated.json`** — vanade kategooria-slug'ide (v1/v2/legacy) → v3 uued slug'id. DB-s 42 redirect'i. Middleware teeb 301.

### Andmevoog

```
taxonomy.yaml                           → [gen-category-tree.mjs] → category-tree.generated.json
                                                                    ↓
vevor-path-to-leaf.json                 → [S1.5 resolver] ──────────┴─→ DB bindings
                                                                         ↓
                                                                   [index-meilisearch.mjs]
                                                                         ↓
                                                                   Meili taxonomy.ancestors
                                                                         ↓
                                                                   storefront render
```

### Uuendamise käsud

- Muutsin taxonomy.yaml → `node scripts/gen-category-tree.mjs` → commit mõlemad failid
- Muutsin vevor-path-to-leaf.json → `node scripts/reassign-v3-from-mapping.mjs --execute` → `cd backend && node scripts/index-meilisearch.mjs`
- Uued redirect-id → `node scripts/seed-slug-redirects.mjs --execute` → `node scripts/export-slug-redirects.mjs` (regen JSON)

---

## §5 — Resolver v3 pipeline

Fail: `backend/src/taxonomy/resolver.mjs`. Stage-järjekord täpselt (rida 200-268 async ja 273-316 sync):

| # | Stage | Method string | Confidence | Kirjeldus |
|---|-------|---------------|------------|-----------|
| 1 | S1 | `S1_sku_override` | 1.00 | SKU-põhine käsitsi override (rules/sku-overrides.json) |
| 2 | **S1.5** | `S1.5_path_to_leaf_exact` | **1.00** | **Exact match vevor-path-to-leaf.json → leaf_slug, STOP.** |
| 3 | S2 | `S2_path_contains` | ~0.85 | VEVOR path substring match (rules/path-contains.json) |
| 4 | S3 | — | — | L1+L2+L3 override (rules/l1-l2-l3-overrides.json) |
| 5 | S4 | `S4_l1_l2` | 0.75 | L1+L2 override |
| 6 | — | `S5_priority` | 0.70 | Edge-case priority (pressure-washer vs generator) |
| 7 | S5 | `S5_l1_default_only` / `S5_l1_default+keyword` | 0.55-0.65 | Default L1 + guessed L2 keyword |
| 8 | — | `S4_l1+S5_keyword` / `S4_l1_l2+S5_keyword` | 0.70-0.80 | S4 + S5 combine |
| 9 | S6 | — | — | Meili NN (only async, `opts.meiliClient`) |
| 10 | S7 | — | — | LLM classification — **deferred**, always null |
| 11 | S8 | `S8_review_bucket` | 0.00 | Fallback → needs-review-bucket hidden node |

### S1.5 detailid (uus stage)

Fail: `backend/src/taxonomy/stages/s15-path-to-leaf.mjs`.

- Loeb `vevor-path-to-leaf.json` singleton-cache'itud sõnastikku.
- Key = `row.productType.trim()` (nt `"Kitchen > Dessert Makers > Ice Cream Machines > Commercial Soft Ice Cream Machine"`).
- Kui leiab match'i → `{method: "S1.5_path_to_leaf_exact", target_slug, confidence: 1.0}`.
- Guardrail: target_slug peab olemas olema `validSlugs` set-s (category-tree.generated.json `nodes` keys). Kui ei ole → console.warn + fall through.
- Resolver `materializeS15Hit()` tuletab ancestor-ahela `ancestorsFromLeaf()` abil (walk parent_handle kuni L1) ja täidab envelope'i `l1 / l2 / l3 / target_slug` väljad.

### Envelope

```
{
  l1_slug, l2_slug, l3_slug,     // 3-level legacy shape
  target_slug,                   // sügavaim leaf (L4..L7), S1.5 only
  confidence,                    // 0..1.00
  method,                        // stage name
  needs_review,                  // conf < 0.85
  review_bucket,                 // conf < 0.60
  raw_path                       // VEVOR productType audit
}
```

### Rollback / escape hatch

`USE_LEGACY_RESOLVER=1` env var — import script kasutab vana classify pipeline'i ilma S1.5-ta. Kinnitatud olemasolevaks (spec §14.5 arhiiv).

### Audit log

Tabel `category_classification_audit`, **87 148 rida** (verifitseeritud). Iga classify kirjutab `method`, `confidence`, `raw_path`, `result_slug`.

**TBD:** Kõige värskem audit-kirje on `2026-04-19 09:59:45 UTC` — enne commit 306a5d5 deploy'i. S1.5 method string (`S1.5_path_to_leaf_exact`) ei ole veel audit-is ühtegi kirjet. Järgmine feed sync (cron `0 */4 * * *`) kirjutab esimesed. **Oluline verifitseerida järgmises sessioonis**, kas S1.5 dominiib histogrammi.

---

## §6 — Storefront kuvamine

### Kategooria leht `/[locale]/kategooriad/[handle]`

Fail: `storefront/app/[locale]/kategooriad/[handle]/page.tsx`.
Layout (F5.x sessioonide tulemus):
1. Breadcrumb (SSoT-st — root → L1 → ... → leaf)
2. Pealkiri + tootearv (count breadcrumb-i juurde, mitte toolbar-ile)
3. Subcategory carousel (max-w-1360px, peegelda grid'i)
4. Toolbar (sort + filter UI)
5. Sidebar + 4-col product grid (>=1280px)

Meili filter: `taxonomy.ancestors = "<handle>"` — tagastab kõik sub-tree tooted.

### Tooteleht `/[locale]/toode/[handle]`

Fail: `storefront/app/api/product/[handle]/route.ts`.
Breadcrumb source priority (fix commit 306a5d5):
1. **Meili `taxonomy.ancestors`** (authoritative leaf→root chain) — eelistatud
2. `category_handles` legacy field fallback
3. Medusa product_category bindings fallback
4. Viimati "Home" only (invariant rikkumine)

`firstKnownHandle()` helper (`storefront/lib/category-tree.ts`) valib esimese kandidaadi, mis leidub tree-s.

JSON-LD BreadcrumbList kasutab sama allikat (SEO drift fix, samas commit).

### MegaMenu

Fail: `storefront/components/MegaMenu.tsx`. **Rekursiivne N-level drill**: L1 hover → L2 panel → L3 panel → ... kuni leaf. Kasutab `storefront/lib/category-tree.ts` helpers'it.

### Meili filterable attributes

Verifitseeritud: `["categories","category_handles","subcategory","price","in_stock","translated","filter_tokens","taxonomy.l1_slug","taxonomy.l2_slug","taxonomy.l3_slug","taxonomy.ancestors","vertical_slugs","handle"]`.

`handle` on filterable — tagab et tooteleht API saab Meili-st hit'i `filter="handle = \"x\""` kaudu (breadcrumb fix commit 306a5d5).

### Meili docs kogus

14 850 dokumenti, 20 fieldi 100% katvusega (title_et, title_en, description_et, description_en, taxonomy, vertical_slugs, jne.).

---

## §7 — Invariants

Fail: `scripts/check-taxonomy-invariants.mjs` (776 rida). Käivitus CLI: `node scripts/check-taxonomy-invariants.mjs`. Dashboard: `/xl-admin/taxonomy-health`. CI mode: lisa `--json`.

**Praegune seis (2026-04-19 14:52): 23 pass / 2 warn / 3 crit / 1 deprecated (of 29 invariants).**

| # | Nimi | Severity | Staatus |
|---|------|----------|---------|
| INV-01 | taxonomy.yaml parses + top-level shape | CRIT | PASS — 18 L1 |
| INV-02 | Taxonomy size counters | WARN (informational) | PASS — 18/405/1363 |
| INV-03 | No duplicate slugs in tree | CRIT | PASS — 1786 unique |
| INV-04 | category-tree.generated.json matches YAML | CRIT | PASS |
| INV-05 | No redirect collides with active node | CRIT | PASS — 0/0 |
| INV-06 | Every L1 has et + en names | WARN | **WARN** — kõik 18 L1 ilma name_et |
| INV-10 | DB == taxonomy.yaml | CRIT | SKIP (backend env) |
| INV-11 | Every product has ≥1 category | CRIT | SKIP (backend env) |
| INV-12 | (vana L2≥50 / L3≥100) | — | DEPRECATED — piiranguid pole |
| INV-13 | No product placed at hidden node | CRIT | SKIP (backend env) |
| INV-14 | Meili ancestors matches DB bindings leaf-level | WARN | **WARN** — 50/50 sample drift ordering bug; ancestors salvestatakse leaf→root, INV-14 võrdleb root→leaf. Andmed OK, agent bug. Vt §9. |
| INV-15 | Every L1/L2 slug resolves 200 | CRIT | SKIP (TAXONOMY_HEALTH_LIVE=1) |
| INV-16 | No slug_redirect chain >3 hops | WARN | SKIP |
| INV-17 | vertical_collection materialization ≤26h | WARN | SKIP (SQL) |
| INV-18 | needs-review-bucket size <500 | WARN | SKIP |
| INV-19 | Unmapped VEVOR paths last import ≤10 | WARN | SKIP |
| INV-20 | 100% v3 nodes have image_path | CRIT | **CRIT** — 682 sõlme ilma pildita |
| INV-21 | Every image_path file exists on disk | CRIT | PASS |
| INV-22 | taxonomy-image-aliases.yaml alias targets exist | CRIT | PASS — 165 aliases |
| INV-23 | Unique parent chains ending at L1 root | CRIT | PASS |
| INV-24 | Category breadcrumb ends at cat node | CRIT | PASS — 18 L1 |
| INV-25 | Subcategory carousel hides 0-product children | WARN | SKIP (Meili) |
| INV-26 | Every node has image_source !== 'none' | CRIT | **CRIT** — 682 nodes image_source=none |
| INV-27 | Breadcrumb trail length === depth+1 | CRIT | PASS |
| INV-28 | No category_handles refs in category page code | CRIT | PASS |
| INV-29 | Product grid 4 cols at >=1280px | CRIT | SKIP (Playwright E2E) |
| INV-30 | MegaMenu drills L1 → Ln without 404 | CRIT | SKIP (Playwright E2E) |
| INV-31 | No VEVOR-internal slug leaks in UI | CRIT | PASS |
| INV-32 (uus) | Products bound to deepest leaf (v3 path-to-leaf) | CRIT | **CRIT** — 29/14848 drift (dupe-artefakt, vt §9) |

**Hiljuti muudetud commit 306a5d5:**
- INV-02 downgrade WARN (informational only).
- INV-12 deprecated skip.
- INV-14 laiendatud leaf-level võrdluseni (50-sample).
- INV-32 uus CRIT — iga toode peab sügavaimal leaf'il v3 mapping järgi.

---

## §8 — Feed sync

- **Cron:** `0 */4 * * *` (iga 4 tundi) — verifitseeritud `crontab -l`. Aktiivne, mitte PAUSED.
- **Skript:** `scripts/feed-sync.sh` → download XLSX → update `backend/data/feeds/vevor-feed-cache.json` → `scripts/import-vevor-feed.mjs` → stock sync → `scripts/generate-osta-feed.mjs` + `scripts/generate-facebook-feed.mjs`.
- **Import:** kasutab `classifyProductSync()` mis käivitab S1 → S1.5 → S2-S5/priority → S8 pipeline'i (sync versioon ilma S6/S7-ta).
- **S1.5 kate:** 2 692 VEVOR path'i → leaf. Tundmatu path → S8 review_bucket (`needs-review-bucket` hidden kategooria).
- **Admin UI:** `/xl-admin/categorization-queue` — inimene saab reviewida ja luua uus vevor-path-to-leaf.json entry.
- **Daily drain:** `scripts/drain-review-queue.mjs` — cron TBD (planned).

**Healthcheck:** `*/2 * * * * scripts/storefront-healthcheck.sh` — auto-restart hung storefront (eraldi cron, ei sega feed sync).

---

## §9 — Tuntud probleemid ja piirangud

### INV-14 WARN — agent bug

Meili salvestab `taxonomy.ancestors` leaf→root järjekorras (nt `["commercial-soft-ice-cream-machine", "ice-cream-makers", "dessert-makers", "small-kitchen-appliances", "appliances", "horeca-food-service"]`). INV-14 sample võrdleb seda DB bindings'tega root→leaf ordering'is, mis annab 50/50 drift. **Andmed on korrektsed.** Fix = INV-14 võrdlusjärjekorra pööramine või set-comparison. **TBD** järgmise sessioonis.

### INV-32 CRIT 29/14 848 — dupe-kategooria artefakt

Näide: `split-type-water-alcohol-distiller` slug'iga eksisteerib DB-s 4 `product_category` kirjet (erineva id-ga, sama handle). Tooted on seotud ainult ühega; INV-32 võrdleb `expected=split-type-water-alcohol-distiller` vs `actual=[]` sest tootel ON binding teise dupe-id külge. Andmed töötavad storefront-is (taxonomy.ancestors chain on korrektne), aga invariant raporteerib false positive'i. **Fix:** dupe-cleanup skript — ei ole veel kirjutatud. **TBD.**

### INV-20 + INV-26 CRIT — 682 sõlme ilma pildita

682 uut v3 sõlme (peamiselt L3-L6) ei oma atmosfäär-pilti. SVG fallback (`storefront/components/CategoryThumb.tsx`) kuvab initial-based ikooni. Rohkemad atmosfäär-pildid tuleb genereerida nano-banana pro-ga. Mitte-blokeeriv, visuaal acceptable.

### SPU grouping (ei ole taksonoomia, aga seotud)

363 toodet on grupeeritud mitme variandiga (nt solar panel 150W/300W/400W). Kasutaja 2026-04-19 otsus: "need tuleb kõik eraldi toodetena välja tuua". Migration plaan salvestatud memory-sse (`project_spu_ungrouping_plan.md`). ~6-8h töö. Järgmine sessioon.

### Audit-is puudub veel S1.5 method

Viimane audit-kirje on `2026-04-19 09:59` — enne commit 306a5d5 deploy'i. S1.5 method string ei ole veel audit-is ühegi rea peal. Järgmine feed sync cron tick kirjutab esimesed S1.5_path_to_leaf_exact entrid. **Oluline verifitseerida** kas histogrammi S5_l1_default_only dominiib langeb ja S1.5 tõuseb (oodatav ~50-70% katvus S1.5-ga).

---

## §10 — Kriitilised failid (quick reference)

| Fail | Otstarve | Millal muuta |
|------|----------|--------------|
| `backend/src/data/taxonomy.yaml` | Puu SSoT (13 212 rida) | Uus L1/L2/Ln sõlm, name_et/es tõlke |
| `backend/src/taxonomy/rules/vevor-path-to-leaf.json` | 2 692 VEVOR path → leaf | Uus VEVOR path (review queue drain) |
| `backend/src/taxonomy/resolver.mjs` | 8-stage pipeline | Uus stage, threshold muutus |
| `backend/src/taxonomy/stages/s15-path-to-leaf.mjs` | S1.5 exact lookup | Väga harva — stabiilne |
| `backend/src/taxonomy/rules/*.json` | sku/path/l1/l2 overrides (7 faili) | Individual rules |
| `scripts/gen-category-tree.mjs` | YAML → JSON snapshot | Pärast taxonomy.yaml muutust |
| `scripts/reassign-v3-from-mapping.mjs` | Idempotent DB bindings reset | Pärast mapping muutust või deploy'd |
| `scripts/check-taxonomy-invariants.mjs` | 29 invariants (CLI + --json CI) | Uus invariant, severity muutus |
| `scripts/bootstrap-taxonomy-v3.mjs` | Regen YAML + mapping feed-ist | Suur refactor, v4 migration |
| `scripts/feed-sync.sh` | 4h cron pipeline | Cron-induced |
| `scripts/import-vevor-feed.mjs` | XLSX → Medusa + classify | Feed-schema muutus, import logic |
| `scripts/drain-review-queue.mjs` | Daily review bucket drain | Cron TBD |
| `backend/scripts/index-meilisearch.mjs` | Reindex + set filterable | Schema muutus |
| `storefront/lib/category-tree.generated.json` | 3 977 sõlme snapshot | **ÄRA käsitsi muuda** — regen |
| `storefront/lib/slug-redirects.generated.json` | 42 redirect'i | Regen `export-slug-redirects.mjs` |
| `storefront/lib/category-tree.ts` | SSoT helpers (getBreadcrumbTrail, firstKnownHandle) | Tree-traversal API |
| `storefront/components/MegaMenu.tsx` | N-level drill UI | Navigation UX |
| `storefront/components/CategoryThumb.tsx` | Pilt + SVG fallback | Image strategy |
| `storefront/middleware.ts` | 301 slug_redirects + locale | Redirect rules |
| `storefront/app/[locale]/kategooriad/[handle]/page.tsx` | Kategooria leht | Layout, filter UI |
| `storefront/app/api/product/[handle]/route.ts` | Toote andmete API | Breadcrumb, enrichment |
| `storefront/ecosystem.config.js` | PM2 cluster + .env.local parser | Env vars, process count |

---

## §11 — Remediation runbooks

- **`docs/runbooks/taxonomy-invariant-failures.md`** (8 688 baiti) — per-invariant INV-01..INV-32 remediation steps. Kui invariants FAIL, käivita vastav sektsioon.

Spec §3.5 + §3.6 arhiiv-spec'is on veel aktuaalsed kategooria UI + SEO JSON-LD nõuded.

---

## §12 — Versiooniajalugu

| Versioon | Kuupäev | Peamised muudatused |
|----------|---------|---------------------|
| v1 (legacy) | <2026-04-18 | 31 legacy L1 + 22 v3 L1 segu, 53 L1 kokku DB-s |
| **v2** | 2026-04-18 | 22 L1, 176 sõlme (L1..L3), product-count piirangud (L2≥50, L3≥100), resolver v2 (8 stages ilma S1.5), `vevor-to-v3.json` mapping. 9 337/14 850 toodet L1-l kinni (63%). |
| **v3 bootstrap** | 2026-04-19 01:30-03:15 | 18 L1, 3 977 sõlme (L1..L7), piiranguid pole, `vevor-path-to-leaf.json` 2 692 mapping, DB `level_check` 1..10. Commit `1772b89`. 14 848/14 850 seotud leaf'ile. |
| **v3 resolver S1.5** | 2026-04-19 ~14:00 | Uus stage S1.5 path_to_leaf_exact primary. Commit `306a5d5`. Fix'ib feed-sync regressiooni (tooted tagasi L1-le). Tooteleht breadcrumb Meili ancestors authoritative. Invariants INV-02/12/14/32 uuendatud. |

### Kadunud L1-d v2 → v3 konsolideerimisel

- `woodworking-carpentry` → `hand-power-tools`
- `metalworks-welding` → `hand-power-tools`
- `printing-engraving` → `crafts-sewing-printing`
- `educational-lab` → split: Lab → `health-medical-supply`, Edu toys → `kids-playgrounds`, Industrial → `hand-power-tools`
- `farm-agriculture` → `backyard-landscaping-farm`

### Uued L1 v3-s

- `renewable-energy-batteries` (uus, solar + akud)
- `safety-security-workwear` (välja tõstetud `construction-building` alt)

---

## §13 — Järgmised sammud (out of scope siin spec-is)

Salvestatud memory-sse, mitte selle dokumendi osa:
- SPU ungrouping (`project_spu_ungrouping_plan.md`)
- Admin inline-edit kategooriate ümber-määramine
- 682 atmosfäär-pildi genereerimine
- INV-14 agent bug fix
- INV-32 dupe-category cleanup
- Multi-category tagimine (toode 2+ kategoorias)
- Vertikaalid (`/alustajale/[vertical]`) materialization cron (Faas 4 arhiiv, 3 vertical_collection rida 2026-04-18 09:24 — stale)
