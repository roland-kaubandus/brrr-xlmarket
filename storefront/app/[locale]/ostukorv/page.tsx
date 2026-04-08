"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { formatPrice } from "@/lib/medusa"
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, Truck } from "lucide-react"

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
  const pathname = usePathname()
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'et'
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCart = useCallback(async () => {
    const cartId = localStorage.getItem("xlmarket_cart_id")
    if (!cartId) { setLoading(false); return }
    try {
      const res = await fetch(`/api/cart?cart_id=${encodeURIComponent(cartId)}`)
      if (res.ok) {
        const data = await res.json()
        setCart(data.cart)
        // Update count cache
        const cnt = data.cart?.items?.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0) ?? 0
        localStorage.setItem("xlmarket_cart_count", String(cnt))
      }
    } catch {
      setError("Failed to load cart")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCart() }, [fetchCart])

  async function updateQuantity(itemId: string, quantity: number) {
    if (!cart || updating) return
    if (quantity < 1) return removeItem(itemId)
    setUpdating(itemId)
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
        setError("Failed to update quantity")
      }
    } catch {
      setError("Failed to update quantity")
    } finally {
      setUpdating(null)
    }
  }

  async function removeItem(itemId: string) {
    if (!cart || updating) return
    setUpdating(itemId)
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
        setError("Failed to remove item")
      }
    } catch {
      setError("Failed to remove item")
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#E2E8F0] border-t-[#D97706] rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  const items = cart?.items ?? []
  const isEmpty = items.length === 0
  const FREE_SHIPPING_THRESHOLD = 9900 // 99 EUR in cents
  const toFreeShipping = cart ? Math.max(0, FREE_SHIPPING_THRESHOLD - (cart.subtotal || cart.item_total || 0)) : FREE_SHIPPING_THRESHOLD
  const shippingProgress = cart ? Math.min(100, ((cart.subtotal || cart.item_total || 0) / FREE_SHIPPING_THRESHOLD) * 100) : 0

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav className="text-[12px] text-[#64748B] mb-7" aria-label="Breadcrumb">
          <Link href={`/${locale}`} className="hover:text-[#D97706] transition-colors">Home</Link>
          <span className="mx-2 text-[#E2E8F0]">/</span>
          <span className="text-[#1E293B] font-medium">Cart</span>
        </nav>

        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-[28px] font-bold text-[#1E293B]">
            Shopping Cart
          </h1>
          {!isEmpty && (
            <span className="text-base text-[#64748B]">
              ({items.reduce((s, i) => s + i.quantity, 0)} items)
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[#DC2626] text-[13px]" role="alert">
            {error}
          </div>
        )}

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-[#E2E8F0] rounded-lg">
            <ShoppingCart size={56} strokeWidth={1} className="text-[#E2E8F0] mb-5" />
            <p className="text-lg font-semibold text-[#1E293B] mb-1.5">
              Your cart is empty
            </p>
            <p className="text-[14px] text-[#64748B] mb-7">
              Add products to start shopping
            </p>
            <Link
              href={`/${locale}/kategooriad`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#D97706] text-white text-[14px] font-semibold rounded-lg hover:bg-[#B45309] transition-colors"
            >
              Browse Products
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Items list */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              {/* Free shipping progress */}
              {toFreeShipping > 0 && (
                <div className="flex flex-col gap-2 p-4 bg-[#FFFBEB] border border-[#D97706]/15 rounded-lg mb-1">
                  <div className="flex items-center gap-1.5">
                    <Truck size={14} strokeWidth={1.5} className="text-[#D97706] shrink-0" />
                    <span className="text-[13px] text-[#64748B]">
                      Add <strong className="text-[#D97706]">{formatPrice(toFreeShipping, cart?.currency_code ?? "EUR")}</strong> more for free shipping
                    </span>
                  </div>
                  <div className="h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D97706] rounded-full transition-all duration-500"
                      style={{ width: shippingProgress + "%" }}
                    />
                  </div>
                </div>
              )}
              {toFreeShipping === 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-1">
                  <Truck size={14} strokeWidth={1.5} className="text-[#059669] shrink-0" />
                  <span className="text-[13px] text-green-700">
                    Free shipping applied!
                  </span>
                </div>
              )}

              {/* Table header (desktop) */}
              <div className="hidden sm:grid grid-cols-[1fr_100px_140px_100px_40px] gap-4 px-4 py-3 bg-white border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#64748B] uppercase tracking-wide">
                <span>Product</span>
                <span className="text-center">Price</span>
                <span className="text-center">Quantity</span>
                <span className="text-right">Total</span>
                <span></span>
              </div>

              {items.map((item) => (
                <div
                  key={item.id}
                  className={"bg-white border border-[#E2E8F0] rounded-lg p-4 transition-opacity " + (updating === item.id ? "opacity-50" : "")}
                >
                  {/* Desktop: table row */}
                  <div className="hidden sm:grid grid-cols-[1fr_100px_140px_100px_40px] gap-4 items-center">
                    {/* Product */}
                    <div className="flex gap-3 items-center min-w-0">
                      <Link href={`/${locale}/toode/${item.variant?.product?.handle ?? ""}`} className="shrink-0">
                        <div className="w-[60px] h-[60px] bg-[#F7F7F7] rounded-lg border border-[#E2E8F0] overflow-hidden">
                          {item.variant?.product?.thumbnail ? (
                            <Image
                              src={item.variant.product.thumbnail}
                              alt={item.variant?.product?.title ?? item.title}
                              width={60}
                              height={60}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : null}
                        </div>
                      </Link>
                      <Link href={`/${locale}/toode/${item.variant?.product?.handle ?? ""}`} className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1E293B] hover:text-[#D97706] line-clamp-2 leading-[1.4] transition-colors">
                          {item.variant?.product?.title ?? item.title}
                        </p>
                      </Link>
                    </div>

                    {/* Unit price */}
                    <div className="text-center">
                      <span className="text-[14px] font-semibold text-[#1E293B]">
                        {cart && formatPrice(item.unit_price, cart.currency_code)}
                      </span>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex justify-center">
                      <div className="inline-flex items-center border border-[#E2E8F0] rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={!!updating}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#F8FAFC] text-[#64748B] disabled:text-[#CCCCCC] transition-colors"
                          aria-label="Decrease"
                        >
                          <Minus size={14} strokeWidth={2} />
                        </button>
                        <span className="w-10 text-center text-[13px] font-medium border-x border-[#E2E8F0]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, Math.min(99, item.quantity + 1))}
                          disabled={!!updating || item.quantity >= 99}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#F8FAFC] text-[#64748B] disabled:text-[#CCCCCC] transition-colors"
                          aria-label="Increase"
                        >
                          <Plus size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    {/* Line total */}
                    <div className="text-right">
                      <span className="text-[15px] font-bold text-[#1E293B]">
                        {cart && formatPrice(item.total, cart.currency_code)}
                      </span>
                    </div>

                    {/* Delete */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={!!updating}
                        className="w-8 h-8 flex items-center justify-center text-[#CCCCCC] hover:text-[#DC2626] disabled:opacity-40 transition-colors rounded-lg hover:bg-red-50"
                        aria-label={"Remove " + (item.variant?.product?.title ?? item.title)}
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Mobile: stacked layout */}
                  <div className="flex sm:hidden gap-3">
                    <Link href={`/${locale}/toode/${item.variant?.product?.handle ?? ""}`} className="shrink-0">
                      <div className="w-[72px] h-[72px] bg-[#F7F7F7] rounded-lg border border-[#E2E8F0] overflow-hidden">
                        {item.variant?.product?.thumbnail ? (
                          <Image
                            src={item.variant.product.thumbnail}
                            alt={item.variant?.product?.title ?? item.title}
                            width={72}
                            height={72}
                            className="w-full h-full object-contain p-1.5"
                          />
                        ) : null}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/${locale}/toode/${item.variant?.product?.handle ?? ""}`}>
                        <p className="text-[13px] font-medium text-[#1E293B] hover:text-[#D97706] line-clamp-2 leading-[1.4] mb-1 transition-colors">
                          {item.variant?.product?.title ?? item.title}
                        </p>
                      </Link>
                      <p className="text-[15px] font-bold text-[#D97706] mb-2.5">
                        {cart && formatPrice(item.total, cart.currency_code)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center border border-[#E2E8F0] rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={!!updating}
                            className="w-8 h-8 flex items-center justify-center hover:bg-[#F8FAFC] text-[#64748B] disabled:text-[#CCCCCC] transition-colors"
                            aria-label="Decrease"
                          >
                            <Minus size={14} strokeWidth={2} />
                          </button>
                          <span className="w-9 text-center text-[13px] font-medium border-x border-[#E2E8F0]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, Math.min(99, item.quantity + 1))}
                            disabled={!!updating || item.quantity >= 99}
                            className="w-8 h-8 flex items-center justify-center hover:bg-[#F8FAFC] text-[#64748B] disabled:text-[#CCCCCC] transition-colors"
                            aria-label="Increase"
                          >
                            <Plus size={14} strokeWidth={2} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={!!updating}
                          className="flex items-center gap-1 text-[12px] text-[#CCCCCC] hover:text-[#DC2626] disabled:opacity-40 transition-colors"
                          aria-label={"Remove " + (item.variant?.product?.title ?? item.title)}
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Link
                href={`/${locale}/kategooriad`}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#D97706] hover:text-[#B45309] mt-1 self-start transition-colors"
              >
                ← Continue Shopping
              </Link>
            </div>

            {/* Order summary */}
            {cart && (
              <div className="lg:col-span-1">
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 sticky top-20">
                  <h2 className="text-[17px] font-semibold text-[#1E293B] mb-5">
                    Order Summary
                  </h2>

                  <div className="flex flex-col gap-2.5 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#64748B]">Subtotal</span>
                      <span className="text-[13px] text-[#1E293B]">
                        {formatPrice(cart.subtotal ?? cart.item_total, cart.currency_code)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#64748B]">Shipping</span>
                      <span className={`text-[13px] ${toFreeShipping === 0 ? "text-[#059669] font-medium" : "text-[#1E293B]"}`}>
                        {toFreeShipping === 0 ? "Free" : "Calculated at checkout"}
                      </span>
                    </div>
                    {cart.tax_total > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[#64748B]">VAT (22%)</span>
                        <span className="text-[13px] text-[#1E293B]">
                          {formatPrice(cart.tax_total, cart.currency_code)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#E2E8F0] pt-4 mb-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold text-[#1E293B]">Total</span>
                      <span className="text-xl font-bold text-[#D97706]">
                        {formatPrice(cart.total, cart.currency_code)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Includes VAT
                    </p>
                  </div>

                  <Link
                    href={`/${locale}/tellimus`}
                    className="block w-full text-center py-3.5 bg-[#D97706] text-white text-[15px] font-semibold rounded-lg hover:bg-[#B45309] transition-colors"
                    style={{ boxShadow: "0 4px 16px rgba(255,106,0,0.25)" }}
                  >
                    Proceed to Checkout
                  </Link>

                  <p className="text-[11px] text-[#64748B] text-center mt-2.5">
                    Secure payment · SSL encrypted
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
