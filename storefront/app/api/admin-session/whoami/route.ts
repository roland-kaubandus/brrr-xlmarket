import { NextResponse } from "next/server"
import { readAdminSession } from "@/lib/admin-session"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await readAdminSession()
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  return NextResponse.json({ ok: true, email: session.email })
}
