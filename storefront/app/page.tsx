import type { Metadata } from "next"
import Link from "next/link"
import { getProducts, getCategories, getCmsContent } from "@/lib/medusa"
import ProductCard from "@/components/ProductCard"
import CountdownTimer from "@/components/CountdownTimer"
import BestSellersSection from "@/components/BestSellersSection"
import NewsletterSection from "@/components/NewsletterSection"
import HeroSection from "@/components/HeroSection"
import TeenindajaSection from "@/components/TeenindajaSection"
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Lock,
  Hammer,
  Factory,
  Home as HomeIcon,
  TreePine,
  Car,
  Dumbbell,
  Zap,
  ChefHat,
  PawPrint,
  Monitor,
  Palette,
  Heart,
  Package,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export const revalidate = 300
export const metadata: Metadata = {
  title: "XL Market \u2014 Mitte see tavaline e-pood",
  description:
    "Kvaliteetsed t\u00f6\u00f6riistad, seadmed ja kodukaup soodsa hinnaga. Kiire tarne Eestis. \u00dcle 14 000 toote.",
  openGraph: {
    title: "XL Market \u2014 Mitte see tavaline e-pood",
    description:
      "Kvaliteetsed t\u00f6\u00f6riistad, seadmed ja kodukaup soodsa hinnaga. Kiire tarne Eestis.",
    type: "website",
    locale: "et_EE",
    siteName: "XL Market",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "XL Market \u2014 Mitte see tavaline e-pood",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "XL Market \u2014 Mitte see tavaline e-pood",
    description:
      "Kvaliteetsed t\u00f6\u00f6riistad, seadmed ja kodukaup soodsa hinnaga.",
    images: ["/og-image.png"],
  },
}

const categoryIcons: Record<string, { Icon: LucideIcon; color: string }> = {
  "ehitus-ja-remont": { Icon: Hammer, color: "#F97316" },
  "toostus-ja-seadmed": { Icon: Factory, color: "#64748B" },
  "kodu-ja-aed": { Icon: HomeIcon, color: "#22C55E" },
  "aed-ja-oueala": { Icon: TreePine, color: "#10B981" },
  "auto-ja-garaaz": { Icon: Car, color: "#EF4444" },
  "sport-ja-vaba-aeg": { Icon: Dumbbell, color: "#F43F5E" },
  "elektroonika": { Icon: Zap, color: "#8B5CF6" },
  "toitlustus-ja-kook": { Icon: ChefHat, color: "#F59E0B" },
  "lemmikloomad": { Icon: PawPrint, color: "#14B8A6" },
  "kontor-ja-ladustamine": { Icon: Monitor, color: "#6B7280" },
  "kunst-ja-kasitoo": { Icon: Palette, color: "#EC4899" },
  "meditsiin-ja-tervishoid": { Icon: Heart, color: "#F97316" },
}

function getCategoryMeta(handle: string): { Icon: LucideIcon; color: string } {
  return categoryIcons[handle] || { Icon: Package, color: "#999999" }
}

const trustItems = [
  { icon: "truck", label: "Tasuta tarne", sub: "alates 50\u20ac" },
  { icon: "shield", label: "2-aastane garantii", sub: "k\u00f5igile toodetele" },
  { icon: "rotate", label: "14 p\u00e4eva tagastus", sub: "probleemivaba" },
  { icon: "lock", label: "Turvaline makse", sub: "kr\u00fcpteeritud" },
]

function TrustIcon({ type }: { type: string }) {
  const props = { size: 22, strokeWidth: 1.5, className: "text-[#E8650A]" }
  switch (type) {
    case "truck": return <Truck {...props} />
    case "shield": return <ShieldCheck {...props} />
    case "rotate": return <RotateCcw {...props} />
    case "lock": return <Lock {...props} />
    default: return <Truck {...props} />
  }
}

export default async function Home() {
  const BS_CATS = [
    { label: "Ehitus",    handle: "ehitus-ja-remont",      id: "pcat_01KMRXYCF1PP71JGTD05ANC85T" },
    { label: "T\u00f6\u00f6stus",   handle: "toostus-ja-seadmed",    id: "pcat_01KMRXYCGKWBEN1Y4GF0ZJADME" },
    { label: "Kodu",      handle: "kodu-ja-aed",           id: "pcat_01KMRXYCHX0VNQ283CTP2FTAR1" },
    { label: "Auto",      handle: "auto-ja-garaaz",        id: "pcat_01KMRXYCKA1V998R8RNHJAQV8P" },
    { label: "Sport",     handle: "sport-ja-vaba-aeg",     id: "pcat_01KMRXYCMQFS5M4QEJ8WSWXYSS" },
  ]

  const [dealsRes, popularRes, categories, cms, ...bsCatProducts] = await Promise.all([
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

  const catThumbsRaw = await Promise.all(
    categories.map((cat) =>
      getProducts({ limit: 1, category_id: [cat.id] })
        .then((res) => [cat.id, res.products[0]?.thumbnail ?? null] as const)
        .catch(() => [cat.id, null] as const)
    )
  )
  const catThumbMap = Object.fromEntries(catThumbsRaw)

  return (
    <>
      {/* 1. Hero */}
      <HeroSection />

      {/* 2. Teenindaja (dark section) */}
      <TeenindajaSection />

      {/* 3. Categories */}
      <section className="py-[48px] sm:py-[64px] max-w-[1400px] mx-auto px-[16px] sm:px-[24px]">
        <div className="flex items-end justify-between mb-[32px]">
          <div>
            <h2
              className="text-[24px] sm:text-[28px] font-[700] text-[#1A1A1A] leading-[1.2]"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              Kategooriad
            </h2>
            <p
              className="text-[14px] sm:text-[15px] text-[#777777] mt-[6px]"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              {"Avasta 14\u00a0000+ toodet 10+ kategoorias"}
            </p>
          </div>
          <Link
            href="/kategooriad"
            className="group inline-flex items-center gap-[4px] text-[#E8650A] hover:text-[#CF5A08] text-[14px] font-[500] shrink-0"
            style={{ fontFamily: "var(--font-poppins)", transition: "color 0.18s" }}
          >
            {"Vaata k\u00f5iki"}
            <ArrowRight
              size={16}
              strokeWidth={1.5}
              className="group-hover:translate-x-[2px] transition-transform"
            />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-[16px]">
          {categories.map((cat) => {
            const meta = getCategoryMeta(cat.handle)
            return (
              <Link
                key={cat.id}
                href={"/kategooriad/" + cat.handle}
                className="group bg-white rounded-xl p-[16px] border border-[#F0F0F0] hover:border-[#E8650A]/20 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                style={{ transition: "all 0.22s cubic-bezier(0.32,0.72,0,1)" }}
              >
                <div
                  className="w-[48px] h-[48px] rounded-xl flex items-center justify-center mb-[14px]"
                  style={{ backgroundColor: meta.color + "15" }}
                >
                  <meta.Icon size={24} strokeWidth={1.5} style={{ color: meta.color }} />
                </div>
                <p
                  className="text-[14px] font-[600] text-[#1A1A1A] group-hover:text-[#E8650A] leading-[1.3] mb-[4px]"
                  style={{ fontFamily: "var(--font-poppins)", transition: "color 0.18s" }}
                >
                  {cat.name}
                </p>
                <p
                  className="text-[12px] text-[#999999]"
                  style={{ fontFamily: "var(--font-jakarta)" }}
                >
                  Tooted saadaval
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      {/* 4. Popular Products */}
      <section className="py-[48px] sm:py-[64px] max-w-[1400px] mx-auto px-[16px] sm:px-[24px]">
        <div className="flex items-end justify-between mb-[32px]">
          <div>
            <h2
              className="text-[24px] sm:text-[28px] font-[700] text-[#1A1A1A] leading-[1.2]"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              Populaarsed tooted
            </h2>
            <p
              className="text-[14px] sm:text-[15px] text-[#777777] mt-[6px]"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              {"Enim ostetud sel n\u00e4dalal"}
            </p>
          </div>
          <Link
            href="/kategooriad"
            className="group inline-flex items-center gap-[4px] text-[#E8650A] hover:text-[#CF5A08] text-[14px] font-[500] shrink-0"
            style={{ fontFamily: "var(--font-poppins)", transition: "color 0.18s" }}
          >
            {"Vaata k\u00f5iki"}
            <ArrowRight
              size={16}
              strokeWidth={1.5}
              className="group-hover:translate-x-[2px] transition-transform"
            />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[16px]">
          {popularRes.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 5. Spring Deals */}
      <section className="py-[48px] sm:py-[64px] max-w-[1400px] mx-auto px-[16px] sm:px-[24px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[16px] mb-[32px]">
          <div className="flex items-center gap-[14px]">
            <h2
              className="text-[24px] sm:text-[28px] font-[700] text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              Kevadpakkumised
            </h2>
            <span
              className="inline-flex items-center px-[10px] py-[4px] rounded-full text-[11px] font-[600] tracking-[0.04em] text-white"
              style={{ background: "#E8650A", fontFamily: "var(--font-poppins)" }}
            >
              {"KEVADM\u00dc\u00dcK"}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-[12px] sm:gap-[24px]">
            <div className="flex items-center gap-[10px]">
              <span
                className="text-[13px] text-[#999999]"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                {"L\u00f5peb:"}
              </span>
              <CountdownTimer />
            </div>
            <Link
              href="/kategooriad"
              className="group inline-flex items-center gap-[4px] text-[#E8650A] hover:text-[#CF5A08] text-[14px] font-[500]"
              style={{ fontFamily: "var(--font-poppins)", transition: "color 0.18s" }}
            >
              {"K\u00f5ik pakkumised"}
              <ArrowRight
                size={16}
                strokeWidth={1.5}
                className="group-hover:translate-x-[2px] transition-transform"
              />
            </Link>
          </div>
        </div>
        <div
          className="flex flex-wrap items-center gap-[10px] px-[16px] py-[12px] mb-[24px] rounded-lg"
          style={{ background: "rgba(232,101,10,0.05)", border: "1px solid rgba(232,101,10,0.14)" }}
        >
          <span
            className="text-[13px] text-[#555555]"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            Kasuta allahindlust ostukorvis:
          </span>
          <code
            className="px-[8px] py-[3px] rounded text-[13px] font-[700] text-[#E8650A] tracking-[0.08em]"
            style={{ background: "rgba(232,101,10,0.10)", fontFamily: "var(--font-poppins)" }}
          >
            KEVAD25
          </code>
          <span
            className="text-[13px] text-[#999999]"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            {"− 25% k\u00f5igilt valitud toodetelt"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[16px]">
          {dealsRes.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 6. Best Sellers */}
      <div className="max-w-[1400px] mx-auto px-[16px] sm:px-[24px]">
        <BestSellersSection tabs={bsTabs} />
      </div>

      {/* 7. Trust bar */}
      <section className="py-[48px] sm:py-[64px] max-w-[1400px] mx-auto px-[16px] sm:px-[24px]">
        <div
          className="rounded-2xl border border-[#F0F0F0] bg-white py-[28px] px-[16px]"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[24px]">
            {trustItems.map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center gap-[8px]">
                <div
                  className="w-[48px] h-[48px] rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(232,101,10,0.06)" }}
                >
                  <TrustIcon type={item.icon} />
                </div>
                <div>
                  <p
                    className="text-[14px] font-[600] text-[#1A1A1A]"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="text-[12px] text-[#999999] mt-[2px]"
                    style={{ fontFamily: "var(--font-jakarta)" }}
                  >
                    {item.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Newsletter */}
      <div className="max-w-[1400px] mx-auto px-[16px] sm:px-[24px] pb-[64px]">
        <NewsletterSection />
      </div>
    </>
  )
}
