import { NextRequest, NextResponse } from "next/server"
import { medusaProxy } from "@/lib/medusa-proxy"
import { isValidId, isValidQuantity } from "@/lib/validation"

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { cart_id, variant_id, quantity } = body

  if (!isValidId(cart_id)) {
    return NextResponse.json({ error: "cart_id is required and must be a valid ID" }, { status: 400 })
  }
  if (!isValidId(variant_id)) {
    return NextResponse.json({ error: "variant_id is required and must be a valid ID" }, { status: 400 })
  }
  if (!isValidQuantity(quantity)) {
    return NextResponse.json({ error: "quantity must be an integer between 1 and 99" }, { status: 400 })
  }

  try {
    const res = await medusaProxy(`/store/carts/${cart_id}/line-items`, {
      method: "POST",
      body: JSON.stringify({ variant_id, quantity }),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to connect to server" }, { status: 503 })
  }
}

export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { cart_id, item_id, quantity } = body

  if (!isValidId(cart_id)) {
    return NextResponse.json({ error: "cart_id is required and must be a valid ID" }, { status: 400 })
  }
  if (!isValidId(item_id)) {
    return NextResponse.json({ error: "item_id is required and must be a valid ID" }, { status: 400 })
  }
  if (!isValidQuantity(quantity)) {
    return NextResponse.json({ error: "quantity must be an integer between 1 and 99" }, { status: 400 })
  }

  try {
    const res = await medusaProxy(`/store/carts/${cart_id}/line-items/${item_id}`, {
      method: "POST",
      body: JSON.stringify({ quantity }),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to connect to server" }, { status: 503 })
  }
}

export async function DELETE(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { cart_id, item_id } = body

  if (!isValidId(cart_id)) {
    return NextResponse.json({ error: "cart_id is required and must be a valid ID" }, { status: 400 })
  }
  if (!isValidId(item_id)) {
    return NextResponse.json({ error: "item_id is required and must be a valid ID" }, { status: 400 })
  }

  try {
    const res = await medusaProxy(`/store/carts/${cart_id}/line-items/${item_id}`, {
      method: "DELETE",
    })
    const data = await res.json()
    // Medusa DELETE tagastab {id, object, deleted, parent} - teisendame {cart} formaati
    if (data.parent) {
      return NextResponse.json({ cart: data.parent }, { status: res.status })
    }
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Failed to connect to server" }, { status: 503 })
  }
}
