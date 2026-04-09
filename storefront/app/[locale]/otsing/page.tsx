import Link from "next/link"
import { Suspense } from "react"
import { searchProducts } from "@/lib/meilisearch"
import { getProducts } from "@/lib/medusa"
import VevorProductCard from "@/components/VevorProductCard"
import VevorSearchFilters from "@/components/search/VevorSearchFilters"
import VevorPagination from "@/components/search/VevorPagination"

export const revalidate = 0

type Props = {
  searchParams: Promise<{
    q?: string; page?: string; sort?: string
    min?: string; max?: string; categories?: string; in_stock?: string
  }>
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ searchParams }: Props) {
  const { q } = await searchParams
  const title = q ? `"${q}" — Search — XLMARKET` : "Search — XLMARKET"
  return {
    title,
    description: q ? `Search for "${q}" among XLMARKET products.` : "Search XLMARKET products.",
    robots: { index: false, follow: true },
  }
}

const ITEMS_PER_PAGE = 24

const SORT_MAP: Record<string, string[]> = {
  price_asc: ["price:asc"],
  price_desc: ["price:desc"],
  newest: ["created_at:desc"],
  deals: ["price:asc"],
  best: ["price:desc"],
  clearance: ["price:asc"],
}

const SORT_TITLES: Record<string, string> = {
  deals: "Deals — Best Prices",
  newest: "New Arrivals",
  best: "Best Sellers",
  clearance: "Clearance — Under 50€",
}

export default async function SearchPage({ searchParams, params }: Props) {
  const { locale } = await params
  const { q, page: pageParam, sort, min, max, categories, in_stock } = await searchParams
  const query = q?.trim() || ""
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE
  const currentSort = sort || ""
  const selectedCategories = categories ? categories.split(",").filter(Boolean) : []
  const inStock = in_stock === "1"

  let products: any[] = []
  let totalHits = 0
  let usedMeili = false
  let categoryFacets: Record<string, number> = {}

  // Always search — empty query returns popular/all products
  try {
    const filters: string[] = []
    // Clearance: auto-filter under 50€
    if (currentSort === "clearance" && !max) filters.push("price <= 50")
    if (min) filters.push(`price >= ${parseFloat(min)}`)
    if (max) filters.push(`price <= ${parseFloat(max)}`)
    if (inStock) filters.push(`in_stock = true`)
    if (selectedCategories.length > 0) {
      const catFilters = selectedCategories.map(c => `categories = "${c.replace(/"/g, '\\"')}"`)
      filters.push(`(${catFilters.join(" OR ")})`)
    }

    const meiliResult = await searchProducts({
      q: query,
      limit: ITEMS_PER_PAGE,
      offset,
      sort: SORT_MAP[currentSort] || (!query ? ["created_at:desc"] : undefined),
      filter: filters.length > 0 ? filters : undefined,
      facets: ["categories", "price", "in_stock"],
    })
    totalHits = meiliResult.totalHits || meiliResult.estimatedTotalHits || 0
    usedMeili = true
    categoryFacets = meiliResult.facetDistribution?.categories || {}

    products = meiliResult.hits.map(hit => ({
      id: hit.id,
      title: hit._formatted?.title || hit.title,
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
    }))
  } catch {
    // Fallback to Medusa API
    const res = query
      ? await getProducts({ q: query, limit: ITEMS_PER_PAGE, offset })
      : await getProducts({ limit: ITEMS_PER_PAGE, offset, order: "-created_at" })
    products = res.products
    totalHits = res.count
  }

  const totalPages = Math.ceil(totalHits / ITEMS_PER_PAGE)

  function buildPageUrl(targetPage: number) {
    const p = new URLSearchParams()
    if (query) p.set("q", query)
    if (targetPage > 1) p.set("page", String(targetPage))
    if (currentSort) p.set("sort", currentSort)
    if (min) p.set("min", min)
    if (max) p.set("max", max)
    if (categories) p.set("categories", categories)
    if (inStock) p.set("in_stock", "1")
    const qs = p.toString()
    return `/${locale}/otsing${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-[#888] mb-4">
          <Link href={`/${locale}`} className="hover:text-[#D97706]">Home</Link>
          <span className="mx-1.5">&gt;</span>
          <span className="text-[#1E293B]">{SORT_TITLES[currentSort] || "Search Results"}</span>
        </nav>

        {/* Page title — sort-based landing page or search query */}
        {(query || SORT_TITLES[currentSort]) && (
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-[#1E293B]">
              {SORT_TITLES[currentSort] || `Search for "${query}"`}
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              <span className="font-semibold text-[#1E293B]">{totalHits.toLocaleString("en")}</span> {query ? "results" : "products"}
            </p>
          </div>
        )}

        {/* Category pills from facets */}
        {query && Object.keys(categoryFacets).length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            {Object.entries(categoryFacets)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 12)
              .map(([cat, count]) => (
                <Link
                  key={cat}
                  href={`/${locale}/otsing?q=${encodeURIComponent(query)}&categories=${encodeURIComponent(cat)}`}
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-4 h-10 rounded-full text-sm font-medium border transition-colors ${
                    selectedCategories.includes(cat)
                      ? "bg-[#D97706] text-white border-[#D97706]"
                      : "bg-white text-[#1E293B] border-[#E2E8F0] hover:border-[#D97706]"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={selectedCategories.includes(cat) ? "#fff" : "#94A3B8"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  {cat} <span className="text-xs opacity-60 ml-1">({count})</span>
                </Link>
              ))}
          </div>
        )}

        {!query && !SORT_TITLES[currentSort] && products.length > 0 && (
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-[#1E293B]">Browse All Products</h1>
            <p className="text-sm text-[#64748B] mt-1">
              <span className="font-semibold text-[#1E293B]">{totalHits.toLocaleString("en")}</span> products available
            </p>
          </div>
        )}

        {products.length === 0 && !query && (
          <div className="bg-white rounded-xl p-12 text-center">
            <p className="text-sm text-[#64748B]">
              No products available yet.
            </p>
          </div>
        )}

        {query && products.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center">
            <p className="text-sm text-[#64748B] mb-4">
              No results found for &quot;{query}&quot;.
            </p>
            <Link
              href={`/${locale}/kategooriad`}
              className="text-[#D97706] hover:underline font-medium"
            >
              Browse all categories
            </Link>
          </div>
        )}

        {(query || SORT_TITLES[currentSort]) && totalHits > 0 && (
          <div className="bg-white rounded-xl p-4 sm:p-6">
            {/* Sort + Results bar */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#555]">
                <span className="font-semibold text-[#1E293B]">{totalHits.toLocaleString("en")}</span> {query ? `results for "${query}"` : "products"}
              </p>
            </div>

            {/* Filters */}
            <Suspense fallback={null}>
              <VevorSearchFilters
                totalHits={totalHits}
                query={query}
                currentSort={currentSort}
                currentMin={min}
                currentMax={max}
                currentCategories={selectedCategories}
                currentInStock={inStock}
                categoryFacets={categoryFacets}
                locale={locale}
              />
            </Suspense>

            {/* Product grid — 5 col desktop, 3 tablet, 2 mobile */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {products.map((product) => (
                <VevorProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>

            {/* Pagination */}
            <VevorPagination
              currentPage={page}
              totalPages={totalPages}
              buildUrl={buildPageUrl}
            />
          </div>
        )}

        {/* Recommended Searches */}
        {query && Object.keys(categoryFacets).length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-[#1E293B] mb-4">Recommended Searches</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryFacets)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([cat]) => (
                  <Link
                    key={cat}
                    href={`/${locale}/otsing?q=${encodeURIComponent(cat)}`}
                    className="px-4 py-2 rounded-full text-sm font-medium bg-white border border-[#E2E8F0] text-[#1E293B] hover:border-[#D97706] hover:text-[#D97706] transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
