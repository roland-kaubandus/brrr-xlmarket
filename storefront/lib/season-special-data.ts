/**
 * season-special-data.ts — server-fetcher for the Festival Season Special
 * homepage band. Two star deals (waffle + ice cream) plus a row of 6
 * smaller outdoor-catering machines. All real Meili SKUs.
 */

import { searchProducts, getProductTitle } from "@/lib/meilisearch"

export interface SeasonItem {
  handle: string
  title: string
  price: number
  thumbnail: string | null
  shortName: string // hand-curated short label so the band reads cleanly
  caption: string  // one-line value prop, hand-written per slot
}

interface Slot {
  query: string
  shortName: string
  caption: string
}

// Star slots — large hero cards
const STAR_SLOTS: Slot[] = [
  {
    query: "waffle maker commercial",
    shortName: "Waffle Maker",
    caption: "Two rectangle plates, 2000 W, non-stick — 240 waffles an hour.",
  },
  {
    query: "soft ice cream machine commercial",
    shortName: "Soft-Serve Machine",
    caption: "2200 W vertical, three flavours, 25 L/h — break-even by Sunday.",
  },
]

// Side strip — smaller machines
const STRIP_SLOTS: Slot[] = [
  { query: "popcorn machine cart", shortName: "Popcorn Cart", caption: "850 W · 8-oz kettle · 48 servings/hr" },
  { query: "hot dog roller stainless", shortName: "Hot-Dog Grill", caption: "30 dogs · 11 rollers · stainless" },
  { query: "electric crepe maker double", shortName: "Crepe Maker", caption: "16″ double head · commercial" },
  { query: "commercial deep fryer 12L", shortName: "Deep Fryer", caption: "12 L · 5 kW · twin basket" },
  { query: "donut maker automatic", shortName: "Donut Machine", caption: "4 rows · automatic · counter unit" },
  { query: "orange juicer commercial", shortName: "Orange Juicer", caption: "120 W · automatic · stainless" },
]

async function fetchSlot(slot: Slot, locale: string): Promise<SeasonItem | null> {
  try {
    const result = await searchProducts({
      q: slot.query,
      limit: 1,
      offset: 0,
      filter: ["in_stock = true"],
    })
    const hit = result.hits?.[0]
    if (!hit || !hit.handle) return null
    return {
      handle: hit.handle,
      title: getProductTitle(hit, locale),
      price: hit.price ?? 0,
      thumbnail: hit.thumbnail ?? null,
      shortName: slot.shortName,
      caption: slot.caption,
    }
  } catch {
    return null
  }
}

export interface SeasonSpecialData {
  stars: SeasonItem[]
  strip: SeasonItem[]
}

export async function getSeasonSpecial(locale: string): Promise<SeasonSpecialData> {
  const [starsRaw, stripRaw] = await Promise.all([
    Promise.all(STAR_SLOTS.map((s) => fetchSlot(s, locale))),
    Promise.all(STRIP_SLOTS.map((s) => fetchSlot(s, locale))),
  ])
  return {
    stars: starsRaw.filter((x): x is SeasonItem => x !== null),
    strip: stripRaw.filter((x): x is SeasonItem => x !== null),
  }
}
