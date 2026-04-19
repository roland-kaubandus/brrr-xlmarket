import type { MeiliHit } from "./meilisearch"
import { getLocalizedTitle } from "./meilisearch"

export interface MappedProduct {
  id: string
  title: string
  handle: string
  description: string
  thumbnail: string | null
  images: Array<{ id: string; url: string }>
  variants: Array<{
    id: string
    title: string
    calculated_price: {
      calculated_amount: number
      original_amount: number
      currency_code: string
    }
  }>
  categories: Array<{ id: string; name: string; handle: string; parent_category_id: null }>
  created_at: string
  in_stock: boolean
}

export function mapMeiliHitToProduct(hit: MeiliHit, locale?: string): MappedProduct {
  const categories = hit.categories ?? []
  const categoryHandles = hit.category_handles ?? []
  const price = typeof hit.price === "number" ? hit.price : 0
  const createdAt = typeof hit.created_at === "number" ? hit.created_at : Math.floor(Date.now() / 1000)
  return {
    id: hit.id,
    title: getLocalizedTitle(hit, locale),
    handle: hit.handle,
    description: hit.description ?? "",
    thumbnail: hit.thumbnail ?? null,
    images: [],
    variants: [
      {
        id: hit.id + "_v",
        title: "Default",
        calculated_price: {
          calculated_amount: Math.round(price * 100),
          original_amount: Math.round(price * 100),
          currency_code: "eur",
        },
      },
    ],
    categories: categories.map((name: string, i: number) => ({
      id: `cat_${i}`,
      name,
      handle: categoryHandles[i] || "",
      parent_category_id: null,
    })),
    created_at: new Date(createdAt * 1000).toISOString(),
    in_stock: hit.in_stock ?? true,
  }
}
