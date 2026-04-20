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
        className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-[#E8920A] text-white text-[13.5px] font-semibold hover:bg-[#B45309] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        View Compare
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => add(item)}
      className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white text-[13.5px] font-semibold text-[#1E293B] hover:border-[#E8920A] hover:text-[#E8920A] transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
      Add to Compare
    </button>
  )
}
