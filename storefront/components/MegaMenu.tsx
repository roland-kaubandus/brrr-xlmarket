"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import CategoryTreeNav from "@/components/category/CategoryTreeNav"

/**
 * MegaMenu — ülariba kategooria-AKORDION-dropdown.
 *
 * Taaskasutab CategoryTreeNav-i (sama akordion mis kategooria-lehe vasak-sidebar):
 * klõps "☰ Kategooriad" → dropdown 25 mainiga → klõps mainil avab L2/L3 (akordion),
 * klõps nimel → NAVIGATSIOON (/kategooriad/[handle]) + dropdown sulgub. ISESEISEV
 * SSoT-puust — EI Meili-päring, EI hover-kaskaad. Suured mainid = kokkupandud vaikimisi
 * (akordion), ei venita paneeli → cap-strateegiat pole vaja.
 *
 * Asendas varasema hover-kaskaad-MegaMenu (677 rida) — järjekindel vasak-akordioniga.
 */
interface MegaMenuProps {
  locale?: string
  /** variant säilib ühilduvuseks (ülariba on tume) — trigger on valge/teal. */
  variant?: "dark" | "light"
}

export default function MegaMenu({ locale = "en" }: MegaMenuProps) {
  const loc = (locale === "et" ? "et" : "en") as "et" | "en"
  const pathname = usePathname() ?? ""
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Current-handle URL-ist (/…/kategooriad/<handle>) → kategooria-lehel avaneb haru esile.
  const m = pathname.match(/\/kategooriad\/([^/?#]+)/)
  const currentHandle = m ? decodeURIComponent(m[1]) : ""

  // Sulge route-muutusel (kliendipoolne navigatsioon).
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Sulge Escape + click-outside.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-2 px-3 py-1.5 font-bold text-[14px] rounded-md hover:bg-white/10 transition-colors ${
          open ? "text-[#0ea5a0]" : "text-white"
        }`}
      >
        {open ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        <span className="hidden sm:inline">{loc === "et" ? "Kategooriad" : "Categories"}</span>
      </button>

      {/* Taust-overlay */}
      {open && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />}

      {/* Akordion-dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-[340px] max-w-[calc(100vw-24px)]"
          style={{ top: "100%", left: 0 }}
        >
          <CategoryTreeNav
            currentHandle={currentHandle}
            locale={locale}
            onNavigate={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
