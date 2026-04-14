import { NextRequest, NextResponse } from "next/server"
import { medusaProxy } from "@/lib/medusa-proxy"
import { isValidId, isValidEmail } from "@/lib/validation"

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { cart_id, email, shipping_address, billing_address } = body

  if (!isValidId(cart_id)) {
    return NextResponse.json({ error: "cart_id is required and must be a valid ID" }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
  }
  if (!shipping_address || typeof shipping_address !== "object") {
    return NextResponse.json({ error: "shipping_address is required" }, { status: 400 })
  }

  try {
    // Update cart with customer info
    const updateRes = await medusaProxy(`/store/carts/${cart_id}`, {
      method: "POST",
      body: JSON.stringify({
        email,
        shipping_address,
        billing_address: billing_address || shipping_address,
      }),
    })

    if (!updateRes.ok) {
      const err = await updateRes.json()
      return NextResponse.json(err, { status: updateRes.status })
    }

    return NextResponse.json(await updateRes.json())
  } catch {
    return NextResponse.json({ error: "Failed to connect to server" }, { status: 503 })
  }
}
