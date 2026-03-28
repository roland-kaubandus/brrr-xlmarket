import { NextRequest, NextResponse } from "next/server"
import { medusaProxy } from "@/lib/medusa-proxy"

export async function POST(req: NextRequest) {
  const { cart_id, variant_id, quantity } = await req.json()

  const res = await medusaProxy(`/store/carts/${cart_id}/line-items`, {
    method: "POST",
    body: JSON.stringify({ variant_id, quantity }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PATCH(req: NextRequest) {
  const { cart_id, item_id, quantity } = await req.json()

  const res = await medusaProxy(`/store/carts/${cart_id}/line-items/${item_id}`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(req: NextRequest) {
  const { cart_id, item_id } = await req.json()

  const res = await medusaProxy(`/store/carts/${cart_id}/line-items/${item_id}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
