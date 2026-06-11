const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL!
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY!
const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID!

// STOPGAP (2026-06-06): medusa cart-workflow stallib vahelduvalt 5-12s (async-stall,
// vt järgmise sessiooni profiling). 3s timeout abort'is → "Failed to create cart".
// Tõstetud 12s-ni et stall-ist hoolimata päring õnnestuks. Taasta ~3-5s kui root-cause lahendatud.
const DEFAULT_TIMEOUT_MS = 12000

export async function medusaProxy(path: string, options?: RequestInit & { timeoutMs?: number }) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options || {}
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const r = await fetch(`${MEDUSA_URL}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "x-publishable-api-key": API_KEY,
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    })
    // TEMP DEBUG (2026-06-11): Traefik-vs-localhost medusaProxy erinevus (eemalda peale juurt)
    console.log(`[MPROXY] ${(fetchOptions.method as string) || "GET"} ${path} url=${MEDUSA_URL} key=${(API_KEY || "").slice(0, 12)} → ${r.status}`)
    return r
  } finally {
    clearTimeout(timer)
  }
}

export { REGION_ID }
