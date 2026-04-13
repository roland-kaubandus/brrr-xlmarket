"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import categoryImagesData from "@/lib/category-images.json"
import { categoryPath } from "@/lib/i18n"
import {
  Menu, X, ChevronRight, ChevronLeft,
  Leaf, Wrench, Car, Building2, Cog, Factory, Dumbbell, House,
  UtensilsCrossed, HeartPulse, Zap, PawPrint, WashingMachine, Pipette,
  Snowflake, Archive, Armchair, Lightbulb, Sparkles, DoorOpen, Droplets,
  PaintRoller, ShieldCheck, Layers, Music, Tent, Shirt, Gift, Grid3X3,
  Home, Package, type LucideIcon,
} from "lucide-react"
import { MENU_ORDER } from "@/lib/menu-order"

export type CategoryNode = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
  children: CategoryNode[]
}

// L1 menu order — curated for xlmarket.store
// Icon mapping for L1 handles (new VEVOR XLSX taxonomy)
const ICON_MAP: Record<string, LucideIcon> = {
  "automotive": Car,
  "plumbing": Pipette,
  "sports-outdoors": Dumbbell,
  "tools": Wrench,
  "outdoors": Leaf,
  "building-materials": Building2,
  "industrial-scientific": Factory,
  "doors-windows": DoorOpen,
  "appliances": WashingMachine,
  "kitchen": UtensilsCrossed,
  "home-decor": Armchair,
  "flooring": Layers,
  "furniture": Armchair,
  "bath": Droplets,
  "storage-organization": Archive,
  "lumber-composites": Building2,
  "heating-venting-cooling": Snowflake,
  "electrical": Zap,
  "musical-instruments": Music,
  "paint": PaintRoller,
  "cleaning": Sparkles,
  "hardware": Cog,
  "safety-equipment": ShieldCheck,
  "health-and-wellness": HeartPulse,
  "other": Grid3X3,
  "lighting": Lightbulb,
  "window-treatments": Home,
  "playground-sets": Tent,
  "holiday-decorations": Gift,
  "workwear": Shirt,
  "smart-home": Zap,
}

function buildCategoryTree(categories: CategoryNode[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>()
  categories.forEach(c => map.set(c.id, { ...c, children: [] }))
  const roots: CategoryNode[] = []
  map.forEach(c => {
    if (c.parent_category_id && map.has(c.parent_category_id)) {
      map.get(c.parent_category_id)!.children.push(c)
    } else if (!c.parent_category_id) {
      roots.push(c)
    }
  })
  return roots
}

const catImages: Record<string, string> = categoryImagesData as Record<string, string>

export default function MegaMenu({ locale = "et" }: { locale?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeL1, setActiveL1] = useState<string | null>(null)
  const [activeL2, setActiveL2] = useState<string | null>(null)
  const [mobileStack, setMobileStack] = useState<CategoryNode[]>([])
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [categoryLoadError, setCategoryLoadError] = useState(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const openTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const menuRef = useRef<HTMLDivElement>(null)

  const loadCategories = useCallback(async () => {
    if (categories.length > 0 || loadingCategories) return
    setLoadingCategories(true)
    setCategoryLoadError(false)
    try {
      const res = await fetch("/api/header-categories", { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to load categories: ${res.status}`)
      const data = await res.json()
      setCategories(Array.isArray(data.categories) ? data.categories : [])
    } catch {
      setCategoryLoadError(true)
    } finally {
      setLoadingCategories(false)
    }
  }, [categories.length, loadingCategories])

  const tree = buildCategoryTree(categories)

  const orderMap = new Map<string, number>(MENU_ORDER.map((h, i) => [h, i]))

  const l1Roots = tree
    .filter(c => c.handle in ICON_MAP)
    .sort((a, b) => (orderMap.get(a.handle) ?? 999) - (orderMap.get(b.handle) ?? 999))

  const activeL1Node = l1Roots.find(c => c.id === activeL1) || null
  const activeL2Node = activeL1Node?.children.find(c => c.id === activeL2) || null

  const handleL1Hover = useCallback((id: string) => {
    clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      setActiveL1(id)
      setActiveL2(null)
    }, 150)
  }, [])

  const handleL2Hover = useCallback((id: string) => {
    clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => setActiveL2(id), 150)
  }, [])

  useEffect(() => () => {
    clearTimeout(hoverTimerRef.current)
    clearTimeout(openTimerRef.current)
    clearTimeout(closeTimerRef.current)
  }, [])

  const handleTriggerEnter = useCallback(() => {
    clearTimeout(closeTimerRef.current)
    void loadCategories()
    openTimerRef.current = setTimeout(() => {
      setIsOpen(true)
      if (!activeL1 && l1Roots.length > 0) setActiveL1(l1Roots[0].id)
    }, 200)
  }, [l1Roots, activeL1, loadCategories])

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
      setActiveL2(null)
    }, 200)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false) }
    document.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = "" }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && categories.length > 0 && !activeL1 && l1Roots.length > 0) {
      setActiveL1(l1Roots[0].id)
    }
  }, [isOpen, categories.length, l1Roots, activeL1])

  const hasL2 = activeL1Node ? activeL1Node.children.length > 0 : false
  const hasL3 = activeL2Node ? activeL2Node.children.length > 0 : false
  const isTreeReady = categories.length > 0

  // Mobile drill-down
  const mobileCurrentNode = mobileStack.length > 0 ? mobileStack[mobileStack.length - 1] : null
  const mobileChildren = mobileCurrentNode ? mobileCurrentNode.children : l1Roots

  return (
    <div ref={menuRef} className="relative" onMouseLeave={handleMenuLeave}>
      <button
        onClick={() => { void loadCategories(); setIsOpen(!isOpen); setActiveL1(null); setActiveL2(null); setMobileStack([]) }}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 px-4 h-[44px] text-white font-bold text-[14px] hover:bg-[#B45309] transition-colors"
      >
        {isOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        <span className="hidden sm:inline">{locale === "et" ? "Kategooriad" : "Categories"}</span>
      </button>

      {isOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsOpen(false)} />}

      {/* Desktop mega-menu */}
      {isOpen && (
        <div
          className="hidden md:block absolute z-50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.15)] rounded-b-lg"
          style={{ top: "100%", left: 0, width: hasL3 ? "840px" : hasL2 ? "560px" : "280px" }}
          onMouseEnter={handleMenuEnter}
        >
          {!isTreeReady ? (
            <div className="w-[280px] p-5 text-[13px] text-[#64748B]">
              {loadingCategories ? (
                <div className="space-y-3">
                  <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
                  <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
                  <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
                  <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
                </div>
              ) : categoryLoadError ? (
                <div className="space-y-3">
                  <div className="font-semibold text-[#1E293B]">
                    {locale === "et" ? "Kategooriad ei laadinud" : "Categories failed to load"}
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadCategories()}
                    className="inline-flex items-center justify-center rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[12px] font-medium text-[#1E293B] hover:bg-[#F8FAFC]"
                  >
                    {locale === "et" ? "Proovi uuesti" : "Retry"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex">
              {/* L1 Panel */}
              <div className="w-[280px] border-r border-[#E2E8F0] py-3 max-h-[calc(100vh-120px)] overflow-y-auto flex-shrink-0">
                <h3 className="px-5 pb-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  {locale === "et" ? "Kategooriad" : "Shop by Categories"}
                </h3>
                {l1Roots.map((cat) => {
                  const isActive = activeL1 === cat.id
                  const Icon = ICON_MAP[cat.handle] || Grid3X3
                  return (
                    <Link
                      key={cat.id}
                      href={categoryPath(locale as "et" | "en", cat.handle)}
                      onMouseEnter={() => handleL1Hover(cat.id)}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between px-5 py-2 text-[13px] transition-colors ${
                        isActive ? "bg-[#FFFBEB] text-[#D97706]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon size={18} strokeWidth={1.5} style={{ color: isActive ? "#D97706" : "#94A3B8" }} className="flex-shrink-0" />
                        <span className="font-medium">{cat.name}</span>
                      </span>
                      {cat.children.length > 0 && (
                        <ChevronRight size={13} style={{ color: isActive ? "#D97706" : "#CBD5E1" }} className="flex-shrink-0" />
                      )}
                    </Link>
                  )
                })}
              </div>

              {/* L2 Panel */}
              {hasL2 && activeL1Node && (
                <div className="w-[280px] border-r border-[#E2E8F0] py-3 max-h-[calc(100vh-120px)] overflow-y-auto flex-shrink-0">
                  <Link
                    href={categoryPath(locale as "et" | "en", activeL1Node.handle)}
                    onClick={() => setIsOpen(false)}
                    className="block px-5 pb-2 text-[11px] font-bold text-[#D97706] uppercase tracking-wider hover:underline"
                  >
                    {locale === "et" ? `Kõik: ${activeL1Node.name}` : `Shop All ${activeL1Node.name}`}
                  </Link>
                  {activeL1Node.children.map(child => {
                    const isActive = activeL2 === child.id
                    const thumb = catImages[child.handle]
                    return (
                      <Link
                        key={child.id}
                        href={categoryPath(locale as "et" | "en", child.handle)}
                        onMouseEnter={() => handleL2Hover(child.id)}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-2.5 px-5 py-2 text-[13px] transition-colors ${
                          isActive ? "bg-[#FFFBEB] text-[#D97706]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {thumb && (
                          <img src={thumb} alt="" className="w-8 h-8 object-contain flex-shrink-0" loading="lazy" />
                        )}
                        <span className="font-medium flex-1">{child.name}</span>
                        {child.children.length > 0 && (
                          <ChevronRight size={13} style={{ color: isActive ? "#D97706" : "#CBD5E1" }} className="flex-shrink-0" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* L3 Panel */}
              {hasL3 && activeL2Node && (
                <div className="w-[280px] py-3 max-h-[calc(100vh-120px)] overflow-y-auto flex-shrink-0">
                  <Link
                    href={categoryPath(locale as "et" | "en", activeL2Node.handle)}
                    onClick={() => setIsOpen(false)}
                    className="block px-5 pb-2 text-[11px] font-bold text-[#D97706] uppercase tracking-wider hover:underline"
                  >
                    {locale === "et" ? `Kõik: ${activeL2Node.name}` : `Shop All ${activeL2Node.name}`}
                  </Link>
                  {activeL2Node.children.map(child => {
                    const thumb = catImages[child.handle]
                    return (
                      <Link
                        key={child.id}
                        href={categoryPath(locale as "et" | "en", child.handle)}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 px-5 py-2 text-[13px] text-[#1E293B] hover:bg-[#FFFBEB] hover:text-[#D97706] font-medium transition-colors"
                      >
                        {thumb && (
                          <img src={thumb} alt="" className="w-7 h-7 object-contain flex-shrink-0" loading="lazy" />
                        )}
                        <span>{child.name}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile full-screen menu with drill-down */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 h-[56px] border-b border-[#E2E8F0] bg-[#1E293B] flex-shrink-0">
            {mobileStack.length > 0 ? (
              <button onClick={() => setMobileStack(s => s.slice(0, -1))} className="flex items-center gap-2 text-white font-medium text-[15px] min-h-[44px]">
                <ChevronLeft size={20} />
                {locale === "et" ? "Tagasi" : "Back"}
              </button>
            ) : (
              <span className="text-white font-bold text-[16px]">{locale === "et" ? "Kategooriad" : "Categories"}</span>
            )}
            <button onClick={() => { setIsOpen(false); setMobileStack([]) }} className="w-11 h-11 flex items-center justify-center text-white">
              <X size={20} />
            </button>
          </div>

          {mobileCurrentNode && (
            <Link
              href={categoryPath(locale as "et" | "en", mobileCurrentNode.handle)}
              onClick={() => { setIsOpen(false); setMobileStack([]) }}
              className="block px-4 py-3.5 text-[14px] font-bold text-[#D97706] border-b border-[#E2E8F0] bg-[#FFFBEB]"
            >
              {locale === "et" ? `Kõik: ${mobileCurrentNode.name}` : `View All ${mobileCurrentNode.name}`} &rarr;
            </Link>
          )}

          <div className="flex-1 overflow-y-auto">
            {!isTreeReady ? (
              <div className="p-4 text-[13px] text-[#64748B]">
                {loadingCategories ? (
                  <div className="space-y-3">
                    <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
                    <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                    <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                    <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                  </div>
                ) : categoryLoadError ? (
                  <div className="space-y-3">
                    <div className="font-semibold text-[#1E293B]">
                      {locale === "et" ? "Kategooriad ei laadinud" : "Categories failed to load"}
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadCategories()}
                      className="inline-flex items-center justify-center rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[12px] font-medium text-[#1E293B] hover:bg-[#F8FAFC]"
                    >
                      {locale === "et" ? "Proovi uuesti" : "Retry"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : mobileChildren.map((cat) => {
              const Icon = ICON_MAP[cat.handle] || Grid3X3
              const hasKids = cat.children.length > 0
              const depth = mobileStack.length
              const thumb = catImages[cat.handle]
              const paddingLeft = depth === 0 ? "pl-4" : depth === 1 ? "pl-5" : "pl-6"

              return hasKids ? (
                <button
                  key={cat.id}
                  onClick={() => setMobileStack(s => [...s, cat])}
                  className={`w-full flex items-center justify-between ${paddingLeft} pr-4 min-h-[52px] text-[15px] text-[#1E293B] font-medium border-b border-[#F1F5F9] active:bg-[#FFFBEB] transition-colors`}
                >
                  <span className="flex items-center gap-3">
                    {depth === 0 && thumb ? (
                      <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-contain bg-[#F8FAFC] p-0.5" />
                    ) : depth === 0 ? (
                      <Icon size={20} strokeWidth={1.5} className="text-[#94A3B8]" />
                    ) : null}
                    <span>{cat.name}</span>
                  </span>
                  <ChevronRight size={16} className="text-[#CBD5E1]" />
                </button>
              ) : (
                <Link
                  key={cat.id}
                  href={categoryPath(locale as "et" | "en", cat.handle)}
                  onClick={() => { setIsOpen(false); setMobileStack([]) }}
                  className={`flex items-center gap-3 ${paddingLeft} pr-4 min-h-[52px] text-[15px] text-[#1E293B] font-medium border-b border-[#F1F5F9] active:bg-[#FFFBEB] active:text-[#D97706] transition-colors`}
                >
                  {depth === 0 && thumb ? (
                    <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-contain bg-[#F8FAFC] p-0.5" />
                  ) : depth === 0 ? (
                    <Icon size={20} strokeWidth={1.5} className="text-[#94A3B8]" />
                  ) : null}
                  <span>{cat.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
