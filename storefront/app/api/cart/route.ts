import { NextRequest } from "next/server"
import { medusaProxy, REGION_ID } from "@/lib/medusa-proxy"
import { isValidId } from "@/lib/validation"
import { jsonCL } from "@/lib/json-response"

export async function POST() {
  // STOPGAP: cart-workflow stallib vahelduvalt (5-12s). ~pooled päringud kiired,
  // seega kuni 3 katset (15s timeout) tabab peaaegu kindlasti õnnestunud katse.
  // 2 katset × 13s = max 26s (alla ~30s edge-timeout'i → väldi 504 retry-stacking'ut)
  let lastStatus = 503
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await medusaProxy("/store/carts", {
        method: "POST",
        body: JSON.stringify({ region_id: REGION_ID }),
        timeoutMs: 13000,
      })
      if (res.ok) {
        const data = await res.json()
        return jsonCL(data, { status: res.status })
      }
      lastStatus = res.status
      if (res.status < 500) break // klienditviga → ära korda
    } catch {
      lastStatus = 503 // timeout/abort → korda
    }
  }
  return jsonCL({ error: "Failed to create cart" }, { status: lastStatus })
}

export async function GET(req: NextRequest) {
  const cartId = req.nextUrl.searchParams.get("cart_id")
  if (!isValidId(cartId)) {
    return jsonCL({ error: "cart_id is required and must be a valid ID" }, { status: 400 })
  }

  try {
    // Trimmitud: cart-UI vajab AINULT denormaliseeritud item-välju (title, thumbnail,
    // unit_price, quantity — kõik salvestatud line-item'il add-ajal). Vana
    // `*items.variant.product` täis-graaf = N+1 relation-expansion (~90 päringut,
    // #11922). Cart-stall fix 2026-06-09. Vt LAUNCH-CHECKLIST.
    const res = await medusaProxy(
      `/store/carts/${cartId}?fields=*items`
    )
    const data = await res.json()
    return jsonCL(data, { status: res.status })
  } catch {
    return jsonCL({ error: "Failed to connect to server" }, { status: 503 })
  }
}
