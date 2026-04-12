import Link from "next/link"
import SubcategoryScroller from "@/components/SubcategoryScroller"

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
    <section className="bg-[#F8FAFC] py-4 md:py-6">
      <div className="max-w-[1360px] mx-auto px-3 md:px-4">
        {/* Section heading */}
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <div className="w-1 h-5 rounded-full bg-[#D97706]" />
          <h2 className="font-bold text-[15px] md:text-[20px] text-[#1E293B] tracking-tight">
            {locale === "en" ? "Categories" : "Kategooriad"}
          </h2>
        </div>

        <SubcategoryScroller>
          {categories.map((cat) => {
            const display = cat.displayName || cat.name
            const imgUrl = cat.image || null

            return (
              <Link
                key={cat.handle}
                href={`/${locale}/kategooriad/${cat.handle}`}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[100px] md:w-[120px] group"
              >
                <div className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] rounded-xl bg-white border border-[#E2E8F0] group-hover:border-[#D97706] group-hover:shadow-md transition-all duration-200 overflow-hidden flex items-center justify-center">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={display}
                      className="object-contain w-full h-full p-2"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg>
                    </div>
                  )}
                </div>
                <span className="text-[11px] md:text-[12px] text-center text-[#475569] group-hover:text-[#D97706] transition-colors leading-snug line-clamp-2 font-medium">
                  {display}
                </span>
              </Link>
            )
          })}
        </SubcategoryScroller>
      </div>
    </section>
  )
}
