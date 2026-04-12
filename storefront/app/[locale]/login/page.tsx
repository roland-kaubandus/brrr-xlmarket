"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { login, setToken, getCustomer } from "@/lib/auth"
import posthog from "posthog-js"

export default function LoginPage() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split("/")[1] || "en"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { token } = await login(email, password)
      setToken(token)
      // Verify token works
      const customer = await getCustomer(token)
      if (!customer) throw new Error("Could not load account")
      posthog.identify(customer.email, { email: customer.email })
      posthog.capture("user_signed_in", { email: customer.email })
      router.push(`/${locale}/account`)
    } catch (err: any) {
      setError(err.message || "Sisselogimine ebaõnnestus")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <h1 className="text-[28px] font-bold text-[#1E293B] mb-2">Logi sisse</h1>
        <p className="text-sm text-[#64748B] mb-8">
          Pole veel kontot?{" "}
          <Link href={`/${locale}/register`} className="text-[#D97706] font-medium hover:underline">
            Loo konto
          </Link>
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1E293B] mb-1.5">
              E-post
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706]/30 focus:border-[#D97706] transition-all"
              placeholder="sinu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Parool
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706]/30 focus:border-[#D97706] transition-all"
              placeholder="Sinu parool"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#D97706] hover:bg-[#B45309] disabled:bg-[#D97706]/50 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {loading ? "Sisselogimine..." : "Logi sisse"}
          </button>
        </form>
      </div>
    </div>
  )
}
