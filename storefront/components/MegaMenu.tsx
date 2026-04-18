"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import Link from "@/components/SafeLink"
import { categoryPath } from "@/lib/i18n"
import { Menu, X, ChevronRight, ChevronLeft } from "lucide-react"
import { V3_ICONS } from "@/lib/taxonomy-v3"
import CategoryThumb from "@/components/CategoryThumb"
import {
  getAllL1,
  getChildren,
  getNode,
  nodeName,
  type CategoryNode,
  type Locale as TaxLocale,
} from "@/lib/category-tree"

/**
 * MegaMenu — N-level category drill-down.
 *
 * Single source of truth: category-tree.generated.json (from taxonomy.yaml).
 * No more subSlugs arrays, no more THUMB_OVERRIDES indirection, no more
 * DB /api/header-categories fetch. Everything is static and SSoT-bound.
 *
 * Structure:
 *   Column 1: L1 list (22, V3_ICONS for icons)
 *   Column 2: L2 list for active L1 (CategoryThumb per row)
 *   Column 3+: L3+ panels when the active L2 node has children
 *
 * Drill is recursive — if the tree ever grows an L4 level, no code change
 * needed here.
 *
 * Spec: 2026-04-18 §3.5
 */

interface MegaMenuProps {
  locale?: string
  variant?: "light" | "dark"
}

export default function MegaMenu({ locale = "et" }: MegaMenuProps) {
  const loc = locale as TaxLocale
  const [isOpen, setIsOpen] = useState(false)
  const [activeL1, setActiveL1] = useState<CategoryNode | null>(null)
  // hoverPath[i] = node whose children are rendered as the (i+2)-th column.
  // hoverPath[0] = L2 node (its children are the L3 panel), etc.
  const [hoverPath, setHoverPath] = useState<CategoryNode[]>([])
  const [mobileStack, setMobileStack] = useState<CategoryNode[]>([])

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const openTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const menuRef = useRef<HTMLDivElement>(null)

  const l1Nodes = useMemo(() => getAllL1(), [])

  const activeL2: CategoryNode[] = useMemo(() => {
    if (!activeL1) return []
    return getChildren(activeL1.handle)
  }, [activeL1])

  // Panels are hoverPath[i].children, rendered in order.
  const drillPanels: CategoryNode[][] = useMemo(() => {
    return hoverPath.map((n) => getChildren(n.handle)).filter((children) => children.length > 0)
  }, [hoverPath])

  const shouldDrill = useCallback((node: CategoryNode): boolean => {
    const kids = getChildren(node.handle)
    if (kids.length === 0) return false
    if (kids.length === 1 && getChildren(kids[0].handle).length === 0) return false
    return true
  }, [])

  const handleL1Hover = useCallback((l1: CategoryNode) => {
    clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      setActiveL1(l1)
      setHoverPath([])
    }, 60)
  }, [])

  const handleL2Hover = useCallback(
    (l2: CategoryNode) => {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = setTimeout(() => {
        setHoverPath(shouldDrill(l2) ? [l2] : [])
      }, 80)
    },
    [shouldDrill]
  )

  const handleDeepHover = useCallback(
    (node: CategoryNode, depth: number) => {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = setTimeout(() => {
        if (!shouldDrill(node)) {
          setHoverPath((prev) => prev.slice(0, depth + 1))
          return
        }
        setHoverPath((prev) => [...prev.slice(0, depth + 1), node])
      }, 80)
    },
    [shouldDrill]
  )

  useEffect(
    () => () => {
      clearTimeout(hoverTimerRef.current)
      clearTimeout(openTimerRef.current)
      clearTimeout(closeTimerRef.current)
    },
    []
  )

  const handleTriggerEnter = useCallback(() => {
    clearTimeout(closeTimerRef.current)
    openTimerRef.current = setTimeout(() => setIsOpen(true), 100)
  }, [])

  const handleTriggerLeave = useCallback(() => {
    clearTimeout(openTimerRef.current)
  }, [])

  const handleMenuEnter = useCallback(() => {
    clearTimeout(closeTimerRef.current)
  }, [])

  const handleMenuLeave = useCallback(() => {
    clearTimeout(openTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
      setActiveL1(null)
      setHoverPath([])
    }, 250)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen])

  const panelWidth = 300
  const totalWidth = 320 + (activeL1 ? 340 : 0) + drillPanels.length * panelWidth

  const mobileTop = mobileStack.length > 0 ? mobileStack[mobileStack.length - 1] : null
  const mobileChildren: CategoryNode[] = mobileTop ? getChildren(mobileTop.handle) : l1Nodes

  return (
    <div ref={menuRef} className="relative" onMouseLeave={handleMenuLeave}>
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setActiveL1(null)
          setHoverPath([])
          setMobileStack([])
        }}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 px-3 py-1.5 text-white font-bold text-[14px] rounded-md hover:bg-white/10 transition-colors"
      >
        {isOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        <span className="hidden sm:inline">{loc === "et" ? "Kategooriad" : "Categories"}</span>
      </button>

      {isOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsOpen(false)} />}

      {/* Desktop mega menu */}
      {isOpen && (
        <div
          className="hidden md:block absolute z-50 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
          style={{
            top: "100%",
            left: 0,
            width: `${totalWidth}px`,
            maxWidth: "calc(100vw - 48px)",
          }}
          onMouseEnter={handleMenuEnter}
        >
          <div className="flex overflow-x-auto">
            {/* L1 column */}
            <div className="w-[320px] py-3 max-h-[calc(100vh-140px)] overflow-y-auto flex-shrink-0 border-r border-[#ECEEF1]">
              <h3 className="px-5 pb-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                {loc === "et" ? "Kategooriad" : "Shop by Category"}
              </h3>
              {l1Nodes.map((l1) => {
                const Icon = V3_ICONS[l1.handle]
                const isActive = activeL1?.handle === l1.handle
                return (
                  <Link
                    key={l1.handle}
                    href={categoryPath(loc, l1.handle)}
                    onMouseEnter={() => handleL1Hover(l1)}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-5 py-[9px] text-[13px] transition-colors ${
                      isActive ? "bg-[#FFF8F3] text-[#D97706]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {Icon && (
                      <Icon
                        size={18}
                        strokeWidth={1.4}
                        style={{ color: isActive ? "#D97706" : "#94A3B8" }}
                        className="flex-shrink-0"
                      />
                    )}
                    <span className="font-medium flex-1 truncate">{nodeName(l1, loc)}</span>
                    <ChevronRight
                      size={13}
                      style={{ color: isActive ? "#D97706" : "#CBD5E1" }}
                      className="flex-shrink-0"
                    />
                  </Link>
                )
              })}
            </div>

            {/* L2 column */}
            {activeL1 && (
              <div className="w-[340px] py-3 max-h-[calc(100vh-140px)] overflow-y-auto flex-shrink-0 border-r border-[#ECEEF1]">
                <Link
                  href={categoryPath(loc, activeL1.handle)}
                  onClick={() => setIsOpen(false)}
                  className="block px-5 py-2 text-[11px] font-bold text-[#D97706] uppercase tracking-wider border-b border-[#ECEEF1] mb-1 hover:underline"
                >
                  {loc === "et"
                    ? `Kõik: ${nodeName(activeL1, loc)}`
                    : `Shop All ${nodeName(activeL1, loc)}`}
                </Link>
                {activeL2.map((l2) => {
                  const isActive = hoverPath[0]?.handle === l2.handle
                  const hasKids = getChildren(l2.handle).length > 0
                  return (
                    <Link
                      key={l2.handle}
                      href={categoryPath(loc, l2.handle)}
                      onMouseEnter={() => handleL2Hover(l2)}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-5 py-[7px] transition-colors ${
                        isActive ? "bg-[#FFF8F3] text-[#D97706]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <CategoryThumb handle={l2.handle} node={l2} size={32} alt="" />
                      <span className="flex-1 leading-tight text-[13px] font-medium">
                        {nodeName(l2, loc)}
                      </span>
                      {hasKids && (
                        <ChevronRight
                          size={12}
                          style={{ color: isActive ? "#D97706" : "#CBD5E1" }}
                          className="flex-shrink-0"
                        />
                      )}
                    </Link>
                  )
                })}
              </div>
            )}

            {/* L3+ drill-down panels (recursive, N-level) */}
            {drillPanels.map((nodes, panelIdx) => {
              const isLastPanel = panelIdx === drillPanels.length - 1
              const parent = hoverPath[panelIdx]
              return (
                <div
                  key={panelIdx}
                  className={`py-3 max-h-[calc(100vh-140px)] overflow-y-auto flex-shrink-0 ${!isLastPanel ? "border-r border-[#ECEEF1]" : ""}`}
                  style={{ width: panelWidth }}
                >
                  {parent && (
                    <Link
                      href={categoryPath(loc, parent.handle)}
                      onClick={() => setIsOpen(false)}
                      className="block px-5 py-2 text-[11px] font-bold text-[#D97706] uppercase tracking-wider border-b border-[#ECEEF1] mb-1 hover:underline"
                    >
                      {loc === "et"
                        ? `Kõik: ${nodeName(parent, loc)}`
                        : `Shop All ${nodeName(parent, loc)}`}
                    </Link>
                  )}
                  {nodes.map((node) => {
                    const isActive = hoverPath[panelIdx + 1]?.handle === node.handle
                    const hasKids = getChildren(node.handle).length > 0
                    return (
                      <Link
                        key={node.handle}
                        href={categoryPath(loc, node.handle)}
                        onMouseEnter={() => handleDeepHover(node, panelIdx)}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-5 py-[7px] text-[13px] transition-colors ${
                          isActive ? "bg-[#FFF8F3] text-[#D97706]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <CategoryThumb handle={node.handle} node={node} size={28} alt="" />
                        <span className="font-medium flex-1 truncate">{nodeName(node, loc)}</span>
                        {hasKids && (
                          <ChevronRight
                            size={12}
                            style={{ color: isActive ? "#D97706" : "#CBD5E1" }}
                            className="flex-shrink-0"
                          />
                        )}
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mobile full-screen drill-down */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 h-[56px] border-b border-[#E2E8F0] bg-[#1E293B] flex-shrink-0">
            {mobileStack.length > 0 ? (
              <button
                onClick={() => setMobileStack((s) => s.slice(0, -1))}
                className="flex items-center gap-2 text-white font-medium text-[15px] min-h-[44px]"
              >
                <ChevronLeft size={20} />
                {loc === "et" ? "Tagasi" : "Back"}
              </button>
            ) : (
              <span className="text-white font-bold text-[16px]">
                {loc === "et" ? "Kategooriad" : "Categories"}
              </span>
            )}
            <button
              onClick={() => {
                setIsOpen(false)
                setMobileStack([])
              }}
              className="w-11 h-11 flex items-center justify-center text-white"
            >
              <X size={20} />
            </button>
          </div>

          {mobileTop && (
            <Link
              href={categoryPath(loc, mobileTop.handle)}
              onClick={() => {
                setIsOpen(false)
                setMobileStack([])
              }}
              className="block px-4 py-3.5 text-[14px] font-bold text-[#D97706] border-b border-[#E2E8F0] bg-[#FFFBEB]"
            >
              {loc === "et"
                ? `Kõik: ${nodeName(mobileTop, loc)}`
                : `View All ${nodeName(mobileTop, loc)}`}{" "}
              &rarr;
            </Link>
          )}

          <div className="flex-1 overflow-y-auto">
            {!mobileTop &&
              mobileChildren.map((l1) => {
                const Icon = V3_ICONS[l1.handle]
                return (
                  <button
                    key={l1.handle}
                    onClick={() => setMobileStack([l1])}
                    className="w-full flex items-center justify-between pl-4 pr-4 min-h-[52px] text-[15px] text-[#1E293B] font-medium border-b border-[#F1F5F9] active:bg-[#FFFBEB] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      {Icon && <Icon size={20} strokeWidth={1.4} className="text-[#94A3B8]" />}
                      <span>{nodeName(l1, loc)}</span>
                    </span>
                    <ChevronRight size={16} className="text-[#CBD5E1]" />
                  </button>
                )
              })}

            {mobileTop &&
              mobileChildren.map((child) => {
                const hasKids = getChildren(child.handle).length > 0
                if (hasKids) {
                  return (
                    <button
                      key={child.handle}
                      onClick={() => setMobileStack((s) => [...s, child])}
                      className="w-full flex items-center justify-between pl-4 pr-4 min-h-[56px] text-[14px] font-medium text-[#1E293B] border-b border-[#F1F5F9] active:bg-[#FFFBEB] transition-colors"
                    >
                      <span className="flex items-center flex-1 text-left gap-3">
                        <CategoryThumb handle={child.handle} node={child} size={36} alt="" />
                        <span className="flex-1">{nodeName(child, loc)}</span>
                      </span>
                      <ChevronRight size={16} className="text-[#CBD5E1] flex-shrink-0 ml-2" />
                    </button>
                  )
                }
                return (
                  <Link
                    key={child.handle}
                    href={categoryPath(loc, child.handle)}
                    onClick={() => {
                      setIsOpen(false)
                      setMobileStack([])
                    }}
                    className="pl-4 pr-4 min-h-[56px] text-[14px] font-medium text-[#1E293B] border-b border-[#F1F5F9] active:bg-[#FFFBEB] active:text-[#D97706] transition-colors flex items-center gap-3"
                  >
                    <CategoryThumb handle={child.handle} node={child} size={36} alt="" />
                    <span className="flex-1">{nodeName(child, loc)}</span>
                  </Link>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
