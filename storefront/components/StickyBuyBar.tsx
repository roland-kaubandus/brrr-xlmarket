"use client"

import { useState, useEffect } from "react"
import { ShoppingCart } from "lucide-react"

type Props = {
  variantId: string
  title: string
  price: string
}

export default function StickyBuyBar({ variantId, title, price }: Props) {
  const [visible, setVisible] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    const handler = () => {
      // Show sticky bar when user scrolls past ~400px
      setVisible(window.scrollY > 400)
    }
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  async function handleAdd() {
    if (adding) return
    setAdding(true)
    try {
      let cartId = localStorage.getItem("xlmarket_cart_id")
      if (!cartId) {
        const res = await fetch("/api/cart", { method: "POST" })
        if (!res.ok) { setAdding(false); return }
        const data = await res.json()
        cartId = data.cart.id
        localStorage.setItem("xlmarket_cart_id", cartId!)
      }
      const addRes = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cartId, variant_id: variantId, quantity: 1 }),
      })
      if (addRes.ok) {
        setAdded(true)
        setTimeout(() => setAdded(false), 2500)
        window.dispatchEvent(new CustomEvent("cart:open"))
      }
    } catch {
      // silent
    } finally {
      setAdding(false)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E8E8E8]"
      style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}
    >
      <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[12px] flex items-center justify-between gap-[16px]">
        <div className="hidden sm:flex flex-col min-w-0">
          <p className="text-[14px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] truncate max-w-[400px]">
            {title}
          </p>
          <p className="text-[16px] font-[700] font-[family-name:var(--font-poppins)] text-[#E8650A]">
            {price}
          </p>
        </div>
        <div className="flex items-center gap-[10px] ml-auto">
          <a
            href="/ostukorv"
            className="px-[16px] py-[10px] border border-[#E8650A] text-[#E8650A] text-[13px] font-[600] font-[family-name:var(--font-poppins)] hover:bg-[#FFF5EE] transition-colors"
          >
            Ostukorv
          </a>
          <button
            onClick={handleAdd}
            disabled={adding}
            className={
              "flex items-center gap-[8px] px-[20px] py-[10px] text-[13px] font-[600] font-[family-name:var(--font-poppins)] transition-colors disabled:opacity-60 " +
              (added ? "bg-green-600 text-white" : "bg-[#E8650A] text-white hover:bg-[#CF5A08]")
            }
          >
            <ShoppingCart size={16} strokeWidth={1.5} />
            {added ? "Lisatud!" : adding ? "Lisamine..." : "Lisa ostukorvi"}
          </button>
        </div>
      </div>
    </div>
  )
}
