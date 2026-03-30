"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { ShoppingCart, Check } from "lucide-react"

export default function AddToCartButton({ variantId }: { variantId: string }) {
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
          setError("Ostukorvi loomine ebaõnnestus")
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
        setError("Toote lisamine ostukorvi ebaõnnestus")
        return
      }

      setAdded(true)
      setTimeout(() => setAdded(false), 3000)
      // Increment nav badge count
      try {
        const cur = parseInt(localStorage.getItem("xlmarket_cart_count") || "0", 10)
        localStorage.setItem("xlmarket_cart_count", String(cur + qty))
      } catch {}
      window.dispatchEvent(new CustomEvent("cart:open"))
    } catch {
      setError("Toote lisamine ostukorvi ebaõnnestus")
    } finally {
      setLoading(false)
      addingRef.current = false
    }
  }

  return (
    <div>
      <div className="flex items-center gap-[12px]">
        {/* Quantity selector */}
        <div className="flex border border-[#E8E8E8] rounded-[8px] overflow-hidden">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            aria-label="Vähenda kogust"
            className="w-[40px] h-[44px] flex items-center justify-center hover:bg-[#F7F7F7] active:bg-[#E8E8E8] text-[#333333] font-[family-name:var(--font-poppins)] font-[500] text-[16px]"
          >
            -
          </button>
          <span className="w-[48px] h-[44px] flex items-center justify-center border-x border-[#E8E8E8] text-[14px] font-[family-name:var(--font-inter)] text-[#333333] font-[500] tabular-nums">
            {qty}
          </span>
          <button
            onClick={() => setQty(Math.min(99, qty + 1))}
            aria-label="Suurenda kogust"
            className="w-[40px] h-[44px] flex items-center justify-center hover:bg-[#F7F7F7] active:bg-[#E8E8E8] text-[#333333] font-[family-name:var(--font-poppins)] font-[500] text-[16px]"
          >
            +
          </button>
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAdd}
          disabled={loading}
          className={
            "flex-1 flex items-center justify-center gap-[8px] py-[12px] px-[24px] rounded-[8px] font-[600] font-[family-name:var(--font-poppins)] text-[15px] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed " +
            (added
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-[#E8650A] text-white hover:bg-[#CF5A08] hover:shadow-[0_4px_16px_rgba(232,101,10,0.25)]")
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
        <p className="mt-[12px] text-[14px] font-[family-name:var(--font-inter)] text-green-700 bg-green-50 px-[12px] py-[8px] rounded-[6px]">
          Toode lisatud!{" "}
          <Link
            href="/ostukorv"
            className="font-[500] underline underline-offset-2 hover:text-green-900"
          >
            Vaata ostukorvi
          </Link>
        </p>
      )}
      {error && (
        <p
          className="mt-[12px] text-[14px] font-[family-name:var(--font-inter)] text-red-600 bg-red-50 px-[12px] py-[8px] rounded-[6px]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}
