"use client"

import { useEffect, useState } from "react"
import type { CompareItem } from "./CompareContext"
import { safeReadJSON, safeWriteJSON } from "@/lib/safe-storage"

type Props = {
  item: CompareItem
}

const WISHLIST_KEY = "xlmarket_wishlist"

export default function ProductWishlistButton({ item }: Props) {
  const [wishlisted, setWishlisted] = useState(false)

  useEffect(() => {
    const items = safeReadJSON<Array<{ id: string }>>(WISHLIST_KEY, [])
    setWishlisted(items.some((i) => i.id === item.id))
  }, [item.id])

  function toggleWishlist() {
    const items = safeReadJSON<CompareItem[]>(WISHLIST_KEY, [])
    const exists = items.some((i) => i.id === item.id)
    const next = exists ? items.filter((i) => i.id !== item.id) : [...items, item]
    safeWriteJSON(WISHLIST_KEY, next)
    setWishlisted(!exists)
  }

  const label = wishlisted ? "In Favorites" : "Add to Favorites"

  return (
    <button
      type="button"
      onClick={toggleWishlist}
      aria-label={label}
      className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white text-[13.5px] font-semibold text-[#1E293B] hover:border-[#E8920A] hover:text-[#E8920A] transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={wishlisted ? "#DC2626" : "none"} stroke={wishlisted ? "#DC2626" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
      {label}
    </button>
  )
}
