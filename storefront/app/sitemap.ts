import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://xlmarket.store"
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL!
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY!
const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID!

async function medusaFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    headers: { "x-publishable-api-key": API_KEY },
  })
  if (!res.ok) throw new Error(`Medusa ${res.status}`)
  return res.json()
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const LOCALES = ["en", "et"]
  const STATIC_PAGES = [
    { path: "", changeFrequency: "daily" as const, priority: 1.0 },
    { path: "/kategooriad", changeFrequency: "daily" as const, priority: 0.8 },
    { path: "/meist", changeFrequency: "monthly" as const, priority: 0.3 },
    { path: "/kontakt", changeFrequency: "monthly" as const, priority: 0.3 },
    { path: "/tarne", changeFrequency: "monthly" as const, priority: 0.3 },
    { path: "/tagastamine", changeFrequency: "monthly" as const, priority: 0.3 },
    { path: "/tingimused", changeFrequency: "monthly" as const, priority: 0.3 },
    { path: "/privaatsus", changeFrequency: "monthly" as const, priority: 0.3 },
    { path: "/kupsised", changeFrequency: "monthly" as const, priority: 0.3 },
  ]

  const entries: MetadataRoute.Sitemap = []
  for (const locale of LOCALES) {
    for (const page of STATIC_PAGES) {
      entries.push({
        url: `${BASE_URL}/${locale}${page.path}`,
        lastModified: page.path === "" ? new Date() : undefined,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
      })
    }
  }

  try {
    // Categories (fetch in batches)
    let catOffset = 0
    const catLimit = 200
    let catHasMore = true
    while (catHasMore) {
      const catRes = await medusaFetch<{ product_categories: Array<{ handle: string }>; count: number }>(
        `/store/product-categories?limit=${catLimit}&offset=${catOffset}`
      )
      for (const cat of catRes.product_categories) {
        for (const locale of LOCALES) {
          entries.push({
            url: `${BASE_URL}/${locale}/kategooriad/${cat.handle}`,
            changeFrequency: "daily",
            priority: 0.7,
          })
        }
      }
      catOffset += catLimit
      catHasMore = catOffset < catRes.count
    }

    // Products (fetch in batches)
    let offset = 0
    const limit = 500
    let hasMore = true
    while (hasMore) {
      const prodRes = await medusaFetch<{ products: Array<{ handle: string; updated_at?: string }>; count: number }>(
        `/store/products?region_id=${REGION_ID}&limit=${limit}&offset=${offset}&fields=handle,updated_at`
      )
      for (const p of prodRes.products) {
        for (const locale of LOCALES) {
          entries.push({
            url: `${BASE_URL}/${locale}/toode/${p.handle}`,
            lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
            changeFrequency: "weekly",
            priority: 0.6,
          })
        }
      }
      offset += limit
      hasMore = offset < prodRes.count
    }
  } catch {
    // If Medusa is unavailable, return static pages only
  }

  return entries
}
