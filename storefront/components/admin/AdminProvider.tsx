"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"

export interface AdminContextValue {
  email: string | null
  isAdmin: boolean
}

const AdminContext = createContext<AdminContextValue>({ email: null, isAdmin: false })

interface AdminProviderProps {
  email: string | null
  children: ReactNode
}

export function AdminProvider({ email, children }: AdminProviderProps) {
  const value = useMemo<AdminContextValue>(
    () => ({ email: email ?? null, isAdmin: Boolean(email) }),
    [email]
  )
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin(): AdminContextValue {
  return useContext(AdminContext)
}
