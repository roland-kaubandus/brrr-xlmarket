import "server-only"
import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"

export type AdminSession = { email: string; iat?: number; exp?: number }

export const ADMIN_COOKIE = "xlm_admin_session"
const MAX_AGE_S = 60 * 60 * 24 * 7

function getSecret(): Uint8Array {
  const raw = process.env.ADMIN_SESSION_SECRET
  if (!raw || raw.length < 24) {
    throw new Error("ADMIN_SESSION_SECRET missing or too short (need ≥24 chars)")
  }
  return new TextEncoder().encode(raw)
}

export async function signAdminToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(getSecret())
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (typeof payload.email !== "string") return null
    return { email: payload.email, iat: payload.iat, exp: payload.exp }
  } catch {
    return null
  }
}

export async function readAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!token) return null
  return verifyAdminToken(token)
}

export const ADMIN_COOKIE_OPTIONS = {
  name: ADMIN_COOKIE,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_S,
}

interface AdminUser {
  email: string
  password: string
}

export function getAdminUsers(): AdminUser[] {
  const users: AdminUser[] = []
  const ristoEmail = process.env.RISTO_ADMIN_EMAIL
  const ristoPass = process.env.RISTO_ADMIN_PASS
  if (ristoEmail && ristoPass) users.push({ email: ristoEmail, password: ristoPass })
  const tarmoEmail = process.env.TARMO_ADMIN_EMAIL
  const tarmoPass = process.env.TARMO_ADMIN_PASS
  if (tarmoEmail && tarmoPass) users.push({ email: tarmoEmail, password: tarmoPass })
  return users
}

export function checkCredentials(email: string, password: string): AdminUser | null {
  const users = getAdminUsers()
  const norm = email.trim().toLowerCase()
  for (const u of users) {
    if (u.email.toLowerCase() === norm && u.password === password) return u
  }
  return null
}
