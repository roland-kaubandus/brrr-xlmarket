import Link from "next/link"
import { getCategoryByHandle, getProducts, Product } from "@/lib/medusa"
import ProductCard from "@/components/ProductCard"
import CategoryFilters from "@/components/CategoryFilters"
import { notFound } from "next/navigation"

export const revalidate = 300

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ leht?: string; sort?: string; min?: string; max?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { handle } = await params
  const category = await getCategoryByHandle(handle)
  if (!category) return { title: "Kategooria — XLMARKET" }
  const desc = `${category.name} tooted soodsa hinnaga. Kiire tarne Eestis.`
  return {
    title: `${category.name} — XLMARKET`,
    description: desc,
    openGraph: {
      title: `${category.name} — XLMARKET`,
      description: desc,
    },
  }
}

const ITEMS_PER_PAGE = 24

function getPrice(product: Product): number | null {
  const amount = product.variants?.[0]?.calculated_price?.calculated_amount
  return typeof amount === "number" ? amount : null
}

function sortProducts(products: Product[], sort: string): Product[] {
  if (sort === "odavamad") {
    return [...products].sort((a, b) => (getPrice(a) ?? Infinity) - (getPrice(b) ?? Infinity))
  }
  if (sort === "kallimad") {
    return [...products].sort((a, b) => (getPrice(b) ?? 0) - (getPrice(a) ?? 0))
  }
  // default: newest (API default order)
  return products
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { handle } = await params
  const { leht, sort, min, max } = await searchParams

  const category = await getCategoryByHandle(handle)
  if (!category) notFound()

  const page = Math.max(1, parseInt(leht || "1", 10) || 1)
  const hasPriceFilter = !!(min || max)
  const hasClientSort = sort === "odavamad" || sort === "kallimad"

  // When price filter or price sort is active, fetch larger batch for server-side filtering
  const fetchLimit = hasPriceFilter || hasClientSort ? 500 : ITEMS_PER_PAGE
  const fetchOffset = hasPriceFilter || hasClientSort ? 0 : (page - 1) * ITEMS_PER_PAGE

  const productsRes = await getProducts({
    category_id: [category.id],
    limit: fetchLimit,
    offset: fetchOffset,
    order: "-created_at",
  })

  let products = productsRes.products

  // Apply price filter server-side
  if (hasPriceFilter) {
    const minCents = min ? Math.round(parseFloat(min) * 100) : 0
    const maxCents = max ? Math.round(parseFloat(max) * 100) : Infinity
    products = products.filter((p) => {
      const price = getPrice(p)
      if (price === null) return false
      return price >= minCents && price <= maxCents
    })
  }

  // Apply sort
  if (sort) {
    products = sortProducts(products, sort)
  }

  // Paginate filtered results
  const totalFiltered = hasPriceFilter || hasClientSort ? products.length : productsRes.count
  const displayProducts =
    hasPriceFilter || hasClientSort
      ? products.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
      : products
  const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE)

  // Build pagination URL helper
  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (p > 1) params.set("leht", String(p))
    if (sort) params.set("sort", sort)
    if (min) params.set("min", min)
    if (max) params.set("max", max)
    const qs = params.toString()
    return qs ? `/kategooriad/${handle}?${qs}` : `/kategooriad/${handle}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-amber-600">Avaleht</Link>
        <span className="mx-2">/</span>
        <Link href="/kategooriad" className="hover:text-amber-600">Kategooriad</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{category.name}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-6">{category.name}</h1>

      {/* Filters */}
      <CategoryFilters
        currentSort={sort}
        currentMin={min}
        currentMax={max}
        basePath={`/kategooriad/${handle}`}
        totalProducts={totalFiltered}
      />

      {displayProducts.length === 0 ? (
        <p className="text-gray-500 py-16 text-center">
          {hasPriceFilter
            ? "Selles hinnavahemikus tooteid ei leitud. Proovi teisi filtreid."
            : "Selles kategoorias pole veel tooteid."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex justify-center items-center gap-2 mt-10">
          {page > 1 && (
            <Link
              href={pageUrl(page - 1)}
              className="px-4 py-2 border border-gray-200 hover:border-amber-500 text-sm transition"
            >
              &larr; Eelmine
            </Link>
          )}
          <span className="text-sm text-gray-500 px-4">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={pageUrl(page + 1)}
              className="px-4 py-2 border border-gray-200 hover:border-amber-500 text-sm transition"
            >
              Järgmine &rarr;
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
