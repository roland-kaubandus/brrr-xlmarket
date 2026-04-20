"use client"

import { useEffect, useState } from "react"
import ProductContent from "./ProductContent"
import type { ProductContentProps } from "./ProductContent"

type Props = {
  handle: string
  locale: string
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-[#F1F5F9] rounded w-48 mb-5" />
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 lg:gap-10">
        <div className="aspect-square bg-[#F1F5F9] rounded-xl" />
        <div className="space-y-4">
          <div className="h-6 bg-[#F1F5F9] rounded w-full" />
          <div className="h-6 bg-[#F1F5F9] rounded w-3/4" />
          <div className="h-4 bg-[#F1F5F9] rounded w-24 mt-2" />
          <div className="h-10 bg-[#F1F5F9] rounded w-32 mt-4" />
          <div className="h-12 bg-[#F1F5F9] rounded-xl w-full mt-6" />
          <div className="h-12 bg-[#F1F5F9] rounded-xl w-full" />
        </div>
      </div>
    </div>
  )
}

export default function ProductPageClient({ handle, locale }: Props) {
  const [data, setData] = useState<ProductContentProps | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError(false)

    fetch(`/api/product/${encodeURIComponent(handle)}?locale=${locale}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then((json) => {
        setData({ ...json, locale, _categoryPathFn: "" })
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(true)
      })

    return () => controller.abort()
  }, [handle, locale])

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[#64748B] mb-4">
          Failed to load product.
        </p>
        <button
          onClick={() => { setError(false); setData(null) }}
          className="px-4 py-2 bg-[#D97706] text-white rounded-lg text-sm font-medium"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!data) return <Skeleton />

  return <ProductContent {...data} />
}
