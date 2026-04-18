# Agent 3 — Data Reality Baseline
**Date:** 2026-04-18  
**Scope:** Factual state of DB, feed, resolver, MeiliSearch, and codebase — no design opinions.

---

## 1. Current DB State

### Category table totals
- **Total product_category rows:** 434 L1 rows (per `WHERE parent_category_id IS NULL`)
- **Total non-L1 (L2/L3/…) rows:** 11,260
- **Grand total:** 11,694 category rows

### L1 distribution by product count
| Bucket | Count |
|--------|-------|
| ≥100 products | 27 |
| 5–99 products | 20 |
| 1–4 products | 5 |
| 0 products | 382 |

**382 of 434 L1 categories are empty shells.** These are VEVOR feed artifact categories created by prior imports.

### The 22 v3 L1s — current product counts
All 22 v3 handles exist in the DB (confirmed via `IN` query). Product distribution:

| Handle | Products |
|--------|----------|
| horeca-food-service | 1,907 |
| hand-power-tools | 1,729 |
| automotive-workshop | 1,540 |
| office-commercial-interiors | 1,528 |
| outdoor-power-landscaping | 1,407 |
| fitness-sports-recreation | 1,067 |
| construction-building | 1,042 |
| warehousing-material-handling | 787 |
| electrical-energy | 744 |
| health-medical-supply | 710 |
| plumbing-water-systems | 593 |
| printing-packaging-signage | 430 |
| hvac-climate-control | 344 |
| welding-metalworking | 277 |
| safety-security-workwear | 252 |
| boating-camping-outdoor | 178 |
| fuel-lubrication-fluid | 119 |
| cleaning-janitorial | 103 |
| laser-cnc-digital-fabrication | 42 |
| woodworking-carpentry | 24 |
| salon-spa-wellness | 9 |
| music-entertainment | 9 |
| **TOTAL** | **14,841** |

**14,841 of 14,842 products are assigned to at least one v3 L1.** One product is stranded (see §5).

### Legacy L1s still holding products (top 22)
These are NOT in the v3 set but contain live products:

| Handle | Products |
|--------|----------|
| sports-recreation | 918 |
| building-construction | 373 |
| lawn-garden | 321 |
| agriculture-forestry-equipment | 316 |
| automotive | 263 |
| health-wellness | 222 |
| restaurant-food-service | 219 |
| pumps | 132 |
| tool-storage-organization | 94 |
| decor-furniture | 93 |
| electrical | 75 |
| material-handling | 68 |
| security | 51 |
| hardware | 50 |
| hydraulics | 40 |
| air-tools-compressors | 36 |
| safety | 28 |
| heating-cooling | 21 |
| pet-supplies | 20 |
| welding | 15 |
| lab | 14 |
| machining | 8 |

**3,385 product-category assignments are in non-v3 L1s.** However, 3,359 of those products are also assigned to a v3 L1 simultaneously (dual-assignment from when the migration appended v3 without removing legacy). Only **1 product is truly stranded** (in `other > other > other`, handle ends in `9512mixcpj`).

### Duplicate handle problem
31 L1 handles appear 3× each in `product_category` (triplicated):
`hardware`, `industrial-scientific`, `holiday-decorations`, `home-decor`, `bath`, `workwear`, `paint`, `musical-instruments`, `tools`, `lighting`, `heating-venting-cooling`, `smart-home`, `storage-organization`, `furniture`, `plumbing`, `window-treatments`, `appliances`, `other`, `flooring`, `sports-outdoors`, `kitchen`, `safety-equipment`, `lumber-composites`, `playground-sets`, `doors-windows`, `building-materials`, `cleaning`, `health-and-wellness`, `outdoors`, `automotive`, `electrical`.

These are three separate rows with identical handles. MeiliSearch `category_handles` includes all three.

---

## 2. VEVOR Feed Reality

### Unique VEVOR L1 values in product metadata (`vevor_product_type`)
All 14,842 products have `vevor_product_type` set (0 missing). 57 distinct L1 values:

| VEVOR L1 | Products |
|----------|----------|
| Automotive | 1,488 |
| Lawn & Garden | 1,425 |
| Restaurant & Food Service | 1,423 |
| Sports & Recreation | 1,105 |
| Office Supplies | 865 |
| Material Handling | 711 |
| Building & Construction | 683 |
| Electrical | 612 |
| Hardware | 567 |
| Agriculture & Forestry Equipment | 439 |
| Tools | 435 |
| Appliances | 418 |
| Health & Wellness | 355 |
| Outdoors | 353 |
| Power Tools | 276 |
| Plumbing | 271 |
| Hand Tools | 265 |
| Heating & Cooling | 263 |
| Arts & Crafts & Sewing | 249 |
| Cleaning & Janitorial Supplies | 245 |
| Welding | 160 |
| Furniture | 157 |
| Pumps | 149 |
| Security | 147 |
| Sports & Outdoors | 135 |
| Kitchen | 131 |
| Storage & Organization | 126 |
| Lab | 123 |
| Safety | 101 |
| Building Materials | 101 |
| Tool Storage & Organization | 94 |
| Decor & Furniture | 93 |
| Lighting | 90 |
| Machining | 77 |
| Flooring | 68 |
| Heating, Venting & Cooling | 67 |
| Lumber & Composites | 65 |
| Hydraulics | 63 |
| Paint | 57 |
| Home Decor | 56 |
| Engines & Motors | 52 |
| Cleaning | 46 |
| Painting | 43 |
| Alternative & Renewable Energy | 43 |
| Bath | 37 |
| Doors & Windows | 26 |
| Air Tools & Compressors | 23 |
| Pet Supplies | 20 |
| Industrial & Scientific | 15 |
| Musical Instruments | 9 |
| Health And Wellness | 9 |
| Playground Sets | 4 |
| Workwear | 2 |
| Safety Equipment | 2 |
| Other | 1 |
| Abrasive & Sand Blasters | 1 |
| Holiday Decorations | 1 |

**Key observations:**
- "Other" (1 product) is skipped by the resolver — that 1 truly stranded product.
- `Smart Home` and `Window Treatments` appear in `vevor-to-v3.json` resolver but have **0 products** in current DB (not in feed currently, but handled defensively).
- 3D Printer products come in under `Appliances > Crafts & Sewing`, `Arts & Crafts & Sewing`, and get routed via `path_contains` rule to `printing-packaging-signage`, NOT to `laser-cnc-digital-fabrication`. This explains why `laser-cnc-digital-fabrication` has only 42 products.

---

## 3. Resolver Coverage

**File:** `/home/brrr/brrr-xlmarket/backend/src/scripts/vevor-to-v3.json`  
**File:** `/home/brrr/brrr-xlmarket/backend/src/scripts/resolve-v3-category.mjs`

Resolution order (first match wins):
1. `path_contains` — substring match on full product type path (7 rules)
2. `l1_l2_overrides` — exact `"L1|L2"` match (44 rules)
3. `l1_defaults` — exact L1 match (58 entries)
4. `null` — unresolved, caller logs to `stats.unmappedCategories`

**Coverage:** 57 VEVOR L1s in feed, 58 l1_defaults entries (resolver covers all feed L1s). No unmapped L1s in current product data.

**`path_contains` routing (high-value rules):**
- `Laser Engraving` → `laser-cnc-digital-fabrication`
- `CNC Router` → `laser-cnc-digital-fabrication`
- `Engraving & Cutting` → `laser-cnc-digital-fabrication`
- `3D Printer` → `printing-packaging-signage` ← **NOTE: 3D printers go to Printing, not Laser/CNC**
- `Heat Press` → `printing-packaging-signage`
- `Vinyl Cutter` → `printing-packaging-signage`
- `Screen Printing` → `printing-packaging-signage`

**`skip` list:** `['Other']` — the one stranded product (milling machine, VEVOR type `Other > Other > Other`).

**Resolver coverage rate: 14,841/14,842 = 99.993%.** The 1 miss is deliberately skipped (`Other`).

---

## 4. MeiliSearch Current Schema

**Endpoint:** `http://127.0.0.1:7700/indexes/products/settings`  
**Auth:** Bearer `MEILI_LEGACY_KEY_REDACTED`

**Index stats:** 14,842 documents, 61.9 MB raw, not currently indexing.

**Searchable attributes:**
```
title_et, title_en, description_et, description_en,
categories, sku, handle
```

**Filterable attributes:**
```
categories, category_handles, subcategory, price, in_stock, translated, filter_tokens
```

**Sortable attributes:**
```
created_at, price, title_en
```

**Faceting:** `maxValuesPerFacet: 500`, `sortFacetValuesBy: alpha`

**Pagination:** `maxTotalHits: 5000`

**All 14,842 documents have these fields:**
`categories`, `category_handles`, `created_at`, `description`, `description_en`, `description_et`, `filter_tokens`, `handle`, `id`, `in_stock`, `price`, `sku`, `subcategory`, `thumbnail`, `title`, `title_en`, `title_et`, `translated`

**Gaps:**
- `category_handles` is a flat array including ALL assigned category handles (L1 + L2 + L3), not hierarchically tagged. Example from a hand-power-tools product: `["hand-power-tools","tools","power-tools","metalworking-tools","lathes-accessories","bench-metal-lathe"]`. The L1 is indistinguishable from L2/L3 by field structure alone.
- No `vevor_product_type` field indexed (it stays in Medusa metadata only, not pushed to Meili).
- No dedicated `l1_category_handle` field — filtering by L1 requires knowing the handle string matches an L1.
- `subcategory` field exists but content unknown from settings alone.
- `filter_tokens` field exists (compound-word expansion support per `lib/meilisearch.ts`).

---

## 5. Broken State Inventory

### BUG-01: 3,385 dual L1 assignments — legacy handles not cleaned up
**Evidence:** Query above shows 3,359 products assigned to BOTH a v3 L1 AND a legacy L1 simultaneously. The migration script (`scripts/migrate-categories-to-v3.mjs`) added the v3 assignment but did not remove the old one.  
**Impact:** MeiliSearch `category_handles` includes legacy handles (`sports-recreation`, `building-construction`, `lawn-garden`, etc.) alongside v3 handles. Facet counts from legacy handles pollute any category-based UI logic.

### BUG-02: 31 handle-triplicated L1 rows in product_category
**Evidence:** 31 handles appear 3× in `product_category WHERE parent_category_id IS NULL`. Handle `playground-sets` is one of them.  
**Impact:** `category_handles` in Meili can contain the same legacy handle multiple times per product. The storefront filter `category_handles = playground-sets` would still return results even after migration if old rows are not deleted.

### BUG-03: playground-sets redirect collision
**Evidence:** `storefront/next.config.ts` line 29 redirects `/kategooriad/playground-sets` → `fitness-sports-recreation`. Simultaneously, `storefront/lib/menu-order.ts` line 29 lists `playground-sets` in `MENU_ORDER`. `storefront/lib/taxonomy-v3.ts` line 119 has `playground-sets` in `subSlugs` for fitness-sports-recreation. `storefront/components/MegaMenu.tsx` line 133 has a parent override `"climbing-walls": "playground-sets"` (redirects climbing-walls clicks to playground-sets, which itself redirects).  
**Impact:** A user clicking "climbing walls" gets redirected to `playground-sets` which 301s to `fitness-sports-recreation`. Double redirect. MegaMenu THUMB_OVERRIDES reference a handle that is itself a redirect target.

### BUG-04: MeiliSearch 5000 hit cap
**Evidence:** `maxTotalHits: 5000` in MeiliSearch settings. Largest v3 L1 is `horeca-food-service` with 1,907 products in DB — safely under cap today. However if filtering on `category_handles` with no L1 filter (global search), `estimatedTotalHits` returns 5,000 even for broader queries (observed: `{"q":"","limit":0}` returns `estimatedTotalHits: 5000`).  
**Impact:** Pagination beyond page ~208 (5000/24) will show no results even if more exist. Not yet a problem per-category, but hits global search.

### BUG-05: laser-cnc-digital-fabrication severely undercounted — 42 products
**Evidence:** DB shows 42 products assigned. But `path_contains` rule routes `3D Printer` → `printing-packaging-signage`, not laser-cnc. Feed data shows `Appliances > Crafts & Sewing > Crafting Machines > Heat Press Machine` and `Arts & Crafts & Sewing > Printmaking > Heat Press Machine` both go to printing-packaging-signage. No VEVOR L1 directly maps to laser-cnc except via path_contains for "Laser Engraving", "CNC Router", "Engraving & Cutting".  
**Impact:** The v3 spec claims 70+ products for Laser/CNC. Reality is 42. 3D printers are being routed to Printing, not Laser/CNC — arguably a resolver design decision but worth flagging.

### BUG-06: salon-spa-wellness and music-entertainment nearly empty — 9 products each
**Evidence:** DB count: `salon-spa-wellness: 9`, `music-entertainment: 9`.  
**Impact:** These are standalone L1 branches in the UI. At 9 products each they are embarrassingly thin for a top-level category page. The v3 spec projected 50+ and 80+ respectively.

### BUG-07: woodworking-carpentry — 24 products
**Evidence:** DB count: 24. V3 spec projected 150+.  
**Impact:** The v3 spec goal of a standalone "Woodworking & Carpentry" top-level entry point is underdelivered. Resolver sends `Tools|Woodworking Tools` → woodworking-carpentry but the VEVOR feed doesn't use this path prominently.

### BUG-08: menu-order.ts is legacy junk
**Evidence:** `storefront/lib/menu-order.ts` lists 33 handles (`kitchen`, `tools`, `hardware`, `electrical`, `plumbing`, etc.) — all legacy, none are v3 slugs. MegaMenu.tsx imports from `taxonomy-v3.ts` (line 7) so this file appears unused in the live MegaMenu, but it still exists and could confuse future developers.

### BUG-09: branches.ts vs taxonomy-v3.ts are parallel competing definitions
**Evidence:** `storefront/lib/branches.ts` defines 22 `BranchDef` entries with `categoryHandle` fields that match v3 slugs (confirmed all 22 exist in DB). `storefront/lib/taxonomy-v3.ts` defines a `TAXONOMY_V3` array with 22 `TaxonomyL1` entries. Both cover the same 22 categories but with different data shapes and different consumers. `MegaMenu.tsx` uses `TAXONOMY_V3`. The `/haru/[slug]` branch pages use `BRANCHES`.  
**Impact:** Any category rename or reorder requires changes in two files. No single source of truth.

### BUG-10: 1 truly stranded product
**Evidence:** `tool-kit-of-550w-variable-speed-milling-mill-machine-...` has `vevor_product_type = "Other > Other > Other"`. Resolver skips `Other`. Product is assigned only to a legacy `other` L1 (0-product shell), not to any v3 L1.

---

## 6. Facts That Must Constrain the Redesign

1. **14,841 products already carry v3 L1 assignments.** Any change to v3 slug names (e.g., renaming `fitness-sports-recreation`) requires a bulk re-assignment in Medusa + redirect in `next.config.ts` + update in `taxonomy-v3.ts` + `branches.ts` + MeiliSearch reindex. Slug changes are expensive.

2. **Category handles are in MeiliSearch `category_handles` arrays** — flat, not hierarchical. Adding a new L1 slug does not break existing documents, but removing or renaming one requires a full reindex of all 14,842 documents.

3. **The resolver (`vevor-to-v3.json`) is the sole deterministic mapping from feed to taxonomy.** It is shared between the 4-hour sync script (`import-vevor-feed.mjs`) and the one-shot migration script (`migrate-categories-to-v3.mjs`). Any taxonomy change requires updating this file first, before re-running the migration.

4. **3,385 legacy category assignments must be cleaned up** regardless of taxonomy changes. The migration added v3 without removing legacy. This is dead weight in the DB and Meili.

5. **382 empty L1 shell categories** should be deleted (they are VEVOR feed artifacts with 0 products). Deleting them has no product impact but reduces noise.

6. **31 triplicated L1 handles** must be deduplicated before any redirect cleanup — you cannot confidently delete `playground-sets` row if there are 3 rows with that handle.

7. **MeiliSearch `maxTotalHits: 5000`** caps search result pagination. Largest v3 L1 today is 1,907 (horeca). Safe margin exists, but if any future L1 would hold 5,000+ products, pagination would silently break.

8. **`next.config.ts` CATEGORY_V3_REDIRECTS** (lines 7–50) contains 41 slug mappings that are 301 permanent redirects. These are in the live Next.js binary. Any new redirects added here require a `pm2 reload xlmarket-storefront` to take effect.

9. **`branches.ts` and `taxonomy-v3.ts` are parallel — must be kept in sync manually.** Any redesign that changes which L1s exist must update both files simultaneously.

10. **The storefront's `estimatedTotalHits` field** (seen in `lib/meilisearch.ts` line 64) is used for pagination math. It will return the Meili estimate (capped at 5,000) not the true Medusa count. This is a known divergence.

11. **`path_contains` routes 3D printers to `printing-packaging-signage`, not `laser-cnc-digital-fabrication`.** If the redesign wants 3D printers in Laser/CNC, the resolver rule must change — and then a re-run of `migrate-categories-to-v3.mjs --execute` is needed to reassign those products.

12. **No orphan products** (products with zero category assignments): 0 orphans confirmed. Every product has at least one category.

13. **All 14,842 products have `sanitized_description` in metadata.** Backfill is complete. Feed sync pre-computes this.

14. **All 14,842 products have `vevor_product_type` in metadata.** The resolver can process all products deterministically from DB alone (no XLSX needed for category reassignment).
