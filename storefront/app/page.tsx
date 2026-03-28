import type { Metadata } from "next"
import Link from "next/link"
import { getProducts, getCategories, getCmsContent } from "@/lib/medusa"
import ProductCard from "@/components/ProductCard"
import PromoBanner from "@/components/PromoBanner"
import AnnouncementBar from "@/components/AnnouncementBar"

export const revalidate = 300 // revalidate every 5 min

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

export default async function Home() {
  const [productsRes, categories, cms] = await Promise.all([
    getProducts({ limit: 12, order: "-created_at" }),
    getCategories(),
    getCmsContent(),
  ])

  const topBanners = cms.banners.filter((b) => b.position === "home-top" && b.visible)

  return (
    <>
      <AnnouncementBar
        text={cms.announcement.text}
        link={cms.announcement.link}
        visible={cms.announcement.visible}
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Promo banners */}
        {topBanners.map((banner) => (
          <PromoBanner key={banner.id} banner={banner} />
        ))}

        {/* Hero */}
        {cms.hero.visible && (
          <section className="text-center py-16 mb-8">
            <h1 className="text-5xl font-bold tracking-tight mb-4">
              <span className="font-extrabold text-brand-600">XL</span>
              <span>MARKET</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {cms.hero.title || "Suur valik, väike hind"}
            </p>
            {cms.hero.subtitle && (
              <p className="text-gray-500 mb-8 max-w-xl mx-auto">{cms.hero.subtitle}</p>
            )}
            <Link
              href={cms.hero.buttonLink || "/kategooriad"}
              className="inline-block bg-brand-500 text-white px-8 py-3 text-lg font-medium hover:bg-brand-600 transition"
            >
              {cms.hero.buttonText || "Vaata tooteid"}
            </Link>
          </section>
        )}

      {/* Categories */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Kategooriad</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/kategooriad/${cat.handle}`}
              className="border border-gray-200 p-5 text-center hover:border-brand-500 hover:shadow-sm transition"
            >
              <span className="font-medium text-sm">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Products */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Uusimad tooted</h2>
          <Link
            href="/kategooriad"
            className="text-brand-600 hover:text-brand-700 text-sm font-medium"
          >
            Vaata kõiki &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {productsRes.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <p className="text-center text-gray-500 text-sm mt-8">
          Kokku {productsRes.count.toLocaleString("et-EE")} toodet
        </p>
      </section>
    </div>
    </>
  )
}
