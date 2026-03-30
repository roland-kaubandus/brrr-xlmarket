import type { Metadata } from "next"
import Link from "next/link"
import { getCategories, getProducts } from "@/lib/medusa"
import { Package } from "lucide-react"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Kategooriad — XLMARKET",
  description: "Sirvi XLMARKET tootekategooriaid: tööriistad, kodu ja aed, sport, auto ja palju muud.",
  openGraph: {
    title: "Kategooriad — XLMARKET",
    description: "Sirvi XLMARKET tootekategooriaid: tööriistad, kodu ja aed, sport, auto ja palju muud.",
  },
}

export default async function CategoriesPage() {
  const categories = await getCategories()

  // Fetch one product thumbnail per category (parallel)
  const catThumbsRaw = await Promise.all(
    categories.map((cat) =>
      getProducts({ limit: 1, category_id: [cat.id] })
        .then((res) => [cat.id, res.products[0]?.thumbnail ?? null] as const)
        .catch(() => [cat.id, null] as const)
    )
  )
  const catThumbMap = Object.fromEntries(catThumbsRaw)

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <nav
        className="text-[12px] font-[family-name:var(--font-inter)] text-[#999999] mb-[32px]"
        aria-label="Leheasukoht"
      >
        <Link href="/" className="hover:text-[#E8650A] transition-colors">Avaleht</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Kategooriad</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[8px]">
        Kõik kategooriad
      </h1>
      <p className="text-[14px] text-[#999999] font-[family-name:var(--font-inter)] mb-[40px]">
        {categories.length} kategooriat · üle 10 000 toote
      </p>

      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[1px] border border-[#E8E8E8]"
        style={{ background: "#E8E8E8" }}
      >
        {categories.map((cat) => {
          const thumb = catThumbMap[cat.id] ?? null
          return (
            <Link
              key={cat.id}
              href={`/kategooriad/${cat.handle}`}
              className="group flex items-center justify-between bg-white hover:bg-[#FFF5EE] overflow-hidden"
              style={{ transition: "background-color 0.18s cubic-bezier(0.32,0.72,0,1)" }}
            >
              <div className="px-[16px] py-[16px] flex-1 min-w-0">
                <span
                  className="text-[14px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] group-hover:text-[#E8650A] leading-[1.4] block"
                  style={{ transition: "color 0.18s" }}
                >
                  {cat.name}
                </span>
                <span className="text-[12px] font-[family-name:var(--font-inter)] text-[#999999] mt-[2px] group-hover:text-[#E8650A]/70 transition-colors block">
                  Sirvi tooteid →
                </span>
              </div>
              <div className="w-[96px] h-[80px] shrink-0 bg-[#F7F7F7] flex items-center justify-center overflow-hidden">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="w-full h-full object-contain p-[10px]"
                    loading="lazy"
                  />
                ) : (
                  <Package size={28} strokeWidth={1} className="text-[#DDDDDD]" />
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
