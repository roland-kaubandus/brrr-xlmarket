import { getProducts, getCategories } from "@/lib/medusa"
import BannerCarousel from "@/components/BannerCarousel"
import CategoryExploreGrid from "@/components/CategoryExploreGrid"
import VevorProductCard from "@/components/VevorProductCard"
import categoryImages from "@/lib/category-images.json"

export const revalidate = 300

const DISPLAY_NAMES: Record<string, string> = {
  "ehitus-ja-remont": "Building & Construction",
  "toostus-ja-seadmed": "Tools & Industrial",
  "kodu-ja-aed": "Home & Garden",
  "auto-ja-garaaz": "Automotive & Garage",
  "sport-ja-vaba-aeg": "Sports & Outdoors",
  "kunst-ja-kasitoo": "Arts & Crafts",
  "toitlustus-ja-kook": "Kitchen & Dining",
  "elektroonika": "Electronics",
  "lemmikloomad": "Pet Supplies",
  "kontor-ja-ladustamine": "Storage & Office",
  "meditsiin-ja-tervishoid": "Health & Wellness",
}

const CATEGORY_IMAGES_JSON: Record<string, string> = categoryImages as Record<string, string>

// Curated iconic images for homepage categories — manually selected for visual impact
const HOMEPAGE_IMAGES: Record<string, string> = {
  "automotive": "https://image.vevor.com/us%2FCSLBGJDJTQS25TXSQV2%2Fgoods_img-v3%2Fdent-puller-m100-1.2.jpg?timestamp=1681091470000",
  "tools": "https://image.vevor.com/us%2F1.5KWTSSGJ0000001V2%2Fgoods_img-v5%2Fbelt-sander-m100-1.2.jpg?timestamp=1628146296000",
  "outdoors": "https://image.vevor.com/us%2FGLBXXCZBXS53L3J5ZV2%2Fgoods_img-v2%2Fcar-refrigerator-m100-1.2.jpg?timestamp=1730369590000",
  "plumbing": "https://image.vevor.com/us%2FGHKJRSG30YC0BXYABV2%2Fgoods_img-v2%2Frv-heated-water-hose-m100-1.2.jpg?timestamp=1693810786000",
  "building-materials": "https://image.vevor.com/us%2FKSSSJSJB915YBQ5HJV0%2Fgoods_img-v1%2Faluminum-work-plank-m100-1.2.jpg?timestamp=1716950975000",
  "appliances": "https://image.vevor.com/us%2FTSBXGQPJYSBXZDJ9FV2%2Fgoods_img-v1%2Fmeat-cutter-machine-m100-1.2.jpg?timestamp=1738987630000",
  "kitchen": "https://image.vevor.com/us%2F1000GYBSMFJ000001V2%2Fgoods_img-v5%2Felectric-grain-grinder-m100-1.2.jpg?timestamp=1730432849000",
  "flooring": "https://image.vevor.com/us%2FCZQGJ800MMSDSGL05V0%2Fgoods_img-v12%2Ftile-cutter-m100-1.2.jpg?timestamp=1668765407000",
  "furniture": "https://image.vevor.com/us%2FSJZDZDDJ2J703SIXNV2%2Fgoods_img-v1%2Fstanding-desk-frame-m100-1.2.jpg?timestamp=1715650905000",
  "electrical": "https://image.vevor.com/us%2FKFSJJH20U2340PHVWV0%2Fgoods_img-v5%2Fserver-rack-m100-1.2.jpg?timestamp=1685347798000",
  "sports-outdoors": "https://image.vevor.com/us%2FCKDDHSJ251212BWPIV0%2Fgoods_img-v2%2Fgarage-floor-mat-m100-1.2.jpg?timestamp=1712717361000",
  "industrial-scientific": "https://image.vevor.com/us%2FBPQXJ6L0000000001V2%2Fgoods_img-v7%2Fm100-1.2.jpg?timestamp=1730439574000",
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
    "appliances", "kitchen", "flooring", "furniture", "electrical",
    "sports-outdoors", "industrial-scientific",
  ]
  const handleSet = new Set(HOMEPAGE_CATEGORIES)
  const topCategories = allCategories
    .filter((c) => !c.parent_category_id && handleSet.has(c.handle))

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

      {/* Best Sellers */}
      <section className="bg-white py-8">
        <div className="max-w-[1360px] mx-auto px-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-[family-name:var(--font-dm-sans)] font-bold text-xl md:text-2xl text-[#1E293B]">
              Best Sellers
            </h2>
            <a href={`/${locale}/otsing`} className="text-sm font-medium text-[#D97706] hover:underline">
              View All &gt;
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {bestSellers.products.map((p) => (
              <VevorProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="bg-white py-8">
        <div className="max-w-[1360px] mx-auto px-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-[family-name:var(--font-dm-sans)] font-bold text-xl md:text-2xl text-[#1E293B]">
              New Arrivals
            </h2>
            <a href={`/${locale}/otsing?sort=newest`} className="text-sm font-medium text-[#D97706] hover:underline">
              View All &gt;
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {newArrivals.products.map((p) => (
              <VevorProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </div>
      </section>

    </>
  )
}
