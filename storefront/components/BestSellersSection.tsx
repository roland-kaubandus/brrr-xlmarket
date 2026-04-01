"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import ProductCard from "@/components/ProductCard"
import type { Product } from "@/lib/medusa"

type Tab = {
  label: string
  handle: string
  products: Product[]
}

type Props = {
  tabs: Tab[]
}

export default function BestSellersSection({ tabs, locale = "et" }: Props & { locale?: string }) {
  const [active, setActive] = useState(0)

  const current = tabs[active]

  return (
    <section className="pt-[48px] pb-[48px]">
      {/* Header row */}
      <div className="flex items-center justify-between mb-[24px]">
        <h2 className="text-[24px] sm:text-[28px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">
          Bestsellerid
        </h2>
        <Link
          href={current ? `/${locale}/kategooriad/${current.handle}` : `/${locale}/kategooriad`}
          className="group inline-flex items-center gap-[4px] text-[#E8650A] hover:text-[#CF5A08] text-[14px] font-[500] font-[family-name:var(--font-poppins)]"
          style={{ transition: "color 0.18s" }}
        >
          Vaata kõiki
          <ArrowRight size={16} strokeWidth={1.5} className="group-hover:translate-x-[2px] transition-transform" />
        </Link>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-[8px] mb-[24px] overflow-x-auto pb-[2px] scrollbar-none">
        {tabs.map((tab, i) => (
          <button
            key={tab.handle}
            onClick={() => setActive(i)}
            className="shrink-0 px-[14px] py-[7px] text-[13px] font-[500] font-[family-name:var(--font-poppins)] border transition-all duration-[180ms]"
            style={
              i === active
                ? { background: "rgba(232,101,10,0.08)", borderColor: "rgba(232,101,10,0.35)", color: "#E8650A" }
                : { background: "white", borderColor: "#E8E8E8", color: "#555555" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Products horizontal scroll carousel */}
      <div className="overflow-x-auto pb-[4px] scrollbar-none">
        <div className="flex gap-[16px]" style={{ width: "max-content" }}>
          {current?.products.map((product) => (
            <div key={product.id} className="w-[220px] shrink-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
