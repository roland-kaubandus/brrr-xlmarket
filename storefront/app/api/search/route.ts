import { NextRequest, NextResponse } from "next/server"
import { searchProducts } from "@/lib/meilisearch"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const q = params.get("q") || ""
  const limit = Math.min(parseInt(params.get("limit") || "6"), 50)
  const offset = parseInt(params.get("offset") || "0")
  const sort = params.get("sort") || undefined
  const filter = params.get("filter") || undefined
  const facets = params.get("facets")

  if (!q.trim()) {
    return NextResponse.json({ hits: [], totalHits: 0, query: "" })
  }

  try {
    const result = await searchProducts({
      q: q.trim(),
      limit,
      offset,
      sort: sort ? [sort] : undefined,
      filter: filter || undefined,
      facets: facets ? facets.split(",") : undefined,
      attributesToHighlight: ["title"],
    })

    return NextResponse.json({
      hits: result.hits.map(hit => ({
        id: hit.id,
        title: hit.title,
        handle: hit.handle,
        thumbnail: hit.thumbnail,
        price: hit.price,
        categories: hit.categories,
        _formatted: hit._formatted,
      })),
      totalHits: result.totalHits || result.estimatedTotalHits || 0,
      query: result.query,
      processingTimeMs: result.processingTimeMs,
      facetDistribution: result.facetDistribution,
      facetStats: result.facetStats,
    })
  } catch (e) {
    console.error("Search error:", e)
    return NextResponse.json({ hits: [], totalHits: 0, query: q, error: "Search failed" }, { status: 500 })
  }
}
