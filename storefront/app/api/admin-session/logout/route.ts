import { NextResponse } from "next/server"
import { ADMIN_COOKIE, ADMIN_COOKIE_OPTIONS } from "@/lib/admin-session"

export const dynamic = "force-dynamic"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set({ ...ADMIN_COOKIE_OPTIONS, name: ADMIN_COOKIE, value: "", maxAge: 0 })
  return res
}
