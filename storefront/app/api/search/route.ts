import { NextRequest, NextResponse } from "next/server"
import { searchProducts, escapeMeiliFilterValue, isSafeHandleToken } from "@/lib/meilisearch"

const ALLOWED_SORTS = new Set([
  "price:asc", "price:desc",
  "title:asc", "title:desc",
  "title_en:asc", "title_en:desc",
  "created_at:asc", "created_at:desc",
])

const ALLOWED_FILTER_FIELDS = new Set([
  "category_handles", "taxonomy.ancestors", "taxonomy.l1_slug",
  "taxonomy.l2_slug", "taxonomy.l3_slug", "vertical_slugs",
  "in_stock", "brand",
])

const ALLOWED_FACETS = new Set([
  "category_handles", "taxonomy.ancestors", "taxonomy.l1_slug",
  "taxonomy.l2_slug", "taxonomy.l3_slug", "in_stock", "brand",
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

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const q = params.get("q") || ""
  const limit = Math.min(Math.max(parseInt(params.get("limit") || "6"), 1), 50)
  const offset = Math.max(parseInt(params.get("offset") || "0"), 0)
  const sortRaw = params.get("sort")
  const facetsRaw = params.get("facets")

  if (!q.trim()) {
    return NextResponse.json({ hits: [], totalHits: 0, query: "" })
  }

  const sort = sortRaw && ALLOWED_SORTS.has(sortRaw) ? [sortRaw] : undefined
  const facets = facetsRaw
    ? facetsRaw.split(",").map(s => s.trim()).filter(s => ALLOWED_FACETS.has(s))
    : undefined

  try {
    const result = await searchProducts({
      q: q.trim(),
      limit,
      offset,
      sort,
      filter: parseFilter(params.get("filter")),
      facets: facets && facets.length ? facets : undefined,
      attributesToHighlight: ["title"],
    })

    return NextResponse.json({
      hits: result.hits.map(hit => ({
        id: hit.id,
        title: hit.title,
        handle: hit.handle,
        thumbnail: hit.thumbnail,
        price: hit.price,
        categories: hit.categories ?? [],
        _formatted: hit._formatted,
      })),
      totalHits: result.totalHits || result.estimatedTotalHits || 0,
      query: result.query,
      processingTimeMs: result.processingTimeMs,
      facetDistribution: result.facetDistribution,
      facetStats: result.facetStats,
    })
  } catch (e) {
    console.error("[api/search] Meili failure:", e instanceof Error ? e.message : e)
    return NextResponse.json({ hits: [], totalHits: 0, query: q, error: "Search failed" }, { status: 503 })
  }
}
