"use client"

import { useState } from "react"
import { useAdmin } from "./AdminProvider"

export default function AdminBar() {
  const { email, isAdmin } = useAdmin()
  const [busy, setBusy] = useState(false)

  if (!isAdmin) return null

  async function logout() {
    if (busy) return
    setBusy(true)
    try {
      await fetch("/api/admin-session/logout", { method: "POST" })
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="region"
      aria-label="Admin toolbar"
      className="w-full bg-[#FCD34D] border-b border-[#B45309] text-[#1E293B] text-[13px] font-semibold"
    >
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-1.5 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#B45309]" aria-hidden />
          Admin režiim — sisselogitud: <span className="font-bold">{email}</span>
        </span>
        <button
          type="button"
          onClick={logout}
          disabled={busy}
          className="text-[12px] uppercase tracking-wider px-3 py-1 rounded bg-[#1E293B] text-white hover:bg-[#0F172A] disabled:opacity-50"
        >
          {busy ? "..." : "Logi välja"}
        </button>
      </div>
    </div>
  )
}
