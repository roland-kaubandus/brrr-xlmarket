import { NextRequest, NextResponse } from "next/server"
import { medusaProxy } from "@/lib/medusa-proxy"

// Üks-kliki loobumise sihtmärk (RFC 8058). Postiklient POST-ib List-Unsubscribe-Post päise peale.
// Token query-stringis. Idempotentne. Töötab alati (ka kogumis-lipu maas olles).
async function doUnsub(token: string) {
  return medusaProxy(`/store/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, {
    method: "POST",
    body: JSON.stringify({ token }),
  })
}

// POST — RFC 8058 One-Click (postikliendi automaatne). Tagastab 200 + lihtsa keha.
export async function POST(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || ""
  if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 })
  try {
    const r = await doUnsub(token)
    const data = await r.json().catch(() => ({}))
    return NextResponse.json({ ok: r.ok, ...data }, { status: r.ok ? 200 : r.status })
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to connect" }, { status: 503 })
  }
}

// GET — kui keegi avab lingi brauseris: täida loobumine ja suuna lokaliseeritud kinnituslehele.
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token") || ""
  const locale = /^[a-z]{2}$/.test(url.searchParams.get("locale") || "") ? url.searchParams.get("locale")! : "et"
  const dest = new URL(`/${locale}/uudiskiri/loobu`, url.origin)
  if (token) dest.searchParams.set("token", token)
  return NextResponse.redirect(dest, 302)
}
