"use client"

import { useState, type ReactNode } from "react"
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
 * CategoryTreeNav — vasak kategooria-AKORDION KÕIGIL kategooria-lehtedel (L1/L2/L3).
 *
 * ISESEISEV SSoT-puust (category-tree.generated.json) — EI Meili-päring, EI scope'itud
 * facet → identne igal lehel, ei kahane, ei tekita "unavailable". Klõps nimel =
 * NAVIGATSIOON (Link → /kategooriad/[handle]), MITTE filter — categories-saaga ei kordu.
 *
 * Kuva: kõik 25 L1-maini ALATI nähtaval. Current-haru (ancestors + self) AVATUD (teal
 * esiletõst). Teised mainid kokkupandud — expand-nool avab/sulgeb (client-state), nimi
 * navigeerib. Tootearvud propsist (üks globaalne facet lehe tasandil, ISR-cached).
 */
type Props = {
  currentHandle: string
  locale: string
  /** handle → tootearv (üks globaalne taxonomy.ancestors facet). Puudumisel arve ei näita. */
  counts?: Record<string, number>
  /** Kutsutakse nimel-klõpsul (navigatsioon) — nt mega-menüü-dropdowni sulgemiseks.
   *  Vasak-sidebar ei anna → no-op (non-breaking). */
  onNavigate?: () => void
}

export default function CategoryTreeNav({ currentHandle, locale, counts = {}, onNavigate }: Props) {
  const loc = (locale === "et" ? "et" : "en") as "et" | "en"

  // Current-haru = ancestors + self. ALATI avatud (arvutatakse igal renderil currentHandle'ist
  // → client-nav järel uus haru avaneb; kasutaja käsitsi-avatud mainid lisanduvad).
  const branch = new Set<string>([
    ...getAncestors(currentHandle).map((a) => a.handle),
    currentHandle,
  ])
  const [opened, setOpened] = useState<Set<string>>(new Set())
  const isOpen = (h: string) => branch.has(h) || opened.has(h)
  const toggle = (h: string) =>
    setOpened((prev) => {
      const next = new Set(prev)
      if (next.has(h)) next.delete(h)
      else next.add(h)
      return next
    })

  const renderNode = (node: CategoryNode, depth: number): ReactNode => {
    const isCurrent = node.handle === currentHandle
    const children = getChildren(node.handle)
    const hasChildren = children.length > 0
    const openNow = hasChildren && isOpen(node.handle)
    const n = counts[node.handle]
    return (
      <li key={node.handle}>
        <div
          className={`group flex items-center gap-1 rounded-md pr-1.5 transition-colors ${
            isCurrent ? "bg-[#f0fdf9]" : "hover:bg-[#f0fdf9]"
          }`}
        >
          {/* Expand-nool (ainult kui lapsed) — avab/sulgeb, EI navigeeri */}
          {hasChildren ? (
            <button
              type="button"
              aria-expanded={openNow}
              aria-label={openNow ? (loc === "et" ? "Sulge" : "Collapse") : (loc === "et" ? "Ava" : "Expand")}
              onClick={() => toggle(node.handle)}
              className="shrink-0 flex items-center justify-center w-5 h-7 text-[#94A3B8] hover:text-[#0b7d79]"
              style={{ marginLeft: `${depth * 12}px` }}
            >
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-150 ${openNow ? "rotate-90" : ""}`}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          ) : (
            <span className="shrink-0 w-5" style={{ marginLeft: `${depth * 12}px` }} aria-hidden />
          )}
          {/* Nimi → NAVIGATSIOON (Link) */}
          <Link
            href={categoryPath(loc, node.handle)}
            aria-current={isCurrent ? "page" : undefined}
            onClick={onNavigate}
            className={`flex-1 min-w-0 flex items-center justify-between gap-2 py-1.5 text-[13.5px] transition-colors ${
              isCurrent
                ? "text-[#0b7d79] font-semibold"
                : depth === 0
                  ? "text-[#1a1a2e] font-medium group-hover:text-[#0b7d79]"
                  : "text-[#475569] group-hover:text-[#0b7d79]"
            }`}
          >
            <span className="truncate">{nodeName(node, locale)}</span>
            {typeof n === "number" && n > 0 && (
              <span className={`shrink-0 text-[11.5px] tabular-nums ${isCurrent ? "text-[#0b7d79]" : "text-[#94A3B8]"}`}>{n}</span>
            )}
          </Link>
        </div>
        {openNow && (
          <ul className="mt-0.5 space-y-0.5">{children.map((c) => renderNode(c, depth + 1))}</ul>
        )}
      </li>
    )
  }

  const l1s = getAllL1()

  return (
    <nav
      aria-label={loc === "et" ? "Kategooriad" : "Categories"}
      className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-3"
    >
      <Link
        href={`/${loc}/kategooriad`}
        onClick={onNavigate}
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
