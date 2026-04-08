"use client"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

export default function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-[#E2E8F0] pt-6">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between mb-4 group">
        <h2 className="text-xl font-bold text-[#1E293B]">{title}</h2>
        <ChevronDown size={20} className={`text-[#64748B] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && children}
    </div>
  )
}
