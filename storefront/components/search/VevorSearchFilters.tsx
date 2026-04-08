"use client"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useState, useRef, useEffect, useCallback } from "react"

type Props = {
  totalHits: number
  query: string
  currentSort: string
  currentMin?: string
  currentMax?: string
  currentCategories?: string[]
  currentInStock?: boolean
  categoryFacets?: Record<string, number>
  locale: string
}

const SORT_OPTIONS = [
  { value: "", label: "Parim vaste" },
  { value: "price_asc", label: "Hind: odavamast" },
  { value: "price_desc", label: "Hind: kallimast" },
  { value: "newest", label: "Uusimad" },
]

function Dropdown({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, onClose])
  if (!open) return null
  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 bg-white border border-[#E5E5E5] rounded-lg shadow-lg z-50 min-w-[240px] p-3">
      {children}
    </div>
  )
}

export default function VevorSearchFilters({
  totalHits, query, currentSort, currentMin, currentMax,
  currentCategories = [], currentInStock, categoryFacets = {}, locale,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [minPrice, setMinPrice] = useState(currentMin || "")
  const [maxPrice, setMaxPrice] = useState(currentMax || "")
  const [selectedCats, setSelectedCats] = useState<string[]>(currentCategories)

  const buildUrl = useCallback((overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    const sort = overrides.sort !== undefined ? overrides.sort : currentSort
    if (sort) params.set("sort", sort)
    const min = overrides.min !== undefined ? overrides.min : currentMin
    if (min) params.set("min", min)
    const max = overrides.max !== undefined ? overrides.max : currentMax
    if (max) params.set("max", max)
    const cats = overrides.categories !== undefined ? overrides.categories : (currentCategories.length > 0 ? currentCategories.join(",") : "")
    if (cats) params.set("categories", cats)
    const inStock = overrides.in_stock !== undefined ? overrides.in_stock : (currentInStock ? "1" : "")
    if (inStock) params.set("in_stock", inStock)
    // Always reset to page 1 on filter change
    const qs = params.toString()
    return `/${locale}/otsing${qs ? `?${qs}` : ""}`
  }, [query, currentSort, currentMin, currentMax, currentCategories, currentInStock, locale])

  const hasFilters = currentMin || currentMax || currentCategories.length > 0 || currentInStock

  const toggle = (key: string) => setOpenDropdown(prev => prev === key ? null : key)

  const sortedCategories = Object.entries(categoryFacets).sort((a, b) => b[1] - a[1])

  const pillBase = "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer select-none whitespace-nowrap"
  const pillInactive = "bg-[#F5F5F5] border-[#E5E5E5] text-[#333] hover:border-[#FF6A00]"
  const pillActive = "bg-[#FFF3E6] border-[#FF6A00] text-[#FF6A00]"

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {/* Categories pill */}
      {sortedCategories.length > 0 && (
        <div className="relative">
          <button
            onClick={() => toggle("categories")}
            className={`${pillBase} ${currentCategories.length > 0 ? pillActive : pillInactive}`}
          >
            Kategooriad{currentCategories.length > 0 && ` (${currentCategories.length})`}
            <ChevronDown />
          </button>
          <Dropdown open={openDropdown === "categories"} onClose={() => setOpenDropdown(null)}>
            <div className="max-h-[280px] overflow-y-auto space-y-1">
              {sortedCategories.slice(0, 30).map(([cat, count]) => (
                <label key={cat} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-[#F5F5F5] cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(cat)}
                    onChange={() => {
                      const next = selectedCats.includes(cat)
                        ? selectedCats.filter(c => c !== cat)
                        : [...selectedCats, cat]
                      setSelectedCats(next)
                    }}
                    className="accent-[#FF6A00] w-4 h-4"
                  />
                  <span className="truncate flex-1">{cat}</span>
                  <span className="text-xs text-[#999] ml-1">({count})</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => {
                router.push(buildUrl({ categories: selectedCats.join(",") || undefined }))
                setOpenDropdown(null)
              }}
              className="mt-2 w-full py-1.5 bg-[#FF6A00] text-white text-sm rounded-lg hover:bg-[#E55E00] transition-colors"
            >
              Rakenda
            </button>
          </Dropdown>
        </div>
      )}

      {/* Price pill */}
      <div className="relative">
        <button
          onClick={() => toggle("price")}
          className={`${pillBase} ${currentMin || currentMax ? pillActive : pillInactive}`}
        >
          Hind{(currentMin || currentMax) && `: ${currentMin || "0"}–${currentMax || "..."}`}
          <ChevronDown />
        </button>
        <Dropdown open={openDropdown === "price"} onClose={() => setOpenDropdown(null)}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="w-24 px-3 py-1.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:border-[#FF6A00]"
            />
            <span className="text-[#999]">–</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="w-24 px-3 py-1.5 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:border-[#FF6A00]"
            />
          </div>
          <button
            onClick={() => {
              router.push(buildUrl({ min: minPrice || undefined, max: maxPrice || undefined }))
              setOpenDropdown(null)
            }}
            className="mt-2 w-full py-1.5 bg-[#FF6A00] text-white text-sm rounded-lg hover:bg-[#E55E00] transition-colors"
          >
            Rakenda
          </button>
        </Dropdown>
      </div>

      {/* In Stock toggle */}
      <button
        onClick={() => router.push(buildUrl({ in_stock: currentInStock ? "" : "1" }))}
        className={`${pillBase} ${currentInStock ? pillActive : pillInactive}`}
      >
        Laos
        {currentInStock && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        )}
      </button>

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={() => {
            setSelectedCats([])
            setMinPrice("")
            setMaxPrice("")
            router.push(buildUrl({ min: undefined, max: undefined, categories: undefined, in_stock: undefined }))
          }}
          className="text-sm text-[#FF6A00] hover:underline ml-1"
        >
          Tuhista filtrid
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sort dropdown */}
      <div className="relative">
        <button
          onClick={() => toggle("sort")}
          className={`${pillBase} ${pillInactive}`}
        >
          {SORT_OPTIONS.find(o => o.value === currentSort)?.label || "Parim vaste"}
          <ChevronDown />
        </button>
        <Dropdown open={openDropdown === "sort"} onClose={() => setOpenDropdown(null)}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                router.push(buildUrl({ sort: opt.value || undefined }))
                setOpenDropdown(null)
              }}
              className={`block w-full text-left px-3 py-1.5 text-sm rounded hover:bg-[#F5F5F5] ${currentSort === opt.value ? "text-[#FF6A00] font-semibold" : "text-[#333]"}`}
            >
              {opt.label}
            </button>
          ))}
        </Dropdown>
      </div>
    </div>
  )
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
