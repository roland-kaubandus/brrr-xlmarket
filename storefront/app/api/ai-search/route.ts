import { NextRequest, NextResponse } from "next/server"
import { searchProducts, getProductTitle } from "@/lib/meilisearch"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const q = params.get("q") || ""
  const locale = params.get("locale") || "en"
  const limit = Math.min(parseInt(params.get("limit") || "12"), 50)

  if (!q.trim()) {
    return NextResponse.json({ hits: [], totalHits: 0, query: "" })
  }

  // ET-lehel kuva title_et (mitte EN baseline'i). Highlight AINULT kuvatava väljaga
  // kooskõlas: ET → title_et formatted, muidu title/title_en.
  const result = await searchProducts({
    q,
    limit,
    attributesToHighlight: ["title_et", "title_en", "title"],
  })

  const et = locale === "et"
  return NextResponse.json({
    hits: result.hits.map((h) => ({
      id: h.id,
      title: getProductTitle(h, locale),
      handle: h.handle,
      thumbnail: h.thumbnail,
      price: h.price,
      categories: h.categories,
      _formatted: {
        title: (et && h._formatted?.title_et)
          ? h._formatted.title_et
          : (h._formatted?.title || h._formatted?.title_en),
      },
    })),
    totalHits: result.totalHits || result.estimatedTotalHits || 0,
    query: q,
  })
}
