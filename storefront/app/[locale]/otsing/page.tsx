import Link from "@/components/SafeLink"
import { Suspense } from "react"
import { searchProducts, getLocalizedTitle } from "@/lib/meilisearch"
import { getProducts } from "@/lib/medusa"
import VevorProductCard from "@/components/VevorProductCard"
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
  const title = locale === "en"
    ? (q ? `"${q}" — Search — XLMARKET` : "Search — XLMARKET")
    : (q ? `"${q}" — Otsing — XLMARKET` : "Otsing — XLMARKET")
  const description = locale === "en"
    ? (q ? `Search "${q}" among XLMARKET products.` : "Search XLMARKET products.")
    : (q ? `Otsi "${q}" XLMARKETi toodete hulgast.` : "Otsi XLMARKETi tooteid.")
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

const SORT_TITLES: Record<string, Record<string, string>> = {
  deals: { et: "Sooduspakkumised", en: "Deals" },
  newest: { et: "Uued tooted", en: "New Arrivals" },
  best: { et: "Enimmüüdud", en: "Best Sellers" },
  clearance: { et: "Allahindlus — alla 50€", en: "Clearance — Under €50" },
}

const TAG_TITLES: Record<string, Record<string, string>> = {
  deals: { et: "Sooduspakkumised", en: "Deals" },
  hot: { et: "Enimmüüdud", en: "Best Sellers" },
  "spring-sale": { et: "Kevadkampaania", en: "Spring Sale" },
  "flash-sale": { et: "Kiirmüük — allahindlus", en: "Flash Sale" },
  promo: { et: "Kampaaniad", en: "Promotions" },
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

  let products: any[] = []
  let totalHits = 0
  let categoryFacets: Record<string, number> = {}
  let quickFilterFacets: Record<string, number> = {}

  // Always search — empty query returns popular/all products
  try {
    const searchFilters: string[] = []
    // Tag-based filtering (Deals, Hot, Flash Sale etc from VEVOR feed)
    if (activeTag) searchFilters.push(`promo_tags = "${activeTag}"`)
    // Note: New Arrivals uses sort=newest which sorts by created_at:desc
    // Clearance: auto-filter under 50€
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
    const meiliResult = await searchProducts({
      q: query,
      limit: ITEMS_PER_PAGE,
      offset,
      sort: SORT_MAP[currentSort] || (!query ? ["created_at:desc"] : undefined),
      filter: searchFilters.length > 0 ? searchFilters : undefined,
      facets: ["categories", "price", "in_stock", "filter_tokens"],
    })
    totalHits = meiliResult.totalHits || meiliResult.estimatedTotalHits || 0
    categoryFacets = meiliResult.facetDistribution?.categories || {}
    quickFilterFacets = meiliResult.facetDistribution?.filter_tokens || {}

    products = meiliResult.hits.map(hit => ({
      id: hit.id,
      title: getLocalizedTitle(hit, locale),
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

  const pageTitle = TAG_TITLES[activeTag]?.[locale] || SORT_TITLES[currentSort]?.[locale] || (query ? (locale === "en" ? `Search: "${query}"` : `Otsing: "${query}"`) : (locale === "en" ? "All Products" : "Kõik tooted"))

  return (
    <div className="bg-[#F8FAFC]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-7 sm:py-10">
        <nav className="text-xs text-[#64748B] mb-4 min-h-[24px] flex items-center">
          <Link href={`/${locale}`} className="text-[#64748B] hover:text-[#D97706] transition-colors duration-200">{locale === "en" ? "Home" : "Avaleht"}</Link>
          <span className="mx-1.5 text-[#CBD5E1]">&gt;</span>
          <span className="text-[#1E293B] transition-opacity duration-200">
            {TAG_TITLES[activeTag]?.[locale] || SORT_TITLES[currentSort]?.[locale] || (locale === "en" ? "Search Results" : "Otsingutulemused")}
          </span>
        </nav>

        {/* Title row: heading + result count + sort + mobile filter button */}
        <div className="flex items-start md:items-center justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-[30px] font-bold text-[#1E293B] tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              <span className="font-semibold text-[#1E293B]">{totalHits.toLocaleString(locale === "en" ? "en-GB" : "et")}</span> {locale === "en" ? "products" : "toodet"}
              {query && (
                <span> {locale === "en" ? `for "${query}"` : `päringule "${query}"`}</span>
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

        {products.length === 0 && !query ? (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-12 text-center">
            <p className="text-sm text-[#64748B]">
              {locale === "en" ? "No products available yet." : "Tooteid pole veel saadaval."}
            </p>
          </div>
        ) : products.length === 0 && query ? (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-12 text-center">
            <p className="text-sm text-[#64748B] mb-4">
              {locale === "en" ? `No results found for "${query}".` : `Päringule "${query}" tulemusi ei leitud.`}
            </p>
            <Link href={categoryPath(locale as "et" | "en")} className="text-[#D97706] hover:underline font-medium">
              {locale === "en" ? "Browse all categories" : "Sirvi kõiki kategooriaid"}
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
                      {locale === "en" ? "Popular categories" : "Populaarsed kategooriad"}
                    </h2>
                    <span className="text-xs text-[#94A3B8]">
                      {locale === "en" ? "Refine by category" : "Täpsusta kategooria järgi"}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product) => (
                      <VevorProductCard key={product.id} product={product} locale={locale} />
                    ))}
                  </div>
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
                    {locale === "en" ? "Recommended searches" : "Soovitatud otsingud"}
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
