import { getProducts, getCategories } from "@/lib/medusa"
import { searchProducts, getLocalizedTitle } from "@/lib/meilisearch"
import BannerCarousel from "@/components/BannerCarousel"
import CategoryExploreGrid from "@/components/CategoryExploreGrid"
import VevorProductCard from "@/components/VevorProductCard"
import HorizontalProductRow from "@/components/HorizontalProductRow"
import categoryImages from "@/lib/category-images.json"

export const revalidate = 300

const DISPLAY_NAMES: Record<string, { et: string; en: string }> = {
  // Estonian handles
  "ehitus-ja-remont": { et: "Ehitus ja remont", en: "Building & Renovation" },
  "toostus-ja-seadmed": { et: "Tööriistad ja tööstus", en: "Tools & Industrial" },
  "kodu-ja-aed": { et: "Kodu ja aed", en: "Home & Garden" },
  "auto-ja-garaaz": { et: "Auto ja garaaž", en: "Automotive" },
  "sport-ja-vaba-aeg": { et: "Sport ja vaba aeg", en: "Sports & Outdoors" },
  "kunst-ja-kasitoo": { et: "Kunst ja käsitöö", en: "Arts & Crafts" },
  "toitlustus-ja-kook": { et: "Köök ja toitlustus", en: "Kitchen & Catering" },
  "elektroonika": { et: "Elektroonika", en: "Electronics" },
  "lemmikloomad": { et: "Lemmikloomad", en: "Pets" },
  "kontor-ja-ladustamine": { et: "Kontor ja ladustamine", en: "Office & Storage" },
  "meditsiin-ja-tervishoid": { et: "Meditsiin ja tervishoid", en: "Medical & Health" },
  // VEVOR EN handles (used by HOMEPAGE_CATEGORIES)
  "automotive": { et: "Auto ja garaaž", en: "Automotive" },
  "tools": { et: "Tööriistad", en: "Tools" },
  "outdoors": { et: "Aed ja õu", en: "Outdoors" },
  "plumbing": { et: "Torutööd ja sanitaar", en: "Plumbing" },
  "building-materials": { et: "Ehitus ja remont", en: "Building Materials" },
  "appliances": { et: "Kodumasinad", en: "Appliances" },
  "kitchen": { et: "Köök ja toitlustus", en: "Kitchen & Catering" },
  "flooring": { et: "Põrandad ja plaatimine", en: "Flooring" },
  "sports-outdoors": { et: "Sport ja vaba aeg", en: "Sports & Outdoors" },
  "industrial-scientific": { et: "Tööstus ja labor", en: "Industrial & Scientific" },
  "electrical": { et: "Elektroonika", en: "Electrical" },
  "hardware": { et: "Riistvara ja tööriistad", en: "Hardware & Tools" },
  "lawn-garden": { et: "Aed ja muru", en: "Lawn & Garden" },
  "heating-cooling": { et: "Küte ja jahutus", en: "Heating & Cooling" },
  "health-wellness": { et: "Tervis ja heaolu", en: "Health & Wellness" },
  "arts-crafts": { et: "Kunst ja käsitöö", en: "Arts & Crafts" },
}

const CATEGORY_IMAGES_JSON: Record<string, string> = categoryImages as Record<string, string>

// Live product thumbnails per category — fetched from MeiliSearch, original quality
const HOMEPAGE_IMAGES: Record<string, string> = {
  "automotive": "https://image.vevor.com/us%2FQTSTCTTSDNQONMY7J001V0%2Foriginal_img-v2%2Ftrailer-coupler-lock-m100-1.2.jpg?timestamp=1700000000000",
  "plumbing": "https://image.vevor.com/us%2F3CFM1-3HPZKBOC001V2%2Foriginal_img-v10%2Fvacuum-pump-m100-1.2.jpg?timestamp=1700096920000",
  "sports-outdoors": "https://image.vevor.com/us%2FZDJSCCZPDBKDQ5ELZV9%2Foriginal_img-v1%2Fexercise-bike-m100-1.2.jpg?timestamp=1700000000000",
  "tools": "https://image.vevor.com/us%2F0618-3BMNCC000001V2%2Foriginal_img-v9%2Fmetal-lathe-m100-1.2.jpg?timestamp=1652168143000",
  "outdoors": "https://image.vevor.com/us%2FPZSHLK37INCH5XEW0001V2%2Foriginal_img-v1%2Frotisserie-grill-m100-1.2.jpg?timestamp=1700000000000",
  "building-materials": "https://image.vevor.com/us%2FDGNZDTLHJ3JPBIFH9V0%2Foriginal_img-v1%2Fmulti-purpose-folding-ladder-m100-1.2.jpg?timestamp=1700000000000",
  "appliances": "https://image.vevor.com/us%2F1100WJRJ90800X001V2%2Foriginal_img-v10%2Fcommercial-meat-grinder-m100-1.2.jpg?timestamp=1730432819000",
  "kitchen": "https://image.vevor.com/us%2FNGZLQ70L000000001V2%2Foriginal_img-v8%2Fmoonshine-still-m100-1.2.jpg?timestamp=1629787429000",
  "flooring": "https://image.vevor.com/us%2F120CMCZQGJ0000001V0%2Foriginal_img-v8%2Ftile-cutter-m100-1.2.jpg?timestamp=1751451233000",
  "industrial-scientific": "https://image.vevor.com/us%2FSMXWJ3.5X-90XTS01V0%2Foriginal_img-v4%2Fstereo-microscope-m100-1.2.jpg?timestamp=1628592013000",
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
  let allCategories: any[] = []

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

  // 2) Fetch categories
  try {
    allCategories = await getCategories()
  } catch {
    allCategories = []
  }

  // Curated L1 categories for homepage — VEVOR EN handles that have real products
  const HOMEPAGE_CATEGORIES = [
    "automotive", "tools", "outdoors", "plumbing", "building-materials",
    "appliances", "kitchen", "flooring", "sports-outdoors", "industrial-scientific",
  ]
  const handleSet = new Set(HOMEPAGE_CATEGORIES)
  const topCategories = allCategories
    .filter((c) => !c.parent_category_id && handleSet.has(c.handle))
    .slice(0, 10)

  // Get one product per category for thumbnail
  const categoryData = await Promise.all(
    topCategories.map(async (cat) => {
      try {
        const res = await getProducts({ limit: 1, category_id: [cat.id] })
        return {
          name: cat.name,
          handle: cat.handle,
          displayName: DISPLAY_NAMES[cat.handle]?.[locale] || DISPLAY_NAMES[cat.handle]?.et || cat.name,
          image: CATEGORY_IMAGES[cat.handle] || res.products[0]?.thumbnail || null,
          productCount: res.count || 0,
        }
      } catch {
        return {
          name: cat.name,
          handle: cat.handle,
          displayName: DISPLAY_NAMES[cat.handle]?.[locale] || DISPLAY_NAMES[cat.handle]?.et || cat.name,
          image: null,
          productCount: 0,
        }
      }
    })
  )

  return (
    <>
      <BannerCarousel locale={locale} />

      <CategoryExploreGrid categories={categoryData} locale={locale} />

      <HorizontalProductRow title={locale === "et" ? "Enimmüüdud" : "Best Sellers"} products={bestSellers} locale={locale} />
      <HorizontalProductRow title={locale === "et" ? "Uued tooted" : "New Arrivals"} products={newArrivals} locale={locale} />

    </>
  )
}
