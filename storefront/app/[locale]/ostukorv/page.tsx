"use client"

import Image from "next/image"
import Link from "@/components/SafeLink"
import { useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { formatPrice } from "@/lib/medusa"
import { categoryPath } from "@/lib/i18n"
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, Truck } from "lucide-react"
import posthog from "posthog-js"

type CartItem = {
  id: string
  title: string
  quantity: number
  unit_price: number
  total: number
  // Denormaliseeritud line-item väljad (Medusa salvestab add-ajal). Cart-query on trimmitud
  // `*items` peale (cart-stall fix 2026-06-09) → nested item.variant.product.* EI ole enam
  // saadaval. Kasuta neid denormaliseeritud välju (vrd CartSlideOver.tsx). (thumbnail-fix 2026-06-10)
  thumbnail: string | null
  product_handle: string | null
  product_title: string | null
  variant_id: string | null
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
      setError(locale === "et" ? "Ostukorvi laadimine ebaõnnestus" : "Failed to load cart")
    } finally {
      setLoading(false)
    }
  }, [locale])

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
        // Medusa PATCH response omits line-item `total` / `subtotal` — refetch
        // the cart so line totals render correctly (not as €NaN).
        await fetchCart()
      } else {
        setError(locale === "et" ? "Koguse muutmine ebaõnnestus" : "Failed to update quantity")
      }
    } catch {
      setError(locale === "et" ? "Koguse muutmine ebaõnnestus" : "Failed to update quantity")
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
        const removedItem = cart.items.find((i) => i.id === itemId)
        posthog.capture("cart_item_removed", {
          item_id: itemId,
          variant_id: removedItem?.variant_id,
          product_title: removedItem?.product_title,
          quantity: removedItem?.quantity,
        })
        setCart(data.cart)
      } else {
        setError(locale === "et" ? "Toote eemaldamine ebaõnnestus" : "Failed to remove item")
      }
    } catch {
      setError(locale === "et" ? "Toote eemaldamine ebaõnnestus" : "Failed to remove item")
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#E2E8F0] border-t-[#0ea5a0] rounded-full animate-spin" />
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
    <div className="min-h-screen bg-white">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav className="text-[12px] text-[#64748B] mb-7 flex items-center" aria-label="Breadcrumb">
          <Link href={`/${locale}`} className="text-[#64748B] hover:text-[#0b7d79] transition-colors">{locale === "et" ? "Avaleht" : "Home"}</Link>
          <span className="mx-2 text-[#CBD5E1]">/</span>
          <span className="text-[#1a1a2e] font-medium">{locale === "et" ? "Ostukorv" : "Cart"}</span>
        </nav>

        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-[28px] font-bold text-[#1a1a2e]">
            {locale === "et" ? "Ostukorv" : "Shopping Cart"}
          </h1>
          {!isEmpty && (
            <span className="text-base text-[#64748B]">
              ({items.reduce((s, i) => s + i.quantity, 0)} {locale === "et" ? "toodet" : "items"})
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
            <p className="text-lg font-semibold text-[#1a1a2e] mb-1.5">
              {locale === "et" ? "Sinu ostukorv on tühi" : "Your cart is empty"}
            </p>
            <p className="text-[14px] text-[#64748B] mb-7">
              {locale === "et" ? "Lisa tooteid, et alustada ostlemist" : "Add products to start shopping"}
            </p>
            <Link
              href={categoryPath(locale as "et" | "en")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0ea5a0] text-white text-[14px] font-semibold rounded-lg hover:bg-[#0b7d79] transition-colors"
            >
              {locale === "et" ? "Sirvi tooteid" : "Browse Products"}
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Items list */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              {/* Free shipping progress */}
              {toFreeShipping > 0 && (
                <div className="flex flex-col gap-2 p-4 bg-[#f0fdf9] border border-[#0ea5a0]/15 rounded-lg mb-1">
                  <div className="flex items-center gap-1.5">
                    <Truck size={14} strokeWidth={1.5} className="text-[#0b7d79] shrink-0" />
                    <span className="text-[13px] text-[#64748B]">
                      {locale === "et" ? "Lisa veel " : "Add "}<strong className="text-[#0b7d79]">{formatPrice(toFreeShipping, cart?.currency_code ?? "EUR")}</strong>{locale === "et" ? " tasuta tarneks" : " more for free shipping"}
                    </span>
                  </div>
                  <div className="h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0ea5a0] rounded-full transition-all duration-500"
                      style={{ width: shippingProgress + "%" }}
                    />
                  </div>
                </div>
              )}
              {toFreeShipping === 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-1">
                  <Truck size={14} strokeWidth={1.5} className="text-[#059669] shrink-0" />
                  <span className="text-[13px] text-green-700">
                    {locale === "et" ? "Tasuta tarne rakendatud!" : "Free shipping applied!"}
                  </span>
                </div>
              )}

              {/* Table header (desktop) */}
              <div className="hidden sm:grid grid-cols-[1fr_100px_140px_100px_40px] gap-4 px-4 py-3 bg-white border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#64748B] uppercase tracking-wide">
                <span>{locale === "et" ? "Toode" : "Product"}</span>
                <span className="text-center">{locale === "et" ? "Hind" : "Price"}</span>
                <span className="text-center">{locale === "et" ? "Kogus" : "Quantity"}</span>
                <span className="text-right">{locale === "et" ? "Kokku" : "Total"}</span>
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
                      <Link href={`/${locale}/toode/${item.product_handle ?? ""}`} className="shrink-0">
                        <div className="w-[60px] h-[60px] bg-[#F7F7F7] rounded-lg border border-[#E2E8F0] overflow-hidden">
                          {item.thumbnail ? (
                            <Image
                              src={item.thumbnail}
                              alt={item.product_title ?? item.title}
                              width={60}
                              height={60}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : null}
                        </div>
                      </Link>
                      <Link href={`/${locale}/toode/${item.product_handle ?? ""}`} className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1a1a2e] hover:text-[#0b7d79] line-clamp-2 leading-[1.4] transition-colors">
                          {item.product_title ?? item.title}
                        </p>
                      </Link>
                    </div>

                    {/* Unit price */}
                    <div className="text-center">
                      <span className="text-[14px] font-semibold text-[#1a1a2e]">
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
                      <span className="text-[15px] font-bold text-[#1a1a2e]">
                        {cart && formatPrice(item.total, cart.currency_code)}
                      </span>
                    </div>

                    {/* Delete */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={!!updating}
                        className="w-8 h-8 flex items-center justify-center text-[#CCCCCC] hover:text-[#DC2626] disabled:opacity-40 transition-colors rounded-lg hover:bg-red-50"
                        aria-label={"Remove " + (item.product_title ?? item.title)}
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Mobile: stacked layout */}
                  <div className="flex sm:hidden gap-3">
                    <Link href={`/${locale}/toode/${item.product_handle ?? ""}`} className="shrink-0">
                      <div className="w-[72px] h-[72px] bg-[#F7F7F7] rounded-lg border border-[#E2E8F0] overflow-hidden">
                        {item.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt={item.product_title ?? item.title}
                            width={72}
                            height={72}
                            className="w-full h-full object-contain p-1.5"
                          />
                        ) : null}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/${locale}/toode/${item.product_handle ?? ""}`}>
                        <p className="text-[13px] font-medium text-[#1a1a2e] hover:text-[#0b7d79] line-clamp-2 leading-[1.4] mb-1 transition-colors">
                          {item.product_title ?? item.title}
                        </p>
                      </Link>
                      <p className="text-[15px] font-bold text-[#0b7d79] mb-2.5">
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
                          aria-label={"Remove " + (item.product_title ?? item.title)}
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                          {locale === "et" ? "Eemalda" : "Remove"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Link
                href={categoryPath(locale as "et" | "en")}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0b7d79] hover:text-[#0b7d79] mt-1 self-start transition-colors"
              >
                ← {locale === "et" ? "Jätka ostlemist" : "Continue Shopping"}
              </Link>
            </div>

            {/* Order summary */}
            {cart && (
              <div className="lg:col-span-1">
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 sticky top-20">
                  <h2 className="text-[17px] font-semibold text-[#1a1a2e] mb-5">
                    {locale === "et" ? "Tellimuse kokkuvõte" : "Order Summary"}
                  </h2>

                  <div className="flex flex-col gap-2.5 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#64748B]">{locale === "et" ? "Vahesumma" : "Subtotal"}</span>
                      <span className="text-[13px] text-[#1a1a2e]">
                        {formatPrice(cart.subtotal ?? cart.item_total, cart.currency_code)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#64748B]">{locale === "et" ? "Tarne" : "Shipping"}</span>
                      <span className={`text-[13px] ${toFreeShipping === 0 ? "text-[#059669] font-medium" : "text-[#1a1a2e]"}`}>
                        {toFreeShipping === 0 ? (locale === "et" ? "Tasuta" : "Free") : (locale === "et" ? "Arvutatakse kassas" : "Calculated at checkout")}
                      </span>
                    </div>
                    {cart.tax_total > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[#64748B]">{locale === "et" ? "Käibemaks (24%)" : "VAT (24%)"}</span>
                        <span className="text-[13px] text-[#1a1a2e]">
                          {formatPrice(cart.tax_total, cart.currency_code)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#E2E8F0] pt-4 mb-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold text-[#1a1a2e]">{locale === "et" ? "Kokku" : "Total"}</span>
                      <span className="text-xl font-bold text-[#0b7d79]">
                        {formatPrice(cart.total, cart.currency_code)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      {locale === "et" ? "Sisaldab käibemaksu" : "Includes VAT"}
                    </p>
                  </div>

                  <Link
                    href={`/${locale}/tellimus`}
                    className="block w-full text-center py-3.5 bg-[#0ea5a0] text-white text-[15px] font-semibold rounded-lg hover:bg-[#0b7d79] transition-colors"
                    style={{ boxShadow: "0 4px 16px rgba(255,106,0,0.25)" }}
                  >
                    {locale === "et" ? "Vormista tellimus" : "Proceed to Checkout"}
                  </Link>

                  <p className="text-[11px] text-[#64748B] text-center mt-2.5">
                    {locale === "et" ? "Turvaline makse · SSL krüpteeritud" : "Secure payment · SSL encrypted"}
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
