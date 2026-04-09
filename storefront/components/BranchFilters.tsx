"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useCallback } from "react"

type Props = {
  basePath: string
  currentSort?: string
  currentMin?: string
  currentMax?: string
  currentInStock?: boolean
  currentCat?: string
  totalProducts: number
  priceRange?: { min: number; max: number }
}

export default function BranchFilters({
  basePath,
  currentSort,
  currentMin,
  currentMax,
  currentInStock,
  currentCat,
  totalProducts,
  priceRange,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [minPrice, setMinPrice] = useState(currentMin || "")
  const [maxPrice, setMaxPrice] = useState(currentMax || "")

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams()
      const sort = overrides.sort ?? searchParams.get("sort") ?? ""
      const min = overrides.min ?? searchParams.get("min") ?? ""
      const max = overrides.max ?? searchParams.get("max") ?? ""
      const inStock = overrides.in_stock ?? searchParams.get("in_stock") ?? ""
      const cat = overrides.cat ?? searchParams.get("cat") ?? ""
      const limit = overrides.limit ?? searchParams.get("limit") ?? ""

      if (sort) params.set("sort", sort)
      if (min) params.set("min", min)
      if (max) params.set("max", max)
      if (inStock) params.set("in_stock", inStock)
      if (cat) params.set("cat", cat)
      if (limit) params.set("limit", limit)
      const qs = params.toString()
      return qs ? `${basePath}?${qs}` : basePath
    },
    [basePath, searchParams]
  )

  function handleSort(key: string) {
    router.push(buildUrl({ sort: key === currentSort ? "" : key }))
  }

  function handleStockToggle() {
    router.push(buildUrl({ in_stock: currentInStock ? "" : "1" }))
  }

  function handlePriceApply(e: React.FormEvent) {
    e.preventDefault()
    router.push(buildUrl({ min: minPrice, max: maxPrice }))
  }

  function handleReset() {
    setMinPrice("")
    setMaxPrice("")
    router.push(buildUrl({ sort: "", min: "", max: "", in_stock: "", cat: "" }))
  }

  const sortOptions = [
    { value: "uusimad", label: "Newest" },
    { value: "odavamad", label: "Cheapest" },
    { value: "kallimad", label: "Most Expensive" },
  ]

  const hasFilters = Boolean(currentSort || currentMin || currentMax || currentInStock)

  return (
    <div className="mb-6">
      {/* Compact filter bar */}
      <div className="flex items-center gap-0 rounded-2xl border border-soft-border bg-white overflow-hidden h-[48px]">
        {/* Sort pills */}
        <div className="flex items-center gap-1 px-4 border-r border-soft-border h-full">
          <span className="text-xs font-medium text-muted mr-1 hidden sm:inline">Sort</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSort(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                currentSort === opt.value
                  ? "bg-accent text-white"
                  : "text-off-black hover:bg-silver"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Price display */}
        <div className="flex items-center px-4 border-r border-soft-border h-full">
          <span className="text-xs text-muted">
            Price:{" "}
            <span className="font-medium text-off-black">
              {currentMin || priceRange?.min || 0}€ – {currentMax || priceRange?.max || "∞"}€
            </span>
          </span>
        </div>

        {/* In stock toggle */}
        <button
          type="button"
          onClick={handleStockToggle}
          className={`flex items-center gap-2 px-4 border-r border-soft-border h-full text-xs font-medium transition-all duration-200 ${
            currentInStock ? "text-accent bg-accent-light" : "text-off-black hover:bg-silver"
          }`}
        >
          In Stock
        </button>

        {/* More filters toggle */}
        <button
          type="button"
          onClick={() => setDrawerOpen(!drawerOpen)}
          className={`flex items-center gap-2 px-4 h-full text-xs font-medium transition-all duration-200 ${
            drawerOpen ? "text-accent bg-accent-light" : "text-off-black hover:bg-silver"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <circle cx="9" cy="6" r="2" fill="currentColor" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <circle cx="15" cy="12" r="2" fill="currentColor" />
            <line x1="4" y1="18" x2="20" y2="18" />
            <circle cx="11" cy="18" r="2" fill="currentColor" />
          </svg>
          Filters
        </button>

        {/* Product count */}
        <div className="ml-auto px-4 text-xs text-muted hidden md:flex items-center h-full">
          {totalProducts.toLocaleString("en")} products
        </div>
      </div>

      {/* Expandable filter drawer */}
      {drawerOpen && (
        <div className="mt-3 p-5 rounded-2xl border border-soft-border bg-white animate-in slide-in-from-top-2 duration-200">
          <form onSubmit={handlePriceApply} className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Min price</label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                min="0"
                placeholder={String(priceRange?.min || 0)}
                className="w-24 rounded-xl border border-soft-border bg-silver px-3 py-2 text-sm text-off-black outline-none transition-colors focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Max price</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                min="0"
                placeholder={String(priceRange?.max || 9999)}
                className="w-28 rounded-xl border border-soft-border bg-silver px-3 py-2 text-sm text-off-black outline-none transition-colors focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="h-[38px] px-5 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Apply
            </button>
            {hasFilters && (
              <button
                type="button"
                onClick={handleReset}
                className="h-[38px] px-4 border border-soft-border text-sm font-medium text-off-black hover:border-accent hover:text-accent rounded-xl transition-colors"
              >
                Clear All
              </button>
            )}
          </form>

          {/* Active filters */}
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-soft-border">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted">Active:</span>
              {currentSort && (
                <span className="inline-flex items-center rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-accent">
                  {sortOptions.find((o) => o.value === currentSort)?.label || currentSort}
                </span>
              )}
              {currentInStock && (
                <span className="inline-flex items-center rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-accent">
                  In Stock
                </span>
              )}
              {(currentMin || currentMax) && (
                <span className="inline-flex items-center rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-accent">
                  {currentMin || 0}€ – {currentMax || "∞"}€
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
