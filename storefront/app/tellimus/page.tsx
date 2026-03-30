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

export default function CheckoutPage() {
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
        setError("Tarneviise ei õnnestunud laadida. Palun proovi lehte uuesti laadida.")
      }
    } catch {
      setError("Ostukorvi laadimine ebaõnnestus")
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
    if (!form.first_name.trim()) return "Eesnimi on kohustuslik"
    if (!form.last_name.trim()) return "Perekonnanimi on kohustuslik"
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Kehtiv e-posti aadress on kohustuslik"
    if (!form.phone.trim() || !/^[\d\s+()-]{7,20}$/.test(form.phone.trim())) return "Palun sisestage kehtiv telefoninumber"
    if (!form.address_1.trim()) return "Aadress on kohustuslik"
    if (!form.city.trim()) return "Linn on kohustuslik"
    if (!form.postal_code.trim() || !/^\d{5}$/.test(form.postal_code.trim())) return "Postiindeks peab olema 5-kohaline number"
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
        setError("Kliendi andmete salvestamine ebaõnnestus")
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
          setError("Tarneviisi valimine ebaõnnestus")
          setSubmitting(false)
          return
        }
      }

      // Step 3: Complete order
      const completeRes = await fetch("/api/cart/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cart.id }),
      })

      if (!completeRes.ok) {
        setError("Tellimuse vormistamine ebaõnnestus")
        setSubmitting(false)
        return
      }

      const orderData = await completeRes.json()
      setOrderId(orderData.order?.id || orderData.id || null)
      localStorage.removeItem("xlmarket_cart_id")
      setStep("done")
    } catch {
      setError("Tellimuse vormistamine ebaõnnestus. Palun proovi uuesti.")
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[48px]">
        <h1 className="text-[20px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[24px]">Tellimuse vormistamine</h1>
        <p className="text-[#999999] font-[family-name:var(--font-inter)]">Laen andmeid...</p>
      </div>
    )
  }

  // Empty cart
  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[48px]">
        <h1 className="text-[20px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[24px]">Tellimuse vormistamine</h1>
        <div className="flex flex-col items-center justify-center py-[64px] border border-[#E8E8E8] bg-[#FAFAFA]">
          <p className="text-[14px] font-[family-name:var(--font-inter)] text-[#999999] mb-[28px]">Sinu ostukorv on tühi.</p>
          <Link
            href="/"
            className="inline-flex items-center bg-[#E8650A] text-white px-[24px] py-[12px] text-[15px] font-[600] font-[family-name:var(--font-poppins)] hover:bg-[#CF5A08] transition-colors"
          >
            Vaata tooteid
          </Link>
        </div>
      </div>
    )
  }

  // Order completed
  if (step === "done") {
    return (
      <div className="max-w-[720px] mx-auto px-[16px] sm:px-[24px] py-[48px]">
        <div className="flex flex-col items-center justify-center py-[64px] bg-white border border-[#E8E8E8]">
          <div className="w-[56px] h-[56px] rounded-full bg-green-100 flex items-center justify-center mx-auto mb-[20px]"><span className="text-green-600 text-[28px]">&#10003;</span></div>
          <h1 className="text-[20px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[16px]">Tellimus on vormistatud!</h1>
          <p className="text-[14px] font-[family-name:var(--font-inter)] text-[#555555] mb-[8px]">
            Täname ostu eest. Saadame kinnituse aadressile{" "}
            <strong>{form.email}</strong>.
          </p>
          {orderId && (
            <p className="text-[14px] font-[family-name:var(--font-inter)] text-[#555555] mb-[32px]">
              Tellimuse number: {orderId}
            </p>
          )}
          <Link
            href="/"
            className="inline-flex items-center bg-[#E8650A] text-white px-[24px] py-[12px] text-[15px] font-[600] font-[family-name:var(--font-poppins)] hover:bg-[#CF5A08] transition-colors"
          >
            Tagasi avalehele
          </Link>
        </div>
      </div>
    )
  }

  const items = cart.items

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      {/* Breadcrumb */}
      <nav className="text-[12px] font-[family-name:var(--font-inter)] text-[#999999] mb-[28px]" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-[#E8650A]">Avaleht</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <Link href="/ostukorv" className="hover:text-[#E8650A]">Ostukorv</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#1A1A1A] font-[family-name:var(--font-poppins)]">Tellimus</span>
      </nav>

      <h1 className="text-[20px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[24px]">Tellimuse vormistamine</h1>

      {error && (
        <div className="mb-[20px] px-[14px] py-[10px] bg-red-50 border border-red-200 text-red-700 text-[13px] font-[family-name:var(--font-inter)]" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px] lg:gap-[32px]">
          {/* Left: Customer form */}
          <div className="lg:col-span-2 flex flex-col gap-[20px]">
            {/* Personal info */}
            <div className="bg-white border border-[#E8E8E8] p-[20px]">
              <h2 className="text-[16px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[16px]">Kliendi andmed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                <div>
                  <label htmlFor="first_name" className="block text-[12px] font-[500] font-[family-name:var(--font-poppins)] text-[#555555] mb-[6px]">
                    Eesnimi *
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    required
                    value={form.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    className="w-full border border-[#E8E8E8] px-[12px] py-[9px] text-[13px] font-[family-name:var(--font-inter)] text-[#333333] focus:outline-none focus:border-[#E8650A] transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-[12px] font-[500] font-[family-name:var(--font-poppins)] text-[#555555] mb-[6px]">
                    Perekonnanimi *
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    required
                    value={form.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    className="w-full border border-[#E8E8E8] px-[12px] py-[9px] text-[13px] font-[family-name:var(--font-inter)] text-[#333333] focus:outline-none focus:border-[#E8650A] transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-[12px] font-[500] font-[family-name:var(--font-poppins)] text-[#555555] mb-[6px]">
                    E-post *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full border border-[#E8E8E8] px-[12px] py-[9px] text-[13px] font-[family-name:var(--font-inter)] text-[#333333] focus:outline-none focus:border-[#E8650A] transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-[12px] font-[500] font-[family-name:var(--font-poppins)] text-[#555555] mb-[6px]">
                    Telefon *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full border border-[#E8E8E8] px-[12px] py-[9px] text-[13px] font-[family-name:var(--font-inter)] text-[#333333] focus:outline-none focus:border-[#E8650A] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white border border-[#E8E8E8] p-[20px]">
              <h2 className="text-[16px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[16px]">Tarneaadress</h2>
              <div className="flex flex-col gap-[16px]">
                <div>
                  <label htmlFor="address_1" className="block text-[12px] font-[500] font-[family-name:var(--font-poppins)] text-[#555555] mb-[6px]">
                    Aadress *
                  </label>
                  <input
                    id="address_1"
                    type="text"
                    required
                    placeholder="Tänav, maja, korter"
                    value={form.address_1}
                    onChange={(e) => updateField("address_1", e.target.value)}
                    className="w-full border border-[#E8E8E8] px-[12px] py-[9px] text-[13px] font-[family-name:var(--font-inter)] text-[#333333] focus:outline-none focus:border-[#E8650A] transition-colors"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
                  <div className="sm:col-span-2">
                    <label htmlFor="city" className="block text-[12px] font-[500] font-[family-name:var(--font-poppins)] text-[#555555] mb-[6px]">
                      Linn *
                    </label>
                    <input
                      id="city"
                      type="text"
                      required
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      className="w-full border border-[#E8E8E8] px-[12px] py-[9px] text-[13px] font-[family-name:var(--font-inter)] text-[#333333] focus:outline-none focus:border-[#E8650A] transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="postal_code" className="block text-[12px] font-[500] font-[family-name:var(--font-poppins)] text-[#555555] mb-[6px]">
                      Postiindeks *
                    </label>
                    <input
                      id="postal_code"
                      type="text"
                      required
                      value={form.postal_code}
                      onChange={(e) => updateField("postal_code", e.target.value)}
                      className="w-full border border-[#E8E8E8] px-[12px] py-[9px] text-[13px] font-[family-name:var(--font-inter)] text-[#333333] focus:outline-none focus:border-[#E8650A] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="country" className="block text-[12px] font-[500] font-[family-name:var(--font-poppins)] text-[#555555] mb-[6px]">
                    Riik
                  </label>
                  <select
                    id="country"
                    value={form.country_code}
                    onChange={(e) => updateField("country_code", e.target.value)}
                    className="w-full border border-[#E8E8E8] px-[12px] py-[9px] text-[13px] font-[family-name:var(--font-inter)] text-[#333333] bg-white focus:outline-none focus:border-[#E8650A] transition-colors"
                  >
                    <option value="ee">Eesti</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-white border border-[#E8E8E8] p-[20px]">
              <h2 className="text-[16px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[16px]">Tarneviis</h2>
              {shippingOptions.length === 0 ? (
                <p className="text-[12px] text-[#999999] font-[family-name:var(--font-inter)]">Tarneviisid laaduvad...</p>
              ) : (
                <div className="flex flex-col gap-[8px]">
                  {shippingOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between p-3 border cursor-pointer transition ${
                        selectedShipping === opt.id
                          ? "border-[#E8650A] bg-[#FFF5EE]"
                          : "border-[#E8E8E8] hover:border-[#E8650A]"
                      }`}
                    >
                      <div className="flex items-center gap-[12px]">
                        <input
                          type="radio"
                          name="shipping"
                          value={opt.id}
                          checked={selectedShipping === opt.id}
                          onChange={() => setSelectedShipping(opt.id)}
                          className="text-brand-500"
                        />
                        <span className="text-[13px] font-[500] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">{opt.name}</span>
                      </div>
                      {typeof opt.amount === "number" && (
                        <span className="text-[13px] font-[700] font-[family-name:var(--font-poppins)]">
                          {opt.amount === 0 ? "Tasuta" : formatPrice(opt.amount, cart.currency_code)}
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
            <div className="bg-white border border-[#E8E8E8] p-[20px] sticky top-[80px]">
              <h2 className="text-[16px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[16px]">Tellimuse kokkuvõte</h2>

              {/* Items */}
              <div className="flex flex-col gap-[10px] mb-[16px]">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-[12px]">
                    <div className="relative w-[56px] h-[56px] bg-[#F7F7F7] rounded-[4px] border border-[#E8E8E8] shrink-0 overflow-hidden">
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
                      <p className="text-[12px] font-[500] font-[family-name:var(--font-poppins)] text-[#1A1A1A] leading-[1.4] line-clamp-2">
                        {item.variant?.product?.title || item.title}
                      </p>
                      <p className="text-[12px] font-[family-name:var(--font-inter)] text-[#999999]">
                        {item.quantity} tk &times; {formatPrice(item.unit_price, cart.currency_code)}
                      </p>
                    </div>
                    <p className="text-[13px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A] shrink-0">
                      {formatPrice(item.total, cart.currency_code)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-[#E8E8E8] pt-[12px] flex flex-col gap-[8px]">
                <div className="flex justify-between">
                  <span className="text-[#999999] font-[family-name:var(--font-inter)]">Vahesumma</span>
                  <span>{formatPrice(cart.subtotal, cart.currency_code)}</span>
                </div>
                {cart.shipping_total > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#999999] font-[family-name:var(--font-inter)]">Tarne</span>
                    <span>{formatPrice(cart.shipping_total, cart.currency_code)}</span>
                  </div>
                )}
                {cart.tax_total > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#999999] font-[family-name:var(--font-inter)]">Käibemaks</span>
                    <span>{formatPrice(cart.tax_total, cart.currency_code)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-[#E8E8E8] mt-[16px] pt-4">
                <div className="flex items-center justify-between">
                  <span>Kokku</span>
                  <span className="text-[#E8650A]">
                    {formatPrice(cart.total, cart.currency_code)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedShipping}
                className="w-full mt-[20px] py-[14px] bg-[#E8650A] text-white text-[15px] font-[600] font-[family-name:var(--font-poppins)] hover:bg-[#CF5A08] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Vormistatakse..." : "Kinnita tellimus"}
              </button>

              <p className="text-[12px] font-[family-name:var(--font-inter)] text-[#999999] text-center mt-[10px]">
                Maksmine: pangaülekanne (arve saadetakse e-postile)
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
