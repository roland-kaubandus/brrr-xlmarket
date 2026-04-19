import Link from "next/link"
import { getVisibleL1 } from "@/lib/category-tree"
import CategoryThumb from "@/components/CategoryThumb"
import { ChevronRight } from "lucide-react"

export const revalidate = 3600

export const metadata = {
  title: "All Categories — XLMARKET",
  description: "Browse all product categories at XLMarket.",
}

export default async function CategoriesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const l1 = getVisibleL1()

  return (
    <main className="mx-auto max-w-[1360px] px-4 md:px-6 py-8 md:py-12">
      <nav className="text-[12px] text-[#64748B] mb-4" aria-label="Breadcrumb">
        <Link href={`/${locale}`} className="hover:text-[#E8920A]">Home</Link>
        <span className="mx-1.5">&gt;</span>
        <span className="text-[#1E293B]">All categories</span>
      </nav>

      <h1 className="text-[28px] md:text-[36px] font-bold text-[#1E293B] tracking-tight mb-2">
        All categories
      </h1>
      <p className="text-[15px] text-[#64748B] mb-8 md:mb-10">
        Professional tools and equipment across {l1.length} categories.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
        {l1.map((node) => (
          <Link
            key={node.handle}
            href={`/${locale}/kategooriad/${node.handle}`}
            prefetch={false}
            className="group flex flex-col items-center text-center p-4 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#E8920A] transition-colors"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mb-3">
              <CategoryThumb handle={node.handle} alt={node.name_en || node.handle} size={80} />
            </div>
            <span className="text-[13px] md:text-[14px] font-semibold text-[#1E293B] line-clamp-2 leading-snug">
              {node.name_en || node.handle}
            </span>
            <span className="mt-2 inline-flex items-center gap-0.5 text-[11px] text-[#64748B] group-hover:text-[#E8920A]">
              Browse
              <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  )
}
