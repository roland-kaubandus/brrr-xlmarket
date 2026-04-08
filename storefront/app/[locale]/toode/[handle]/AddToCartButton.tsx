"use client"

import { useState, useRef } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ShoppingCart, Check } from "lucide-react"

export default function AddToCartButton({ variantId }: { variantId: string }) {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'et'
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const addingRef = useRef(false)

  async function handleAdd() {
    if (addingRef.current) return
    addingRef.current = true
    setLoading(true)
    setError(null)
    try {
      let cartId = localStorage.getItem("xlmarket_cart_id")

      if (!cartId) {
        const res = await fetch("/api/cart", { method: "POST" })
        if (!res.ok) {
          setError("Ostukorvi loomine eba\u00F5nnestus")
          return
        }
        const data = await res.json()
        cartId = data.cart.id
        localStorage.setItem("xlmarket_cart_id", cartId!)
      }

      const addRes = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_id: cartId,
          variant_id: variantId,
          quantity: qty,
        }),
      })

      if (!addRes.ok) {
        setError("Toote lisamine ostukorvi eba\u00F5nnestus")
        return
      }

      setAdded(true)
      setTimeout(() => setAdded(false), 3000)
      try {
        const cur = parseInt(localStorage.getItem("xlmarket_cart_count") || "0", 10)
        localStorage.setItem("xlmarket_cart_count", String(cur + qty))
      } catch {}
      window.dispatchEvent(new CustomEvent("cart:open"))
    } catch {
      setError("Toote lisamine ostukorvi eba\u00F5nnestus")
    } finally {
      setLoading(false)
      addingRef.current = false
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        {/* Quantity selector */}
        <div className="flex border border-[#E2E8F0] rounded-lg overflow-hidden">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            aria-label={"V\u00E4henda kogust"}
            className="w-10 h-12 flex items-center justify-center hover:bg-[#F8FAFC] active:bg-[#E2E8F0] text-[#1E293B] font-medium text-base transition-colors duration-200"
          >
            -
          </button>
          <span className="w-12 h-12 flex items-center justify-center border-x border-[#E2E8F0] text-sm text-[#1E293B] font-medium tabular-nums">
            {qty}
          </span>
          <button
            onClick={() => setQty(Math.min(99, qty + 1))}
            aria-label="Suurenda kogust"
            className="w-10 h-12 flex items-center justify-center hover:bg-[#F8FAFC] active:bg-[#E2E8F0] text-[#1E293B] font-medium text-base transition-colors duration-200"
          >
            +
          </button>
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAdd}
          disabled={loading}
          className={
            "flex-1 flex items-center justify-center gap-2 h-12 px-6 font-bold text-base rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 " +
            (added
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-[#D97706] text-white hover:bg-[#B45309]")
          }
        >
          {loading ? (
            <>
              <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Lisamine...
            </>
          ) : added ? (
            <>
              <Check size={18} strokeWidth={2} />
              Lisatud!
            </>
          ) : (
            <>
              <ShoppingCart size={18} strokeWidth={1.5} />
              Lisa ostukorvi
            </>
          )}
        </button>
      </div>

      {added && (
        <p className="mt-3 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          Toode lisatud!{" "}
          <Link
            href={`/${locale}/ostukorv`}
            className="font-medium underline underline-offset-2 hover:text-green-900"
          >
            Vaata ostukorvi
          </Link>
        </p>
      )}
      {error && (
        <p
          className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}
