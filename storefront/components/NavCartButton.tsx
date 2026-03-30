"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ShoppingCart } from "lucide-react"

export default function NavCartButton() {
  const [count, setCount] = useState(0)

  function updateCount() {
    try {
      const cartId = localStorage.getItem("xlmarket_cart_id")
      if (!cartId) { setCount(0); return }
      // Read count from localStorage cache
      const raw = localStorage.getItem("xlmarket_cart_count")
      if (raw) setCount(parseInt(raw, 10) || 0)
    } catch {}
  }

  useEffect(() => {
    updateCount()
    // Listen for cart updates
    const handler = () => {
      setTimeout(updateCount, 800) // slight delay to let cart fetch complete
    }
    window.addEventListener("cart:open", handler)
    window.addEventListener("storage", updateCount)
    return () => {
      window.removeEventListener("cart:open", handler)
      window.removeEventListener("storage", updateCount)
    }
  }, [])

  return (
    <Link
      href="/ostukorv"
      className="relative flex items-center justify-center w-[40px] h-[40px] rounded-[8px] text-[#333333] hover:text-[#E8650A] hover:bg-[#FFF5EE] active:scale-95"
      aria-label="Ostukorv"
    >
      <ShoppingCart size={20} strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute top-[4px] right-[4px] min-w-[16px] h-[16px] rounded-full bg-[#E8650A] text-white text-[10px] font-[700] flex items-center justify-center px-[3px] leading-none">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}
