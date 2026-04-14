import type { Metadata } from "next"
import { getProducts } from "@/lib/medusa"
import { searchProducts, getLocalizedTitle } from "@/lib/meilisearch"
import BannerCarousel from "@/components/BannerCarousel"
import CategoryBentoGrid from "@/components/CategoryBentoGrid"
import HorizontalProductRow from "@/components/HorizontalProductRow"

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

/** Map MeiliSearch hit to Product shape (same pattern as category page) */
function meiliHitToProduct(hit: any, locale: string) {
  return {
    id: hit.id,
    title: getLocalizedTitle(hit, locale),
    handle: hit.handle,
    description: hit.description,
    thumbnail: hit.thumbnail,
    images: [],
    variants: [{
      id: hit.id + "_v",
      title: "Default",
      calculated_price: {
        calculated_amount: Math.round(hit.price * 100),
        original_amount: Math.round(hit.price * 100),
        currency_code: "eur",
      },
    }],
    categories: (hit.categories || []).map((name: string, i: number) => ({
      id: `cat_${i}`, name, handle: hit.category_handles?.[i] || "", parent_category_id: null,
    })),
    created_at: new Date((hit.created_at || 0) * 1000).toISOString(),
  }
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  let bestSellers: any[] = []
  let newArrivals: any[] = []

  // 1) Try MeiliSearch first for product sections (proven to work on category pages)
  try {
    const [bestResult, newResult] = await Promise.all([
      searchProducts({ q: "", limit: 10, sort: ["price:desc"] }),
      searchProducts({ q: "", limit: 10, sort: ["created_at:desc"] }),
    ])
    bestSellers = bestResult.hits.map(hit => meiliHitToProduct(hit, locale))
    newArrivals = newResult.hits.map(hit => meiliHitToProduct(hit, locale))
  } catch {
    // MeiliSearch failed — try Medusa API as fallback
    try {
      const [bestRes, newRes] = await Promise.all([
        getProducts({ limit: 10 }),
        getProducts({ limit: 10, order: "-created_at" }),
      ])
      bestSellers = bestRes.products
      newArrivals = newRes.products
    } catch {
      // Both failed — sections will be empty (HorizontalProductRow handles this)
    }
  }

  return (
    <>
      <BannerCarousel locale={locale} />

      <CategoryBentoGrid locale={locale} />

      <HorizontalProductRow title={locale === "et" ? "Enimmüüdud" : "Best Sellers"} products={bestSellers} locale={locale} />
      <HorizontalProductRow title={locale === "et" ? "Uued tooted" : "New Arrivals"} products={newArrivals} locale={locale} />

    </>
  )
}
