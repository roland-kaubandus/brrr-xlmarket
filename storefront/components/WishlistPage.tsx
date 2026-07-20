"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "@/components/SafeLink"
import { Heart, Trash2 } from "lucide-react"
import { categoryPath } from "@/lib/i18n"

type WishItem = {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  price: string
}

export default function WishlistPage() {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'et'
  const [items, setItems] = useState<WishItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("xlmarket_wishlist")
      if (raw) setItems(JSON.parse(raw))
    } catch {}
  }, [])

  function remove(id: string) {
    const next = items.filter((i) => i.id !== id)
    setItems(next)
    localStorage.setItem("xlmarket_wishlist", JSON.stringify(next))
  }

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[40px]">
      <div className="flex items-center gap-[10px] mb-[32px]">
        <Heart size={22} strokeWidth={1.5} className="text-[#E8650A]" />
        <h1 className="text-[28px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1a1a2e]">
          {locale === "et" ? "Lemmikud" : "Wishlist"}
        </h1>
        {items.length > 0 && (
          <span className="ml-[4px] text-[15px] font-[family-name:var(--font-dm-sans)] text-[#999999]">
            ({items.length})
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-[80px] text-center">
          <Heart size={56} strokeWidth={1} className="text-[#E8E8E8] mb-[20px]" />
          <p className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1a1a2e] mb-[8px]">
            {locale === "et" ? "Sinu lemmikute nimekiri on tühi" : "Your wishlist is empty"}
          </p>
          <p className="text-[14px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[24px]">
            {locale === "et" ? "Vajuta toote südameikoonile, et lisada see lemmikutesse" : "Tap the heart icon on any product to add it to your wishlist"}
          </p>
          <Link
            href={categoryPath(locale as "et" | "en")}
            className="px-[20px] py-[11px] bg-[#E8650A] text-white text-[14px] font-[600] font-[family-name:var(--font-dm-sans)] hover:bg-[#CF5A08] transition-colors"
          >
            {locale === "et" ? "Sirvi tooteid" : "Browse Products"}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px]">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-[14px] p-[14px] border border-[#E8E8E8] bg-white hover:border-[#E8650A]/30 transition-colors"
            >
              <Link href={`/${locale}/toode/${item.handle}`} className="shrink-0">
                <div className="w-[80px] h-[80px] bg-[#F7F7F7] rounded-[4px] overflow-hidden border border-[#E8E8E8]">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-contain p-[6px]" />
                  ) : null}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/${locale}/toode/${item.handle}`}>
                  <p className="text-[13px] font-[500] font-[family-name:var(--font-dm-sans)] text-[#1a1a2e] leading-[1.4] line-clamp-2 hover:text-[#0b7d79] transition-colors mb-[6px]">
                    {item.title}
                  </p>
                </Link>
                <p className="text-[15px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#E8650A]">
                  {item.price}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="shrink-0 w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-red-50 text-[#CCCCCC] hover:text-red-400 transition-colors self-start mt-[-2px]"
                aria-label="Remove from Wishlist"
              >
                <Trash2 size={15} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
