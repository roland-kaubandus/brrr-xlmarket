import { NextRequest, NextResponse } from "next/server"
import { medusaProxy, REGION_ID } from "@/lib/medusa-proxy"
import { isValidId } from "@/lib/validation"

type PaymentProvider = {
  id: string
}

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

  try {
    const cartRes = await medusaProxy(`/store/carts/${cart_id}?fields=id,region_id,currency_code`)
    if (!cartRes.ok) {
      const error = await cartRes.json()
      return NextResponse.json(error, { status: cartRes.status })
    }

    const cartData = await cartRes.json()
    const regionId = cartData.cart?.region_id || REGION_ID

    const providersRes = await medusaProxy(`/store/payment-providers?region_id=${encodeURIComponent(regionId)}`)
    if (!providersRes.ok) {
      const error = await providersRes.json()
      return NextResponse.json(error, { status: providersRes.status })
    }

    const providersData = await providersRes.json()
    const providers: PaymentProvider[] = providersData.payment_providers || []
    const providerId = providers[0]?.id
    if (!providerId) {
      return NextResponse.json({ error: "No payment providers are available for this region" }, { status: 400 })
    }

    const collectionRes = await medusaProxy("/store/payment-collections", {
      method: "POST",
      body: JSON.stringify({ cart_id }),
    })
    if (!collectionRes.ok) {
      const error = await collectionRes.json()
      return NextResponse.json(error, { status: collectionRes.status })
    }

    const collectionData = await collectionRes.json()
    const paymentCollection = collectionData.payment_collection
    if (!paymentCollection?.id) {
      return NextResponse.json({ error: "Failed to create payment collection" }, { status: 500 })
    }

    const sessionRes = await medusaProxy(`/store/payment-collections/${paymentCollection.id}/payment-sessions`, {
      method: "POST",
      body: JSON.stringify({ provider_id: providerId }),
    })
    if (!sessionRes.ok) {
      const error = await sessionRes.json()
      return NextResponse.json(error, { status: sessionRes.status })
    }

    const sessionData = await sessionRes.json()
    return NextResponse.json(sessionData, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Failed to connect to server" }, { status: 503 })
  }
}
