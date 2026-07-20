import type { ReactNode } from "react"
import Link from "@/components/SafeLink"
import {
  getAllL1,
  getChildren,
  getAncestors,
  nodeName,
  type CategoryNode,
} from "@/lib/category-tree"
import { categoryPath } from "@/lib/i18n"

/**
 * CategoryTreeNav — vasak kategooria-navigatsioon KÕIGIL kategooria-lehtedel (L1/L2/L3).
 * Näitab kõik 25 L1-maini; current-haru (ancestors + self) on avatud → näitab L2/L3-d
 * (sh current L3 SIBLINGS-id), current esile tõstetud (teal). Muud mainid kokkupandud
 * (lingid — klõps viib kategooriasse, kus see haru avaneb). Server-komponent (SSoT sünk,
 * lingid — pole client-state'i vaja). Parandab L3-regressiooni (sügaval ei kao nav).
 */
type Props = {
  currentHandle: string
  locale: string
  /** handle → tootearv (globaalne taxonomy.ancestors facet). Puudumisel arve ei näidata. */
  counts?: Record<string, number>
}

export default function CategoryTreeNav({ currentHandle, locale, counts = {} }: Props) {
  const loc = (locale === "et" ? "et" : "en") as "et" | "en"
  const branch = new Set<string>([
    ...getAncestors(currentHandle).map((a) => a.handle),
    currentHandle,
  ])

  const renderNode = (node: CategoryNode, depth: number): ReactNode => {
    const isCurrent = node.handle === currentHandle
    const inBranch = branch.has(node.handle)
    const children = getChildren(node.handle)
    const expanded = inBranch && children.length > 0
    const n = counts[node.handle]
    return (
      <li key={node.handle}>
        <Link
          href={categoryPath(loc, node.handle)}
          aria-current={isCurrent ? "page" : undefined}
          className={`group flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13.5px] transition-colors ${
            isCurrent
              ? "bg-[#f0fdf9] text-[#0b7d79] font-semibold"
              : inBranch
                ? "text-[#1a1a2e] font-medium hover:bg-[#f0fdf9] hover:text-[#0b7d79]"
                : "text-[#475569] hover:bg-[#f0fdf9] hover:text-[#0b7d79]"
          }`}
          style={{ paddingLeft: `${10 + depth * 12}px` }}
        >
          <span className="truncate">{nodeName(node, locale)}</span>
          {typeof n === "number" && n > 0 && (
            <span className={`shrink-0 text-[11.5px] tabular-nums ${isCurrent ? "text-[#0b7d79]" : "text-[#94A3B8]"}`}>{n}</span>
          )}
        </Link>
        {expanded && <ul className="mt-0.5 space-y-0.5">{children.map((c) => renderNode(c, depth + 1))}</ul>}
      </li>
    )
  }

  const l1s = getAllL1()

  return (
    <nav aria-label={loc === "et" ? "Kategooriad" : "Categories"} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-3">
      <Link
        href={`/${loc}/kategooriad`}
        className="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 mb-1.5 text-[12px] font-bold uppercase tracking-[1px] text-[#0b7d79] hover:bg-[#f0fdf9] transition-colors border-b border-[#F1F5F9]"
      >
        {loc === "et" ? "Kõik kategooriad" : "All categories"}
        <span aria-hidden className="text-[#94A3B8]">&rsaquo;</span>
      </Link>
      <ul className="space-y-0.5 max-h-[calc(100vh-160px)] overflow-y-auto">
        {l1s.map((l1) => renderNode(l1, 0))}
      </ul>
    </nav>
  )
}
