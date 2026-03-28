"use client"

import { useState, useRef } from "react"
import Link from "next/link"

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
        body: JSON.stringify({ cart_id: cartId, variant_id: variantId, quantity: qty }),
      })

      if (!addRes.ok) {
        setError("Toote lisamine ostukorvi ebaõnnestus")
        return
      }

      setAdded(true)
      setTimeout(() => setAdded(false), 3000)
    } catch {
      setError("Toote lisamine ostukorvi ebaõnnestus")
    } finally {
      setLoading(false)
      addingRef.current = false
    }
  }

  return (
    <div>
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
            onClick={() => setQty(Math.min(99, qty + 1))}
            className="px-3 py-2 hover:bg-gray-100 transition"
          >
            +
          </button>
        </div>
        <button
          onClick={handleAdd}
          disabled={loading}
          className="flex-1 bg-brand-500 text-white py-3 px-6 font-medium hover:bg-brand-600 disabled:bg-gray-300 transition"
        >
          {loading ? "Lisamine..." : added ? "Lisatud!" : "Lisa ostukorvi"}
        </button>
      </div>
      {added && (
        <p className="mt-2 text-sm text-green-700">
          Toode lisatud!{" "}
          <Link href="/ostukorv" className="underline hover:text-green-900">
            Vaata ostukorvi
          </Link>
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>
      )}
    </div>
  )
}
