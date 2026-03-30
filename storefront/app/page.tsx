import type { Metadata } from "next"
import Link from "next/link"
import { getProducts, getCategories, getCmsContent } from "@/lib/medusa"
import ProductCard from "@/components/ProductCard"
import PromoBanner from "@/components/PromoBanner"
import CountdownTimer from "@/components/CountdownTimer"
import BestSellersSection from "@/components/BestSellersSection"
import NewsletterSection from "@/components/NewsletterSection"
import AnnouncementBar from "@/components/AnnouncementBar"
import {
  ArrowRight,
  Leaf,
  Package,
} from "lucide-react"

export const revalidate = 300

export const metadata: Metadata = {
  title: "XLMARKET — Suur valik, väike hind",
  description:
    "Kvaliteetsed tööriistad, seadmed ja kodukaup soodsa hinnaga. Kiire tarne Eestis. Üle 10 000 toote.",
  openGraph: {
    title: "XLMARKET — Suur valik, väike hind",
    description:
      "Kvaliteetsed tööriistad, seadmed ja kodukaup soodsa hinnaga. Kiire tarne Eestis.",
    type: "website",
    locale: "et_EE",
    siteName: "XLMARKET",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "XLMARKET — Suur valik, väike hind",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "XLMARKET — Suur valik, väike hind",
    description:
      "Kvaliteetsed tööriistad, seadmed ja kodukaup soodsa hinnaga.",
    images: ["/og-image.png"],
  },
}

const trustItems = [
  { label: "Tasuta tarne", sub: "alates 50€" },
  { label: "2 aasta garantii", sub: "kõigile toodetele" },
  { label: "14 päeva tagastus", sub: "probleemivaba" },
  { label: "Turvaline makse", sub: "krüpteeritud" },
]

export default async function Home() {
  const BS_CATS = [
    { label: "Ehitus",    handle: "ehitus-ja-remont",      id: "pcat_01KMRXYCF1PP71JGTD05ANC85T" },
    { label: "Tööstus",   handle: "toostus-ja-seadmed",    id: "pcat_01KMRXYCGKWBEN1Y4GF0ZJADME" },
    { label: "Kodu",      handle: "kodu-ja-aed",           id: "pcat_01KMRXYCHX0VNQ283CTP2FTAR1" },
    { label: "Auto",      handle: "auto-ja-garaaz",        id: "pcat_01KMRXYCKA1V998R8RNHJAQV8P" },
    { label: "Sport",     handle: "sport-ja-vaba-aeg",     id: "pcat_01KMRXYCMQFS5M4QEJ8WSWXYSS" },
  ]

  const [dealsRes, latestRes, categories, cms, ...bsCatProducts] = await Promise.all([
    getProducts({ limit: 8, order: "-created_at" }),
    getProducts({ limit: 8, offset: 8, order: "-created_at" }),
    getCategories(),
    getCmsContent(),
    ...BS_CATS.map((c) => getProducts({ limit: 8, category_id: [c.id] })),
  ])

  const bsTabs = BS_CATS.map((c, i) => ({
    label: c.label,
    handle: c.handle,
    products: bsCatProducts[i]?.products ?? [],
  }))

  // Fetch one product thumbnail per category (parallel, for VEVOR-style cards)
  const catThumbsRaw = await Promise.all(
    categories.map((cat) =>
      getProducts({ limit: 1, category_id: [cat.id] })
        .then((res) => [cat.id, res.products[0]?.thumbnail ?? null] as const)
        .catch(() => [cat.id, null] as const)
    )
  )
  const catThumbMap = Object.fromEntries(catThumbsRaw)

  const topBanners = cms.banners.filter(
    (b) => b.position === "home-top" && b.visible
  )

  return (
    <>
      <AnnouncementBar
        text={cms.announcement.text}
        link={cms.announcement.link}
        visible={cms.announcement.visible}
      />

      {/* Promo banners */}
      {topBanners.length > 0 && (
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[24px]">
          {topBanners.map((banner) => (
            <PromoBanner key={banner.id} banner={banner} />
          ))}
        </div>
      )}

      {/* Hero section — two-column with integrated trust strip */}
      {cms.hero.visible && (
        <section
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #FFF5EE 0%, #FFF9F5 35%, #FFFFFF 65%, #F7F7F7 100%)",
            backgroundImage: "url('/hero-bg.svg')",
            backgroundSize: "cover",
            backgroundPosition: "center right",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Ambient orb top-right */}
          <div
            className="absolute top-[-140px] right-[-100px] w-[480px] h-[480px] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(232,101,10,0.09) 0%, transparent 68%)",
            }}
          />
          {/* Ambient orb bottom-left */}
          <div
            className="absolute bottom-[-80px] left-[-60px] w-[300px] h-[300px] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(232,101,10,0.05) 0%, transparent 70%)",
            }}
          />

          {/* Main hero content */}
          <div className="relative max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[64px] pb-[56px] sm:pt-[80px] sm:pb-[64px] lg:pt-[96px] lg:pb-[72px]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-[48px] lg:gap-[64px]">

              {/* Left: content */}
              <div className="max-w-[580px]">
                {/* Eyebrow badge — rounded-full is OK for pill badges */}
                <div
                  className="inline-flex items-center gap-[6px] px-[12px] py-[6px] rounded-full text-[#E8650A] border border-[#E8650A]/20 mb-[20px]"
                  style={{ background: "rgba(232,101,10,0.06)" }}
                >
                  <Leaf size={13} strokeWidth={2} className="shrink-0" />
                  <span className="text-[12px] font-[600] font-[family-name:var(--font-poppins)] tracking-[0.02em]">
                    Kevadmüük — kuni −25%
                  </span>
                </div>

                <h1
                  className="font-[800] font-[family-name:var(--font-poppins)] text-[#1A1A1A] leading-[1.1] tracking-[-0.02em] mb-[18px]"
                  style={{ fontSize: "clamp(32px, 5vw, 52px)", textWrap: "balance" } as React.CSSProperties}
                >
                  {cms.hero.title || "Mitte see tavaline suur e-pood!"}
                </h1>

                {cms.hero.subtitle ? (
                  <p className="text-[16px] sm:text-[18px] font-[family-name:var(--font-inter)] text-[#555555] leading-[1.7] mb-[36px] max-w-[480px]">
                    {cms.hero.subtitle}
                  </p>
                ) : (
                  <p className="text-[16px] sm:text-[18px] font-[family-name:var(--font-inter)] text-[#555555] leading-[1.7] mb-[36px] max-w-[480px]">
                    Tuhanded erilised tooted, eriliselt hea hinnaga.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-[16px]">
                  {/* Primary CTA — allowed */}
                  <Link
                    href={cms.hero.buttonLink || "/kategooriad"}
                    className="group inline-flex items-center gap-[10px] bg-[#E8650A] text-white px-[22px] py-[12px] text-[15px] font-[600] font-[family-name:var(--font-poppins)] hover:bg-[#CF5A08] active:scale-[0.98]"
                    style={{
                      boxShadow: "0 4px 20px rgba(232,101,10,0.28), 0 1px 0 rgba(255,255,255,0.12) inset",
                      transition: "all 0.25s cubic-bezier(0.32,0.72,0,1)",
                    }}
                  >
                    {cms.hero.buttonText || "Vaata tooteid"}
                    <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-white/15 group-hover:translate-x-[2px] transition-transform duration-[200ms]">
                      <ArrowRight size={13} strokeWidth={2} />
                    </span>
                  </Link>

                  {/* Secondary link */}
                  <Link
                    href="/kategooriad"
                    className="group inline-flex items-center gap-[6px] text-[14px] font-[500] font-[family-name:var(--font-poppins)] text-[#666666] hover:text-[#E8650A] underline-offset-4 hover:underline"
                    style={{ transition: "color 0.2s cubic-bezier(0.32,0.72,0,1)" }}
                  >
                    Vaata sooduspakkumisi
                    <ArrowRight size={14} strokeWidth={1.5} className="group-hover:translate-x-[2px] transition-transform duration-[200ms]" />
                  </Link>
                </div>
              </div>

              {/* Right: decorative sale card — keeps as decorative promo element */}
              <div
                className="hidden lg:block shrink-0"
                aria-hidden="true"
              >
                <div
                  className="p-[6px]"
                  style={{
                    background: "rgba(232,101,10,0.08)",
                    border: "1px solid rgba(232,101,10,0.16)",
                  }}
                >
                  <div
                    className="flex flex-col items-center justify-center gap-[6px] text-white"
                    style={{
                      width: "260px",
                      height: "260px",
                      background:
                        "linear-gradient(145deg, #F47C2A 0%, #E8650A 55%, #C95208 100%)",
                      boxShadow:
                        "0 20px 48px rgba(232,101,10,0.28), inset 0 1px 1px rgba(255,255,255,0.18)",
                    }}
                  >
                    <span
                      className="font-[family-name:var(--font-inter)] text-white/60 tracking-[0.14em] uppercase"
                      style={{ fontSize: "11px", fontWeight: 500 }}
                    >
                      Kevadmüük
                    </span>
                    <span
                      className="font-[800] font-[family-name:var(--font-poppins)] text-white leading-none tracking-[-0.04em]"
                      style={{ fontSize: "76px" }}
                    >
                      −25%
                    </span>
                    <span
                      className="font-[family-name:var(--font-inter)] text-white/75"
                      style={{ fontSize: "13px", fontWeight: 400 }}
                    >
                      valitud toodetel
                    </span>
                    <div
                      className="mt-[10px] px-[14px] py-[6px] rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.18)",
                        border: "1px solid rgba(255,255,255,0.28)",
                      }}
                    >
                      <span
                        className="font-[600] font-[family-name:var(--font-poppins)] text-white tracking-[0.06em]"
                        style={{ fontSize: "12px" }}
                      >
                        Kood: KEVAD25
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust strip — inside hero, bottom, text-only, no icons */}
          <div
            className="border-t"
            style={{ borderColor: "rgba(0,0,0,0.07)", background: "rgba(255,255,255,0.60)" }}
          >
            <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px]">
              <div className="grid grid-cols-2 sm:grid-cols-4">
                {trustItems.map((item, i) => (
                  <div
                    key={item.label}
                    className={
                      "flex flex-col items-center justify-center py-[14px] px-[8px] text-center" +
                      (i < 3 ? " border-r" : "")
                    }
                    style={{ borderColor: "rgba(0,0,0,0.07)" }}
                  >
                    <span
                      className="font-[family-name:var(--font-poppins)] text-[#1A1A1A]"
                      style={{ fontSize: "13px", fontWeight: 600, lineHeight: "1.3" }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="font-[family-name:var(--font-inter)] text-[#999999] mt-[2px]"
                      style={{ fontSize: "11px", lineHeight: "1.4" }}
                    >
                      {item.sub}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px]">
        {/* Categories */}
        <section className="pt-[48px] pb-[48px]">
          <h2 className="text-[24px] sm:text-[28px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[32px]">
            Kategooriad
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[1px] border border-[#E8E8E8]" style={{ background: "#E8E8E8" }}>
            {categories.map((cat) => {
              const thumb = catThumbMap[cat.id] ?? null
              return (
                <Link
                  key={cat.id}
                  href={"/kategooriad/" + cat.handle}
                  className="group flex items-center justify-between bg-white hover:bg-[#FFF5EE] overflow-hidden"
                  style={{ transition: "background-color 0.18s cubic-bezier(0.32,0.72,0,1)" }}
                >
                  <div className="px-[14px] py-[14px] flex-1 min-w-0">
                    <span
                      className="text-[13px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] group-hover:text-[#E8650A] leading-[1.4] block"
                      style={{ transition: "color 0.18s" }}
                    >
                      {cat.name}
                    </span>
                  </div>
                  <div className="w-[80px] h-[72px] shrink-0 relative bg-[#F7F7F7] flex items-center justify-center overflow-hidden">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="w-full h-full object-contain p-[8px]"
                        loading="lazy"
                      />
                    ) : (
                      <Package size={26} strokeWidth={1} className="text-[#DDDDDD]" />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>


        {/* Deals / Pakkumised — XLM-37 */}
        <section className="pt-[48px] pb-[48px]">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[16px] mb-[32px]">
            <div className="flex items-center gap-[14px]">
              <h2 className="text-[24px] sm:text-[28px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">
                Pakkumised
              </h2>
              {/* Campaign badge */}
              <span
                className="inline-flex items-center px-[10px] py-[4px] rounded-full text-[11px] font-[600] font-[family-name:var(--font-poppins)] tracking-[0.04em] text-white"
                style={{ background: "#E8650A" }}
              >
                KEVADMÜÜK
              </span>
            </div>
            {/* Countdown + link */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-[12px] sm:gap-[24px]">
              <div className="flex items-center gap-[10px]">
                <span className="text-[13px] text-[#999999] font-[family-name:var(--font-inter)]">
                  Lõpeb:
                </span>
                <CountdownTimer />
              </div>
              <Link
                href="/kategooriad"
                className="group inline-flex items-center gap-[4px] text-[#E8650A] hover:text-[#CF5A08] text-[14px] font-[500] font-[family-name:var(--font-poppins)]"
                style={{ transition: "color 0.18s" }}
              >
                Kõik pakkumised
                <ArrowRight
                  size={16}
                  strokeWidth={1.5}
                  className="group-hover:translate-x-[2px] transition-transform"
                />
              </Link>
            </div>
          </div>
          {/* Promo code banner */}
          <div
            className="flex items-center gap-[10px] px-[16px] py-[12px] mb-[24px] border-l-[3px] border-[#E8650A]"
            style={{ background: "rgba(232,101,10,0.05)", border: "1px solid rgba(232,101,10,0.14)" }}
          >
            <span className="text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">
              Kasuta allahindlust ostukorvis:
            </span>
            <code
              className="px-[8px] py-[3px] text-[13px] font-[700] font-[family-name:var(--font-poppins)] text-[#E8650A] tracking-[0.08em]"
              style={{ background: "rgba(232,101,10,0.10)" }}
            >
              KEVAD25
            </code>
            <span className="text-[13px] font-[family-name:var(--font-inter)] text-[#999999]">
              − 25% kõigilt valitud toodetelt
            </span>
          </div>
          {/* Products grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[16px]">
            {dealsRes.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* Best Sellers — XLM-38 */}
        <BestSellersSection tabs={bsTabs} />

        {/* Latest Products */}
        <section className="pb-[64px]">
          <div className="flex items-center justify-between mb-[32px]">
            <h2 className="text-[24px] sm:text-[28px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">
              Uusimad tooted
            </h2>
            <Link
              href="/kategooriad"
              className="group inline-flex items-center gap-[4px] text-[#E8650A] hover:text-[#CF5A08] text-[14px] font-[500] font-[family-name:var(--font-poppins)]"
              style={{ transition: "color 0.18s" }}
            >
              Vaata kõiki
              <ArrowRight
                size={16}
                strokeWidth={1.5}
                className="group-hover:translate-x-[2px] transition-transform"
              />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[16px]">
            {latestRes.products.map((product) => (
              <ProductCard key={product.id} product={product} isNew />
            ))}
          </div>
          <p className="text-center text-[#999999] text-[13px] font-[family-name:var(--font-inter)] mt-[32px]">
            Kokku {latestRes.count.toLocaleString("et-EE")} toodet
          </p>
        </section>
        {/* Newsletter signup */}
        <NewsletterSection />
      </div>
    </>
  )
}
