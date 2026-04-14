const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL!
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY!
const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID!

const DEFAULT_TIMEOUT_MS = 3000

export async function medusaProxy(path: string, options?: RequestInit & { timeoutMs?: number }) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options || {}
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(`${MEDUSA_URL}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "x-publishable-api-key": API_KEY,
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

export { REGION_ID }
