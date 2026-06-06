"use client"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

function sortOptions(locale: string) {
  const et = locale === "et"
  return [
    { value: "", label: et ? "Parim vaste" : "Best Match" },
    { value: "price_asc", label: et ? "Hind: odavamad ees" : "Price: Low to High" },
    { value: "price_desc", label: et ? "Hind: kallimad ees" : "Price: High to Low" },
    { value: "newest", label: et ? "Uusimad" : "Newest" },
  ]
}

type Props = {
  currentSort: string
  locale: string
  query?: string
  currentMin?: string
  currentMax?: string
  currentCategories?: string[]
  currentInStock?: boolean
  currentQuickFilter?: string
  basePath?: string
}

export default function SortSelect({
  currentSort, locale, query, currentMin, currentMax,
  currentCategories = [], currentInStock, currentQuickFilter,
  basePath,
}: Props) {
  const router = useRouter()

  const buildUrl = useCallback((sortValue: string) => {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (sortValue) params.set("sort", sortValue)
    if (currentMin) params.set("min", currentMin)
    if (currentMax) params.set("max", currentMax)
    if (currentCategories.length > 0) params.set("categories", currentCategories.join(","))
    if (currentInStock) params.set("in_stock", "1")
    if (currentQuickFilter) params.set("filters", currentQuickFilter)
    const qs = params.toString()
    const base = basePath || `/${locale}/otsing`
    return `${base}${qs ? `?${qs}` : ""}`
  }, [query, currentMin, currentMax, currentCategories, currentInStock, currentQuickFilter, locale, basePath])

  return (
    <select
      value={currentSort}
      onChange={(e) => router.push(buildUrl(e.target.value))}
      className="border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-sm bg-white text-[#1E293B] focus:border-[#D97706] focus:outline-none transition-colors duration-200 cursor-pointer appearance-none bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        paddingRight: "2rem",
      }}
    >
      {sortOptions(locale).map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
