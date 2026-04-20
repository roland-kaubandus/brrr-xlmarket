"use client"

import Image from "next/image"
import Link from "@/components/SafeLink"
import { useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { formatPrice } from "@/lib/medusa"
import posthog from "posthog-js"

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
  shipping_total: number
  currency_code: string
}

type ShippingOption = {
  id: string
  name: string
  amount: number
}

type FormData = {
  first_name: string
  last_name: string
  email: string
  phone: string
  address_1: string
  city: string
  postal_code: string
  country_code: string
}

const initialForm: FormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address_1: "",
  city: "",
  postal_code: "",
  country_code: "ee",
}

const inputClass = "w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-[13px] text-[#1E293B] bg-white focus:outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/20 transition-colors"
const labelClass = "block text-[12px] font-medium text-[#64748B] mb-1.5"

export default function CheckoutPage() {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'et'
  const [cart, setCart] = useState<Cart | null>(null)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [selectedShipping, setSelectedShipping] = useState<string>("")
  const [form, setForm] = useState<FormData>(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<"form" | "confirm" | "done">("form")
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  const fetchCart = useCallback(async () => {
    const cartId = localStorage.getItem("xlmarket_cart_id")
    if (!cartId) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/cart?cart_id=${encodeURIComponent(cartId)}`)
      if (!res.ok) {
        if (res.status === 404) localStorage.removeItem("xlmarket_cart_id")
        setLoading(false)
        return
      }
      const data = await res.json()
      setCart(data.cart)

      // Fetch shipping options
      const shipRes = await fetch(`/api/cart/shipping?cart_id=${encodeURIComponent(cartId)}`)
      if (shipRes.ok) {
        const shipData = await shipRes.json()
        const options = shipData.shipping_options || []
        setShippingOptions(options)
        if (options.length > 0) setSelectedShipping(options[0].id)
      } else {
        setError("Failed to load shipping options. Please try refreshing the page.")
      }
    } catch {
      setError("Failed to load cart")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  function validateForm(): string | null {
    if (!form.first_name.trim()) return "First name is required"
    if (!form.last_name.trim()) return "Last name is required"
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "A valid email address is required"
    if (!form.phone.trim() || !/^[\d\s+()-]{7,20}$/.test(form.phone.trim())) return "Please enter a valid phone number"
    if (!form.address_1.trim()) return "Address is required"
    if (!form.city.trim()) return "City is required"
    if (!form.postal_code.trim() || !/^\d{5}$/.test(form.postal_code.trim())) return "Postal code must be a 5-digit number"
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cart) return

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)
    posthog.capture("checkout_started", {
      cart_id: cart.id,
      item_count: cart.items.length,
      total: cart.total,
      currency: cart.currency_code,
    })

    try {
      // Step 1: Set customer info + address
      const checkoutRes = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_id: cart.id,
          email: form.email,
          shipping_address: {
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone,
            address_1: form.address_1,
            city: form.city,
            postal_code: form.postal_code,
            country_code: form.country_code,
          },
        }),
      })

      if (!checkoutRes.ok) {
        posthog.capture("checkout_failed", { step: "customer_info", cart_id: cart.id })
        setError("Failed to save customer details")
        setSubmitting(false)
        return
      }

      // Step 2: Set shipping method
      if (selectedShipping) {
        const shipRes = await fetch("/api/cart/shipping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cart_id: cart.id,
            option_id: selectedShipping,
          }),
        })

        if (!shipRes.ok) {
          posthog.capture("checkout_failed", { step: "shipping", cart_id: cart.id })
          setError("Failed to select shipping method")
          setSubmitting(false)
          return
        }
      }

      // Step 3: Create payment collection/session
      const paymentRes = await fetch("/api/cart/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cart.id }),
      })

      if (!paymentRes.ok) {
        posthog.capture("checkout_failed", { step: "payment", cart_id: cart.id })
        setError("Failed to prepare payment")
        setSubmitting(false)
        return
      }

      // Step 4: Complete order
      const completeRes = await fetch("/api/cart/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cart.id }),
      })

      if (!completeRes.ok) {
        posthog.capture("checkout_failed", { step: "complete", cart_id: cart.id })
        setError("Checkout failed")
        setSubmitting(false)
        return
      }

      const orderData = await completeRes.json()

      // Medusa returns type:"order" on success, type:"cart" on failure
      if (orderData.type === "cart" || (!orderData.order && !orderData.id)) {
        posthog.capture("checkout_failed", { step: "complete_type_cart", cart_id: cart.id })
        setError("Order confirmation failed. Please try again.")
        setSubmitting(false)
        return
      }

      const resolvedOrderId = orderData.order?.id || orderData.id || null
      setOrderId(resolvedOrderId)
      posthog.capture("order_completed", {
        order_id: resolvedOrderId,
        cart_id: cart.id,
        total: cart.total,
        currency: cart.currency_code,
        item_count: cart.items.length,
        email: form.email,
      })
      localStorage.removeItem("xlmarket_cart_id")
      setStep("done")
    } catch (err) {
      posthog.captureException(err)
      setError("Checkout failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-xl font-semibold text-[#1E293B] mb-6">Checkout</h1>
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#E2E8F0] border-t-[#D97706] rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  // Empty cart
  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-xl font-semibold text-[#1E293B] mb-6">Checkout</h1>
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#E2E8F0] rounded-lg">
            <p className="text-[14px] text-[#64748B] mb-7">Your cart is empty.</p>
            <Link
              href={`/${locale}`}
              className="inline-flex items-center bg-[#D97706] text-white px-6 py-3 text-[15px] font-semibold rounded-lg hover:bg-[#B45309] transition-colors"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Order completed
  if (step === "done") {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#E2E8F0] rounded-lg">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <span className="text-[#059669] text-[28px]">&#10003;</span>
            </div>
            <h1 className="text-xl font-semibold text-[#1E293B] mb-4">Order Confirmed!</h1>
            <p className="text-[14px] text-[#64748B] mb-2">
              Thank you for your purchase. We will send a confirmation to{" "}
              <strong className="text-[#1E293B]">{form.email}</strong>.
            </p>
            {orderId && (
              <p className="text-[14px] text-[#64748B] mb-8">
                Order number: <span className="font-medium text-[#1E293B]">{orderId}</span>
              </p>
            )}
            <Link
              href={`/${locale}`}
              className="inline-flex items-center bg-[#D97706] text-white px-6 py-3 text-[15px] font-semibold rounded-lg hover:bg-[#B45309] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const items = cart.items

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav className="text-[12px] text-[#64748B] mb-7 flex items-center" aria-label="Breadcrumb">
          <Link href={`/${locale}`} className="text-[#64748B] hover:text-[#D97706] transition-colors">Home</Link>
          <span className="mx-2 text-[#CBD5E1]">/</span>
          <Link href={`/${locale}/ostukorv`} className="text-[#64748B] hover:text-[#D97706] transition-colors">Cart</Link>
          <span className="mx-2 text-[#CBD5E1]">/</span>
          <span className="text-[#1E293B] font-medium">Checkout</span>
        </nav>

        <h1 className="text-[28px] font-bold text-[#1E293B] mb-6">Checkout</h1>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[#DC2626] text-[13px]" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left: Customer form */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              {/* Personal info */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
                <h2 className="text-base font-semibold text-[#1E293B] mb-4">Customer Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className={labelClass}>
                      First Name *
                    </label>
                    <input
                      id="first_name"
                      type="text"
                      required
                      value={form.first_name}
                      onChange={(e) => updateField("first_name", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="last_name" className={labelClass}>
                      Last Name *
                    </label>
                    <input
                      id="last_name"
                      type="text"
                      required
                      value={form.last_name}
                      onChange={(e) => updateField("last_name", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email *
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Phone *
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
                <h2 className="text-base font-semibold text-[#1E293B] mb-4">Shipping Address</h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="address_1" className={labelClass}>
                      Address *
                    </label>
                    <input
                      id="address_1"
                      type="text"
                      required
                      placeholder="Street, building, apartment"
                      value={form.address_1}
                      onChange={(e) => updateField("address_1", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="city" className={labelClass}>
                        City *
                      </label>
                      <input
                        id="city"
                        type="text"
                        required
                        value={form.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="postal_code" className={labelClass}>
                        Postal Code *
                      </label>
                      <input
                        id="postal_code"
                        type="text"
                        required
                        value={form.postal_code}
                        onChange={(e) => updateField("postal_code", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="country" className={labelClass}>
                      Country
                    </label>
                    <select
                      id="country"
                      value={form.country_code}
                      onChange={(e) => updateField("country_code", e.target.value)}
                      className={inputClass}
                    >
                      <option value="ee">Estonia</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Shipping */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
                <h2 className="text-base font-semibold text-[#1E293B] mb-4">Shipping Method</h2>
                {shippingOptions.length === 0 ? (
                  <p className="text-[12px] text-[#64748B]">Loading shipping options...</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {shippingOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition ${
                          selectedShipping === opt.id
                            ? "border-[#D97706] bg-[#FFFBEB]"
                            : "border-[#E2E8F0] hover:border-[#D97706]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            value={opt.id}
                            checked={selectedShipping === opt.id}
                            onChange={() => setSelectedShipping(opt.id)}
                            className="accent-[#D97706]"
                          />
                          <span className="text-[13px] font-medium text-[#1E293B]">{opt.name}</span>
                        </div>
                        {typeof opt.amount === "number" && (
                          <span className="text-[13px] font-bold text-[#1E293B]">
                            {opt.amount === 0 ? "Free" : formatPrice(opt.amount, cart.currency_code)}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Order summary */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 sticky top-20">
                <h2 className="text-base font-semibold text-[#1E293B] mb-4">Order Summary</h2>

                {/* Items */}
                <div className="flex flex-col gap-2.5 mb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative w-14 h-14 bg-[#F7F7F7] rounded-lg border border-[#E2E8F0] shrink-0 overflow-hidden">
                        {item.variant?.product?.thumbnail ? (
                          <Image
                            src={item.variant.product.thumbnail}
                            alt={item.variant?.product?.title || item.title}
                            fill
                            className="object-contain p-1"
                            sizes="56px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#CCCCCC] text-[11px]">
                            -
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#1E293B] leading-[1.4] line-clamp-2">
                          {item.variant?.product?.title || item.title}
                        </p>
                        <p className="text-[12px] text-[#64748B]">
                          {item.quantity} pcs &times; {formatPrice(item.unit_price, cart.currency_code)}
                        </p>
                      </div>
                      <p className="text-[13px] font-bold text-[#1E293B] shrink-0">
                        {formatPrice(item.total, cart.currency_code)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-[#E2E8F0] pt-3 flex flex-col gap-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#64748B]">Subtotal</span>
                    <span className="text-[#1E293B]">{formatPrice(cart.subtotal, cart.currency_code)}</span>
                  </div>
                  {cart.shipping_total > 0 && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#64748B]">Shipping</span>
                      <span className="text-[#1E293B]">{formatPrice(cart.shipping_total, cart.currency_code)}</span>
                    </div>
                  )}
                  {cart.tax_total > 0 && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#64748B]">VAT</span>
                      <span className="text-[#1E293B]">{formatPrice(cart.tax_total, cart.currency_code)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#E2E8F0] mt-4 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-[#1E293B]">Total</span>
                    <span className="text-xl font-bold text-[#D97706]">
                      {formatPrice(cart.total, cart.currency_code)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedShipping}
                  className="w-full mt-5 py-3.5 bg-[#D97706] text-white text-[15px] font-semibold rounded-lg hover:bg-[#B45309] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ boxShadow: "0 4px 16px rgba(255,106,0,0.25)" }}
                >
                  {submitting ? "Processing..." : "Confirm Order"}
                </button>

                <p className="text-[12px] text-[#64748B] text-center mt-2.5">
                  Payment: bank transfer (invoice sent via email)
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
