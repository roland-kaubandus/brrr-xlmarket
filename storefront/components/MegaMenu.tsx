"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import Link from "@/components/SafeLink"
import { categoryPath } from "@/lib/i18n"
import { Menu, X, ChevronRight, ChevronLeft } from "lucide-react"
import { TAXONOMY_V3, V3_ICONS, type TaxonomyL1 } from "@/lib/taxonomy-v3"
import categoryImagesData from "@/lib/category-images.json"

const CAT_THUMBS = categoryImagesData as Record<string, string>

// Fallback thumbs for v3 curated subSlugs that don't have exact matches in the 3247-image library.
// Values are slugs into CAT_THUMBS.
const THUMB_OVERRIDES: Record<string, string> = {
  // v3 subSlugs missing direct matches
  "3d-printers": "cnc-milling-cutter",
  "metal-lathe": "lathes",
  "hydraulic-press": "hydraulic-pumps",
  "banner-display": "label-printer",
  "portable-power-stations": "solar-generators",
  "belt-sander": "belt-sanders",
  "chemical-transfer": "ac-fuel-transfer-pumps",
  "industrial-shelving": "shelving",
  "pipes-and-fittings": "pipe-fittings",
  "personal-protective-equipment": "disposable-protective-clothing",
  "safety-glasses": "safety-equipment",
  "facial-steamers": "personal-care-appliances",
  "lobby-furniture": "office-chairs",
  "interior-lighting": "lamps",
  "sports-equipment": "exercise-equipment",
  "cycling": "cycling-gear",
  "canopy-tents": "canopy-tent",
  "stage-lighting": "lamps",
  // v3 extras (slugified names)
  "cash-handling": "money-counter",
  "shrink-wrap-machines": "food-vacuum-sealers",
  "strapping-machines": "strapping-band",
  "carton-sealers": "continuous-sealing-machines",
  "badge-makers": "label-makers",
  "restaurant-furniture": "restaurant-shelving",
  "kitchen-hvac-and-air-curtains": "kitchen",
  "ice-machines": "refrigerators",
  "display-cases": "refrigerators",
  "bain-maries": "commercial-ovens",
  "cnc-spindles": "cnc-milling-cutter",
  "stepper-motors": "motors-parts",
  "controller-boards": "cnc-milling-cutter",
  "dust-collection": "vacuum-cleaners",
  "honeycomb-tables": "co2-laser-engraving-machine",
  "welding-wire-and-rods": "welding-kits",
  "sheet-metal-brakes": "hydraulic-pumps",
  "milling-machines": "cnc-milling-cutter",
  "deburring-tools": "angle-grinder",
  "metal-bandsaw": "saw-blades",
  "networking-and-electronics": "batteries",
  "distribution-boards": "electrical",
  "cable-management": "wiring-devices-light-controls",
  "transformers": "electrical",
  "inverters": "solar-generators",
  "table-saws": "woodworking-table-saws",
  "band-saws": "saw-blades",
  "planers": "routers-bits-accessories",
  "scroll-saws": "saw-blades",
  "doweling-jigs": "drill-press",
  "door-hardware-and-garage-doors": "door-hardware",
  "tile-cutters": "concrete-cement-masonry",
  "surveying-equipment": "measuring-rods",
  "safety-netting": "safety-equipment",
  "formwork": "concrete-cement-masonry",
  "sweepers": "vacuum-cleaners",
  "sanitizer-dispensers": "hand-dryers",
  "mop-systems": "floor-care",
  "window-cleaning": "floor-care",
  "air-fresheners": "hand-dryers",
  "impact-wrenches": "power-tools",
  "heat-guns": "power-tools",
  "rotary-tools": "power-tools",
  "clamps-and-vises": "hand-tools",
  "riveting-tools": "hand-tools",
  "flow-meters": "measuring-rods",
  "grease-guns": "oil-drains",
  "spill-containment": "drum-handling-equipment",
  "fuel-tanks": "ac-fuel-transfer-pumps",
  "hose-reels": "pressure-washers",
  "pet-and-livestock-supplies": "garden-fork",
  "log-splitters": "outdoor-power-equipment",
  "stump-grinders": "outdoor-power-equipment",
  "irrigation-systems": "garden-fork",
  "atv-accessories": "truck-accessories",
  "outdoor-and-yard-storage": "outdoor-decor",
  "winches": "engine-hoists",
  "lift-tables": "forklifts-attachments",
  "drum-handlers": "drum-handling-equipment",
  "conveyor-rollers": "industrial-shelving",
  "fireplaces-and-heating-appliances": "heaters",
  "thermostats": "heaters",
  "heat-exchangers": "heaters",
  "radiant-heaters": "heaters",
  "ceiling-fans": "fans",
  "kitchen-plumbing": "plumbing",
  "drain-cleaners": "plumbing",
  "water-tanks": "water-pumps",
  "pressure-regulators": "pipe-fittings",
  "expansion-vessels": "water-heaters",
  "ear-protection": "safety-equipment",
  "respiratory-masks": "safety-equipment",
  "first-aid-kits": "safety-equipment",
  "fire-extinguishers": "safety-equipment",
  "lockout-tagout": "door-locks",
  "rv-and-specialty-vehicle-supplies": "truck-accessories",
  "car-detailing-and-care": "truck-accessories",
  "tire-changers": "car-lifts",
  "wheel-balancers": "car-lifts",
  "brake-tools": "mechanics-tools",
  "waxing-equipment": "facial-steamers",
  "salon-trolleys": "barber-chairs",
  "towel-warmers": "personal-care-appliances",
  "sterilizers": "personal-care-appliances",
  "pedicure-chairs": "barber-chairs",
  "tv-mounts": "home-decor",
  "monitor-arms": "home-office-furniture",
  "desk-organizers": "home-office-furniture",
  "filing-cabinets": "home-office-furniture",
  "walkers-and-rollators": "mobility-aids",
  "hospital-beds": "medical-chairs",
  "exam-tables": "medical-chairs",
  "grab-bars": "bathroom-safety",
  "shower-seats": "bathroom-safety",
  "hunting-fishing-and-archery": "outdoor-hobbies",
  "bounce-houses": "trampolines",
  "dance-poles": "exercise-equipment",
  "boxing-bags": "exercise-equipment",
  "climbing-walls": "playground-outdoor-play",
  "marine-electronics": "boat-hardware",
  "boat-covers": "boat-hardware",
  "anchor-systems": "boat-hardware",
  "navigation-lights": "boat-hardware",
  "fishing-rod-holders": "outdoor-hobbies",
  "pa-systems": "stage-lighting",
  "dj-equipment": "stage-lighting",
  "microphones": "stage-lighting",
  "lighting-effects": "stage-lighting",
  "pool-tables": "game-room",
}

function thumbFor(slug: string): string | null {
  const direct = CAT_THUMBS[slug]
  if (direct) return direct
  const override = THUMB_OVERRIDES[slug]
  if (override && CAT_THUMBS[override]) return CAT_THUMBS[override]
  return null
}

interface DbCategory {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
}

interface TreeNode {
  name: string
  handle: string
  children: TreeNode[]
}

// L2 node built from v3 taxonomy (subs + extra merged)
interface L2Node {
  name: string
  slug: string         // used for hover drill + thumb lookup
  href: string         // navigation target (category page or search fallback)
  emphasized: boolean  // true for subs (top 6), false for extra
}

export default function MegaMenu({ locale = "et" }: { locale?: string; variant?: "light" | "dark" }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeL1, setActiveL1] = useState<TaxonomyL1 | null>(null)
  // hoverPath[0] = L2 node (v3 sub/extra), hoverPath[1+] = TreeNode (DB-backed L3+)
  const [hoverPath, setHoverPath] = useState<TreeNode[]>([])
  const [dbCats, setDbCats] = useState<DbCategory[]>([])
  const [mobileStack, setMobileStack] = useState<Array<{ kind: "l1"; node: TaxonomyL1 } | { kind: "sub"; node: TreeNode }>>([])
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const openTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const menuRef = useRef<HTMLDivElement>(null)

  // Load DB tree once for L3+ drill-down
  useEffect(() => {
    let cancelled = false
    fetch("/api/header-categories")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return
        setDbCats(Array.isArray(data.categories) ? data.categories : [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Build slug → TreeNode lookup for L3+ drill-down
  const treeBySlug = useMemo(() => {
    if (dbCats.length === 0) return new Map<string, TreeNode>()
    const byId = new Map<string, DbCategory>()
    dbCats.forEach((c) => byId.set(c.id, c))
    const childrenByParent = new Map<string | null, DbCategory[]>()
    dbCats.forEach((c) => {
      const arr = childrenByParent.get(c.parent_category_id) ?? []
      arr.push(c)
      childrenByParent.set(c.parent_category_id, arr)
    })
    const memo = new Map<string, TreeNode>()
    function build(c: DbCategory): TreeNode {
      const existing = memo.get(c.handle)
      if (existing) return existing
      const kids = (childrenByParent.get(c.id) ?? []).map(build)
      const node: TreeNode = { name: c.name, handle: c.handle, children: kids }
      memo.set(c.handle, node)
      return node
    }
    dbCats.forEach(build)
    return memo
  }, [dbCats])

  // L2 nodes for the active L1 (subs + extra merged, subs emphasized)
  const activeL2Nodes: L2Node[] = useMemo(() => {
    if (!activeL1) return []
    const out: L2Node[] = []
    activeL1.subs.forEach((name, idx) => {
      const slug = activeL1.subSlugs[idx] ?? activeL1.slug
      out.push({
        name,
        slug,
        href: categoryPath(locale as "et" | "en", slug),
        emphasized: true,
      })
    })
    activeL1.extra.forEach((name) => {
      // extras don't have curated slugs — slugify for drill/thumb lookup
      const candidate = name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      const hasDbNode = treeBySlug.has(candidate)
      const slug = hasDbNode ? candidate : (thumbFor(candidate) ? candidate : activeL1.slug)
      // If DB-backed → category page; otherwise search page with the exact extra name as query
      const href = hasDbNode
        ? categoryPath(locale as "et" | "en", candidate)
        : `/${locale}/otsing?q=${encodeURIComponent(name)}`
      out.push({ name, slug, href, emphasized: false })
    })
    return out
  }, [activeL1, treeBySlug, locale])

  // Panels for desktop drill: [L2 from v3, then L3+ from DB via hoverPath]
  const drillPanels: TreeNode[][] = useMemo(() => {
    if (!activeL1 || hoverPath.length === 0) return []
    const out: TreeNode[][] = []
    for (const node of hoverPath) {
      if (node.children.length > 0) out.push(node.children)
    }
    return out
  }, [activeL1, hoverPath])

  const handleL1Hover = useCallback((l1: TaxonomyL1) => {
    clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      setActiveL1(l1)
      setHoverPath([])
    }, 60)
  }, [])

  // Suppress noise panels: a drill that would show a single leaf child is redundant with the parent link
  const shouldDrill = useCallback((node: TreeNode): boolean => {
    if (node.children.length === 0) return false
    if (node.children.length === 1 && node.children[0].children.length === 0) return false
    return true
  }, [])

  const handleL2Hover = useCallback((slug: string) => {
    clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      const node = treeBySlug.get(slug)
      setHoverPath(node && shouldDrill(node) ? [node] : [])
    }, 80)
  }, [treeBySlug, shouldDrill])

  const handleDeepHover = useCallback((node: TreeNode, depth: number) => {
    clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      if (!shouldDrill(node)) {
        setHoverPath((prev) => prev.slice(0, depth + 1))
        return
      }
      setHoverPath((prev) => [...prev.slice(0, depth + 1), node])
    }, 80)
  }, [shouldDrill])

  useEffect(() => () => {
    clearTimeout(hoverTimerRef.current)
    clearTimeout(openTimerRef.current)
    clearTimeout(closeTimerRef.current)
  }, [])

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

  const mobileTop = mobileStack.length > 0 ? mobileStack[mobileStack.length - 1] : null
  const mobileChildren: Array<{ name: string; slug: string; href: string; hasKids: boolean; emphasized?: boolean }> = (() => {
    if (!mobileTop) {
      return TAXONOMY_V3.map((l1) => ({
        name: l1.name,
        slug: l1.slug,
        href: categoryPath(locale as "et" | "en", l1.slug),
        hasKids: true,
        emphasized: true,
      }))
    }
    if (mobileTop.kind === "l1") {
      const l1 = mobileTop.node
      const items: Array<{ name: string; slug: string; href: string; hasKids: boolean; emphasized: boolean }> = []
      l1.subs.forEach((n, i) => {
        const slug = l1.subSlugs[i] ?? l1.slug
        const node = treeBySlug.get(slug)
        items.push({
          name: n,
          slug,
          href: categoryPath(locale as "et" | "en", slug),
          hasKids: !!(node && node.children.length > 0),
          emphasized: true,
        })
      })
      l1.extra.forEach((n) => {
        const candidate = n.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        const node = treeBySlug.get(candidate)
        const slug = node ? candidate : (thumbFor(candidate) ? candidate : l1.slug)
        const href = node
          ? categoryPath(locale as "et" | "en", candidate)
          : `/${locale}/otsing?q=${encodeURIComponent(n)}`
        items.push({
          name: n,
          slug,
          href,
          hasKids: !!(node && node.children.length > 0),
          emphasized: false,
        })
      })
      return items
    }
    return mobileTop.node.children.map((c) => ({
      name: c.name,
      slug: c.handle,
      href: categoryPath(locale as "et" | "en", c.handle),
      hasKids: c.children.length > 0,
    }))
  })()

  const panelWidth = 280
  const totalWidth = 320 + (activeL1 ? 340 : 0) + drillPanels.length * panelWidth

  return (
    <div ref={menuRef} className="relative" onMouseLeave={handleMenuLeave}>
      <button
        onClick={() => { setIsOpen(!isOpen); setActiveL1(null); setHoverPath([]); setMobileStack([]) }}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 px-3 py-1.5 text-white font-bold text-[14px] rounded-md hover:bg-white/10 transition-colors"
      >
        {isOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        <span className="hidden sm:inline">{locale === "et" ? "Kategooriad" : "Categories"}</span>
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
            {/* L1 column (v3 taxonomy, icons only) */}
            <div className="w-[320px] py-3 max-h-[calc(100vh-140px)] overflow-y-auto flex-shrink-0 border-r border-[#ECEEF1]">
              <h3 className="px-5 pb-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                {locale === "et" ? "Kategooriad" : "Shop by Category"}
              </h3>
              {TAXONOMY_V3.map((l1) => {
                const Icon = V3_ICONS[l1.slug]
                const isActive = activeL1?.slug === l1.slug
                return (
                  <Link
                    key={l1.slug}
                    href={categoryPath(locale as "et" | "en", l1.slug)}
                    onMouseEnter={() => handleL1Hover(l1)}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-5 py-[9px] text-[13px] transition-colors ${
                      isActive ? "bg-[#FFF8F3] text-[#D97706]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {Icon && (
                      <Icon size={18} strokeWidth={1.4} style={{ color: isActive ? "#D97706" : "#94A3B8" }} className="flex-shrink-0" />
                    )}
                    <span className="font-medium flex-1 truncate">{l1.name}</span>
                    <ChevronRight size={13} style={{ color: isActive ? "#D97706" : "#CBD5E1" }} className="flex-shrink-0" />
                  </Link>
                )
              })}
            </div>

            {/* L2 column (v3 subs + extra, with thumbnails) */}
            {activeL1 && (
              <div className="w-[340px] py-3 max-h-[calc(100vh-140px)] overflow-y-auto flex-shrink-0 border-r border-[#ECEEF1]">
                <Link
                  href={categoryPath(locale as "et" | "en", activeL1.slug)}
                  onClick={() => setIsOpen(false)}
                  className="block px-5 py-2 text-[11px] font-bold text-[#D97706] uppercase tracking-wider border-b border-[#ECEEF1] mb-1 hover:underline"
                >
                  {locale === "et" ? `Kõik: ${activeL1.name}` : `Shop All ${activeL1.name}`}
                </Link>
                {activeL2Nodes.map((l2) => {
                  const isActive = hoverPath[0]?.handle === l2.slug
                  const thumb = thumbFor(l2.slug)
                  return (
                    <Link
                      key={l2.name}
                      href={l2.href}
                      onMouseEnter={() => handleL2Hover(l2.slug)}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-5 py-[7px] transition-colors ${
                        isActive ? "bg-[#FFF8F3] text-[#D97706]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span className="flex-shrink-0 w-8 h-8 rounded-md bg-[#F8FAFC] border border-[#ECEEF1] overflow-hidden flex items-center justify-center">
                        {thumb ? (
                          <img src={decodeURIComponent(thumb)} alt="" className="w-full h-full object-contain" loading="lazy" />
                        ) : null}
                      </span>
                      <span className="flex-1 leading-tight text-[13px] font-medium">
                        {l2.name}
                      </span>
                      <ChevronRight size={12} style={{ color: isActive ? "#D97706" : "#CBD5E1" }} className="flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}

            {/* L3+ drill-down panels from DB tree */}
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
                      href={categoryPath(locale as "et" | "en", parent.handle)}
                      onClick={() => setIsOpen(false)}
                      className="block px-5 py-2 text-[11px] font-bold text-[#D97706] uppercase tracking-wider border-b border-[#ECEEF1] mb-1 hover:underline"
                    >
                      {locale === "et" ? `Kõik: ${parent.name}` : `Shop All ${parent.name}`}
                    </Link>
                  )}
                  {nodes.map((node) => {
                    const isActive = hoverPath[panelIdx + 1]?.handle === node.handle
                    const thumb = thumbFor(node.handle)
                    return (
                      <Link
                        key={node.handle}
                        href={categoryPath(locale as "et" | "en", node.handle)}
                        onMouseEnter={() => handleDeepHover(node, panelIdx)}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-5 py-[7px] text-[13px] transition-colors ${
                          isActive ? "bg-[#FFF8F3] text-[#D97706]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <span className="flex-shrink-0 w-7 h-7 rounded-md bg-[#F8FAFC] border border-[#ECEEF1] overflow-hidden flex items-center justify-center">
                          {thumb ? (
                            <img src={decodeURIComponent(thumb)} alt="" className="w-full h-full object-contain" loading="lazy" />
                          ) : null}
                        </span>
                        <span className="font-medium flex-1 truncate">{node.name}</span>
                        <ChevronRight size={12} style={{ color: isActive ? "#D97706" : "#CBD5E1" }} className="flex-shrink-0" />
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
              <button onClick={() => setMobileStack((s) => s.slice(0, -1))} className="flex items-center gap-2 text-white font-medium text-[15px] min-h-[44px]">
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

          {mobileTop && (
            <Link
              href={categoryPath(locale as "et" | "en", mobileTop.kind === "l1" ? mobileTop.node.slug : mobileTop.node.handle)}
              onClick={() => { setIsOpen(false); setMobileStack([]) }}
              className="block px-4 py-3.5 text-[14px] font-bold text-[#D97706] border-b border-[#E2E8F0] bg-[#FFFBEB]"
            >
              {locale === "et"
                ? `Kõik: ${mobileTop.kind === "l1" ? mobileTop.node.name : mobileTop.node.name}`
                : `View All ${mobileTop.kind === "l1" ? mobileTop.node.name : mobileTop.node.name}`} &rarr;
            </Link>
          )}

          <div className="flex-1 overflow-y-auto">
            {!mobileTop && TAXONOMY_V3.map((l1) => {
              const Icon = V3_ICONS[l1.slug]
              return (
                <button
                  key={l1.slug}
                  onClick={() => setMobileStack([{ kind: "l1", node: l1 }])}
                  className="w-full flex items-center justify-between pl-4 pr-4 min-h-[52px] text-[15px] text-[#1E293B] font-medium border-b border-[#F1F5F9] active:bg-[#FFFBEB] transition-colors"
                >
                  <span className="flex items-center gap-3">
                    {Icon && <Icon size={20} strokeWidth={1.4} className="text-[#94A3B8]" />}
                    <span>{l1.name}</span>
                  </span>
                  <ChevronRight size={16} className="text-[#CBD5E1]" />
                </button>
              )
            })}

            {mobileTop && mobileChildren.map((child) => {
              const thumb = thumbFor(child.slug)
              const thumbEl = (
                <span className="flex-shrink-0 w-9 h-9 rounded-md bg-[#F8FAFC] border border-[#ECEEF1] overflow-hidden flex items-center justify-center mr-3">
                  {thumb ? (
                    <img src={decodeURIComponent(thumb)} alt="" className="w-full h-full object-contain" loading="lazy" />
                  ) : null}
                </span>
              )
              if (child.hasKids) {
                const l1Match = TAXONOMY_V3.find((l) => l.slug === child.slug)
                let nextNode: { kind: "l1"; node: TaxonomyL1 } | { kind: "sub"; node: TreeNode } | null = null
                if (l1Match) {
                  nextNode = { kind: "l1", node: l1Match }
                } else {
                  const dbNode = treeBySlug.get(child.slug)
                  if (dbNode) nextNode = { kind: "sub", node: dbNode }
                }
                return (
                  <button
                    key={child.slug + child.name}
                    onClick={() => { if (nextNode) setMobileStack((s) => [...s, nextNode!]) }}
                    className="w-full flex items-center justify-between pl-4 pr-4 min-h-[56px] text-[14px] font-medium text-[#1E293B] border-b border-[#F1F5F9] active:bg-[#FFFBEB] transition-colors"
                  >
                    <span className="flex items-center flex-1 text-left">
                      {thumbEl}
                      <span className="flex-1">{child.name}</span>
                    </span>
                    <ChevronRight size={16} className="text-[#CBD5E1] flex-shrink-0 ml-2" />
                  </button>
                )
              }
              return (
                <Link
                  key={child.slug + child.name}
                  href={child.href}
                  onClick={() => { setIsOpen(false); setMobileStack([]) }}
                  className="pl-4 pr-4 min-h-[56px] text-[14px] font-medium text-[#1E293B] border-b border-[#F1F5F9] active:bg-[#FFFBEB] active:text-[#D97706] transition-colors flex items-center"
                >
                  {thumbEl}
                  <span className="flex-1">{child.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
