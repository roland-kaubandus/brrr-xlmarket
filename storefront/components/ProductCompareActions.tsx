"use client"

import Link from "next/link"
import { useCompare, type CompareItem } from "./CompareContext"

type Props = {
  item: CompareItem
  locale: string
}

export default function ProductCompareActions({ item, locale }: Props) {
  const { add, remove, has } = useCompare()
  const isCompared = has(item.id)

  return (
    <div className="flex items-center gap-2">
      {isCompared ? (
        <Link
          href={`/${locale}/vordlus`}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          {locale === "en" ? "View compare" : "Vaata võrdlust"}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => add(item)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-[#E2E8F0] text-sm font-semibold text-[#1E293B] hover:border-[#D97706] hover:text-[#D97706] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          {locale === "en" ? "Add to compare" : "Lisa võrdlusse"}
        </button>
      )}
    </div>
  )
}
