import { NextRequest, NextResponse } from "next/server"
import { searchProducts } from "@/lib/meilisearch"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const q = params.get("q") || ""
  const limit = Math.min(parseInt(params.get("limit") || "12"), 50)

  if (!q.trim()) {
    return NextResponse.json({ hits: [], totalHits: 0, query: "" })
  }

  const result = await searchProducts({ q, limit })

  return NextResponse.json({
    hits: result.hits.map((h) => ({
      id: h.id,
      title: h.title,
      handle: h.handle,
      thumbnail: h.thumbnail,
      price: h.price,
      categories: h.categories,
    })),
    totalHits: result.totalHits || result.estimatedTotalHits || 0,
    query: q,
  })
}
