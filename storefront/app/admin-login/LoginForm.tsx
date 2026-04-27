"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      const res = await fetch("/api/admin-session/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || "Sisselogimine ebaõnnestus")
      }
      // server already validated `next`, but guard again at client boundary
      const safeNext = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/et"
      router.push(safeNext)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sisselogimine ebaõnnestus")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="admin-email" className="block text-sm font-medium text-[#1E293B] mb-1.5">
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706]/30 focus:border-[#D97706]"
        />
      </div>
      <div>
        <label htmlFor="admin-pass" className="block text-sm font-medium text-[#1E293B] mb-1.5">
          Parool
        </label>
        <input
          id="admin-pass"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706]/30 focus:border-[#D97706]"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 bg-[#D97706] hover:bg-[#B45309] disabled:bg-[#D97706]/50 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        {busy ? "Sisselogimine..." : "Logi sisse"}
      </button>
    </form>
  )
}
