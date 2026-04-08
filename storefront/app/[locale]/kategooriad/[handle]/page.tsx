import Link from "next/link"
import { Suspense } from "react"
import { getCategoryByHandle, getProducts } from "@/lib/medusa"
import { searchProducts } from "@/lib/meilisearch"
import VevorProductCard from "@/components/VevorProductCard"
import VevorSearchFilters from "@/components/search/VevorSearchFilters"
import VevorPagination from "@/components/search/VevorPagination"
import { notFound } from "next/navigation"

export const revalidate = 300

const CATEGORY_NAMES: Record<string, string> = {
  "ehitus-ja-remont": "Building & Construction",
  "toostus-ja-seadmed": "Tools & Industrial",
  "kodu-ja-aed": "Home & Garden",
  "auto-ja-garaaz": "Automotive & Garage",
  "sport-ja-vaba-aeg": "Sports & Outdoors",
  "kunst-ja-kasitoo": "Arts & Crafts",
  "toitlustus-ja-kook": "Kitchen & Dining",
  "elektroonika": "Electronics",
  "lemmikloomad": "Pet Supplies",
  "kontor-ja-ladustamine": "Storage & Office",
  "meditsiin-ja-tervishoid": "Health & Wellness",
}

type Props = {
  params: Promise<{ handle: string; locale: string }>
  searchParams: Promise<{
    page?: string; sort?: string; min?: string; max?: string
    q?: string; categories?: string; in_stock?: string
  }>
}

export async function generateMetadata({ params }: Props) {
  const { handle } = await params
  const category = await getCategoryByHandle(handle)
  if (!category) return { title: "Category — XLMARKET" }
  const displayName = CATEGORY_NAMES[handle] || category.name
  const desc = `${displayName} products at great prices. Fast delivery in Estonia.`
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

  const category = await getCategoryByHandle(handle)
  if (!category) notFound()

  const displayName = CATEGORY_NAMES[handle] || category.name
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE
  const currentSort = sort || ""
  const selectedCategories = categories ? categories.split(",").filter(Boolean) : []
  const inStock = in_stock === "1"

  let products: any[] = []
  let totalCount = 0
  let usedMeili = false
  let categoryFacets: Record<string, number> = {}

  try {
    // Build MeiliSearch filter
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
  const categoryBasePath = `/${locale}/kategooriad/${handle}`

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
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-[#888] mb-4">
          <Link href={`/${locale}`} className="hover:text-[#D97706]">Home</Link>
          <span className="mx-1.5">&gt;</span>
          <Link href={`/${locale}/kategooriad`} className="hover:text-[#D97706]">All Categories</Link>
          <span className="mx-1.5">&gt;</span>
          <span className="text-[#555]">{displayName}</span>
        </nav>

        {/* Title + count */}
        <div className="mb-5">
          <h1 className="text-[28px] font-bold text-[#1E293B]">{displayName}</h1>
          <p className="text-sm text-[#64748B] mt-1">
            <span className="font-semibold text-[#1E293B]">{totalCount.toLocaleString("et-EE")}</span> products
          </p>
        </div>

        {/* Content card */}
        {totalCount > 0 ? (
          <div className="bg-white rounded-xl p-4 sm:p-6">
            {/* Filters */}
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
              No products found in this category.
            </p>
            <Link
              href={`/${locale}/kategooriad`}
              className="text-[#D97706] hover:underline font-medium"
            >
              Browse all categories
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
