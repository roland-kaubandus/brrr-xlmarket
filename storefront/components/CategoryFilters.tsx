"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useCallback } from "react"

type Props = {
  currentSort?: string
  currentMin?: string
  currentMax?: string
  basePath: string
  totalProducts: number
}

export default function CategoryFilters({
  currentSort,
  currentMin,
  currentMax,
  basePath,
  totalProducts,
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

      if (sort) params.set("sort", sort)
      if (min) params.set("min", min)
      if (max) params.set("max", max)
      // reset page when filters change
      const qs = params.toString()
      return qs ? `${basePath}?${qs}` : basePath
    },
    [basePath, searchParams]
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
    router.push(basePath)
  }

  const hasFilters = !!(currentSort || currentMin || currentMax)

  return (
    <div className="border border-gray-200 bg-white p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Price filter */}
        <form onSubmit={handlePriceFilter} className="flex items-center gap-2">
          <span className="text-sm text-gray-500 shrink-0">Hind:</span>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Min €"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-20 px-2 py-1 text-sm border border-gray-300 focus:outline-none focus:border-amber-500"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Max €"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-20 px-2 py-1 text-sm border border-gray-300 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="px-3 py-1 text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition"
          >
            Filtreeri
          </button>
        </form>

        {/* Sort buttons */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-sm text-gray-500">Sorteeri:</span>
          {[
            { key: "uusimad", label: "Uusimad" },
            { key: "odavamad", label: "Odavamad" },
            { key: "kallimad", label: "Kallimad" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => handleSort(s.key)}
              className={`px-3 py-1 border text-sm transition ${
                currentSort === s.key
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-gray-200 hover:border-amber-500"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active filter info + reset */}
      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span>
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
            className="text-amber-600 hover:text-amber-700 underline"
          >
            Tühista filtrid
          </button>
        )}
      </div>
    </div>
  )
}
