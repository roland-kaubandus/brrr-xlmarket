import { NextRequest, NextResponse } from "next/server"
import { getProducts } from "@/lib/medusa"

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("product_id") || ""
  const categoryId = req.nextUrl.searchParams.get("category_id") || ""
  const q = req.nextUrl.searchParams.get("q") || ""

  const relatedQuery = categoryId
    ? { category_id: [categoryId] }
    : q
      ? { q }
      : {}

  const empty = { products: [], count: 0 }
  const safeFetch = (p: Promise<typeof empty>) => p.catch(() => empty)

  try {
    const [similarRes, koosRes, bestRes] = await Promise.all([
      safeFetch(getProducts({ limit: 12, ...relatedQuery })),
      safeFetch(getProducts({ limit: 5, offset: 12, ...relatedQuery })),
      categoryId
        ? safeFetch(getProducts({ limit: 6, category_id: [categoryId] }))
        : Promise.resolve(empty),
    ])

    const filter = (arr: any[]) => arr.filter((p: any) => p.id !== productId)

    return NextResponse.json({
      similar: filter(similarRes.products).slice(0, 10),
      koos: filter(koosRes.products).slice(0, 3),
      best: filter(bestRes.products).slice(0, 5),
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    })
  } catch {
    return NextResponse.json({ similar: [], koos: [], best: [] }, { status: 200 })
  }
}
