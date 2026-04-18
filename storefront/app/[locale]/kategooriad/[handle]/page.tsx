import Link from "@/components/SafeLink"
import { Suspense } from "react"
import { getCategoryByHandle } from "@/lib/medusa"
import { searchProducts } from "@/lib/meilisearch"
import ProductGrid from "@/components/ProductGrid"
import VevorSearchFilters from "@/components/search/VevorSearchFilters"
import VevorPagination from "@/components/search/VevorPagination"
import SortSelect from "@/components/search/SortSelect"
import { notFound } from "next/navigation"
import JsonLdCategory from "@/components/JsonLdCategory"
import CategoryThumb from "@/components/CategoryThumb"
import { categoryPath } from "@/lib/i18n"
import { buildQuickFilters } from "@/lib/quick-filters"
import {
  getNode,
  getAncestors,
  getChildren,
  getSiblings,
  nodeName,
  type Locale as TaxLocale,
} from "@/lib/category-tree"

export const revalidate = 3600

type Props = {
  params: Promise<{ handle: string; locale: string }>
  searchParams: Promise<{
    page?: string; sort?: string; min?: string; max?: string
    q?: string; categories?: string; in_stock?: string; filters?: string
  }>
}

function humanize(handle: string): string {
  return handle
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Category handles that should never be indexed (legacy dump categories,
// artificial VEVOR shells). 2026-04-18 taxonomy audit §1.3 — /et/kategooriad/other
// was serving 200 as an empty page.
const NOINDEX_HANDLES = new Set<string>([
  "other",
])

export async function generateMetadata({ params }: Props) {
  const { handle, locale } = await params
  const node = getNode(handle)
  const category = node ? null : await getCategoryByHandle(handle)
  const displayName = node
    ? nodeName(node, locale as TaxLocale)
    : (category?.name || humanize(handle))
  const desc = locale === "et"
    ? `${displayName} tooted soodsa hinnaga. Kiire tarne üle Eesti.`
    : `${displayName} products at great prices. Fast delivery in Estonia.`
  const shouldNoindex = NOINDEX_HANDLES.has(handle)
  return {
    title: `${displayName} — XLMARKET`,
    description: desc,
    openGraph: { title: `${displayName} — XLMARKET`, description: desc, type: "website" },
    robots: shouldNoindex ? { index: false, follow: false } : undefined,
  }
}

const ITEMS_PER_PAGE = 24

const SORT_MAP: Record<string, string[]> = {
  price_asc: ["price:asc"],
  price_desc: ["price:desc"],
  newest: ["created_at:desc"],
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { handle, locale } = await params
  const { page: pageParam, sort, min, max, q, categories, in_stock, filters } = await searchParams

  // Hierarchy lookup from taxonomy.yaml SSoT (sync, in-memory).
  const node = getNode(handle)
  // Medusa fallback only when the node is unknown to the SSoT (legacy slugs,
  // VEVOR shells, /kategooriad/other style dump pages still need a name).
  const category = node ? null : await getCategoryByHandle(handle)
  const ancestors = node ? getAncestors(handle) : []
  const children = node ? getChildren(handle) : []

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE
  const currentSort = sort || ""
  const selectedCategories = categories ? categories.split(",").filter(Boolean) : []
  const inStock = in_stock === "1"
  const currentQuickFilter = filters?.trim() || ""

  let totalCount = 0
  let quickFilterFacets: Record<string, number> = {}

  // Build search filters for MeiliSearch
  const searchFilters: string[] = [`category_handles = "${handle}"`]
  if (min) searchFilters.push(`price >= ${parseFloat(min)}`)
  if (max) searchFilters.push(`price <= ${parseFloat(max)}`)
  if (inStock) searchFilters.push("in_stock = true")
  if (selectedCategories.length > 0) {
    const catFilters = selectedCategories.map(c => `category_handles = "${c.replace(/"/g, '\\"')}"`)
    searchFilters.push(`(${catFilters.join(" OR ")})`)
  }
  if (currentQuickFilter) {
    searchFilters.push(`filter_tokens = "${currentQuickFilter.replace(/"/g, '\\"')}"`)
  }
  const searchFilterStr = searchFilters.join(";")
  const sortStr = (SORT_MAP[currentSort] || [])[0] || ""

  // MeiliSearch — facets + totalHits only (products fetched client-side)
  let rawCategoryFacets: Record<string, number> = {}
  try {
    const meiliResult = await searchProducts({
      q: q || "",
      limit: 0,
      offset: 0,
      sort: SORT_MAP[currentSort] || undefined,
      filter: searchFilters,
      facets: ["category_handles", "price", "in_stock", "filter_tokens"],
    })

    totalCount = meiliResult.totalHits || meiliResult.estimatedTotalHits || 0
    rawCategoryFacets = meiliResult.facetDistribution?.category_handles || {}
    quickFilterFacets = meiliResult.facetDistribution?.filter_tokens || {}
  } catch {
    // MeiliSearch unavailable — leave totalCount as 0
  }

  // Show only siblings + children of the current node in the sidebar facet
  // list. Anything else in `category_handles` (current node itself, ancestors,
  // unrelated handles inherited from VEVOR product_type drift) is filtered out.
  const allowedSidebarHandles = node
    ? new Set<string>([
        ...getSiblings(handle).map((s) => s.handle),
        ...children.map((c) => c.handle),
      ])
    : null
  const categoryFacets: Record<string, number> = {}
  const categoryLabels: Record<string, string> = {}
  for (const [h, n] of Object.entries(rawCategoryFacets)) {
    if (h === handle) continue
    if (allowedSidebarHandles && !allowedSidebarHandles.has(h)) continue
    const childNode = getNode(h)
    if (!childNode) continue
    categoryFacets[h] = n
    categoryLabels[h] = nodeName(childNode, locale as TaxLocale)
  }

  // No products found AND unknown to both SSoT and Medusa → 404
  if (totalCount === 0 && !node && !category) notFound()

  const displayName = node
    ? nodeName(node, locale as TaxLocale)
    : (category?.name || humanize(handle))

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const categoryBasePath = categoryPath(locale as "et" | "en", handle)
  const quickFilters = buildQuickFilters(quickFilterFacets, totalCount)

  function buildPageUrl(targetPage: number) {
    const p = new URLSearchParams()
    if (targetPage > 1) p.set("page", String(targetPage))
    if (currentSort) p.set("sort", currentSort)
    if (min) p.set("min", min)
    if (max) p.set("max", max)
    if (q) p.set("q", q)
    if (categories) p.set("categories", categories)
    if (inStock) p.set("in_stock", "1")
    if (currentQuickFilter) p.set("filters", currentQuickFilter)
    const qs = p.toString()
    return `${categoryBasePath}${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="bg-white">
      <JsonLdCategory
        name={displayName}
        url={`https://xlmarket.store${categoryPath(locale as "et" | "en", handle)}`}
        productCount={totalCount}
      />
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-7 sm:py-10">
        {/* Breadcrumb — Home > L1 > L2 (> L3) from taxonomy SSoT */}
        <nav className="text-xs text-[#64748B] mb-4 min-h-[24px] flex items-center flex-wrap gap-y-1 transition-opacity duration-200" aria-label="Breadcrumb">
          <Link href={`/${locale}`} className="text-[#64748B] hover:text-[#D97706] transition-colors duration-200">{locale === "et" ? "Avaleht" : "Home"}</Link>
          {ancestors.map((a) => (
            <span key={a.handle}>
              <span className="mx-1.5 text-[#CBD5E1]">&gt;</span>
              <Link href={categoryPath(locale as "et" | "en", a.handle)} className="text-[#64748B] hover:text-[#D97706] transition-colors duration-200">{nodeName(a, locale as TaxLocale)}</Link>
            </span>
          ))}
          <span className="mx-1.5 text-[#CBD5E1]">&gt;</span>
          <span className="text-[#1E293B] font-medium">{displayName}</span>
        </nav>

        {/* Title row: name + result count + sort + mobile filter button */}
        <div className="flex items-start md:items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-[28px] md:text-[34px] font-bold text-[#1E293B] tracking-tight">{displayName}</h1>
            <span className="text-sm text-[#64748B]">
              <span className="font-semibold text-[#1E293B]">{totalCount.toLocaleString("et")}</span> {locale === "et" ? "toodet" : "products"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile filter button */}
            <div className="md:hidden">
              <Suspense fallback={null}>
                <VevorSearchFilters
                  totalHits={totalCount}
                  query={q || ""}
                  currentSort={currentSort}
                  currentMin={min}
                  currentMax={max}
                  currentCategories={selectedCategories}
                  currentInStock={inStock}
                  categoryFacets={categoryFacets}
                  categoryLabels={categoryLabels}
                  quickFilters={quickFilters}
                  currentQuickFilter={currentQuickFilter}
                  locale={locale}
                  basePath={categoryBasePath}
                />
              </Suspense>
            </div>
            <SortSelect
              currentSort={currentSort}
              locale={locale}
              query={q || ""}
              currentMin={min}
              currentMax={max}
              currentCategories={selectedCategories}
              currentInStock={inStock}
              currentQuickFilter={currentQuickFilter}
              basePath={categoryBasePath}
            />
          </div>
        </div>

        {/* Content area — spec §3.5:
            sidebar vasakul, main paremal = subcategory grid + products.
            Mobile: sidebar annab drawer, subcategory + products virnas. */}
        {totalCount > 0 ? (
          <div className="flex gap-8">
            {/* Desktop sidebar */}
            <aside className="hidden md:block w-[240px] flex-shrink-0">
              <div className="sticky top-4">
                <Suspense fallback={null}>
                  <VevorSearchFilters
                    totalHits={totalCount}
                    query={q || ""}
                    currentSort={currentSort}
                    currentMin={min}
                    currentMax={max}
                    currentCategories={selectedCategories}
                    currentInStock={inStock}
                    categoryFacets={categoryFacets}
                    categoryLabels={categoryLabels}
                    quickFilters={quickFilters}
                    currentQuickFilter={currentQuickFilter}
                    locale={locale}
                    basePath={categoryBasePath}
                  />
                </Suspense>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0">
              {/* Subcategory grid — direct children (L2 row on L1, L3 row on L2).
                  Responsive grid: 2/3/4/6 cols. Shown above products, same column. */}
              {children.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                    {locale === "et" ? "Alamkategooriad" : "Subcategories"}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {children.map((child) => {
                      const childName = nodeName(child, locale as TaxLocale)
                      return (
                        <Link
                          key={child.handle}
                          href={categoryPath(locale as "et" | "en", child.handle)}
                          className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#D97706] hover:shadow-md transition-all duration-200"
                        >
                          <CategoryThumb
                            handle={child.handle}
                            node={child}
                            size={72}
                            alt={childName}
                            className="!rounded-lg"
                          />
                          <span className="text-[12px] text-center text-[#475569] group-hover:text-[#D97706] transition-colors leading-snug line-clamp-2 font-medium">
                            {childName}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Product grid — 2 mobile, 3 tablet, 4 desktop (sidebar takes 1 col worth) */}
              <ProductGrid
                fetchParams={{
                  q: q || "",
                  filter: searchFilterStr,
                  sort: sortStr,
                  limit: ITEMS_PER_PAGE,
                  offset,
                  locale,
                }}
                locale={locale}
              />

              {/* Pagination */}
              <VevorPagination
                currentPage={page}
                totalPages={totalPages}
                buildUrl={buildPageUrl}
                locale={locale}
              />
            </main>
          </div>
        ) : (
          <>
            {/* No products — but show subcategory grid if children exist */}
            {children.length > 0 && (
              <div className="mb-8">
                <h2 className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                  {locale === "et" ? "Alamkategooriad" : "Subcategories"}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {children.map((child) => {
                    const childName = nodeName(child, locale as TaxLocale)
                    return (
                      <Link
                        key={child.handle}
                        href={categoryPath(locale as "et" | "en", child.handle)}
                        className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#D97706] hover:shadow-md transition-all duration-200"
                      >
                        <CategoryThumb handle={child.handle} node={child} size={72} alt={childName} className="!rounded-lg" />
                        <span className="text-[12px] text-center text-[#475569] group-hover:text-[#D97706] transition-colors leading-snug line-clamp-2 font-medium">
                          {childName}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl p-12 text-center">
              <p className="text-sm text-[#64748B] mb-4">
                {locale === "et" ? "Selles kategoorias tooteid ei leitud." : "No products found in this category."}
              </p>
              <Link href={`/${locale}`} className="text-[#D97706] hover:underline font-medium">
                {locale === "et" ? "Sirvi kategooriaid" : "Browse all categories"}
              </Link>
            </div>
          </>
        )}

        {/* You May Also Like */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-[#1E293B] mb-5">{locale === "et" ? "Sulle võib meeldida ka" : "You May Also Like"}</h2>
          <ProductGrid
            fetchParams={{
              q: "",
              filter: `category_handles = "${category?.parent_category?.handle || handle}";category_handles != "${handle}"`,
              limit: 5,
              offset: 0,
              locale,
            }}
            locale={locale}
            columns="2-3-5"
          />
        </section>
      </div>
    </div>
  )
}
