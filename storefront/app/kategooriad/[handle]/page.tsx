import Link from "next/link"
import { getCategoryByHandle, getProducts } from "@/lib/medusa"
import ProductCard from "@/components/ProductCard"
import { notFound } from "next/navigation"

export const revalidate = 300

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ leht?: string; sort?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { handle } = await params
  const category = await getCategoryByHandle(handle)
  if (!category) return { title: "Kategooria — XLMARKET" }
  return {
    title: `${category.name} — XLMARKET`,
    description: `${category.name} tooted soodsa hinnaga. Kiire tarne Eestis.`,
  }
}

const ITEMS_PER_PAGE = 24

export default async function CategoryPage({ params, searchParams }: Props) {
  const { handle } = await params
  const { leht, sort } = await searchParams

  const category = await getCategoryByHandle(handle)
  if (!category) notFound()

  const page = Math.max(1, parseInt(leht || "1", 10) || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE

  const orderMap: Record<string, string> = {
    uusimad: "-created_at",
    odavamad: "variants.calculated_price.calculated_amount",
    kallimad: "-variants.calculated_price.calculated_amount",
  }

  const productsRes = await getProducts({
    category_id: [category.id],
    limit: ITEMS_PER_PAGE,
    offset,
    order: orderMap[sort || ""] || "-created_at",
  })

  const totalPages = Math.ceil(productsRes.count / ITEMS_PER_PAGE)

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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Sorteeri:</span>
          {[
            { key: "uusimad", label: "Uusimad" },
            { key: "odavamad", label: "Odavamad" },
            { key: "kallimad", label: "Kallimad" },
          ].map((s) => (
            <Link
              key={s.key}
              href={`/kategooriad/${handle}?sort=${s.key}`}
              className={`px-3 py-1 border transition ${
                sort === s.key
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-gray-200 hover:border-amber-500"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        {productsRes.count.toLocaleString("et-EE")} toodet
      </p>

      {productsRes.products.length === 0 ? (
        <p className="text-gray-500 py-16 text-center">
          Selles kategoorias pole veel tooteid.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {productsRes.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex justify-center items-center gap-2 mt-10">
          {page > 1 && (
            <Link
              href={`/kategooriad/${handle}?leht=${page - 1}${sort ? `&sort=${sort}` : ""}`}
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
              href={`/kategooriad/${handle}?leht=${page + 1}${sort ? `&sort=${sort}` : ""}`}
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
