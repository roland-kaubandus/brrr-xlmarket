import Link from "@/components/SafeLink"
import { FEATURED_CATEGORIES, type FeaturedCategory } from "@/lib/featured-categories"

function BentoCard({ cat, locale, index }: { cat: FeaturedCategory; locale: string; index: number }) {
  const isLarge = cat.size === "large"
  const label = locale === "et" ? cat.labelEt : cat.label
  const imgSrc = isLarge ? cat.image400 : cat.image80
  const imgMax = isLarge ? "max-w-[240px]" : "max-w-[96px]"

  // Large cards span 2 cols on all breakpoints; span 2 rows on md+
  const spanClass = isLarge ? "col-span-2 md:row-span-2" : ""

  return (
    <Link
      href={`/${locale}/kategooriad/${cat.handle}`}
      prefetch={false}
      className={`
        group bg-white border border-[#F1F5F9] rounded-[20px] overflow-hidden
        flex flex-col items-center justify-center text-center
        transition-all duration-300 hover:-translate-y-1
        hover:shadow-[0_8px_25px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.04)]
        hover:border-[#E2E8F0]
        ${spanClass}
        ${isLarge ? "min-h-[180px] md:min-h-[280px] p-5" : "min-h-[150px] p-4"}
      `}
      style={{ transitionTimingFunction: "cubic-bezier(.16,1,.3,1)" }}
    >
      <img
        src={imgSrc}
        alt={label}
        loading={index < 4 ? "eager" : "lazy"}
        className={`w-full ${imgMax} aspect-square object-contain mb-2.5 transition-transform duration-300 group-hover:scale-[1.04]`}
        style={{ transitionTimingFunction: "cubic-bezier(.16,1,.3,1)" }}
      />
      <div className={`font-semibold text-[#0F172A] mb-0.5 ${isLarge ? "text-[18px]" : "text-[14px]"}`}>
        {label}
      </div>
      <div className="text-[12px] text-[#94A3B8] font-medium">
        {cat.productCount} {locale === "et" ? "toodet" : "products"}
      </div>
    </Link>
  )
}

export default function HomeBentoGrid({ locale }: { locale: string }) {
  return (
    <section className="pt-12 pb-0">
      <div className="max-w-[1320px] mx-auto px-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-[1.5px]">
            {locale === "et" ? "Kategooriad" : "Shop by Category"}
          </span>
          <Link
            href={`/${locale}/kategooriad`}
            className="text-[13px] font-semibold text-[#D97706] flex items-center gap-1 hover:gap-2 transition-all"
          >
            {locale === "et" ? "Kõik 1 688 kategooriat" : "All 1,688 categories"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>

        {/* Bento grid — uses .bento-grid from globals.css for responsive columns */}
        <div className="bento-grid">
          {FEATURED_CATEGORIES.map((cat, i) => (
            <BentoCard key={cat.handle} cat={cat} locale={locale} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
