export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import { NextRequest, NextResponse } from "next/server"
import { medusaProxy, REGION_ID } from "@/lib/medusa-proxy"
import { isValidId } from "@/lib/validation"

export async function POST() {
  // ROOT-FIX (2026-06-11): cart-create EI durable-persisti vahelduvalt (~50%) avalikul
  // Traefik-teel — medusa tagastab cart-objekti, AGA rida ei jää DB-sse (route-päringu
  // abort-altis tee katkestab create'i enne durable-commit'i; localhost/direct = 100%).
  // Sümptom: brauseri create→kohe-add → "Cart id not found" → "Failed to add to cart".
  // FIX: tagasta AINULT cart mis on KINNITATULT retrievable (verify GET). Kui loodud cart
  // pole leitav → loo uuesti. Vastus tuleb alles peale durable-persist'i. (Vt 2026-06-11 diagnoos.)
  let lastStatus = 503
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await medusaProxy("/store/carts", {
        method: "POST",
        body: JSON.stringify({ region_id: REGION_ID }),
        timeoutMs: 13000,
      })
      if (!res.ok) {
        lastStatus = res.status
        if (res.status < 500) break // klienditviga → ära korda
        continue
      }
      const data = await res.json()
      const cartId = data?.cart?.id
      if (!cartId) { lastStatus = 502; continue }
      // VERIFY durable-persist: cart PEAB olema kohe retrievable. Kui ei → create katkes,
      // loo uuesti (ära tagasta phantom-cart'i mida add-to-cart ei leia).
      const verify = await medusaProxy(`/store/carts/${cartId}?fields=id`, { timeoutMs: 8000 })
      if (verify.ok) {
        const vd = await verify.json()
        if (vd?.cart?.id === cartId) {
          return NextResponse.json(data, { status: 200 })
        }
      }
      lastStatus = 503 // phantom → korda create
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
    // Trimmitud: cart-UI vajab AINULT denormaliseeritud item-välju (title, thumbnail,
    // unit_price, quantity — kõik salvestatud line-item'il add-ajal). Vana
    // `*items.variant.product` täis-graaf = N+1 relation-expansion (~90 päringut,
    // #11922). Cart-stall fix 2026-06-09. Vt LAUNCH-CHECKLIST.
    const res = await medusaProxy(
      `/store/carts/${cartId}?fields=*items`
    )
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to connect to server" }, { status: 503 })
  }
}
