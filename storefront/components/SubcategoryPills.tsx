import Link from "@/components/SafeLink"
import { SUBCATEGORY_PILLS } from "@/lib/featured-categories"

export default function SubcategoryPills({ locale }: { locale: string }) {
  return (
    <section className="pt-6 sm:pt-10 md:pt-14">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        <h2 className="text-[18px] sm:text-[22px] md:text-[32px] font-bold text-[#0F172A] tracking-tight mb-4 sm:mb-6 md:mb-8" style={{ letterSpacing: "-0.3px" }}>
          {locale === "et" ? "Populaarsed alamkategooriad" : "Popular Subcategories"}
        </h2>
        <div className="flex gap-2.5 md:gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}>
          {SUBCATEGORY_PILLS.map(pill => (
            <Link
              key={pill.handle}
              href={`/${locale}/kategooriad/${pill.handle}`}
              prefetch={false}
              className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 pr-4 md:pr-6 py-2 md:py-3 rounded-full bg-[#F8FAFC] border border-[#F1F5F9] whitespace-nowrap shrink-0 transition-all duration-150 hover:bg-white hover:border-[#D97706] hover:-translate-y-0.5"
              style={{ scrollSnapAlign: "start" }}
            >
              <img
                src={`/cat-icons/80/${pill.handle}.webp`}
                alt=""
                className="w-9 h-9 md:w-14 md:h-14 rounded-full object-contain bg-white border border-[#F1F5F9]"
                loading="lazy"
              />
              <span className="text-[13px] md:text-[17px] font-medium text-[#0F172A]">
                {locale === "et" ? pill.labelEt : pill.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
