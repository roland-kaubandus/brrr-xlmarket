import { NextRequest, NextResponse } from "next/server"
import { searchProducts, isSafeHandleToken, escapeMeiliFilterValue } from "@/lib/meilisearch"
import { mapMeiliHitToProduct } from "@/lib/map-meili-hit"

const MIN_RESULTS = 5

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("product_id") || ""
  const handlesRaw = req.nextUrl.searchParams.get("category_handles") || ""
  const locale = req.nextUrl.searchParams.get("locale") || "et"

  const handles = handlesRaw.split(",").filter(Boolean).filter(isSafeHandleToken)

  const safeSearch = (p: Promise<any>) => p.catch(() => ({ hits: [] }))
  const map = (hits: any[]) => hits.map(h => mapMeiliHitToProduct(h, locale))
  const exclude = (arr: any[]) => arr.filter((p: any) => p.id !== productId)

  try {
    // Try categories from narrowest to broadest until we get enough results
    let similarHits: any[] = []
    let bestHandle = handles[0] || ""

    for (const handle of handles) {
      const res = await safeSearch(searchProducts({
        q: "",
        limit: 15,
        filter: [`category_handles = "${escapeMeiliFilterValue(handle)}"`],
        sort: ["created_at:desc"],
      }))
      const filtered = (res.hits || []).filter((h: any) => h.id !== productId)
      if (filtered.length >= MIN_RESULTS) {
        similarHits = filtered
        bestHandle = handle
        break
      }
      // Keep widening — use best result so far if it has more
      if (filtered.length > similarHits.length) {
        similarHits = filtered
        bestHandle = handle
      }
    }

    // Best in category — use the same handle that gave us enough similar results
    const bestRes = bestHandle
      ? await safeSearch(searchProducts({
          q: "",
          limit: 15,
          filter: [`category_handles = "${bestHandle}"`],
          sort: ["price:desc"],
        }))
      : { hits: [] }

    return NextResponse.json({
      similar: exclude(map(similarHits)).slice(0, 10),
      best: exclude(map(bestRes.hits || [])).slice(0, 10),
      categoryUsed: bestHandle,
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    })
  } catch {
    return NextResponse.json({ similar: [], best: [] }, { status: 200 })
  }
}
