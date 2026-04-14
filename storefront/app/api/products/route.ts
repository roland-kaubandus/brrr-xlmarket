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
