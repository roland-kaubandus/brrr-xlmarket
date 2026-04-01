"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useCallback } from "react"

type Props = {
  currentSort?: string
  currentMin?: string
  currentMax?: string
  basePath: string
  totalProducts: number
  preservedParams?: Record<string, string | undefined>
}

export default function CategoryFilters({
  currentSort,
  currentMin,
  currentMax,
  basePath,
  totalProducts,
  preservedParams,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [minPrice, setMinPrice] = useState(currentMin || "")
  const [maxPrice, setMaxPrice] = useState(currentMax || "")

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams()
      const sort = overrides.sort ?? searchParams.get("sort") ?? ""
      const min = overrides.min ?? searchParams.get("min") ?? ""
      const max = overrides.max ?? searchParams.get("max") ?? ""

      if (preservedParams) {
        for (const [key, value] of Object.entries(preservedParams)) {
          if (value) params.set(key, value)
        }
      }

      if (sort) params.set("sort", sort)
      if (min) params.set("min", min)
      if (max) params.set("max", max)
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

  function handleReset() {
    setMinPrice("")
    setMaxPrice("")
    router.push(buildUrl({ sort: "", min: "", max: "" }))
  }

  const hasFilters = !!(currentSort || currentMin || currentMax)

  return (
    <div className="border border-[#E8E8E8] bg-white p-[20px] mb-[24px]">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Price filter */}
        <form onSubmit={handlePriceFilter} className="flex items-center gap-2">
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
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-[13px] text-[#555555] font-[family-name:var(--font-jakarta)]">Sorteeri:</span>
          {[
            { key: "uusimad", label: "Uusimad" },
            { key: "odavamad", label: "Odavamad" },
            { key: "kallimad", label: "Kallimad" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => handleSort(s.key)}
              className={`px-[12px] py-[7px] border text-[13px] font-[500] font-[family-name:var(--font-poppins)] transition-colors ${
                currentSort === s.key
                  ? "border-[#E8650A] bg-[#FFF5EE] text-[#E8650A]"
                  : "border-[#E8E8E8] text-[#555555] hover:border-[#E8650A] hover:text-[#E8650A]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active filter info + reset */}
      <div className="flex items-center justify-between mt-[16px]">
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
        {hasFilters && (
          <button
            onClick={handleReset}
            className="text-[#E8650A] hover:text-[#CF5A08] underline text-[12px] font-[family-name:var(--font-jakarta)] transition-colors"
          >
            Tühista filtrid
          </button>
        )}
      </div>
    </div>
  )
}
