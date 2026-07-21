import Link from "@/components/SafeLink"
import { Suspense } from "react"
import { getCategoryByHandle } from "@/lib/medusa"
import { searchProducts, isSafeHandleToken, getProductTitle } from "@/lib/meilisearch"
import ProductGrid from "@/components/ProductGrid"
import VevorSearchFilters from "@/components/search/VevorSearchFilters"
import VevorPagination from "@/components/search/VevorPagination"
import SortSelect from "@/components/search/SortSelect"
import { notFound } from "next/navigation"
import JsonLdCategory from "@/components/JsonLdCategory"
import JsonLdBreadcrumb from "@/components/JsonLdBreadcrumb"
import SubcategoryCarousel from "@/components/category/SubcategoryCarousel"
import SpecComparisonTable from "@/components/category/SpecComparisonTable"
import CategoryTreeNav from "@/components/category/CategoryTreeNav"
import CategoryBottomRibbons from "@/components/category/CategoryBottomRibbons"
import { categoryPath } from "@/lib/i18n"
import { buildQuickFilters } from "@/lib/quick-filters"
import { buildFilterGroups } from "@/lib/filter-groups"
import {
  getNode,
  getChildren,
  getL1Ancestor,
  getBreadcrumbTrail,
  getChildrenWithProductCounts,
  getAllL1,
  nodeName,
  type ChildWithCount,
} from "@/lib/category-tree"

export const revalidate = 3600

/**
 * Pre-renderda L1 + L2 kategooriad build-ajal (mõlemad keeled). Väldib külma
 * ISR-renderit deploy-aknas (kui medusa veel bootib) → ei teki gateway timeout
 * (nt salon-spa-wellness 7-9s probleem 2026-06-06). L3+ jäävad on-demand ISR.
 */
export async function generateStaticParams() {
  const out: { locale: string; handle: string }[] = []
  for (const locale of ["et", "en"]) {
    for (const l1 of getAllL1()) {
      out.push({ locale, handle: l1.handle })
      for (const l2 of getChildren(l1.handle)) {
        out.push({ locale, handle: l2.handle })
      }
    }
  }
  return out
}

type Props = {
  params: Promise<{ handle: string; locale: string }>
  searchParams: Promise<{
    page?: string; sort?: string; min?: string; max?: string
    q?: string; categories?: string; in_stock?: string; filters?: string
    from?: string
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
    ? nodeName(node, locale)
    : (category?.name || humanize(handle))
  const nodeDesc = node?.description_en ?? node?.tagline_en
  const desc =
    nodeDesc ||
    `${displayName} — professional equipment at great prices. Fast delivery in Estonia.`
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
  // H5: whitelist-validate route param before using it in any Meili filter
  // string. Hard 404 on malformed handles to avoid filter injection.
  if (!isSafeHandleToken(handle)) notFound()
  const { page: pageParam, sort, min, max, q, categories, in_stock, filters, from } = await searchParams

  // H4: `from` search param is the child handle the user just navigated from.
  // Used by SubcategoryCarousel to scroll that card into view. Guarded by the
  // same handle whitelist — anything odd is dropped.
  const previousHandle = from && isSafeHandleToken(from) ? from : undefined

  // Hierarchy lookup from taxonomy.yaml SSoT (sync, in-memory).
  const node = getNode(handle)
  const category = node ? null : await getCategoryByHandle(handle)
  const l1 = node ? getL1Ancestor(handle) : null

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE
  const currentSort = sort || ""
  // H5: whitelist-validate each selected category handle before it enters the
  // Meili filter string. Drop anything that fails the token regex silently.
  const selectedCategories = categories
    ? categories.split(",").filter(Boolean).filter(isSafeHandleToken)
    : []
  const inStock = in_stock === "1"
  const currentQuickFilter = filters?.trim() || ""

  // --- Build Meili filter strings ---
  // Spec §3.5.6 + INV-28: category page MUST filter on `taxonomy.ancestors`
  // (array containing every ancestor L1..Ln inclusive) so equality matches
  // all products rooted at `handle` regardless of their directly-tagged leaf.
  const baseCategoryFilter = `taxonomy.ancestors = "${handle}"`
  const searchFilters: string[] = [baseCategoryFilter]
  // H1: reject NaN/Infinity/negative before they reach Meili. parseFloat("NaN")
  // would inject `price >= NaN` and either error or silently zero the grid.
  if (min) {
    const minVal = Number(min)
    if (isFinite(minVal) && minVal >= 0) searchFilters.push(`price >= ${minVal}`)
  }
  if (max) {
    const maxVal = Number(max)
    if (isFinite(maxVal) && maxVal >= 0) searchFilters.push(`price <= ${maxVal}`)
  }
  if (inStock) searchFilters.push("in_stock = true")
  // Vasak KATEGOORIAD-filter = handle-põhine (taxonomy.ancestors). Iga valik läheb
  // ERALDI tavaelemendina (mitte "(a OR b)" ümbris) — /api/products parseFilter loeb
  // AINULT lihtsaid `väli = "väärtus"` paare (";"-eraldus = AND); sulg/OR lükati maha
  // → klõps ei kitsendanud. Mitmikvalik = AND (ristumine); üksikvalik (tavajuht) = õige.
  for (const c of selectedCategories) {
    searchFilters.push(`taxonomy.ancestors = "${c.replace(/"/g, '\\"')}"`)
  }
  if (currentQuickFilter) {
    // Multi-select: comma-separated tokens become AND conditions.
    const activeTokens = currentQuickFilter.split(",").map(s => s.trim()).filter(Boolean)
    for (const token of activeTokens) {
      searchFilters.push(`filter_tokens = "${token.replace(/"/g, '\\"')}"`)
    }
  }
  const searchFilterStr = searchFilters.join(";")
  const sortStr = (SORT_MAP[currentSort] || [])[0] || ""

  // --- Meili facet query (limit:0) — child counts + total + quick filters ---
  let totalCount = 0
  let rawAncestorFacets: Record<string, number> = {}
  let quickFilterFacets: Record<string, number> = {}
  try {
    const meiliResult = await searchProducts({
      q: q || "",
      limit: 0,
      offset: 0,
      sort: SORT_MAP[currentSort] || undefined,
      filter: searchFilters,
      facets: [
        "taxonomy.ancestors",
        "price",
        "in_stock",
        "filter_tokens",
      ],
    })
    totalCount = meiliResult.totalHits || meiliResult.estimatedTotalHits || 0
    const fd = meiliResult.facetDistribution || {}
    rawAncestorFacets = fd["taxonomy.ancestors"] || {}
    quickFilterFacets = fd["filter_tokens"] || {}

    // Adaptive filters: disjunctive facet pattern. When the user selects
    // tokens (AND across groups), we still want to show *alternative*
    // options within each group. Re-query facets without the filter_tokens
    // clauses so non-active options don't disappear.
    if (currentQuickFilter) {
      const filtersWithoutTokens = searchFilters.filter(
        (f) => !f.startsWith("filter_tokens ")
      )
      const disjRes = await searchProducts({
        q: q || "",
        limit: 0,
        offset: 0,
        filter: filtersWithoutTokens,
        facets: ["filter_tokens"],
      })
      quickFilterFacets = disjRes.facetDistribution?.["filter_tokens"] || quickFilterFacets
    }
  } catch {
    // MeiliSearch unavailable — leave counts empty; page still renders.
  }

  // Akordioni (CategoryTreeNav) tootearvud — ÜKS globaalne scope-vaba facet (identne igal
  // lehel, ISR-cached revalidate 3600 → mitte per-request koormus). l1_slug (25) + l2_slug
  // (224) = TÄPSED (alla 500-cap → ei truncate'i). taxonomy.ancestors EI SOBI: see
  // truncate'itakse 500-le ALFABEETILISELT → hilise-tähestiku L1-d (v4-suurkoog…) kaovad
  // suurest tootearvust hoolimata. l3_slug (1667) on best-effort (top-500), aga L3-arv
  // pole akordionis kriitiline (nimi kuvatakse ka ilma arvuta).
  let globalCatCounts: Record<string, number> = {}
  try {
    const g = await searchProducts({ q: "", limit: 0, offset: 0, facets: ["taxonomy.l1_slug", "taxonomy.l2_slug", "taxonomy.l3_slug"] })
    const fd = g.facetDistribution || {}
    globalCatCounts = { ...(fd["taxonomy.l3_slug"] || {}), ...(fd["taxonomy.l2_slug"] || {}), ...(fd["taxonomy.l1_slug"] || {}) }
  } catch {
    // Meili puudub — akordion töötab ilma arvudeta (navigatsioon SSoT-st).
  }

  // Spec-võrdlus (piloot: Õhukompressorid) — too selle kategooria tooted compare_specs'iga.
  // Komponent SpecComparisonTable renderdub AINULT kui ≥2 tootel on compare_specs → auto-peidus
  // kategooriates kus spece pole. Kerge päring (limit 30, current-scope).
  let compareProducts: Array<{ handle: string; title: string; thumbnail?: string | null; compare_specs?: Record<string, unknown> | null }> = []
  try {
    const cp = await searchProducts({ q: q || "", limit: 30, offset: 0, filter: searchFilters, sort: SORT_MAP[currentSort] || undefined })
    compareProducts = (cp.hits || [])
      .filter((h) => (h as { compare_specs?: unknown }).compare_specs)
      .map((h) => ({
        handle: h.handle,
        title: getProductTitle(h, locale),
        thumbnail: h.thumbnail || null,
        compare_specs: (h as { compare_specs?: Record<string, unknown> }).compare_specs,
      }))
  } catch {
    // Meili puudub — võrdlustabel jääb tühjaks (ei renderdu).
  }

  // --- Build subcategory carousel data (INV-25: filter 0-count children) ---
  const childrenWithCounts: ChildWithCount[] = node
    ? getChildrenWithProductCounts(handle, rawAncestorFacets)
    : []
  const hasCarousel = childrenWithCounts.length > 0

  // KATEGOORIAD vasak-filter = HANDLE-põhine `taxonomy.ancestors` facet jooksva
  // kategooria scope's. Sama kategooria-hulk mis otsingu `categories` facet, AGA
  // handle-võtmega — sest /api/products allowlist aktsepteerib AINULT handle-välju
  // + isSafeHandleToken (kategooria-NIMED tühiku/äöü-ga lükati 400/maha → klõps ei
  // kitsendanud). Scope = jooksva kategooria tooted → sisaldab ancestoreid → EI kao
  // tühjaks ühelgi tasandil (L3-l ancestorid alles), erinevalt childrenWithCounts'ist.
  const categoryFacets: Record<string, number> = {}
  const categoryLabels: Record<string, string> = {}
  for (const [h, count] of Object.entries(rawAncestorFacets)) {
    if (h === handle || count <= 0) continue // jäta praegune kategooria välja
    const cn = getNode(h)
    if (!cn) continue // ainult SSoT-tuntud handle → korralik nimi (mitte toores handle)
    categoryFacets[h] = count
    categoryLabels[h] = nodeName(cn, locale)
  }

  // No products AND unknown to SSoT AND Medusa → 404
  if (totalCount === 0 && !node && !category) notFound()

  const displayName = node
    ? nodeName(node, locale)
    : (category?.name || humanize(handle))

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const categoryBasePath = categoryPath(locale as "et" | "en", handle)
  const quickFilters = buildQuickFilters(quickFilterFacets, totalCount)
  const filterGroups = buildFilterGroups(quickFilterFacets)

  // Breadcrumb trail from SSoT — root → node inclusive. INV-24, INV-27.
  const trail = node
    ? getBreadcrumbTrail(handle, locale)
    : [{ handle, name: displayName }]

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
        url={`https://xlmarket.ee${categoryPath(locale as "et" | "en", handle)}`}
        productCount={totalCount}
      />
      <JsonLdBreadcrumb
        items={[
          { name: "Home", url: `https://xlmarket.ee/${locale}` },
          ...trail.map((t) => ({
            name: t.name,
            url: `https://xlmarket.ee${categoryPath(locale as "et" | "en", t.handle)}`,
          })),
        ]}
      />

      {/* Breadcrumb + Title row — Home > …trail + H1 + product count */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 pt-5">
        <nav
          className="text-[15px] text-[#64748B] flex items-center flex-wrap gap-y-1 mb-4"
          aria-label="Breadcrumb"
        >
          <Link
            href={`/${locale}`}
            className="text-[#64748B] hover:text-[#0b7d79] transition-colors duration-200"
          >
            {locale === "et" ? "Avaleht" : "Home"}
          </Link>
          {trail.map((t, idx) => {
            const isLast = idx === trail.length - 1
            return (
              <span key={t.handle} className="flex items-center">
                <span className="mx-2.5 text-[#CBD5E1]">&rsaquo;</span>
                {isLast ? (
                  <span className="text-[#1a1a2e] font-semibold">{t.name}</span>
                ) : (
                  <Link
                    href={categoryPath(locale as "et" | "en", t.handle)}
                    className="text-[#64748B] hover:text-[#0b7d79] transition-colors duration-200"
                  >
                    {t.name}
                  </Link>
                )}
              </span>
            )
          })}
        </nav>
        <div className="pt-2 pb-6 md:pt-4 md:pb-8">
          <h1 className="text-[28px] md:text-[34px] font-bold text-[#1a1a2e] tracking-tight leading-tight">
            {displayName}
          </h1>
        </div>
      </div>

      {/* Full-width subcategory carousel (spec §3.5.4). Self-hides on leaves. */}
      {hasCarousel && (
        <div className="mt-5">
          <SubcategoryCarousel
            children={childrenWithCounts}
            locale={locale}
            l1Handle={l1?.handle}
            currentHandle={handle}
            previousHandle={previousHandle}
          />
        </div>
      )}

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-7 sm:py-10">
        {/* Toolbar row: sort + mobile filter button (result count moved above grid) */}
        <div className="flex items-center justify-end gap-2 mb-6 flex-wrap">
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
                filterGroups={filterGroups}
                currentQuickFilter={currentQuickFilter}
                locale={locale}
                basePath={categoryBasePath}
                suppressSubcategoryFacet={true}
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

        {totalCount > 0 ? (
          <div className="flex gap-8">
            {/* Desktop sidebar */}
            <aside className="hidden md:block w-[260px] flex-shrink-0">
              <div className="sticky top-4 space-y-3">
                <CategoryTreeNav currentHandle={handle} locale={locale} counts={globalCatCounts} />
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
                    filterGroups={filterGroups}
                    currentQuickFilter={currentQuickFilter}
                    locale={locale}
                    basePath={categoryBasePath}
                    suppressSubcategoryFacet={true}
                  />
                </Suspense>
              </div>
            </aside>

            {/* Main content — products + pagination (no inline subcat grid; carousel above handles it). */}
            <main className="flex-1 min-w-0">
              {/* Mobiil: kategooria-akordion kokkupandavas paneelis (desktopil vasak-sidebaris) */}
              <details className="md:hidden mb-4 group">
                <summary className="flex items-center justify-between cursor-pointer bg-white rounded-xl border border-[#E2E8F0] px-4 py-3 text-[14px] font-semibold text-[#1a1a2e] list-none">
                  {locale === "et" ? "Kategooriad" : "Categories"}
                  <span aria-hidden className="text-[#94A3B8] group-open:rotate-90 transition-transform">&rsaquo;</span>
                </summary>
                <div className="mt-2">
                  <CategoryTreeNav currentHandle={handle} locale={locale} counts={globalCatCounts} />
                </div>
              </details>
              {/* Spec-võrdlustabel (renderdub ainult kui ≥2 tootel compare_specs — nt Õhukompressorid) */}
              <SpecComparisonTable products={compareProducts} locale={locale} />
              <div className="mb-4 text-sm text-[#64748B]">
                <span className="font-semibold text-[#1a1a2e]">
                  {totalCount.toLocaleString("et")}
                </span>{" "}
                {locale === "et" ? "toodet" : "products"}
              </div>
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
                columns="2-3-4-4"
              />

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
              className="text-[#0b7d79] hover:underline font-medium"
            >
              {locale === "et" ? "Sirvi kõiki kategooriaid" : "Browse all categories"}
            </Link>
          </div>
        )}

        {/* Bottom ribbons: History / Deals / Best sellers — Implementer-B delivers. */}
        {l1 && (
          <CategoryBottomRibbons l1Handle={l1.handle} locale={locale} />
        )}
      </div>
    </div>
  )
}
