"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import { formatPrice } from "@/lib/medusa"

type CartItem = {
  id: string
  title: string
  quantity: number
  unit_price: number
  total: number
  variant: {
    id: string
    title: string
    product: {
      title: string
      handle: string
      thumbnail: string | null
    }
  }
}

type Cart = {
  id: string
  items: CartItem[]
  total: number
  subtotal: number
  tax_total: number
  item_total: number
  currency_code: string
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCart = useCallback(async () => {
    const cartId = localStorage.getItem("xlmarket_cart_id")
    if (!cartId) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/cart?cart_id=${encodeURIComponent(cartId)}`)
      if (!res.ok) {
        if (res.status === 404) {
          localStorage.removeItem("xlmarket_cart_id")
        }
        setLoading(false)
        return
      }
      const data = await res.json()
      setCart(data.cart)
    } catch {
      setError("Ostukorvi laadimine ebaõnnestus")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  async function updateQuantity(itemId: string, quantity: number) {
    if (!cart || quantity < 1) return
    setUpdating(itemId)
    setError(null)
    try {
      const res = await fetch("/api/cart/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cart.id, item_id: itemId, quantity }),
      })
      if (res.ok) {
        const data = await res.json()
        setCart(data.cart)
      } else {
        setError("Koguse muutmine ebaõnnestus, proovi uuesti")
      }
    } catch {
      setError("Koguse muutmine ebaõnnestus, proovi uuesti")
    } finally {
      setUpdating(null)
    }
  }

  async function removeItem(itemId: string) {
    if (!cart) return
    setUpdating(itemId)
    setError(null)
    try {
      const res = await fetch("/api/cart/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cart.id, item_id: itemId }),
      })
      if (res.ok) {
        const data = await res.json()
        setCart(data.cart)
      } else {
        setError("Toote eemaldamine ebaõnnestus, proovi uuesti")
      }
    } catch {
      setError("Toote eemaldamine ebaõnnestus, proovi uuesti")
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-8">Ostukorv</h1>
        <p className="text-gray-500">Laen ostukorvi...</p>
      </div>
    )
  }

  const items = cart?.items || []
  const isEmpty = items.length === 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-brand-600">Avaleht</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Ostukorv</span>
      </nav>

      <h1 className="text-2xl font-bold mb-8">
        Ostukorv {!isEmpty && <span className="text-gray-400 font-normal text-lg">({items.length})</span>}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      {isEmpty ? (
        <div className="text-center py-16 border border-gray-200 bg-white">
          <p className="text-gray-500 mb-6">Sinu ostukorv on tühi.</p>
          <Link
            href="/"
            className="inline-block bg-brand-500 text-white px-8 py-3 font-medium hover:bg-brand-600 transition"
          >
            Vaata tooteid
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex gap-4 p-4 bg-white border border-gray-200 ${updating === item.id ? "opacity-50" : ""}`}
              >
                {/* Image */}
                <Link
                  href={`/toode/${item.variant?.product?.handle || ""}`}
                  className="relative w-24 h-24 bg-gray-50 shrink-0"
                >
                  {item.variant?.product?.thumbnail ? (
                    <Image
                      src={item.variant.product.thumbnail}
                      alt={item.variant?.product?.title || item.title}
                      fill
                      className="object-contain p-1"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                      Pilt puudub
                    </div>
                  )}
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/toode/${item.variant?.product?.handle || ""}`}
                    className="text-sm font-medium text-gray-900 hover:text-brand-600 line-clamp-2"
                  >
                    {item.variant?.product?.title || item.title}
                  </Link>

                  <p className="text-brand-600 font-bold mt-1">
                    {cart && formatPrice(item.unit_price, cart.currency_code)}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    {/* Quantity controls */}
                    <div className="flex items-center border border-gray-300">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={updating === item.id || item.quantity <= 1}
                        className="px-2 py-1 text-sm hover:bg-gray-100 disabled:text-gray-300 transition"
                        aria-label="Vähenda kogust"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 text-sm border-x border-gray-300 min-w-[2.5rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, Math.min(99, item.quantity + 1))}
                        disabled={updating === item.id || item.quantity >= 99}
                        className="px-2 py-1 text-sm hover:bg-gray-100 disabled:text-gray-300 transition"
                        aria-label="Suurenda kogust"
                      >
                        +
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={updating === item.id}
                      className="text-sm text-gray-400 hover:text-red-600 transition"
                      aria-label={`Eemalda ${item.variant?.product?.title || item.title}`}
                    >
                      Eemalda
                    </button>
                  </div>
                </div>

                {/* Line total */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900">
                    {cart && formatPrice(item.total, cart.currency_code)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {cart && (
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 p-6 sticky top-20">
                <h2 className="text-lg font-bold mb-4">Kokkuvõte</h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vahesumma</span>
                    <span>{formatPrice(cart.subtotal, cart.currency_code)}</span>
                  </div>
                  {cart.tax_total > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Käibemaks</span>
                      <span>{formatPrice(cart.tax_total, cart.currency_code)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 mt-4 pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Kokku</span>
                    <span className="text-brand-600">
                      {formatPrice(cart.total, cart.currency_code)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Tarne lisandub tellimuse vormistamisel</p>
                </div>

                <Link
                  href="/tellimus"
                  className="block w-full mt-6 bg-brand-500 text-white py-3 font-medium text-center hover:bg-brand-600 transition"
                >
                  Vormista tellimus
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
