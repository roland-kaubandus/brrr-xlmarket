import Image from "next/image"
import Link from "next/link"

type CategoryItem = {
  name: string
  handle: string
  displayName: string
  image?: string | null
  productCount?: number
}

export default function CategoryExploreGrid({
  categories,
  locale,
}: {
  categories: CategoryItem[]
  locale: string
}) {
  return (
    <section className="max-w-[1360px] mx-auto px-4 py-10">
      {/* Section heading with amber left accent */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-1 h-7 rounded-full"
          style={{ backgroundColor: "#D97706" }}
        />
        <h2
          className="font-[family-name:var(--font-dm-sans)] font-bold text-2xl"
          style={{ color: "#1E293B" }}
        >
          Categories to Explore
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const display = cat.displayName || cat.name
          const imgUrl = cat.image ? decodeURIComponent(cat.image) : null
          const count = cat.productCount || 0

          return (
            <Link
              key={cat.handle}
              href={`/${locale}/kategooriad/${cat.handle}`}
              className="category-card group flex flex-col rounded-xl border bg-white overflow-hidden"
              style={{
                borderColor: "#E2E8F0",
                transition: "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
              }}
            >
              {/* Image area */}
              <div
                className="flex items-center justify-center"
                style={{
                  backgroundColor: "#FFFFFF",
                  height: "140px",
                }}
              >
                {imgUrl ? (
                  <Image
                    src={imgUrl}
                    alt={display}
                    width={120}
                    height={120}
                    className="object-contain max-h-[110px]"
                    sizes="120px"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 7V5a4 4 0 0 0-8 0v2" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Text area */}
              <div className="px-3 py-3">
                <p
                  className="font-[family-name:var(--font-dm-sans)] font-bold leading-tight"
                  style={{ fontSize: "15px", color: "#1E293B" }}
                >
                  {display}
                </p>
                {count > 0 && (
                  <p
                    className="mt-1 flex items-center gap-1"
                    style={{ fontSize: "13px", color: "#64748B" }}
                  >
                    <span>
                      {count.toLocaleString()} product{count !== 1 ? "s" : ""}
                    </span>
                    <span
                      className="inline-block transition-transform group-hover:translate-x-0.5"
                      style={{ color: "#D97706" }}
                    >
                      &rarr;
                    </span>
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Hover styles via global CSS-in-JS workaround for Tailwind */}
      <style>{`
        .category-card:hover {
          box-shadow: 0 6px 20px rgba(0,0,0,0.10);
          transform: translateY(-2px);
          border-color: #D97706 !important;
        }
      `}</style>
    </section>
  )
}
