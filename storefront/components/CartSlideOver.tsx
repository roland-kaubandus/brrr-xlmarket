"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { X, ShoppingCart, Trash2 } from "lucide-react"

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

export default function CartSlideOver({ locale = "et" }: { locale?: string }) {
  const [open, setOpen] = useState(false)
  const [cart, setCart] = useState<CartData | null>(null)
  const [loading, setLoading] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  const fetchCart = useCallback(async () => {
    const cartId = localStorage.getItem("xlmarket_cart_id")
    if (!cartId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/cart?cart_id=${encodeURIComponent(cartId)}`)
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
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 flex flex-col shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <ShoppingCart size={20} strokeWidth={1.5} className="text-[#D97706]" />
            <h2 className="text-[17px] font-semibold text-[#1E293B]">
              Shopping Cart
            </h2>
            {itemCount > 0 && (
              <span className="w-[22px] h-[22px] rounded-full bg-[#D97706] text-white text-xs font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </div>
          <button
            onClick={close}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] text-[#999999] hover:text-[#1E293B] transition-colors"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-2 border-[#E2E8F0] border-t-[#D97706] rounded-full animate-spin" />
            </div>
          )}

          {!loading && (!cart || cart.items?.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart size={48} strokeWidth={1} className="text-[#E2E8F0] mb-4" />
              <p className="text-[15px] font-semibold text-[#1E293B] mb-1.5">
                Your cart is empty
              </p>
              <p className="text-[13px] text-[#64748B]">
                Add products to start shopping
              </p>
              <button
                onClick={close}
                className="mt-5 px-5 py-2.5 bg-[#D97706] text-white text-[13px] font-semibold rounded-lg hover:bg-[#B45309] transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          )}

          {!loading && cart && cart.items?.length > 0 && (
            <div className="flex flex-col gap-4">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-3 py-3 border-b border-[#E2E8F0] last:border-0">
                  {item.thumbnail ? (
                    <div className="w-[60px] h-[60px] shrink-0 bg-[#F7F7F7] rounded-lg overflow-hidden border border-[#E2E8F0]">
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-contain p-1" />
                    </div>
                  ) : (
                    <div className="w-[60px] h-[60px] shrink-0 bg-[#F7F7F7] rounded-lg border border-[#E2E8F0]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1E293B] leading-[1.4] line-clamp-2 mb-1.5">
                      {item.title}
                    </p>
                    <p className="text-[14px] font-bold text-[#D97706]">
                      {formatPrice(item.unit_price * item.quantity, item.currency_code)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-[#E2E8F0] rounded-lg overflow-hidden">
                        <span className="w-8 text-center text-[13px] font-medium px-2 py-1">
                          {item.quantity} pcs
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
          <div className="px-5 py-5 border-t border-[#E2E8F0] bg-[#FAFAFA]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[14px] text-[#64748B]">Total</span>
              <span className="text-lg font-bold text-[#1E293B]">
                {formatPrice(cart.total, cart.currency_code)}
              </span>
            </div>
            <Link
              href={`/${locale}/ostukorv`}
              onClick={close}
              className="block w-full text-center py-3.5 bg-[#D97706] text-white text-[15px] font-semibold rounded-lg hover:bg-[#B45309] transition-colors"
              style={{ boxShadow: "0 4px 16px rgba(255,106,0,0.25)" }}
            >
              View Cart
            </Link>
            <button
              onClick={close}
              className="block w-full text-center mt-2 py-2.5 text-[13px] font-medium text-[#64748B] hover:text-[#1E293B] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}
