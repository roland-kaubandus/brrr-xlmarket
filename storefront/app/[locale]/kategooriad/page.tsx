import Link from "next/link"
import Image from "next/image"
import { getCategories } from "@/lib/medusa"
import { searchProducts } from "@/lib/meilisearch"

export const revalidate = 300

const CATEGORY_NAMES: Record<string, string> = {
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

export async function generateMetadata() {
  return {
    title: "All Categories — XLMARKET",
    description: "Browse all product categories at XLMARKET. Quality products at great prices with fast delivery in Estonia.",
  }
}

async function getCategoryCounts(): Promise<Record<string, number>> {
  try {
    const result = await searchProducts({
      q: "",
      limit: 0,
      offset: 0,
      facets: ["category_handles"],
    })
    return result.facetDistribution?.category_handles || {}
  } catch {
    return {}
  }
}

async function getCategoryThumbnail(handle: string): Promise<string | null> {
  try {
    const result = await searchProducts({
      q: "",
      limit: 1,
      offset: 0,
      filter: [`category_handles = "${handle}"`],
    })
    return result.hits?.[0]?.thumbnail || null
  } catch {
    return null
  }
}

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  const allCategories = await getCategories()
  const categoryCounts = await getCategoryCounts()

  // Get L1 categories (those without parent) that are in our display names map
  const l1Categories = allCategories
    .filter((c) => !c.parent_category_id && CATEGORY_NAMES[c.handle])
    .sort((a, b) => {
      const countA = categoryCounts[a.handle] || 0
      const countB = categoryCounts[b.handle] || 0
      return countB - countA
    })

  // Fetch thumbnails for each category in parallel
  const thumbnails = await Promise.all(
    l1Categories.map((c) => getCategoryThumbnail(c.handle))
  )

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-[#888] mb-4">
          <Link href={`/${locale}`} className="hover:text-[#D97706]">Home</Link>
          <span className="mx-1.5">&gt;</span>
          <span className="text-[#555]">All Categories</span>
        </nav>

        {/* Title */}
        <h1 className="text-[28px] font-bold text-[#1E293B] mb-6">All Categories</h1>

        {/* Category grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {l1Categories.map((category, index) => {
            const displayName = CATEGORY_NAMES[category.handle] || category.name
            const count = categoryCounts[category.handle] || 0
            const thumb = thumbnails[index]

            return (
              <Link
                key={category.id}
                href={`/${locale}/kategooriad/${category.handle}`}
                className="group bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {/* Thumbnail */}
                <div className="aspect-[4/3] flex items-center justify-center overflow-hidden bg-[#F1F5F9] p-4">
                  {thumb ? (
                    <Image
                      src={decodeURIComponent(thumb)}
                      alt={displayName}
                      width={280}
                      height={210}
                      loading="lazy"
                      className="max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Category info */}
                <div className="p-4 border-t border-[#E2E8F0]">
                  <h2 className="text-sm font-semibold text-[#1E293B] group-hover:text-[#D97706] transition-colors leading-tight">
                    {displayName}
                  </h2>
                  {count > 0 && (
                    <p className="text-xs text-[#888] mt-1">
                      {count.toLocaleString("et-EE")} products
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
