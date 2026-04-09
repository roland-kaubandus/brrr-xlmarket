import Link from "next/link"

type CategoryItem = {
  name: string
  handle: string
  displayName: string
  image?: string | null
  productCount?: number
}

export default function CategoryExploreGrid({
  categories,
  locale,
}: {
  categories: CategoryItem[]
  locale: string
}) {
  return (
    <section className="bg-[#F8FAFC] py-12">
      <div className="max-w-[1360px] mx-auto px-4">
        {/* Section heading */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-[#D97706]" />
            <h2 className="font-bold text-2xl md:text-[28px] text-[#1E293B] tracking-tight">
              Categories to Explore
            </h2>
          </div>
          <Link
            href={`/${locale}/kategooriad`}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-[#D97706] hover:text-[#B45309] transition-colors"
          >
            View All
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {categories.map((cat) => {
            const display = cat.displayName || cat.name
            const imgUrl = cat.image ? decodeURIComponent(cat.image) : null
            const count = cat.productCount || 0

            return (
              <Link
                key={cat.handle}
                href={`/${locale}/kategooriad/${cat.handle}`}
                className="group flex flex-col rounded-2xl bg-white border border-[#E2E8F0]/80 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-[#D97706]/30"
              >
                {/* Image */}
                <div className="aspect-square flex items-center justify-center p-5 bg-gradient-to-b from-white to-[#F8FAFC]">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={display}
                      className="object-contain w-full h-full max-h-[160px] group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A]">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 7V5a4 4 0 0 0-8 0v2" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Name + count */}
                <div className="px-4 pb-4 pt-1">
                  <p className="font-semibold text-[14px] text-[#1E293B] leading-snug mb-0.5 group-hover:text-[#D97706] transition-colors">
                    {display}
                  </p>
                  {count > 0 && (
                    <p className="text-[12px] text-[#94A3B8] flex items-center gap-1">
                      {count.toLocaleString()} products
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#D97706] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"><path d="m9 18 6-6-6-6"/></svg>
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
