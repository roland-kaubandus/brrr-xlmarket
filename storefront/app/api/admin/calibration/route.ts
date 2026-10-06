/**
 * /api/admin/calibration — storefront proxy → Medusa backend /admin/calibration.
 *
 * Storefront'il pole otse-DB ligipääsu (pole `pg`), seega salvestus elab backend
 * Medusa route'is. Proxy: (1) gate'ib storefront admin-cookie'ga (readAdminSession),
 * (2) edastab medusaAdminFetch'iga (backend admin token). Sama kahe-kihiline muster
 * mis /api/admin/review-bucket.
 *
 * GET  ?kind=synonym&seed=xlm  → selle hindaja varem-salvestatud hinnangud (restore)
 * POST                         → salvesta üks hinnang (upsert)
 */

import { NextRequest, NextResponse } from "next/server"
import { readAdminSession } from "@/lib/admin-session"
import { medusaAdminFetch } from "@/lib/medusa-admin"
import { getMissingAdminEnv } from "@/lib/admin-env"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function envGuard(): NextResponse | null {
  const missing = getMissingAdminEnv()
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Serveri seadistus puudulik. Puuduvad env-id: ${missing.join(", ")}` },
      { status: 503 }
    )
  }
  return null
}

export async function GET(req: NextRequest) {
  const envErr = envGuard()
  if (envErr) return envErr
  const session = await readAdminSession()
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    const kind = req.nextUrl.searchParams.get("kind") || ""
    const seed = req.nextUrl.searchParams.get("seed") || "xlm"
    const data = await medusaAdminFetch(
      `/admin/calibration?kind=${encodeURIComponent(kind)}&seed=${encodeURIComponent(seed)}`,
      { cache: "no-store" }
    )
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    )
  }
}

export async function POST(req: NextRequest) {
  const envErr = envGuard()
  if (envErr) return envErr
  const session = await readAdminSession()
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  try {
    const result = await medusaAdminFetch("/admin/calibration", {
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
