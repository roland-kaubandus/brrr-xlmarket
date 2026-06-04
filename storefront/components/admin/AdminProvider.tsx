"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export interface AdminContextValue {
  email: string | null
  isAdmin: boolean
}

const AdminContext = createContext<AdminContextValue>({ email: null, isAdmin: false })

/**
 * PERF (2026-06-04): admin-staatust EI loeta enam server-side. Varem luges
 * root layout `readAdminSession()` (cookies()) → kogu sait dünaamiline →
 * no-store → midagi ei cache'u (k-rauta vs meie aegluse põhjus). Nüüd fetchib
 * whoami KLIENDIPOOLSELT mount'il → lehed jäävad static/ISR → cacheable.
 * Tavakülastaja (mitte-admin) ei märka; admin näeb admin-UI-d ~100ms hiljem.
 */
export function AdminProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin-session/whoami", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.ok && typeof d.email === "string") setEmail(d.email)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AdminContextValue>(
    () => ({ email, isAdmin: Boolean(email) }),
    [email]
  )
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin(): AdminContextValue {
  return useContext(AdminContext)
}
