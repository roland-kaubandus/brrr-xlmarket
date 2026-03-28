const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "http://127.0.0.1:9001"
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY || "pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3"
const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID || "reg_01KMRXWSNXSYE4530A3K2BK86W"

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
