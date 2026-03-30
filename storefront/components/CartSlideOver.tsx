"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { X, ShoppingCart, Plus, Minus, Trash2 } from "lucide-react"

type CartItem = {
  id: string
  title: string
  thumbnail: string | null
  quantity: number
  unit_price: number
  currency_code: string
  variant_id: string
}

type CartData = {
  id: string
  items: CartItem[]
  total: number
  currency_code: string
}

function formatPrice(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("et-EE", { style: "currency", currency }).format(amount / 100)
}

export default function CartSlideOver() {
  const [open, setOpen] = useState(false)
  const [cart, setCart] = useState<CartData | null>(null)
  const [loading, setLoading] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  const fetchCart = useCallback(async () => {
    const cartId = localStorage.getItem("xlmarket_cart_id")
    if (!cartId) return
    setLoading(true)
    try {
      const res = await fetch("/api/cart?cart_id=" + cartId)
      if (res.ok) {
        const data = await res.json()
        setCart(data.cart)
        // Cache count for nav badge
        const cnt = data.cart?.items?.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0) ?? 0
        localStorage.setItem("xlmarket_cart_count", String(cnt))
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handler = () => {
      setOpen(true)
      fetchCart()
    }
    window.addEventListener("cart:open", handler)
    return () => window.removeEventListener("cart:open", handler)
  }, [fetchCart])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
    window.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [open, close])

  const itemCount = cart?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]"
        onClick={close}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 flex flex-col shadow-[−4px_0_32px_rgba(0,0,0,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-label="Ostukorv"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[18px] border-b border-[#E8E8E8]">
          <div className="flex items-center gap-[10px]">
            <ShoppingCart size={20} strokeWidth={1.5} className="text-[#E8650A]" />
            <h2 className="text-[17px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">
              Ostukorv
            </h2>
            {itemCount > 0 && (
              <span className="w-[22px] h-[22px] rounded-full bg-[#E8650A] text-white text-[12px] font-[700] flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </div>
          <button
            onClick={close}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-[#F7F7F7] text-[#999999] hover:text-[#1A1A1A] transition-colors"
            aria-label="Sulge"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[20px] py-[16px]">
          {loading && (
            <div className="flex items-center justify-center py-[48px]">
              <div className="w-[28px] h-[28px] border-2 border-[#E8E8E8] border-t-[#E8650A] rounded-full animate-spin" />
            </div>
          )}

          {!loading && (!cart || cart.items?.length === 0) && (
            <div className="flex flex-col items-center justify-center py-[64px] text-center">
              <ShoppingCart size={48} strokeWidth={1} className="text-[#E8E8E8] mb-[16px]" />
              <p className="text-[15px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[6px]">
                Ostukorv on tühi
              </p>
              <p className="text-[13px] font-[family-name:var(--font-inter)] text-[#999999]">
                Lisa tooteid, et alustada ostlemist
              </p>
              <button
                onClick={close}
                className="mt-[20px] px-[20px] py-[10px] bg-[#E8650A] text-white text-[13px] font-[600] font-[family-name:var(--font-poppins)] hover:bg-[#CF5A08] transition-colors"
              >
                Jätka ostlemist
              </button>
            </div>
          )}

          {!loading && cart && cart.items?.length > 0 && (
            <div className="flex flex-col gap-[16px]">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-[12px] py-[12px] border-b border-[#F0F0F0] last:border-0">
                  {item.thumbnail ? (
                    <div className="w-[72px] h-[72px] shrink-0 bg-[#F7F7F7] rounded-[4px] overflow-hidden border border-[#E8E8E8]">
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-contain p-[4px]" />
                    </div>
                  ) : (
                    <div className="w-[72px] h-[72px] shrink-0 bg-[#F7F7F7] rounded-[4px] border border-[#E8E8E8]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-[500] font-[family-name:var(--font-poppins)] text-[#1A1A1A] leading-[1.4] line-clamp-2 mb-[6px]">
                      {item.title}
                    </p>
                    <p className="text-[14px] font-[700] font-[family-name:var(--font-poppins)] text-[#E8650A]">
                      {formatPrice(item.unit_price * item.quantity, item.currency_code)}
                    </p>
                    <div className="flex items-center gap-[8px] mt-[8px]">
                      <div className="flex items-center border border-[#E8E8E8] rounded-[4px] overflow-hidden">
                        <span className="w-[28px] h-[28px] flex items-center justify-center bg-[#FAFAFA] text-[#999999]">
                          <Minus size={12} strokeWidth={2} />
                        </span>
                        <span className="w-[32px] text-center text-[13px] font-[500] font-[family-name:var(--font-inter)] border-x border-[#E8E8E8]">
                          {item.quantity}
                        </span>
                        <span className="w-[28px] h-[28px] flex items-center justify-center bg-[#FAFAFA] text-[#999999]">
                          <Plus size={12} strokeWidth={2} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && cart && cart.items?.length > 0 && (
          <div className="px-[20px] py-[20px] border-t border-[#E8E8E8] bg-[#FAFAFA]">
            <div className="flex items-center justify-between mb-[16px]">
              <span className="text-[14px] font-[family-name:var(--font-inter)] text-[#555555]">Kokku</span>
              <span className="text-[18px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">
                {formatPrice(cart.total, cart.currency_code)}
              </span>
            </div>
            <Link
              href="/ostukorv"
              onClick={close}
              className="block w-full text-center py-[13px] bg-[#E8650A] text-white text-[15px] font-[600] font-[family-name:var(--font-poppins)] hover:bg-[#CF5A08] transition-colors"
              style={{ boxShadow: "0 4px 16px rgba(232,101,10,0.25)" }}
            >
              Vaata ostukorvi
            </Link>
            <button
              onClick={close}
              className="block w-full text-center mt-[8px] py-[10px] text-[13px] font-[500] font-[family-name:var(--font-poppins)] text-[#999999] hover:text-[#1A1A1A] transition-colors"
            >
              Jätka ostlemist
            </button>
          </div>
        )}
      </div>
    </>
  )
}
