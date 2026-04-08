"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import Image from "next/image"

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

const PLACEHOLDER_TEXTS = [
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

export default function SearchBar({ locale = "et" }: { locale?: string }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const router = useRouter()

  // Rotate placeholder text
  useEffect(() => {
    if (query) return
    const interval = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setPlaceholderIdx(i => (i + 1) % PLACEHOLDER_TEXTS.length)
        setAnimating(false)
      }, 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [query])

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
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" }).format(cents / 100)

  const currentPlaceholder = PLACEHOLDER_TEXTS[placeholderIdx]

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-[600px]">
      <div className="flex items-center bg-white rounded-full overflow-hidden h-[40px]">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => results?.hits.length && setIsOpen(true)}
            onKeyDown={handleKey}
            placeholder=""
            className="w-full bg-transparent pl-4 pr-2 py-2 text-[14px] text-[#222] placeholder:text-[#999] focus:outline-none"
            autoComplete="off"
          />
          {!query && (
            <span
              className={`absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-[#999] pointer-events-none transition-opacity duration-300 ${
                animating ? "opacity-0" : "opacity-100"
              }`}
            >
              Search for &quot;{currentPlaceholder}&quot;
            </span>
          )}
        </div>
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults(null); setIsOpen(false); inputRef.current?.focus() }}
            className="px-2 text-[#999] hover:text-[#333]"
            aria-label="Clear"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
        <button
          type="button"
          onClick={goToResults}
          className="h-[40px] w-[48px] bg-[#FF6A00] hover:bg-[#e55f00] flex items-center justify-center rounded-r-full transition-colors"
          aria-label="Search"
        >
          <Search size={18} strokeWidth={2} className="text-white" />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && results && results.hits.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-50 overflow-hidden">
          {results.hits.map((hit, i) => (
            <button
              key={hit.id}
              onClick={() => goToProduct(hit.handle)}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                activeIdx === i ? "bg-[#FFF5EE]" : "hover:bg-[#FAFAFA]"
              }`}
            >
              {hit.thumbnail ? (
                <div className="w-10 h-10 flex-shrink-0 bg-[#F7F7F7] rounded overflow-hidden">
                  <Image src={hit.thumbnail} alt="" width={40} height={40} className="w-full h-full object-contain" unoptimized />
                </div>
              ) : (
                <div className="w-10 h-10 flex-shrink-0 bg-[#F7F7F7] rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] text-[#333] truncate [&>mark]:bg-[#FFF5EE] [&>mark]:text-[#FF6A00] [&>mark]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: hit._formatted?.title || hit.title }}
                />
                {hit.categories?.[0] && (
                  <p className="text-[11px] text-[#999]">{hit.categories[0]}</p>
                )}
              </div>
              <span className="text-[13px] font-semibold text-[#222] whitespace-nowrap">
                {formatPrice(hit.price)}
              </span>
            </button>
          ))}
          {results.totalHits > results.hits.length && (
            <button
              onClick={goToResults}
              className={`w-full px-4 py-3 text-center text-[13px] font-medium text-[#FF6A00] hover:bg-[#FFF5EE] border-t border-[#F0F0F0] transition-colors ${
                activeIdx === results.hits.length ? "bg-[#FFF5EE]" : ""
              }`}
            >
              View all results ({results.totalHits.toLocaleString("et-EE")}) &rarr;
            </button>
          )}
        </div>
      )}

      {loading && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-sm z-50 px-4 py-4 text-center">
          <span className="text-[13px] text-[#999]">Searching...</span>
        </div>
      )}
    </div>
  )
}
