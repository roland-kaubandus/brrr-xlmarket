import { getProducts, getCategories } from "@/lib/medusa"
import BannerCarousel from "@/components/BannerCarousel"
import CategoryExploreGrid from "@/components/CategoryExploreGrid"
import VevorProductCard from "@/components/VevorProductCard"

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

// Curated category images — iconic, instantly recognizable products
const CATEGORY_IMAGES: Record<string, string> = {
  "ehitus-ja-remont": "https://image.vevor.com/us%2FCZQGJ800MMSDSGL05V0%2Fgoods_img-v12%2Ftile-cutter-m100-1.2.jpg?timestamp=1668765407000",
  "toostus-ja-seadmed": "https://image.vevor.com/us%2F1.5KWTSSGJ0000001V2%2Fgoods_img-v5%2Fbelt-sander-m100-1.2.jpg?timestamp=1628146296000",
  "kodu-ja-aed": "https://image.vevor.com/us%2FGLBXXCZBXS53L3J5ZV2%2Fgoods_img-v2%2Fcar-refrigerator-m100-1.2.jpg?timestamp=1730369590000",
  "auto-ja-garaaz": "https://image.vevor.com/us%2FKCTJBZDS20075OZ3EV0%2Fgoods_img-v1%2Ftruck-running-boards-m100-1.2.jpg?timestamp=1710741270000",
  "sport-ja-vaba-aeg": "https://image.vevor.com/us%2FCKDDHSJ251212BWPIV0%2Fgoods_img-v2%2Fgarage-floor-mat-m100-1.2.jpg?timestamp=1712717361000",
  "kunst-ja-kasitoo": "https://image.vevor.com/us%2FKZJ720MMSJBS00001V2%2Fgoods_img-v5%2Fvinyl-cutter-m100-1.2.jpg?timestamp=1628146296000",
  "toitlustus-ja-kook": "https://image.vevor.com/us%2FTSBXGQPJYSBXZDJ9FV2%2Fgoods_img-v1%2Fmeat-cutter-machine-m100-1.2.jpg?timestamp=1738987630000",
  "elektroonika": "https://image.vevor.com/us%2FKFSJJH20U2340PHVWV0%2Fgoods_img-v5%2Fserver-rack-m100-1.2.jpg?timestamp=1685347798000",
  "lemmikloomad": "https://image.vevor.com/us%2FBPQXJ6L0000000001V2%2Fgoods_img-v7%2Fm100-1.2.jpg?timestamp=1730439574000",
  "kontor-ja-ladustamine": "https://image.vevor.com/us%2FSJZDZDDJ2J703SIXNV2%2Fgoods_img-v1%2Fstanding-desk-frame-m100-1.2.jpg?timestamp=1715650905000",
  "meditsiin-ja-tervishoid": "https://image.vevor.com/us%2FDDXNQFTSDBHSYUFQFV2%2Fgoods_img-v1%2Felectric-breast-pump-m100-1.2.jpg?timestamp=1700808374000",
}

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

  // Only L1 categories (no parent)
  const topCategories = allCategories
    .filter((c) => !c.parent_category_id)
    .slice(0, 12)

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
