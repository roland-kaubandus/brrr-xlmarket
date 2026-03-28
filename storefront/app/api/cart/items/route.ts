import { NextRequest, NextResponse } from "next/server"

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "http://127.0.0.1:9001"
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY || "pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3"

export async function POST(req: NextRequest) {
  const { cart_id, variant_id, quantity } = await req.json()

  const res = await fetch(`${MEDUSA_URL}/store/carts/${cart_id}/line-items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": API_KEY,
    },
    body: JSON.stringify({ variant_id, quantity }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
