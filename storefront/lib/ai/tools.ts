import { searchProducts, isSafeHandleToken, escapeMeiliFilterValue, type MeiliHit } from "@/lib/meilisearch"

export type ProductResult = {
  handle: string
  title: string
  price: number
  thumbnail: string
  categories: string[]
}

const SORT_MAP: Record<string, string[]> = {
  price_asc: ["price:asc"],
  price_desc: ["price:desc"],
  newest: ["created_at:desc"],
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

export async function toolSearchProducts(args: {
  query: string
  category?: string
  limit?: number
  sort?: string
}): Promise<ProductResult[]> {
  const limit = Math.min(args.limit ?? 6, 10)
  const sort = args.sort ? SORT_MAP[args.sort] : undefined
  const filter = args.category && isSafeHandleToken(args.category)
    ? `category_handles = "${escapeMeiliFilterValue(args.category)}"`
    : undefined

  const result = await searchProducts({
    q: args.query,
    limit,
    ...(sort ? { sort } : {}),
    ...(filter ? { filter } : {}),
  })

  return result.hits.map((hit: MeiliHit): ProductResult => ({
    handle: hit.handle,
    title: hit.title_en || hit.title,
    price: hit.price,
    thumbnail: hit.thumbnail,
    categories: hit.categories,
  }))
}

export async function toolGetProductDetails(args: {
  handle: string
}): Promise<Record<string, unknown> | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3030"

  try {
    const res = await fetch(
      `${baseUrl}/api/product/${encodeURIComponent(args.handle)}?locale=et`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!res.ok) return null

    const data = await res.json() as Record<string, unknown>

    const rawDescription = typeof data.mainDescriptionHtml === "string"
      ? data.mainDescriptionHtml
      : ""
    const mainDescription = stripHtml(rawDescription).substring(0, 1000)

    return {
      title: data.localizedTitle,
      price: data.priceFormatted,
      priceAmount: data.priceAmount,
      specs: data.specs,
      sellingPoints: data.sellingPoints,
      categoryName: data.categoryName,
      mainDescription,
    }
  } catch {
    return null
  }
}
