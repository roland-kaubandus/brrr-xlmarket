const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_KEY || "xlmarket2024_secure_key"
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

export async function searchProducts(options: SearchOptions): Promise<MeiliSearchResult> {
  const body: Record<string, unknown> = {
    q: options.q,
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
