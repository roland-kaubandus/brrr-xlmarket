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

export default function InstantSearch({ className = "", locale = "et" }: { className?: string; locale?: string }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const router = useRouter()

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
    if (!isOpen || !results) return
    const max = results.hits.length
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx(i => (i + 1) % (max + 1)) // +1 for "show all" link
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
    new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" }).format(cents)

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="flex w-full bg-[#F7F7F7] border border-transparent focus-within:border-[#E8650A] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(232,101,10,0.1)] transition-all">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => results?.hits.length && setIsOpen(true)}
          onKeyDown={handleKey}
          placeholder="Otsi tooteid..."
          className="w-full bg-transparent px-[16px] py-[10px] text-[14px] font-[family-name:var(--font-jakarta)] text-[#333333] placeholder:text-[#999999] focus:outline-none"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults(null); setIsOpen(false); inputRef.current?.focus() }}
            className="px-[8px] text-[#999999] hover:text-[#333333]"
            aria-label="Tühjenda"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
        <button
          type="button"
          onClick={goToResults}
          className="px-[16px] text-[#999999] hover:text-[#E8650A]"
          aria-label="Otsi"
        >
          <Search size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && results && results.hits.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-[4px] bg-white border border-[#E8E8E8] shadow-[0_8px_32px_rgba(0,0,0,0.08)] z-50 overflow-hidden">
          {results.hits.map((hit, i) => (
            <button
              key={hit.id}
              onClick={() => goToProduct(hit.handle)}
              className={`flex items-center gap-[12px] w-full px-[16px] py-[10px] text-left transition-colors ${
                activeIdx === i ? "bg-[#FFF5EE]" : "hover:bg-[#FAFAFA]"
              }`}
            >
              {hit.thumbnail ? (
                <div className="w-[40px] h-[40px] flex-shrink-0 bg-[#F7F7F7] overflow-hidden">
                  <Image
                    src={hit.thumbnail}
                    alt=""
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-[40px] h-[40px] flex-shrink-0 bg-[#F7F7F7]" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-[family-name:var(--font-jakarta)] text-[#333333] truncate [&>mark]:bg-[#FFF5EE] [&>mark]:text-[#E8650A] [&>mark]:font-[600]"
                  dangerouslySetInnerHTML={{ __html: hit._formatted?.title || hit.title }}
                />
                {hit.categories?.[0] && (
                  <p className="text-[11px] text-[#999999] font-[family-name:var(--font-jakarta)]">{hit.categories[0]}</p>
                )}
              </div>
              <span className="text-[13px] font-[600] font-[family-name:var(--font-jakarta)] text-[#1A1A1A] whitespace-nowrap">
                {formatPrice(hit.price)}
              </span>
            </button>
          ))}

          {results.totalHits > results.hits.length && (
            <button
              onClick={goToResults}
              className={`w-full px-[16px] py-[12px] text-center text-[13px] font-[500] font-[family-name:var(--font-poppins)] text-[#E8650A] hover:bg-[#FFF5EE] border-t border-[#F0F0F0] transition-colors ${
                activeIdx === results.hits.length ? "bg-[#FFF5EE]" : ""
              }`}
            >
              Vaata kõiki tulemusi ({results.totalHits.toLocaleString("et-EE")}) &rarr;
            </button>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {loading && query && (
        <div className="absolute top-full left-0 right-0 mt-[4px] bg-white border border-[#E8E8E8] shadow-sm z-50 px-[16px] py-[16px] text-center">
          <span className="text-[13px] text-[#999999] font-[family-name:var(--font-jakarta)]">Otsin...</span>
        </div>
      )}
    </div>
  )
}
