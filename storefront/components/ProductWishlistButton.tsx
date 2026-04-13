"use client"

import { useEffect, useState } from "react"
import type { CompareItem } from "./CompareContext"

type Props = {
  item: CompareItem
  locale: string
}

export default function ProductWishlistButton({ item, locale }: Props) {
  const [wishlisted, setWishlisted] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("xlmarket_wishlist")
      if (raw) setWishlisted(JSON.parse(raw).some((i: { id: string }) => i.id === item.id))
    } catch {}
  }, [item.id])

  function toggleWishlist() {
    try {
      const raw = localStorage.getItem("xlmarket_wishlist")
      const items: CompareItem[] = raw ? JSON.parse(raw) : []
      const exists = items.some((i) => i.id === item.id)
      const next = exists ? items.filter((i) => i.id !== item.id) : [...items, item]
      localStorage.setItem("xlmarket_wishlist", JSON.stringify(next))
      setWishlisted(!exists)
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggleWishlist}
      aria-label={wishlisted
        ? (locale === "en" ? "Remove from Wishlist" : "Eemalda soovinimekirjast")
        : (locale === "en" ? "Add to Wishlist" : "Lisa soovinimekirja")}
      className="ml-auto w-10 h-10 rounded-full flex items-center justify-center border border-[#E2E8F0] bg-white hover:border-[#D97706] hover:text-[#D97706] transition-colors"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={wishlisted ? "#DC2626" : "none"} stroke={wishlisted ? "#DC2626" : "#64748B"} strokeWidth="1.5">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </button>
  )
}
