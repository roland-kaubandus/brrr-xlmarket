import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "@/components/SafeLink"
import { ArrowRight, CheckCircle2, MessageSquare, Package, Truck } from "lucide-react"
import {
  allVerticalSlugs,
  getVerticalBySlug,
  getVerticalProducts,
  getKitItemProducts,
  localisedVertical,
  type VerticalMode,
} from "@/lib/verticals"
import { getProductTitle, type MeiliHit } from "@/lib/meilisearch"

export const revalidate = 3600

const MODE: VerticalMode = "alustajale"

function priceFmt(n: number): string {
  return `€${n.toLocaleString("en-US")}`
}

export async function generateStaticParams() {
  return allVerticalSlugs()
    .filter((v) => v.mode === MODE)
    .map((v) => ({ vertical: v.slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; vertical: string }> },
): Promise<Metadata> {
  const { vertical } = await params
  const v = getVerticalBySlug(MODE, vertical)
  if (!v) return {}
  return {
    title: v.meta_title_en ?? `${v.name_en} — XLMarket`,
    description: v.meta_description_en ?? v.description_en,
    openGraph: {
      title: v.meta_title_en ?? v.name_en,
      description: v.meta_description_en ?? v.description_en,
      images: v.hero_img ? [v.hero_img] : undefined,
    },
  }
}

export default async function VerticalPage(
  { params }: { params: Promise<{ locale: string; vertical: string }> },
) {
  const { locale, vertical } = await params
  const v = getVerticalBySlug(MODE, vertical)
  if (!v) notFound()

  const loc = localisedVertical(v, locale)
  const [products, ...kitProductLists] = await Promise.all([
    getVerticalProducts(MODE, vertical, { limit: 24 }),
    ...v.kits.map((kit) => getKitItemProducts(kit, locale)),
  ])

  // JSON-LD (SEO)
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: v.faq.map((f) => ({
      "@type": "Question",
      name: f.q_en,
      acceptedAnswer: { "@type": "Answer", text: f.a_en },
    })),
  }
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: loc.name,
    description: loc.description,
    url: `https://xlmarket.ee/${locale}/alustajale/${vertical}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 12).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://xlmarket.ee/${locale}/toode/${p.handle}`,
        name: p.title,
      })),
    },
    provider: {
      "@type": "Organization",
      name: "XLMARKET",
      url: "https://xlmarket.ee",
    },
  }
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `https://xlmarket.ee/${locale}` },
      { "@type": "ListItem", position: 2, name: "Getting Started", item: `https://xlmarket.ee/${locale}/alustajale` },
      { "@type": "ListItem", position: 3, name: loc.name, item: `https://xlmarket.ee/${locale}/alustajale/${vertical}` },
    ],
  }

  return (
    <div>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero */}
      <section
        className="w-full"
        style={{
          background: v.hero_img
            ? `linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.75) 60%, rgba(15,23,42,0.92) 100%), url(${v.hero_img}) center/cover`
            : "linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[80px]">
          <nav
            className="text-[12px] font-[family-name:var(--font-dm-sans)] text-white/55 mb-[24px] flex items-center flex-wrap"
            aria-label="Breadcrumb"
          >
            <Link href={`/${locale}`} className="hover:text-[#D97706] transition-colors">
              Home
            </Link>
            <span className="mx-[8px] text-white/30">/</span>
            <Link href={`/${locale}/alustajale`} className="hover:text-[#D97706] transition-colors">
              Getting Started
            </Link>
            <span className="mx-[8px] text-white/30">/</span>
            <span className="text-white/90">{loc.name}</span>
          </nav>
          <span className="inline-block bg-[#D97706] text-white text-[11px] font-bold uppercase tracking-[0.12em] px-[10px] py-[4px] mb-[18px]">
            Getting Started
          </span>
          <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-[800] leading-[1.05] text-white tracking-[-0.025em] max-w-[880px] mb-[18px] font-[family-name:var(--font-dm-sans)]">
            {loc.name}
          </h1>
          <p className="text-[15px] sm:text-[17px] text-white/75 max-w-[680px] leading-relaxed mb-[28px] font-[family-name:var(--font-dm-sans)]">
            {loc.tagline}
          </p>
          <div className="flex flex-wrap gap-[10px]">
            <a
              href="#kits"
              className="inline-flex items-center gap-[8px] px-[22px] py-[13px] bg-[#D97706] text-white text-[14px] font-[600] hover:bg-[#B45309] transition-colors font-[family-name:var(--font-dm-sans)]"
            >
              View Kits <ArrowRight size={15} strokeWidth={2.5} />
            </a>
            <Link
              href={`/${locale}/arikliendile#quote`}
              className="inline-flex items-center gap-[8px] px-[22px] py-[13px] border border-white/25 text-white/90 text-[14px] font-[600] hover:border-white/50 transition-colors font-[family-name:var(--font-dm-sans)]"
            >
              Request Custom Quote
            </Link>
          </div>
          {v.emtak_codes.length > 0 && (
            <p className="mt-[20px] text-[11.5px] text-white/50 font-[family-name:var(--font-dm-sans)]">
              EMTAK: {v.emtak_codes.join(", ")} · VAT 24% included · Standard delivery €4.99
            </p>
          )}
        </div>
      </section>

      {/* Description strip */}
      <section className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[40px] sm:py-[56px]">
        <p className="text-[16px] sm:text-[17px] text-[#334155] leading-relaxed max-w-[820px] font-[family-name:var(--font-dm-sans)]">
          {loc.description}
        </p>
      </section>

      {/* Kits */}
      <section id="kits" className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[72px]">
          <div className="mb-[32px]">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#D97706] font-[700] mb-[6px] font-[family-name:var(--font-dm-sans)]">
              Three Tiers
            </p>
            <h2 className="text-[24px] sm:text-[32px] font-[800] text-[#1E293B] font-[family-name:var(--font-dm-sans)]">
              Choose Your Starter Kit
            </h2>
            <p className="text-[13px] text-[#64748B] mt-[8px] max-w-[620px] font-[family-name:var(--font-dm-sans)]">
              Each tier is a recommendation — we tailor the configuration to your space and budget when sending the quote.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px] sm:gap-[24px]">
            {v.kits.map((kit, idx) => {
              const kitItems = kitProductLists[idx] || []
              const tierLabel =
                kit.tier === "starter" ? "Starter" : kit.tier === "pro" ? "Pro" : "Full Kit"

              return (
                <article
                  key={kit.tier}
                  className="border border-[#E2E8F0] bg-white flex flex-col hover:border-[#D97706] transition-colors"
                >
                  <div className="px-[22px] pt-[22px] pb-[16px] border-b border-[#F1F5F9]">
                    <div className="flex items-center justify-between mb-[8px]">
                      <span
                        className={`inline-block text-[10px] uppercase tracking-[0.14em] font-[700] px-[8px] py-[3px] ${
                          kit.tier === "starter"
                            ? "bg-[#FFFBEB] text-[#B45309]"
                            : kit.tier === "pro"
                              ? "bg-[#1E293B] text-white"
                              : "bg-[#0F172A] text-[#FCD34D]"
                        }`}
                      >
                        {tierLabel}
                      </span>
                      <Package size={16} strokeWidth={1.8} className="text-[#94A3B8]" />
                    </div>
                    <h3 className="text-[19px] font-[800] text-[#1E293B] font-[family-name:var(--font-dm-sans)] mb-[4px]">
                      {kit.name_en}
                    </h3>
                    <div className="flex items-baseline gap-[6px]">
                      <span className="text-[10px] uppercase tracking-[0.1em] text-[#94A3B8] font-[600]">
                        From
                      </span>
                      <span className="text-[24px] font-[800] text-[#1E293B] tabular-nums font-[family-name:var(--font-dm-sans)]">
                        {priceFmt(kit.price_from)}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#94A3B8] font-[family-name:var(--font-dm-sans)]">
                      VAT 24% included
                    </div>
                  </div>

                  <ul className="flex flex-col p-[22px] gap-[10px] flex-1">
                    {kitItems.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-[10px] text-[13px] text-[#334155] font-[family-name:var(--font-dm-sans)]"
                      >
                        <CheckCircle2
                          size={14}
                          strokeWidth={2.2}
                          className="text-[#D97706] mt-[3px] shrink-0"
                        />
                        <div className="flex-1">
                          {item.product ? (
                            <Link
                              href={`/${locale}/toode/${item.product.handle}`}
                              className="hover:text-[#D97706]"
                            >
                              {item.displayTitle}
                            </Link>
                          ) : (
                            <span>{item.displayTitle}</span>
                          )}
                          {item.product?.price && (
                            <span className="text-[11px] text-[#94A3B8] ml-[6px] tabular-nums">
                              {priceFmt(item.product.price)}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="p-[22px] border-t border-[#F1F5F9]">
                    <Link
                      href={`/${locale}/arikliendile#quote`}
                      className="w-full inline-flex items-center justify-center gap-[8px] px-[18px] py-[11px] bg-[#D97706] text-white text-[13px] font-[600] hover:bg-[#B45309] transition-colors font-[family-name:var(--font-dm-sans)]"
                    >
                      Request Quote for This Kit
                      <ArrowRight size={13} strokeWidth={2.5} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Product grid — all vertical products */}
      {products.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[72px]">
          <div className="flex items-end justify-between mb-[24px] flex-wrap gap-[12px]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#D97706] font-[700] mb-[6px] font-[family-name:var(--font-dm-sans)]">
                All Products
              </p>
              <h2 className="text-[22px] sm:text-[28px] font-[800] text-[#1E293B] font-[family-name:var(--font-dm-sans)]">
                Browse all {loc.name.toLowerCase()} products
              </h2>
            </div>
          </div>
          <ProductGridSimple products={products} locale={locale} />
        </section>
      )}

      {/* FAQ */}
      {v.faq.length > 0 && (
        <section className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
          <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[72px]">
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-[32px] lg:gap-[48px]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#D97706] font-[700] mb-[6px] font-[family-name:var(--font-dm-sans)]">
                  FAQ
                </p>
                <h2 className="text-[24px] sm:text-[32px] font-[800] text-[#1E293B] tracking-[-0.015em] font-[family-name:var(--font-dm-sans)]">
                  Frequently asked questions
                </h2>
                <p className="text-[13px] text-[#64748B] mt-[12px] font-[family-name:var(--font-dm-sans)]">
                  Can't find an answer? Email us — we reply within 1 business day.
                </p>
              </div>
              <div className="flex flex-col divide-y divide-[#E2E8F0] bg-white border border-[#E2E8F0]">
                {v.faq.map((f, i) => (
                  <details key={i} className="group" open={i === 0}>
                    <summary className="cursor-pointer p-[20px] sm:p-[24px] flex items-start justify-between gap-[12px] list-none">
                      <h3 className="text-[15px] sm:text-[16px] font-[700] text-[#1E293B] font-[family-name:var(--font-dm-sans)]">
                        {f.q_en}
                      </h3>
                      <span className="text-[#D97706] text-[18px] font-[700] shrink-0 group-open:rotate-45 transition-transform">
                        +
                      </span>
                    </summary>
                    <div className="px-[20px] pb-[20px] sm:px-[24px] sm:pb-[24px] text-[14px] text-[#475569] leading-relaxed font-[family-name:var(--font-dm-sans)]">
                      {f.a_en}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Delivery + Financing strip */}
      <section className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[48px] sm:py-[64px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
          {loc.deliveryNote && (
            <div className="border border-[#E2E8F0] p-[24px] flex gap-[16px]">
              <Truck size={22} strokeWidth={1.8} className="text-[#D97706] shrink-0 mt-[2px]" />
              <div>
                <h3 className="text-[14px] font-[700] text-[#1E293B] mb-[6px] font-[family-name:var(--font-dm-sans)]">
                  Delivery
                </h3>
                <p className="text-[13px] text-[#475569] leading-relaxed font-[family-name:var(--font-dm-sans)]">
                  {loc.deliveryNote}
                </p>
              </div>
            </div>
          )}
          {loc.financingNote && (
            <div className="border border-[#E2E8F0] p-[24px] flex gap-[16px]">
              <CheckCircle2 size={22} strokeWidth={1.8} className="text-[#D97706] shrink-0 mt-[2px]" />
              <div>
                <h3 className="text-[14px] font-[700] text-[#1E293B] mb-[6px] font-[family-name:var(--font-dm-sans)]">
                  Pricing & Financing
                </h3>
                <p className="text-[13px] text-[#475569] leading-relaxed font-[family-name:var(--font-dm-sans)]">
                  {loc.financingNote}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pb-[56px] sm:pb-[72px]">
        <div className="border border-[#1E293B] bg-[#0F172A] text-white p-[32px] sm:p-[48px] flex flex-col lg:flex-row items-start lg:items-center gap-[24px] justify-between">
          <div className="max-w-[620px]">
            <h3 className="text-[22px] sm:text-[28px] font-[800] mb-[10px] tracking-[-0.015em] font-[family-name:var(--font-dm-sans)]">
              You're one of the first. Let's talk.
            </h3>
            <p className="text-[14px] text-white/70 font-[family-name:var(--font-dm-sans)]">
              Tell us about your project — we'll send a custom quote within 48 hours and you'll get 5% off your first order.
            </p>
          </div>
          <div className="flex flex-wrap gap-[10px]">
            <Link
              href={`/${locale}/arikliendile#quote`}
              className="inline-flex items-center gap-[8px] px-[22px] py-[13px] bg-[#D97706] text-white text-[14px] font-[700] hover:bg-[#B45309] transition-colors font-[family-name:var(--font-dm-sans)]"
            >
              Request Quote <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
            <a
              href="mailto:info@xlmarket.ee"
              className="inline-flex items-center gap-[8px] px-[22px] py-[13px] border border-white/25 text-white/90 text-[14px] font-[600] hover:border-white/50 transition-colors font-[family-name:var(--font-dm-sans)]"
            >
              <MessageSquare size={15} strokeWidth={2.2} /> Send Email
            </a>
          </div>
        </div>
      </section>

      {/* Cross-mode escape (spec §4.6 #7) */}
      <section className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pb-[64px]">
        <p className="text-[13px] text-[#64748B] font-[family-name:var(--font-dm-sans)]">
          Prefer to browse yourself?{" "}
          <Link href={`/${locale}`} className="text-[#D97706] font-[600] hover:underline">
            Open category browser
          </Link>
          {" "}or{" "}
          <Link href={`/${locale}/alustajale`} className="text-[#D97706] font-[600] hover:underline">
            see other starter kits
          </Link>.
        </p>
      </section>
    </div>
  )
}

function ProductGridSimple({ products, locale }: { products: MeiliHit[]; locale: string }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[16px] sm:gap-[20px]">
      {products.map((p) => (
        <Link
          key={p.id}
          href={`/${locale}/toode/${p.handle}`}
          className="group border border-[#E2E8F0] bg-white hover:border-[#D97706] transition-colors flex flex-col"
        >
          <div
            className="aspect-square bg-center bg-contain bg-no-repeat bg-[#F8FAFC]"
            style={{ backgroundImage: p.thumbnail ? `url(${p.thumbnail})` : undefined }}
          />
          <div className="p-[14px] flex flex-col flex-1">
            <h3 className="text-[12.5px] font-[600] text-[#1E293B] leading-snug line-clamp-2 mb-[8px] font-[family-name:var(--font-dm-sans)] group-hover:text-[#D97706]">
              {getProductTitle(p, locale)}
            </h3>
            <div className="mt-auto text-[15px] font-[800] text-[#1E293B] tabular-nums font-[family-name:var(--font-dm-sans)]">
              €{(p.price || 0).toLocaleString("en-US")}
            </div>
            <div className="text-[10px] text-[#94A3B8] font-[family-name:var(--font-dm-sans)]">
              VAT 24% included
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
