"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
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

const inputClass = "w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-[13px] text-[#222222] bg-white focus:outline-none focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00]/20 transition-colors"
const labelClass = "block text-[12px] font-medium text-[#666666] mb-1.5"

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
      <div className="min-h-screen bg-[#E8ECF0]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-xl font-semibold text-[#222222] mb-6">Tellimuse vormistamine</h1>
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#E5E5E5] border-t-[#FF6A00] rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  // Empty cart
  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#E8ECF0]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-xl font-semibold text-[#222222] mb-6">Tellimuse vormistamine</h1>
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#E5E5E5] rounded-lg">
            <p className="text-[14px] text-[#666666] mb-7">Sinu ostukorv on tühi.</p>
            <Link
              href={`/${locale}`}
              className="inline-flex items-center bg-[#FF6A00] text-white px-6 py-3 text-[15px] font-semibold rounded-lg hover:bg-[#E55F00] transition-colors"
            >
              Vaata tooteid
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Order completed
  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#E8ECF0]">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#E5E5E5] rounded-lg">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <span className="text-[#16A34A] text-[28px]">&#10003;</span>
            </div>
            <h1 className="text-xl font-semibold text-[#222222] mb-4">Tellimus on vormistatud!</h1>
            <p className="text-[14px] text-[#666666] mb-2">
              Täname ostu eest. Saadame kinnituse aadressile{" "}
              <strong className="text-[#222222]">{form.email}</strong>.
            </p>
            {orderId && (
              <p className="text-[14px] text-[#666666] mb-8">
                Tellimuse number: <span className="font-medium text-[#222222]">{orderId}</span>
              </p>
            )}
            <Link
              href={`/${locale}`}
              className="inline-flex items-center bg-[#FF6A00] text-white px-6 py-3 text-[15px] font-semibold rounded-lg hover:bg-[#E55F00] transition-colors"
            >
              Tagasi avalehele
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const items = cart.items

  return (
    <div className="min-h-screen bg-[#E8ECF0]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav className="text-[12px] text-[#666666] mb-7" aria-label="Leheasukoht">
          <Link href={`/${locale}`} className="hover:text-[#FF6A00] transition-colors">Avaleht</Link>
          <span className="mx-2 text-[#E5E5E5]">/</span>
          <Link href={`/${locale}/ostukorv`} className="hover:text-[#FF6A00] transition-colors">Ostukorv</Link>
          <span className="mx-2 text-[#E5E5E5]">/</span>
          <span className="text-[#222222] font-medium">Tellimus</span>
        </nav>

        <h1 className="text-[28px] font-bold text-[#222222] mb-6">Tellimuse vormistamine</h1>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[#E53E3E] text-[13px]" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left: Customer form */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              {/* Personal info */}
              <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                <h2 className="text-base font-semibold text-[#222222] mb-4">Kliendi andmed</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className={labelClass}>
                      Eesnimi *
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
                      Perekonnanimi *
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
                      E-post *
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
                      Telefon *
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
              <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                <h2 className="text-base font-semibold text-[#222222] mb-4">Tarneaadress</h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="address_1" className={labelClass}>
                      Aadress *
                    </label>
                    <input
                      id="address_1"
                      type="text"
                      required
                      placeholder="Tänav, maja, korter"
                      value={form.address_1}
                      onChange={(e) => updateField("address_1", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="city" className={labelClass}>
                        Linn *
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
                        Postiindeks *
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
                      Riik
                    </label>
                    <select
                      id="country"
                      value={form.country_code}
                      onChange={(e) => updateField("country_code", e.target.value)}
                      className={inputClass}
                    >
                      <option value="ee">Eesti</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Shipping */}
              <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                <h2 className="text-base font-semibold text-[#222222] mb-4">Tarneviis</h2>
                {shippingOptions.length === 0 ? (
                  <p className="text-[12px] text-[#666666]">Tarneviisid laaduvad...</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {shippingOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition ${
                          selectedShipping === opt.id
                            ? "border-[#FF6A00] bg-[#FFF5EE]"
                            : "border-[#E5E5E5] hover:border-[#FF6A00]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            value={opt.id}
                            checked={selectedShipping === opt.id}
                            onChange={() => setSelectedShipping(opt.id)}
                            className="accent-[#FF6A00]"
                          />
                          <span className="text-[13px] font-medium text-[#222222]">{opt.name}</span>
                        </div>
                        {typeof opt.amount === "number" && (
                          <span className="text-[13px] font-bold text-[#222222]">
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
              <div className="bg-white border border-[#E5E5E5] rounded-lg p-5 sticky top-20">
                <h2 className="text-base font-semibold text-[#222222] mb-4">Tellimuse kokkuvõte</h2>

                {/* Items */}
                <div className="flex flex-col gap-2.5 mb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative w-14 h-14 bg-[#F7F7F7] rounded-lg border border-[#E5E5E5] shrink-0 overflow-hidden">
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
                        <p className="text-[12px] font-medium text-[#222222] leading-[1.4] line-clamp-2">
                          {item.variant?.product?.title || item.title}
                        </p>
                        <p className="text-[12px] text-[#666666]">
                          {item.quantity} tk &times; {formatPrice(item.unit_price, cart.currency_code)}
                        </p>
                      </div>
                      <p className="text-[13px] font-bold text-[#222222] shrink-0">
                        {formatPrice(item.total, cart.currency_code)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-[#E5E5E5] pt-3 flex flex-col gap-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#666666]">Vahesumma</span>
                    <span className="text-[#222222]">{formatPrice(cart.subtotal, cart.currency_code)}</span>
                  </div>
                  {cart.shipping_total > 0 && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#666666]">Tarne</span>
                      <span className="text-[#222222]">{formatPrice(cart.shipping_total, cart.currency_code)}</span>
                    </div>
                  )}
                  {cart.tax_total > 0 && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#666666]">Käibemaks</span>
                      <span className="text-[#222222]">{formatPrice(cart.tax_total, cart.currency_code)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#E5E5E5] mt-4 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-[#222222]">Kokku</span>
                    <span className="text-xl font-bold text-[#FF6A00]">
                      {formatPrice(cart.total, cart.currency_code)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedShipping}
                  className="w-full mt-5 py-3.5 bg-[#FF6A00] text-white text-[15px] font-semibold rounded-lg hover:bg-[#E55F00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ boxShadow: "0 4px 16px rgba(255,106,0,0.25)" }}
                >
                  {submitting ? "Vormistatakse..." : "Kinnita tellimus"}
                </button>

                <p className="text-[12px] text-[#666666] text-center mt-2.5">
                  Maksmine: pangaülekanne (arve saadetakse e-postile)
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
