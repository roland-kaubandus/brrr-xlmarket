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
      type: "website",
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
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      {/* Breadcrumb */}
      <nav className="text-[12px] font-[family-name:var(--font-inter)] text-[#999999] mb-[32px]" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-[#E8650A] transition-colors">Avaleht</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <Link href="/kategooriad" className="hover:text-[#E8650A] transition-colors">Kategooriad</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">{category.name}</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[8px]">
        {category.name}
      </h1>
      <p className="text-[14px] text-[#999999] font-[family-name:var(--font-inter)] mb-[24px]">
        {totalFiltered.toLocaleString("et-EE")} toodet
      </p>

      {/* Filters */}
      <CategoryFilters
        currentSort={sort}
        currentMin={min}
        currentMax={max}
        basePath={`/kategooriad/${handle}`}
        totalProducts={totalFiltered}
      />

      {displayProducts.length === 0 ? (
        <div className="py-[64px] text-center">
          <p className="text-[16px] text-[#999999] font-[family-name:var(--font-inter)]">
            {hasPriceFilter ? "Selles hinnavahemikus tooteid ei leitud." : "Selles kategoorias pole veel tooteid."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[16px] sm:gap-[20px]">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex justify-center items-center gap-[8px] mt-[48px]" aria-label="Leheküljed">
          {page > 1 && (
            <Link
              href={pageUrl(page - 1)}
              className="px-[16px] py-[9px] border border-[#E8E8E8] text-[13px] font-[500] font-[family-name:var(--font-poppins)] text-[#333333] hover:border-[#E8650A] hover:text-[#E8650A] transition-colors"
            >
              ← Eelmine
            </Link>
          )}
          <span className="text-[13px] text-[#999999] font-[family-name:var(--font-inter)] px-[8px]">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={pageUrl(page + 1)}
              className="px-[16px] py-[9px] border border-[#E8E8E8] text-[13px] font-[500] font-[family-name:var(--font-poppins)] text-[#333333] hover:border-[#E8650A] hover:text-[#E8650A] transition-colors"
            >
              Järgmine →
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
