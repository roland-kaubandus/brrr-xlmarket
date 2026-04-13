import { getCategories, type ProductCategory } from "./medusa"

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 min

let cached: ProductCategory[] | null = null
let cachedAt = 0
let inflight: Promise<ProductCategory[]> | null = null

/**
 * Returns all categories from a shared in-memory cache.
 * Deduplicates concurrent requests so only one Medusa fetch runs at a time.
 */
export async function getCategoriesCached(): Promise<ProductCategory[]> {
  const now = Date.now()
  if (cached && now - cachedAt < CACHE_TTL_MS) {
    return cached
  }

  if (inflight) return inflight

  inflight = getCategories()
    .then((cats) => {
      cached = cats
      cachedAt = Date.now()
      inflight = null
      return cats
    })
    .catch((err) => {
      inflight = null
      if (cached) return cached // stale fallback
      throw err
    })

  return inflight
}
