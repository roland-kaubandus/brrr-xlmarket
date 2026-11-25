import { NextRequest, NextResponse } from "next/server"
import { medusaProxy } from "@/lib/medusa-proxy"
import { isValidEmail } from "@/lib/validation"

// POST /api/newsletter/consent — kassa single opt-in. Edastab backendile + kliendi IP/UA (GDPR-tõend).
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { email, locale, customer_id } = body
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
  }

  // Kliendi IP/UA: edge/CDN seab x-forwarded-for; edastame backendile muutmata (seal normaliseeritakse).
  const xff = req.headers.get("x-forwarded-for") || ""
  const ua = req.headers.get("user-agent") || ""

  try {
    const r = await medusaProxy("/store/newsletter/consent", {
      method: "POST",
      headers: { "x-forwarded-for": xff, "user-agent": ua },
      body: JSON.stringify({
        email,
        locale: typeof locale === "string" ? locale : "et",
        customer_id: typeof customer_id === "string" ? customer_id : undefined,
      }),
    })
    const data = await r.json().catch(() => ({}))
    return NextResponse.json(data, { status: r.status })
  } catch {
    return NextResponse.json({ error: "Failed to connect to server" }, { status: 503 })
  }
}
