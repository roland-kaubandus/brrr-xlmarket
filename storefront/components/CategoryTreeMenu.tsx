"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { ListTree } from "lucide-react"
import CategoryTreeNav from "@/components/category/CategoryTreeNav"

/**
 * CategoryTreeMenu — "Kategooriapuu" tekst-link, mis avab AKORDION-dropdowni
 * (CategoryTreeNav — sama akordion mis kategooria-lehe vasak-sidebar).
 *
 * ERALDI vanast "☰ Kategooriad" hover-mega-menüüst (see jääb). Klõps → dropdown
 * 25 mainiga, klõps mainil avab L2/L3 (akordion), klõps nimel → navigatsioon +
 * dropdown sulgub. ISESEISEV SSoT-puust (EI Meili). Kasutatakse ülaribal (placement
 * "down") + footeris (placement "up").
 */
interface Props {
  locale?: string
  /** "down" = avaneb alla (ülariba); "up" = avaneb üles (footer). */
  placement?: "down" | "up"
  /** Trigger-nupu stiil (ülariba vs footer eri toon). */
  triggerClassName?: string
}

const DEFAULT_TRIGGER =
  "flex items-center gap-1.5 px-4 py-1.5 text-[0.95rem] font-semibold rounded-md transition-colors whitespace-nowrap text-white hover:text-[#0ea5a0] hover:bg-white/[0.08]"

export default function CategoryTreeMenu({ locale = "en", placement = "down", triggerClassName }: Props) {
  const loc = (locale === "et" ? "et" : "en") as "et" | "en"
  const pathname = usePathname() ?? ""
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const m = pathname.match(/\/kategooriad\/([^/?#]+)/)
  const currentHandle = m ? decodeURIComponent(m[1]) : ""

  useEffect(() => {
    setOpen(false)
  }, [pathname])

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
        className={`${triggerClassName || DEFAULT_TRIGGER} ${open ? "text-[#0ea5a0]" : ""}`}
      >
        <ListTree size={16} strokeWidth={2} className="shrink-0" />
        <span>{loc === "et" ? "Kategooriapuu" : "Category Tree"}</span>
      </button>

      {open && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />}

      {open && (
        <div
          className="absolute z-50 w-[340px] max-w-[calc(100vw-24px)]"
          style={
            placement === "up"
              ? { bottom: "100%", left: 0, marginBottom: 8 }
              : { top: "100%", left: 0, marginTop: 4 }
          }
        >
          <CategoryTreeNav currentHandle={currentHandle} locale={locale} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
