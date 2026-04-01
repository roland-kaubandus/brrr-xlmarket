import Link from "next/link"
import { searchProducts } from "@/lib/meilisearch"
import ProductCard from "@/components/ProductCard"
import { getProducts } from "@/lib/medusa"
import CategoryFilters from "@/components/CategoryFilters"

export const revalidate = 0

type Props = {
  searchParams: Promise<{ q?: string; leht?: string; sort?: string; min?: string; max?: string }>
}

export async function generateMetadata({ searchParams }: Props) {
  const { q } = await searchParams
  const title = q ? `"${q}" — Otsing — XLMARKET` : "Otsing — XLMARKET"
  return {
    title,
    description: q ? `Otsi "${q}" XLMARKET toodete hulgast.` : "Otsi XLMARKET toodete hulgast.",
    robots: { index: false, follow: true },
  }
}

const ITEMS_PER_PAGE = 24

const SORT_MAP: Record<string, string[]> = {
  odavamad: ["price:asc"],
  kallimad: ["price:desc"],
  uusimad: ["created_at:desc"],
}

export default async function SearchPage({ searchParams, params }: Props & { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { q, leht, sort, min, max } = await searchParams
  const query = q?.trim() || ""
  const page = Math.max(1, parseInt(leht || "1", 10) || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE
  const currentSort = sort || ""

  let products: any[] = []
  let totalHits = 0
  let processingTimeMs = 0
  let usedMeili = false
  let facetStats: Record<string, { min: number; max: number }> | undefined

  if (query) {
    try {
      const filters: string[] = []
      if (min) filters.push(`price >= ${parseFloat(min)}`)
      if (max) filters.push(`price <= ${parseFloat(max)}`)

      const meiliResult = await searchProducts({
        q: query,
        limit: ITEMS_PER_PAGE,
        offset,
        sort: SORT_MAP[currentSort] || undefined,
        filter: filters.length > 0 ? filters : undefined,
        facets: ["categories", "price"],
      })
      totalHits = meiliResult.totalHits || meiliResult.estimatedTotalHits || 0
      processingTimeMs = meiliResult.processingTimeMs
      facetStats = meiliResult.facetStats
      usedMeili = true

      // Map MeiliSearch hits to Medusa Product format for ProductCard
      products = meiliResult.hits.map(hit => ({
        id: hit.id,
        title: hit.title,
        handle: hit.handle,
        description: hit.description,
        thumbnail: hit.thumbnail,
        images: [],
        variants: [{
          id: hit.id + "_v",
          title: "Default",
          calculated_price: {
            calculated_amount: Math.round(hit.price * 100),
            original_amount: Math.round(hit.price * 100),
            currency_code: "eur",
          },
        }],
        categories: hit.categories.map((name: string, i: number) => ({
          id: `cat_${i}`,
          name,
          handle: hit.category_handles?.[i] || "",
          parent_category_id: null,
        })),
        created_at: new Date(hit.created_at * 1000).toISOString(),
        _highlightTitle: hit._formatted?.title,
      }))
    } catch (e) {
      // Fallback to Medusa API
      const res = await getProducts({ q: query, limit: ITEMS_PER_PAGE, offset })
      products = res.products
      totalHits = res.count
    }
  }

  const totalPages = Math.ceil(totalHits / ITEMS_PER_PAGE)
  const priceRange = facetStats?.price
    ? {
        min: Math.floor(facetStats.price.min),
        max: Math.ceil(facetStats.price.max),
      }
    : undefined

  function pageUrl(targetPage: number) {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (targetPage > 1) params.set("leht", String(targetPage))
    if (currentSort) params.set("sort", currentSort)
    if (min) params.set("min", min)
    if (max) params.set("max", max)
    const qs = params.toString()
    return qs ? `/${locale}/otsing?${qs}` : `/${locale}/otsing`
  }

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <div className="flex items-baseline justify-between mb-[24px]">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[4px]">Otsing</h1>
          {query && (
            <p className="text-[14px] font-[family-name:var(--font-jakarta)] text-[#999999]">
              <span className="font-[600] text-[#1A1A1A]">&quot;{query}&quot;</span>
              {" — "}
              {totalHits.toLocaleString("et-EE")} tulemust
              {priceRange && totalHits > 0 && (
                <span className="text-[12px] text-[#CCCCCC] ml-[8px]">
                  ({priceRange.min}€ – {priceRange.max}€)
                </span>
              )}
              {usedMeili && (
                <span className="text-[12px] text-[#CCCCCC] ml-[8px]">({processingTimeMs}ms)</span>
              )}
            </p>
          )}
        </div>
      </div>

      {!query && (
        <p className="text-[14px] font-[family-name:var(--font-jakarta)] text-[#999999] py-[48px] text-center">
          Sisesta otsingusõna päisesse ja vajuta &quot;Otsi&quot;.
        </p>
      )}

      {query && products.length === 0 && (
        <div className="text-center py-[48px]">
          <p className="text-[14px] font-[family-name:var(--font-jakarta)] text-[#999999] mb-[16px]">
            Päringuga &quot;{query}&quot; ei leitud ühtegi toodet.
          </p>
          <Link
            href={`/${locale}/kategooriad`}
            className="text-[#E8650A] hover:text-[#CF5A08] font-[500] font-[family-name:var(--font-poppins)] underline underline-offset-2"
          >
            Sirvi kategooriaid &rarr;
          </Link>
        </div>
      )}

      {query && totalHits > 0 && (
        <CategoryFilters
          currentSort={currentSort}
          currentMin={min}
          currentMax={max}
          basePath={`/${locale}/otsing`}
          totalProducts={totalHits}
          preservedParams={{ q: query }}
        />
      )}

      {products.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[16px]">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex justify-center items-center gap-[8px] mt-[40px]">
              {page > 1 && (
                <Link
                  href={pageUrl(page - 1)}
                  className="px-[16px] py-[8px] border border-[#E8E8E8] hover:border-[#E8650A] text-[13px] font-[family-name:var(--font-jakarta)] text-[#555555] transition-colors"
                >
                  &larr; Eelmine
                </Link>
              )}
              <span className="text-[13px] font-[family-name:var(--font-jakarta)] text-[#999999] px-[8px]">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={pageUrl(page + 1)}
                  className="px-[16px] py-[8px] border border-[#E8E8E8] hover:border-[#E8650A] text-[13px] font-[family-name:var(--font-jakarta)] text-[#555555] transition-colors"
                >
                  Järgmine &rarr;
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  )
}
