import { NextRequest, NextResponse } from "next/server"
import { medusaProxy, REGION_ID } from "@/lib/medusa-proxy"
import { isValidId } from "@/lib/validation"

export async function POST() {
  // STOPGAP: cart-workflow stallib vahelduvalt (5-12s). ~pooled päringud kiired,
  // seega kuni 3 katset (15s timeout) tabab peaaegu kindlasti õnnestunud katse.
  let lastStatus = 503
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await medusaProxy("/store/carts", {
        method: "POST",
        body: JSON.stringify({ region_id: REGION_ID }),
        timeoutMs: 15000,
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(data, { status: res.status })
      }
      lastStatus = res.status
      if (res.status < 500) break // klienditviga → ära korda
    } catch {
      lastStatus = 503 // timeout/abort → korda
    }
  }
  return NextResponse.json({ error: "Failed to create cart" }, { status: lastStatus })
}

export async function GET(req: NextRequest) {
  const cartId = req.nextUrl.searchParams.get("cart_id")
  if (!isValidId(cartId)) {
    return NextResponse.json({ error: "cart_id is required and must be a valid ID" }, { status: 400 })
  }

  try {
    const res = await medusaProxy(
      `/store/carts/${cartId}?fields=*items,*items.variant,*items.variant.product`
    )
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to connect to server" }, { status: 503 })
  }
}
