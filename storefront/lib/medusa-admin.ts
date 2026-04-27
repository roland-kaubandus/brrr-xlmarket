import "server-only"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9001"
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

interface CachedToken {
  token: string
  expiresAt: number
}

let cached: CachedToken | null = null
let pending: Promise<string> | null = null
const TTL_MS = 25 * 60 * 1000 // refresh slightly before Medusa's 30-min expiry

async function fetchFreshToken(): Promise<string> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("MEDUSA_ADMIN_EMAIL or MEDUSA_ADMIN_PASSWORD missing")
  }
  const res = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Medusa auth failed: ${res.status} ${text.slice(0, 200)}`)
  }
  const data = (await res.json()) as { token?: string }
  if (!data.token) throw new Error("Medusa auth: missing token in response")
  return data.token
}

async function getAdminToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token
  if (pending) return pending
  pending = fetchFreshToken()
    .then((token) => {
      cached = { token, expiresAt: Date.now() + TTL_MS }
      return token
    })
    .finally(() => {
      pending = null
    })
  return pending
}

export interface AdminFetchInit extends Omit<RequestInit, "body"> {
  body?: unknown
}

export async function medusaAdminFetch<T = unknown>(
  path: string,
  init: AdminFetchInit = {}
): Promise<T> {
  const token = await getAdminToken()
  const { body, headers, ...rest } = init
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...rest,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(headers as Record<string, string> | undefined),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  })
  if (res.status === 401 || res.status === 403) {
    // token may have expired early — invalidate and try once more
    cached = null
    const fresh = await getAdminToken()
    const retry = await fetch(`${BACKEND_URL}${path}`, {
      ...rest,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${fresh}`,
        ...(headers as Record<string, string> | undefined),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    })
    if (!retry.ok) {
      const text = await retry.text().catch(() => "")
      throw new Error(`Medusa admin ${rest.method ?? "GET"} ${path} failed: ${retry.status} ${text.slice(0, 200)}`)
    }
    return (await retry.json()) as T
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Medusa admin ${rest.method ?? "GET"} ${path} failed: ${res.status} ${text.slice(0, 200)}`)
  }
  return (await res.json()) as T
}
