import { getProducts, getCategories } from "@/lib/medusa"
import BannerCarousel from "@/components/BannerCarousel"
import CategoryExploreGrid from "@/components/CategoryExploreGrid"
import VevorProductCard from "@/components/VevorProductCard"
import HorizontalProductRow from "@/components/HorizontalProductRow"
import categoryImages from "@/lib/category-images.json"

export const revalidate = 300

const DISPLAY_NAMES: Record<string, string> = {
  "ehitus-ja-remont": "Ehitus ja remont",
  "toostus-ja-seadmed": "Tööriistad ja tööstus",
  "kodu-ja-aed": "Kodu ja aed",
  "auto-ja-garaaz": "Auto ja garaaž",
  "sport-ja-vaba-aeg": "Sport ja vaba aeg",
  "kunst-ja-kasitoo": "Kunst ja käsitöö",
  "toitlustus-ja-kook": "Köök ja toitlustus",
  "elektroonika": "Elektroonika",
  "lemmikloomad": "Lemmikloomad",
  "kontor-ja-ladustamine": "Kontor ja ladustamine",
  "meditsiin-ja-tervishoid": "Meditsiin ja tervishoid",
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

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  let bestSellers, newArrivals, allCategories
  try {
    [bestSellers, newArrivals, allCategories] = await Promise.all([
      getProducts({ limit: 10 }),
      getProducts({ limit: 10, order: "-created_at" }),
      getCategories(),
    ])
  } catch {
    bestSellers = { products: [], count: 0, offset: 0, limit: 10 }
    newArrivals = { products: [], count: 0, offset: 0, limit: 10 }
    allCategories = []
  }

  // Curated L1 categories for homepage — VEVOR EN handles that have real products
  // These are the main handles from VEVOR taxonomy that map to browseable categories
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
          displayName: DISPLAY_NAMES[cat.handle] || cat.name,
          image: CATEGORY_IMAGES[cat.handle] || res.products[0]?.thumbnail || null,
          productCount: res.count || 0,
        }
      } catch {
        return {
          name: cat.name,
          handle: cat.handle,
          displayName: DISPLAY_NAMES[cat.handle] || cat.name,
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

      <HorizontalProductRow title="Enimmüüdud" products={bestSellers.products} locale={locale} />
      <HorizontalProductRow title="Uued tooted" products={newArrivals.products} locale={locale} />

    </>
  )
}
