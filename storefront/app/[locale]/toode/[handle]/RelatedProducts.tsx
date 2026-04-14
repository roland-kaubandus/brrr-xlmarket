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
  searchQuery: string
  locale: string
  categoryName: string
  productTitle: string
  productThumbnail: string | null
  productHandle: string
  productPrice: { calculated_amount: number; currency_code: string } | null
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("et-EE", { style: "currency", currency }).format(amount / 100)
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s
}

export default function RelatedProducts({
  productId, categoryId, searchQuery, locale, categoryName,
  productTitle, productThumbnail, productHandle, productPrice,
}: Props) {
  const [similar, setSimilar] = useState<RelatedProduct[]>([])
  const [koos, setKoos] = useState<RelatedProduct[]>([])
  const [best, setBest] = useState<RelatedProduct[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    params.set("product_id", productId)
    if (categoryId) params.set("category_id", categoryId)
    if (searchQuery) params.set("q", searchQuery)

    fetch(`/api/related-products?${params}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setSimilar(data.similar || [])
          setKoos(data.koos || [])
          setBest(data.best || [])
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))

    return () => controller.abort()
  }, [productId, categoryId, searchQuery])

  if (!loaded) return null

  return (
    <>
      {similar.length > 0 && (
        <section className="mt-8 md:mt-12 pt-6 md:pt-10 border-t border-[#E2E8F0]">
          <h2 className="text-[15px] md:text-[20px] font-bold text-[#1E293B] mb-3 md:mb-6 px-0">
            {locale === "et" ? "Sarnased tooted" : "Similar Products"}
          </h2>
          <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-3" style={{ width: "max-content" }}>
              {similar.map((p) => (
                <div key={p.id} className="w-[150px] shrink-0">
                  <VevorProductCard product={p} locale={locale} />
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:grid grid-cols-3 lg:grid-cols-5 gap-4">
            {similar.map((p) => (
              <VevorProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {koos.length > 0 && (
        <section className="mt-8 md:mt-12 pt-6 md:pt-10 border-t border-[#E2E8F0]">
          <h2 className="text-[15px] md:text-[20px] font-bold text-[#1E293B] mb-3 md:mb-5">
            {locale === "en" ? "Frequently Bought Together" : "Sageli koos ostetud"}
          </h2>
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
            <a href={`/${locale}/toode/${productHandle}`} className="flex flex-col items-center p-4 border border-[#D97706]/30 bg-[#FFFBEB] rounded-lg w-[200px] shrink-0">
              {productThumbnail && (
                <div className="w-[100px] h-[100px] bg-white rounded-lg overflow-hidden mb-2 shrink-0">
                  <img src={productThumbnail} alt={productTitle} className="w-full h-full object-contain p-1" />
                </div>
              )}
              <p className="text-xs text-[#64748B] mb-0.5">{locale === "en" ? "This item" : "See toode"}</p>
              <p className="text-xs font-medium text-[#1E293B] leading-snug line-clamp-2 text-center">{truncate(productTitle, 60)}</p>
              {productPrice && <p className="text-sm font-bold text-[#1E293B] mt-1">{formatPrice(productPrice.calculated_amount, productPrice.currency_code)}</p>}
            </a>
            {koos.map((kp) => (
              <div key={kp.id} className="flex items-center gap-3">
                <span className="text-3xl text-[#64748B] font-light shrink-0">+</span>
                <a href={`/${locale}/toode/${kp.handle}`} className="flex flex-col items-center p-4 border border-[#E2E8F0] bg-white hover:border-[#D97706]/40 rounded-lg transition-colors duration-200 w-[200px] shrink-0">
                  {kp.thumbnail && (
                    <div className="w-[100px] h-[100px] bg-[#F1F5F9] rounded-lg overflow-hidden mb-2 shrink-0">
                      <img src={kp.thumbnail} alt={kp.title} className="w-full h-full object-contain p-1" />
                    </div>
                  )}
                  <p className="text-xs font-medium text-[#1E293B] leading-snug line-clamp-2 text-center">{truncate(kp.title, 60)}</p>
                  {kp.variants?.[0]?.calculated_price && <p className="text-sm font-bold text-[#1E293B] mt-1">{formatPrice(kp.variants[0].calculated_price.calculated_amount, kp.variants[0].calculated_price.currency_code)}</p>}
                </a>
              </div>
            ))}
            {(() => {
              const mainPrice = productPrice?.calculated_amount || 0
              const koosTotal = koos.reduce((sum, kp) => sum + (kp.variants?.[0]?.calculated_price?.calculated_amount || 0), mainPrice)
              const currencyCode = productPrice?.currency_code || "eur"
              return (
                <div className="flex flex-col items-center justify-center ml-auto p-4 border border-[#E2E8F0] bg-white rounded-lg min-w-[140px]">
                  <span className="text-xs text-[#64748B] mb-1">{locale === "en" ? "Total:" : "Kokku:"}</span>
                  <p className="font-bold text-xl text-[#1E293B]">{formatPrice(koosTotal, currencyCode)}</p>
                </div>
              )
            })()}
          </div>
        </section>
      )}

      {best.length > 0 && (
        <section className="mt-8 md:mt-12 pt-6 md:pt-10 border-t border-[#E2E8F0]">
          <h2 className="text-[15px] md:text-[20px] font-bold text-[#1E293B] mb-3 md:mb-6">
            {locale === "en" ? `Best in ${categoryName}` : `Parimad kategoorias ${categoryName}`}
          </h2>
          <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-3" style={{ width: "max-content" }}>
              {best.map((p) => (
                <div key={p.id} className="w-[150px] shrink-0">
                  <VevorProductCard product={p} locale={locale} />
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:grid grid-cols-3 lg:grid-cols-5 gap-4">
            {best.map((p) => (
              <VevorProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
