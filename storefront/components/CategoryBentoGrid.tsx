import Link from "next/link"
import { FEATURED_CATEGORIES, type FeaturedCategory } from "@/lib/featured-categories"

function CategoryCard({
  cat,
  locale,
}: {
  cat: FeaturedCategory
  locale: string
}) {
  const isFeature = cat.size === "feature"
  const label = locale === "et" ? cat.labelEt : cat.label

  return (
    <Link
      href={`/${locale}/kategooriad/${cat.handle}`}
      className={`
        group relative overflow-hidden rounded-xl
        transition-all duration-500
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]
        hover:-translate-y-1 hover:shadow-[0_16px_40px_-8px_rgba(30,41,59,0.25)]
        ${isFeature ? "md:col-span-2" : ""}
      `}
      style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <img
        src={cat.image}
        alt={label}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[600ms] group-hover:scale-[1.06]"
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(15,23,42,0.82) 0%, rgba(15,23,42,0.2) 60%, rgba(15,23,42,0.05) 100%)",
        }}
      />

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3
          className={`font-semibold text-white leading-tight ${
            isFeature ? "text-xl" : "text-base"
          }`}
        >
          {label}
        </h3>
        <p className="text-xs text-white/65 mt-0.5">
          {cat.productCount} {locale === "et" ? "toodet" : "products"}
        </p>
      </div>
    </Link>
  )
}

export default function CategoryBentoGrid({ locale }: { locale: string }) {
  return (
    <section className="max-w-[1360px] mx-auto px-4 pt-10 pb-6">
      {/* Section title */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 rounded-full bg-[#D97706]" />
        <h2 className="font-bold text-[20px] md:text-[24px] tracking-tight text-[#1E293B]">
          {locale === "et" ? "Kategooriad" : "Shop by Category"}
        </h2>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] md:auto-rows-[220px] gap-2 md:gap-3">
        {FEATURED_CATEGORIES.map((cat) => (
          <CategoryCard key={cat.handle} cat={cat} locale={locale} />
        ))}
      </div>
    </section>
  )
}
