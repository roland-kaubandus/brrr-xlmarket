import { getProducts, getCategories } from "@/lib/medusa"
import BannerCarousel from "@/components/BannerCarousel"
import CategoryExploreGrid from "@/components/CategoryExploreGrid"
import VevorProductCard from "@/components/VevorProductCard"
import TrustBadges from "@/components/TrustBadges"

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
          image: res.products[0]?.thumbnail || null,
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

      <TrustBadges />
    </>
  )
}
