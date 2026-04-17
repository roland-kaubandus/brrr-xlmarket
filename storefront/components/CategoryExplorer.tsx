"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "@/components/SafeLink"
import { categoryPath } from "@/lib/i18n"
import { MENU_ORDER } from "@/lib/menu-order"
import {
  UtensilsCrossed, Building2, Wrench, Flame, Crosshair, TreePine,
  Printer, Plug, Snowflake, Droplets, Warehouse, Car, Leaf, Fuel,
  Sparkles, ShieldCheck, Armchair, Scissors, Dumbbell, Ship,
  HeartPulse, Music, type LucideIcon,
} from "lucide-react"

const ICON_MAP: Record<string, LucideIcon> = {
  "horeca-food-service": UtensilsCrossed,
  "construction-building": Building2,
  "hand-power-tools": Wrench,
  "welding-metalworking": Flame,
  "laser-cnc-digital": Crosshair,
  "woodworking-carpentry": TreePine,
  "printing-packaging-signage": Printer,
  "electrical-energy": Plug,
  "hvac-climate": Snowflake,
  "plumbing-water": Droplets,
  "warehousing-material-handling": Warehouse,
  "automotive-workshop": Car,
  "outdoor-power-landscaping": Leaf,
  "fuel-lubrication-fluid": Fuel,
  "cleaning-janitorial": Sparkles,
  "safety-security-workwear": ShieldCheck,
  "office-commercial-interiors": Armchair,
  "salon-spa-wellness": Scissors,
  "fitness-sports-recreation": Dumbbell,
  "boating-camping-outdoor": Ship,
  "health-medical-supply": HeartPulse,
  "music-entertainment": Music,
}

// Atmosphere image slug mapping (file names may differ slightly from handles)
const IMAGE_SLUG: Record<string, string> = {
  "horeca-food-service": "horeca-food-service",
  "construction-building": "construction-building",
  "hand-power-tools": "hand-power-tools",
  "welding-metalworking": "welding-metalworking",
  "laser-cnc-digital": "laser-cnc-digital-fabrication",
  "woodworking-carpentry": "woodworking-carpentry",
  "printing-packaging-signage": "printing-packaging-signage",
  "electrical-energy": "electrical-energy",
  "hvac-climate": "hvac-climate-control",
  "plumbing-water": "plumbing-water-systems",
  "warehousing-material-handling": "warehousing-material-handling",
  "automotive-workshop": "automotive-workshop",
  "outdoor-power-landscaping": "outdoor-power-landscaping",
  "fuel-lubrication-fluid": "fuel-lubrication-fluid",
  "cleaning-janitorial": "cleaning-janitorial",
  "safety-security-workwear": "safety-security-workwear",
  "office-commercial-interiors": "office-commercial-interiors",
  "salon-spa-wellness": "salon-spa-wellness",
  "fitness-sports-recreation": "fitness-sports-recreation",
  "boating-camping-outdoor": "boating-camping-outdoor",
  "health-medical-supply": "health-medical-supply",
  "music-entertainment": "music-entertainment",
}

const MEILI_URL = "/meili/indexes/products/search"
const MEILI_KEY = "MEILI_SEARCH_KEY_REDACTED"

type CategoryNode = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
  children: CategoryNode[]
}

type MeiliProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  price: number
}

function buildTree(cats: CategoryNode[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>()
  cats.forEach(c => map.set(c.id, { ...c, children: [] }))
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

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100)
}

/* ─── CategorySection: one row per L1 ─── */
function CategorySection({
  cat,
  locale,
  isVisible,
}: {
  cat: CategoryNode
  locale: string
  isVisible: boolean
}) {
  const [products, setProducts] = useState<MeiliProduct[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isVisible || loaded) return
    setLoaded(true)

    fetch(MEILI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEILI_KEY}`,
      },
      body: JSON.stringify({
        q: "",
        filter: `category_handles = ${cat.handle}`,
        limit: 6,
        attributesToRetrieve: ["id", "title", "handle", "thumbnail", "price"],
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.hits) {
          setProducts(
            data.hits.map((h: Record<string, unknown>) => ({
              id: h.id as string,
              title: h.title as string,
              handle: h.handle as string,
              thumbnail: (h.thumbnail as string) || null,
              price: Math.round((h.price as number) * 100),
            }))
          )
        }
      })
  }, [isVisible, loaded, cat.handle])

  const imgSlug = IMAGE_SLUG[cat.handle] || cat.handle

  return (
    <div
      id={`cat-${cat.handle}`}
      className="bg-white mb-5 overflow-hidden"
      style={{ minHeight: isVisible ? undefined : "480px" }}
    >
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_minmax(0,630px)]" style={{ minHeight: "480px" }}>
        {/* Col 1: title + subcategories */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-[#ECEEF1]">
          <div className="px-5 pt-6 pb-4">
            <h3
              className="text-[20px] md:text-[24px] font-bold text-[#0F172A] leading-tight"
              style={{ letterSpacing: "-0.2px" }}
            >
              {cat.name}
            </h3>
          </div>
          <div className="flex flex-row md:flex-col flex-wrap md:flex-nowrap px-2 md:px-0 pb-3 md:pb-0 gap-0 flex-1">
            {cat.children.slice(0, 8).map(sub => (
              <Link
                key={sub.id}
                href={categoryPath(locale as "et" | "en", sub.handle)}
                className="text-[14px] md:text-[15px] font-normal text-[#555] px-3 md:px-5 py-1.5 md:py-[6px] border-l-2 border-transparent hover:border-l-[#D97706] hover:bg-[#FFF8F3] hover:text-[#D97706] transition-all whitespace-nowrap md:whitespace-normal"
              >
                {sub.name}
              </Link>
            ))}
          </div>
          <Link
            href={categoryPath(locale as "et" | "en", cat.handle)}
            className="hidden md:block px-5 py-3.5 text-[13px] font-semibold text-[#D97706] border-t border-[#ECEEF1] mt-auto hover:bg-[#FFF8F3] transition-colors"
          >
            {locale === "et" ? "Vaata kõiki" : "View All"} &rarr;
          </Link>
        </div>

        {/* Col 2: atmosphere image */}
        <div className="relative overflow-hidden hidden md:block">
          <img
            src={`/images/categories/${imgSlug}.png`}
            alt={cat.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-[6s] ease-out hover:scale-[1.03]"
          />
        </div>

        {/* Col 3: product grid 3x2 */}
        <div className="grid grid-cols-3 grid-rows-2 border-t md:border-t-0 md:border-l border-[#ECEEF1]">
          {products.length > 0
            ? products.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/${locale}/toode/${p.handle}`}
                  className={`group flex flex-col bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:z-10 relative ${
                    (i + 1) % 3 !== 0 ? "border-r border-[#f0f0f0]" : ""
                  } ${i < 3 ? "border-b border-[#f0f0f0]" : ""}`}
                >
                  <div className="flex-1 flex items-center justify-center p-[12%] overflow-hidden">
                    <img
                      src={p.thumbnail || ""}
                      alt={p.title}
                      loading="lazy"
                      className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="px-2.5 pb-3 text-center">
                    <div className="text-[11px] sm:text-[13px] font-semibold text-[#333] leading-tight line-clamp-2 min-h-[2.7em] flex items-center justify-center">
                      {p.title}
                    </div>
                    <div className="text-[14px] font-bold text-[#0F172A] mt-1">
                      {formatPrice(p.price)}
                    </div>
                  </div>
                </Link>
              ))
            : Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={`animate-pulse bg-white p-4 ${
                    (i + 1) % 3 !== 0 ? "border-r border-[#f0f0f0]" : ""
                  } ${i < 3 ? "border-b border-[#f0f0f0]" : ""}`}
                >
                  <div className="aspect-square bg-[#F1F5F9] rounded mb-2" />
                  <div className="h-3 bg-[#F1F5F9] rounded w-3/4 mx-auto" />
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}

const INITIAL_COUNT = 6

/* ─── Main: Sticky Nav + Category Grid ─── */
export default function CategoryExplorer({ locale }: { locale: string }) {
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [expanded, setExpanded] = useState(false)
  const [activeHandle, setActiveHandle] = useState<string | null>(null)
  const [visibleSet, setVisibleSet] = useState<Set<string>>(new Set())
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Load categories
  useEffect(() => {
    fetch("/api/header-categories")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.categories) return
        const tree = buildTree(data.categories)
        const menuOrder = MENU_ORDER as readonly string[]
        const orderMap = new Map(menuOrder.map((h, i) => [h, i]))
        const sorted = tree
          .filter(c => menuOrder.includes(c.handle))
          .sort((a, b) => (orderMap.get(a.handle) ?? 999) - (orderMap.get(b.handle) ?? 999))
        setCategories(sorted)
      })
  }, [])

  // IntersectionObserver for visibility + active highlight
  const registerRef = useCallback((handle: string, el: HTMLDivElement | null) => {
    if (el) {
      sectionRefs.current.set(handle, el)
    } else {
      sectionRefs.current.delete(handle)
    }
  }, [])

  useEffect(() => {
    if (categories.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const newVisible = new Set(visibleSet)
        entries.forEach(entry => {
          const handle = entry.target.getAttribute("data-handle")
          if (!handle) return
          if (entry.isIntersecting) {
            newVisible.add(handle)
          }
        })
        setVisibleSet(newVisible)

        // Active = first visible in viewport
        const visibleEntries = entries.filter(e => e.isIntersecting)
        if (visibleEntries.length > 0) {
          const handle = visibleEntries[0].target.getAttribute("data-handle")
          if (handle) setActiveHandle(handle)
        }
      },
      { rootMargin: "200px 0px 200px 0px", threshold: 0.1 }
    )

    sectionRefs.current.forEach(el => observerRef.current?.observe(el))

    return () => observerRef.current?.disconnect()
  }, [categories]) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToSection = useCallback((handle: string) => {
    const el = sectionRefs.current.get(handle)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      setActiveHandle(handle)
    }
  }, [])

  const isEt = locale === "et"

  return (
    <div className="bg-[#ECEEF1]">
      {/* Section header */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 pt-10 md:pt-12">
        <div className="flex items-center gap-4">
          <h2 className="text-[22px] md:text-[28px] font-bold text-[#0F172A] whitespace-nowrap" style={{ letterSpacing: "-0.3px" }}>
            {isEt ? "Avasta kategooriaid" : "Explore Categories"}
          </h2>
          <div className="flex-1 h-px bg-[#D0D5DD]" />
          <span className="text-[13px] text-[#888] font-medium whitespace-nowrap">
            22 {isEt ? "kategooriat" : "categories"} &middot; 16,000+ {isEt ? "toodet" : "products"}
          </span>
        </div>
      </div>

      {/* Explorer layout */}
      <div className="max-w-[1440px] mx-auto flex gap-6 px-4 sm:px-6 md:px-10 py-6 md:py-8">
        {/* Sticky nav — desktop only */}
        <div className="hidden md:block w-[60px] flex-shrink-0">
          <div
            className="sticky top-[120px] bg-white shadow-sm overflow-y-auto scrollbar-hide"
            style={{ maxHeight: "calc(100vh - 140px)" }}
          >
            {categories.map(cat => {
              const Icon = ICON_MAP[cat.handle]
              const isActive = activeHandle === cat.handle
              return (
                <button
                  key={cat.handle}
                  onClick={() => scrollToSection(cat.handle)}
                  className={`relative flex items-center justify-center w-[56px] h-[52px] transition-all ${
                    isActive
                      ? "opacity-100 bg-[#FFF5EE]"
                      : "opacity-55 hover:opacity-100 hover:bg-[#FFF5EE]"
                  }`}
                  title={cat.name}
                >
                  {Icon && (
                    <Icon
                      size={26}
                      strokeWidth={1.5}
                      className={`transition-colors ${isActive ? "text-[#D97706]" : "text-[#555] hover:text-[#D97706]"}`}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Category sections */}
        <div className="flex-1 min-w-0">
          {categories.map(cat => (
            <div
              key={cat.handle}
              ref={(el) => registerRef(cat.handle, el)}
              data-handle={cat.handle}
            >
              <CategorySection
                cat={cat}
                locale={locale}
                isVisible={visibleSet.has(cat.handle)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
