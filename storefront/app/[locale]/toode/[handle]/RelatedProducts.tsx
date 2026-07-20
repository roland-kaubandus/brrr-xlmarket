"use client"

import { useEffect, useState } from "react"
import VevorProductCard from "@/components/VevorProductCard"

type RelatedProduct = {
  id: string
  title: string
  handle: string
  description: string
  thumbnail: string | null
  images: Array<{ id: string; url: string }>
  variants: Array<{
    id: string
    title: string
    calculated_price: { calculated_amount: number; original_amount: number; currency_code: string }
  }>
  categories: Array<{ id: string; name: string; handle: string; parent_category_id: string | null }>
  created_at: string
}

type Props = {
  productId: string
  categoryId: string | null
  categoryHandle: string | null
  categoryHandles: string[]
  searchQuery: string
  locale: string
  categoryName: string
  productTitle: string
  productThumbnail: string | null
  productHandle: string
  productPrice: { calculated_amount: number; currency_code: string } | null
}

function HorizontalRow({ title, products, locale }: { title: string; products: RelatedProduct[]; locale: string }) {
  if (products.length === 0) return null
  return (
    <section className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-[#E2E8F0]">
      <h2 className="text-[15px] md:text-[20px] font-bold text-[#1a1a2e] mb-3 md:mb-5">
        {title}
      </h2>
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6">
        <div className="flex gap-3" style={{ width: "max-content" }}>
          {products.map((p) => (
            <div key={p.id} className="w-[160px] md:w-[200px] shrink-0">
              <VevorProductCard product={p} locale={locale} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function RelatedProducts({
  productId, categoryHandle, categoryHandles, locale, categoryName,
}: Props) {
  const [similar, setSimilar] = useState<RelatedProduct[]>([])
  const [best, setBest] = useState<RelatedProduct[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    params.set("product_id", productId)
    // Send all category handles (narrowest to broadest)
    const handles = categoryHandles.length > 0 ? categoryHandles : (categoryHandle ? [categoryHandle] : [])
    if (handles.length > 0) params.set("category_handles", handles.join(","))
    if (locale) params.set("locale", locale)

    fetch(`/api/related-products?${params}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setSimilar(data.similar || [])
          setBest(data.best || [])
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))

    return () => controller.abort()
  }, [productId, categoryHandle, categoryHandles, locale])

  if (!loaded) return null

  return (
    <>
      <HorizontalRow
        title="Similar Products"
        products={similar}
        locale={locale}
      />
    </>
  )
}
