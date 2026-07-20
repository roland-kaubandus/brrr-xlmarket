"use client"

import { useEffect, useState } from "react"
import Link from "@/components/SafeLink"

type Category = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
}

function CategoryCard({ cat, locale }: { cat: Category; locale: string }) {
  return (
    <Link
      href={`/${locale}/kategooriad/${cat.handle}`}
      prefetch={false}
      className="group bg-white border border-[#F1F5F9] rounded-xl md:rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.04)] hover:border-[#E2E8F0] p-2.5 sm:p-3 md:p-4"
      style={{ transitionTimingFunction: "cubic-bezier(.16,1,.3,1)" }}
    >
      <div className="aspect-square w-full flex items-center justify-center mb-1.5 md:mb-2.5">
        <img
          src={`/cat-icons/80/${cat.handle}.webp`}
          alt={cat.name}
          loading="lazy"
          className="w-full max-w-[56px] sm:max-w-[72px] md:max-w-[100px] aspect-square object-contain transition-transform duration-300 group-hover:scale-[1.06]"
          style={{ transitionTimingFunction: "cubic-bezier(.16,1,.3,1)" }}
        />
      </div>
      <div className="font-semibold text-[#12121f] text-[11px] sm:text-[13px] md:text-[15px] leading-tight line-clamp-2">
        {cat.name}
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#F1F5F9] rounded-xl md:rounded-2xl p-2.5 sm:p-3 md:p-4 animate-pulse">
      <div className="aspect-square w-full flex items-center justify-center mb-1.5 md:mb-2.5">
        <div className="w-[56px] sm:w-[72px] md:w-[100px] aspect-square rounded-lg bg-[#F1F5F9]" />
      </div>
      <div className="h-3 md:h-4 bg-[#F1F5F9] rounded w-3/4 mx-auto" />
    </div>
  )
}

export default function HomeBentoGrid({ locale }: { locale: string }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/header-categories")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.categories) return
        const all: Category[] = data.categories
        const l1Ids = new Set(all.filter(c => !c.parent_category_id).map(c => c.id))
        const l1 = all.filter(c => !c.parent_category_id)
        const l2 = all.filter(c => c.parent_category_id && l1Ids.has(c.parent_category_id))
        // Sort: L1 first (alphabetical), then L2 grouped under their parent
        // Homepage: 3 rows x 8 cols = 24 categories (L1 only, sorted)
        const l1sorted = l1.sort((a, b) => a.name.localeCompare(b.name))
        setCategories(l1sorted.slice(0, 22))
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="pt-8 sm:pt-12 md:pt-16 pb-0">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-8">
          <h2 className="text-[18px] sm:text-[22px] md:text-[32px] font-bold text-[#12121f] tracking-tight" style={{ letterSpacing: "-0.3px" }}>
            Shop by Category
          </h2>
          <Link
            href={`/${locale}/kategooriad`}
            className="text-[13px] md:text-[16px] font-semibold text-[#0b7d79] flex items-center gap-1 hover:gap-2 transition-all"
          >
            All categories
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>

        {/* Uniform grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-2.5 md:gap-4">
          {loading
            ? Array.from({ length: 22 }, (_, i) => <SkeletonCard key={i} />)
            : categories.map(cat => (
                <CategoryCard key={cat.id} cat={cat} locale={locale} />
              ))
          }
        </div>
      </div>
    </section>
  )
}
