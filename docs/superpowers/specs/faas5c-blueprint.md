# Architecture: Faas 5c — Category Page UX Full Implementation

**Spec:** §3.5, §3.6, §10 F5c, §15 | Date: 2026-04-18

---

## Design Decisions

- **No new API route for bottom ribbons.** History is fully client-side (localStorage). Deals and Best Sellers fetch directly from `/meili/indexes/products/search` in the browser, identical to the existing `ProductGrid` pattern. Zero extra SSR load.
- **`getChildrenWithProductCounts` runs server-side in page.tsx.** One Meili `limit:0` facet query with `facets: ["taxonomy.ancestors"]` returns counts for all child handles in a single round-trip. No parallel per-child queries needed.
- **`SubcategoryCarousel` is a pure client component** (`"use client"`). It receives `children: ChildWithCount[]` pre-resolved by the server and renders snap-scroll HTML. No fetching inside the component.
- **`CategoryBottomRibbons` is a client component** that fires three independent Meili fetches after mount (history IDs from localStorage, then deals and best-sellers). It receives only `l1Handle` and `locale` as props — no server data needed. Empty ribbons self-hide.
- **`useRecentlyViewed` hook lives in `storefront/hooks/`** (directory does not exist yet, must be created). Reads/writes `xl.recently_viewed` key in localStorage. Returns `{ ids: string[], record: (id: string, product: RecentlyViewedItem) => void }`.
- **Grid filter string migrates from `category_handles` to `taxonomy.ancestors`.** The Meili index already indexes `taxonomy.ancestors` as a filterable array field (confirmed in `index-meilisearch.mjs`). Both fields coexist per spec §6.3 backward-compat window.
- **`discount_pct` does NOT exist in the current Meili index.** The Deals ribbon must sort by `price:asc` as a proxy for now, or be omitted until the field is added. The blueprint flags this as a blocking risk.
- **`popularity` does NOT exist in the current Meili index.** Best Sellers ribbon must fall back to `created_at:desc` (newest) until the field is added. Also flagged as a risk.
- **No new DB migration needed for F5c.** All data is already in Meili via the existing `taxonomy.*` fields.
- **Sidebar facets replace `category_handles` facet with `taxonomy.l2_slug` / `taxonomy.l3_slug`** to avoid showing VEVOR-internal handles. This also fixes INV-31 (VEVOR slug leak prevention).
- **Implementer-A owns data layer + carousel + grid + breadcrumb** (F5c.1–F5c.6). Implementer-B owns query migration + bottom ribbons + history hook + invariants (F5c.7–F5c.11). They touch different files with one shared touch-point: `page.tsx` — resolved by Implementer-A writing the final composition, Implementer-B only adding new components imported from their own files.

---

## Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| `/home/brrr/brrr-xlmarket/storefront/components/category/SubcategoryCarousel.tsx` | Full-width horizontal snap-scroll carousel of child category cards (breadcrumb-under, grid-above). Pure client, receives pre-computed `ChildWithCount[]`. | P0 |
| `/home/brrr/brrr-xlmarket/storefront/components/category/CategoryBottomRibbons.tsx` | Three stacked carousels: History (localStorage IDs → Meili), Deals (discount_pct desc), Best Sellers (popularity desc). Self-hides each ribbon when empty. | P0 |
| `/home/brrr/brrr-xlmarket/storefront/hooks/useRecentlyViewed.ts` | Client hook: reads/writes `xl.recently_viewed` localStorage key. Returns `ids: string[]` (max 50, newest first) + `record(id, item)` mutator. | P0 |

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `/home/brrr/brrr-xlmarket/storefront/lib/category-tree.ts` | Add `getChildrenWithProductCounts(handle, meiliResult)` function: merges `getChildren(handle)` with a facet-count map, returns `ChildWithCount[]` sorted per spec, filters 0-count children. | P0 |
| `/home/brrr/brrr-xlmarket/storefront/app/[locale]/kategooriad/[handle]/page.tsx` | Full layout rewrite per §3.5.1: breadcrumb → SubcategoryCarousel → H1+count → sidebar+grid → CategoryBottomRibbons. Migrate filter string from `category_handles` to `taxonomy.ancestors`. Replace "You May Also Like" section with CategoryBottomRibbons. | P0 |
| `/home/brrr/brrr-xlmarket/storefront/components/search/VevorSearchFilters.tsx` | Add `suppressSubcategoryFacet?: boolean` prop. When true (set when carousel is shown), remove the subcategory facet section from the sidebar to avoid duplication per §3.5.5. | P1 |
| `/home/brrr/brrr-xlmarket/storefront/components/ProductGrid.tsx` | Add `"2-3-4-4"` column variant: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4` with explicit `≥1280px` 4-col enforcement per spec §3.5.6 (INV-29). | P1 |
| `/home/brrr/brrr-xlmarket/storefront/lib/meilisearch.ts` | Add `MeiliHit.taxonomy` field typing. Add `discount_pct?: number` and `popularity?: number` to `MeiliHit` type as optional fields (they will be absent until Meili reindex adds them — `undefined` graceful). | P1 |
| `/home/brrr/brrr-xlmarket/scripts/check-taxonomy-invariants.mjs` | Add INV-24 through INV-31 checks per spec §3.5.9 + §8. INV-28 is a source-code scan (grep for `category_handles` in category page); INV-29 requires Playwright (add as WARN + comment for E2E phase). | P1 |

---

## Data Flow

```
Browser navigates to /{locale}/kategooriad/{handle}
│
├── [SERVER — page.tsx]
│   ├── getNode(handle)  ← category-tree.generated.json (in-memory, sync)
│   ├── getAncestors(handle)  ← same
│   ├── getChildren(handle)  ← same, returns raw ChildNode[]
│   ├── getL1Ancestor(handle)  ← same
│   │
│   ├── Meili query A — facet count for children + totalCount + facets
│   │   POST /meili/indexes/products/search
│   │   { q:"", limit:0, filter: ["taxonomy.ancestors = {handle}", "in_stock = true"],
│   │     facets: ["taxonomy.ancestors", "taxonomy.l2_slug", "taxonomy.l3_slug",
│   │              "brand", "price", "in_stock"] }
│   │   → facetDistribution["taxonomy.ancestors"] used to build ChildWithCount[]
│   │   → getChildrenWithProductCounts(handle, facetDist) → ChildWithCount[]
│   │   → filters children with count === 0 (INV-25)
│   │
│   └── Renders HTML:
│       ├── <BreadcrumbNav> ← getBreadcrumbTrail(handle, locale) (INV-24, INV-27)
│       ├── <SubcategoryCarousel children={childrenWithCounts} />
│       ├── <h1>{displayName} · {totalCount}</h1>
│       ├── <aside> <VevorSearchFilters suppressSubcategoryFacet={hasCarousel} />
│       ├── <main> <ProductGrid fetchParams={{ filter: "taxonomy.ancestors = {handle}" }} />
│       ├── <VevorPagination />
│       └── <CategoryBottomRibbons l1Handle={l1?.handle} locale={locale} />
│
└── [CLIENT — after hydration]
    ├── SubcategoryCarousel: snap-scroll, keyboard nav, no fetch
    ├── ProductGrid: fetches /meili/indexes/products/search directly (existing pattern)
    └── CategoryBottomRibbons:
        ├── useRecentlyViewed() → ids from localStorage
        ├── History: POST /meili/.../search {filter: "id IN [...ids] AND taxonomy.ancestors = {l1Handle}"}
        ├── Deals: POST /meili/.../search {filter: "taxonomy.ancestors = {l1Handle} AND in_stock = true",
        │                                   sort: ["discount_pct:desc"] (risk: field may not exist)}
        └── Best Sellers: POST /meili/.../search {filter: "taxonomy.ancestors = {l1Handle} AND in_stock = true",
                                                    sort: ["popularity:desc"] (risk: field may not exist)}
```

---

## Component Public APIs

### `SubcategoryCarousel`

```typescript
// storefront/components/category/SubcategoryCarousel.tsx
// "use client"

export interface ChildWithCount {
  handle: string
  name: string           // already localized by server
  image_path: string | null
  image_source: "direct" | "alias" | "fuzzy" | "none"
  count: number          // product count from Meili facet
  node: CategoryNode     // full node for CategoryThumb
}

interface SubcategoryCarouselProps {
  children: ChildWithCount[]   // pre-filtered (count > 0), pre-sorted
  locale: string
  /** Handle of the node we came from — used for scroll-into-view on back-navigation */
  previousHandle?: string
}

export default function SubcategoryCarousel(props: SubcategoryCarouselProps): JSX.Element | null
// Returns null when children.length === 0 (leaf node, INV-25 enforcement in UI)
```

Internal behavior:
- `role="list"` container, `role="listitem"` per card
- `aria-label="Alamkategooriad"` on the scroll container
- Arrow key navigation (left/right), Enter navigates
- `scroll-snap-type: x mandatory` on container, `scroll-snap-align: start` on each card
- When `previousHandle` matches a child's handle, that card is scrolled into view + gets an `aria-current="true"` accent ring on mount

### `CategoryBottomRibbons`

```typescript
// storefront/components/category/CategoryBottomRibbons.tsx
// "use client"

interface CategoryBottomRibbonsProps {
  l1Handle: string       // from getL1Ancestor(handle).handle
  locale: string
}

export default function CategoryBottomRibbons(props: CategoryBottomRibbonsProps): JSX.Element
// Renders 0–3 ribbon sections. Each section self-hides when products array is empty.
// Uses useRecentlyViewed() internally for History ribbon.
```

### `useRecentlyViewed`

```typescript
// storefront/hooks/useRecentlyViewed.ts
// Client-only (uses localStorage)

export interface RecentlyViewedItem {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  price: string          // formatted string e.g. "€49.90"
  viewed_at: number      // unix timestamp ms
}

export interface UseRecentlyViewedReturn {
  ids: string[]                                    // product IDs, newest first, max 50
  record: (item: RecentlyViewedItem) => void       // call on product page mount
}

export function useRecentlyViewed(): UseRecentlyViewedReturn
// Storage key: "xl.recently_viewed" (array of RecentlyViewedItem, max 50, deduped by id)
// Hydration: SSR-safe (returns { ids: [], record: noop } on server)
```

---

## `getChildrenWithProductCounts` — Signature + Meili Facet Shape

```typescript
// Add to storefront/lib/category-tree.ts

export interface ChildWithCount extends CategoryNode {
  count: number
}

/**
 * Merge getChildren(handle) with a Meili facet distribution map.
 * Children with count === 0 are excluded (spec §3.5.4, INV-25).
 * Sort: first by taxonomy.yaml sortOrder (preserved via TREE.order), then count desc.
 *
 * @param handle   - current node handle
 * @param facetMap - facetDistribution["taxonomy.ancestors"] from a Meili search
 *                   (key = handle string, value = product count int)
 */
export function getChildrenWithProductCounts(
  handle: string,
  facetMap: Record<string, number>
): ChildWithCount[]
```

Meili query shape that must be fired in `page.tsx` before calling this function:

```json
{
  "q": "",
  "limit": 0,
  "filter": ["taxonomy.ancestors = \"{handle}\"", "in_stock = true"],
  "facets": [
    "taxonomy.ancestors",
    "taxonomy.l2_slug",
    "taxonomy.l3_slug",
    "brand",
    "price",
    "in_stock"
  ]
}
```

`facetDistribution["taxonomy.ancestors"]` returns an object like:
```json
{
  "horeca-food-service": 1907,
  "commercial-refrigeration": 214,
  "bar-beverage-service": 327,
  ...
}
```

Pass this object directly as `facetMap`. The function looks up only the direct children of `handle` in this map and discards the rest.

---

## Meili Filter Strings Per Zone

| Zone | Meili filter string | Sort | Limit |
|------|---------------------|------|-------|
| **Carousel (child count)** | `taxonomy.ancestors = "{handle}" AND in_stock = true` | none (limit:0, facets only) | 0 |
| **Product grid (main)** | `taxonomy.ancestors = "{handle}" AND in_stock = true` + optional price/brand/etc from URL params | `price:asc` or `price:desc` or `created_at:desc` | 24 per page |
| **History ribbon** | `id IN ["id1","id2",...] AND taxonomy.ancestors = "{l1Handle}" AND in_stock = true` | none (preserve localStorage order client-side) | 12 |
| **Deals ribbon** | `taxonomy.ancestors = "{l1Handle}" AND in_stock = true` | `discount_pct:desc` (RISK: field absent — fallback: `price:asc`) | 12 |
| **Best Sellers ribbon** | `taxonomy.ancestors = "{l1Handle}" AND in_stock = true` | `popularity:desc` (RISK: field absent — fallback: `created_at:desc`) | 12 |

---

## Implementer Scope Split (F5c.1–F5c.10)

### Implementer-A: Data layer + CarouselUI + Grid + Breadcrumb

Files exclusively owned by A:

| Step | File | Action |
|------|------|--------|
| F5c.1 | `storefront/lib/category-tree.ts` | Add `getChildrenWithProductCounts()` + `ChildWithCount` type |
| F5c.2 | `storefront/components/category/SubcategoryCarousel.tsx` | Create from scratch |
| F5c.5 | `storefront/components/ProductGrid.tsx` | Add 4-col variant for ≥1280px |
| F5c.6 | `storefront/app/[locale]/kategooriad/[handle]/page.tsx` | Full layout rewrite per §3.5.1. Imports SubcategoryCarousel. Imports CategoryBottomRibbons (stub-safe: B delivers this file). Migrates Meili query to `taxonomy.ancestors`. Fires the facet query for child counts. Builds BreadcrumbNav using `getBreadcrumbTrail()`. |
| F5c.4 | `storefront/components/search/VevorSearchFilters.tsx` | Add `suppressSubcategoryFacet` prop |

A does NOT touch: `hooks/`, `CategoryBottomRibbons.tsx`, `check-taxonomy-invariants.mjs`.

### Implementer-B: Query migration + Ribbons + History hook + Invariants

Files exclusively owned by B:

| Step | File | Action |
|------|------|--------|
| F5c.7 | (handled by A in page.tsx — B validates via grep that no `category_handles` remains in category page) | Validation only |
| F5c.9 | `storefront/components/category/CategoryBottomRibbons.tsx` | Create from scratch |
| F5c.10 | `storefront/hooks/useRecentlyViewed.ts` | Create from scratch |
| F5c.8 | `storefront/lib/meilisearch.ts` | Add `taxonomy`, `discount_pct?`, `popularity?` to `MeiliHit` type |
| F5c.11 | `scripts/check-taxonomy-invariants.mjs` | Add INV-24 through INV-31 |

B does NOT touch: `category-tree.ts`, `SubcategoryCarousel.tsx`, `ProductGrid.tsx`, `page.tsx`.

**Coordination point:** Implementer-A's `page.tsx` imports `CategoryBottomRibbons` from `@/components/category/CategoryBottomRibbons`. A must import it with a conditional (`?? null`) or use a lazy import with a placeholder if B's file is not yet written. Recommended: A writes a stub export at `storefront/components/category/CategoryBottomRibbons.tsx` as part of their scope (2-line null stub), B then fills it in.

---

## Build Sequence

1. `storefront/lib/category-tree.ts` — add `ChildWithCount` type + `getChildrenWithProductCounts()` (A)
2. `storefront/hooks/useRecentlyViewed.ts` — new file (B, can be parallel with step 1)
3. `storefront/lib/meilisearch.ts` — add missing type fields (B, can be parallel with step 1)
4. `storefront/components/category/SubcategoryCarousel.tsx` — depends on step 1 (A)
5. `storefront/components/category/CategoryBottomRibbons.tsx` — depends on steps 2+3 (B)
6. `storefront/components/search/VevorSearchFilters.tsx` — add prop (A, can be parallel with 4+5)
7. `storefront/components/ProductGrid.tsx` — add column variant (A, can be parallel with 4+5)
8. `storefront/app/[locale]/kategooriad/[handle]/page.tsx` — full rewrite, depends on steps 1+4+5+6+7 (A)
9. `scripts/check-taxonomy-invariants.mjs` — add INV-24..31 (B, can be parallel with step 8)
10. Build: `npm run build` in `storefront/` + static copy + `pm2 reload`
11. Playwright E2E smoke (F5c.12) — after deploy

---

## Risks and Assumptions

### RISK-1 (BLOCKING): `discount_pct` field absent from Meili index

**Status:** Confirmed absent. `index-meilisearch.mjs` does not write a `discount_pct` field. The spec §3.5.7 requires `filter: "discount_pct > 0"` and `sort: "discount_pct:desc"` for the Deals ribbon.

**Mitigation:** The Deals ribbon must fall back to `price:asc` sort with no discount filter until the field is backfilled. Add a `// TODO: switch to discount_pct:desc when Meili field is live` comment. Separately, `index-meilisearch.mjs` must be updated to compute and write `discount_pct` (compare `price` vs a `compare_price` or `original_price` field if it exists in feed metadata). This is a separate task not in F5c scope, but it must be tracked as a Huly issue.

### RISK-2 (BLOCKING): `popularity` field absent from Meili index

**Status:** Confirmed absent. The Best Sellers ribbon requires `sort: "popularity:desc"`. No popularity signal currently exists in any indexed document.

**Mitigation:** Fall back to `created_at:desc` (newest arrivals, which at least shows something meaningful). Mark as TODO. Implement popularity as a separate Huly task: options include order-count aggregation from Medusa, editorial weight from a YAML file, or simply `stock_qty:desc` as a weak proxy.

### RISK-3 (MEDIUM): `taxonomy.ancestors` filter in ProductGrid

**Status:** The current `page.tsx` uses `category_handles = "{handle}"` (single-handle equality). The spec §3.5.6 requires `taxonomy.ancestors = "{handle}"` (array-contains, matches all products in the subtree). The Meili index confirms `taxonomy.ancestors` is in `filterableAttributes` since F2.9. However the `ProductGrid` component uses a filter string passed as a prop — the change is in `page.tsx` only (the prop value), not in `ProductGrid` itself. Low risk if done carefully.

**Note on semantics:** `category_handles = "{handle}"` returns only products directly tagged with that handle. `taxonomy.ancestors = "{handle}"` returns all products in the subtree. This is the correct behavior but will increase result counts on parent nodes — expected and desirable.

### RISK-4 (LOW): `previousHandle` scroll-into-view in SubcategoryCarousel

**Status:** The spec §3.5.4 requires that when navigating back to an L2 page after drilling into an L3, the L3 that was visited is shown first in the carousel. This requires passing the origin handle through URL state (e.g. `?from=bar-beverage-service`) or reading it from `document.referrer`. The simplest approach is reading `?from=` query param. This requires updating all carousel card `Link` hrefs to append `?from={currentHandle}` and reading `searchParams.from` in `page.tsx`.

**Mitigation for F5c:** Implement the passive scroll-into-view (just center the last-visited item). Skip the `?from=` mechanism for now; it can be added in a follow-up. The carousel will simply start at position 0 on back-navigation. Mark as TODO.

### RISK-5 (LOW): `hooks/` directory does not exist

**Status:** Confirmed. `storefront/hooks/` must be created as a new directory. No existing file uses this path. This is a trivial directory creation with no conflict risk.

### ASSUMPTION-1: Meili `taxonomy.ancestors` is populated for all products

Based on `index-meilisearch.mjs` lines 154–164: `taxonomy.ancestors` is set to `[...allHandles]` from the category ancestor map. This includes the L1, L2, and L3 handles for each product. The filter `taxonomy.ancestors = "{handle}"` will return all products in the subtree rooted at `handle`. This is confirmed correct.

### ASSUMPTION-2: `category-tree.generated.json` `sortOrder` key does not exist

The current `CategoryNode` type in `category-tree.ts` does not have a `sortOrder` field. The spec §3.5.4 requires "sortOrder from taxonomy.yaml; tie-break by product count desc." Since YAML `order` array preserves the original L1 order, and `getChildren()` currently returns children in `child_handles` array order (which maps to YAML order via `gen-category-tree.mjs`), the default YAML insertion order serves as the sort order. `getChildrenWithProductCounts` preserves this order and tie-breaks by count desc. No schema change needed.

### ASSUMPTION-3: `RecentlyViewed.tsx` component is replaced, not extended

The existing `storefront/components/RecentlyViewed.tsx` reads from `xlmarket_recently_viewed` localStorage key. The new `useRecentlyViewed` hook uses `xl.recently_viewed`. These are different keys. The `CategoryBottomRibbons` history ribbon uses the new key. The old `RecentlyViewed` component on the product detail page continues using the old key. This avoids data format conflict. The product detail page should eventually migrate to the new hook — tracked as a post-F5c task.

---

## INV-24 through INV-31 Check Implementations

| INV | Implementation approach |
|-----|------------------------|
| INV-24 | Parse `category-tree.generated.json`, walk all 22 L1 slugs, call `getBreadcrumbTrail(handle)` via Node.js import of the JSON, assert `trail[trail.length-1].handle` equals the L1 handle and is not a product handle (no `/toode/` in the trail). |
| INV-25 | Meili query: `filter: "taxonomy.ancestors = {handle} AND in_stock = true"`, `facets: ["taxonomy.ancestors"]`, `limit:0`. For each L1, assert `facetDistribution["taxonomy.ancestors"][childHandle] > 0` for all children returned by `getChildren()`. Children with 0 count must not appear in the carousel — this is a source-code check (grep `getChildrenWithProductCounts` is called before rendering carousel). |
| INV-26 | For all nodes in `category-tree.generated.json`, assert `image_source !== "none"` (extends INV-20). Reuse existing INV-20 logic. |
| INV-27 | For each L1 handle, `getBreadcrumbTrail(handle, "et").length === 1`. For each L2, `.length === 2`. For each L3, `.length === 3`. Cross-checked against `node.level` field. |
| INV-28 | `grep -r "category_handles" storefront/app/[locale]/kategooriad/` — must return 0 matches after F5c migration. CI source scan. |
| INV-29 | Playwright: navigate to `/et/kategooriad/hand-power-tools`, assert `grid-cols-4` class or check computed `getComputedStyle` column count. Mark WARN in invariants script (requires Playwright env); add comment pointing to `e2e/category-grid.spec.ts`. |
| INV-30 | Playwright: `page.goto('/et/kategooriad/horeca-food-service')`, assert carousel items with `[role=listitem]` are visible. Click first item, assert new URL contains a child handle, assert new page has carousel or no carousel (leaf). Mark WARN in invariants script. |
| INV-31 | `grep -rn "vevor_product_type\|vevor_path\|VEVOR" storefront/app/[locale]/kategooriad/ storefront/components/category/` — must return 0 matches. CI source scan. |

