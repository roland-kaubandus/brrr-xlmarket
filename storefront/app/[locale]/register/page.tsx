"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "@/components/SafeLink"
import { register, createCustomerProfile, setToken } from "@/lib/auth"
import posthog from "posthog-js"

export default function RegisterPage() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split("/")[1] || "en"

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (password.length < 8) throw new Error("Parool peab olema vähemalt 8 tähemärki")

      const { token } = await register(email, password)
      setToken(token)
      await createCustomerProfile(token, { email, first_name: firstName, last_name: lastName })
      posthog.identify(email, { email, first_name: firstName, last_name: lastName })
      posthog.capture("user_registered", { email })
      router.push(`/${locale}/account`)
    } catch (err: any) {
      setError(err.message || "Registreerimine ebaõnnestus")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <h1 className="text-[28px] font-bold text-[#1E293B] mb-2">Loo konto</h1>
        <p className="text-sm text-[#64748B] mb-8">
          Sul on juba konto?{" "}
          <Link href={`/${locale}/login`} className="text-[#D97706] font-medium hover:underline">
            Logi sisse
          </Link>
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Eesnimi
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706]/30 focus:border-[#D97706] transition-all"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Perekonnanimi
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706]/30 focus:border-[#D97706] transition-all"
              />
            </div>
          </div>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706]/30 focus:border-[#D97706] transition-all"
              placeholder="Vähemalt 8 tähemärki"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#D97706] hover:bg-[#B45309] disabled:bg-[#D97706]/50 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {loading ? "Konto loomine..." : "Loo konto"}
          </button>

          <p className="text-xs text-[#94A3B8] text-center">
            Konto loomisega nõustud meie{" "}
            <Link href={`/${locale}/tingimused`} className="underline">tingimuste</Link> ja{" "}
            <Link href={`/${locale}/privaatsus`} className="underline">privaatsuspoliitikaga</Link>.
          </p>
        </form>
      </div>
    </div>
  )
}
