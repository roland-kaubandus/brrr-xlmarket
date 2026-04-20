const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_KEY || ""
const INDEX = "products"
const FETCH_TIMEOUT_MS = 2000

export interface MeiliTaxonomy {
  l1_slug?: string | null
  l2_slug?: string | null
  l3_slug?: string | null
  ancestors?: string[]
}

export type MeiliHit = {
  id: string
  title: string      // originaal EN (display fallback)
  title_en?: string   // otsinguindeks EN
  title_et?: string   // otsinguindeks ET
  handle: string
  description?: string
  description_en?: string
  description_et?: string
  thumbnail?: string | null
  sku?: string
  price?: number
  // Optional because Meili may return document before full schema backfill,
  // or a newly-rotated admin key may reset index settings. Every consumer
  // MUST guard with `?? []` or optional chaining. See audit 2026-04-20 C5.
  categories?: string[] | null
  category_handles?: string[] | null
  spec_filters?: string[]
  filter_tokens?: string[]
  in_stock?: boolean
  translated?: boolean
  created_at?: number
  // Faas 5c — taxonomy v3 + ranking fields.
  // All optional because Meili may not yet expose them for every document
  // while the re-index backfill is in flight (spec §6.3 compat window).
  taxonomy?: MeiliTaxonomy
  vertical_slugs?: string[]
  brand?: string
  discount_pct?: number
  popularity?: number
  _formatted?: {
    title?: string
    title_et?: string
    title_en?: string
    description?: string
    description_et?: string
    [key: string]: unknown
  }
}

export function getProductTitle(hit: MeiliHit): string {
  return hit.title || hit.title_en || ''
}

export function getProductDescription(hit: MeiliHit): string {
  return hit.description || hit.description_en || ''
}

/** Escape a value for safe inclusion in a MeiliSearch filter string */
export function escapeMeiliFilterValue(v: string): string {
  return String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

/** Whitelist-validate a handle-like token (alnum + dash + underscore). */
export function isSafeHandleToken(v: string): boolean {
  return typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,127}$/i.test(v)
}

export type MeiliSearchResult = {
  hits: MeiliHit[]
  query: string
  processingTimeMs: number
  estimatedTotalHits?: number
  totalHits?: number
  facetDistribution?: Record<string, Record<string, number>>
  facetStats?: Record<string, { min: number; max: number }>
}

export type SearchOptions = {
  q: string
  limit?: number
  offset?: number
  sort?: string[]
  filter?: string | string[]
  facets?: string[]
  attributesToHighlight?: string[]
  highlightPreTag?: string
  highlightPostTag?: string
}

// Split compound words that users commonly type without spaces
function expandCompoundWords(q: string): string {
  // Match camelCase or long lowercase words that look like compounds
  const compounds: Record<string, string> = {
    powertools: "power tools", powertool: "power tool",
    drillpress: "drill press", heatgun: "heat gun",
    aircompressor: "air compressor", pressurewasher: "pressure washer",
    meatgrinder: "meat grinder", tablesaw: "table saw",
    bandsaw: "band saw", poolpump: "pool pump",
    waterpump: "water pump", gardenhose: "garden hose",
    solarpanel: "solar panel", lawnmower: "lawn mower",
    icemaker: "ice maker", boatcover: "boat cover",
    workbench: "work bench", snowblower: "snow blower",
    chestfreezer: "chest freezer", woodlathe: "wood lathe",
    metallathe: "metal lathe", weldinghelmets: "welding helmets",
    weldinghelmet: "welding helmet", anglegrinder: "angle grinder",
    chainsaws: "chain saws", chainsaw: "chain saw",
    floorjack: "floor jack", carjack: "car jack",
  }
  return q.split(/\s+/).map(w => compounds[w.toLowerCase()] || w).join(" ")
}

/** Look up a single product by handle to get localized title/description */
export async function getMeiliProductByHandle(handle: string): Promise<MeiliHit | null> {
  if (!isSafeHandleToken(handle)) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(`${MEILI_HOST}/indexes/${INDEX}/search`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${MEILI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: "", limit: 1, filter: [`handle = "${escapeMeiliFilterValue(handle)}"`] }),
      next: { revalidate: 300 },
    }).finally(() => clearTimeout(timeout))
    if (!res.ok) {
      console.error(`[getMeiliProductByHandle] Meili ${res.status} for handle="${handle}"`)
      return null
    }
    const data = await res.json()
    return data.hits?.[0] || null
  } catch (err) {
    console.error(`[getMeiliProductByHandle] fetch failed for handle="${handle}":`, err instanceof Error ? err.message : err)
    return null
  }
}

export async function searchProducts(options: SearchOptions): Promise<MeiliSearchResult> {
  const body: Record<string, unknown> = {
    q: expandCompoundWords(options.q),
    limit: options.limit || 24,
    offset: options.offset || 0,
    attributesToHighlight: options.attributesToHighlight || ["title"],
    highlightPreTag: options.highlightPreTag || "<mark>",
    highlightPostTag: options.highlightPostTag || "</mark>",
  }

  if (options.sort?.length) body.sort = options.sort
  if (options.filter) body.filter = options.filter
  if (options.facets?.length) body.facets = options.facets

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  const res = await fetch(`${MEILI_HOST}/indexes/${INDEX}/search`, {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Authorization": `Bearer ${MEILI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    next: { revalidate: 60 }, // cache 1 min — MeiliSearch results don't change per-second
  }).finally(() => clearTimeout(timeout))

  if (!res.ok) {
    throw new Error(`MeiliSearch error: ${res.status}`)
  }

  return res.json()
}
