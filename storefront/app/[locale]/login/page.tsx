"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "@/components/SafeLink"
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
      if (!customer) throw new Error(locale === "et" ? "Kontot ei õnnestunud laadida" : "Could not load account")
      posthog.identify(customer.email, { email: customer.email })
      posthog.capture("user_signed_in", { email: customer.email })
      router.push(`/${locale}/account`)
    } catch (err: any) {
      setError(err.message || (locale === "et" ? "Sisselogimine ebaõnnestus" : "Sign in failed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <h1 className="text-[28px] font-bold text-[#1a1a2e] mb-2">{locale === "et" ? "Logi sisse" : "Sign In"}</h1>
        <p className="text-sm text-[#64748B] mb-8">
          {locale === "et" ? "Pole veel kontot?" : "Don't have an account yet?"}{" "}
          <Link href={`/${locale}/register`} className="text-[#0ea5a0] font-medium hover:underline">
            {locale === "et" ? "Loo konto" : "Create Account"}
          </Link>
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">
              {locale === "et" ? "E-post" : "Email"}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30 focus:border-[#0ea5a0] transition-all"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">
              {locale === "et" ? "Parool" : "Password"}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30 focus:border-[#0ea5a0] transition-all"
              placeholder={locale === "et" ? "Sinu parool" : "Your password"}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#0ea5a0] hover:bg-[#0b7d79] disabled:bg-[#0ea5a0]/50 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {loading ? (locale === "et" ? "Login sisse..." : "Signing in...") : (locale === "et" ? "Logi sisse" : "Sign In")}
          </button>
        </form>
      </div>
    </div>
  )
}
