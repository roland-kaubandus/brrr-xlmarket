"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { ShoppingCart } from "lucide-react"

type Props = {
  variantId: string
  title: string
  price: string
}

export default function StickyBuyBar({ variantId, title, price }: Props) {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'et'
  const [visible, setVisible] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    const handler = () => {
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
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-soft-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="hidden sm:flex flex-col min-w-0">
          <p className="text-sm font-semibold text-[#1E293B] truncate max-w-[400px]">
            {title}
          </p>
          <p className="text-base font-bold text-[#D97706]">
            {price}
          </p>
        </div>
        <div className="flex items-center gap-2.5 ml-auto">
          <a
            href={`/${locale}/ostukorv`}
            className="px-4 py-2.5 border border-[#D97706] text-[#D97706] text-sm font-semibold hover:bg-[#FFFBEB] rounded-lg transition-colors duration-200"
          >
            Cart
          </a>
          <button
            onClick={handleAdd}
            disabled={adding}
            className={
              "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-200 disabled:opacity-60 " +
              (added ? "bg-green-600 text-white" : "bg-[#D97706] text-white hover:bg-[#B45309]")
            }
          >
            <ShoppingCart size={16} strokeWidth={1.5} />
            {added ? "Added!" : adding ? "Adding..." : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  )
}
