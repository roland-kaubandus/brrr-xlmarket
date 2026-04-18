"use client"

import { useEffect, useState } from "react"
import Link from "@/components/SafeLink"

const MEILI_URL = "/meili/indexes/products/search"
const MEILI_KEY = "d0e3dab1a93f231214a3ed0d7301644c96bc6e9654cba319a2248a28b92ec0bf"

type DealProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  price: number
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100)
}

function DealCard({ product, locale }: { product: DealProduct; locale: string }) {
  return (
    <Link
      href={`/${locale}/toode/${product.handle}`}
      className="group bg-white overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(15,23,42,0.08)]"
      style={{ transitionTimingFunction: "cubic-bezier(.16,1,.3,1)" }}
    >
      <div className="relative aspect-square bg-[#F8FAFC] overflow-hidden">
        <img
          src={product.thumbnail || ""}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-contain p-[10%] transition-transform duration-500 group-hover:scale-105"
          style={{ transitionTimingFunction: "cubic-bezier(.16,1,.3,1)" }}
        />
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="text-[12px] sm:text-[13px] font-semibold text-[#0F172A] leading-tight line-clamp-2 mb-2 flex-1">
          {product.title}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[16px] sm:text-[18px] font-extrabold text-[#0F172A]">
            {formatPrice(product.price)}
          </span>
        </div>
      </div>
    </Link>
  )
}

function DealSkeleton() {
  return (
    <div className="bg-white animate-pulse">
      <div className="aspect-square bg-[#F1F5F9]" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-[#F1F5F9] rounded w-3/4" />
        <div className="h-3 bg-[#F1F5F9] rounded w-1/2" />
        <div className="h-4 bg-[#F1F5F9] rounded w-1/3 mt-2" />
      </div>
    </div>
  )
}

export default function HeroDeals({ locale }: { locale: string }) {
  const [products, setProducts] = useState<DealProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const body = {
      q: "",
      sort: ["price:desc"],
      limit: 4,
      attributesToRetrieve: ["id", "title", "handle", "thumbnail", "price"],
    }

    fetch(MEILI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEILI_KEY}`,
      },
      body: JSON.stringify(body),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.hits) {
          setProducts(
            data.hits.slice(0, 4).map((hit: Record<string, unknown>) => ({
              id: hit.id as string,
              title: hit.title as string,
              handle: hit.handle as string,
              thumbnail: (hit.thumbnail as string) || null,
              price: Math.round((hit.price as number) * 100),
            }))
          )
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const isEt = locale === "et"

  return (
    <section className="bg-[#F8FAFC] py-6 sm:py-8 md:py-10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2
            className="text-[16px] sm:text-[20px] md:text-[24px] font-bold text-[#0F172A] tracking-tight"
            style={{ letterSpacing: "-0.3px" }}
          >
            {isEt ? "Pakkumised" : "Top Deals"}
          </h2>
          <Link
            href={`/${locale}/otsing?tag=deals`}
            className="text-[13px] md:text-[15px] font-semibold text-[#D97706] flex items-center gap-1 hover:gap-2 transition-all"
          >
            {isEt ? "Kõik pakkumised" : "All deals"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {loading
            ? Array.from({ length: 4 }, (_, i) => <DealSkeleton key={i} />)
            : products.map(p => <DealCard key={p.id} product={p} locale={locale} />)
          }
        </div>
      </div>
    </section>
  )
}
