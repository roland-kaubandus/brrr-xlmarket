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
    <section className="py-5 md:py-8">
      <div className="max-w-[1360px] mx-auto px-4">
        <div className="flex items-center gap-2 mb-3 md:mb-5">
          <div className="w-1 h-5 rounded-full bg-[#0ea5a0]" />
          <h2 className="font-bold text-[17px] md:text-xl text-[#1a1a2e] tracking-tight">
            {title}
          </h2>
        </div>
      </div>
      {/* Mobile: horizontal scroll with bigger cards */}
      <div className="md:hidden overflow-x-auto scrollbar-hide pl-4">
        <div className="flex gap-3 pr-4" style={{ width: "max-content" }}>
          {products.map((p) => (
            <div key={p.id} className="w-[185px] shrink-0">
              <VevorProductCard product={p} locale={locale} />
            </div>
          ))}
        </div>
      </div>
      {/* Desktop: grid */}
      <div className="hidden md:block max-w-[1360px] mx-auto px-4">
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-4 rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          {products.map((p) => (
            <VevorProductCard key={p.id} product={p} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  )
}
