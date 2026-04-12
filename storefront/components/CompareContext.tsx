"use client"
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export type CompareItem = {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  price: string
  specs: Record<string, string>
}

type CompareContextType = {
  items: CompareItem[]
  add: (item: CompareItem) => void
  remove: (id: string) => void
  clear: () => void
  has: (id: string) => boolean
  count: number
}

const CompareContext = createContext<CompareContextType>({
  items: [], add: () => {}, remove: () => {},
  clear: () => {}, has: () => false, count: 0,
})

const STORAGE_KEY = "xlmarket_compare"
const MAX_COMPARE = 4

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {}
  }, [])

  const persist = useCallback((next: CompareItem[]) => {
    setItems(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }, [])

  const add = useCallback((item: CompareItem) => {
    setItems(prev => {
      if (prev.some(i => i.id === item.id)) return prev
      if (prev.length >= MAX_COMPARE) return prev
      const next = [...prev, item]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const clear = useCallback(() => persist([]), [persist])
  const has = useCallback((id: string) => items.some(i => i.id === id), [items])

  return (
    <CompareContext.Provider value={{ items, add, remove, clear, has, count: items.length }}>
      {children}
    </CompareContext.Provider>
  )
}

export function useCompare() {
  return useContext(CompareContext)
}
