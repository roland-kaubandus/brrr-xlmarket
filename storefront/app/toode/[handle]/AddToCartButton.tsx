"use client"

import { useState } from "react"

export default function AddToCartButton({ variantId }: { variantId: string }) {
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)

  async function handleAdd() {
    setLoading(true)
    try {
      let cartId = localStorage.getItem("xlmarket_cart_id")

      if (!cartId) {
        const res = await fetch("/api/cart", { method: "POST" })
        const data = await res.json()
        cartId = data.cart.id
        localStorage.setItem("xlmarket_cart_id", cartId!)
      }

      await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cartId, variant_id: variantId, quantity: qty }),
      })

      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (err) {
      console.error("Add to cart failed:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex border border-gray-300">
        <button
          onClick={() => setQty(Math.max(1, qty - 1))}
          className="px-3 py-2 hover:bg-gray-100 transition"
        >
          -
        </button>
        <span className="px-4 py-2 border-x border-gray-300 min-w-[3rem] text-center">
          {qty}
        </span>
        <button
          onClick={() => setQty(qty + 1)}
          className="px-3 py-2 hover:bg-gray-100 transition"
        >
          +
        </button>
      </div>
      <button
        onClick={handleAdd}
        disabled={loading}
        className="flex-1 bg-amber-500 text-white py-3 px-6 font-medium hover:bg-amber-600 disabled:bg-gray-300 transition"
      >
        {loading ? "Lisamine..." : added ? "Lisatud!" : "Lisa ostukorvi"}
      </button>
    </div>
  )
}
