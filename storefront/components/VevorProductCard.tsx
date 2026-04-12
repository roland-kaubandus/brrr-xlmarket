"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Product, formatPrice } from "@/lib/medusa"

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getStarRating(id: string): number {
  const h = hashCode(id)
  // deterministic 3.5–5.0 range, step 0.5
  const steps = [3.5, 4.0, 4.0, 4.5, 4.5, 4.5, 5.0, 5.0, 4.0, 4.5]
  return steps[h % steps.length]
}

function Stars({ rating, productId }: { rating: number; productId: string }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) {
          return (
            <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#D97706" stroke="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          )
        }
        if (i === full && half) {
          return (
            <svg key={i} width="14" height="14" viewBox="0 0 24 24" stroke="none">
              <defs>
                <linearGradient id={`half-${productId}-${i}`}>
                  <stop offset="50%" stopColor="#D97706" />
                  <stop offset="50%" stopColor="#E5E7EB" />
                </linearGradient>
              </defs>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={`url(#half-${productId}-${i})`} />
            </svg>
          )
        }
        return (
          <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#E5E7EB" stroke="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )
      })}
      <span className="text-xs text-[#64748B] ml-1">{rating.toFixed(1)}</span>
    </span>
  )
}

export default function VevorProductCard({ product, locale }: { product: Product; locale?: string }) {
  const pathname = usePathname()
  const resolvedLocale = locale || (pathname.split("/")[1] === "en" ? "en" : "et")
  const price = product.variants?.[0]?.calculated_price
  const [wishlisted, setWishlisted] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("xlmarket_wishlist")
      if (raw) setWishlisted(JSON.parse(raw).some((i: { id: string }) => i.id === product.id))
    } catch {}
  }, [product.id])

  function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      const raw = localStorage.getItem("xlmarket_wishlist")
      const items: Array<{ id: string; handle: string; title: string; thumbnail: string | null; price: string }> = raw ? JSON.parse(raw) : []
      const exists = items.some((i) => i.id === product.id)
      const next = exists
        ? items.filter((i) => i.id !== product.id)
        : [...items, {
            id: product.id, handle: product.handle, title: product.title, thumbnail: product.thumbnail,
            price: price ? new Intl.NumberFormat("et-EE", { style: "currency", currency: price.currency_code }).format(price.calculated_amount / 100) : ""
          }]
      localStorage.setItem("xlmarket_wishlist", JSON.stringify(next))
      setWishlisted(!exists)
    } catch {}
  }

  const discount = price && price.original_amount > price.calculated_amount
    ? Math.round((1 - price.calculated_amount / price.original_amount) * 100)
    : 0

  const rating = getStarRating(product.id)
  // Don't decodeURIComponent — VEVOR CDN requires encoded paths (%2F, %2B etc.)
  const thumbnailUrl = product.thumbnail || null
  const freeShipping = price && price.calculated_amount >= 9900

  return (
    <article className="bg-white rounded-xl overflow-hidden border border-transparent hover:border-[#E2E8F0] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 relative group">
      <Link href={`/${resolvedLocale}/toode/${product.handle}`} className="block">
        {/* Wishlist heart */}
        <button
          type="button"
          onClick={toggleWishlist}
          aria-label={wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/90 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={wishlisted ? "#DC2626" : "none"} stroke={wishlisted ? "#DC2626" : "#94A3B8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>

        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-[#DC2626] text-white text-[11px] font-bold rounded-md">
            -{discount}%
          </span>
        )}

        {/* Product image — 1:1 */}
        <div className="aspect-square flex items-center justify-center overflow-hidden bg-[#FAFAFA] p-4">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={product.title}
              width={300}
              height={300}
              loading="lazy"
              className="max-h-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.06]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#CBD5E1] text-sm">{resolvedLocale === "et" ? "Pilt puudub" : "No image"}</div>
          )}
        </div>

        {/* Product info */}
        <div className="p-3.5 pt-3">
          <h3 className="text-[13px] text-[#334155] line-clamp-2 leading-snug min-h-[2.5em] group-hover:text-[#1E293B] transition-colors">
            {product.title}
          </h3>

          {/* Star rating */}
          <div className="mt-1.5">
            <Stars rating={rating} productId={product.id} />
          </div>

          {/* Price */}
          {price && (
            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
              <span className="font-bold text-[17px] text-[#1E293B]">
                {formatPrice(price.calculated_amount, price.currency_code)}
              </span>
              {discount > 0 && (
                <span className="text-xs text-[#94A3B8] line-through">
                  {formatPrice(price.original_amount, price.currency_code)}
                </span>
              )}
            </div>
          )}

          {/* Badges row */}
          <div className="mt-2 flex items-center gap-2.5 text-[11px]">
            <span className="inline-flex items-center gap-1 text-[#059669]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] inline-block" />
              {resolvedLocale === "et" ? "Laos" : "In Stock"}
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
