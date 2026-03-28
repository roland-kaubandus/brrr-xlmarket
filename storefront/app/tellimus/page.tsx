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
    if (!form.email.trim() || !form.email.includes("@")) return "Kehtiv e-posti aadress on kohustuslik"
    if (!form.phone.trim()) return "Telefon on kohustuslik"
    if (!form.address_1.trim()) return "Aadress on kohustuslik"
    if (!form.city.trim()) return "Linn on kohustuslik"
    if (!form.postal_code.trim()) return "Postiindeks on kohustuslik"
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
        const err = await checkoutRes.json()
        setError(err.error || err.message || "Kliendi andmete salvestamine ebaõnnestus")
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
          const err = await shipRes.json()
          setError(err.error || err.message || "Tarneviisi valimine ebaõnnestus")
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
        const err = await completeRes.json()
        setError(err.error || err.message || "Tellimuse vormistamine ebaõnnestus")
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
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-8">Tellimuse vormistamine</h1>
        <p className="text-gray-500">Laen andmeid...</p>
      </div>
    )
  }

  // Empty cart
  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-8">Tellimuse vormistamine</h1>
        <div className="text-center py-16 border border-gray-200 bg-white">
          <p className="text-gray-500 mb-6">Sinu ostukorv on tühi.</p>
          <Link
            href="/"
            className="inline-block bg-amber-500 text-white px-8 py-3 font-medium hover:bg-amber-600 transition"
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
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center py-16 bg-white border border-gray-200">
          <div className="text-4xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold mb-4">Tellimus on vormistatud!</h1>
          <p className="text-gray-600 mb-2">
            Täname ostu eest. Saadame kinnituse aadressile{" "}
            <strong>{form.email}</strong>.
          </p>
          {orderId && (
            <p className="text-sm text-gray-500 mb-8">
              Tellimuse number: {orderId}
            </p>
          )}
          <Link
            href="/"
            className="inline-block bg-amber-500 text-white px-8 py-3 font-medium hover:bg-amber-600 transition"
          >
            Tagasi avalehele
          </Link>
        </div>
      </div>
    )
  }

  const items = cart.items

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-amber-600">Avaleht</Link>
        <span className="mx-2">/</span>
        <Link href="/ostukorv" className="hover:text-amber-600">Ostukorv</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Tellimus</span>
      </nav>

      <h1 className="text-2xl font-bold mb-8">Tellimuse vormistamine</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Customer form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal info */}
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4">Kliendi andmed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Eesnimi *
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    required
                    value={form.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Perekonnanimi *
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    required
                    value={form.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-post *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4">Tarneaadress</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="address_1" className="block text-sm font-medium text-gray-700 mb-1">
                    Aadress *
                  </label>
                  <input
                    id="address_1"
                    type="text"
                    required
                    placeholder="Tänav, maja, korter"
                    value={form.address_1}
                    onChange={(e) => updateField("address_1", e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      Linn *
                    </label>
                    <input
                      id="city"
                      type="text"
                      required
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                      Postiindeks *
                    </label>
                    <input
                      id="postal_code"
                      type="text"
                      required
                      value={form.postal_code}
                      onChange={(e) => updateField("postal_code", e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    Riik
                  </label>
                  <select
                    id="country"
                    value={form.country_code}
                    onChange={(e) => updateField("country_code", e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500 bg-white"
                  >
                    <option value="ee">Eesti</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4">Tarneviis</h2>
              {shippingOptions.length === 0 ? (
                <p className="text-sm text-gray-500">Tarneviisid laaduvad...</p>
              ) : (
                <div className="space-y-2">
                  {shippingOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between p-3 border cursor-pointer transition ${
                        selectedShipping === opt.id
                          ? "border-amber-500 bg-amber-50"
                          : "border-gray-200 hover:border-amber-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          value={opt.id}
                          checked={selectedShipping === opt.id}
                          onChange={() => setSelectedShipping(opt.id)}
                          className="text-amber-500"
                        />
                        <span className="text-sm font-medium">{opt.name}</span>
                      </div>
                      {typeof opt.amount === "number" && (
                        <span className="text-sm font-bold">
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
            <div className="bg-white border border-gray-200 p-6 sticky top-20">
              <h2 className="text-lg font-bold mb-4">Tellimuse kokkuvõte</h2>

              {/* Items */}
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative w-14 h-14 bg-gray-50 shrink-0">
                      {item.variant?.product?.thumbnail ? (
                        <Image
                          src={item.variant.product.thumbnail}
                          alt={item.variant?.product?.title || item.title}
                          fill
                          className="object-contain p-1"
                          sizes="56px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                          -
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-900 line-clamp-2">
                        {item.variant?.product?.title || item.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} tk &times; {formatPrice(item.unit_price, cart.currency_code)}
                      </p>
                    </div>
                    <p className="text-xs font-bold shrink-0">
                      {formatPrice(item.total, cart.currency_code)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Vahesumma</span>
                  <span>{formatPrice(cart.subtotal, cart.currency_code)}</span>
                </div>
                {cart.shipping_total > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tarne</span>
                    <span>{formatPrice(cart.shipping_total, cart.currency_code)}</span>
                  </div>
                )}
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
                  <span className="text-amber-600">
                    {formatPrice(cart.total, cart.currency_code)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedShipping}
                className="w-full mt-6 bg-amber-500 text-white py-3 font-medium hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {submitting ? "Vormistatakse..." : "Kinnita tellimus"}
              </button>

              <p className="text-xs text-gray-400 text-center mt-2">
                Maksmine: pangaülekanne (arve saadetakse e-postile)
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
