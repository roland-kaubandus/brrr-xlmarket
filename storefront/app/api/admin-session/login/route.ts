import { NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE_OPTIONS, checkCredentials, signAdminToken } from "@/lib/admin-session"
import { getMissingAdminEnv } from "@/lib/admin-env"

export const dynamic = "force-dynamic"

interface LoginBody {
  email?: unknown
  password?: unknown
}

export async function POST(req: NextRequest) {
  // FAIL-LOUD: puuduvad env-id → selge 503 koos nimedega (mitte 500 signAdminToken'ist).
  const missingEnv = getMissingAdminEnv()
  if (missingEnv.length) {
    return NextResponse.json(
      { ok: false, error: `Serveri seadistus puudulik. Puuduvad env-id: ${missingEnv.join(", ")}` },
      { status: 503 }
    )
  }

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
