import type { Metadata } from "next"
import { getProducts, getCategories } from "@/lib/medusa"
import { searchProducts, getLocalizedTitle } from "@/lib/meilisearch"
import BannerCarousel from "@/components/BannerCarousel"
import CategoryExploreGrid from "@/components/CategoryExploreGrid"
import VevorProductCard from "@/components/VevorProductCard"
import HorizontalProductRow from "@/components/HorizontalProductRow"
import categoryImages from "@/lib/category-images.json"
import { MENU_ORDER } from "@/lib/menu-order"

export const revalidate = 300

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

const DISPLAY_NAMES: Record<string, string> = {
  "outdoors": "Outdoors",
  "tools": "Tools",
  "automotive": "Automotive",
  "kitchen": "Kitchen",
  "building-materials": "Building Materials",
  "plumbing": "Plumbing",
  "sports-outdoors": "Sports & Outdoors",
  "industrial-scientific": "Industrial & Scientific",
  "electrical": "Electrical",
  "heating-venting-cooling": "Heating & Cooling",
  "hardware": "Hardware",
  "furniture": "Furniture",
  "appliances": "Appliances",
  "flooring": "Flooring",
  "home-decor": "Home Decor",
  "bath": "Bath",
  "storage-organization": "Storage & Organization",
  "lighting": "Lighting",
  "cleaning": "Cleaning",
  "health-and-wellness": "Health & Wellness",
  "safety-equipment": "Safety Equipment",
  "paint": "Paint",
}

const CATEGORY_IMAGES_JSON: Record<string, string> = categoryImages as Record<string, string>

// Live product thumbnails per category (new L1 handles)
const HOMEPAGE_IMAGES: Record<string, string> = {
  "automotive": "https://image.vevor.com/us%2FQTSTCTTSDNQONMY7J001V0%2Foriginal_img-v2%2Ftrailer-coupler-lock-m100-1.2.jpg?timestamp=1700000000000",
  "kitchen": "https://image.vevor.com/us%2F1100WJRJ90800X001V2%2Foriginal_img-v10%2Fcommercial-meat-grinder-m100-1.2.jpg?timestamp=1730432819000",
  "outdoors": "https://image.vevor.com/us%2FPZSHLK37INCH5XEW0001V2%2Foriginal_img-v1%2Frotisserie-grill-m100-1.2.jpg?timestamp=1700000000000",
  "sports-outdoors": "https://image.vevor.com/us%2FZDJSCCZPDBKDQ5ELZV9%2Foriginal_img-v1%2Fexercise-bike-m100-1.2.jpg?timestamp=1700000000000",
  "building-materials": "https://image.vevor.com/us%2FDGNZDTLHJ3JPBIFH9V0%2Foriginal_img-v1%2Fmulti-purpose-folding-ladder-m100-1.2.jpg?timestamp=1700000000000",
  "hardware": "https://image.vevor.com/us%2F0618-3BMNCC000001V2%2Foriginal_img-v9%2Fmetal-lathe-m100-1.2.jpg?timestamp=1652168143000",
  "electrical": "https://image.vevor.com/us%2FSMXWJ3.5X-90XTS01V0%2Foriginal_img-v4%2Fstereo-microscope-m100-1.2.jpg?timestamp=1628592013000",
  "health-and-wellness": "https://image.vevor.com/us%2F3CFM1-3HPZKBOC001V2%2Foriginal_img-v10%2Fvacuum-pump-m100-1.2.jpg?timestamp=1700096920000",
  "heating-venting-cooling": "https://image.vevor.com/us%2F120CMCZQGJ0000001V0%2Foriginal_img-v8%2Ftile-cutter-m100-1.2.jpg?timestamp=1751451233000",
}

const CATEGORY_IMAGES: Record<string, string> = { ...CATEGORY_IMAGES_JSON, ...HOMEPAGE_IMAGES }

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

  const categoryData = MENU_ORDER.map((handle) => ({
    name: DISPLAY_NAMES[handle] || handle.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    handle,
    displayName: DISPLAY_NAMES[handle] || handle.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    image: CATEGORY_IMAGES[handle] || null,
  }))

  return (
    <>
      <BannerCarousel locale={locale} />

      <CategoryExploreGrid categories={categoryData} locale={locale} />

      <HorizontalProductRow title={locale === "et" ? "Enimmüüdud" : "Best Sellers"} products={bestSellers} locale={locale} />
      <HorizontalProductRow title={locale === "et" ? "Uued tooted" : "New Arrivals"} products={newArrivals} locale={locale} />

    </>
  )
}
