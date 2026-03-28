const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL!
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY!
const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID!

export async function medusaProxy(path: string, options?: RequestInit) {
  return fetch(`${MEDUSA_URL}${path}`, {
    ...options,
    headers: {
      "x-publishable-api-key": API_KEY,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })
}

export { REGION_ID }
