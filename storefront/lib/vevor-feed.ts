import fs from "fs"
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

function readFeedCache(): FeedCache | null {
  if (cachedFeed !== undefined) return cachedFeed

  const candidates = [
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "../backend/data/feeds/vevor-feed-cache.json"),
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "../data/feeds/vevor-feed-cache.json"),
  ]

  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(candidate, "utf-8")
      cachedFeed = JSON.parse(raw) as FeedCache
      return cachedFeed
    } catch {
      continue
    }
  }

  cachedFeed = null
  return cachedFeed
}

function normalizeLookup(value?: string | null) {
  return String(value || "").trim()
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
