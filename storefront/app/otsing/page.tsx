import Link from "next/link"
import { getProducts } from "@/lib/medusa"
import ProductCard from "@/components/ProductCard"

export const revalidate = 0 // never cache search results

type Props = {
  searchParams: Promise<{ q?: string; leht?: string }>
}

export async function generateMetadata({ searchParams }: Props) {
  const { q } = await searchParams
  const title = q ? `"${q}" — Otsing — XLMARKET` : "Otsing — XLMARKET"
  return {
    title,
    description: q
      ? `Otsi "${q}" XLMARKET toodete hulgast.`
      : "Otsi XLMARKET toodete hulgast. Üle 10 000 toote soodsa hinnaga.",
    robots: { index: false, follow: true },
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
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[8px]">Otsing</h1>

      {query && (
        <p className="text-[14px] font-[family-name:var(--font-inter)] text-[#999999] mb-[32px]">
          {productsRes ? (
            <>
              <span className="font-[600] text-[#1A1A1A]">"{query}"</span>
              {" — "}
              {productsRes.count.toLocaleString("et-EE")} tulemust
            </>
          ) : (
            "Otsimine..."
          )}
        </p>
      )}

      {!query && (
        <p className="text-[14px] font-[family-name:var(--font-inter)] text-[#999999] py-[48px] text-center">
          Sisesta otsingusõna päisesse ja vajuta "Otsi".
        </p>
      )}

      {productsRes && productsRes.products.length === 0 && (
        <div className="text-center py-[48px]">
          <p className="text-[14px] font-[family-name:var(--font-inter)] text-[#999999] mb-[16px]">
            Päringuga "{query}" ei leitud ühtegi toodet.
          </p>
          <Link
            href="/kategooriad"
            className="text-[#E8650A] hover:text-[#CF5A08] font-[500] font-[family-name:var(--font-poppins)] underline underline-offset-2"
          >
            Sirvi kategooriaid &rarr;
          </Link>
        </div>
      )}

      {productsRes && productsRes.products.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[16px]">
            {productsRes.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex justify-center items-center gap-[8px] mt-[40px]">
              {page > 1 && (
                <Link
                  href={`/otsing?q=${encodeURIComponent(query)}&leht=${page - 1}`}
                  className="px-[16px] py-[8px] border border-[#E8E8E8] hover:border-[#E8650A] text-[13px] font-[family-name:var(--font-inter)] text-[#555555] transition-colors"
                >
                  &larr; Eelmine
                </Link>
              )}
              <span className="text-[13px] font-[family-name:var(--font-inter)] text-[#999999] px-[8px]">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/otsing?q=${encodeURIComponent(query)}&leht=${page + 1}`}
                  className="px-[16px] py-[8px] border border-[#E8E8E8] hover:border-[#E8650A] text-[13px] font-[family-name:var(--font-inter)] text-[#555555] transition-colors"
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
