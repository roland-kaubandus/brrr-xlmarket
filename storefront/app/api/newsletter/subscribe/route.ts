import { NextRequest, NextResponse } from "next/server"
import { medusaProxy } from "@/lib/medusa-proxy"
import { isValidEmail } from "@/lib/validation"

// POST /api/newsletter/subscribe — JALUS double opt-in. Edastab backendile e-posti + locale +
// honeypot-välja (website) + kliendi IP/UA (GDPR-tõend + rate-limit). Backend loob pending rea
// ja saadab kinnituskirja. Vastus on geneeriline (ei leki, kas aadress juba olemas).
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const { email, locale, website } = body
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 })
  }

  // Kliendi IP/UA: edge/CDN seab x-forwarded-for; edastame backendile muutmata (seal normaliseeritakse).
  const xff = req.headers.get("x-forwarded-for") || ""
  const ua = req.headers.get("user-agent") || ""

  try {
    const r = await medusaProxy("/store/newsletter/subscribe", {
      method: "POST",
      headers: { "x-forwarded-for": xff, "user-agent": ua },
      body: JSON.stringify({
        email,
        locale: typeof locale === "string" ? locale : "et",
        // honeypot edastatakse muutmata (backend otsustab: täidetud → vaikne no-op)
        website: typeof website === "string" ? website : "",
      }),
    })
    const data = await r.json().catch(() => ({}))
    return NextResponse.json(data, { status: r.status })
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to connect to server" }, { status: 503 })
  }
}
