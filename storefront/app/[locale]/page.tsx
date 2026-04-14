import type { Metadata } from "next"
import HeroBar from "@/components/HeroBar"
import HomeBentoGrid from "@/components/HomeBentoGrid"
import SubcategoryPills from "@/components/SubcategoryPills"
import HomeProductSection from "@/components/HomeProductSection"
import FlashSaleTimer from "@/components/FlashSaleTimer"
import AiSearchPalette from "@/components/AiSearchPalette"

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isEt = locale === "et"
  return {
    title: isEt
      ? "XLMarket — Professionaalsed tööriistad poole hinnaga"
      : "XLMarket — Professional Tools, Half the Price",
    description: isEt
      ? "Üle 16 000 toote: tööriistad, seadmed, köögivarustus, autovarustus. Soodne hind, 2-aastane garantii, tarne üle Euroopa."
      : "Over 16,000 products: tools, equipment, kitchen, automotive. Affordable prices, 2-year warranty, delivery across Europe.",
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
  const isEt = locale === "et"

  return (
    <>
      <HeroBar locale={locale} />

      <HomeBentoGrid locale={locale} />

      <SubcategoryPills locale={locale} />

      {/* New Arrivals */}
      <HomeProductSection
        title={isEt ? "Uued tooted" : "New Arrivals"}
        seeAllHref={`/${locale}/otsing?sort=newest`}
        locale={locale}
        fetchParams={{ q: "", sort: "created_at:desc", limit: 10, locale }}
      />

      {/* Best Sellers */}
      <HomeProductSection
        title={isEt ? "Bestsellerid" : "Best Sellers"}
        seeAllHref={`/${locale}/otsing?tag=hot`}
        locale={locale}
        fetchParams={{ q: "", sort: "price:desc", limit: 10, locale }}
      />

      {/* Deals of the Week */}
      <HomeProductSection
        title={isEt ? "Nädala pakkumised" : "Deals of the Week"}
        seeAllHref={`/${locale}/otsing?tag=deals`}
        locale={locale}
        fetchParams={{ q: "", filter: "discount > 0", sort: "discount:desc", limit: 10, locale }}
      />

      {/* Flash Sale */}
      <HomeProductSection
        title={isEt ? "Välkmüük" : "Flash Sale"}
        seeAllHref={`/${locale}/otsing?tag=flash-sale`}
        locale={locale}
        fetchParams={{ q: "", filter: "discount > 30", sort: "discount:desc", limit: 10, locale }}
        timer={<FlashSaleTimer />}
      />

      <AiSearchPalette locale={locale} />
    </>
  )
}
