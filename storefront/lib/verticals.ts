/**
 * storefront/lib/verticals.ts — SSoT-derived vertical metadata + product fetch.
 *
 * The source of truth is backend/src/data/taxonomy.yaml `verticals:` section,
 * compiled into storefront/lib/verticals.generated.json by
 * scripts/gen-verticals.mjs. Never edit the JSON by hand.
 */

import rawData from "./verticals.generated.json"
import {
  escapeMeiliFilterValue,
  getLocalizedTitle,
  type MeiliHit,
} from "./meilisearch"

const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_KEY || "MEILI_LEGACY_KEY_REDACTED"
const INDEX = "products"
const FETCH_TIMEOUT_MS = 2500

export type VerticalMode = "alustajale" | "arikliendile" | "hooldus"

export interface KitItem {
  label_et: string
  label_en: string
  l2_slug: string | null
  l3_slug: string | null
}

export interface Kit {
  tier: "starter" | "pro" | "enterprise"
  name_et: string
  name_en: string
  price_from: number
  items: KitItem[]
}

export interface FaqEntry {
  q_et: string
  a_et: string
  q_en: string | null
  a_en: string | null
}

export interface VerticalMeta {
  slug: string
  mode: VerticalMode
  name_et: string
  name_en: string
  tagline_et: string
  tagline_en: string
  description_et: string
  description_en: string
  meta_title_et: string | null
  meta_description_et: string | null
  hero_img: string | null
  hero_gradient: string | null
  emtak_codes: string[]
  include_nodes: string[]
  exclude_nodes: string[]
  kits: Kit[]
  faq: FaqEntry[]
  delivery_note_et: string | null
  delivery_note_en: string | null
  financing_note_et: string | null
  financing_note_en: string | null
}

interface GeneratedData {
  generated_at: string
  verticals: VerticalMeta[]
}

const data = rawData as GeneratedData
const byMode: Record<string, VerticalMeta[]> = {}
for (const v of data.verticals) {
  ;(byMode[v.mode] ??= []).push(v)
}

export function listVerticalsByMode(mode: VerticalMode): VerticalMeta[] {
  return byMode[mode] || []
}

export function getVerticalBySlug(
  mode: VerticalMode,
  slug: string,
): VerticalMeta | null {
  return byMode[mode]?.find((v) => v.slug === slug) || null
}

export function allVerticalSlugs(): Array<{ mode: VerticalMode; slug: string }> {
  return data.verticals.map((v) => ({ mode: v.mode as VerticalMode, slug: v.slug }))
}

/** Localised display strings (ET default, EN fallback to ET). */
export function localisedVertical(v: VerticalMeta, locale: string) {
  const isEn = locale === "en"
  return {
    name: isEn ? v.name_en || v.name_et : v.name_et,
    tagline: isEn ? v.tagline_en || v.tagline_et : v.tagline_et,
    description: isEn ? v.description_en || v.description_et : v.description_et,
    deliveryNote: isEn ? v.delivery_note_en || v.delivery_note_et : v.delivery_note_et,
    financingNote: isEn ? v.financing_note_en || v.financing_note_et : v.financing_note_et,
  }
}

/** Products whose Meili document has vertical_slugs = "${mode}:${slug}" */
export async function getVerticalProducts(
  mode: VerticalMode,
  slug: string,
  opts: { limit?: number; locale?: string } = {},
): Promise<MeiliHit[]> {
  const { limit = 24 } = opts
  const verticalSlug = `${mode}:${slug}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const res = await fetch(`${MEILI_HOST}/indexes/${INDEX}/search`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${MEILI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: "",
        limit,
        filter: [
          `vertical_slugs = "${escapeMeiliFilterValue(verticalSlug)}"`,
          "in_stock = true",
        ],
        sort: ["created_at:desc"],
      }),
      next: { revalidate: 3600 },
    }).finally(() => clearTimeout(timeout))

    if (!res.ok) return []
    const json = await res.json()
    return (json.hits || []) as MeiliHit[]
  } catch {
    return []
  }
}

/**
 * Fetch representative products per kit item using its l2/l3_slug.
 * Returns up to one product per kit item so the storefront can render
 * a concrete "starter kit" card with real prices/thumbnails.
 */
export async function getKitItemProducts(
  kit: Kit,
  locale: string,
): Promise<Array<KitItem & { product?: MeiliHit; displayTitle: string }>> {
  const results: Array<KitItem & { product?: MeiliHit; displayTitle: string }> = []

  for (const item of kit.items) {
    const slug = item.l3_slug || item.l2_slug
    if (!slug) {
      results.push({
        ...item,
        displayTitle: locale === "en" ? item.label_en : item.label_et,
      })
      continue
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      const res = await fetch(`${MEILI_HOST}/indexes/${INDEX}/search`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${MEILI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: "",
          limit: 1,
          filter: [
            `category_handles = "${escapeMeiliFilterValue(slug)}"`,
            "in_stock = true",
          ],
          sort: ["price:asc"],
        }),
        next: { revalidate: 3600 },
      }).finally(() => clearTimeout(timeout))

      let product: MeiliHit | undefined
      if (res.ok) {
        const json = await res.json()
        product = json.hits?.[0]
      }

      results.push({
        ...item,
        product,
        displayTitle: product
          ? getLocalizedTitle(product, locale)
          : locale === "en"
            ? item.label_en
            : item.label_et,
      })
    } catch {
      results.push({
        ...item,
        displayTitle: locale === "en" ? item.label_en : item.label_et,
      })
    }
  }

  return results
}
