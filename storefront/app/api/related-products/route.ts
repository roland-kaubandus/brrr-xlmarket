import { NextRequest, NextResponse } from "next/server"
import { searchProducts, isSafeHandleToken, escapeMeiliFilterValue } from "@/lib/meilisearch"
import type { MeiliHit, MeiliSearchResult } from "@/lib/meilisearch"
import { mapMeiliHitToProduct } from "@/lib/map-meili-hit"

const MIN_RESULTS = 5

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("product_id") || ""
  const handlesRaw = req.nextUrl.searchParams.get("category_handles") || ""
  const locale = req.nextUrl.searchParams.get("locale") || "et"

  const handles = handlesRaw.split(",").filter(Boolean).filter(isSafeHandleToken)

  // Log-preserving swallow: Meili errors should be recorded so they surface
  // in PM2 logs / observability (audit 2026-04-20 H12). Previous bare catch
  // returned {hits: []} silently, masking key-rotation and index wipes.
  const safeSearch = async (p: Promise<MeiliSearchResult>): Promise<MeiliSearchResult> => {
    try { return await p } catch (err) {
      console.error("[related-products] Meili search failed:", err instanceof Error ? err.message : err)
      return { hits: [], query: "", processingTimeMs: 0 }
    }
  }
  const map = (hits: MeiliHit[]) => hits.map(h => mapMeiliHitToProduct(h))
  const exclude = <T extends { id: string }>(arr: T[]) => arr.filter(p => p.id !== productId)

  try {
    let similarHits: MeiliHit[] = []
    let bestHandle = handles[0] || ""

    for (const handle of handles) {
      const res = await safeSearch(searchProducts({
        q: "",
        limit: 15,
        filter: [`category_handles = "${escapeMeiliFilterValue(handle)}"`],
        sort: ["created_at:desc"],
      }))
      const filtered = (res.hits || []).filter(h => h.id !== productId)
      if (filtered.length >= MIN_RESULTS) {
        similarHits = filtered
        bestHandle = handle
        break
      }
      if (filtered.length > similarHits.length) {
        similarHits = filtered
        bestHandle = handle
      }
    }

    const bestRes = bestHandle
      ? await safeSearch(searchProducts({
          q: "",
          limit: 15,
          filter: [`category_handles = "${bestHandle}"`],
          sort: ["price:desc"],
        }))
      : { hits: [] as MeiliHit[], query: "", processingTimeMs: 0 }

    return NextResponse.json({
      similar: exclude(map(similarHits)).slice(0, 10),
      best: exclude(map(bestRes.hits || [])).slice(0, 10),
      categoryUsed: bestHandle,
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    })
  } catch (err) {
    console.error("[related-products] unexpected error:", err instanceof Error ? err.message : err)
    return NextResponse.json({ similar: [], best: [], error: "Related products unavailable" }, { status: 503 })
  }
}
