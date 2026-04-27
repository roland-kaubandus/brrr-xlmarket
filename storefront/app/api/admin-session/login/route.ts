import { NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE_OPTIONS, checkCredentials, signAdminToken } from "@/lib/admin-session"

export const dynamic = "force-dynamic"

interface LoginBody {
  email?: unknown
  password?: unknown
}

export async function POST(req: NextRequest) {
  let body: LoginBody
  try {
    body = (await req.json()) as LoginBody
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Missing credentials" }, { status: 400 })
  }

  const user = checkCredentials(email, password)
  if (!user) {
    // small constant-ish delay to slow brute-force attempts
    await new Promise((r) => setTimeout(r, 400))
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 })
  }

  const token = await signAdminToken(user.email)
  const res = NextResponse.json({ ok: true, email: user.email })
  res.cookies.set({ ...ADMIN_COOKIE_OPTIONS, value: token })
  return res
}
