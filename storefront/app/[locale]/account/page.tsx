"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { getToken, clearToken, getCustomer, getOrders, type Customer } from "@/lib/auth"
import { formatPrice } from "@/lib/medusa"
import posthog from "posthog-js"

export default function AccountPage() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split("/")[1] || "en"

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace(`/${locale}/login`)
      return
    }

    Promise.all([getCustomer(token), getOrders(token)])
      .then(([c, o]) => {
        if (!c) {
          clearToken()
          router.replace(`/${locale}/login`)
          return
        }
        setCustomer(c)
        setOrders(o)
      })
      .finally(() => setLoading(false))
  }, [locale, router])

  function handleLogout() {
    posthog.capture("user_signed_out")
    posthog.reset()
    clearToken()
    router.push(`/${locale}`)
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-sm text-[#64748B]">Loading...</p>
      </div>
    )
  }

  if (!customer) return null

  return (
    <div className="max-w-[900px] mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-[#1E293B]">My Account</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Welcome back, {customer.first_name || customer.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-[#64748B] hover:text-[#DC2626] transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Profile card */}
      <div className="border border-[#E2E8F0] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[#94A3B8] text-xs mb-0.5">Name</p>
            <p className="text-[#1E293B] font-medium">
              {customer.first_name} {customer.last_name}
            </p>
          </div>
          <div>
            <p className="text-[#94A3B8] text-xs mb-0.5">Email</p>
            <p className="text-[#1E293B] font-medium">{customer.email}</p>
          </div>
          {customer.phone && (
            <div>
              <p className="text-[#94A3B8] text-xs mb-0.5">Phone</p>
              <p className="text-[#1E293B] font-medium">{customer.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Addresses */}
      <div className="border border-[#E2E8F0] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Addresses</h2>
        {customer.addresses.length > 0 ? (
          <div className="grid gap-3">
            {customer.addresses.map((addr) => (
              <div key={addr.id} className="p-4 bg-[#F8FAFC] rounded-lg text-sm">
                <p className="font-medium text-[#1E293B]">{addr.first_name} {addr.last_name}</p>
                <p className="text-[#64748B]">{addr.address_1}</p>
                {addr.address_2 && <p className="text-[#64748B]">{addr.address_2}</p>}
                <p className="text-[#64748B]">{addr.postal_code} {addr.city}, {addr.country_code?.toUpperCase()}</p>
                {addr.is_default_shipping && (
                  <span className="inline-block mt-2 text-xs text-[#D97706] font-medium">Default shipping</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8]">No saved addresses yet.</p>
        )}
      </div>

      {/* Orders */}
      <div className="border border-[#E2E8F0] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Order History</h2>
        {orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                <div>
                  <p className="font-medium text-sm text-[#1E293B]">
                    Order #{order.display_id}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {new Date(order.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-[#1E293B]">
                    {formatPrice(order.total, order.currency_code)}
                  </p>
                  <p className="text-xs text-[#64748B] capitalize">{order.fulfillment_status || "pending"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-[#94A3B8] mb-3">No orders yet.</p>
            <Link
              href={`/${locale}`}
              className="text-sm text-[#D97706] font-medium hover:underline"
            >
              Start shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
