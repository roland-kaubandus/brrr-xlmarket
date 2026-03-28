import Link from "next/link"
import { getProducts } from "@/lib/medusa"
import ProductCard from "@/components/ProductCard"

export const revalidate = 0 // never cache search results

type Props = {
  searchParams: Promise<{ q?: string; leht?: string }>
}

export async function generateMetadata({ searchParams }: Props) {
  const { q } = await searchParams
  return {
    title: q ? `"${q}" — Otsing — XLMARKET` : "Otsing — XLMARKET",
  }
}

const ITEMS_PER_PAGE = 24

export default async function SearchPage({ searchParams }: Props) {
  const { q, leht } = await searchParams
  const query = q?.trim() || ""
  const page = Math.max(1, parseInt(leht || "1", 10) || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE

  const productsRes = query
    ? await getProducts({ q: query, limit: ITEMS_PER_PAGE, offset })
    : null

  const totalPages = productsRes
    ? Math.ceil(productsRes.count / ITEMS_PER_PAGE)
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Otsing</h1>

      {query && (
        <p className="text-gray-500 mb-8">
          {productsRes ? (
            <>
              <span className="font-medium text-gray-900">"{query}"</span>
              {" — "}
              {productsRes.count.toLocaleString("et-EE")} tulemust
            </>
          ) : (
            "Otsimine..."
          )}
        </p>
      )}

      {!query && (
        <p className="text-gray-500 py-16 text-center">
          Sisesta otsingusõna päisesse ja vajuta "Otsi".
        </p>
      )}

      {productsRes && productsRes.products.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">
            Päringuga "{query}" ei leitud ühtegi toodet.
          </p>
          <Link
            href="/kategooriad"
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            Sirvi kategooriaid &rarr;
          </Link>
        </div>
      )}

      {productsRes && productsRes.products.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {productsRes.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex justify-center items-center gap-2 mt-10">
              {page > 1 && (
                <Link
                  href={`/otsing?q=${encodeURIComponent(query)}&leht=${page - 1}`}
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
                  href={`/otsing?q=${encodeURIComponent(query)}&leht=${page + 1}`}
                  className="px-4 py-2 border border-gray-200 hover:border-amber-500 text-sm transition"
                >
                  Järgmine &rarr;
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  )
}
