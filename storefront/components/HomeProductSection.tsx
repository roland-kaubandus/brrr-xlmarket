import Link from "@/components/SafeLink"
import ProductGrid from "@/components/ProductGrid"

type FetchParams = {
  q?: string
  filter?: string
  sort?: string
  limit?: number
  offset?: number
  locale?: string
  facets?: string
}

type Props = {
  title: string
  seeAllHref: string
  seeAllLabel?: string
  locale: string
  fetchParams: FetchParams
  timer?: React.ReactNode
  clearable?: boolean
}

export default function HomeProductSection({
  title, seeAllHref, seeAllLabel, locale, fetchParams, timer, clearable,
}: Props) {
  return (
    <section className="pt-8 sm:pt-12 md:pt-16 [&+&]:border-t [&+&]:border-[#F1F5F9] [&+&]:mt-8 sm:[&+&]:mt-12 md:[&+&]:mt-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-[18px] sm:text-[22px] md:text-[32px] font-bold text-[#12121f] tracking-tight" style={{ letterSpacing: "-0.3px" }}>
              {title}
            </h2>
            {timer}
          </div>
          <Link
            href={seeAllHref}
            className="text-[13px] md:text-[16px] font-semibold text-[#0b7d79] flex items-center gap-1 hover:gap-2 transition-all"
          >
            {clearable
              ? "Clear"
              : (seeAllLabel || "See All")}
            {clearable ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            )}
          </Link>
        </div>

        {/* Product grid */}
        <ProductGrid
          fetchParams={fetchParams}
          locale={locale}
          columns="2-3-5"
        />
      </div>
    </section>
  )
}
