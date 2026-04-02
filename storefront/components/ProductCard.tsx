"use client"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Product, formatPrice } from "@/lib/medusa"

export default function ProductCard({ product, isNew }: { product: Product; isNew?: boolean }) {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'et'
  const price = product.variants?.[0]?.calculated_price
  const [wishlisted, setWishlisted] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      const raw = localStorage.getItem("xlmarket_wishlist")
      if (raw) return JSON.parse(raw).some((i: { id: string }) => i.id === product.id)
    } catch {}
    return false
  })

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

  const categoryName = product.categories?.[0]?.name || ""
  const thumbnailUrl = product.thumbnail ? decodeURIComponent(product.thumbnail) : null

  return (
    <article className="product-card group">
      <Link href={`/${locale}/toode/${product.handle}`} className="block">
        {/* Image container */}
        <div className="bg-silver rounded-2xl p-3 relative overflow-hidden border border-transparent group-hover:border-accent/10 transition-colors duration-300">
          {/* Badges */}
          <div className="absolute top-3 left-3 z-10 flex gap-1.5">
            {discount > 0 && (
              <span className="px-2.5 py-1 bg-red-500 text-white text-[10px] uppercase tracking-[0.1em] font-bold rounded-lg">
                -{discount}%
              </span>
            )}
            {isNew && discount === 0 && (
              <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] uppercase tracking-[0.1em] font-bold rounded-lg">
                Uus
              </span>
            )}
            {product.metadata?.translation_status === "pending" && (
              <span className="px-2.5 py-1 bg-blue-500/80 text-white text-[10px] uppercase tracking-[0.1em] font-bold rounded-lg flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                EN
              </span>
            )}
          </div>

          {/* Product image */}
          <div className="aspect-square flex items-center justify-center overflow-hidden rounded-xl">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={product.title}
                width={400}
                height={400}
                className="max-h-full object-contain product-img"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted text-sm">Pilt puudub</div>
            )}
          </div>

          {/* Hover actions */}
          <div className="product-actions absolute bottom-3 right-3 flex gap-1.5">
            <button
              type="button"
              onClick={toggleWishlist}
              aria-label={wishlisted ? "Eemalda lemmikutest" : "Lisa lemmikutesse"}
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 ${
                wishlisted ? "bg-red-500 text-white" : "bg-white/90 backdrop-blur-sm hover:bg-accent hover:text-white"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </button>
            <button
              type="button"
              aria-label="Lisa ostukorvi"
              className="w-9 h-9 bg-accent text-white rounded-xl flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:bg-accent-dark transition-all duration-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            </button>
          </div>
        </div>

        {/* Product info */}
        <div className="mt-3 px-1">
          {categoryName && (
            <span className="text-[11px] text-muted uppercase tracking-wider">{categoryName}</span>
          )}
          <h3 className="font-[family-name:var(--font-outfit)] font-semibold text-sm tracking-tight mt-1 line-clamp-2 group-hover:text-accent transition-colors duration-300">
            {product.title}
          </h3>
          {price && (
            discount > 0 ? (
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-[family-name:var(--font-outfit)] font-bold text-lg text-red-600">
                  {formatPrice(price.calculated_amount, price.currency_code)}
                </span>
                <span className="text-xs text-muted line-through">
                  {formatPrice(price.original_amount, price.currency_code)}
                </span>
              </div>
            ) : (
              <div className="mt-2">
                <span className="font-[family-name:var(--font-outfit)] font-bold text-lg text-off-black">
                  {formatPrice(price.calculated_amount, price.currency_code)}
                </span>
              </div>
            )
          )}
        </div>
      </Link>
    </article>
  )
}
