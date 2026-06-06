"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "@/components/SafeLink"
import { usePathname } from "next/navigation"
import { Product, formatPrice } from "@/lib/medusa"
import { useCompare } from "./CompareContext"
import { safeReadJSON, safeWriteJSON } from "@/lib/safe-storage"

// TODO: add Stars component back when real ratings are available (see Huly XLM-???)
// Previously rendered a deterministic hash-based fake rating (3.5–5.0). Removed
// per the "no mock data" rule — misleading to users and not backed by real data.

/** Extract basic specs from product description text for compare feature */
function extractCardSpecs(product: Product): Record<string, string> {
  const specs: Record<string, string> = {}
  // Try metadata selling points first
  const meta = product.metadata as Record<string, unknown> | undefined
  if (meta) {
    for (let i = 1; i <= 5; i++) {
      const sp = meta[`selling_point_${i}`]
      if (typeof sp === "string" && sp.includes(":")) {
        const [key, ...rest] = sp.split(":")
        if (key.trim()) specs[key.trim()] = rest.join(":").trim()
      }
    }
  }
  // Fallback: parse comma-separated "Key: Value" from description
  if (Object.keys(specs).length === 0 && product.description) {
    const text = product.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    const parts = text.split(",")
    for (const part of parts.slice(0, 8)) {
      const idx = part.indexOf(":")
      if (idx > 2 && idx < 40) {
        const key = part.substring(0, idx).trim()
        const value = part.substring(idx + 1).trim()
        if (key.split(" ").length <= 4 && value.length > 0 && value.length < 80) {
          specs[key] = value
        }
      }
    }
  }
  return specs
}

type WishlistItem = { id: string; handle: string; title: string; thumbnail: string | null; price: string }

const WISHLIST_KEY = "xlmarket_wishlist"

export default function VevorProductCard({ product, locale }: { product: Product; locale?: string }) {
  const pathname = usePathname()
  const resolvedLocale = locale || (pathname.split("/")[1] === "en" ? "en" : "et")
  const price = product.variants?.[0]?.calculated_price
  const [wishlisted, setWishlisted] = useState(false)
  const compare = useCompare()
  const isCompared = compare.has(product.id)

  useEffect(() => {
    const items = safeReadJSON<Array<{ id: string }>>(WISHLIST_KEY, [])
    setWishlisted(items.some((i) => i.id === product.id))
  }, [product.id])

  function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const items = safeReadJSON<WishlistItem[]>(WISHLIST_KEY, [])
    const exists = items.some((i) => i.id === product.id)
    const next = exists
      ? items.filter((i) => i.id !== product.id)
      : [...items, {
          id: product.id, handle: product.handle, title: product.title, thumbnail: product.thumbnail,
          price: price ? new Intl.NumberFormat("en-IE", { style: "currency", currency: price.currency_code }).format(price.calculated_amount / 100) : ""
        }]
    safeWriteJSON(WISHLIST_KEY, next)
    setWishlisted(!exists)
  }

  const discount = price && price.original_amount > price.calculated_amount
    ? Math.round((1 - price.calculated_amount / price.original_amount) * 100)
    : 0

  // Don't decodeURIComponent — VEVOR CDN requires encoded paths (%2F, %2B etc.)
  const thumbnailUrl = product.thumbnail || null
  const freeShipping = price && price.calculated_amount >= 9900

  return (
    <article className="bg-white rounded-xl overflow-hidden border border-transparent hover:border-[#E2E8F0] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 relative group">
      <Link href={`/${resolvedLocale}/toode/${product.handle}`} prefetch={false} className="block">
        {/* Wishlist heart — top right, always visible */}
        <button
          type="button"
          onClick={toggleWishlist}
          aria-label={wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 hover:bg-white shadow-sm transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={wishlisted ? "#DC2626" : "none"} stroke={wishlisted ? "#DC2626" : "#94A3B8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <div className="aspect-square flex items-center justify-center overflow-hidden bg-[#FAFAFA] p-4 md:p-6">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={product.title}
              width={400}
              height={400}
              loading="lazy"
              className="max-h-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.06]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#CBD5E1] text-sm md:text-base">{resolvedLocale === "et" ? "Pilt puudub" : "No image"}</div>
          )}
        </div>

        {/* Product info */}
        <div className="p-3 sm:p-3.5 md:p-5 pt-2.5 sm:pt-3 md:pt-4">
          <h3 className="text-[13px] md:text-[16px] text-[#334155] line-clamp-2 leading-snug group-hover:text-[#1E293B] transition-colors">
            {product.title}
          </h3>

          {/* Price */}
          {price && (
            <div className="mt-2 md:mt-3 flex items-baseline gap-2 flex-wrap">
              <span className="font-bold text-[16px] sm:text-[17px] md:text-[22px] text-[#1E293B]">
                {formatPrice(price.calculated_amount, price.currency_code)}
              </span>
              {discount > 0 && (
                <span className="text-[11px] sm:text-xs md:text-sm text-[#94A3B8] line-through">
                  {formatPrice(price.original_amount, price.currency_code)}
                </span>
              )}
            </div>
          )}

          {/* Badges row */}
          <div className="mt-2 md:mt-3 flex items-center gap-2.5 text-[11px] md:text-[14px]">
            {product.in_stock === false ? (
              <span className="inline-flex items-center gap-1 text-[#94A3B8]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] inline-block" />
                {resolvedLocale === "et" ? "Otsas" : "Out of stock"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[#059669]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] inline-block" />
                {resolvedLocale === "et" ? "Laos" : "In Stock"}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Compare — bottom right of card, always visible, outside <Link> */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (isCompared) {
            compare.remove(product.id)
          } else {
            compare.add({
              id: product.id,
              handle: product.handle,
              title: product.title,
              thumbnail: product.thumbnail || null,
              price: price ? formatPrice(price.calculated_amount, price.currency_code) : "",
              specs: extractCardSpecs(product),
            })
          }
        }}
        aria-label={isCompared ? "Remove from compare" : "Add to compare"}
        className={`absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 h-8 rounded-full shadow-sm text-[12px] font-semibold transition-colors ${
          isCompared
            ? "bg-[#D97706] text-white hover:bg-[#B45309]"
            : "bg-white hover:bg-[#FFFBEB] text-[#475569] hover:text-[#D97706] border border-[#E2E8F0]"
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <span>{isCompared ? (resolvedLocale === "et" ? "Võrdluses" : "In Compare") : (resolvedLocale === "et" ? "Võrdle" : "Compare")}</span>
      </button>
    </article>
  )
}
