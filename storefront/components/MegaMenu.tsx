"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { usePathname } from "next/navigation"
import Link from "@/components/SafeLink"
import { categoryPath } from "@/lib/i18n"
import { Menu, X, ChevronRight, ChevronLeft } from "lucide-react"
import { V3_ICONS } from "@/lib/taxonomy-v3"
import CategoryThumb from "@/components/CategoryThumb"
import type { MenuNode } from "@/lib/menu-data"

/**
 * MegaMenu — N-level category drill-down.
 *
 * PERF-C1 (2026-04-20): no longer imports category-tree.generated.json.
 * L1 + L2 data comes via menuData prop (server-computed ~30KB slice).
 * L3+ is fetched lazily from /api/category-children on user hover.
 *
 * Single source of truth: category-tree.generated.json (from taxonomy.yaml).
 * No more subSlugs arrays, no more THUMB_OVERRIDES indirection, no more
 * DB /api/header-categories fetch. Everything is SSoT-bound.
 *
 * Structure:
 *   Column 1: L1 list (18, V3_ICONS for icons)
 *   Column 2: L2 list for active L1 (CategoryThumb per row)
 *   Column 3+: L3+ panels when the active L2 node has children (lazy-fetched)
 *
 * Spec: 2026-04-18 §3.5
 */

interface MegaMenuProps {
  locale?: string
  variant?: "light" | "dark"
  menuData: {
    l1: MenuNode[]
    l2ByL1: Record<string, MenuNode[]>
  }
}

// Cache for lazily-fetched children: handle -> MenuNode[]
// Shared across MegaMenu instances (singleton per page lifetime).
const childrenCache = new Map<string, MenuNode[]>()

async function fetchChildren(handle: string): Promise<MenuNode[]> {
  if (childrenCache.has(handle)) return childrenCache.get(handle)!
  try {
    const res = await fetch(`/api/category-children?handle=${encodeURIComponent(handle)}`)
    if (!res.ok) return []
    const data = await res.json()
    const children: MenuNode[] = data.children ?? []
    childrenCache.set(handle, children)
    return children
  } catch {
    return []
  }
}

export default function MegaMenu({ locale = "en", menuData }: MegaMenuProps) {
  const loc = locale as "et" | "en"
  const pathname = usePathname() ?? ""
  // Active when on /kategooriad indeks or any /kategooriad/X page.
  const isCategoriesActive = /^\/(?:et|en)\/kategooriad(?:\/|$)/.test(pathname)
  const [isOpen, setIsOpen] = useState(false)
  const [activeL1, setActiveL1] = useState<MenuNode | null>(null)
  // hoverPath[i] = node whose children are rendered as the (i+2)-th column.
  // hoverPath[0] = L2 node (its children are the L3 panel), etc.
  const [hoverPath, setHoverPath] = useState<MenuNode[]>([])
  const [mobileStack, setMobileStack] = useState<MenuNode[]>([])

  // Lazily-fetched children for drill panels (L3+).
  // Key: parent handle → children array.
  const [drillChildren, setDrillChildren] = useState<Record<string, MenuNode[]>>({})

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const openTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const menuRef = useRef<HTMLDivElement>(null)

  const l1Nodes = menuData.l1

  const activeL2: MenuNode[] = useMemo(() => {
    if (!activeL1) return []
    return menuData.l2ByL1[activeL1.handle] ?? []
  }, [activeL1, menuData.l2ByL1])

  // For each node in hoverPath, resolve its children (from cache or lazy fetch).
  // drillPanels[i] = children of hoverPath[i]
  const drillPanels: MenuNode[][] = useMemo(() => {
    return hoverPath
      .map((n) => drillChildren[n.handle] ?? [])
      .filter((children) => children.length > 0)
  }, [hoverPath, drillChildren])

  const shouldDrill = useCallback((node: MenuNode): boolean => {
    if (!node.has_children) return false
    const kids = drillChildren[node.handle]
    if (kids !== undefined && kids.length === 0) return false
    // has_children=true but not yet fetched — assume drillable until fetch.
    return true
  }, [drillChildren])

  // Pre-fetch children for a node and update drillChildren state.
  const prefetchChildren = useCallback(async (node: MenuNode) => {
    if (!node.has_children) return
    if (childrenCache.has(node.handle)) {
      const kids = childrenCache.get(node.handle)!
      setDrillChildren((prev) => {
        if (prev[node.handle] === kids) return prev
        return { ...prev, [node.handle]: kids }
      })
      return
    }
    const kids = await fetchChildren(node.handle)
    setDrillChildren((prev) => ({ ...prev, [node.handle]: kids }))
  }, [])

  // Mobile drill: fetch children when navigating into a node.
  const [mobileChildren, setMobileChildren] = useState<MenuNode[]>([])
  const mobileTop = mobileStack.length > 0 ? mobileStack[mobileStack.length - 1] : null

  useEffect(() => {
    if (!isOpen) return
    if (!mobileTop) {
      setMobileChildren(l1Nodes)
      return
    }
    // Fetch L2+ children for the current mobile drill level.
    const top = mobileTop
    if (mobileTop.level === 1) {
      setMobileChildren(menuData.l2ByL1[mobileTop.handle] ?? [])
      return
    }
    // L2+ — need lazy fetch.
    if (childrenCache.has(top.handle)) {
      setMobileChildren(childrenCache.get(top.handle)!)
      return
    }
    fetchChildren(top.handle).then((kids) => {
      setMobileChildren(kids)
    })
  }, [mobileTop, isOpen, l1Nodes, menuData.l2ByL1])

  const handleL1Hover = useCallback((l1: MenuNode) => {
    clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      setActiveL1(l1)
      setHoverPath([])
    }, 60)
  }, [])

  const handleL2Hover = useCallback(
    (l2: MenuNode) => {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = setTimeout(async () => {
        if (l2.has_children) {
          await prefetchChildren(l2)
          setHoverPath([l2])
        } else {
          setHoverPath([])
        }
      }, 80)
    },
    [prefetchChildren]
  )

  const handleDeepHover = useCallback(
    (node: MenuNode, depth: number) => {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = setTimeout(async () => {
        if (!node.has_children) {
          setHoverPath((prev) => prev.slice(0, depth + 1))
          return
        }
        await prefetchChildren(node)
        setHoverPath((prev) => {
          const updated = [...prev.slice(0, depth + 1), node]
          return updated
        })
      }, 80)
    },
    [prefetchChildren]
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

  // a11y: Escape closes, ArrowLeft/Right between L1 items, ArrowDown opens
  // panel, ArrowUp closes the panel. Focus trap: Tab/Shift+Tab cycles within
  // the open menu until Escape is pressed.
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
        setActiveL1(null)
        setHoverPath([])
        return
      }

      const root = menuRef.current
      if (!root) return

      const isTab = e.key === "Tab"
      if (isTab) {
        // Focus trap — cycle through focusable elements inside the menu.
        const focusables = root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (!active || !root.contains(active)) {
          e.preventDefault()
          first.focus()
          return
        }
        if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
        return
      }

      const active = document.activeElement as HTMLElement | null
      if (!active || !root.contains(active)) return
      const l1Item = active.closest<HTMLElement>('[data-mega-l1="true"]')

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if (!l1Item) return
        e.preventDefault()
        const l1List = root.querySelectorAll<HTMLElement>('[data-mega-l1="true"]')
        const arr = Array.from(l1List)
        const idx = arr.indexOf(l1Item)
        if (idx < 0) return
        const nextIdx =
          e.key === "ArrowRight"
            ? Math.min(arr.length - 1, idx + 1)
            : Math.max(0, idx - 1)
        const target = arr[nextIdx]
        if (target) {
          target.focus()
          const handle = target.getAttribute("data-l1-handle")
          if (handle) {
            const node = l1Nodes.find((n) => n.handle === handle) ?? null
            if (node) {
              setActiveL1(node)
              setHoverPath([])
            }
          }
        }
        return
      }

      if (e.key === "ArrowDown") {
        if (l1Item && activeL1) {
          e.preventDefault()
          const firstL2 = root.querySelector<HTMLElement>('[data-mega-l2="true"]')
          if (firstL2) firstL2.focus()
        }
        return
      }

      if (e.key === "ArrowUp") {
        if (!l1Item) {
          e.preventDefault()
          const currentL1 = root.querySelector<HTMLElement>(
            `[data-mega-l1="true"][data-l1-handle="${activeL1?.handle ?? ""}"]`
          )
          if (currentL1) currentL1.focus()
          else {
            const firstL1 = root.querySelector<HTMLElement>('[data-mega-l1="true"]')
            if (firstL1) firstL1.focus()
          }
        }
        return
      }
    }
    document.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [isOpen, activeL1, l1Nodes])

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

  function nodeName(node: MenuNode, nlocale?: string): string {
    const et = (node as { name_et?: string }).name_et
    if (nlocale === "et" && et) return et
    return node.name_en
  }

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
        className={`flex items-center gap-2 px-3 py-1.5 font-bold text-[14px] rounded-md hover:bg-white/10 transition-colors ${
          isCategoriesActive || isOpen ? "text-[#D97706]" : "text-white"
        }`}
      >
        {isOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        <span className="hidden sm:inline">Categories</span>
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
            <div
              className="w-[320px] py-3 max-h-[calc(100vh-140px)] overflow-y-auto flex-shrink-0 border-r border-[#ECEEF1]"
              role="menu"
              aria-orientation="vertical"
              aria-label="Categories"
            >
              <h3 className="px-5 pb-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Shop by Category
              </h3>
              {l1Nodes.map((l1) => {
                const Icon = V3_ICONS[l1.handle]
                const isActive = activeL1?.handle === l1.handle
                return (
                  <Link
                    key={l1.handle}
                    href={categoryPath(loc, l1.handle)}
                    onMouseEnter={() => handleL1Hover(l1)}
                    onFocus={() => handleL1Hover(l1)}
                    onClick={() => setIsOpen(false)}
                    role="menuitem"
                    data-mega-l1="true"
                    data-l1-handle={l1.handle}
                    aria-haspopup={(menuData.l2ByL1[l1.handle]?.length ?? 0) > 0 ? "true" : undefined}
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
              <div
                className="w-[340px] py-3 max-h-[calc(100vh-140px)] overflow-y-auto flex-shrink-0 border-r border-[#ECEEF1]"
                role="menu"
                aria-orientation="vertical"
                aria-label={nodeName(activeL1, loc)}
              >
                <Link
                  href={categoryPath(loc, activeL1.handle)}
                  onClick={() => setIsOpen(false)}
                  className="block px-5 py-2 text-[11px] font-bold text-[#D97706] uppercase tracking-wider border-b border-[#ECEEF1] mb-1 hover:underline"
                >
                  Shop All {nodeName(activeL1, loc)}
                </Link>
                {activeL2.map((l2) => {
                  const isActive = hoverPath[0]?.handle === l2.handle
                  const hasKids = l2.has_children
                  return (
                    <Link
                      key={l2.handle}
                      href={categoryPath(loc, l2.handle)}
                      onMouseEnter={() => handleL2Hover(l2)}
                      onFocus={() => handleL2Hover(l2)}
                      onClick={() => setIsOpen(false)}
                      role="menuitem"
                      data-mega-l2="true"
                      aria-haspopup={hasKids ? "true" : undefined}
                      className={`flex items-center gap-3 px-5 py-[7px] transition-colors ${
                        isActive ? "bg-[#FFF8F3] text-[#D97706]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <CategoryThumb
                        handle={l2.handle}
                        image_path={l2.image_path}
                        l1_handle={l2.l1_handle}
                        size={32}
                        alt=""
                      />
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

            {/* L3+ drill-down panels (recursive, N-level, lazy-fetched) */}
            {drillPanels.map((nodes, panelIdx) => {
              const isLastPanel = panelIdx === drillPanels.length - 1
              const parent = hoverPath[panelIdx]
              return (
                <div
                  key={panelIdx}
                  className={`py-3 max-h-[calc(100vh-140px)] overflow-y-auto flex-shrink-0 ${!isLastPanel ? "border-r border-[#ECEEF1]" : ""}`}
                  style={{ width: panelWidth }}
                  role="menu"
                  aria-orientation="vertical"
                  aria-label={parent ? nodeName(parent, loc) : undefined}
                >
                  {parent && (
                    <Link
                      href={categoryPath(loc, parent.handle)}
                      onClick={() => setIsOpen(false)}
                      className="block px-5 py-2 text-[11px] font-bold text-[#D97706] uppercase tracking-wider border-b border-[#ECEEF1] mb-1 hover:underline"
                    >
                      Shop All {nodeName(parent, loc)}
                    </Link>
                  )}
                  {nodes.map((node) => {
                    const isActive = hoverPath[panelIdx + 1]?.handle === node.handle
                    const hasKids = node.has_children
                    return (
                      <Link
                        key={node.handle}
                        href={categoryPath(loc, node.handle)}
                        onMouseEnter={() => handleDeepHover(node, panelIdx)}
                        onFocus={() => handleDeepHover(node, panelIdx)}
                        onClick={() => setIsOpen(false)}
                        role="menuitem"
                        aria-haspopup={hasKids ? "true" : undefined}
                        className={`flex items-center gap-3 px-5 py-[7px] text-[13px] transition-colors ${
                          isActive ? "bg-[#FFF8F3] text-[#D97706]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <CategoryThumb
                          handle={node.handle}
                          image_path={node.image_path}
                          l1_handle={node.l1_handle}
                          size={28}
                          alt=""
                        />
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
                Back
              </button>
            ) : (
              <span className="text-white font-bold text-[16px]">Categories</span>
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
              View All {nodeName(mobileTop, loc)} &rarr;
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
                const hasKids = child.has_children
                if (hasKids) {
                  return (
                    <button
                      key={child.handle}
                      onClick={() => setMobileStack((s) => [...s, child])}
                      className="w-full flex items-center justify-between pl-4 pr-4 min-h-[56px] text-[14px] font-medium text-[#1E293B] border-b border-[#F1F5F9] active:bg-[#FFFBEB] transition-colors"
                    >
                      <span className="flex items-center flex-1 text-left gap-3">
                        <CategoryThumb
                          handle={child.handle}
                          image_path={child.image_path}
                          l1_handle={child.l1_handle}
                          size={36}
                          alt=""
                        />
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
                    <CategoryThumb
                      handle={child.handle}
                      image_path={child.image_path}
                      l1_handle={child.l1_handle}
                      size={36}
                      alt=""
                    />
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
