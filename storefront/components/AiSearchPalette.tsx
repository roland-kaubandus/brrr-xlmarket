"use client"

import { useState, useEffect, useRef } from "react"

export default function AiSearchPalette({ locale = "et" }: { locale?: string }) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Listen for AI button click via data-ai-trigger attribute
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("[data-ai-trigger]")) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [])

  // Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  if (!open) return null

  const isEt = locale === "et"

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[100px] bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="w-[90%] max-w-[620px] bg-white rounded-[20px] shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden">
        {/* Search input row */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F1F5F9]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder={isEt ? "Otsi tooteid või küsi AI-lt…" : "Search products or ask AI…"}
            className="flex-1 border-none outline-none text-[16px] text-[#0F172A] bg-transparent placeholder:text-[#94A3B8]"
          />
          <span className="shrink-0 px-2.5 py-1 rounded-md text-white text-[0.65rem] font-bold uppercase tracking-wider" style={{ background: "linear-gradient(135deg, #D97706, #E8910A)" }}>
            AI
          </span>
        </div>

        {/* Quick actions */}
        <div className="px-5 py-4">
          <div className="text-[12px] text-[#94A3B8] mb-3">{isEt ? "Kiirtoimingud" : "Quick actions"}</div>
          <div className="flex flex-col gap-1">
            {[
              { icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", label: isEt ? "Tänased pakkumised" : "Today's Deals" },
              { icon: "M12 2v20M2 12h20", label: isEt ? "Uued tooted" : "New Arrivals" },
              { icon: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z", label: isEt ? "Bestsellerid" : "Best Sellers" },
            ].map(action => (
              <button
                key={action.label}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors text-left"
              >
                <span className="w-7 h-7 rounded-md bg-[#F8FAFC] flex items-center justify-center text-[#94A3B8] shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={action.icon}/>
                  </svg>
                </span>
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI chat area (static, Phase 1) */}
        <div className="px-5 py-4 border-t border-[#F1F5F9]">
          <div className="px-3.5 py-2.5 rounded-[10px_10px_10px_2px] bg-[#F8FAFC] text-[13px] text-[#475569] leading-relaxed max-w-[85%] mb-2">
            {isEt
              ? "Tere! Saan aidata õige tööriista leidmisel. Proovi: \"Millist puuri betoonile vaja?\" või \"Parim keevitusaparaat alla 200€\""
              : "Hi! I can help you find the right tool for your project. Try: \"What drill do I need for concrete?\" or \"Best welder under €200\""}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder={isEt ? "Küsi toote kohta…" : "Ask about any product…"}
              className="flex-1 px-3.5 py-2 border-[1.5px] border-[#F1F5F9] rounded-full text-[13px] outline-none focus:border-[#D97706]"
              disabled
            />
            <button
              className="px-4 py-2 rounded-full bg-[#D97706] text-white text-[12px] font-semibold shrink-0 opacity-50 cursor-not-allowed"
              disabled
            >
              {isEt ? "Saada" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
