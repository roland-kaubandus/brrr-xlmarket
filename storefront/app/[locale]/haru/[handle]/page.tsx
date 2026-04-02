import Link from "next/link"
import { notFound } from "next/navigation"
import { getProducts, getCategories } from "@/lib/medusa"
import { searchProducts } from "@/lib/meilisearch"
import { BRANCHES, getBranchBySlug } from "@/lib/branches"
import ProductCard from "@/components/ProductCard"
import CategoryFilters from "@/components/CategoryFilters"

export const revalidate = 300
const BRANCH_PRODUCTS_PREVIEW = 24
const SUBCATEGORY_PRODUCTS_PREVIEW = 6
const ITEMS_PER_PAGE = 24

function mapSearchHitToProduct(hit: any) {
  return {
    id: hit.id,
    title: hit.title,
    handle: hit.handle,
    description: hit.description,
    thumbnail: hit.thumbnail,
    images: [],
    variants: [
      {
        id: hit.id + "_v",
        title: "Default",
        calculated_price: {
          calculated_amount: Math.round(hit.price * 100),
          original_amount: Math.round(hit.price * 100),
          currency_code: "eur",
        },
      },
    ],
    categories: hit.categories.map((name: string, i: number) => ({
      id: `cat_${i}`,
      name,
      handle: hit.category_handles?.[i] || "",
      parent_category_id: null,
    })),
    created_at: new Date(hit.created_at * 1000).toISOString(),
  }
}

type Props = {
  params: Promise<{ handle: string; locale: string }>
  searchParams: Promise<{ leht?: string; sort?: string; min?: string; max?: string; cat?: string; in_stock?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { handle, locale } = await params
  const branch = getBranchBySlug(handle)
  if (!branch) return { title: "Haru — XL Market" }
  return {
    title: `${branch.name} — XL Market`,
    description: branch.description,
    openGraph: {
      title: `${branch.name} — XL Market`,
      description: branch.description,
      type: "website",
      images: [{ url: branch.heroImg, width: 1600, height: 900, alt: branch.name }],
    },
  }
}

export function generateStaticParams() {
  return BRANCHES.map((b) => ({ handle: b.slug }))
}

const SORT_MAP: Record<string, string[]> = {
  odavamad: ["price:asc"],
  kallimad: ["price:desc"],
  uusimad: ["created_at:desc"],
}

export default async function BranchLandingPage({ params, searchParams }: Props) {
  const { handle, locale } = await params
  const { leht, sort, min, max, cat, in_stock } = await searchParams
  const branch = getBranchBySlug(handle)
  if (!branch) notFound()

  const allCategories = await getCategories()
  const page = Math.max(1, parseInt(leht || "1", 10) || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE
  const currentSort = sort || ""
  const currentInStock = in_stock === "1"

  const parentCategory = branch.categoryHandle
    ? allCategories.find((c) => c.handle === branch.categoryHandle) ?? null
    : null

  const subcategories = parentCategory
    ? allCategories.filter((c) => c.parent_category_id === parentCategory.id)
    : []
  const selectedSubcategory = cat
    ? subcategories.find((subcategory) => subcategory.handle === cat) ?? null
    : null
  const branchFilters = [`category_handles = "${branch.categoryHandle}"`]
  if (selectedSubcategory) branchFilters.push(`category_handles = "${selectedSubcategory.handle}"`)
  if (min) branchFilters.push(`price >= ${parseFloat(min)}`)
  if (max) branchFilters.push(`price <= ${parseFloat(max)}`)
  if (currentInStock) branchFilters.push("in_stock = true")

  let products: any[] = []
  let totalCount = 0
  let facetDistribution: Record<string, Record<string, number>> | undefined
  let facetStats: Record<string, { min: number; max: number }> | undefined

  if (branch.categoryHandle) {
    try {
      const meiliResult = await searchProducts({
        q: "",
        limit: ITEMS_PER_PAGE,
        offset,
        filter: branchFilters,
        sort: SORT_MAP[currentSort] || ["created_at:desc"],
        facets: ["category_handles", "price", "in_stock"],
      })
      totalCount = meiliResult.totalHits || meiliResult.estimatedTotalHits || 0
      facetDistribution = meiliResult.facetDistribution
      facetStats = meiliResult.facetStats
      products = meiliResult.hits.map(mapSearchHitToProduct)
    } catch {
      if (parentCategory) {
        const res = await getProducts({ category_id: [parentCategory.id], limit: ITEMS_PER_PAGE, offset, order: "-created_at" })
        products = res.products
        totalCount = res.count
      }
    }
  }

  // Fetch products grouped by subcategory
  type SubcategoryGroup = { category: { id: string; name: string; handle: string }; products: any[]; count: number }
  const subcategoryProducts: SubcategoryGroup[] = []

  if (subcategories.length > 0) {
    const subFetches = subcategories.map(async (sub) => {
      try {
        const meiliResult = await searchProducts({
          q: "",
          limit: SUBCATEGORY_PRODUCTS_PREVIEW,
          offset: 0,
          filter: [`category_handles = "${sub.handle}"`],
          sort: ["created_at:desc"],
        })
        const subProducts = meiliResult.hits.map(mapSearchHitToProduct)
        if (subProducts.length > 0) {
          return { category: sub, products: subProducts, count: meiliResult.totalHits || meiliResult.estimatedTotalHits || 0 }
        }
        return null
      } catch { return null }
    })
    const results = await Promise.all(subFetches)
    for (const r of results) { if (r) subcategoryProducts.push(r) }
    subcategoryProducts.sort((a, b) => b.count - a.count)
  }

  const otherBranches = BRANCHES.filter((b) => b.slug !== handle).slice(0, 5)
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE))
  const priceRange = facetStats?.price
    ? { min: Math.floor(facetStats.price.min), max: Math.ceil(facetStats.price.max) }
    : undefined
  const activeBrowseFilters = Boolean(currentSort || min || max || currentInStock || selectedSubcategory || page > 1)
  const categoryCounts = facetDistribution?.category_handles || {}

  function branchUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const nextPage = overrides.leht ?? String(page)
    const nextSort = overrides.sort ?? currentSort
    const nextMin = overrides.min ?? min ?? ""
    const nextMax = overrides.max ?? max ?? ""
    const nextCat = overrides.cat ?? selectedSubcategory?.handle ?? ""
    const nextInStock = overrides.in_stock ?? (currentInStock ? "1" : "")

    if (nextPage && nextPage !== "1") params.set("leht", nextPage)
    if (nextSort) params.set("sort", nextSort)
    if (nextMin) params.set("min", nextMin)
    if (nextMax) params.set("max", nextMax)
    if (nextCat) params.set("cat", nextCat)
    if (nextInStock) params.set("in_stock", nextInStock)

    const query = params.toString()
    return query ? `/${locale}/haru/${handle}?${query}` : `/${locale}/haru/${handle}`
  }

  return (
    <>
      {/* HERO */}
      <section className="relative h-[420px] md:h-[520px] overflow-hidden">
        <img
          src={branch.heroImg}
          alt={branch.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${branch.heroGradient}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 h-full flex flex-col justify-end pb-12 md:pb-16">
          <nav className="text-[12px] text-white/50 mb-6" aria-label="Leheasukoht">
            <Link href={`/${locale}`} className="hover:text-white transition-colors">Avaleht</Link>
            <span className="mx-2">/</span>
            <span className="text-white/80">{branch.name}</span>
          </nav>

          <span className="inline-block text-[11px] uppercase tracking-[0.2em] font-semibold text-accent mb-3">Valdkond</span>
          <h1 className="font-[family-name:var(--font-outfit)] font-[800] text-4xl md:text-6xl text-white tracking-tighter leading-[1.05] mb-4">
            {branch.name}
          </h1>
          <p className="font-[family-name:var(--font-outfit)] font-[300] text-xl md:text-2xl text-white/70 tracking-tight mb-2 max-w-2xl">
            {branch.tagline}
          </p>
          <p className="text-white/50 text-sm md:text-base max-w-xl leading-relaxed">
            {branch.description}
          </p>

          {branch.categoryHandle && totalCount > 0 && (
            <div className="mt-6 flex items-center gap-4">
              <Link
                href={`/${locale}/kategooriad/${branch.categoryHandle}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-xl btn-press transition-all duration-300"
              >
                {"Vaata k\u00f5iki tooteid"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
              <span className="text-white/40 text-sm">{totalCount.toLocaleString("et-EE")} toodet</span>
            </div>
          )}
        </div>
      </section>

      {/* TRUST BADGES */}
      {branch.categoryHandle && (
        <div className="bg-white border-b border-soft-border">
          <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {[
              { icon: "\u2713", text: "Professionaalne kvaliteet" },
              { icon: "\u26A1", text: "Kiire tarne" },
              { icon: "\u2699", text: "Varuosad saadaval" },
              { icon: "\u260E", text: "Eksperdi n\u00f5uanne" },
            ].map((badge) => (
              <div key={badge.text} className="flex items-center gap-2 text-sm text-muted">
                <span className="w-5 h-5 bg-accent/10 rounded-full flex items-center justify-center text-accent text-xs">{badge.icon}</span>
                <span>{badge.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORY CARDS */}
      {subcategories.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <h2 className="font-[family-name:var(--font-outfit)] font-[700] text-2xl md:text-3xl tracking-tight">Kategooriad</h2>
                <p className="text-muted text-sm mt-2">Sirvi kogu valdkonda alamkategooriate kaupa.</p>
              </div>
              {branch.categoryHandle && (
                <Link
                  href={`/${locale}/kategooriad/${branch.categoryHandle}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-dark transition-colors"
                >
                  Vaata kogu valdkonda
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              <Link
                href={branchUrl({ cat: "", leht: "1" })}
                className={`group flex min-h-[152px] flex-col items-center justify-center py-6 rounded-2xl border card-lift transition-all duration-300 text-center ${
                  !selectedSubcategory
                    ? "border-accent bg-accent-light"
                    : "bg-silver hover:bg-accent-light border-transparent hover:border-accent/10"
                }`}
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={!selectedSubcategory ? "text-accent" : "text-muted group-hover:text-accent transition-colors"}>
                    <path d="M3 12h18"/><path d="M12 3v18"/>
                  </svg>
                </div>
                <span className={`text-sm font-semibold px-2 line-clamp-2 ${!selectedSubcategory ? "text-accent" : "text-off-black group-hover:text-accent transition-colors duration-300"}`}>
                  Kõik kategooriad
                </span>
                <span className="text-xs text-muted mt-1">{totalCount.toLocaleString("et-EE")} toodet</span>
              </Link>
              {subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={branchUrl({ cat: sub.handle, leht: "1" })}
                  className={`group flex min-h-[152px] flex-col items-center justify-center py-6 rounded-2xl border card-lift transition-all duration-300 text-center ${
                    selectedSubcategory?.handle === sub.handle
                      ? "border-accent bg-accent-light"
                      : "bg-silver hover:bg-accent-light border-transparent hover:border-accent/10"
                  }`}
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)] group-hover:shadow-[0_4px_16px_rgba(249,115,22,0.12)] transition-shadow duration-300">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={selectedSubcategory?.handle === sub.handle ? "text-accent" : "text-muted group-hover:text-accent transition-colors"}>
                      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3l-4 4-4-4"/>
                    </svg>
                  </div>
                  <span className={`text-sm font-semibold px-2 line-clamp-2 ${selectedSubcategory?.handle === sub.handle ? "text-accent" : "text-off-black group-hover:text-accent transition-colors duration-300"}`}>
                    {sub.name}
                  </span>
                  <span className="text-xs text-muted mt-1">{(categoryCounts[sub.handle] || 0).toLocaleString("et-EE")} toodet</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PRODUCTS BY CATEGORY */}
      {!activeBrowseFilters && subcategoryProducts.length > 0 ? (
        <>
          {subcategoryProducts.map((catGroup, idx) => (
            <section key={catGroup.category.id} className={`py-16 md:py-24 ${idx % 2 === 0 ? "bg-white" : "bg-off-white"}`}>
              <div className="max-w-[1400px] mx-auto px-4">
                <div className="flex items-end justify-between mb-10">
                  <div>
                    <h2 className="font-[family-name:var(--font-outfit)] font-[700] text-2xl md:text-3xl tracking-tight">
                      {catGroup.category.name}
                    </h2>
                    <p className="text-muted text-sm mt-1">{catGroup.count} toodet</p>
                  </div>
                  <Link
                    href={`/${locale}/kategooriad/${catGroup.category.handle}`}
                    className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-dark transition-colors"
                  >
                    {"Vaata k\u00f5iki"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {catGroup.products.map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </>
      ) : null}

      {branch.categoryHandle ? (
        <section className={`py-16 md:py-24 ${subcategoryProducts.length > 0 ? "bg-white border-t border-soft-border" : "bg-white"}`}>
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
              <div>
                <h2 className="font-[family-name:var(--font-outfit)] font-[700] text-2xl md:text-3xl tracking-tight">
                  {selectedSubcategory ? `${selectedSubcategory.name} tooted` : "Kõik selle valdkonna tooted"}
                </h2>
                <p className="text-muted text-sm mt-2">
                  Kuvame siin {products.length} toodet {totalCount.toLocaleString("et-EE")} tootest.
                  {priceRange && (
                    <span className="ml-2">
                      ({priceRange.min}€ – {priceRange.max}€)
                    </span>
                  )}
                </p>
              </div>
              {branch.categoryHandle && (
                <Link
                  href={`/${locale}/kategooriad/${branch.categoryHandle}`}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-xl btn-press transition-all duration-300"
                >
                  Sirvi kõiki tooteid
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              )}
            </div>

            <CategoryFilters
              currentSort={currentSort}
              currentMin={min}
              currentMax={max}
              currentInStock={currentInStock}
              basePath={`/${locale}/haru/${handle}`}
              totalProducts={totalCount}
              heading="Valdkonna filtrid"
              showInStockToggle
              preservedParams={selectedSubcategory ? { cat: selectedSubcategory.handle } : undefined}
            />

            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-soft-border bg-silver px-6 py-12 text-center">
                <h3 className="font-[family-name:var(--font-outfit)] font-[700] text-xl text-off-black mb-2">
                  Selle filtriga tooteid ei leitud
                </h3>
                <p className="text-sm text-muted max-w-xl mx-auto mb-5">
                  Proovi teist alamkategooriat, laiemaid hinnapiire või tühista aktiivsed filtrid.
                </p>
                <Link
                  href={`/${locale}/haru/${handle}`}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-xl btn-press transition-all duration-300"
                >
                  Tühista kõik filtrid
                </Link>
              </div>
            )}

            {products.length > 0 && totalPages > 1 && (
              <nav className="flex justify-center items-center gap-3 mt-10" aria-label="Leheküljed">
                {page > 1 && (
                  <Link
                    href={branchUrl({ leht: String(page - 1) })}
                    className="px-4 py-2.5 border border-soft-border text-sm font-medium text-off-black hover:border-accent hover:text-accent transition-colors rounded-xl"
                  >
                    &larr; Eelmine
                  </Link>
                )}
                <span className="text-sm text-muted">
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={branchUrl({ leht: String(page + 1) })}
                    className="px-4 py-2.5 border border-soft-border text-sm font-medium text-off-black hover:border-accent hover:text-accent transition-colors rounded-xl"
                  >
                    Järgmine &rarr;
                  </Link>
                )}
              </nav>
            )}
          </div>
        </section>
      ) : (
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-[1400px] mx-auto px-4 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-silver rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h2 className="font-[family-name:var(--font-outfit)] font-[600] text-xl mb-3">Varsti saadaval</h2>
              <p className="text-muted text-sm leading-relaxed mb-6">Sortiment on tulekul. Teavitame, kui tooted on saadaval.</p>
              <Link href={`/${locale}/kategooriad`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-silver hover:bg-accent-light text-sm font-medium rounded-xl transition-all duration-300">
                Vaata kategooriaid
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* EXPLORE OTHER BRANCHES */}
      <section className="py-16 md:py-24 bg-silver">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="mb-10">
            <span className="inline-block text-[11px] uppercase tracking-[0.2em] font-semibold text-accent mb-3">Avasta veel</span>
            <h2 className="font-[family-name:var(--font-outfit)] font-[700] text-2xl md:text-3xl tracking-tight">
              Teised valdkonnad
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {otherBranches.map((b) => (
              <Link
                key={b.slug}
                href={`/${locale}/haru/${b.slug}`}
                className="group relative rounded-2xl overflow-hidden min-h-[180px]"
              >
                <img
                  src={b.heroImg}
                  alt={b.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 branch-card-overlay" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-[family-name:var(--font-outfit)] font-bold text-base text-white tracking-tight mb-0.5">
                    {b.name}
                  </h3>
                  <p className="text-white/50 text-xs">{b.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
