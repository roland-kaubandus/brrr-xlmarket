"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useCallback } from "react"

type Props = {
  currentSort?: string
  currentMin?: string
  currentMax?: string
  currentInStock?: boolean
  basePath: string
  totalProducts: number
  heading?: string
  showInStockToggle?: boolean
  preservedParams?: Record<string, string | undefined>
}

export default function CategoryFilters({
  currentSort,
  currentMin,
  currentMax,
  currentInStock,
  basePath,
  totalProducts,
  heading,
  showInStockToggle,
  preservedParams,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [minPrice, setMinPrice] = useState(currentMin || "")
  const [maxPrice, setMaxPrice] = useState(currentMax || "")
  const [expanded, setExpanded] = useState(false)

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams()
      const sort = overrides.sort ?? searchParams.get("sort") ?? ""
      const min = overrides.min ?? searchParams.get("min") ?? ""
      const max = overrides.max ?? searchParams.get("max") ?? ""
      const inStock = overrides.in_stock ?? searchParams.get("in_stock") ?? ""

      if (preservedParams) {
        for (const [key, value] of Object.entries(preservedParams)) {
          if (value) params.set(key, value)
        }
      }

      if (sort) params.set("sort", sort)
      if (min) params.set("min", min)
      if (max) params.set("max", max)
      if (inStock) params.set("in_stock", inStock)
      // reset page when filters change
      const qs = params.toString()
      return qs ? `${basePath}?${qs}` : basePath
    },
    [basePath, preservedParams, searchParams]
  )

  function handleSort(key: string) {
    router.push(buildUrl({ sort: key === currentSort ? "" : key }))
  }

  function handlePriceFilter(e: React.FormEvent) {
    e.preventDefault()
    router.push(buildUrl({ min: minPrice, max: maxPrice }))
  }

  function handleStockToggle() {
    router.push(buildUrl({ in_stock: currentInStock ? "" : "1" }))
  }

  function handleReset() {
    setMinPrice("")
    setMaxPrice("")
    router.push(buildUrl({ sort: "", min: "", max: "", in_stock: "" }))
  }

  const activeFilterCount = [
    currentSort ? 1 : 0,
    currentMin || currentMax ? 1 : 0,
    currentInStock ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)
  const hasFilters = activeFilterCount > 0

  return (
    <div className="border border-[#E8E8E8] bg-white p-[16px] sm:p-[20px] mb-[24px] rounded-2xl">
      <div className="flex items-center justify-between gap-3 mb-4 sm:hidden">
        <div>
          <p className="text-[15px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">
            {heading || "Filtrid"}
          </p>
          <p className="text-[12px] text-[#999999] font-[family-name:var(--font-jakarta)]">
            {totalProducts.toLocaleString("et-EE")} toodet
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E8E8E8] px-[12px] py-[8px] text-[13px] font-[600] font-[family-name:var(--font-poppins)] text-[#333333]"
        >
          {hasFilters ? `${activeFilterCount} aktiivset` : "Ava"}
          <span className="text-[#E8650A]">{expanded ? "−" : "+"}</span>
        </button>
      </div>

      <div className={`${expanded ? "block" : "hidden"} sm:block`}>
        <div className="hidden sm:flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-[15px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">
              {heading || "Filtrid"}
            </p>
            <p className="text-[12px] text-[#999999] font-[family-name:var(--font-jakarta)]">
              Kohanda valikut vastavalt hinnale ja sortimisele.
            </p>
          </div>
          {hasFilters && (
            <span className="text-[12px] text-[#E8650A] font-[family-name:var(--font-jakarta)]">
              {activeFilterCount} aktiivset filtrit
            </span>
          )}
        </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-4">
        {/* Price filter */}
        <form onSubmit={handlePriceFilter} className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-[#555555] font-[family-name:var(--font-jakarta)] shrink-0">Hind:</span>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Min €"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="border border-[#E8E8E8] focus:border-[#E8650A] px-[10px] py-[8px] text-[13px] font-[family-name:var(--font-jakarta)] text-[#333333] bg-[#F7F7F7] focus:bg-white w-[80px] outline-none transition-colors"
          />
          <span className="text-[#999999] font-[family-name:var(--font-jakarta)] text-[13px]">–</span>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Max €"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="border border-[#E8E8E8] focus:border-[#E8650A] px-[10px] py-[8px] text-[13px] font-[family-name:var(--font-jakarta)] text-[#333333] bg-[#F7F7F7] focus:bg-white w-[80px] outline-none transition-colors"
          />
          <button
            type="submit"
            className="bg-[#E8650A] text-white px-[14px] py-[8px] text-[13px] font-[600] font-[family-name:var(--font-poppins)] hover:bg-[#CF5A08] transition-colors"
          >
            Filtreeri
          </button>
        </form>

        {/* Sort buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 xl:ml-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] text-[#555555] font-[family-name:var(--font-jakarta)]">Sorteeri:</span>
            {[
              { key: "uusimad", label: "Uusimad" },
              { key: "odavamad", label: "Odavamad" },
              { key: "kallimad", label: "Kallimad" },
            ].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => handleSort(s.key)}
                className={`px-[12px] py-[7px] border rounded-xl text-[13px] font-[500] font-[family-name:var(--font-poppins)] transition-colors ${
                  currentSort === s.key
                    ? "border-[#E8650A] bg-[#FFF5EE] text-[#E8650A]"
                    : "border-[#E8E8E8] text-[#555555] hover:border-[#E8650A] hover:text-[#E8650A]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {showInStockToggle && (
            <button
              type="button"
              onClick={handleStockToggle}
              className={`inline-flex items-center justify-center gap-2 px-[12px] py-[7px] border rounded-xl text-[13px] font-[500] font-[family-name:var(--font-poppins)] transition-colors ${
                currentInStock
                  ? "border-[#E8650A] bg-[#FFF5EE] text-[#E8650A]"
                  : "border-[#E8E8E8] text-[#555555] hover:border-[#E8650A] hover:text-[#E8650A]"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${currentInStock ? "bg-[#E8650A]" : "bg-[#CFCFCF]"}`} />
              Ainult laos
            </button>
          )}
        </div>
      </div>

      {/* Active filter info + reset */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-[16px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-[#999999] font-[family-name:var(--font-jakarta)]">
          {totalProducts.toLocaleString("et-EE")} toodet
          {(currentMin || currentMax) && (
            <span>
              {" "}(hind: {currentMin ? `alates ${currentMin}€` : ""}
              {currentMin && currentMax ? " – " : ""}
              {currentMax ? `kuni ${currentMax}€` : ""})
            </span>
          )}
          </span>
          {currentInStock && (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF5EE] px-[10px] py-[5px] text-[12px] text-[#E8650A] font-[family-name:var(--font-jakarta)]">
              Laos olemas
            </span>
          )}
          {currentSort && (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F7F7F7] px-[10px] py-[5px] text-[12px] text-[#555555] font-[family-name:var(--font-jakarta)]">
              Sorteerimine: {currentSort}
            </span>
          )}
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-[#E8650A] hover:text-[#CF5A08] underline text-[12px] font-[family-name:var(--font-jakarta)] transition-colors"
          >
            Tühista filtrid
          </button>
        )}
      </div>
      </div>
    </div>
  )
}
