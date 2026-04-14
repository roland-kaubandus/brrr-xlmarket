import { NextRequest, NextResponse } from "next/server"
import { searchProducts } from "@/lib/meilisearch"
import { mapMeiliHitToProduct } from "@/lib/map-meili-hit"

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("product_id") || ""
  const categoryHandle = req.nextUrl.searchParams.get("category_handle") || ""
  const q = req.nextUrl.searchParams.get("q") || ""
  const locale = req.nextUrl.searchParams.get("locale") || "et"

  const categoryFilter = categoryHandle
    ? [`category_handles = "${categoryHandle}"`]
    : undefined

  const safeSearch = (p: Promise<any>) => p.catch(() => ({ hits: [] }))

  try {
    const [similarRes, koosRes, bestRes] = await Promise.all([
      safeSearch(searchProducts({
        q: q || "",
        limit: 12,
        filter: categoryFilter,
        sort: ["created_at:desc"],
      })),
      safeSearch(searchProducts({
        q: q || "",
        limit: 5,
        offset: 12,
        filter: categoryFilter,
      })),
      categoryHandle
        ? safeSearch(searchProducts({
            q: "",
            limit: 6,
            filter: [`category_handles = "${categoryHandle}"`],
            sort: ["price:desc"],
          }))
        : Promise.resolve({ hits: [] }),
    ])

    const map = (hits: any[]) => hits.map(h => mapMeiliHitToProduct(h, locale))
    const filter = (arr: any[]) => arr.filter((p: any) => p.id !== productId)

    return NextResponse.json({
      similar: filter(map(similarRes.hits)).slice(0, 10),
      koos: filter(map(koosRes.hits)).slice(0, 3),
      best: filter(map(bestRes.hits)).slice(0, 5),
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    })
  } catch {
    return NextResponse.json({ similar: [], koos: [], best: [] }, { status: 200 })
  }
}
