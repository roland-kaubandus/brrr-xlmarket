"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, X } from "lucide-react"
import SearchBar from "@/components/SearchBar"

interface MobileSearchToggleProps {
  locale: string
}

export default function MobileSearchToggle({ locale }: MobileSearchToggleProps) {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, close])

  /* Close search when user navigates (popstate) */
  useEffect(() => {
    if (!open) return
    window.addEventListener("popstate", close)
    return () => window.removeEventListener("popstate", close)
  }, [open, close])

  return (
    <>
      {/* Toggle button — visible only on mobile (md:hidden applied by parent) */}
      <button
        type="button"
        aria-label={open ? "Close search" : "Open search"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-white/80 hover:text-[#D97706] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] transition-[color,background-color] duration-200"
        style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        {open ? <X size={20} strokeWidth={2} /> : <Search size={20} strokeWidth={2} />}
      </button>

      {/* Dropdown search overlay */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 bg-[#1E293B] px-4 py-3 shadow-[0_8px_24px_-4px_rgba(15,23,42,0.3)] search-dropdown">
          <SearchBar locale={locale} />
        </div>
      )}
    </>
  )
}
