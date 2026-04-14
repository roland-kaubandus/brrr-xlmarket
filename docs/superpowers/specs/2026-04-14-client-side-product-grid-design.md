# Client-Side Product Grid — Design Spec

> Date: 2026-04-14
> Status: Approved
> Problem: Next.js SSR CPU-bound rendering of 24+ VevorProductCard components kills PM2 workers under rapid navigation

---

## Goal

Move product grid rendering from server to browser on three pages (`/otsing`, `/kategooriad/[handle]`, `/haru/[handle]`) without changing UX. Server delivers a lightweight shell (breadcrumb, title, filters, metadata). Products load client-side via MeiliSearch API.

## Success Criteria

1. Server response time < 200ms (currently 2-5s under load)
2. Products visible immediately on hydration — no shimmer, no fetch delay
3. URL state (filters, sort, page, query) preserved — back button works
4. No layout shift — client renders same grid as before
5. Rapid clicking (menu → category → breadcrumb → menu → search) does NOT hang server
6. SEO: product structured data stays via JSON-LD (already server-rendered)

## Non-Goals

- Changing VevorProductCard internals
- Changing filter/sort UI components
- Adding new features
- Changing `/haru/[handle]` hero, trust badges, or "Other Departments" sections

---

## Architecture

### Before (current)

```
Browser request → Next.js SSR → MeiliSearch (5ms) → React render 24 cards (200-800ms CPU)
                                                   → HTML response (large)
```

### After

```
Browser request → Next.js SSR → MeiliSearch (5ms) → JSON data only (no card rendering!)
                               → HTML shell + initialProducts as JSON prop
Browser hydration → <ProductGrid initialProducts={...}> → renders cards instantly from props
                                                        → NO fetch, NO shimmer, NO delay
```

**Key insight:** The expensive part was never the MeiliSearch call (~5ms). It was React SSR serializing 24 VevorProductCard components to HTML (200-800ms CPU). By passing raw product JSON as a prop to a client component, the server skips card rendering entirely. The browser renders the cards — it has CPU to spare.

---

## Components

### 1. `ProductGrid` — new client component

**File:** `storefront/components/ProductGrid.tsx`

**Props:**
```typescript
type ProductGridProps = {
  // Initial products — server-fetched, passed as JSON prop (no client fetch needed)
  initialProducts: Product[]
  locale: string
  // Grid layout variant
  columns?: "2-3-4" | "2-3-5"  // default "2-3-4"
}
```

**Behavior:**
- Renders `initialProducts` immediately from props — no fetch, no loading state
- VevorProductCard instances render in the browser (client component), not on the server
- Skeleton fallback exists ONLY for error recovery (e.g., if `initialProducts` is empty due to server error and a client-side retry is triggered via `/api/products`)
- Error/retry: if initialProducts is empty AND server indicated products exist (totalHits > 0), show "Failed to load" + retry button that fetches from `/api/products`

**Skeleton card** (fallback only, not shown during normal flow):
- Gray shimmer rectangle (aspect-square) for image
- Two short gray bars for title
- One gray bar for stars
- One wider gray bar for price
- Animate with CSS `@keyframes shimmer` pulse

### 2. `/api/products` — new API route (fallback/retry only)

**File:** `storefront/app/api/products/route.ts`

**Purpose:** Fallback endpoint for client-side retry when server-side data fetch fails. NOT used in the normal flow — `initialProducts` prop covers that.

**Why new route instead of extending `/api/search`:**
- `/api/search` is used by search autocomplete, has different return shape
- New route returns the full product shape needed by VevorProductCard
- Cleaner separation of concerns

**Request:** `GET /api/products?q=...&filter=...&sort=...&limit=24&offset=0&locale=et`

**Response:**
```json
{
  "products": [
    {
      "id": "...",
      "title": "...",
      "handle": "...",
      "description": "...",
      "thumbnail": "...",
      "images": [],
      "variants": [{ "id": "...", "title": "Default", "calculated_price": { ... } }],
      "categories": [{ "id": "...", "name": "...", "handle": "...", "parent_category_id": null }],
      "created_at": "..."
    }
  ],
  "totalHits": 1234,
  "facetDistribution": { ... },
  "facetStats": { ... }
}
```

This is exactly the same product shape all three pages currently build from MeiliSearch hits. The mapping logic (`mapSearchHitToProduct`) is extracted into a shared helper used by both the API route and server pages.

### 3. Modified pages

#### `otsing/page.tsx`
- **Keep server-side:** metadata generation, breadcrumb, title row, filter sidebar, category pills, recommended searches, pagination, MeiliSearch call for products + facets
- **Change:** Server still fetches products from MeiliSearch (fast, ~5ms) and maps them to product objects. But instead of rendering VevorProductCard grid in JSX, passes `products` array as prop to `<ProductGrid initialProducts={products}>`.
- **Remove:** `import VevorProductCard`, the `products.map(p => <VevorProductCard>)` block
- **Add:** `<ProductGrid initialProducts={products} locale={locale} />`

#### `kategooriad/[handle]/page.tsx`
- **Keep server-side:** metadata, breadcrumb, subcategory scroller, filter sidebar, JSON-LD, 404 handling, MeiliSearch call
- **Change:** Products still fetched server-side, passed as `initialProducts` prop
- **Remove:** main product grid `VevorProductCard` rendering, "You May Also Like" `VevorProductCard` rendering
- **Add:** `<ProductGrid>` for main grid, separate `<ProductGrid>` for "You May Also Like" (`columns="2-3-5"`)

#### `haru/[handle]/page.tsx`
- **Keep server-side:** hero, trust badges, subcategory grid, filter bar, "Other Departments", "Show more" / per-page selector, metadata, MeiliSearch call
- **Change:** Products still fetched server-side, passed as `initialProducts` prop
- **Remove:** product grid `VevorProductCard` rendering
- **Add:** `<ProductGrid>` with branch products

---

## UX Preservation

| Aspect | Before | After |
|--------|--------|-------|
| First paint | Slow (full grid SSR) | Fast shell, products render client-side instantly from props |
| Product cards | Rendered in HTML on server, then hydrated | Rendered in browser from JSON props — no shimmer, no delay |
| Filters/sort | URL-based, full page reload | URL-based, full page reload (unchanged) |
| Pagination | URL-based links | URL-based links (unchanged) |
| Back button | Works | Works (URL state preserved) |
| SEO | Product cards in HTML | JSON-LD structured data (already present) |
| Loading state | White/blank during SSR wait | Instant — products render from props on hydration |
| Mobile scroll | Works | Works |

**Key UX decision:** Filters, sort, and pagination remain server-rendered URL-based navigation (full page loads). The server still fetches product data from MeiliSearch (cheap, ~5ms) — it just doesn't render VevorProductCard JSX anymore. Product data is passed as a JSON prop. The browser renders cards instantly from that prop. Zero shimmer in normal flow.

---

## Skeleton Design

The skeleton must match VevorProductCard dimensions exactly to prevent CLS:

```
+---------------------------+
|                           |
|     [shimmer square]      |  ← aspect-square, bg-[#F1F5F9]
|     (product image)       |
|                           |
+---------------------------+
| [████████████████___]     |  ← title line 1
| [██████████________]     |  ← title line 2
| [★★★★☆ 4.2]             |  ← stars placeholder
| [€ ██.██]                |  ← price
| [● In Stock]             |  ← badge
+---------------------------+
```

Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4` (matches current)

---

## Error Handling

- **MeiliSearch down:** `/api/products` returns 500 → ProductGrid shows "Tooteid ei saa laadida. Proovi uuesti." + retry button
- **Network error:** Same retry UI
- **Slow response:** 5s timeout with AbortController, then error state
- **Empty results:** Show "No products found" (same text as current)

---

## Files to Create

1. `storefront/components/ProductGrid.tsx` — client component (~120 lines)
2. `storefront/app/api/products/route.ts` — API endpoint (~60 lines)

## Files to Modify

3. `storefront/app/[locale]/otsing/page.tsx` — remove product SSR, add ProductGrid
4. `storefront/app/[locale]/kategooriad/[handle]/page.tsx` — remove product SSR, add ProductGrid
5. `storefront/app/[locale]/haru/[handle]/page.tsx` — remove product SSR, add ProductGrid

## Files NOT Modified

- `storefront/components/VevorProductCard.tsx` — unchanged
- `storefront/components/search/VevorSearchFilters.tsx` — unchanged
- `storefront/components/search/VevorPagination.tsx` — unchanged
- `storefront/components/search/SortSelect.tsx` — unchanged
- `storefront/lib/meilisearch.ts` — unchanged
- `storefront/lib/medusa.ts` — unchanged

---

## Testing Plan

### Automated
1. curl homepage, search, category, branch pages — all return 200 < 1s
2. `/api/products?q=drill&limit=24` returns valid JSON with products array
3. `/api/products?filter=category_handles = "tools"&limit=24` returns filtered results

### Manual stress test
1. Open browser, rapid-click: menu → category → breadcrumb → menu → search → category → back → forward
2. All PM2 workers should stay alive (`pm2 jlist` shows 0 restarts during test)
3. Products should appear within ~300ms of page shell
4. Filters, sort, pagination should all work as before
5. Mobile: horizontal scroll, touch interactions unchanged

### Load test
1. Run 10 concurrent curl requests to different pages
2. Server response time should stay < 500ms for all
3. No worker crashes or restarts
