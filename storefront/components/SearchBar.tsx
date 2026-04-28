"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Sparkles } from "lucide-react"
import Image from "next/image"
import SearchBarChat from "./SearchBarChat"

/**
 * Escape HTML special chars in the raw highlighted title from Meili, then
 * re-allow ONLY <mark> tags (Meili's own highlight wrapper). This prevents
 * XSS if a product title ever contains `<script>` or `<img onerror=...>`
 * (audit 2026-04-20 H7).
 */
function safeHighlightedTitle(formatted?: string, fallback = ""): string {
  const raw = formatted || fallback
  // 1. Escape all HTML specials.
  const escaped = String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
  // 2. Re-allow just <mark> and </mark> (Meili's highlight tags).
  return escaped.replace(/&lt;mark&gt;/g, "<mark>").replace(/&lt;\/mark&gt;/g, "</mark>")
}

type SearchHit = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  price: number
  categories: string[]
  _formatted?: { title?: string }
}

type SearchResult = {
  hits: SearchHit[]
  totalHits: number
  query: string
  processingTimeMs: number
}

const PLACEHOLDER_TEXTS_EN = [
  "welding helmet",
  "lathe",
  "kitchen sink",
  "gym equipment",
  "boat cover",
  "pressure washer",
  "workbench",
  "ice maker",
  "pool pump",
  "stair railing",
  "drill press",
  "garden hose",
]

const PLACEHOLDER_TEXTS_ET = [
  "keevitusmask",
  "treipink",
  "köögivalamu",
  "spordivarustus",
  "paadikate",
  "survepesur",
  "töölaud",
  "jäämasin",
  "basseinipump",
  "trepikäsipuu",
  "puurpink",
  "aiavoolik",
]

const AI_HINT_TEXTS_EN = [
  "Ask Claudia: 'I'm setting up a small bakery — what tools do I need?'",
  "Ask Claudia: 'Compare the 750W and 1100W magnetic drill presses'",
  "Ask Claudia: 'What's the best welder for stainless steel under 500€?'",
  "Ask Claudia: 'I run a food truck — recommend a fryer + waffle maker combo'",
  "Ask Claudia: 'Which workshop air compressor for a small auto-repair garage?'",
]

const AI_HINT_TEXTS_ET = [
  "Küsi Claudialt: 'Avan väikese pagariäri — milliseid seadmeid mul vaja on?'",
  "Küsi Claudialt: 'Võrdle 750W ja 1100W magnetpuurpinki'",
  "Küsi Claudialt: 'Millise keevituse aparaadiga saab roostevaba 500€ piires?'",
  "Küsi Claudialt: 'Mul on toidukauplus tänaval — soovita fritüür + vahvliküpsetaja'",
  "Küsi Claudialt: 'Milline kompressor sobib väiksele autoremondi töökojale?'",
]

export default function SearchBar({ locale = "en", variant = "dark" }: { locale?: string; variant?: "light" | "dark" }) {
  const PLACEHOLDER_TEXTS = locale === "et" ? PLACEHOLDER_TEXTS_ET : PLACEHOLDER_TEXTS_EN
  const AI_HINT_TEXTS = locale === "et" ? AI_HINT_TEXTS_ET : AI_HINT_TEXTS_EN
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInitialQuery, setChatInitialQuery] = useState("")
  const [activeIdx, setActiveIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const router = useRouter()

  // Variant-based styling
  const wrapperCls = variant === "light"
    ? "flex items-center bg-[#F8FAFC] border-[1.5px] border-[#E2E8F0] rounded-lg overflow-hidden h-[36px] transition-colors focus-within:bg-white focus-within:border-[#D97706] focus-within:shadow-[0_0_0_3px_rgba(217,119,6,0.10)]"
    : "flex items-center bg-white/10 border border-white/20 rounded-full overflow-hidden h-[44px] md:h-[40px] transition-colors focus-within:bg-white/[0.18] focus-within:border-[#D97706]"
  const inputCls = variant === "light"
    ? "w-full bg-transparent pl-4 pr-2 py-2.5 md:py-2 text-[15px] md:text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
    : "w-full bg-transparent pl-4 pr-2 py-2.5 md:py-2 text-[15px] md:text-[14px] text-white placeholder:text-white/50 focus:outline-none"
  const placeholderCls = variant === "light" ? "text-[#94A3B8]" : "text-white/50"
  const clearBtnCls = variant === "light" ? "px-3 text-[#94A3B8] hover:text-[#0F172A]" : "px-3 text-white/50 hover:text-white"
  const searchBtnCls = variant === "light"
    ? "h-[36px] w-[52px] bg-transparent hover:bg-[#E2E8F0] flex items-center justify-center rounded-r-lg transition-colors"
    : "h-[44px] md:h-[40px] w-[52px] bg-[#D97706] hover:bg-[#B45309] flex items-center justify-center rounded-r-full transition-colors"
  const searchIconCls = variant === "light" ? "text-[#94A3B8]" : "text-white"
  const chatBtnCls = variant === "light"
    ? "h-[36px] w-[44px] bg-transparent hover:bg-[#FEF3C7] flex items-center justify-center transition-colors border-l border-[#E2E8F0]"
    : "h-[44px] md:h-[40px] w-[44px] bg-white/5 hover:bg-white/15 flex items-center justify-center transition-colors border-l border-white/15"
  const chatIconCls = variant === "light" ? "text-[#D97706]" : "text-[#FCD34D]"

  // Rotate placeholder text. Every 3rd rotation we show a long AI prompt hint
  // instead of a single keyword, so the user discovers Claudia naturally.
  useEffect(() => {
    if (query) return
    const interval = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setPlaceholderIdx(i => (i + 1) % (PLACEHOLDER_TEXTS.length + AI_HINT_TEXTS.length))
        setAnimating(false)
      }, 300)
    }, 3500)
    return () => clearInterval(interval)
  }, [query, PLACEHOLDER_TEXTS.length, AI_HINT_TEXTS.length])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); setIsOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/ai-search?q=${encodeURIComponent(q)}&limit=6`)
      const data: SearchResult = await res.json()
      setResults(data)
      setIsOpen(data.hits.length > 0)
      setActiveIdx(-1)
    } catch { setResults(null) }
    setLoading(false)
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    clearTimeout(timerRef.current)
    if (!value.trim()) { setResults(null); setIsOpen(false); return }
    timerRef.current = setTimeout(() => doSearch(value), 300)
  }

  const goToProduct = (handle: string) => {
    setIsOpen(false)
    setQuery("")
    router.push(`/${locale}/toode/${handle}`)
  }

  const goToResults = () => {
    if (!query.trim()) return
    setIsOpen(false)
    router.push(`/${locale}/otsing?q=${encodeURIComponent(query.trim())}`)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isOpen) {
      e.preventDefault()
      goToResults()
      return
    }
    if (!isOpen || !results) return
    const max = results.hits.length
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx(i => (i + 1) % (max + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx(i => (i - 1 + max + 1) % (max + 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < max) {
        goToProduct(results.hits[activeIdx].handle)
      } else {
        goToResults()
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setChatOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const openChat = () => {
    setChatInitialQuery(query.trim())
    setIsOpen(false)
    setChatOpen(true)
  }

  // Cleanup debounce timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(price)

  // Interleave: short keyword (3 in a row), then one long AI prompt hint, repeat.
  // Result rotation: kw, kw, kw, AI, kw, kw, kw, AI, ...
  const isAiHint = placeholderIdx % 4 === 3
  const aiHintIdx = Math.floor(placeholderIdx / 4) % AI_HINT_TEXTS.length
  const kwIdx = (placeholderIdx - Math.floor(placeholderIdx / 4)) % PLACEHOLDER_TEXTS.length
  const currentPlaceholder = isAiHint ? AI_HINT_TEXTS[aiHintIdx] : PLACEHOLDER_TEXTS[kwIdx]

  return (
    <div ref={wrapperRef} className="relative w-full md:max-w-[600px]">
      <div className={wrapperCls}>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => results?.hits.length && setIsOpen(true)}
            onKeyDown={handleKey}
            placeholder=""
            className={inputCls}
            autoComplete="off"
          />
          {!query && (
            <span
              className={`absolute left-4 right-2 top-1/2 -translate-y-1/2 text-[14px] md:text-[14px] ${placeholderCls} pointer-events-none transition-opacity duration-300 truncate ${
                animating ? "opacity-0" : "opacity-100"
              }`}
            >
              {isAiHint ? (
                <span className="hidden sm:inline italic">{currentPlaceholder}</span>
              ) : (
                <span className="hidden sm:inline">{locale === "et" ? "Otsi" : "Search for"} &quot;{currentPlaceholder}&quot;</span>
              )}
              <span className="sm:hidden">{locale === "et" ? "Otsi..." : "Search..."}</span>
            </span>
          )}
        </div>
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults(null); setIsOpen(false); inputRef.current?.focus() }}
            className={clearBtnCls}
            aria-label={locale === "et" ? "Tühjenda" : "Clear"}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        )}
        <button
          type="button"
          onClick={openChat}
          className={chatBtnCls}
          aria-label={locale === "et" ? "Küsi Claudialt" : "Ask Claudia"}
          title={locale === "et" ? "Küsi Claudialt" : "Ask Claudia"}
        >
          <Sparkles size={18} strokeWidth={1.8} className={chatIconCls} />
        </button>
        <button
          type="button"
          onClick={goToResults}
          className={searchBtnCls}
          aria-label={locale === "et" ? "Otsi" : "Search"}
        >
          <Search size={20} strokeWidth={2} className={searchIconCls} />
        </button>
      </div>

      {chatOpen && (
        <SearchBarChat
          locale={locale}
          initialQuery={chatInitialQuery}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Dropdown */}
      {isOpen && results && results.hits.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-50 overflow-hidden">
          {results.hits.map((hit, i) => (
            <button
              key={hit.id}
              onClick={() => goToProduct(hit.handle)}
              className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                activeIdx === i ? "bg-[#FFFBEB]" : "hover:bg-[#FAFAFA]"
              }`}
            >
              {hit.thumbnail ? (
                <div className="w-12 h-12 flex-shrink-0 bg-[#F7F7F7] rounded overflow-hidden">
                  <Image src={hit.thumbnail} alt="" width={48} height={48} className="w-full h-full object-contain" unoptimized />
                </div>
              ) : (
                <div className="w-12 h-12 flex-shrink-0 bg-[#F7F7F7] rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[14px] text-[#1E293B] truncate [&>mark]:bg-[#FFFBEB] [&>mark]:text-[#D97706] [&>mark]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: safeHighlightedTitle(hit._formatted?.title, hit.title) }}
                />
                {hit.categories?.[0] && (
                  <p className="text-[12px] text-[#64748B] mt-0.5">{hit.categories[0]}</p>
                )}
              </div>
              <span className="text-[14px] font-semibold text-[#1E293B] whitespace-nowrap">
                {formatPrice(hit.price)}
              </span>
            </button>
          ))}
          {results.totalHits > results.hits.length && (
            <button
              onClick={goToResults}
              className={`w-full px-4 py-3.5 text-center text-[14px] font-medium text-[#D97706] hover:bg-[#FFFBEB] border-t border-[#E2E8F0] transition-colors ${
                activeIdx === results.hits.length ? "bg-[#FFFBEB]" : ""
              }`}
            >
              View all results ({results.totalHits.toLocaleString("en-IE")}) &rarr;
            </button>
          )}
        </div>
      )}

      {loading && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-sm z-50 px-4 py-4 text-center">
          <span className="text-[14px] text-[#64748B]">Searching...</span>
        </div>
      )}
    </div>
  )
}
