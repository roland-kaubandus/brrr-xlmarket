import { NextRequest, NextResponse } from "next/server"
import { medusaProxy } from "@/lib/medusa-proxy"

// POST /api/newsletter/confirm — double opt-in kinnituse lõpetamine (JALUS, #2).
// AINULT POST (mitte GET): kinnitus on seisundimuutus → e-posti-skännerite GET-eellaadimine
// EI tohi automaatselt kinnitada (see lammutaks double opt-in'i mõtte — tõend, et INIMENE klõpsas).
// Kinnituslehe nupp POST-ib siia; token kirja lingist.
export async function POST(req: NextRequest) {
  let token = ""
  try {
    const body = (await req.json()) as { token?: unknown }
    if (typeof body.token === "string") token = body.token
  } catch {
    /* lubame ka query-tokeni allpool */
  }
  if (!token) token = new URL(req.url).searchParams.get("token") || ""
  if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 })

  try {
    const r = await medusaProxy("/store/newsletter/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
    const data = await r.json().catch(() => ({}))
    return NextResponse.json({ ok: r.ok, ...data }, { status: r.ok ? 200 : r.status })
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to connect" }, { status: 503 })
  }
}
