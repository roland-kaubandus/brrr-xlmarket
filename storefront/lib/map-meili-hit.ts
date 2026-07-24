import type { MeiliHit } from "./meilisearch"
import { getProductDescription, getProductTitle } from "./meilisearch"

export interface MappedProduct {
  id: string
  title: string
  handle: string
  description: string
  thumbnail: string | null
  hover_image: string | null
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

export function mapMeiliHitToProduct(hit: MeiliHit, locale: string = "en"): MappedProduct {
  const categories = hit.categories ?? []
  const categoryHandles = hit.category_handles ?? []
  const price = typeof hit.price === "number" ? hit.price : 0
  const createdAt = typeof hit.created_at === "number" ? hit.created_at : Math.floor(Date.now() / 1000)

  // ── OMNIBUS-VÄRAV (EL direktiiv 98/6/EÜ art 6a) ──────────────────────────────
  // Allahindlust (läbikriipsutatud hind + -% silt) TOHIB kuvada AINULT kui:
  //   (a) on tegelik soodushind (sale_price < price), JA
  //   (b) eksisteerib Omnibus-viitehind = 30 päeva madalaim (omnibus_ref_price),
  //       mille feed-pipeline arvutab price_history'st.
  // Kui viide puudub → EI mingit allahindlust (original = calculated). Nii ei saa
  // allahindluse UI vaikselt süttida ilma 30p-ajaloota (seadusevastane baashind).
  const salePrice = typeof (hit as { sale_price?: number }).sale_price === "number"
    ? (hit as { sale_price?: number }).sale_price! : null
  const omnibusRef = typeof (hit as { omnibus_ref_price?: number }).omnibus_ref_price === "number"
    ? (hit as { omnibus_ref_price?: number }).omnibus_ref_price! : null
  const omnibusValid = salePrice != null && omnibusRef != null && salePrice < omnibusRef
  const calculatedPrice = omnibusValid ? salePrice! : price
  // Läbikriipsutus = 30p-madalaim (Omnibus nõue), MITTE suvaline list-price.
  const originalPrice = omnibusValid ? omnibusRef! : calculatedPrice
  return {
    id: hit.id,
    title: getProductTitle(hit, locale),
    handle: hit.handle,
    description: getProductDescription(hit, locale),
    thumbnail: hit.thumbnail ?? null,
    hover_image: (hit as { hover_image?: string | null }).hover_image ?? null,
    images: [],
    variants: [
      {
        id: hit.id + "_v",
        title: "Default",
        calculated_price: {
          calculated_amount: Math.round(calculatedPrice * 100),
          original_amount: Math.round(originalPrice * 100),   // Omnibus-värav: = calculated kui 30p-viide puudub
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
