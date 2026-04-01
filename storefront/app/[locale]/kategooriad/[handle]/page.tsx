import Link from "next/link"
import { getCategoryByHandle, getProducts, Product } from "@/lib/medusa"
import { searchProducts } from "@/lib/meilisearch"
import ProductCard from "@/components/ProductCard"
import CategoryFilters from "@/components/CategoryFilters"
import { notFound } from "next/navigation"

export const revalidate = 300

type Props = {
  params: Promise<{ handle: string; locale: string }>
  searchParams: Promise<{ leht?: string; sort?: string; min?: string; max?: string; q?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { handle, locale } = await params
  const category = await getCategoryByHandle(handle)
  if (!category) return { title: "Kategooria — XLMARKET" }
  const desc = `${category.name} tooted soodsa hinnaga. Kiire tarne Eestis.`
  return {
    title: `${category.name} — XLMARKET`,
    description: desc,
    openGraph: { title: `${category.name} — XLMARKET`, description: desc, type: "website" },
  }
}

const ITEMS_PER_PAGE = 24

const SORT_MAP: Record<string, string[]> = {
  odavamad: ["price:asc"],
  kallimad: ["price:desc"],
  uusimad: ["created_at:desc"],
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { handle, locale } = await params
  const { leht, sort, min, max, q } = await searchParams

  const category = await getCategoryByHandle(handle)
  if (!category) notFound()

  const page = Math.max(1, parseInt(leht || "1", 10) || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE
  const currentSort = sort || ""

  let products: any[] = []
  let totalCount = 0
  let processingTimeMs = 0
  let usedMeili = false
  let facetDistribution: Record<string, Record<string, number>> | undefined
  let facetStats: Record<string, { min: number; max: number }> | undefined

  try {
    // Build MeiliSearch filter
    const filters: string[] = [`category_handles = "${handle}"`]
    if (min) filters.push(`price >= ${parseFloat(min)}`)
    if (max) filters.push(`price <= ${parseFloat(max)}`)

    const meiliResult = await searchProducts({
      q: q || "",
      limit: ITEMS_PER_PAGE,
      offset,
      sort: SORT_MAP[currentSort] || undefined,
      filter: filters,
      facets: ["categories", "price"],
    })

    totalCount = meiliResult.totalHits || meiliResult.estimatedTotalHits || 0
    processingTimeMs = meiliResult.processingTimeMs
    facetDistribution = meiliResult.facetDistribution
    facetStats = meiliResult.facetStats
    usedMeili = true

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
        id: `cat_${i}`, name, handle: hit.category_handles?.[i] || "", parent_category_id: null,
      })),
      created_at: new Date(hit.created_at * 1000).toISOString(),
    }))
  } catch {
    // Fallback to Medusa API
    const productsRes = await getProducts({
      category_id: [category.id],
      limit: ITEMS_PER_PAGE,
      offset,
      order: "-created_at",
    })
    products = productsRes.products
    totalCount = productsRes.count
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const priceRange = facetStats?.price
    ? { min: Math.floor(facetStats.price.min), max: Math.ceil(facetStats.price.max) }
    : undefined

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (p > 1) params.set("leht", String(p))
    if (currentSort) params.set("sort", currentSort)
    if (min) params.set("min", min)
    if (max) params.set("max", max)
    if (q) params.set("q", q)
    const qs = params.toString()
    return qs ? `/kategooriad/${handle}?${qs}` : `/kategooriad/${handle}`
  }

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      {/* Breadcrumb */}
      <nav className="text-[12px] font-[family-name:var(--font-jakarta)] text-[#999999] mb-[32px]" aria-label="Leheasukoht">
        <Link href={`/${locale}`} className="hover:text-[#E8650A] transition-colors">Avaleht</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <Link href="/kategooriad" className="hover:text-[#E8650A] transition-colors">Kategooriad</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">{category.name}</span>
      </nav>

      <div className="flex items-baseline justify-between mb-[8px]">
        <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">
          {category.name}
        </h1>
        {usedMeili && (
          <span className="text-[11px] text-[#CCCCCC] font-[family-name:var(--font-jakarta)]">{processingTimeMs}ms</span>
        )}
      </div>
      <p className="text-[14px] text-[#999999] font-[family-name:var(--font-jakarta)] mb-[24px]">
        {totalCount.toLocaleString("et-EE")} toodet
        {priceRange && totalCount > 0 && (
          <span className="ml-[8px] text-[12px]">
            ({priceRange.min}€ – {priceRange.max}€)
          </span>
        )}
      </p>

      {/* Filters */}
      <CategoryFilters
        currentSort={currentSort}
        currentMin={min}
        currentMax={max}
        basePath={`/kategooriad/${handle}`}
        totalProducts={totalCount}
      />

      {products.length === 0 ? (
        <div className="py-[64px] text-center">
          <p className="text-[16px] text-[#999999] font-[family-name:var(--font-jakarta)]">
            {(min || max) ? "Selles hinnavahemikus tooteid ei leitud." : "Selles kategoorias pole veel tooteid."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[16px] sm:gap-[20px]">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex justify-center items-center gap-[8px] mt-[48px]" aria-label="Leheküljed">
          {page > 1 && (
            <Link
              href={pageUrl(page - 1)}
              className="px-[16px] py-[9px] border border-[#E8E8E8] text-[13px] font-[500] font-[family-name:var(--font-poppins)] text-[#333333] hover:border-[#E8650A] hover:text-[#E8650A] transition-colors"
            >
              &larr; Eelmine
            </Link>
          )}
          <span className="text-[13px] text-[#999999] font-[family-name:var(--font-jakarta)] px-[8px]">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={pageUrl(page + 1)}
              className="px-[16px] py-[9px] border border-[#E8E8E8] text-[13px] font-[500] font-[family-name:var(--font-poppins)] text-[#333333] hover:border-[#E8650A] hover:text-[#E8650A] transition-colors"
            >
              J&auml;rgmine &rarr;
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
