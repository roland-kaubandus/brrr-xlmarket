"use client"
import { useCompare } from "@/components/CompareContext"
import { usePathname } from "next/navigation"
import Link from "next/link"

export default function ComparePage() {
  const { items, remove, clear } = useCompare()
  const pathname = usePathname()
  const locale = pathname.split("/")[1] === "en" ? "en" : "et"

  if (items.length === 0) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-[#1E293B] mb-4">
          {locale === "en" ? "Product Comparison" : "Toodete võrdlus"}
        </h1>
        <p className="text-[#64748B] mb-6">
          {locale === "en"
            ? "No products added to compare. Browse products and click \"Add to Compare\" to start."
            : "Võrdlusesse pole tooteid lisatud. Sirvi tooteid ja kliki \"Lisa võrdlusse\" alustamiseks."}
        </p>
        <Link href={`/${locale}`}
          className="inline-block px-6 py-3 bg-[#D97706] text-white rounded-lg font-semibold hover:bg-[#B45309] transition-colors">
          {locale === "en" ? "Browse Products" : "Sirvi tooteid"}
        </Link>
      </div>
    )
  }

  // Collect all unique spec keys across all items
  const allSpecKeys = Array.from(
    new Set(items.flatMap(item => Object.keys(item.specs)))
  )

  return (
    <div className="max-w-[1360px] mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-[#64748B] mb-4">
        <Link href={`/${locale}`} className="hover:text-[#D97706]">
          {locale === "en" ? "Home" : "Avaleht"}
        </Link>
        <span className="mx-1.5">&gt;</span>
        <span className="text-[#1E293B] font-medium">
          {locale === "en" ? "Compare Products" : "Toodete võrdlus"}
        </span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">
          {locale === "en" ? "Compare Products" : "Toodete võrdlus"}
          <span className="text-base font-normal text-[#64748B] ml-2">({items.length})</span>
        </h1>
        <button onClick={clear}
          className="text-sm text-[#64748B] hover:text-[#DC2626] transition-colors">
          {locale === "en" ? "Clear all" : "Tühjenda kõik"}
        </button>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
        <table className="w-full min-w-[600px]">
          {/* Product images row */}
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              <th className="p-4 text-left text-sm font-medium text-[#64748B] w-[180px] bg-[#F8FAFC]">
                {locale === "en" ? "Product" : "Toode"}
              </th>
              {items.map(item => (
                <th key={item.id} className="p-4 text-center align-top">
                  <div className="relative group">
                    <button onClick={() => remove(item.id)}
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#64748B] text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      aria-label={locale === "en" ? "Remove" : "Eemalda"}>×</button>
                    <Link href={`/${locale}/toode/${item.handle}`}>
                      <div className="w-[120px] h-[120px] mx-auto bg-[#FAFAFA] rounded-lg overflow-hidden mb-2">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-contain p-2" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#CBD5E1]">—</div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-[#1E293B] line-clamp-2 hover:text-[#D97706] transition-colors">{item.title}</p>
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
            {/* Price row */}
            <tr className="border-b border-[#E2E8F0]">
              <th className="p-4 text-left text-sm font-medium text-[#64748B] bg-[#F8FAFC]">
                {locale === "en" ? "Price" : "Hind"}
              </th>
              {items.map(item => (
                <td key={item.id} className="p-4 text-center">
                  <span className="font-bold text-lg text-[#1E293B]">{item.price || "—"}</span>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Spec rows */}
            {allSpecKeys.map((key, i) => (
              <tr key={key} className={`border-b border-[#E2E8F0] ${i % 2 === 0 ? "bg-[#F8FAFC]" : "bg-white"}`}>
                <td className="p-4 text-sm font-medium text-[#64748B]">{key}</td>
                {items.map(item => (
                  <td key={item.id} className="p-4 text-sm text-[#1E293B] text-center">
                    {item.specs[key] || "—"}
                  </td>
                ))}
              </tr>
            ))}
            {allSpecKeys.length === 0 && (
              <tr>
                <td colSpan={items.length + 1} className="p-8 text-center text-sm text-[#64748B]">
                  {locale === "en" ? "No specifications available for comparison." : "Tehnilised andmed pole võrdluseks saadaval."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
