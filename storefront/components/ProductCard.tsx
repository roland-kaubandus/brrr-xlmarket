"use client"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart } from "lucide-react"
import { Product, formatPrice } from "@/lib/medusa"


// Deterministic pseudo-rating from product ID — consistent across renders
function productRating(id: string): { stars: number; count: number } {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) & 0xFFFFFFFF
  }
  const stars = 3.8 + ((h & 0xFF) / 255) * 1.1  // 3.8 – 4.9
  const count = 12 + ((h >> 8) & 0xFF) % 180     // 12 – 191
  return { stars: Math.round(stars * 10) / 10, count }
}

export default function ProductCard({ product, isNew }: { product: Product; isNew?: boolean }) {
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
    e.preventDefault(); e.stopPropagation()
    try {
      const raw = localStorage.getItem("xlmarket_wishlist")
      const items: Array<{ id: string; handle: string; title: string; thumbnail: string | null; price: string }> = raw ? JSON.parse(raw) : []
      const exists = items.some((i) => i.id === product.id)
      const next = exists ? items.filter((i) => i.id !== product.id) : [...items, {
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
  return (
    <article>
      <Link
        href={"/toode/" + product.handle}
        className="group flex flex-col bg-white rounded-[2px] border border-[#E8E8E8] overflow-hidden hover:-translate-y-[2px] active:translate-y-0 hover:shadow-[0_8px_28px_rgba(232,101,10,0.10)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        style={{ transition: "all 0.22s cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="relative aspect-square bg-[#F7F7F7] overflow-hidden">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              className="object-contain p-[12px] group-hover:scale-[1.04] transition-transform duration-[250ms] ease-out"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#999999] text-[13px] font-[family-name:var(--font-inter)]">
              Pilt puudub
            </div>
          )}
          {discount > 0 && (
            <div className="absolute top-[8px] left-[8px] bg-[#EF4444] text-white text-[11px] font-[700] font-[family-name:var(--font-poppins)] px-[6px] py-[3px] rounded-[4px] z-10">
              -{discount}%
            </div>
          )}
          {isNew && discount === 0 && (
            <div className="absolute top-[8px] left-[8px] bg-[#1A1A1A] text-white text-[11px] font-[700] font-[family-name:var(--font-poppins)] px-[6px] py-[3px] rounded-[4px] z-10 tracking-[0.04em]">
              UUS
            </div>
          )}
          <button
            type="button"
            aria-label={wishlisted ? "Eemalda lemmikutest" : "Lisa lemmikutesse"}
            className={"absolute top-[8px] right-[8px] w-[28px] h-[28px] rounded-full bg-white/80 flex items-center justify-center hover:bg-white z-10 opacity-0 group-hover:opacity-100 transition-all " + (wishlisted ? "text-[#EF4444] !opacity-100" : "text-[#999999] hover:text-[#EF4444]")}
            onClick={toggleWishlist}
          >
            <Heart size={14} strokeWidth={1.5} fill={wishlisted ? "#EF4444" : "none"} />
          </button>
        </div>
        <div className="flex flex-col flex-1 p-[16px]">
          <h3 className="text-[14px] font-[500] font-[family-name:var(--font-poppins)] text-[#333333] leading-[1.45] line-clamp-2 min-h-[2.5rem]">
            {product.title}
          </h3>
          {price && (
            discount > 0 ? (
              <div className="mt-[8px] flex items-baseline gap-[8px]">
                <span className="text-[18px] font-[700] font-[family-name:var(--font-poppins)] text-[#E8650A] tracking-tight">
                  {formatPrice(price.calculated_amount, price.currency_code)}
                </span>
                <span className="text-[13px] font-[400] font-[family-name:var(--font-inter)] text-[#999999] line-through">
                  {formatPrice(price.original_amount, price.currency_code)}
                </span>
              </div>
            ) : (
              <p className="mt-[8px] text-[18px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A] tracking-tight">
                {formatPrice(price.calculated_amount, price.currency_code)}
              </p>
            )
          )}
          {/* Stars — XLM-36 */}
          <div className="flex items-center gap-[5px] mt-[6px] mb-[4px]">
            <div className="flex gap-[1px]">
              {[1, 2, 3, 4, 5].map((s) => {
                const { stars } = productRating(product.id)
                const filled = s <= Math.floor(stars)
                const half = !filled && s === Math.ceil(stars) && stars % 1 >= 0.5
                return (
                  <svg key={s} width="11" height="11" viewBox="0 0 24 24" fill={filled || half ? "#F59E0B" : "none"} stroke={filled || half ? "#F59E0B" : "#D1D5DB"} strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                )
              })}
            </div>
            <span className="text-[11px] font-[family-name:var(--font-inter)] text-[#999999]">
              ({productRating(product.id).count})
            </span>
          </div>
          <div className="mt-auto pt-[12px]">
            <span
              className="block w-full text-center py-[10px] text-[13px] font-[600] font-[family-name:var(--font-poppins)] border border-[#E8650A] text-[#E8650A] bg-transparent group-hover:bg-[#E8650A] group-hover:text-white"
              style={{ transition: "all 0.2s cubic-bezier(0.32,0.72,0,1)" }}
            >
              Lisa ostukorvi
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
