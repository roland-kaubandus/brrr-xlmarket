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
    <section className="bg-white py-10">
      <div className="max-w-[1360px] mx-auto px-4">
        {/* Section heading */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-7 rounded-full bg-[#D97706]" />
          <h2 className="font-bold text-2xl text-[#1E293B]">
            Categories to Explore
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {categories.map((cat) => {
            const display = cat.displayName || cat.name
            const imgUrl = cat.image ? decodeURIComponent(cat.image) : null
            const count = cat.productCount || 0

            return (
              <Link
                key={cat.handle}
                href={`/${locale}/kategooriad/${cat.handle}`}
                className="category-card group flex flex-col items-center text-center rounded-xl border border-[#E2E8F0] bg-white p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-[#D97706]"
              >
                {/* Image — portrait, bigger */}
                <div className="w-full aspect-square flex items-center justify-center mb-3">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={display}
                      className="object-contain w-full h-full max-h-[180px]"
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
                <p className="font-bold text-[14px] text-[#1E293B] leading-tight mb-1">
                  {display}
                </p>
                {count > 0 && (
                  <p className="text-[12px] text-[#64748B] flex items-center gap-1">
                    {count.toLocaleString()} products
                    <span className="text-[#D97706] transition-transform group-hover:translate-x-0.5">&rarr;</span>
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
