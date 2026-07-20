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
        <label htmlFor="admin-email" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30 focus:border-[#0ea5a0]"
        />
      </div>
      <div>
        <label htmlFor="admin-pass" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">
          Parool
        </label>
        <input
          id="admin-pass"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30 focus:border-[#0ea5a0]"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 bg-[#0ea5a0] hover:bg-[#0b7d79] disabled:bg-[#0ea5a0]/50 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        {busy ? "Sisselogimine..." : "Logi sisse"}
      </button>
    </form>
  )
}
