"use client"
import { useCompare, type CompareItem } from "./CompareContext"

type Props = {
  item: CompareItem
  locale?: string
}

export default function AddToCompareButton({ item, locale }: Props) {
  const { add, remove, has } = useCompare()
  const isCompared = has(item.id)

  return (
    <button
      onClick={() => isCompared ? remove(item.id) : add(item)}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
        isCompared
          ? "bg-[#0ea5a0]/10 border-[#0ea5a0] text-[#0ea5a0]"
          : "border-[#E2E8F0] text-[#64748B] hover:border-[#0ea5a0] hover:text-[#0ea5a0]"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
      {isCompared ? (locale === "et" ? "Võrdluses" : "Added to Compare") : (locale === "et" ? "Lisa võrdlusse" : "Add to Compare")}
    </button>
  )
}
