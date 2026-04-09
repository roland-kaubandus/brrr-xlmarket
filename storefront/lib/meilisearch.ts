const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_KEY || "MEILI_LEGACY_KEY_REDACTED"
const INDEX = "products"

export type MeiliHit = {
  id: string
  title: string
  handle: string
  description: string
  thumbnail: string
  sku: string
  price: number
  categories: string[]
  category_handles: string[]
  in_stock: boolean
  translated: boolean
  created_at: number
  _formatted?: {
    title?: string
    description?: string
    [key: string]: unknown
  }
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

  const res = await fetch(`${MEILI_HOST}/indexes/${INDEX}/search`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MEILI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`MeiliSearch error: ${res.status}`)
  }

  return res.json()
}
