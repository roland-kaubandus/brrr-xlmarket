import { NextRequest, NextResponse } from "next/server"
import { medusaProxy } from "@/lib/medusa-proxy"
import { isValidId } from "@/lib/validation"

export async function GET(req: NextRequest) {
  const cartId = req.nextUrl.searchParams.get("cart_id")
  if (!isValidId(cartId)) {
    return NextResponse.json({ error: "cart_id is required and must be a valid ID" }, { status: 400 })
  }

  try {
    const res = await medusaProxy(`/store/shipping-options?cart_id=${cartId}`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to connect to server" }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { cart_id, option_id } = body

  if (!isValidId(cart_id)) {
    return NextResponse.json({ error: "cart_id is required and must be a valid ID" }, { status: 400 })
  }
  if (!isValidId(option_id)) {
    return NextResponse.json({ error: "option_id is required and must be a valid ID" }, { status: 400 })
  }

  try {
    const res = await medusaProxy(`/store/carts/${cart_id}/shipping-methods`, {
      method: "POST",
      body: JSON.stringify({ option_id }),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to connect to server" }, { status: 503 })
  }
}
