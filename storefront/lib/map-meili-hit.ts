import type { MeiliHit } from "./meilisearch"
import { getLocalizedTitle } from "./meilisearch"

export function mapMeiliHitToProduct(hit: MeiliHit, locale: string) {
  return {
    id: hit.id,
    title: getLocalizedTitle(hit, locale),
    handle: hit.handle,
    description: hit.description,
    thumbnail: hit.thumbnail,
    images: [] as Array<{ id: string; url: string }>,
    variants: [
      {
        id: hit.id + "_v",
        title: "Default",
        calculated_price: {
          calculated_amount: Math.round(hit.price * 100),
          original_amount: Math.round(hit.price * 100),
          currency_code: "eur",
        },
      },
    ],
    categories: hit.categories.map((name: string, i: number) => ({
      id: `cat_${i}`,
      name,
      handle: hit.category_handles?.[i] || "",
      parent_category_id: null,
    })),
    created_at: new Date(hit.created_at * 1000).toISOString(),
  }
}
