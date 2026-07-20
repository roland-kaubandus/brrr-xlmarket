"use client"

import { useEffect, useState } from "react"
import VevorProductCard from "@/components/VevorProductCard"
import { mapMeiliHitToProduct } from "@/lib/map-meili-hit"

type MappedProduct = ReturnType<typeof mapMeiliHitToProduct>

type ProductGridProps = {
  /** Pre-loaded products (renders immediately, no fetch) */
  initialProducts?: MappedProduct[]
  /** OR: fetch products client-side via /api/products */
  fetchParams?: {
    q?: string
    filter?: string
    sort?: string
    limit?: number
    offset?: number
    locale?: string
    facets?: string
  }
  locale: string
  columns?: "2-3-4" | "2-3-5" | "2-3-4-4"
  className?: string
}

function columnsClass(columns: "2-3-4" | "2-3-5" | "2-3-4-4"): string {
  if (columns === "2-3-5") {
    return "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 md:gap-6"
  }
  if (columns === "2-3-4-4") {
    // Spec §3.5.6 / INV-29: 3 cols at 1024–1279 (lg), 4 cols at ≥1280 (xl).
    return "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6"
  }
  return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6"
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-[#E2E8F0] animate-pulse">
      <div className="aspect-square bg-[#F1F5F9]" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-[#F1F5F9] rounded w-full" />
        <div className="h-3 bg-[#F1F5F9] rounded w-3/4" />
        <div className="h-3 bg-[#F1F5F9] rounded w-1/2 mt-3" />
        <div className="h-4 bg-[#F1F5F9] rounded w-1/3 mt-2" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 24, columns = "2-3-4" }: { count?: number; columns?: "2-3-4" | "2-3-5" | "2-3-4-4" }) {
  const gridClass = columnsClass(columns)
  return (
    <div className={gridClass}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export default function ProductGrid({ initialProducts, fetchParams, locale, columns = "2-3-4", className }: ProductGridProps) {
  const [products, setProducts] = useState<MappedProduct[]>(initialProducts || [])
  const [loading, setLoading] = useState(!initialProducts && !!fetchParams)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (initialProducts || !fetchParams) return
    const controller = new AbortController()
    setLoading(true)
    setFetchError(null)

    const params = new URLSearchParams()
    params.set("q", fetchParams.q || "")
    params.set("limit", String(fetchParams.limit || 24))
    params.set("offset", String(fetchParams.offset || 0))
    params.set("locale", fetchParams.locale || locale)
    if (fetchParams.sort) params.set("sort", fetchParams.sort)
    if (fetchParams.filter) params.set("filter", fetchParams.filter)
    if (fetchParams.facets) params.set("facets", fetchParams.facets)

    const url = `/api/products?${params.toString()}`

    // Retry 1× transient-tõrke korral (net-blip VÕI 5xx). Peapõhjus: staging'i
    // deploy-swap (üks konteiner, ei rolling) tekitab paar sekundit 502/conn-reset,
    // kui Traefik marsruudib veel-boot'ivasse Next.js'i → ilma retry'ta näeb kasutaja
    // "temporarily unavailable". 4xx (nt vigane filter) EI ole transient → ära korda.
    const attempt = async (retriesLeft: number): Promise<void> => {
      try {
        const r = await fetch(url, { method: "GET", signal: controller.signal })
        if (!r.ok) {
          const transient = r.status >= 500 || r.status === 0
          if (transient && retriesLeft > 0) {
            await new Promise((res) => setTimeout(res, 1200))
            if (controller.signal.aborted) return
            return attempt(retriesLeft - 1)
          }
          console.error(`[ProductGrid] products API ${r.status} ${r.statusText}`)
          throw new Error(`Products API ${r.status}`)
        }
        const data = await r.json()
        setProducts(data?.products ? data.products : [])
        setLoading(false)
      } catch (e) {
        const err = e as Error
        if (err.name === "AbortError") return
        // Võrgu-tõrge (fetch reject) = transient (deploy-swap / blip) → korda 1×.
        if (retriesLeft > 0) {
          await new Promise((res) => setTimeout(res, 1200))
          if (controller.signal.aborted) return
          return attempt(retriesLeft - 1)
        }
        console.error("[ProductGrid] fetch failed:", err.message)
        setFetchError(err.message)
        setLoading(false)
      }
    }
    attempt(1)

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProducts, JSON.stringify(fetchParams)])

  const gridClass = columnsClass(columns)

  if (loading) return <ProductGridSkeleton count={fetchParams?.limit || 24} columns={columns} />

  if (fetchError) {
    return (
      <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] p-6 text-center">
        <p className="text-sm font-medium">Products are temporarily unavailable.</p>
        <p className="text-xs mt-1 text-[#B91C1C]">Please refresh the page or try again shortly.</p>
      </div>
    )
  }

  return (
    <div className={`${gridClass}${className ? ` ${className}` : ""}`}>
      {products.map((product) => (
        <VevorProductCard key={product.id} product={product} locale={locale} />
      ))}
    </div>
  )
}
