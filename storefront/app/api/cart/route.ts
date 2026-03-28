import { NextRequest, NextResponse } from "next/server"
import { medusaProxy, REGION_ID } from "@/lib/medusa-proxy"
import { isValidId } from "@/lib/validation"

export async function POST() {
  try {
    const res = await medusaProxy("/store/carts", {
      method: "POST",
      body: JSON.stringify({ region_id: REGION_ID }),
    })
    if (!res.ok) {
      return NextResponse.json({ error: "Ostukorvi loomine ebaõnnestus" }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Serveriga ühenduse loomine ebaõnnestus" }, { status: 503 })
  }
}

export async function GET(req: NextRequest) {
  const cartId = req.nextUrl.searchParams.get("cart_id")
  if (!isValidId(cartId)) {
    return NextResponse.json({ error: "cart_id is required and must be a valid ID" }, { status: 400 })
  }

  const res = await medusaProxy(
    `/store/carts/${cartId}?fields=*items,*items.variant,*items.variant.product`
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
