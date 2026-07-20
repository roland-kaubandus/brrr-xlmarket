"use client"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

export default function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[#E2E8F0]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <h2 className="text-[17px] font-bold text-[#1a1a2e]">{title}</h2>
        <ChevronDown
          size={20}
          className={`text-[#94A3B8] transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="pb-6">{children}</div>}
    </div>
  )
}
