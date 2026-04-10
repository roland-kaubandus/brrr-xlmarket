"use client"

import VevorProductCard from "@/components/VevorProductCard"
import type { Product } from "@/lib/medusa"

type Props = {
  title: string
  products: Product[]
  locale: string
}

export default function HorizontalProductRow({ title, products, locale }: Props) {
  if (products.length === 0) return null

  return (
    <section className="py-4 md:py-8">
      <div className="max-w-[1360px] mx-auto px-3 md:px-4">
        <h2 className="font-bold text-[15px] md:text-xl text-[#1E293B] mb-3 md:mb-5">
          {title}
        </h2>
      </div>
      {/* Mobile: horizontal scroll */}
      <div className="md:hidden overflow-x-auto scrollbar-hide pl-3">
        <div className="flex gap-3 pr-3" style={{ width: "max-content" }}>
          {products.map((p) => (
            <div key={p.id} className="w-[160px] shrink-0">
              <VevorProductCard product={p} locale={locale} />
            </div>
          ))}
        </div>
      </div>
      {/* Desktop: grid */}
      <div className="hidden md:block max-w-[1360px] mx-auto px-4">
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-4">
          {products.map((p) => (
            <VevorProductCard key={p.id} product={p} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  )
}
