"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
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
      setError("Ostukorvi laadimine ebaõnnestus")
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
        setError("Koguse uuendamine ebaõnnestus")
      }
    } catch {
      setError("Koguse uuendamine ebaõnnestus")
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
        setError("Toote eemaldamine ebaõnnestus")
      }
    } catch {
      setError("Toote eemaldamine ebaõnnestus")
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[48px]">
        <div className="flex items-center justify-center py-[80px]">
          <div className="w-[32px] h-[32px] border-2 border-[#E8E8E8] border-t-[#E8650A] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const items = cart?.items ?? []
  const isEmpty = items.length === 0
  const FREE_SHIPPING_THRESHOLD = 5000 // €50 in cents
  const toFreeShipping = cart ? Math.max(0, FREE_SHIPPING_THRESHOLD - (cart.subtotal || cart.item_total || 0)) : FREE_SHIPPING_THRESHOLD
  const shippingProgress = cart ? Math.min(100, ((cart.subtotal || cart.item_total || 0) / FREE_SHIPPING_THRESHOLD) * 100) : 0

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      {/* Breadcrumb */}
      <nav className="text-[12px] font-[family-name:var(--font-inter)] text-[#999999] mb-[28px]" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-[#E8650A]">Avaleht</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Ostukorv</span>
      </nav>

      <div className="flex items-center gap-[12px] mb-[32px]">
        <ShoppingCart size={24} strokeWidth={1.5} className="text-[#E8650A]" />
        <h1 className="text-[28px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">
          Ostukorv
        </h1>
        {!isEmpty && (
          <span className="text-[16px] font-[400] font-[family-name:var(--font-inter)] text-[#999999]">
            ({items.reduce((s, i) => s + i.quantity, 0)} toodet)
          </span>
        )}
      </div>

      {error && (
        <div className="mb-[16px] px-[14px] py-[10px] bg-red-50 border border-red-200 text-red-700 text-[13px] font-[family-name:var(--font-inter)] rounded-[6px]" role="alert">
          {error}
        </div>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-[80px] text-center border border-[#E8E8E8] rounded-[8px] bg-[#FAFAFA]">
          <ShoppingCart size={56} strokeWidth={1} className="text-[#E8E8E8] mb-[20px]" />
          <p className="text-[18px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[6px]">
            Ostukorv on tühi
          </p>
          <p className="text-[14px] font-[family-name:var(--font-inter)] text-[#999999] mb-[28px]">
            Lisa tooteid, et alustada ostlemist
          </p>
          <Link
            href="/kategooriad"
            className="inline-flex items-center gap-[8px] px-[24px] py-[12px] rounded-[8px] bg-[#E8650A] text-white text-[14px] font-[600] font-[family-name:var(--font-poppins)] hover:bg-[#CF5A08] transition-colors"
          >
            Vaata tooteid
            <ArrowRight size={16} strokeWidth={1.5} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px] lg:gap-[32px]">
          {/* Items list */}
          <div className="lg:col-span-2 flex flex-col gap-[12px]">
            {/* Free shipping progress */}
            {toFreeShipping > 0 && (
              <div className="flex flex-col gap-[8px] p-[14px] bg-[#FFF5EE] border border-[#E8650A]/15 rounded-[8px] mb-[4px]">
                <div className="flex items-center gap-[6px]">
                  <Truck size={14} strokeWidth={1.5} className="text-[#E8650A] shrink-0" />
                  <span className="text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">
                    Lisa veel <strong className="text-[#E8650A]">{formatPrice(toFreeShipping, cart?.currency_code ?? "EUR")}</strong> tasuta tarne saamiseks
                  </span>
                </div>
                <div className="h-[4px] bg-[#E8E8E8] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E8650A] rounded-full transition-all duration-[500ms]"
                    style={{ width: shippingProgress + "%" }}
                  />
                </div>
              </div>
            )}
            {toFreeShipping === 0 && (
              <div className="flex items-center gap-[8px] p-[12px] bg-green-50 border border-green-200 rounded-[8px] mb-[4px]">
                <Truck size={14} strokeWidth={1.5} className="text-green-600 shrink-0" />
                <span className="text-[13px] font-[family-name:var(--font-inter)] text-green-700">
                  Tasuta tarne on lisatud!
                </span>
              </div>
            )}

            {items.map((item) => (
              <div
                key={item.id}
                className={"flex gap-[14px] p-[14px] bg-white border border-[#E8E8E8] rounded-[8px] transition-opacity " + (updating === item.id ? "opacity-50" : "")}
              >
                {/* Thumbnail */}
                <Link href={"/toode/" + (item.variant?.product?.handle ?? "")} className="shrink-0">
                  <div className="w-[80px] h-[80px] sm:w-[96px] sm:h-[96px] bg-[#F7F7F7] rounded-[4px] border border-[#E8E8E8] overflow-hidden">
                    {item.variant?.product?.thumbnail ? (
                      <Image
                        src={item.variant.product.thumbnail}
                        alt={item.variant?.product?.title ?? item.title}
                        width={96}
                        height={96}
                        className="w-full h-full object-contain p-[6px]"
                      />
                    ) : null}
                  </div>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link href={"/toode/" + (item.variant?.product?.handle ?? "")}>
                    <p className="text-[13px] sm:text-[14px] font-[500] font-[family-name:var(--font-poppins)] text-[#1A1A1A] hover:text-[#E8650A] line-clamp-2 leading-[1.4] mb-[4px] transition-colors">
                      {item.variant?.product?.title ?? item.title}
                    </p>
                  </Link>
                  <p className="text-[15px] font-[700] font-[family-name:var(--font-poppins)] text-[#E8650A] mb-[10px]">
                    {cart && formatPrice(item.unit_price, cart.currency_code)}
                  </p>

                  <div className="flex items-center justify-between">
                    {/* Quantity */}
                    <div className="flex items-center border border-[#E8E8E8] rounded-[6px] overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={!!updating}
                        className="w-[32px] h-[32px] flex items-center justify-center hover:bg-[#F7F7F7] text-[#555555] disabled:text-[#CCCCCC] transition-colors"
                        aria-label="Vähenda"
                      >
                        <Minus size={14} strokeWidth={2} />
                      </button>
                      <span className="w-[36px] text-center text-[13px] font-[500] font-[family-name:var(--font-inter)] border-x border-[#E8E8E8]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, Math.min(99, item.quantity + 1))}
                        disabled={!!updating || item.quantity >= 99}
                        className="w-[32px] h-[32px] flex items-center justify-center hover:bg-[#F7F7F7] text-[#555555] disabled:text-[#CCCCCC] transition-colors"
                        aria-label="Suurenda"
                      >
                        <Plus size={14} strokeWidth={2} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={!!updating}
                      className="flex items-center gap-[4px] text-[12px] font-[family-name:var(--font-inter)] text-[#CCCCCC] hover:text-red-400 disabled:opacity-40 transition-colors"
                      aria-label={"Eemalda " + (item.variant?.product?.title ?? item.title)}
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                      Eemalda
                    </button>
                  </div>
                </div>

                {/* Line total */}
                <div className="shrink-0 text-right hidden sm:block">
                  <p className="text-[15px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">
                    {cart && formatPrice(item.total, cart.currency_code)}
                  </p>
                  <p className="text-[11px] text-[#999999] font-[family-name:var(--font-inter)] mt-[2px]">
                    {item.quantity} × {cart && formatPrice(item.unit_price, cart.currency_code)}
                  </p>
                </div>
              </div>
            ))}

            <Link
              href="/kategooriad"
              className="inline-flex items-center gap-[6px] text-[13px] font-[500] font-[family-name:var(--font-poppins)] text-[#E8650A] hover:text-[#CF5A08] mt-[4px] self-start transition-colors"
            >
              ← Jätka ostlemist
            </Link>
          </div>

          {/* Order summary */}
          {cart && (
            <div className="lg:col-span-1">
              <div className="bg-white border border-[#E8E8E8] rounded-[8px] p-[20px] sticky top-[80px]">
                <h2 className="text-[17px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[18px]">
                  Kokkuvõte
                </h2>

                <div className="flex flex-col gap-[10px] mb-[16px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">Vahesumma</span>
                    <span className="text-[13px] font-[family-name:var(--font-inter)] text-[#1A1A1A]">
                      {formatPrice(cart.subtotal ?? cart.item_total, cart.currency_code)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">Tarne</span>
                    <span className="text-[13px] font-[family-name:var(--font-inter)] text-[toFreeShipping === 0 ? 'green-600' : '#1A1A1A']">
                      {toFreeShipping === 0 ? "Tasuta" : "Arvutatakse tellimisel"}
                    </span>
                  </div>
                  {cart.tax_total > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">KM (20%)</span>
                      <span className="text-[13px] font-[family-name:var(--font-inter)] text-[#1A1A1A]">
                        {formatPrice(cart.tax_total, cart.currency_code)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#E8E8E8] pt-[14px] mb-[20px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">Kokku</span>
                    <span className="text-[20px] font-[700] font-[family-name:var(--font-poppins)] text-[#E8650A]">
                      {formatPrice(cart.total, cart.currency_code)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#999999] font-[family-name:var(--font-inter)] mt-[4px]">
                    Sisaldab KM-i
                  </p>
                </div>

                <Link
                  href="/tellimus"
                  className="block w-full text-center py-[14px] rounded-[8px] bg-[#E8650A] text-white text-[15px] font-[600] font-[family-name:var(--font-poppins)] hover:bg-[#CF5A08] transition-colors"
                  style={{ boxShadow: "0 4px 16px rgba(232,101,10,0.25)" }}
                >
                  Vormista tellimus
                </Link>

                <p className="text-[11px] text-[#999999] font-[family-name:var(--font-inter)] text-center mt-[10px]">
                  Turvaline makse · SSL krüpteeritud
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
