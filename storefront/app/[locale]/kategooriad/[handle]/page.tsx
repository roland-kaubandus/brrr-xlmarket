import Link from "@/components/SafeLink"
import Image from "next/image"
import { Suspense } from "react"
import { getCategoryByHandle } from "@/lib/medusa"
import { searchProducts } from "@/lib/meilisearch"
import ProductGrid from "@/components/ProductGrid"
import VevorSearchFilters from "@/components/search/VevorSearchFilters"
import VevorPagination from "@/components/search/VevorPagination"
import SortSelect from "@/components/search/SortSelect"
import { notFound } from "next/navigation"
import JsonLdCategory from "@/components/JsonLdCategory"
import SubcategoryScroller from "@/components/SubcategoryScroller"
import categoryImages from "@/lib/category-images.json"
import { categoryPath } from "@/lib/i18n"
import { buildQuickFilters } from "@/lib/quick-filters"

const CATEGORY_IMAGES: Record<string, string> = categoryImages as Record<string, string>

export const revalidate = 3600

const CATEGORY_NAMES: Record<string, Record<string, string>> = {
  // L1 VEVOR categories → ET + EN (matches XLSX product_type taxonomy)
  "automotive": { et: "Auto ja garaaž", en: "Automotive" },
  "plumbing": { et: "Torutööd ja sanitaar", en: "Plumbing" },
  "sports-outdoors": { et: "Sport ja vaba aeg", en: "Sports & Outdoors" },
  "tools": { et: "Tööriistad", en: "Tools" },
  "outdoors": { et: "Aed ja õu", en: "Outdoors" },
  "building-materials": { et: "Ehitus ja remont", en: "Building Materials" },
  "industrial-scientific": { et: "Tööstus ja labor", en: "Industrial & Scientific" },
  "doors-windows": { et: "Uksed ja aknad", en: "Doors & Windows" },
  "appliances": { et: "Kodumasinad", en: "Appliances" },
  "kitchen": { et: "Köök ja toitlustus", en: "Kitchen" },
  "home-decor": { et: "Kodukaunistus", en: "Home Decor" },
  "flooring": { et: "Põrandad ja plaatimine", en: "Flooring" },
  "furniture": { et: "Mööbel", en: "Furniture" },
  "bath": { et: "Vannituba", en: "Bath" },
  "storage-organization": { et: "Ladustamine ja kontor", en: "Storage & Organization" },
  "lumber-composites": { et: "Puitmaterjalid", en: "Lumber & Composites" },
  "heating-venting-cooling": { et: "Küte ja jahutus", en: "Heating, Venting & Cooling" },
  "electrical": { et: "Elektroonika", en: "Electrical" },
  "musical-instruments": { et: "Muusikainstrumendid", en: "Musical Instruments" },
  "paint": { et: "Värvid", en: "Paint" },
  "cleaning": { et: "Puhastus", en: "Cleaning" },
  "hardware": { et: "Riistvara", en: "Hardware" },
  "safety-equipment": { et: "Tööohutus", en: "Safety Equipment" },
  "health-and-wellness": { et: "Tervis ja heaolu", en: "Health & Wellness" },
  "lighting": { et: "Valgustus", en: "Lighting" },
  "window-treatments": { et: "Aknalahendused", en: "Window Treatments" },
  "playground-sets": { et: "Mänguväljakud", en: "Playground Sets" },
  "holiday-decorations": { et: "Pühadedekoratsioonid", en: "Holiday Decorations" },
  "workwear": { et: "Tööriided", en: "Workwear" },
  "smart-home": { et: "Nutikas kodu", en: "Smart Home" },
  "other": { et: "Muu", en: "Other" },
}

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

export async function generateMetadata({ params }: Props) {
  const { handle, locale } = await params
  const category = await getCategoryByHandle(handle)
  const displayName = category
    ? (CATEGORY_NAMES[handle]?.[locale] || category.name)
    : humanize(handle)
  const desc = locale === "et"
    ? `${displayName} tooted soodsa hinnaga. Kiire tarne üle Eesti.`
    : `${displayName} products at great prices. Fast delivery in Estonia.`
  return {
    title: `${displayName} — XLMARKET`,
    description: desc,
    openGraph: { title: `${displayName} — XLMARKET`, description: desc, type: "website" },
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

  // Try Medusa category first (for subcategories, ancestors, etc.)
  const category = await getCategoryByHandle(handle)

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE
  const currentSort = sort || ""
  const selectedCategories = categories ? categories.split(",").filter(Boolean) : []
  const inStock = in_stock === "1"
  const currentQuickFilter = filters?.trim() || ""

  let totalCount = 0
  let categoryFacets: Record<string, number> = {}
  let quickFilterFacets: Record<string, number> = {}

  // Build search filters for MeiliSearch
  const searchFilters: string[] = [`category_handles = "${handle}"`]
  if (min) searchFilters.push(`price >= ${parseFloat(min)}`)
  if (max) searchFilters.push(`price <= ${parseFloat(max)}`)
  if (inStock) searchFilters.push("in_stock = true")
  if (selectedCategories.length > 0) {
    const catFilters = selectedCategories.map(c => `categories = "${c.replace(/"/g, '\\"')}"`)
    searchFilters.push(`(${catFilters.join(" OR ")})`)
  }
  if (currentQuickFilter) {
    searchFilters.push(`filter_tokens = "${currentQuickFilter.replace(/"/g, '\\"')}"`)
  }
  const searchFilterStr = searchFilters.join(";")
  const sortStr = (SORT_MAP[currentSort] || [])[0] || ""

  // MeiliSearch — facets + totalHits only (products fetched client-side)
  try {
    const meiliResult = await searchProducts({
      q: q || "",
      limit: 0,
      offset: 0,
      sort: SORT_MAP[currentSort] || undefined,
      filter: searchFilters,
      facets: ["categories", "price", "in_stock", "filter_tokens"],
    })

    totalCount = meiliResult.totalHits || meiliResult.estimatedTotalHits || 0
    categoryFacets = meiliResult.facetDistribution?.categories || {}
    quickFilterFacets = meiliResult.facetDistribution?.filter_tokens || {}
  } catch {
    // MeiliSearch unavailable — leave totalCount as 0
  }

  // No products found AND no Medusa category → 404
  if (totalCount === 0 && !category) notFound()

  const displayName = category
    ? (CATEGORY_NAMES[handle]?.[locale] || category.name)
    : humanize(handle)

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
        {/* Breadcrumb — full ancestor chain (if Medusa category exists) */}
        <nav className="text-xs text-[#64748B] mb-4 min-h-[24px] flex items-center flex-wrap gap-y-1 transition-opacity duration-200">
          <Link href={`/${locale}`} className="text-[#64748B] hover:text-[#D97706] transition-colors duration-200">{locale === "et" ? "Avaleht" : "Home"}</Link>
          {category && (() => {
            const ancestors: Array<{ name: string; handle: string }> = []
            const visited = new Set<string>()
            let parent = category.parent_category
            while (parent && !visited.has((parent as any).id) && ancestors.length < 20) {
              visited.add((parent as any).id)
              ancestors.unshift({ name: parent.name, handle: parent.handle })
              parent = (parent as any).parent_category
            }
            return ancestors.map((a) => (
              <span key={a.handle}>
                <span className="mx-1.5 text-[#CBD5E1]">&gt;</span>
                <Link href={categoryPath(locale as "et" | "en", a.handle)} className="text-[#64748B] hover:text-[#D97706] transition-colors duration-200">{a.name}</Link>
              </span>
            ))
          })()}
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

        {/* Subcategory navigation — visual shelf */}
        {category && (category.category_children?.length ?? 0) > 0 && (
          <div className="bg-[#F8FAFC] -mx-4 px-4 sm:-mx-6 sm:px-6 py-4 mb-6 border-b border-[#E2E8F0]">
            <SubcategoryScroller>
              {category.category_children!.map((child) => {
                const thumb = CATEGORY_IMAGES[child.handle] || null
                return (
                  <Link
                    key={child.id}
                    href={categoryPath(locale as "et" | "en", child.handle)}
                    className="flex-shrink-0 flex flex-col items-center gap-2 w-[130px] group"
                  >
                    <div className="w-[120px] h-[120px] rounded-xl bg-white border border-[#E2E8F0] group-hover:border-[#D97706] group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-200 overflow-hidden flex items-center justify-center">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={child.name}
                          width={120}
                          height={120}
                          className="object-contain w-full h-full p-2"
                          unoptimized
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#FEF3C7] flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg>
                        </div>
                      )}
                    </div>
                    <span className="text-[12px] text-center text-[#475569] group-hover:text-[#D97706] transition-colors leading-snug line-clamp-2 font-medium">
                      {child.name}
                    </span>
                  </Link>
                )
              })}
            </SubcategoryScroller>
          </div>
        )}

        {/* Content area */}
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
          <div className="bg-white rounded-xl p-12 text-center">
            <p className="text-sm text-[#64748B] mb-4">
              {locale === "et" ? "Selles kategoorias tooteid ei leitud." : "No products found in this category."}
            </p>
            <Link
              href={`/${locale}`}
              className="text-[#D97706] hover:underline font-medium"
            >
              {locale === "et" ? "Sirvi kategooriaid" : "Browse all categories"}
            </Link>
          </div>
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
