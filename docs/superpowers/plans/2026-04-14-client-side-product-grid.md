# Client-Side Product Grid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move VevorProductCard grid rendering from SSR to client-side on /otsing, /kategooriad/[handle], and /haru/[handle] to eliminate CPU-bound server hangs.

**Architecture:** Server still fetches product data from MeiliSearch (~5ms), but passes it as JSON props to a `"use client"` ProductGrid component. The browser renders VevorProductCard instances — no server-side card rendering at all. A `/api/products` fallback route exists for error recovery only.

**Tech Stack:** Next.js 16, React 19, MeiliSearch, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-14-client-side-product-grid-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `storefront/lib/map-meili-hit.ts` | **Create** | Shared helper: maps MeiliSearch hit → Product-shaped object |
| `storefront/components/ProductGrid.tsx` | **Create** | Client component: renders VevorProductCard grid from `initialProducts` prop |
| `storefront/app/api/products/route.ts` | **Create** | Fallback API: MeiliSearch → product JSON (error recovery only) |
| `storefront/app/[locale]/otsing/page.tsx` | **Modify** | Replace VevorProductCard grid with `<ProductGrid>` |
| `storefront/app/[locale]/kategooriad/[handle]/page.tsx` | **Modify** | Replace VevorProductCard grid + "You May Also Like" with `<ProductGrid>` |
| `storefront/app/[locale]/haru/[handle]/page.tsx` | **Modify** | Replace VevorProductCard grid with `<ProductGrid>` |

---

## Task 1: Extract shared `mapMeiliHitToProduct` helper

**Files:**
- Create: `storefront/lib/map-meili-hit.ts`

This mapping logic is duplicated in 4 files. Extract once, use everywhere.

- [ ] **Step 1: Create the shared helper**

```typescript
// storefront/lib/map-meili-hit.ts
import type { MeiliHit } from "./meilisearch"
import { getLocalizedTitle } from "./meilisearch"

export function mapMeiliHitToProduct(hit: MeiliHit, locale: string) {
  return {
    id: hit.id,
    title: getLocalizedTitle(hit, locale),
    handle: hit.handle,
    description: hit.description,
    thumbnail: hit.thumbnail,
    images: [] as Array<{ id: string; url: string }>,
    variants: [
      {
        id: hit.id + "_v",
        title: "Default",
        calculated_price: {
          calculated_amount: Math.round(hit.price * 100),
          original_amount: Math.round(hit.price * 100),
          currency_code: "eur",
        },
      },
    ],
    categories: hit.categories.map((name: string, i: number) => ({
      id: `cat_${i}`,
      name,
      handle: hit.category_handles?.[i] || "",
      parent_category_id: null,
    })),
    created_at: new Date(hit.created_at * 1000).toISOString(),
  }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /home/brrr/brrr-xlmarket/storefront && npx tsc --noEmit lib/map-meili-hit.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add storefront/lib/map-meili-hit.ts
git commit -m "[XL] Extract shared mapMeiliHitToProduct helper from duplicated code"
```

---

## Task 2: Create `ProductGrid` client component

**Files:**
- Create: `storefront/components/ProductGrid.tsx`

This is the core of the fix. A `"use client"` component that receives products as props and renders VevorProductCard instances entirely in the browser.

- [ ] **Step 1: Create the ProductGrid component**

```tsx
// storefront/components/ProductGrid.tsx
"use client"

import VevorProductCard from "@/components/VevorProductCard"

type ProductGridProps = {
  initialProducts: any[]
  locale: string
  columns?: "2-3-4" | "2-3-5"
  className?: string
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-[#E2E8F0] animate-pulse">
      <div className="aspect-square bg-[#F1F5F9]" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-[#F1F5F9] rounded w-full" />
        <div className="h-3 bg-[#F1F5F9] rounded w-3/4" />
        <div className="h-3 bg-[#F1F5F9] rounded w-1/2 mt-3" />
        <div className="h-4 bg-[#F1F5F9] rounded w-1/3 mt-2" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 24, columns = "2-3-4" }: { count?: number; columns?: "2-3-4" | "2-3-5" }) {
  const gridClass = columns === "2-3-5"
    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
    : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
  return (
    <div className={gridClass}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export default function ProductGrid({ initialProducts, locale, columns = "2-3-4", className }: ProductGridProps) {
  const gridClass = columns === "2-3-5"
    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
    : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"

  return (
    <div className={`${gridClass}${className ? ` ${className}` : ""}`}>
      {initialProducts.map((product) => (
        <VevorProductCard key={product.id} product={product} locale={locale} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add storefront/components/ProductGrid.tsx
git commit -m "[XL] Add ProductGrid client component — renders VevorProductCards in browser"
```

---

## Task 3: Create `/api/products` fallback route

**Files:**
- Create: `storefront/app/api/products/route.ts`

This endpoint is used only for error recovery (if server-side fetch failed but client wants to retry). Normal flow uses `initialProducts` prop.

- [ ] **Step 1: Create the API route**

```typescript
// storefront/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server"
import { searchProducts } from "@/lib/meilisearch"
import { mapMeiliHitToProduct } from "@/lib/map-meili-hit"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const q = params.get("q") || ""
  const locale = params.get("locale") || "et"
  const limit = Math.min(parseInt(params.get("limit") || "24"), 100)
  const offset = parseInt(params.get("offset") || "0")
  const sort = params.get("sort") || undefined
  const filter = params.get("filter") || undefined
  const facets = params.get("facets") || undefined

  try {
    const result = await searchProducts({
      q,
      limit,
      offset,
      sort: sort ? sort.split(",") : undefined,
      filter: filter ? filter.split(";") : undefined,
      facets: facets ? facets.split(",") : undefined,
    })

    return NextResponse.json({
      products: result.hits.map((hit) => mapMeiliHitToProduct(hit, locale)),
      totalHits: result.totalHits || result.estimatedTotalHits || 0,
      facetDistribution: result.facetDistribution,
      facetStats: result.facetStats,
    })
  } catch (e) {
    console.error("Products API error:", e)
    return NextResponse.json(
      { products: [], totalHits: 0, error: "Search failed" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Verify API route works**

Run: `curl -s "http://localhost:3030/api/products?q=drill&limit=3&locale=en" | python3 -m json.tool | head -30`

Expected: JSON with `products` array containing 3 product objects.

- [ ] **Step 3: Commit**

```bash
git add storefront/app/api/products/route.ts
git commit -m "[XL] Add /api/products fallback route for client-side error recovery"
```

---

## Task 4: Modify `/otsing` page — replace SSR product grid with ProductGrid

**Files:**
- Modify: `storefront/app/[locale]/otsing/page.tsx`

**What changes:**
1. Remove `import VevorProductCard`
2. Add `import ProductGrid` and `import { mapMeiliHitToProduct }`
3. Replace inline `hit => ({...})` mapping with `mapMeiliHitToProduct(hit, locale)`
4. Replace the VevorProductCard grid block (lines 292-298) with `<ProductGrid>`

**What stays the same:**
- Server still calls `searchProducts()` for facets, totalHits, AND products
- All filter/sort/pagination logic untouched
- Breadcrumb, title row, sidebar, category pills, recommended searches — all unchanged

- [ ] **Step 1: Update imports**

In `storefront/app/[locale]/otsing/page.tsx`, replace:
```typescript
import VevorProductCard from "@/components/VevorProductCard"
```
with:
```typescript
import ProductGrid from "@/components/ProductGrid"
import { mapMeiliHitToProduct } from "@/lib/map-meili-hit"
```

- [ ] **Step 2: Replace inline product mapping with shared helper**

Replace the `products = meiliResult.hits.map(hit => ({...}))` block (lines 111-134) with:
```typescript
    products = meiliResult.hits.map(hit => mapMeiliHitToProduct(hit, locale))
```

- [ ] **Step 3: Replace VevorProductCard grid with ProductGrid**

Replace lines 293-298:
```tsx
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product) => (
                      <VevorProductCard key={product.id} product={product} locale={locale} />
                    ))}
                  </div>
```
with:
```tsx
                  <ProductGrid initialProducts={products} locale={locale} />
```

- [ ] **Step 4: Verify build compiles**

Run: `cd /home/brrr/brrr-xlmarket/storefront && npx next build 2>&1 | tail -20`

- [ ] **Step 5: Commit**

```bash
git add storefront/app/[locale]/otsing/page.tsx
git commit -m "[XL] otsing: replace SSR VevorProductCard grid with client-side ProductGrid"
```

---

## Task 5: Modify `/kategooriad/[handle]` page — replace SSR product grid with ProductGrid

**Files:**
- Modify: `storefront/app/[locale]/kategooriad/[handle]/page.tsx`

**What changes:**
1. Remove `import VevorProductCard`
2. Add `import ProductGrid` and `import { mapMeiliHitToProduct }`
3. Replace inline hit mapping with `mapMeiliHitToProduct`
4. Replace main product grid (lines 405-408) with `<ProductGrid>`
5. Replace "You May Also Like" grid (lines 438-441) with `<ProductGrid columns="2-3-5">`

- [ ] **Step 1: Update imports**

In `storefront/app/[locale]/kategooriad/[handle]/page.tsx`, replace:
```typescript
import VevorProductCard from "@/components/VevorProductCard"
```
with:
```typescript
import ProductGrid from "@/components/ProductGrid"
import { mapMeiliHitToProduct } from "@/lib/map-meili-hit"
```

- [ ] **Step 2: Replace inline product mapping (main products)**

Replace the `products = meiliResult.hits.map(hit => ({...}))` block (lines 149-169) with:
```typescript
    products = meiliResult.hits.map(hit => mapMeiliHitToProduct(hit, locale))
```

- [ ] **Step 3: Replace inline product mapping (youMayAlsoLike)**

Replace the `youMayAlsoLike = alsoLikeResult.hits.map(hit => ({...}))` block (lines 229-249) with:
```typescript
    youMayAlsoLike = alsoLikeResult.hits.map(hit => mapMeiliHitToProduct(hit, locale))
```

- [ ] **Step 4: Replace main VevorProductCard grid with ProductGrid**

Replace lines 405-408:
```tsx
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product: any) => (
                  <VevorProductCard key={product.id} product={product} locale={locale} />
                ))}
              </div>
```
with:
```tsx
              <ProductGrid initialProducts={products} locale={locale} />
```

- [ ] **Step 5: Replace "You May Also Like" VevorProductCard grid with ProductGrid**

Replace lines 438-441:
```tsx
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {youMayAlsoLike.map((product: any) => (
                <VevorProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
```
with:
```tsx
            <ProductGrid initialProducts={youMayAlsoLike} locale={locale} columns="2-3-5" />
```

- [ ] **Step 6: Verify build compiles**

Run: `cd /home/brrr/brrr-xlmarket/storefront && npx next build 2>&1 | tail -20`

- [ ] **Step 7: Commit**

```bash
git add storefront/app/[locale]/kategooriad/[handle]/page.tsx
git commit -m "[XL] kategooriad: replace SSR VevorProductCard grids with client-side ProductGrid"
```

---

## Task 6: Modify `/haru/[handle]` page — replace SSR product grid with ProductGrid

**Files:**
- Modify: `storefront/app/[locale]/haru/[handle]/page.tsx`

**What changes:**
1. Remove `import VevorProductCard`
2. Add `import ProductGrid` and `import { mapMeiliHitToProduct }`
3. Replace `mapSearchHitToProduct` function with imported `mapMeiliHitToProduct`
4. Replace product grid (lines 273-276) with `<ProductGrid>`

- [ ] **Step 1: Update imports**

In `storefront/app/[locale]/haru/[handle]/page.tsx`, replace:
```typescript
import VevorProductCard from "@/components/VevorProductCard"
```
with:
```typescript
import ProductGrid from "@/components/ProductGrid"
```

Also add at the top (after other imports):
```typescript
import { mapMeiliHitToProduct } from "@/lib/map-meili-hit"
```

- [ ] **Step 2: Remove local `mapSearchHitToProduct` function**

Delete lines 16-43 (the `mapSearchHitToProduct` function). This is now handled by the shared helper.

- [ ] **Step 3: Update product mapping call**

Replace `products = meiliResult.hits.map(mapSearchHitToProduct)` (line 113) with:
```typescript
      products = meiliResult.hits.map((hit) => mapMeiliHitToProduct(hit, locale))
```

Note: The `locale` parameter is available from `const { handle, locale } = await params` on line 77.

- [ ] **Step 4: Replace VevorProductCard grid with ProductGrid**

Replace lines 272-276:
```tsx
            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {products.map((product: any) => (
                  <VevorProductCard key={product.id} product={product} />
                ))}
              </div>
```
with:
```tsx
            {products.length > 0 ? (
              <ProductGrid initialProducts={products} locale={locale} className="sm:gap-5" />
```

Note: The original grid has `gap-4 sm:gap-5`. ProductGrid uses `gap-4` by default. We pass the extra `sm:gap-5` via className.

- [ ] **Step 5: Verify build compiles**

Run: `cd /home/brrr/brrr-xlmarket/storefront && npx next build 2>&1 | tail -20`

- [ ] **Step 6: Commit**

```bash
git add storefront/app/[locale]/haru/[handle]/page.tsx
git commit -m "[XL] haru: replace SSR VevorProductCard grid with client-side ProductGrid"
```

---

## Task 7: Build, deploy, and verify

**Files:** None created/modified — deployment and testing only.

- [ ] **Step 1: Full production build**

```bash
cd /home/brrr/brrr-xlmarket/storefront
rm -rf .next/cache/fetch-cache
npm run build 2>&1 | tail -30
```

Expected: Build succeeds, no errors.

- [ ] **Step 2: Deploy with PM2**

```bash
cd /home/brrr/brrr-xlmarket/storefront
pm2 reload xlmarket-storefront 2>&1
sleep 5
pm2 jlist | python3 -c "import sys,json; data=json.load(sys.stdin); [print(f'{p[\"name\"]} pid={p[\"pid\"]} status={p[\"pm2_env\"][\"status\"]} restarts={p[\"pm2_env\"][\"restart_time\"]} mem={round(p[\"monit\"][\"memory\"]/1024/1024)}MB cpu={p[\"monit\"][\"cpu\"]}%') for p in data]"
```

Expected: 3 workers, all `online`, 0 restarts.

- [ ] **Step 3: Smoke test — all pages return 200**

```bash
for url in \
  "https://xlmarket.store/et" \
  "https://xlmarket.store/en" \
  "https://xlmarket.store/et/otsing?q=drill" \
  "https://xlmarket.store/en/otsing?q=pump" \
  "https://xlmarket.store/et/kategooriad/tools" \
  "https://xlmarket.store/et/kategooriad/kitchen" \
  "https://xlmarket.store/et/haru/kitchen" \
  "https://xlmarket.store/api/products?q=drill&limit=3&locale=en" \
; do
  status=$(curl -s -o /dev/null -w "%{http_code} %{time_total}s" --max-time 10 "$url")
  echo "$status $url"
done
```

Expected: All return `200` in under 2s.

- [ ] **Step 4: Verify products render in browser**

Open in browser:
1. `https://xlmarket.store/et/otsing?q=drill` — product cards should appear with images, prices, stars
2. `https://xlmarket.store/et/kategooriad/tools` — product grid visible, subcategory scroller works
3. `https://xlmarket.store/et/haru/kitchen` — hero + product grid visible

Check: No shimmer/skeleton visible during normal load. Products appear instantly.

- [ ] **Step 5: Record PM2 restart count baseline**

```bash
pm2 jlist | python3 -c "import sys,json; data=json.load(sys.stdin); [print(f'{p[\"name\"]} restarts={p[\"pm2_env\"][\"restart_time\"]}') for p in data]"
```

Note the restart counts — we'll compare after stress test.

---

## Task 8: Stress test — rapid clicking simulation

**Files:** None.

This is the critical validation. Simulates the user rapidly clicking through pages.

- [ ] **Step 1: Rapid sequential requests (simulates fast navigation)**

```bash
echo "=== Rapid navigation test (30 requests, no delay) ==="
for i in $(seq 1 30); do
  url=$(shuf -n1 -e \
    "https://xlmarket.store/et/otsing?q=drill" \
    "https://xlmarket.store/et/otsing?q=pump" \
    "https://xlmarket.store/et/kategooriad/tools" \
    "https://xlmarket.store/et/kategooriad/kitchen" \
    "https://xlmarket.store/et/kategooriad/automotive" \
    "https://xlmarket.store/et/kategooriad/outdoors" \
    "https://xlmarket.store/et/haru/kitchen" \
    "https://xlmarket.store/et/haru/tools" \
    "https://xlmarket.store/en/otsing?q=welder" \
    "https://xlmarket.store/et" \
  )
  status=$(curl -s -o /dev/null -w "%{http_code} %{time_total}s" --max-time 15 "$url")
  echo "$i: $status $(basename "$url")"
done
```

Expected: All return `200`, response times under 3s.

- [ ] **Step 2: Concurrent load test (10 parallel requests)**

```bash
echo "=== Concurrent load test (10 parallel) ==="
urls=(
  "https://xlmarket.store/et/otsing?q=drill"
  "https://xlmarket.store/et/otsing?q=pump"
  "https://xlmarket.store/et/kategooriad/tools"
  "https://xlmarket.store/et/kategooriad/kitchen"
  "https://xlmarket.store/et/kategooriad/automotive"
  "https://xlmarket.store/en/otsing?q=welder"
  "https://xlmarket.store/et/kategooriad/outdoors"
  "https://xlmarket.store/et/haru/kitchen"
  "https://xlmarket.store/et/haru/tools"
  "https://xlmarket.store/et"
)
for url in "${urls[@]}"; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}s $url\n" --max-time 15 "$url" &
done
wait
echo "=== All done ==="
```

Expected: All return `200`, response times under 5s.

- [ ] **Step 3: Verify PM2 workers survived**

```bash
pm2 jlist | python3 -c "import sys,json; data=json.load(sys.stdin); [print(f'{p[\"name\"]} pid={p[\"pid\"]} status={p[\"pm2_env\"][\"status\"]} restarts={p[\"pm2_env\"][\"restart_time\"]} mem={round(p[\"monit\"][\"memory\"]/1024/1024)}MB cpu={p[\"monit\"][\"cpu\"]}%') for p in data]"
```

Expected: All 3 workers `online`, restart count unchanged from baseline (Task 7 Step 5).

- [ ] **Step 4: Verify filters, sort, pagination still work**

```bash
# Filters
curl -s -o /dev/null -w "%{http_code}" "https://xlmarket.store/et/otsing?q=drill&min=50&max=200&in_stock=1"
# Sort
curl -s -o /dev/null -w "%{http_code}" "https://xlmarket.store/et/otsing?q=drill&sort=price_asc"
# Pagination
curl -s -o /dev/null -w "%{http_code}" "https://xlmarket.store/et/otsing?q=drill&page=2"
# Category filters
curl -s -o /dev/null -w "%{http_code}" "https://xlmarket.store/et/kategooriad/tools?sort=price_desc&min=100"
```

Expected: All return `200`.

- [ ] **Step 5: Final commit (all tasks complete)**

```bash
git add -A
git status
# If there are any uncommitted changes, commit them
git commit -m "[XL] Client-side ProductGrid: eliminate CPU-bound SSR for product grids"
```
