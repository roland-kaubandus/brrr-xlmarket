import { readFile } from "node:fs/promises"
import path from "path"

export type VevorFeedEntry = {
  sku: string
  upc?: string | null
  title: string
  descriptionHtml?: string | null
  descriptionText?: string | null
  richDescriptionHtml?: string | null
  descriptionAd?: string | null
  link?: string | null
  country?: string | null
  condition?: string | null
  priceEur?: number | null
  availability?: string | null
  inventoryQuantity?: number | null
  weightKg?: number | null
  shippingWeightKg?: number | null
  image?: string | null
  originalImages?: string[]
  galleryImages?: string[]
  mainOriginalImage?: string | null
  brand?: string | null
  productType?: string | null
  sellingPoints?: string[]
  dimensions?: { high: number | null; wide: number | null; long: number | null; unit: string } | null
  attributes?: Array<{ name: string; value: string | null }> | null
  spu?: string | null
}

type FeedCache = {
  generatedAt: string
  count: number
  bySku: Record<string, VevorFeedEntry>
  byUpc: Record<string, VevorFeedEntry>
}

let cachedFeed: FeedCache | null | undefined
let feedLoadInflight: Promise<FeedCache | null> | null = null

const FEED_CACHE_TTL_MS = 10 * 60 * 1000 // 10 min
let feedCachedAt = 0

async function loadFeedCache(): Promise<FeedCache | null> {
  const candidates = [
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "../backend/data/feeds/vevor-feed-cache.json"),
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "../data/feeds/vevor-feed-cache.json"),
  ]

  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, "utf-8")
      return JSON.parse(raw) as FeedCache
    } catch {
      continue
    }
  }

  return null
}

async function readFeedCacheAsync(): Promise<FeedCache | null> {
  const now = Date.now()
  if (cachedFeed !== undefined && cachedFeed !== null && now - feedCachedAt < FEED_CACHE_TTL_MS) {
    return cachedFeed
  }

  if (feedLoadInflight) return feedLoadInflight

  feedLoadInflight = Promise.race([
    loadFeedCache(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
  ])
    .then((result) => {
      cachedFeed = result
      feedCachedAt = Date.now()
      feedLoadInflight = null
      return result
    })
    .catch(() => {
      feedLoadInflight = null
      return cachedFeed ?? null
    })

  return feedLoadInflight
}

// Sync wrapper kept for backward compat — returns cached data only, never blocks
function readFeedCache(): FeedCache | null {
  if (cachedFeed !== undefined) return cachedFeed
  // Trigger async load for next call
  readFeedCacheAsync()
  return null
}

function normalizeLookup(value?: string | null) {
  return String(value || "").trim()
}

export async function getVevorFeedEntryAsync(params: { vevorSku?: string | null; vevorUpc?: string | null }): Promise<VevorFeedEntry | null> {
  const feed = await readFeedCacheAsync()
  if (!feed) return null

  const sku = normalizeLookup(params.vevorSku)
  if (sku && feed.bySku[sku]) return feed.bySku[sku]

  const upc = normalizeLookup(params.vevorUpc)
  if (upc && feed.byUpc[upc]) return feed.byUpc[upc]

  return null
}

export function getVevorFeedEntry(params: { vevorSku?: string | null; vevorUpc?: string | null }): VevorFeedEntry | null {
  const feed = readFeedCache()
  if (!feed) return null

  const sku = normalizeLookup(params.vevorSku)
  if (sku && feed.bySku[sku]) return feed.bySku[sku]

  const upc = normalizeLookup(params.vevorUpc)
  if (upc && feed.byUpc[upc]) return feed.byUpc[upc]

  return null
}
