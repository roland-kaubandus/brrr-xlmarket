/**
 * /api/admin/review-bucket — storefront proxy → Medusa backend /admin/review-bucket.
 *
 * Storefront'il pole otse-DB ligipääsu (pole `pg`), seega kogu DB-töö elab backend
 * Medusa route'is. See proxy: (1) gate'ib storefront admin-cookie'ga (readAdminSession),
 * (2) edastab medusaAdminFetch'iga (backend admin token). Kaks-kihiline auth — sama muster
 * mis ülejäänud /api/admin/* (homepage-overrides jne).
 *
 * GET  → klastrid + DUP-plokid + otsuste-logi
 * POST → otsus (assign_existing | create_l3 | quarantine | reject | undo)
 */

import { NextRequest, NextResponse } from "next/server"
import { readAdminSession } from "@/lib/admin-session"
import { medusaAdminFetch } from "@/lib/medusa-admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = await readAdminSession()
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    // 2a — "muu olemas-L3" otsing edastatakse backend'ile
    const search = req.nextUrl.searchParams.get("search")
    const path = search
      ? `/admin/review-bucket?search=${encodeURIComponent(search)}`
      : "/admin/review-bucket"
    const data = await medusaAdminFetch(path, { cache: "no-store" })
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    )
  }
}

const ALLOWED = new Set(["assign_existing", "create_l3", "quarantine", "reject", "undo"])

export async function POST(req: NextRequest) {
  const session = await readAdminSession()
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }
  if (!ALLOWED.has(body?.action)) {
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 })
  }

  try {
    const result = await medusaAdminFetch("/admin/review-bucket", {
      method: "POST",
      body,
      cache: "no-store",
    })
    return NextResponse.json({ ok: true, actor: session.email, result })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    )
  }
}
