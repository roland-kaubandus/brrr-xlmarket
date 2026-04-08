import Image from "next/image"
import Link from "next/link"

type CategoryItem = {
  name: string
  handle: string
  displayName: string
  image?: string | null
}

export default function CategoryExploreGrid({
  categories,
  locale,
}: {
  categories: CategoryItem[]
  locale: string
}) {
  return (
    <section className="max-w-[1360px] mx-auto px-4 py-8">
      <h2 className="font-[family-name:var(--font-outfit)] font-bold text-xl md:text-2xl text-[#222] mb-5">
        Categories to Explore
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const display = cat.displayName || cat.name
          const imgUrl = cat.image ? decodeURIComponent(cat.image) : null
          return (
            <Link
              key={cat.handle}
              href={`/${locale}/kategooriad/${cat.handle}`}
              className="flex items-center justify-between bg-[#F5F5F5] hover:bg-[#EBEBEB] rounded-lg p-4 transition-colors group"
            >
              <span className="text-sm font-medium text-[#222] leading-tight pr-2">
                {display}
              </span>
              {imgUrl && (
                <div className="w-[80px] h-[80px] flex-shrink-0 relative">
                  <Image
                    src={imgUrl}
                    alt={display}
                    width={80}
                    height={80}
                    className="object-contain"
                    sizes="80px"
                  />
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
