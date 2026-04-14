import type { Metadata } from "next"
import BannerCarousel from "@/components/BannerCarousel"
import CategoryBentoGrid from "@/components/CategoryBentoGrid"
import ProductGrid from "@/components/ProductGrid"

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isEt = locale === "et"
  return {
    title: isEt
      ? "XLMARKET — Professionaalsed tööriistad ja seadmed"
      : "XLMARKET — Professional Tools & Equipment",
    description: isEt
      ? "Üle 10 000 toote: tööriistad, seadmed, köögivarustus, autovarustus. Soodne hind, 2-aastane garantii, tarne üle Eesti."
      : "Over 10,000 products: tools, equipment, kitchen, automotive. Affordable prices, 2-year warranty, delivery across Estonia.",
    alternates: {
      canonical: `https://xlmarket.store/${locale}`,
      languages: {
        et: "https://xlmarket.store/et",
        en: "https://xlmarket.store/en",
      },
    },
  }
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return (
    <>
      <BannerCarousel locale={locale} />

      <CategoryBentoGrid locale={locale} />

      <section className="py-5 md:py-8">
        <div className="max-w-[1360px] mx-auto px-4">
          <div className="flex items-center gap-2 mb-3 md:mb-5">
            <div className="w-1 h-5 rounded-full bg-[#D97706]" />
            <h2 className="font-bold text-[17px] md:text-xl text-[#1E293B] tracking-tight">
              {locale === "et" ? "Enimmüüdud" : "Best Sellers"}
            </h2>
          </div>
          <ProductGrid
            fetchParams={{ q: "", sort: "price:desc", limit: 10, locale }}
            locale={locale}
            columns="2-3-5"
          />
        </div>
      </section>

      <section className="py-5 md:py-8">
        <div className="max-w-[1360px] mx-auto px-4">
          <div className="flex items-center gap-2 mb-3 md:mb-5">
            <div className="w-1 h-5 rounded-full bg-[#D97706]" />
            <h2 className="font-bold text-[17px] md:text-xl text-[#1E293B] tracking-tight">
              {locale === "et" ? "Uued tooted" : "New Arrivals"}
            </h2>
          </div>
          <ProductGrid
            fetchParams={{ q: "", sort: "created_at:desc", limit: 10, locale }}
            locale={locale}
            columns="2-3-5"
          />
        </div>
      </section>
    </>
  )
}
