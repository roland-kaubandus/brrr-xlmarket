import { NextRequest, NextResponse } from "next/server"
import { readAdminSession } from "@/lib/admin-session"
import { getCategoryByHandle } from "@/lib/medusa"

export const dynamic = "force-dynamic"

// GET /api/admin/category-id?handle=foo  →  { id: "pcat_..." }  (admin-only)
export async function GET(req: NextRequest) {
  const session = await readAdminSession()
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const handle = req.nextUrl.searchParams.get("handle")
  if (!handle || !/^[a-z0-9-]+$/.test(handle)) {
    return NextResponse.json({ ok: false, error: "Invalid handle" }, { status: 400 })
  }
  const cat = await getCategoryByHandle(handle)
  if (!cat) {
    return NextResponse.json({ ok: false, error: "Category not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true, id: cat.id, handle: cat.handle, name: cat.name })
}
