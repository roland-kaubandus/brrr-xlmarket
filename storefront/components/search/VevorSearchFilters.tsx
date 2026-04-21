"use client"
import { useRouter } from "next/navigation"
import { useState, useRef, useEffect, useCallback } from "react"
import type { QuickFilter } from "@/lib/quick-filters"
import type { FilterGroup } from "@/lib/filter-groups"
import { parseActiveFilters, serializeActiveFilters } from "@/lib/filter-groups"

type Props = {
  totalHits: number
  query: string
  currentSort: string
  currentMin?: string
  currentMax?: string
  currentCategories?: string[]
  currentInStock?: boolean
  categoryFacets?: Record<string, number>
  /** Optional handle → display label map. Falls back to handle when missing. */
  categoryLabels?: Record<string, string>
  quickFilters?: QuickFilter[]
  /** Adaptive filter groups built from filter_tokens facets. See lib/filter-groups.ts. */
  filterGroups?: FilterGroup[]
  currentQuickFilter?: string
  locale: string
  basePath?: string
  /**
   * When true, the subcategory facet section is hidden — used by the category
   * page to avoid duplicating the `SubcategoryCarousel` content in the sidebar
   * (spec §3.5.5, Faas 5c).
   */
  suppressSubcategoryFacet?: boolean
}

const INITIAL_VISIBLE_CATS = 10

export default function VevorSearchFilters({
  totalHits, query, currentSort, currentMin, currentMax,
  currentCategories = [], currentInStock, categoryFacets = {}, categoryLabels = {},
  locale, quickFilters = [], filterGroups = [], currentQuickFilter = "",
  basePath, suppressSubcategoryFacet = false,
}: Props) {
  const router = useRouter()

  const [minPrice, setMinPrice] = useState(currentMin || "")
  const [maxPrice, setMaxPrice] = useState(currentMax || "")
  const [selectedCats, setSelectedCats] = useState<string[]>(currentCategories)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [catsExpanded, setCatsExpanded] = useState(false)
  const [quickExpanded, setQuickExpanded] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Re-sync selectedCats when URL changes (browser back/forward)
  useEffect(() => {
    setSelectedCats(currentCategories || [])
  }, [currentCategories?.join(',')])

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [sheetOpen])

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
    const filters = overrides.filters !== undefined ? overrides.filters : currentQuickFilter
    if (filters) params.set("filters", filters)
    // Always reset to page 1 on filter change
    const qs = params.toString()
    const base = basePath || `/${locale}/otsing`
    return `${base}${qs ? `?${qs}` : ""}`
  }, [query, currentSort, currentMin, currentMax, currentCategories, currentInStock, currentQuickFilter, locale, basePath])

  const hasFilters = currentMin || currentMax || currentCategories.length > 0 || currentInStock || currentQuickFilter

  const sortedCategories = Object.entries(categoryFacets).sort((a, b) => b[1] - a[1])

  function handleClearAll() {
    setSelectedCats([])
    setMinPrice("")
    setMaxPrice("")
    router.push(buildUrl({ min: undefined, max: undefined, categories: undefined, in_stock: undefined, filters: undefined }))
  }

  function handleApplyCategories() {
    router.push(buildUrl({ categories: selectedCats.join(",") || undefined }))
  }

  function handleApplyPrice() {
    router.push(buildUrl({ min: minPrice || undefined, max: maxPrice || undefined }))
  }

  // --- Filter sections (shared between sidebar and sheet) ---
  function renderFilterSections() {
    const visibleCats = catsExpanded ? sortedCategories : sortedCategories.slice(0, INITIAL_VISIBLE_CATS)
    const activeTokens = parseActiveFilters(currentQuickFilter)
    const tokenLabelLookup = new Map<string, string>()
    for (const g of filterGroups) {
      for (const opt of g.options) {
        tokenLabelLookup.set(opt.token, `${g.label}: ${opt.label}`)
      }
    }

    return (
      <div className="divide-y divide-[#E2E8F0]">
        {/* Active filters summary */}
        {activeTokens.size > 0 && (
          <div className="py-4 first:pt-0">
            <h3 className="text-xs uppercase tracking-wider text-[#64748B] font-bold mb-2">
              Active filters
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {[...activeTokens].map((token) => {
                const label = tokenLabelLookup.get(token) || token
                return (
                  <button
                    key={token}
                    type="button"
                    onClick={() => {
                      const next = new Set(activeTokens)
                      next.delete(token)
                      router.push(buildUrl({ filters: serializeActiveFilters(next) || undefined }))
                    }}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FFF7ED] border border-[#FED7AA] text-xs font-medium text-[#9A3412] hover:bg-[#FFEDD5] transition-colors"
                  >
                    <span>{label}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        {sortedCategories.length > 0 && !suppressSubcategoryFacet && (
          <div className="py-4 first:pt-0">
            <h3 className="text-xs uppercase tracking-wider text-[#64748B] font-bold mb-3">
              Categories
              {selectedCats.length > 0 && (
                <span className="ml-1.5 text-[#D97706] normal-case tracking-normal">({selectedCats.length})</span>
              )}
            </h3>
            <div className="space-y-1">
              {visibleCats.map(([cat, count]) => (
                <label key={cat} className="flex items-center gap-2.5 py-1 px-1 rounded-md hover:bg-[#F8FAFC] cursor-pointer text-sm group transition-colors duration-150">
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(cat)}
                    onChange={() => {
                      const next = selectedCats.includes(cat)
                        ? selectedCats.filter(c => c !== cat)
                        : [...selectedCats, cat]
                      setSelectedCats(next)
                    }}
                    className="accent-[#D97706] w-4 h-4 flex-shrink-0"
                  />
                  <span className="truncate flex-1 text-[#1E293B] group-hover:text-[#D97706] transition-colors duration-150">{categoryLabels[cat] || cat}</span>
                  <span className="text-xs text-[#94A3B8] tabular-nums">({count})</span>
                </label>
              ))}
            </div>
            {sortedCategories.length > INITIAL_VISIBLE_CATS && (
              <button
                onClick={() => setCatsExpanded(!catsExpanded)}
                className="mt-2 text-xs text-[#D97706] hover:underline font-medium"
              >
                {catsExpanded
                  ? "Show less"
                  : `Show all (${sortedCategories.length})`}
              </button>
            )}
            {selectedCats.length > 0 && selectedCats.join(",") !== currentCategories.join(",") && (
              <button
                onClick={handleApplyCategories}
                className="mt-2 w-full py-1.5 bg-[#D97706] text-white text-sm rounded-lg hover:bg-[#C2690A] transition-colors duration-200 font-medium"
              >
                Apply
              </button>
            )}
          </div>
        )}

        {/* Price Range */}
        <div className="py-4">
          <h3 className="text-xs uppercase tracking-wider text-[#64748B] font-bold mb-3">
            Price Range
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#D97706] transition-colors duration-200 bg-white"
            />
            <span className="text-[#94A3B8] text-sm flex-shrink-0">&ndash;</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#D97706] transition-colors duration-200 bg-white"
            />
          </div>
          {(minPrice || maxPrice) && (minPrice !== (currentMin || "") || maxPrice !== (currentMax || "")) && (
            <button
              onClick={handleApplyPrice}
              className="mt-2 w-full py-1.5 bg-[#D97706] text-white text-sm rounded-lg hover:bg-[#C2690A] transition-colors duration-200 font-medium"
            >
              Apply
            </button>
          )}
          {(currentMin || currentMax) && (
            <div className="mt-2 text-xs text-[#64748B]">
              Active: {currentMin || "0"}&euro; &ndash; {currentMax || "..."}&euro;
            </div>
          )}
        </div>

        {/* In Stock Toggle */}
        <div className="py-4">
          <label className="flex items-center justify-between cursor-pointer group">
            <h3 className="text-xs uppercase tracking-wider text-[#64748B] font-bold group-hover:text-[#1E293B] transition-colors duration-150">
              In Stock
            </h3>
            <button
              onClick={() => router.push(buildUrl({ in_stock: currentInStock ? "" : "1" }))}
              className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${
                currentInStock ? "bg-[#D97706]" : "bg-[#E2E8F0]"
              }`}
              role="switch"
              aria-checked={currentInStock}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  currentInStock ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        </div>

        {/* Adaptive Filter Groups — per-category spec filters */}
        {filterGroups.length > 0 ? (
          filterGroups.map((group) => {
            const activeTokens = parseActiveFilters(currentQuickFilter)
            return (
              <div key={group.key} className="py-4">
                <h3 className="text-xs uppercase tracking-wider text-[#64748B] font-bold mb-3">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.options.map((opt) => {
                    const active = activeTokens.has(opt.token)
                    return (
                      <label
                        key={opt.token}
                        className="flex items-center gap-2.5 py-1 px-1 rounded-md hover:bg-[#F8FAFC] cursor-pointer text-sm group transition-colors duration-150"
                        onClick={() => {
                          const next = new Set(activeTokens)
                          if (active) next.delete(opt.token)
                          else next.add(opt.token)
                          router.push(buildUrl({ filters: serializeActiveFilters(next) || undefined }))
                        }}
                      >
                        <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors duration-150 ${
                          active ? "bg-[#D97706] border-[#D97706]" : "border-[#CBD5E1] group-hover:border-[#D97706]"
                        }`}>
                          {active && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </span>
                        <span className={`truncate flex-1 transition-colors duration-150 ${active ? "text-[#D97706] font-medium" : "text-[#1E293B] group-hover:text-[#D97706]"}`}>
                          {opt.label}
                        </span>
                        <span className="text-xs text-[#94A3B8] tabular-nums">({opt.count})</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })
        ) : quickFilters.length > 0 ? (
          <div className="py-4">
            <h3 className="text-xs uppercase tracking-wider text-[#64748B] font-bold mb-3">
              Quick Filters
            </h3>
            <div className="space-y-1">
              {(quickExpanded ? quickFilters : quickFilters.slice(0, 8)).map((filter) => {
                const active = currentQuickFilter === filter.token
                return (
                  <label
                    key={filter.token}
                    className="flex items-center gap-2.5 py-1 px-1 rounded-md hover:bg-[#F8FAFC] cursor-pointer text-sm group transition-colors duration-150"
                    onClick={() => router.push(buildUrl({ filters: active ? undefined : filter.token }))}
                  >
                    <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors duration-150 ${
                      active ? "bg-[#D97706] border-[#D97706]" : "border-[#CBD5E1] group-hover:border-[#D97706]"
                    }`}>
                      {active && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </span>
                    <span className={`truncate flex-1 transition-colors duration-150 ${active ? "text-[#D97706] font-medium" : "text-[#1E293B] group-hover:text-[#D97706]"}`}>
                      {filter.label}
                    </span>
                    <span className="text-xs text-[#94A3B8] tabular-nums">({filter.count})</span>
                  </label>
                )
              })}
            </div>
            {quickFilters.length > 8 && (
              <button
                onClick={() => setQuickExpanded(!quickExpanded)}
                className="mt-2 text-xs text-[#D97706] hover:underline font-medium"
              >
                {quickExpanded
                  ? "Show less"
                  : `Show all (${quickFilters.length})`}
              </button>
            )}
          </div>
        ) : null}

        {/* Clear all */}
        {hasFilters && (
          <div className="py-4">
            <button
              onClick={handleClearAll}
              className="w-full text-sm text-[#D97706] hover:text-[#C2690A] hover:underline font-medium transition-colors duration-150"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    )
  }

  const activeFilterCount = [
    currentCategories.length > 0,
    currentMin || currentMax,
    currentInStock,
    currentQuickFilter,
  ].filter(Boolean).length

  return (
    <>
      {/* Desktop sidebar — hidden on mobile, shown by parent flex layout */}
      <div className="hidden md:block">
        <h2 className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider pb-3 mb-3 border-b border-[#E2E8F0]">
          Filters
        </h2>
        {renderFilterSections()}
      </div>

      {/* Mobile: Filter trigger button */}
      <div className="md:hidden">
        <button
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm font-medium text-[#1E293B] hover:border-[#D97706] transition-colors duration-200 shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="18" x2="10" y2="18" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#D97706] text-white text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile bottom sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 transition-opacity duration-200"
            onClick={() => setSheetOpen(false)}
          />
          {/* Sheet */}
          <div
            ref={sheetRef}
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-white rounded-t-2xl shadow-2xl flex flex-col animate-slide-up"
          >
            {/* Drag handle + header */}
            <div className="flex-shrink-0 pt-3 pb-2 px-5 border-b border-[#E2E8F0]">
              <div className="w-10 h-1 rounded-full bg-[#CBD5E1] mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1E293B]">
                  Filters
                </h2>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F1F5F9] transition-colors duration-150"
                  aria-label="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Scrollable filter body */}
            <div className="flex-1 overflow-y-auto px-5 py-2">
              {renderFilterSections()}
            </div>

            {/* Sticky apply button */}
            <div className="flex-shrink-0 p-4 border-t border-[#E2E8F0] bg-white">
              <button
                onClick={() => {
                  // Apply any pending category/price changes then close
                  const overrides: Record<string, string | undefined> = {}
                  if (selectedCats.join(",") !== currentCategories.join(",")) {
                    overrides.categories = selectedCats.join(",") || undefined
                  }
                  if (minPrice !== (currentMin || "") || maxPrice !== (currentMax || "")) {
                    overrides.min = minPrice || undefined
                    overrides.max = maxPrice || undefined
                  }
                  if (Object.keys(overrides).length > 0) {
                    router.push(buildUrl(overrides))
                  }
                  setSheetOpen(false)
                }}
                className="w-full py-3 bg-[#D97706] text-white text-sm font-bold rounded-xl hover:bg-[#C2690A] transition-colors duration-200"
              >
                {`Show results (${totalHits.toLocaleString("en-GB")})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-up animation */}
      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 200ms ease-out;
        }
      `}</style>
    </>
  )
}
