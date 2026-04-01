import { getTranslations, localePath } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"
import Link from "next/link"
import { getProducts, getCategories } from "@/lib/medusa"
import ProductCard from "@/components/ProductCard"
import BestSellersSection from "@/components/BestSellersSection"
import NewsletterSection from "@/components/NewsletterSection"
import HeroSection from "@/components/HeroSection"
import ThreePathsSection from "@/components/ThreePathsSection"
import BranchShowcase from "@/components/BranchShowcase"

export const revalidate = 300


export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = getTranslations(locale as Locale)
  const lp = (path: string) => localePath(locale as Locale, path)
  const BS_CATS = [
    { label: "Ehitus", handle: "ehitus-ja-remont", id: "pcat_01KMRXYCF1PP71JGTD05ANC85T" },
    { label: "Tööstus", handle: "toostus-ja-seadmed", id: "pcat_01KMRXYCGKWBEN1Y4GF0ZJADME" },
    { label: "Kodu", handle: "kodu-ja-aed", id: "pcat_01KMRXYCHX0VNQ283CTP2FTAR1" },
    { label: "Auto", handle: "auto-ja-garaaz", id: "pcat_01KMRXYCKA1V998R8RNHJAQV8P" },
    { label: "Sport", handle: "sport-ja-vaba-aeg", id: "pcat_01KMRXYCMQFS5M4QEJ8WSWXYSS" },
  ]

  const [popularRes, categories, ...bsCatProducts] = await Promise.all([
    getProducts({ limit: 8, offset: 0, order: "-created_at" }),
    getCategories(),
    ...BS_CATS.map((c) => getProducts({ limit: 8, category_id: [c.id] })),
  ])

  const bsTabs = BS_CATS.map((c, i) => ({
    label: c.label,
    handle: c.handle,
    products: bsCatProducts[i]?.products ?? [],
  }))

  return (
    <>
      {/* 1. Hero — asymmetric with lifestyle photo */}
      <HeroSection locale={locale} />

      {/* 2. Branch Showcase — bento grid */}
      <BranchShowcase locale={locale} />

      {/* 3. Three Paths — Otsi / Avasta / Küsi müüjalt */}
      <ThreePathsSection locale={locale} />

      {/* 4. Popular Products */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <span className="inline-block text-[11px] uppercase tracking-[0.2em] font-semibold text-accent mb-4">{t.products.eyebrow}</span>
              <h2 className="font-[family-name:var(--font-outfit)] font-[800] text-3xl md:text-4xl tracking-tighter leading-[1.05]">{t.products.popular}</h2>
            </div>
            <Link
              href={lp("/kategooriad")}
              className="group inline-flex items-center gap-2 text-accent text-sm font-semibold hover:gap-3 transition-all duration-300"
            >
              {"Vaata kõiki"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {popularRes.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Best Sellers by category */}
      <div className="max-w-[1400px] mx-auto px-4">
        <BestSellersSection tabs={bsTabs} locale={locale} />
      </div>

      {/* 6. Trust section */}
      <section className="py-24 md:py-32 bg-silver/50">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-[11px] uppercase tracking-[0.2em] font-semibold text-accent mb-4">{t.trust.eyebrow}</span>
            <h2 className="font-[family-name:var(--font-outfit)] font-[800] text-3xl md:text-4xl tracking-tighter leading-[1.05]">{t.trust.title}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <TrustItem
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
              title={t.trust.fastDelivery}
              desc={t.trust.fastDeliveryDesc}
            />
            <TrustItem
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>}
              title={t.trust.warranty}
              desc={t.trust.warrantyDesc}
            />
            <TrustItem
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>}
              title={t.trust.returns}
              desc={t.trust.returnsDesc}
            />
            <TrustItem
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
              title={t.trust.support}
              desc={t.trust.supportDesc}
            />
          </div>
        </div>
      </section>

      {/* 7. Newsletter */}
      <section className="py-24 md:py-32 bg-off-black text-white">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="font-[family-name:var(--font-outfit)] font-[800] text-3xl md:text-4xl tracking-tighter leading-[1.05] mb-4">{t.newsletter.title}</h2>
            <p className="text-white/50 leading-relaxed mb-8">{t.newsletter.subtitle}</p>
            <NewsletterSection locale={locale} />
          </div>
        </div>
      </section>
    </>
  )
}

function TrustItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="text-center p-6 md:p-8">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)]">
        {icon}
      </div>
      <h3 className="font-[family-name:var(--font-outfit)] font-bold text-sm mb-2">{title}</h3>
      <p className="text-muted text-xs leading-relaxed">{desc}</p>
    </div>
  )
}
