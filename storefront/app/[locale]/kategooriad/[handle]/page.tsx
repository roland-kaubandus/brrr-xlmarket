import Link from "next/link"
import Image from "next/image"
import { Suspense } from "react"
import { getCategoryByHandle, getProducts } from "@/lib/medusa"
import { searchProducts, getLocalizedTitle } from "@/lib/meilisearch"
import VevorProductCard from "@/components/VevorProductCard"
import VevorSearchFilters from "@/components/search/VevorSearchFilters"
import VevorPagination from "@/components/search/VevorPagination"
import { notFound } from "next/navigation"
import JsonLdCategory from "@/components/JsonLdCategory"
import categoryImages from "@/lib/category-images.json"

const CATEGORY_IMAGES: Record<string, string> = categoryImages as Record<string, string>

export const revalidate = 300

const CATEGORY_NAMES: Record<string, string> = {}

type Props = {
  params: Promise<{ handle: string; locale: string }>
  searchParams: Promise<{
    page?: string; sort?: string; min?: string; max?: string
    q?: string; categories?: string; in_stock?: string
  }>
}

function humanize(handle: string): string {
  return handle
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function generateMetadata({ params }: Props) {
  const { handle } = await params
  const category = await getCategoryByHandle(handle)
  const displayName = category
    ? (CATEGORY_NAMES[handle] || category.name)
    : humanize(handle)
  const { locale } = await params
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
  const { page: pageParam, sort, min, max, q, categories, in_stock } = await searchParams

  // Try Medusa category first (for subcategories, ancestors, etc.)
  const category = await getCategoryByHandle(handle)

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE
  const currentSort = sort || ""
  const selectedCategories = categories ? categories.split(",").filter(Boolean) : []
  const inStock = in_stock === "1"

  let products: any[] = []
  let totalCount = 0
  let usedMeili = false
  let categoryFacets: Record<string, number> = {}

  // Primary: MeiliSearch — works for ALL category handles (Medusa + auto-generated)
  try {
    const filters: string[] = [`category_handles = "${handle}"`]
    if (min) filters.push(`price >= ${parseFloat(min)}`)
    if (max) filters.push(`price <= ${parseFloat(max)}`)
    if (inStock) filters.push("in_stock = true")
    if (selectedCategories.length > 0) {
      const catFilters = selectedCategories.map(c => `categories = "${c.replace(/"/g, '\\"')}"`)
      filters.push(`(${catFilters.join(" OR ")})`)
    }

    const meiliResult = await searchProducts({
      q: q || "",
      limit: ITEMS_PER_PAGE,
      offset,
      sort: SORT_MAP[currentSort] || undefined,
      filter: filters,
      facets: ["categories", "price", "in_stock"],
    })

    totalCount = meiliResult.totalHits || meiliResult.estimatedTotalHits || 0
    usedMeili = true
    categoryFacets = meiliResult.facetDistribution?.categories || {}

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
        id: `cat_${i}`, name, handle: hit.category_handles?.[i] || "", parent_category_id: null,
      })),
      created_at: new Date(hit.created_at * 1000).toISOString(),
    }))
  } catch {
    // Fallback to Medusa API (only works if Medusa category exists)
    if (category) {
      const productsRes = await getProducts({
        category_id: [category.id],
        limit: ITEMS_PER_PAGE,
        offset,
        order: "-created_at",
      })
      products = productsRes.products
      totalCount = productsRes.count
    }
  }

  // No products found AND no Medusa category → 404
  if (totalCount === 0 && !category) notFound()

  const displayName = category
    ? (CATEGORY_NAMES[handle] || category.name)
    : humanize(handle)

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const categoryBasePath = `/${locale}/kategooriad/${handle}`

  // Fetch thumbnail for each subcategory (first product in that category)
  const subcatThumbs: Record<string, string> = {}
  if (category?.category_children?.length) {
    const thumbResults = await Promise.all(
      category.category_children.slice(0, 30).map(async (child) => {
        if (CATEGORY_IMAGES[child.handle]) return { handle: child.handle, thumb: null }
        try {
          // Try MeiliSearch first
          const res = await searchProducts({
            q: "",
            limit: 1,
            filter: [`category_handles = "${child.handle}"`],
            attributesToHighlight: [],
          })
          if (res.hits[0]?.thumbnail) return { handle: child.handle, thumb: res.hits[0].thumbnail }
          // Fallback: try Medusa API with category ID
          const medusaRes = await getProducts({ limit: 1, category_id: [child.id] })
          return { handle: child.handle, thumb: medusaRes.products[0]?.thumbnail || null }
        } catch { return { handle: child.handle, thumb: null } }
      })
    )
    for (const r of thumbResults) {
      if (r.thumb) subcatThumbs[r.handle] = r.thumb
    }
  }

  // Fetch "You May Also Like" products from a parent/sibling category
  let youMayAlsoLike: any[] = []
  try {
    // Use parent category if available, otherwise same L1 category
    const parentHandle = category?.parent_category?.handle || handle
    const alsoLikeResult = await searchProducts({
      q: "",
      limit: 5,
      offset: Math.floor(Math.random() * 20),
      filter: [`category_handles = "${parentHandle}"`, `category_handles != "${handle}"`],
    })
    youMayAlsoLike = alsoLikeResult.hits.map(hit => ({
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
        id: `cat_${i}`, name, handle: hit.category_handles?.[i] || "", parent_category_id: null,
      })),
      created_at: new Date(hit.created_at * 1000).toISOString(),
    }))
  } catch { /* ignore */ }

  function buildPageUrl(targetPage: number) {
    const p = new URLSearchParams()
    if (targetPage > 1) p.set("page", String(targetPage))
    if (currentSort) p.set("sort", currentSort)
    if (min) p.set("min", min)
    if (max) p.set("max", max)
    if (q) p.set("q", q)
    if (categories) p.set("categories", categories)
    if (inStock) p.set("in_stock", "1")
    const qs = p.toString()
    return `${categoryBasePath}${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="bg-white min-h-screen">
      <JsonLdCategory
        name={displayName}
        url={`https://xlmarket.store/${locale}/kategooriad/${handle}`}
        productCount={totalCount}
      />
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb — full ancestor chain (if Medusa category exists) */}
        <nav className="text-xs text-[#64748B] mb-4">
          <Link href={`/${locale}`} className="hover:text-[#D97706]">{locale === "et" ? "Avaleht" : "Home"}</Link>
          {category && (() => {
            const ancestors: Array<{ name: string; handle: string }> = []
            let parent = category.parent_category
            while (parent) {
              ancestors.unshift({ name: parent.name, handle: parent.handle })
              parent = (parent as any).parent_category
            }
            return ancestors.map((a) => (
              <span key={a.handle}>
                <span className="mx-1.5">&gt;</span>
                <Link href={`/${locale}/kategooriad/${a.handle}`} className="hover:text-[#D97706]">{a.name}</Link>
              </span>
            ))
          })()}
          <span className="mx-1.5">&gt;</span>
          <span className="text-[#1E293B] font-medium">{displayName}</span>
        </nav>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-[28px] md:text-[34px] font-bold text-[#1E293B] tracking-tight">{displayName}</h1>
        </div>

        {/* Subcategory navigation — larger cards with proper spacing */}
        {category && (category.category_children?.length ?? 0) > 0 && subcatThumbs && (
          <div className="relative mb-8">
            <div className="flex gap-4 overflow-x-auto pt-2 pb-5 scrollbar-hide -mx-1 px-1">
              {category.category_children!.map((child) => {
                const thumb = CATEGORY_IMAGES[child.handle] || subcatThumbs[child.handle] || null
                if (!thumb) return null
                return (
                  <Link
                    key={child.id}
                    href={`/${locale}/kategooriad/${child.handle}`}
                    className="flex-shrink-0 flex flex-col items-center gap-2 w-[130px] group"
                  >
                    <div className="w-[120px] h-[120px] rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] group-hover:border-[#D97706] group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-200 overflow-hidden flex items-center justify-center">
                      <Image
                        src={thumb}
                        alt={child.name}
                        width={120}
                        height={120}
                        className="object-contain w-full h-full p-2"
                        unoptimized
                      />
                    </div>
                    <span className="text-[12px] text-center text-[#475569] group-hover:text-[#D97706] transition-colors leading-snug line-clamp-2 font-medium">
                      {child.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Content card */}
        {totalCount > 0 ? (
          <div className="bg-white rounded-xl">
            {/* Results count + Filters */}
            <div className="flex items-center gap-3 mb-4">
              <p className="text-sm text-[#64748B]">
                <span className="font-semibold text-[#1E293B]">{totalCount.toLocaleString("et")}</span> {locale === "et" ? "toodet" : "products"}
              </p>
            </div>
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
                locale={locale}
                basePath={categoryBasePath}
              />
            </Suspense>

            {/* Product grid — 5 col desktop, 3 tablet, 2 mobile */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {products.map((product: any) => (
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
        {youMayAlsoLike.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-[#1E293B] mb-5">{locale === "et" ? "Sulle võib meeldida ka" : "You May Also Like"}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {youMayAlsoLike.map((product: any) => (
                <VevorProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
