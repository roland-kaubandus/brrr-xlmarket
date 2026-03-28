import { NextRequest, NextResponse } from "next/server"
import { medusaProxy } from "@/lib/medusa-proxy"
import { isValidId } from "@/lib/validation"

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { cart_id } = body

  if (!isValidId(cart_id)) {
    return NextResponse.json({ error: "cart_id is required and must be a valid ID" }, { status: 400 })
  }

  const res = await medusaProxy(`/store/carts/${cart_id}/complete`, {
    method: "POST",
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
