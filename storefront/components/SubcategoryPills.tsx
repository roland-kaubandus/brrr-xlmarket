import Link from "@/components/SafeLink"
import { SUBCATEGORY_PILLS } from "@/lib/featured-categories"

export default function SubcategoryPills({ locale }: { locale: string }) {
  return (
    <section className="pt-10">
      <div className="max-w-[1320px] mx-auto px-6">
        <div className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-[1.5px] mb-5">
          {locale === "et" ? "Populaarsed alamkategooriad" : "Popular Subcategories"}
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}>
          {SUBCATEGORY_PILLS.map(pill => (
            <Link
              key={pill.handle}
              href={`/${locale}/kategooriad/${pill.handle}`}
              prefetch={false}
              className="flex items-center gap-2 pl-2 pr-4 py-2 rounded-full bg-[#F8FAFC] border border-[#F1F5F9] whitespace-nowrap shrink-0 transition-all duration-150 hover:bg-white hover:border-[#D97706] hover:-translate-y-0.5"
              style={{ scrollSnapAlign: "start" }}
            >
              <img
                src={`/cat-icons/80/${pill.handle}.webp`}
                alt=""
                className="w-9 h-9 rounded-full object-contain bg-white border border-[#F1F5F9]"
                loading="lazy"
              />
              <span className="text-[13px] font-medium text-[#0F172A]">
                {locale === "et" ? pill.labelEt : pill.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
