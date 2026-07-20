"use client"

import Link from "@/components/SafeLink"
import { useCompare, type CompareItem } from "./CompareContext"

type Props = {
  item: CompareItem
  locale: string
}

export default function ProductCompareActions({ item, locale }: Props) {
  const { add, remove, has } = useCompare()
  const isCompared = has(item.id)

  if (isCompared) {
    return (
      <Link
        href={`/${locale}/vordlus`}
        className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-[#0ea5a0] text-white text-[13.5px] font-semibold hover:bg-[#0b7d79] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        {locale === "et" ? "Vaata võrdlust" : "View Compare"}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => add(item)}
      className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white text-[13.5px] font-semibold text-[#1a1a2e] hover:border-[#0ea5a0] hover:text-[#0ea5a0] transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
      {locale === "et" ? "Lisa võrdlusse" : "Add to Compare"}
    </button>
  )
}
