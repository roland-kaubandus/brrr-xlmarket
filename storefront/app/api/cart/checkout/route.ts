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

  const { cart_id, email, shipping_address, billing_address, metadata } = body

  if (!isValidId(cart_id)) {
    return NextResponse.json({ error: "cart_id is required and must be a valid ID" }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
  }
  if (!shipping_address || typeof shipping_address !== "object") {
    return NextResponse.json({ error: "shipping_address is required" }, { status: 400 })
  }

  // Cart-metadata whitelist (D1 ettevõte + D2 keel) — EI aktsepteeri suvalisi võtmeid kliendilt.
  // Medusa kopeerib cart.metadata → order.metadata complete'il → arve resolveBuyer/resolveLocale loeb.
  const META_KEYS = ["locale", "company_name", "company_reg", "company_vat"] as const
  const safeMeta: Record<string, string> = {}
  if (metadata && typeof metadata === "object") {
    for (const k of META_KEYS) {
      const v = (metadata as Record<string, unknown>)[k]
      if (typeof v === "string" && v.trim()) safeMeta[k] = v.trim().slice(0, 200)
    }
  }

  try {
    // Update cart with customer info
    const updateRes = await medusaProxy(`/store/carts/${cart_id}`, {
      method: "POST",
      body: JSON.stringify({
        email,
        shipping_address,
        billing_address: billing_address || shipping_address,
        ...(Object.keys(safeMeta).length ? { metadata: safeMeta } : {}),
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
