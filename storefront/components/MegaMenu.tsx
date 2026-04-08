"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { Menu, X, ChevronRight } from "lucide-react"

export type CategoryNode = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
  children: CategoryNode[]
}

// L1 categories mapped to Medusa category handles
const L1_CATEGORIES: { name: string; icon: string; handle: string }[] = [
  { name: "Lawn & Garden", icon: "🌱", handle: "kodu-ja-aed" },
  { name: "Tools", icon: "🔧", handle: "toostus-ja-seadmed" },
  { name: "Automotive", icon: "🚗", handle: "auto-ja-garaaz" },
  { name: "Building & Construction", icon: "🧱", handle: "ehitus-ja-remont" },
  { name: "Hardware", icon: "🔨", handle: "ehitus-ja-remont" },
  { name: "Industrial & Scientific", icon: "🏭", handle: "toostus-ja-seadmed" },
  { name: "Sports & Outdoors", icon: "⚽", handle: "sport-ja-vaba-aeg" },
  { name: "Home", icon: "🏠", handle: "kodu-ja-aed" },
  { name: "Kitchen & Dining", icon: "🍳", handle: "toitlustus-ja-kook" },
  { name: "Health & Household", icon: "💊", handle: "meditsiin-ja-tervishoid" },
  { name: "Electrical", icon: "⚡", handle: "elektroonika" },
  { name: "Pet Supplies", icon: "🐾", handle: "lemmikloomad" },
  { name: "Appliances", icon: "🏠", handle: "kodu-ja-aed" },
  { name: "Plumbing", icon: "🔩", handle: "ehitus-ja-remont" },
  { name: "Heating, Venting & Cooling", icon: "❄️", handle: "kodu-ja-aed" },
  { name: "Storage & Organization", icon: "📦", handle: "kontor-ja-ladustamine" },
  { name: "Furniture", icon: "🪑", handle: "kodu-ja-aed" },
  { name: "Lighting", icon: "💡", handle: "kodu-ja-aed" },
  { name: "Cleaning", icon: "🧹", handle: "kodu-ja-aed" },
  { name: "Doors & Windows", icon: "🚪", handle: "ehitus-ja-remont" },
  { name: "Bath", icon: "🚿", handle: "kodu-ja-aed" },
  { name: "Paint", icon: "🎨", handle: "ehitus-ja-remont" },
  { name: "Safety Equipment", icon: "🦺", handle: "toostus-ja-seadmed" },
  { name: "Flooring", icon: "🏗️", handle: "ehitus-ja-remont" },
  { name: "Musical Instruments", icon: "🎸", handle: "sport-ja-vaba-aeg" },
  { name: "Playground Sets", icon: "🎪", handle: "sport-ja-vaba-aeg" },
  { name: "Workwear", icon: "👷", handle: "toostus-ja-seadmed" },
  { name: "Holiday Decorations", icon: "🎄", handle: "kodu-ja-aed" },
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

export default function MegaMenu({ categories, locale = "et" }: { categories: CategoryNode[]; locale?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeL1, setActiveL1] = useState<string | null>(null)
  const [activeL2, setActiveL2] = useState<string | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const menuRef = useRef<HTMLDivElement>(null)

  const tree = buildCategoryTree(categories)

  // Build handle→node lookup from category tree
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

  // Cleanup hover timer on unmount
  useEffect(() => () => clearTimeout(hoverTimerRef.current), [])

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
    <div ref={menuRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 px-4 h-[44px] text-white font-bold text-[14px] hover:bg-[#e55f00] transition-colors"
      >
        {isOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        <span className="hidden sm:inline">Kategooriad</span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-40" style={{ top: 0 }} onClick={() => setIsOpen(false)} />
      )}

      {/* Desktop mega-menu */}
      {isOpen && (
        <div className="hidden md:block absolute z-50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.15)]" style={{ top: "100%", left: 0, width: hasL2 ? "auto" : "280px" }}>
          <div className="flex">
            {/* L1 Panel */}
            <div className="w-[280px] border-r border-[#E5E5E5] py-4 max-h-[calc(100vh-120px)] overflow-y-auto flex-shrink-0">
              <h3 className="px-5 pb-3 text-[13px] font-bold text-[#222] uppercase tracking-wide">
                Kategooriad
              </h3>
              {l1Mapped.map(({ name, icon, handle }) => (
                <Link
                  key={name}
                  href={`/${locale}/kategooriad/${handle}`}
                  onMouseEnter={() => handleL1Hover(name)}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-between px-5 py-2.5 text-[14px] transition-colors group ${
                    activeL1 === name ? "bg-[#FFF5EE] text-[#FF6A00]" : "text-[#333] hover:bg-[#F9F9F9]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-[16px] w-5 text-center">{icon}</span>
                    <span className="font-medium">{name}</span>
                  </span>
                </Link>
              ))}
            </div>

            {/* L2 Panel — only if hovered L1 has children */}
            {hasL2 && activeL1Node && (
              <div className="w-[280px] border-r border-[#E5E5E5] py-4 max-h-[calc(100vh-120px)] overflow-y-auto flex-shrink-0">
                <Link
                  href={`/${locale}/kategooriad/${activeL1Node.handle}`}
                  onClick={() => setIsOpen(false)}
                  className="px-5 pb-3 text-[13px] font-bold text-[#FF6A00] uppercase tracking-wide block hover:underline"
                >
                  {activeL1Node.name}
                </Link>
                {activeL1Node.children.map(child => (
                  <Link
                    key={child.id}
                    href={`/${locale}/kategooriad/${child.handle}`}
                    onMouseEnter={() => handleL2Hover(child.id)}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-5 py-2.5 text-[14px] transition-colors ${
                      activeL2 === child.id ? "bg-[#FFF5EE] text-[#FF6A00]" : "text-[#333] hover:bg-[#F9F9F9]"
                    }`}
                  >
                    <span className="font-medium">{child.name}</span>
                    {child.children.length > 0 && (
                      <ChevronRight size={14} className={`${activeL2 === child.id ? "text-[#FF6A00]" : "text-[#CCC]"}`} />
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* L3 Panel */}
            {activeL2Node && activeL2Node.children.length > 0 && (
              <div className="w-[280px] py-4 max-h-[calc(100vh-120px)] overflow-y-auto flex-shrink-0">
                <Link
                  href={`/${locale}/kategooriad/${activeL2Node.handle}`}
                  onClick={() => setIsOpen(false)}
                  className="px-5 pb-3 text-[13px] font-bold text-[#FF6A00] uppercase tracking-wide block hover:underline"
                >
                  {activeL2Node.name}
                </Link>
                {activeL2Node.children.map(child => (
                  <Link
                    key={child.id}
                    href={`/${locale}/kategooriad/${child.handle}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center px-5 py-2.5 text-[14px] text-[#333] hover:bg-[#F9F9F9] hover:text-[#FF6A00] font-medium transition-colors"
                  >
                    {child.name}
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
          <div className="flex items-center justify-between px-4 h-[56px] border-b border-[#E5E5E5] bg-[#1A1A1A] flex-shrink-0">
            <span className="text-white font-bold text-[16px]">Kategooriad</span>
            <button onClick={() => setIsOpen(false)} className="w-10 h-10 flex items-center justify-center text-white">
              <X size={20} />
            </button>
          </div>

          {/* Mobile list */}
          <div className="flex-1 overflow-y-auto">
            {l1Mapped.map(({ name, icon, handle }) => (
              <Link
                key={name}
                href={`/${locale}/kategooriad/${handle}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-3.5 text-[14px] text-[#333] font-medium border-b border-[#F0F0F0] hover:bg-[#F9F9F9]"
              >
                <span className="flex items-center gap-3">
                  <span className="text-[16px] w-5 text-center">{icon}</span>
                  {name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
