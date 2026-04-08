"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Menu,
  X,
  ChevronRight,
  Leaf,
  Wrench,
  Car,
  Building2,
  Cog,
  Factory,
  Dumbbell,
  House,
  UtensilsCrossed,
  HeartPulse,
  Zap,
  PawPrint,
  WashingMachine,
  Pipette,
  Snowflake,
  Archive,
  Armchair,
  Lightbulb,
  Sparkles,
  DoorOpen,
  Droplets,
  PaintRoller,
  ShieldCheck,
  Layers,
  Music,
  Tent,
  Shirt,
  Gift,
  Grid3X3,
  type LucideIcon,
} from "lucide-react"

export type CategoryNode = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
  children: CategoryNode[]
}

// L1 categories mapped to Medusa category handles
const L1_CATEGORIES: { name: string; Icon: LucideIcon; handle: string }[] = [
  { name: "Lawn & Garden", Icon: Leaf, handle: "kodu-ja-aed" },
  { name: "Tools", Icon: Wrench, handle: "toostus-ja-seadmed" },
  { name: "Automotive", Icon: Car, handle: "auto-ja-garaaz" },
  { name: "Building & Construction", Icon: Building2, handle: "ehitus-ja-remont" },
  { name: "Hardware", Icon: Cog, handle: "ehitus-ja-remont" },
  { name: "Industrial & Scientific", Icon: Factory, handle: "toostus-ja-seadmed" },
  { name: "Sports & Outdoors", Icon: Dumbbell, handle: "sport-ja-vaba-aeg" },
  { name: "Home", Icon: House, handle: "kodu-ja-aed" },
  { name: "Kitchen & Dining", Icon: UtensilsCrossed, handle: "toitlustus-ja-kook" },
  { name: "Health & Household", Icon: HeartPulse, handle: "meditsiin-ja-tervishoid" },
  { name: "Electrical", Icon: Zap, handle: "elektroonika" },
  { name: "Pet Supplies", Icon: PawPrint, handle: "lemmikloomad" },
  { name: "Appliances", Icon: WashingMachine, handle: "kodu-ja-aed" },
  { name: "Plumbing", Icon: Pipette, handle: "ehitus-ja-remont" },
  { name: "Heating, Venting & Cooling", Icon: Snowflake, handle: "kodu-ja-aed" },
  { name: "Storage & Organization", Icon: Archive, handle: "kontor-ja-ladustamine" },
  { name: "Furniture", Icon: Armchair, handle: "kodu-ja-aed" },
  { name: "Lighting", Icon: Lightbulb, handle: "kodu-ja-aed" },
  { name: "Cleaning", Icon: Sparkles, handle: "kodu-ja-aed" },
  { name: "Doors & Windows", Icon: DoorOpen, handle: "ehitus-ja-remont" },
  { name: "Bath", Icon: Droplets, handle: "kodu-ja-aed" },
  { name: "Paint", Icon: PaintRoller, handle: "ehitus-ja-remont" },
  { name: "Safety Equipment", Icon: ShieldCheck, handle: "toostus-ja-seadmed" },
  { name: "Flooring", Icon: Layers, handle: "ehitus-ja-remont" },
  { name: "Musical Instruments", Icon: Music, handle: "sport-ja-vaba-aeg" },
  { name: "Playground Sets", Icon: Tent, handle: "sport-ja-vaba-aeg" },
  { name: "Workwear", Icon: Shirt, handle: "toostus-ja-seadmed" },
  { name: "Holiday Decorations", Icon: Gift, handle: "kodu-ja-aed" },
]

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

/** Small circle with grid icon used as placeholder thumbnail for L2/L3 items */
function SubcategoryIcon({ active }: { active?: boolean }) {
  return (
    <span
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: 24,
        height: 24,
        backgroundColor: active ? "#FFFBEB" : "#F1F5F9",
      }}
    >
      <Grid3X3
        size={12}
        strokeWidth={1.5}
        style={{ color: active ? "#D97706" : "#94A3B8" }}
      />
    </span>
  )
}

export default function MegaMenu({ categories, locale = "et" }: { categories: CategoryNode[]; locale?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeL1, setActiveL1] = useState<string | null>(null)
  const [activeL2, setActiveL2] = useState<string | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const openTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const menuRef = useRef<HTMLDivElement>(null)

  const tree = buildCategoryTree(categories)

  // Build handle->node lookup from category tree
  const handleMap = new Map<string, CategoryNode>()
  tree.forEach(node => handleMap.set(node.handle, node))

  // Map L1 display items to category nodes by handle
  const l1Mapped = L1_CATEGORIES.map(l1 => ({
    ...l1,
    node: handleMap.get(l1.handle),
  })).filter(l1 => l1.node)

  const activeL1Item = l1Mapped.find(l => l.name === activeL1)
  const activeL1Node = activeL1Item?.node
  const activeL2Node = activeL1Node?.children.find(c => c.id === activeL2)
  const hasL2 = activeL1Node ? activeL1Node.children.length > 0 : false

  const handleL1Hover = useCallback((name: string) => {
    clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      setActiveL1(name)
      setActiveL2(null)
    }, 150)
  }, [])

  const handleL2Hover = useCallback((id: string) => {
    clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      setActiveL2(id)
    }, 150)
  }, [])

  // Cleanup timers on unmount
  useEffect(() => () => {
    clearTimeout(hoverTimerRef.current)
    clearTimeout(openTimerRef.current)
    clearTimeout(closeTimerRef.current)
  }, [])

  // Hover open/close handlers for the trigger button and menu area
  const handleTriggerEnter = useCallback(() => {
    clearTimeout(closeTimerRef.current)
    openTimerRef.current = setTimeout(() => {
      setIsOpen(true)
      if (!activeL1 && l1Mapped.length > 0) {
        setActiveL1(l1Mapped[0].name)
      }
    }, 200)
  }, [l1Mapped, activeL1])

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

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener("keydown", handler)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen])

  const handleOpen = () => {
    setIsOpen(!isOpen)
    setActiveL1(null)
    setActiveL2(null)
  }

  return (
    <div ref={menuRef} className="relative" onMouseLeave={handleMenuLeave}>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 px-4 h-[44px] text-white font-bold text-[14px] hover:bg-[#B45309] transition-colors"
      >
        {isOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        <span className="hidden sm:inline">Categories</span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-40" style={{ top: 0 }} onClick={() => setIsOpen(false)} />
      )}

      {/* Desktop mega-menu */}
      {isOpen && (
        <div className="hidden md:block absolute z-50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.15)]" style={{ top: "100%", left: 0, width: hasL2 ? "auto" : "280px" }} onMouseEnter={handleMenuEnter}>
          <div className="flex">
            {/* L1 Panel */}
            <div className="w-[280px] border-r border-[#E2E8F0] py-4 max-h-[calc(100vh-120px)] overflow-y-auto flex-shrink-0">
              <h3 className="px-5 pb-3 text-[13px] font-bold text-[#1E293B] uppercase tracking-wide">
                Categories
              </h3>
              {l1Mapped.map(({ name, Icon, handle }) => {
                const isActive = activeL1 === name
                return (
                  <Link
                    key={name}
                    href={`/${locale}/kategooriad/${handle}`}
                    onMouseEnter={() => handleL1Hover(name)}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-5 py-2.5 text-[14px] transition-colors group ${
                      isActive ? "bg-[#FFFBEB] text-[#D97706]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        size={20}
                        strokeWidth={1.5}
                        className="flex-shrink-0 transition-colors"
                        style={{ color: isActive ? "#D97706" : "#64748B" }}
                      />
                      <span className="font-medium">{name}</span>
                    </span>
                    <ChevronRight
                      size={14}
                      className="flex-shrink-0 transition-colors"
                      style={{ color: isActive ? "#D97706" : "#CBD5E1" }}
                    />
                  </Link>
                )
              })}
            </div>

            {/* L2 Panel -- only if hovered L1 has children */}
            {hasL2 && activeL1Node && (
              <div className="w-[280px] border-r border-[#E2E8F0] py-4 max-h-[calc(100vh-120px)] overflow-y-auto flex-shrink-0">
                <Link
                  href={`/${locale}/kategooriad/${activeL1Node.handle}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-5 pb-3 text-[13px] font-bold text-[#D97706] uppercase tracking-wide hover:underline"
                >
                  Shop All {activeL1Node.name}
                </Link>
                {activeL1Node.children.map(child => {
                  const isActive = activeL2 === child.id
                  return (
                    <Link
                      key={child.id}
                      href={`/${locale}/kategooriad/${child.handle}`}
                      onMouseEnter={() => handleL2Hover(child.id)}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between px-5 py-2 text-[14px] transition-colors ${
                        isActive ? "bg-[#FFFBEB] text-[#D97706]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <SubcategoryIcon active={isActive} />
                        <span className="font-medium">{child.name}</span>
                      </span>
                      {child.children.length > 0 && (
                        <ChevronRight
                          size={14}
                          className="flex-shrink-0"
                          style={{ color: isActive ? "#D97706" : "#CBD5E1" }}
                        />
                      )}
                    </Link>
                  )
                })}
              </div>
            )}

            {/* L3 Panel */}
            {activeL2Node && activeL2Node.children.length > 0 && (
              <div className="w-[280px] py-4 max-h-[calc(100vh-120px)] overflow-y-auto flex-shrink-0">
                <Link
                  href={`/${locale}/kategooriad/${activeL2Node.handle}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-5 pb-3 text-[13px] font-bold text-[#D97706] uppercase tracking-wide hover:underline"
                >
                  Shop All {activeL2Node.name}
                </Link>
                {activeL2Node.children.map(child => (
                  <Link
                    key={child.id}
                    href={`/${locale}/kategooriad/${child.handle}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-5 py-2 text-[14px] text-[#1E293B] hover:bg-[#FFFBEB] hover:text-[#D97706] font-medium transition-colors"
                  >
                    <SubcategoryIcon />
                    <span>{child.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile full-screen menu */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
          {/* Mobile header */}
          <div className="flex items-center justify-between px-4 h-[56px] border-b border-[#E2E8F0] bg-[#1E293B] flex-shrink-0">
            <span className="text-white font-bold text-[16px]">Categories</span>
            <button onClick={() => setIsOpen(false)} className="w-10 h-10 flex items-center justify-center text-white">
              <X size={20} />
            </button>
          </div>

          {/* Mobile list */}
          <div className="flex-1 overflow-y-auto">
            {l1Mapped.map(({ name, Icon, handle }) => (
              <Link
                key={name}
                href={`/${locale}/kategooriad/${handle}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-4 py-3.5 text-[14px] text-[#1E293B] font-medium border-b border-[#E2E8F0] hover:bg-[#FFFBEB] hover:text-[#D97706] transition-colors group"
              >
                <span className="flex items-center gap-3">
                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    className="flex-shrink-0 transition-colors"
                    style={{ color: "#64748B" }}
                  />
                  <span>{name}</span>
                </span>
                <ChevronRight size={14} style={{ color: "#CBD5E1" }} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
