import { NextRequest, NextResponse } from "next/server"
import { searchProducts, escapeMeiliFilterValue, isSafeHandleToken } from "@/lib/meilisearch"
import { mapMeiliHitToProduct } from "@/lib/map-meili-hit"
import { getProductsByHandles } from "@/lib/medusa"
import type { Product } from "@/lib/medusa"

// Allowlist Meili sort values — prevents enumeration of internal fields via
// `?sort=internalField:asc` (audit 2026-04-20 H8).
const ALLOWED_SORTS = new Set([
  "price:asc", "price:desc",
  "title:asc", "title:desc",
  "title_en:asc", "title_en:desc",
  "created_at:asc", "created_at:desc",
  "popularity:desc", "discount_pct:desc",
])

// Allowlist filter fields — each accepts a safe token value or a boolean.
// This replaces raw filter pass-through which allowed attacker to probe any
// indexed field with arbitrary operators.
const ALLOWED_FILTER_FIELDS = new Set([
  "category_handles", "taxonomy.ancestors", "taxonomy.l1_slug",
  "taxonomy.l2_slug", "taxonomy.l3_slug", "vertical_slugs",
  "in_stock", "brand",
])

const ALLOWED_FACETS = new Set([
  "category_handles", "taxonomy.ancestors", "taxonomy.l1_slug",
  "taxonomy.l2_slug", "taxonomy.l3_slug", "in_stock", "brand",
  "spec_filters", "filter_tokens",
])

function parseFilter(raw: string | null): string[] | undefined {
  if (!raw) return undefined
  const out: string[] = []
  for (const part of raw.split(";")) {
    const m = part.trim().match(/^([a-zA-Z0-9_.]+)\s*=\s*"?([^"]*)"?$/)
    if (!m) continue
    const [, field, value] = m
    if (!ALLOWED_FILTER_FIELDS.has(field)) continue
    if (value === "true" || value === "false") {
      out.push(`${field} = ${value}`)
    } else if (isSafeHandleToken(value)) {
      out.push(`${field} = "${escapeMeiliFilterValue(value)}"`)
    }
  }
  return out.length ? out : undefined
}

function parseSort(raw: string | null): string[] | undefined {
  if (!raw) return undefined
  const out = raw.split(",").map(s => s.trim()).filter(s => ALLOWED_SORTS.has(s))
  return out.length ? out : undefined
}

function parseFacets(raw: string | null): string[] | undefined {
  if (!raw) return undefined
  const out = raw.split(",").map(s => s.trim()).filter(s => ALLOWED_FACETS.has(s))
  return out.length ? out : undefined
}

function hasUsablePrice(product: ReturnType<typeof mapMeiliHitToProduct>) {
  const amount = product.variants?.[0]?.calculated_price?.calculated_amount
  return typeof amount === "number" && amount > 0
}

async function enrichMissingPrices(products: ReturnType<typeof mapMeiliHitToProduct>[]): Promise<ReturnType<typeof mapMeiliHitToProduct>[]> {
  const missingPriceHandles = products
    .filter((product) => !hasUsablePrice(product))
    .map((product) => product.handle)

  if (missingPriceHandles.length === 0) return products

  try {
    const medusaProducts = await getProductsByHandles(missingPriceHandles)
    const byHandle = new Map<string, Product>()
    for (const product of medusaProducts) {
      byHandle.set(product.handle, product)
    }

    return products.map((product) => {
      if (hasUsablePrice(product)) return product
      const medusaProduct = byHandle.get(product.handle)
      const price = medusaProduct?.variants?.[0]?.calculated_price
      if (!price || typeof price.calculated_amount !== "number" || price.calculated_amount <= 0) {
        return product
      }
      return {
        ...product,
        variants: [
          {
            ...(product.variants?.[0] || { id: `${product.id}_v`, title: "Default" }),
            calculated_price: price,
          },
        ],
      }
    })
  } catch (err) {
    console.error("[api/products] price enrichment failed:", err instanceof Error ? err.message : err)
    return products
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const q = params.get("q") || ""
  const locale = params.get("locale") || undefined
  const limit = Math.min(Math.max(parseInt(params.get("limit") || "24"), 1), 100)
  const offset = Math.max(parseInt(params.get("offset") || "0"), 0)

  // If user sent a parameter but NONE of its tokens passed the allowlist,
  // reject with 400. Otherwise silently-dropping the filter leaks the full
  // catalog on bogus queries (test 1 FAIL 2026-04-20).
  const rawFilter = params.get("filter")
  const rawSort = params.get("sort")
  const rawFacets = params.get("facets")
  const filter = parseFilter(rawFilter)
  const sort = parseSort(rawSort)
  const facets = parseFacets(rawFacets)
  if (rawFilter && !filter) {
    return NextResponse.json({ products: [], totalHits: 0, error: "Invalid filter" }, { status: 400 })
  }
  if (rawSort && !sort) {
    return NextResponse.json({ products: [], totalHits: 0, error: "Invalid sort" }, { status: 400 })
  }
  if (rawFacets && !facets) {
    return NextResponse.json({ products: [], totalHits: 0, error: "Invalid facets" }, { status: 400 })
  }

  try {
    const result = await searchProducts({
      q,
      limit,
      offset,
      sort,
      filter,
      facets,
    })

    const products = result.hits.map((hit) => mapMeiliHitToProduct(hit, locale))
    const enrichedProducts = await enrichMissingPrices(products)

    return NextResponse.json({
      products: enrichedProducts,
      totalHits: result.totalHits || result.estimatedTotalHits || 0,
      facetDistribution: result.facetDistribution,
      facetStats: result.facetStats,
    })
  } catch (e) {
    console.error("[api/products] Meili failure:", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { products: [], totalHits: 0, error: "Search failed" },
      { status: 503 }
    )
  }
}
