# Proposal Agent 3 — System Architecture

**Role:** Agent B — system architect. Focus: mechanisms, invariants, interfaces. Not product lists.

---

## 1. Architectural Principles

Seven invariants that must hold at all times. Every other decision in this document follows from these.

1. **Single source of truth (SSoT) for taxonomy.** Exactly one machine-readable fixture (`taxonomy.yaml` or equivalent) defines every L1, L2, L3. Database, `branches.ts`, MegaMenu, sitemap, and Meili index are all derived artifacts, never hand-edited.
2. **Slugs are stable identifiers, not names.** Once a slug is public, it is immutable. Display names are translated at runtime; slugs are not.
3. **Each product belongs to exactly one canonical path `(L1, L2?, L3?)`.** No product is double-assigned across L1s. Duplication is solved by cross-reference links, not by duplicate categorization.
4. **Taxonomy and vertical collections are orthogonal axes.** Taxonomy (`/tooted/puurid/akutrell`) answers "what kind of object is this." Vertical collections (`/alustajale/kohvik`) answer "what business is this for." They intersect but never overwrite each other.
5. **Every import run must terminate with known outcomes.** A product is either classified with confidence ≥ threshold, or explicitly queued for review. No silent fallthroughs, no hidden `other` bucket.
6. **All taxonomy invariants are enforceable by CI.** If an invariant cannot be checked by a cron or CI job, it does not exist in practice.
7. **Redirects are rules, not one-offs.** Redirect entries are emitted by the slug-change pipeline, not hand-added to `next.config.ts`.

---

## 2. Data Model

### 2.1 Logical model

```
                  ┌──────────────────────────┐
                  │   taxonomy_node          │  (flat, self-referencing tree)
                  │──────────────────────────│
                  │ id              PK       │
                  │ slug            UNIQUE   │  e.g. "mig-tig-welders"
                  │ parent_id       FK self  │  null for L1
                  │ level           1|2|3    │  materialised for fast CI
                  │ source          enum     │  "v3" | "derived" | "legacy"
                  │ status          enum     │  "active" | "hidden" | "deprecated"
                  │ product_count_cached int │  nightly rollup
                  │ created_at, updated_at   │
                  └──────────┬───────────────┘
                             │ 1:N
                             ▼
                  ┌──────────────────────────┐
                  │ taxonomy_node_translation│
                  │──────────────────────────│
                  │ node_id  FK              │
                  │ locale   varchar(5)      │  "et" | "en" | "es"
                  │ name             text    │
                  │ meta_title       text    │
                  │ meta_description text    │
                  │ PK (node_id, locale)     │
                  └──────────────────────────┘

                  ┌──────────────────────────┐
                  │ product_taxonomy         │  (canonical placement)
                  │──────────────────────────│
                  │ product_id  FK           │
                  │ node_id     FK  (L3|L2|L1)│  deepest known node
                  │ confidence  numeric(3,2) │
                  │ method      enum         │  rule|keyword|nn|llm|manual
                  │ needs_review bool        │
                  │ assigned_at ts           │
                  │ PK (product_id)          │  ← one canonical path per product
                  └──────────────────────────┘

                  ┌──────────────────────────┐
                  │ slug_redirect            │  (rule-emitted)
                  │──────────────────────────│
                  │ from_slug    UNIQUE      │
                  │ to_slug                  │
                  │ reason       enum        │  rename|merge|deprecate
                  │ created_at               │
                  │ expires_at    nullable   │  NULL = permanent
                  └──────────────────────────┘

                  ┌──────────────────────────┐
                  │ vertical_collection      │  (persona/project axis)
                  │──────────────────────────│
                  │ id              PK       │
                  │ slug    UNIQUE           │  "kohvik", "haljastus"
                  │ mode    enum             │  "alustajale"|"arikliendile"|"hooldus"
                  │ hero_img, blurb, …       │
                  │ status  enum             │  "draft"|"active"|"archived"
                  └──────────┬───────────────┘
                             │ 1:N
                             ▼
                  ┌──────────────────────────┐
                  │ vertical_collection_rule │  (declarative include/exclude)
                  │──────────────────────────│
                  │ collection_id  FK        │
                  │ kind   enum              │  include_node | include_product
                  │                          │  exclude_node | exclude_product
                  │ node_slug      nullable  │  if kind = *_node
                  │ product_id     nullable  │  if kind = *_product
                  │ weight  numeric (sort)   │
                  │ reason  text             │  human-readable (shown in admin)
                  └──────────────────────────┘

                  ┌──────────────────────────┐
                  │ categorization_audit     │  (import + reclassify log)
                  │──────────────────────────│
                  │ id BIGSERIAL             │
                  │ product_id               │
                  │ vevor_product_type text  │
                  │ signals       jsonb      │
                  │ result_l1/l2/l3 slugs    │
                  │ confidence, method       │
                  │ needs_review bool        │
                  │ created_at               │
                  └──────────────────────────┘
```

### 2.2 Medusa mapping

Medusa 2.0 already has `product_category` with `parent_category_id`. We reuse it for `taxonomy_node` (Medusa handle = our slug), with two additions:

- a companion table `taxonomy_node_meta` keyed by `category_id` for `source`, `status`, `product_count_cached`, `level` (these don't exist natively)
- `product_taxonomy` is a view over Medusa `product_category_product` constrained by the invariant "one row per product"

`vertical_collection` and `vertical_collection_rule` are **net-new tables** owned by a lightweight Medusa module. They do not exist in Medusa core.

### 2.3 Why not just use Medusa `product_collection`?

Medusa collections are flat (no rules), manual (admin picks products), and have no concept of "include everything under node X except Y." Vertical collections need rules, not membership lists — 14,841 products × 20 collections is unmaintainable by hand. Hence a rule table.

---

## 3. Taxonomy Shape Rules

### 3.1 Cardinality

| Level | Count | Shape rule |
|-------|-------|------------|
| L1 | 18–22 (target: 22) | Fixed. Changes require written ADR. |
| L2 | 4–8 per L1 | Each L1 has ≥4 L2s. |
| L3 | 0–12 per L2 | L3 exists only if it adds facet/browse value. |

Cardinality bounds are enforced by CI (§8).

### 3.2 Lifecycle rules — when to add / merge / kill

**Add a node:**
- L1: only via ADR. Requires ≥200 products within 90 days, or a distinct B2B buyer persona documented in research.
- L2: when a sibling L2 exceeds 500 products and contains ≥2 recognisable subcategories (measured by keyword clustering).
- L3: when a facet filter would be useful but isn't expressible as a product attribute.

**Merge two nodes (A → B):**
- If A has <30 products for 60 consecutive days.
- If >70% of A's products share keywords with B.
- Merge emits `slug_redirect(A → B)` and a `categorization_audit` entry per moved product.

**Kill (deprecate) a node:**
- Soft: `status = hidden` (no menu, no listing page). Redirect to parent.
- Hard (30 days later): `status = deprecated`. Products reassigned to parent or sibling. `slug_redirect` permanent.

**Rename (slug change):**
- Forbidden for L1 after go-live unless accompanied by ADR.
- L2/L3: allowed; emit `slug_redirect(old → new)` with `expires_at = NULL` (permanent).

### 3.3 Drift prevention

The 53-L1 mess happened because no single process owned the node set. Rules:
- **Nobody writes directly to `product_category` except the migration runner and the import pipeline.** Admin UI create/edit is disabled for categories. ADR-gated CLI only.
- **`branches.ts` is generated, not written.** `npm run gen:taxonomy` produces it from `taxonomy.yaml`.
- **Any DB row in `taxonomy_node` not present in `taxonomy.yaml` is flagged by CI** within 24h.

---

## 4. Feed Import Pipeline

### 4.1 Stages (deterministic, ordered, short-circuit on high confidence)

```
VEVOR row
  │
  ▼
[S1] Manual override (sku_overrides.json)       conf=1.00 → STOP
  │
  ▼
[S2] path_contains (VEVOR full path substring)  conf=0.95 → STOP
  │
  ▼
[S3] l1_l2_l3_overrides (exact triple)          conf=0.95 → STOP
  │
  ▼
[S4] l1_l2_overrides (exact pair)               conf=0.85 → continue L2
  │
  ▼
[S5] l1_defaults + L2 keyword scoring           conf from scorer
  │
  ▼
[S6] Meili nearest-neighbour (within resolved L1) conf capped 0.75
  │
  ▼
[S7] LLM classifier (Claude Haiku, batched)     conf from LLM
  │
  ▼
[S8] Fallback: queue for review, assign to
     L1 `needs-review-bucket` (hidden node)     conf=0.0, needs_review=true
```

Every stage writes to `categorization_audit` with the signals it evaluated and the outcome. The final `(l1, l2, l3, confidence, method, needs_review)` tuple is written to `product_taxonomy` as a single row (one product, one path).

### 4.2 Thresholds

| Signal | confidence floor | action |
|--------|------------------|--------|
| ≥ 0.85 | auto-assign, `needs_review=false` |
| 0.60–0.84 | auto-assign, `needs_review=true`, surface in admin queue |
| < 0.60 | park in `needs-review-bucket`, mark `status=draft` on product (not publicly visible) |

### 4.3 The `other` drain

There is no public `other` category. Products that fail all signals land in an **internal** `needs-review-bucket` node with `status=hidden`. This node is never surfaced in MegaMenu, sitemap, Meili facets, or `branches.ts`. It exists solely so the DB invariant "every product has exactly one taxonomy node" can still hold.

**Drain process:**
- Daily cron `drain-review-queue.mjs` sends a Slack digest to `#xl`: "N products in review-bucket, age histogram, top unmapped VEVOR paths."
- Admin UI page `/admin/categorization-queue` lets Tarmo bulk-assign with 1-click per-product or per-VEVOR-path rules. A bulk rule creates a new `l1_l2_overrides` entry, which re-runs stages S3–S5 on all matching products.
- Products in the bucket for >14 days escalate: Huly issue auto-created, product stays `status=draft`.

### 4.4 Queue and priority

```
categorization-queue.json         — products awaiting LLM / NN pass
categorization-review-bucket      — internal node ID, hidden
categorization-manual-overrides   — SKU → explicit slug, version-controlled
```

LLM batch runs nightly (03:00 Europe/Tallinn) on queue ≤ N items; cost cap $1/day. Above cap, remainder waits for next night.

### 4.5 Safety rails

- Stage S2–S5 rule files live under version control; every change is a PR.
- Import run emits a summary artifact: `imports/<ts>/summary.json` with per-stage counts, unmapped VEVOR paths, confidence histogram. Hash-compared across runs: if unmapped L1 set grows by >3 in one run, import pauses and pings Slack.
- No rule engine edit may silently reclassify >5% of existing products. Reclassify jobs are explicit and opt-in.

---

## 5. MeiliSearch Indexing Spec

Index: `products`. One document per product (not per variant). Variant-level facets are array-valued on the product document.

### 5.1 Field list

| Field | Type | searchable | filterable | facetable | sortable | Purpose |
|-------|------|:---:|:---:|:---:|:---:|---------|
| `id` | string | – | ✔ | – | – | primary key |
| `title` | string | ✔ | – | – | – | primary text match |
| `title_translations.et/en/es` | object | ✔ | – | – | – | locale-boosted search |
| `handle` | string | – | ✔ | – | – | URL lookup |
| `sku` | string | ✔ | ✔ | – | – | exact SKU search |
| `vevor_sku` | string | ✔ | ✔ | – | – | supplier reference |
| `description_snippet` | string(≤400) | ✔ | – | – | – | relevance signal, not displayed |
| `selling_points` | string[] | ✔ | – | – | – | relevance signal |
| `brand` | string | ✔ | ✔ | ✔ | – | brand filter |
| `taxonomy.l1_slug` | string | – | ✔ | ✔ | – | canonical L1 |
| `taxonomy.l2_slug` | string? | – | ✔ | ✔ | – | canonical L2 |
| `taxonomy.l3_slug` | string? | – | ✔ | ✔ | – | canonical L3 |
| `taxonomy.ancestors` | string[] | – | ✔ | ✔ | – | `[l1, l2, l3]` for single-filter drill |
| `vertical_slugs` | string[] | – | ✔ | ✔ | – | e.g. `["alustajale:kohvik","arikliendile:haljastus"]` |
| `price_cents` | int | – | ✔ | – | ✔ | price filter + sort |
| `in_stock` | bool | – | ✔ | ✔ | – | availability |
| `stock_qty` | int | – | ✔ | – | ✔ | precise filter |
| `attributes` | object (flat) | – | ✔ | ✔ | – | e.g. `voltage:230V`, `power_kw:2.2` — only typed, validated keys |
| `thumbnail` | string | – | – | – | – | display only |
| `published_at` | int (unix) | – | ✔ | – | ✔ | "new arrivals" sort |
| `popularity` | int | – | – | – | ✔ | editorial ranking |

### 5.2 Settings invariants

```
searchableAttributes: [title, title_translations.*, sku, vevor_sku,
                       selling_points, brand, description_snippet]
filterableAttributes: [handle, sku, vevor_sku, brand,
                       taxonomy.l1_slug, taxonomy.l2_slug, taxonomy.l3_slug,
                       taxonomy.ancestors, vertical_slugs,
                       price_cents, in_stock, stock_qty, attributes.*, published_at]
sortableAttributes:   [price_cents, stock_qty, published_at, popularity]
pagination.maxTotalHits: 20000
faceting.maxValuesPerFacet: 200
```

### 5.3 Vertical collections in Meili

**Decision: denormalized `vertical_slugs` array field. No separate index.**

Rationale: vertical collections are queries, but re-evaluating a 14,841-product rule set at query time per visitor is wasteful. Nightly job `materialize-verticals.mjs` walks each `vertical_collection_rule` set, computes the product set, and writes `vertical_slugs: [...]` back to Meili docs. Single-shot `PATCH /documents`. Query becomes:

```
filter: "vertical_slugs = 'alustajale:kohvik' AND in_stock = true"
```

This is fast, cacheable, and uses the same facet infrastructure. Real-time rules are out of scope (daily freshness is acceptable for a showroom).

### 5.4 Why not one Meili index per vertical?

Because products appear in multiple verticals (a dishwasher is both "alustajale:kohvik" and "arikliendile:restoran"), separate indexes triple storage and complicate updates. One denormalized array is cleaner.

---

## 6. Vertical Collection Mechanism

### 6.1 The dual-axis model

```
Axis A — Taxonomy (product-kind)
  /tooted/{l1}/{l2?}/{l3?}
  → drives: MegaMenu, breadcrumbs, SEO category pages, facets

Axis B — Vertical (project/business context)
  /alustajale/{vertical}
  /arikliendile/{vertical}
  /hooldus/{vertical}
  → drives: starter kits, curated bundles, "everything for X business"
```

A product is **always** in exactly one Axis A path. A product may appear in **zero or more** Axis B collections.

### 6.2 Rule-based membership

A vertical collection's product set is defined by rules, not explicit membership:

```yaml
vertical_collection:
  slug: kohvik
  mode: alustajale
  rules:
    - include_node: horeca-food-service/commercial-cooking-equipment
    - include_node: horeca-food-service/bar-beverage-service
    - include_node: horeca-food-service/commercial-refrigeration
    - include_node: office-commercial-interiors/restaurant-furniture  # cross-L1
    - exclude_product: prod_01H…  # explicit veto
    - include_product: prod_01J…  # explicit add
```

The materialization job computes the product set as:

```
products = (∪ include_node + ∪ include_product) − (∪ exclude_node + ∪ exclude_product)
```

### 6.3 Why rules beat tags beat tables

- **Tags on products:** simple but requires re-tagging 500 products when a rule changes. Hard to audit.
- **Table (junction `product ↔ collection`):** flexible but membership drift — a new product in `commercial-refrigeration` is not auto-included.
- **Rules + materialized view:** new products in an included node are picked up at the next nightly build, without manual intervention. Audit is one place (the rule set).

### 6.4 URL scheme

```
/{locale}/alustajale/kohvik            → landing page + hero + story + grid
/{locale}/alustajale/kohvik?filter=…   → same page, facet state in URL
/{locale}/tooted/horeca-food-service   → taxonomy L1 page
```

A vertical page is fundamentally a curated facet view; the URL differs only because the framing differs. The same `<ProductGrid>` component renders both.

### 6.5 Discovery bridge

Every taxonomy page displays "This is used in:" chips linking to verticals where its products appear ≥80%. Every vertical page displays "Browse the full catalog:" links to the top 3 L1s of its members. This is computed from the materialization output, not hand-maintained.

---

## 7. Redirect and Slug Strategy

### 7.1 Slug ownership

Slugs are owned by `taxonomy.yaml`. A slug change is a file edit, reviewed in a PR, which triggers:

1. Update `taxonomy_node.slug` in DB.
2. Insert row into `slug_redirect(from=old, to=new, reason=rename)`.
3. Reindex Meili (handles are stored as slugs).
4. Regenerate `branches.ts` and sitemap.

### 7.2 Where redirects live

**Single source: `slug_redirect` table.** Emitted from there to:

- **Next.js middleware** (`middleware.ts`): consults a Redis-cached copy of the table on each request; returns 301. No hand-edits in `next.config.ts` redirects block.
- **Sitemap generator:** excludes any slug present in `from_slug`.

Hand-edited `next.config.ts` redirects are removed; the `playground-sets` collision (Agent 1 §1.2, Agent 2 §1.3) cannot recur because the table's unique constraint on `from_slug` would block a redirect pointing at a live slug.

### 7.3 Rule: when does a change emit a 301 vs a new category?

| Change | Emits 301 | Creates new node |
|--------|:---:|:---:|
| Rename a node (same products, better name) | ✔ | ✗ |
| Split one node into two | ✔ (old → larger half) | ✔ (new node for smaller half) |
| Merge two nodes | ✔ (deprecated → kept) | ✗ |
| Move products across nodes without slug change | ✗ | ✗ |
| Add a fresh category for net-new products | ✗ | ✔ |

### 7.4 TTL and cleanup

Redirects default to permanent. A quarterly cron drops rows with `expires_at < now()`. Chains longer than 1 hop are collapsed by the same job (if `A → B` and `B → C`, rewrite `A → C`). Chains longer than 3 are a hard CI failure.

---

## 8. Enforcement — CI and Cron Invariants

Each invariant below has exactly one checker, which writes pass/fail into `monitoring.taxonomy_health` and alerts Slack `#xl` on fail.

### 8.1 CI checks (run on every PR touching taxonomy)

| ID | Invariant | Check |
|----|-----------|-------|
| INV-01 | `taxonomy.yaml` is valid against JSON Schema | `npm run lint:taxonomy` |
| INV-02 | L1 count ∈ [18, 22]; L2 per L1 ∈ [4, 8]; L3 per L2 ∈ [0, 12] | counting pass on YAML |
| INV-03 | No duplicate slugs anywhere in tree | set-size check |
| INV-04 | `branches.ts` byte-identical to generator output | `diff <(npm run gen:branches --stdout) branches.ts` |
| INV-05 | No slug in `slug_redirect.from_slug` also exists as an active `taxonomy_node.slug` | SQL-equivalent check over fixtures |
| INV-06 | Every L1 in taxonomy.yaml has a translation for et/en (es optional) | check translations fixture |

### 8.2 Cron checks (nightly)

| ID | Invariant | Checker |
|----|-----------|---------|
| INV-10 | `taxonomy_node` set in DB == set in `taxonomy.yaml` | `check-taxonomy-drift.mjs` |
| INV-11 | Every product has exactly one row in `product_taxonomy` | COUNT query |
| INV-12 | No active L1 has <30 products for >60 days (warn) / <10 products for >14 days (alert) | rollup job |
| INV-13 | No product is placed at a node with `status != active` (except review-bucket) | SQL |
| INV-14 | Meili `category_handles` / `taxonomy.ancestors` match DB for every product | diff over sample |
| INV-15 | Every L1/L2 slug in MegaMenu resolves to 200 on `/tooted/{slug}` | smoke-curl |
| INV-16 | No `slug_redirect` chain > 3 hops | graph walk |
| INV-17 | `vertical_collection` materialization is ≤ 26h old | `materialize-verticals.mjs` SLA |
| INV-18 | `needs-review-bucket` size < 500 (warn) / < 2000 (alert) | SQL |
| INV-19 | Unmapped VEVOR path count in last import ≤ 10 new ones | diff imports/<ts>/summary.json |

All failures post to Slack `#xl` with the specific rule ID and offending rows. Repeated failures of the same ID escalate to Huly issues.

### 8.3 Dashboard

A `/admin/taxonomy-health` page renders the latest `monitoring.taxonomy_health` row. Green on all-pass. This is the single place Tarmo looks each morning.

---

## 9. Migration Path

### Phase 0 — Baseline (0.5 day)

- `pg_dump` full DB → `~/backups/xlmarket-$(date +%F).sql`
- Snapshot Meili index → `meili-backup-$(date +%F).tar`
- Freeze `main` branch, create `feat/taxonomy-foundation`.

### Phase 1 — Foundation (1 day)

- Write `taxonomy.yaml` from current `taxonomy-v3.ts` + Agent 1/2 corrections (`playground-sets` → `playground-outdoor-play`, `hand-power-tools` keep slug, etc.).
- Implement `scripts/gen-branches.mjs` (YAML → `branches.ts`).
- Implement `slug_redirect` table + middleware reader (Redis-cached).
- Remove `next.config.ts` hand-redirects; backfill rows into `slug_redirect`.
- Remove stale `data/feeds/sitemap.xml` + nginx rule.

**Exit criteria:** INV-01 through INV-06 pass in CI.

### Phase 2 — DB consolidation (1 day, requires backup)

- Seed `taxonomy_node` (+ meta + translations) from `taxonomy.yaml`.
- Run `reclassify-all-products.mjs` through stages S1–S5 (no LLM yet). Writes `product_taxonomy` rows.
- Delete orphan legacy L1/L2 rows (products re-linked via `product_taxonomy`).
- Reindex Meili with new field layout (§5). Bump `maxTotalHits` to 20000.

**Exit criteria:** INV-10, INV-11, INV-13, INV-14 pass.

### Phase 3 — Vertical collections (1 day)

- Create `vertical_collection` + `vertical_collection_rule` tables + lightweight Medusa module.
- Seed 6–10 initial verticals (`kohvik`, `haljastus`, `auto-remondi-tookoda`, `pisiehitus`, `kinnisvarahooldus`, …) with rule sets.
- Implement `materialize-verticals.mjs` nightly job.
- Wire `/alustajale/{slug}` and `/arikliendile/{slug}` routes to `<ProductGrid>` filtered by `vertical_slugs`.

**Exit criteria:** INV-17 passes; 6+ vertical pages serve 200s.

### Phase 4 — Review pipeline (1 day)

- Build `needs-review-bucket` hidden node.
- Admin UI `/admin/categorization-queue` (list, bulk-assign, create-rule-from-product).
- Daily Slack digest wired.
- LLM stage S7 implemented with strict Zod-validated output and slug whitelist.

**Exit criteria:** INV-18, INV-19 pass; queue drain tested.

### Phase 5 — Enforcement (0.5 day)

- Wire all CI and cron invariants to `monitoring.taxonomy_health`.
- Admin dashboard page.
- Runbook added to repo: "what to do when INV-XX fails."

### Phase 6 — i18n deepening (separate sprint)

- Full ET/EN translations for all L1+L2.
- ES translations when Tarmo confirms ES launch.
- `hreflang` alternates in `<head>`.

### Rollback strategy

- Phase 1: `git revert` and refill `slug_redirect` from committed fixture.
- Phase 2: `pg_restore`; re-run Meili reindex from backup.
- Phase 3: drop `vertical_collection*` tables; storefront already feature-flags `/alustajale`.
- Phase 4: revert LLM stage; queue persists, fallback to manual only.

Each phase is independently deployable and independently revertible. No phase requires the next to function.

---

## 10. Open Design Decisions (for Risto)

1. **Slug language.** Proposal: English-only slugs in URLs, localised display names. Recommend lock this decision now; i18n slug multiplicity is a permanent drag.
2. **`/tooted` vs `/kategooriad` vs `/haru` vs `/c`.** Three paths exist today. Pick one. Recommend `/tooted/{slug}` (Estonian, semantic) and 301 the other two.
3. **Vertical collection ownership.** Rules are authored by… Tarmo? Claudia? This matters because rule edits change materialization output the next night. Recommend: rule edits via PR against `verticals.yaml`, reviewed by XL.
4. **L3 in DB or not.** Recommend: L3 in YAML + Meili only, not as physical Medusa categories, unless a specific L3 gets its own page. Avoids 660-row category table.
5. **Review queue SLA.** What's the max queue age before a product is hidden from the storefront? Proposed: 14 days → `status=draft`.

---

## 11. Summary in one paragraph

Keep v3's 22 L1. Promote `taxonomy.yaml` to single source of truth; derive DB, `branches.ts`, sitemap, Meili index, redirects from it. Add L2 as real DB rows. Place every product at exactly one canonical node via a staged deterministic resolver (override → path → keyword → NN → LLM → review-bucket), logging everything to `categorization_audit`. Model vertical collections as a second axis: a `vertical_collection` table with declarative include/exclude rules, nightly-materialized into a `vertical_slugs` array on Meili docs — products never get duplicated, just queried differently. Emit redirects from a table, not hand-edited config. Enforce every invariant with a CI or cron check that writes to a single `taxonomy_health` row, which Tarmo reads each morning.
