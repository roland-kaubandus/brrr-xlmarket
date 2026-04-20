import Link from "@/components/SafeLink"
import { Suspense } from "react"
import { searchProducts } from "@/lib/meilisearch"
import ProductGrid from "@/components/ProductGrid"
import VevorSearchFilters from "@/components/search/VevorSearchFilters"
import VevorPagination from "@/components/search/VevorPagination"
import SortSelect from "@/components/search/SortSelect"
import { categoryPath } from "@/lib/i18n"
import { buildQuickFilters } from "@/lib/quick-filters"

export const revalidate = 3600 // cache search results 1 min

type Props = {
  searchParams: Promise<{
    q?: string; page?: string; sort?: string; tag?: string
    min?: string; max?: string; categories?: string; in_stock?: string; filters?: string
  }>
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ searchParams, params }: Props) {
  const { q } = await searchParams
  const { locale } = await params
  void locale
  const title = q ? `"${q}" — Search — XLMARKET` : "Search — XLMARKET"
  const description = q ? `Search "${q}" among XLMARKET products.` : "Search XLMARKET products."
  return {
    title,
    description,
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
  deals: "Deals",
  newest: "New Arrivals",
  best: "Best Sellers",
  clearance: "Clearance — Under €50",
}

const TAG_TITLES: Record<string, string> = {
  deals: "Deals",
  hot: "Best Sellers",
  "spring-sale": "Spring Sale",
  "flash-sale": "Flash Sale",
  promo: "Promotions",
}

export default async function SearchPage({ searchParams, params }: Props) {
  const { locale } = await params
  const { q, page: pageParam, sort, tag, min, max, categories, in_stock, filters } = await searchParams
  const query = q?.trim() || ""
  const activeTag = tag?.trim() || ""
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE
  const currentSort = sort || ""
  const selectedCategories = categories ? categories.split(",").filter(Boolean) : []
  const inStock = in_stock === "1"
  const currentQuickFilter = filters?.trim() || ""

  let totalHits = 0
  let categoryFacets: Record<string, number> = {}
  let quickFilterFacets: Record<string, number> = {}

  // Build search filters
  const searchFilters: string[] = []
  if (activeTag) searchFilters.push(`promo_tags = "${activeTag}"`)
  if (currentSort === "clearance" && !max) searchFilters.push("price <= 50")
  if (min) searchFilters.push(`price >= ${parseFloat(min)}`)
  if (max) searchFilters.push(`price <= ${parseFloat(max)}`)
  if (inStock) searchFilters.push(`in_stock = true`)
  if (selectedCategories.length > 0) {
    const catFilters = selectedCategories.map(c => `categories = "${c.replace(/"/g, '\\"')}"`)
    searchFilters.push(`(${catFilters.join(" OR ")})`)
  }
  if (currentQuickFilter) {
    searchFilters.push(`filter_tokens = "${currentQuickFilter.replace(/"/g, '\\"')}"`)
  }

  // Fetch ONLY facets + totalHits (no products — client fetches those via /api/products)
  try {
    const meiliResult = await searchProducts({
      q: query,
      limit: 0,
      offset: 0,
      filter: searchFilters.length > 0 ? searchFilters : undefined,
      facets: ["categories", "price", "in_stock", "filter_tokens"],
    })
    totalHits = meiliResult.totalHits || meiliResult.estimatedTotalHits || 0
    categoryFacets = meiliResult.facetDistribution?.categories || {}
    quickFilterFacets = meiliResult.facetDistribution?.filter_tokens || {}
  } catch {
    // MeiliSearch failed — totals will be 0, client-side fetch may still work
  }

  // Build filter string for client-side ProductGrid fetch
  const searchFilterStr = searchFilters.join(";")
  const sortStr = (SORT_MAP[currentSort] || (!query ? ["created_at:desc"] : []))[0] || ""

  const totalPages = Math.ceil(totalHits / ITEMS_PER_PAGE)
  const quickFilters = buildQuickFilters(quickFilterFacets, totalHits)

  function buildPageUrl(targetPage: number) {
    const p = new URLSearchParams()
    if (query) p.set("q", query)
    if (targetPage > 1) p.set("page", String(targetPage))
    if (currentSort) p.set("sort", currentSort)
    if (min) p.set("min", min)
    if (max) p.set("max", max)
    if (categories) p.set("categories", categories)
    if (inStock) p.set("in_stock", "1")
    if (currentQuickFilter) p.set("filters", currentQuickFilter)
    const qs = p.toString()
    return `/${locale}/otsing${qs ? `?${qs}` : ""}`
  }

  const pageTitle = TAG_TITLES[activeTag] || SORT_TITLES[currentSort] || (query ? `Search: "${query}"` : "All Products")

  return (
    <div className="bg-[#F8FAFC]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-7 sm:py-10">
        <nav className="text-xs text-[#64748B] mb-4 min-h-[24px] flex items-center">
          <Link href={`/${locale}`} className="text-[#64748B] hover:text-[#D97706] transition-colors duration-200">Home</Link>
          <span className="mx-1.5 text-[#CBD5E1]">&gt;</span>
          <span className="text-[#1E293B] transition-opacity duration-200">
            {TAG_TITLES[activeTag] || SORT_TITLES[currentSort] || "Search Results"}
          </span>
        </nav>

        {/* Title row: heading + result count + sort + mobile filter button */}
        <div className="flex items-start md:items-center justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-[30px] font-bold text-[#1E293B] tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              <span className="font-semibold text-[#1E293B]">{totalHits.toLocaleString("en-IE")}</span> products
              {query && (
                <span> {`for "${query}"`}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile filter button */}
            <div className="md:hidden">
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
                  quickFilters={quickFilters}
                  currentQuickFilter={currentQuickFilter}
                  locale={locale}
                />
              </Suspense>
            </div>
            <SortSelect
              currentSort={currentSort}
              locale={locale}
              query={query}
              currentMin={min}
              currentMax={max}
              currentCategories={selectedCategories}
              currentInStock={inStock}
              currentQuickFilter={currentQuickFilter}
            />
          </div>
        </div>

        {totalHits === 0 && !query ? (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-12 text-center">
            <p className="text-sm text-[#64748B]">
              No products available yet.
            </p>
          </div>
        ) : totalHits === 0 && query ? (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-12 text-center">
            <p className="text-sm text-[#64748B] mb-4">
              {`No results found for "${query}".`}
            </p>
            <Link href={categoryPath(locale as "et" | "en")} className="text-[#D97706] hover:underline font-medium">
              Browse all categories
            </Link>
          </div>
        ) : (
          <div className="flex gap-8">
            {/* Desktop sidebar */}
            <aside className="hidden md:block w-[240px] flex-shrink-0">
              <div className="sticky top-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5">
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
                    quickFilters={quickFilters}
                    currentQuickFilter={currentQuickFilter}
                    locale={locale}
                  />
                </Suspense>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0 space-y-5">
              {/* Popular categories (search page only, when query present) */}
              {query && Object.keys(categoryFacets).length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-[#1E293B]">
                      Popular categories
                    </h2>
                    <span className="text-xs text-[#94A3B8]">
                      Refine by category
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {Object.entries(categoryFacets)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 12)
                      .map(([cat, count]) => (
                        <Link
                          key={cat}
                          href={`/${locale}/otsing?q=${encodeURIComponent(query)}&categories=${encodeURIComponent(cat)}${currentQuickFilter ? `&filters=${encodeURIComponent(currentQuickFilter)}` : ""}`}
                          className={`flex-shrink-0 inline-flex items-center gap-2 px-4 h-10 rounded-full text-sm font-medium border transition-colors ${
                            selectedCategories.includes(cat)
                              ? "bg-[#D97706] text-white border-[#D97706]"
                              : "bg-[#F8FAFC] text-[#1E293B] border-[#E2E8F0] hover:border-[#D97706]"
                          }`}
                        >
                          {cat} <span className="text-xs opacity-60">({count})</span>
                        </Link>
                      ))}
                  </div>
                </div>
              )}

              {/* Product grid */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5">
                  <ProductGrid
                    fetchParams={{
                      q: query,
                      filter: searchFilterStr,
                      sort: sortStr,
                      limit: ITEMS_PER_PAGE,
                      offset,
                      locale,
                    }}
                    locale={locale}
                  />
                </div>
                <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                  <VevorPagination
                    currentPage={page}
                    totalPages={totalPages}
                    buildUrl={buildPageUrl}
                    locale={locale}
                  />
                </div>
              </div>

              {/* Recommended searches */}
              {query && Object.keys(categoryFacets).length > 0 && (
                <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5">
                  <h2 className="text-sm font-semibold text-[#1E293B] mb-3">
                    Recommended searches
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categoryFacets)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 8)
                      .map(([cat]) => (
                        <Link
                          key={cat}
                          href={`/${locale}/otsing?q=${encodeURIComponent(cat)}${currentQuickFilter ? `&filters=${encodeURIComponent(currentQuickFilter)}` : ""}`}
                          className="px-4 py-2 rounded-full text-sm font-medium bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B] hover:border-[#D97706] hover:text-[#D97706] transition-colors"
                        >
                          {cat}
                        </Link>
                      ))}
                  </div>
                </section>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  )
}
