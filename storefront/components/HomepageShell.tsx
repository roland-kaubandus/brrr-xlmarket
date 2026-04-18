"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import SafeLink from "@/components/SafeLink"
import { categoryPath, branchPath, type Locale } from "@/lib/i18n"
import categoryImagesData from "@/lib/category-images.json"
import { TAXONOMY_V3 as CATEGORIES, V3_ICONS } from "@/lib/taxonomy-v3"

const catImages: Record<string, string> = categoryImagesData as Record<string, string>

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
interface MeiliProduct {
  id: string
  title: string
  handle: string
  thumbnail: string
  price?: number
  category_handle?: string
}

interface HomepageShellProps {
  locale: string
}

/* ═══════════════════════════════════════════════
   CAROUSEL SLIDES — entrepreneur vibe
   ═══════════════════════════════════════════════ */
const SLIDES = [
  {
    badge: "Starter Kits",
    title: "Six businesses. Six turnkey kits.",
    text: "Caf\u00e9, auto shop, barber, print, bakery, cleaning. One order, one invoice, one delivery. \u20AC2,799 \u2013 \u20AC12,900, VAT incl.",
    cta: "See starter kits",
    ctaHref: "LOCALE/alustajale",
    bg: "/images/hero-1.png",
  },
  {
    badge: "B2B Account",
    title: "Net-30, volume pricing, real humans.",
    text: "Dedicated account manager, custom equipment bundles, priority shipping, 2-year extended warranty.",
    cta: "Request a quote",
    ctaHref: "LOCALE/arikliendile",
    bg: "/images/hero-2.png",
  },
  {
    badge: "Service",
    title: "Your machines should last a decade.",
    text: "Basic, Pro, Enterprise plans. Quarterly maintenance, 48h priority repair, replacement units while we fix yours.",
    cta: "Choose a service plan",
    ctaHref: "LOCALE/hooldus",
    bg: "/images/hero-3.png",
  },
]

/* ═══════════════════════════════════════════════
   PROMO CARDS — six starter kits
   ═══════════════════════════════════════════════ */
const PROMOS = [
  { tag: "Starter Kit", title: "Caf\u00e9 & Coffee Shop", sub: "From \u20AC8,499 \u2014 espresso, fridge, prep, shelving", gradient: "linear-gradient(135deg, #0F1B2D, #1a3a5c)", href: "LOCALE/alustajale#cafe" },
  { tag: "Starter Kit", title: "Auto Workshop", sub: "From \u20AC12,900 \u2014 lift, compressor, tool chest, scanner", gradient: "linear-gradient(135deg, #D97706, #c74d00)", href: "LOCALE/alustajale#auto" },
  { tag: "Starter Kit", title: "Barber Shop", sub: "From \u20AC3,499 \u2014 chairs, mirrors, tools, sterilizer", gradient: "linear-gradient(135deg, #c74d00, #D97706)", href: "LOCALE/alustajale#barber" },
  { tag: "Starter Kit", title: "Print & Sign Shop", sub: "From \u20AC5,999 \u2014 heat press, cutter, DTF, inks", gradient: "linear-gradient(135deg, #1a3a5c, #2a5a7c)", href: "LOCALE/alustajale#print" },
  { tag: "Starter Kit", title: "Bakery & Pastry", sub: "From \u20AC7,499 \u2014 oven, proofer, mixer, display", gradient: "linear-gradient(135deg, #0F1B2D, #243b55)", href: "LOCALE/alustajale#bakery" },
  { tag: "Starter Kit", title: "Cleaning Service", sub: "From \u20AC2,799 \u2014 scrubber, vacuum, pressure washer", gradient: "linear-gradient(135deg, #2a5a7c, #0F1B2D)", href: "LOCALE/alustajale#cleaning" },
]

/* ═══════════════════════════════════════════════
   MEILI SEARCH HELPER
   ═══════════════════════════════════════════════ */
const MEILI_KEY = "d0e3dab1a93f231214a3ed0d7301644c96bc6e9654cba319a2248a28b92ec0bf"

async function searchMeili(
  query: string,
  options: { limit?: number; sort?: string[]; filter?: string } = {}
): Promise<MeiliProduct[]> {
  try {
    const res = await fetch("/meili/indexes/products/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEILI_KEY}`,
      },
      body: JSON.stringify({
        q: query,
        limit: options.limit ?? 6,
        sort: options.sort,
        filter: options.filter,
      }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.hits ?? []) as MeiliProduct[]
  } catch {
    return []
  }
}

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */
export default function HomepageShell({ locale }: HomepageShellProps) {
  const loc = locale as Locale

  /* ── Carousel state ── */
  const [currentSlide, setCurrentSlide] = useState(0)
  const slideTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    slideTimer.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
    }, 6000)
    return () => {
      if (slideTimer.current) clearInterval(slideTimer.current)
    }
  }, [])

  const goToSlide = useCallback((n: number) => {
    setCurrentSlide(n)
    if (slideTimer.current) clearInterval(slideTimer.current)
    slideTimer.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
    }, 6000)
  }, [])

  /* ── Deal products ── */
  const deals: MeiliProduct[] = [
    { id: "deal-1", title: "Commercial 2-Group Espresso Machine Pro", handle: "espresso-machine-2group-pro", thumbnail: "/images/mockup-prods/prod-01-01.jpg", price: 129900 },
    { id: "deal-2", title: "MIG/TIG Welder 200A Dual Voltage", handle: "mig-tig-welder-200a", thumbnail: "/images/mockup-prods/prod-04-01.jpg", price: 38900 },
    { id: "deal-3", title: "Hydraulic 2-Post Car Lift 4-Ton", handle: "car-lift-2post-4ton", thumbnail: "/images/mockup-prods/prod-03-01.jpg", price: 279900 },
    { id: "deal-4", title: "Professional Barber Chair Hydraulic Base", handle: "barber-chair-hydraulic", thumbnail: "/images/mockup-prods/prod-16-01.jpg", price: 28900 },
  ]

  /* ── Category products (lazy loaded per section) ── */
  const [catProducts, setCatProducts] = useState<Record<number, MeiliProduct[]>>({})
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const loadedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const catId = Number(entry.target.getAttribute("data-cat-id"))
          if (!catId || loadedRef.current.has(catId)) continue
          loadedRef.current.add(catId)
          const cat = CATEGORIES.find((c) => c.id === catId)
          if (!cat) continue
          // Products disabled until Medusa taxonomy matches v3
          setCatProducts((prev) => ({ ...prev, [catId]: [] }))
        }
      },
      { rootMargin: "200px" }
    )
    const refs = sectionRefs.current
    for (const cat of CATEGORIES) {
      const el = refs[cat.id]
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  /* ── Sticky nav highlighting ── */
  const [activeNav, setActiveNav] = useState<number>(1)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const catId = Number(entry.target.getAttribute("data-cat-id"))
            if (catId) setActiveNav(catId)
          }
        }
      },
      { threshold: 0.2 }
    )
    const refs = sectionRefs.current
    for (const cat of CATEGORIES) {
      const el = refs[cat.id]
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  function scrollToCategory(catId: number) {
    const el = sectionRefs.current[catId]
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function formatPrice(price?: number): string {
    if (!price) return ""
    return `\u20AC${(price / 100).toFixed(0)}`
  }

  return (
    <div style={{ backgroundColor: "#ECEEF1" }}>
      <style>{homepageStyles}</style>

      {/* ═══════ HERO SECTION ═══════ */}
      <div className="hp-hero-container hp-page-wrap">
        {/* Carousel + Promos + Deals */}
        <div className="hp-carousel-container">
          <div className="hp-carousel">
            {SLIDES.map((slide, idx) => (
              <div
                key={idx}
                className={`hp-carousel-slide hp-slide-${idx + 1}${idx === currentSlide ? " active" : ""}`}
              >
                <div className="hp-slide-content">
                  <span className="hp-slide-badge">{slide.badge}</span>
                  <h2>{slide.title}</h2>
                  <p>{slide.text}</p>
                  <SafeLink className="hp-slide-cta" href={`/${slide.ctaHref.replace("LOCALE", loc)}`}>
                    {slide.cta} &rarr;
                  </SafeLink>
                </div>
              </div>
            ))}
            <div className="hp-carousel-dots">
              {SLIDES.map((_, idx) => (
                <span
                  key={idx}
                  className={`hp-dot${idx === currentSlide ? " active" : ""}`}
                  onClick={() => goToSlide(idx)}
                />
              ))}
            </div>
          </div>

          {/* Promo Cards */}
          <div className="hp-promo-row">
            {PROMOS.map((promo, idx) => (
              <SafeLink
                key={idx}
                href={`/${promo.href.replace("LOCALE", loc)}`}
                className="hp-promo-card"
                style={{ background: promo.gradient }}
              >
                <span className="hp-promo-tag">{promo.tag}</span>
                <h3>{promo.title}</h3>
                <div className="hp-promo-sub">{promo.sub}</div>
              </SafeLink>
            ))}
          </div>

          {/* Deal Cards */}
          <div className="hp-deals-row">
            {deals.map((deal) => (
              <SafeLink
                key={deal.id}
                href={`/${loc}/toode/${deal.handle}`}
                className="hp-deal-card"
              >
                {deal.thumbnail && (
                  <img
                    className="hp-deal-card-img"
                    src={deal.thumbnail}
                    alt={deal.title}
                    loading="lazy"
                  />
                )}
                <div className="hp-deal-card-body">
                  <span className="hp-deal-card-tag">Featured</span>
                  <div className="hp-deal-card-name">{deal.title}</div>
                  {deal.price != null && (
                    <div className="hp-deal-card-price">{formatPrice(deal.price)}</div>
                  )}
                </div>
              </SafeLink>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ CATEGORY EXPLORER ═══════ */}
      <div className="hp-explorer-header">
        <div className="hp-explorer-header-inner">
          <h2>Explore Categories</h2>
          <div className="hp-line" />
          <span className="hp-count">22 categories &middot; 16,000+ products</span>
        </div>
      </div>

      <div className="hp-category-explorer">
        {/* Sticky Nav */}
        <div className="hp-sticky-nav">
          {CATEGORIES.map((cat) => {
            const Icon = V3_ICONS[cat.slug]
            return (
              <button
                key={cat.id}
                className={`hp-sticky-nav-icon${activeNav === cat.id ? " active" : ""}`}
                onClick={() => scrollToCategory(cat.id)}
                type="button"
              >
                {Icon && <Icon size={22} strokeWidth={1.4} />}
                <span className="hp-tooltip">{cat.name}</span>
              </button>
            )
          })}
        </div>

        {/* Categories Grid */}
        <div className="hp-categories-grid">
          {CATEGORIES.map((cat) => {
            const products = catProducts[cat.id] ?? []
            return (
              <div
                key={cat.id}
                className="hp-category-section"
                data-cat-id={cat.id}
                ref={(el) => { sectionRefs.current[cat.id] = el }}
              >
                {/* COL 1 — name + subcategories */}
                <div className="hp-category-header">
                  <div className="hp-category-title-bar">
                    <h2 className="hp-category-title">{cat.name}</h2>
                  </div>
                  <div className="hp-subcategory-list">
                    {cat.subs.map((sub, idx) => {
                      const subHandle = cat.subSlugs[idx]
                      const href = subHandle ? categoryPath(loc, subHandle) : branchPath(loc, cat.slug)
                      return (
                        <SafeLink
                          key={sub}
                          href={href}
                          className="hp-subcategory-link"
                        >
                          {sub}
                        </SafeLink>
                      )
                    })}
                    {cat.extra.slice(0, 5).map((sub) => (
                      <SafeLink
                        key={sub}
                        href={branchPath(loc, cat.slug)}
                        className="hp-subcategory-link hp-subcategory-extra"
                      >
                        {sub}
                      </SafeLink>
                    ))}
                  </div>
                  <SafeLink
                    href={branchPath(loc, cat.slug)}
                    className="hp-cat-view-all"
                  >
                    View All &rarr;
                  </SafeLink>
                </div>

                {/* COL 2 — atmosphere image */}
                <div className="hp-category-image">
                  <img
                    src={`/images/cat-atmosphere/${cat.slug}.png`}
                    alt={cat.name}
                    loading="lazy"
                  />
                </div>

                {/* COL 3 — 6 products (mockup images) */}
                <div className="hp-products-grid">
                  {products.length > 0
                    ? products.slice(0, 6).map((prod) => (
                        <SafeLink
                          key={prod.id}
                          href={`/${loc}/toode/${prod.handle}`}
                          className="hp-product-card"
                        >
                          <div className="hp-product-image">
                            {prod.thumbnail && (
                              <img src={prod.thumbnail} alt={prod.title} loading="lazy" />
                            )}
                          </div>
                          <div className="hp-product-info">
                            <div className="hp-product-name">{prod.title}</div>
                          </div>
                        </SafeLink>
                      ))
                    : [0,1,2,3,4,5].map((n) => {
                        const pad = String(cat.prodNum).padStart(2, "0")
                        const pn = String(n + 1).padStart(2, "0")
                        const subSlug = cat.subSlugs[n]
                        const subThumb = subSlug ? catImages[subSlug] : undefined
                        const imgSrc = subThumb ?? `/images/mockup-prods/prod-${pad}-${pn}.jpg`
                        const subName = cat.subs[n] || ""
                        const href = subSlug
                          ? categoryPath(loc, subSlug)
                          : branchPath(loc, cat.slug)
                        return (
                          <SafeLink key={n} href={href} className="hp-product-card">
                            <div className="hp-product-image">
                              <img
                                src={imgSrc}
                                alt={subName || cat.name}
                                loading="lazy"
                              />
                            </div>
                            <div className="hp-product-info">
                              <div className="hp-product-name">{subName}</div>
                            </div>
                          </SafeLink>
                        )
                      })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   STYLES — pixel-perfect match to mockup
   ═══════════════════════════════════════════════ */
const homepageStyles = `
/* ── Global container ── */
.hp-page-wrap {
  max-width: 1440px;
  margin: 0 auto;
}

/* ═══════ HERO SECTION ═══════ */
.hp-hero-container {
  padding: 24px 40px;
  background-color: #ECEEF1;
}

/* ── Carousel ── */
.hp-carousel-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.hp-carousel {
  position: relative;
  width: 100%;
  height: 420px;
  border-radius: 0;
  overflow: hidden;
}

.hp-carousel-slide {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 60px;
  opacity: 0;
  transition: opacity 0.6s ease-in-out;
}

.hp-carousel-slide.active { opacity: 1; }

.hp-slide-1 { background: linear-gradient(90deg, rgba(15,27,45,0.85) 0%, rgba(15,27,45,0.4) 60%, transparent 100%), url('/images/hero-1.png') center/cover no-repeat; }
.hp-slide-2 { background: linear-gradient(90deg, rgba(15,27,45,0.85) 0%, rgba(15,27,45,0.4) 60%, transparent 100%), url('/images/hero-2.png') center/cover no-repeat; }
.hp-slide-3 { background: linear-gradient(90deg, rgba(15,27,45,0.85) 0%, rgba(15,27,45,0.4) 60%, transparent 100%), url('/images/hero-3.png') center/cover no-repeat; }

.hp-slide-content {
  max-width: 500px;
  z-index: 2;
}

.hp-slide-badge {
  display: inline-block;
  background: rgba(217,119,6,0.9);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 0;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hp-slide-content h2 {
  font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 36px;
  font-weight: 800;
  line-height: 1.15;
  color: #fff;
  margin-bottom: 12px;
}

.hp-slide-content p {
  font-size: 15px;
  color: rgba(255,255,255,0.9);
  margin-bottom: 24px;
  line-height: 1.5;
}

.hp-slide-cta {
  display: inline-block;
  padding: 12px 28px;
  background-color: #D97706;
  color: #fff;
  border: none;
  border-radius: 0;
  font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
}

.hp-slide-cta:hover {
  background-color: #b45309;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(217,119,6,0.3);
}

.hp-carousel-dots {
  position: absolute;
  bottom: 24px;
  left: 60px;
  display: flex;
  gap: 8px;
  z-index: 5;
}

.hp-dot {
  width: 8px;
  height: 8px;
  border-radius: 0;
  background-color: rgba(255,255,255,0.4);
  cursor: pointer;
  transition: all 0.3s;
}

.hp-dot.active {
  background-color: #fff;
  width: 28px;
  border-radius: 0;
}

/* ── Promo Banner Cards ── */
.hp-promo-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.hp-promo-card {
  border-radius: 0;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px;
  color: #fff;
}

.hp-promo-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.hp-promo-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: #D97706;
  padding: 3px 8px;
  border-radius: 0;
  margin-bottom: 8px;
  width: fit-content;
}

.hp-promo-card h3 {
  font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
}

.hp-promo-sub {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 4px;
}

/* ═══════ DEALS ROW ═══════ */
.hp-deals-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.hp-deal-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  display: block;
}

.hp-deal-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  border-color: #D97706;
}

.hp-deal-card-img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: contain;
  background: #fff;
  padding: 16px;
}

.hp-deal-card-body {
  padding: 14px 16px 18px;
  border-top: 1px solid #f5f5f5;
}

.hp-deal-card-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #fff;
  background: #D97706;
  padding: 2px 8px;
  margin-bottom: 8px;
}

.hp-deal-card-name {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hp-deal-card-price {
  font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 20px;
  font-weight: 700;
  color: #0F1B2D;
}

/* ═══════ CATEGORY EXPLORER ═══════ */
.hp-explorer-header {
  padding: 48px 40px 0;
  max-width: 1440px;
  margin: 0 auto;
}

.hp-explorer-header-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hp-explorer-header h2 {
  font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 28px;
  font-weight: 700;
  color: #0F1B2D;
  white-space: nowrap;
}

.hp-line {
  flex: 1;
  height: 1px;
  background: #D0D5DD;
}

.hp-count {
  font-size: 13px;
  color: #888;
  font-weight: 500;
  white-space: nowrap;
}

.hp-category-explorer {
  display: flex;
  gap: 24px;
  padding: 24px 40px 60px;
  max-width: 1440px;
  margin: 0 auto;
}

/* ── Sticky Icon Nav ── */
.hp-sticky-nav {
  width: 60px;
  position: sticky;
  top: 110px;
  height: fit-content;
  max-height: calc(100vh - 130px);
  overflow: visible;
  flex-shrink: 0;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-radius: 0;
  padding: 6px 0;
}

.hp-sticky-nav::-webkit-scrollbar { width: 0; }

.hp-sticky-nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 52px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  opacity: 0.55;
  border: none;
  background: none;
  padding: 0;
}

.hp-sticky-nav-icon:hover,
.hp-sticky-nav-icon.active {
  opacity: 1;
  background: #FFF5EE;
}

.hp-sticky-nav-icon svg {
  width: 26px;
  height: 26px;
  color: #555;
  stroke-width: 1.2;
  transition: color 0.15s;
}

.hp-sticky-nav-icon:hover svg,
.hp-sticky-nav-icon.active svg {
  color: #D97706;
}

.hp-tooltip {
  display: none;
  position: absolute;
  left: 68px;
  top: 50%;
  transform: translateY(-50%);
  background: #0F1B2D;
  color: #fff;
  padding: 6px 12px;
  border-radius: 0;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 50;
  pointer-events: none;
  z-index: 20;
}

.hp-sticky-nav-icon:hover .hp-tooltip { display: block; }

/* ── Category Sections ── */
.hp-categories-grid {
  flex: 1;
  min-width: 0;
}

.hp-category-section {
  display: grid;
  grid-template-columns: 220px 1fr 630px;
  margin-bottom: 20px;
  background: #fff;
  overflow: visible;
  min-height: 480px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

/* COL 1 — name + subcategories */
.hp-category-header {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #ECEEF1;
}

.hp-category-title-bar {
  padding: 24px 20px 14px;
  border-bottom: none;
}

.hp-category-title {
  font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 22px;
  font-weight: 800;
  color: #0F172A;
  line-height: 1.2;
  letter-spacing: -0.04em;
  text-transform: none;
}

.hp-subcategory-list {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  flex: 1;
}

.hp-subcategory-link {
  font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 14px;
  font-weight: 400;
  color: #475569;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
  padding: 6px 20px;
  line-height: 1.4;
  border-left: 2px solid transparent;
}

.hp-subcategory-link:hover {
  color: #D97706;
  background: #FFF8F3;
  border-left-color: #D97706;
}

.hp-subcategory-extra {
  font-size: 12px;
  color: #999;
}

.hp-cat-view-all {
  display: none;
  padding: 14px 20px;
  font-size: 13px;
  font-weight: 600;
  color: #D97706;
  text-decoration: none;
  border-top: 1px solid #ECEEF1;
  margin-top: auto;
  transition: background 0.15s;
}

.hp-cat-view-all:hover { background: #FFF8F3; }

/* COL 2 — atmosphere image */
.hp-category-image {
  position: relative;
  overflow: hidden;
}

.hp-category-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 6s ease;
}

.hp-category-section:hover .hp-category-image img {
  transform: scale(1.03);
}

/* COL 3 — 6 products in 3x2 */
.hp-products-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: 1fr 1fr;
  gap: 0;
  border-left: 1px solid #ECEEF1;
}

.hp-product-card {
  background-color: #fff;
  border-right: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  overflow: visible;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  text-decoration: none;
  color: inherit;
}

.hp-product-card:nth-child(3n) { border-right: none; }
.hp-product-card:nth-child(n+4) { border-bottom: none; }

.hp-product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  z-index: 10;
}

.hp-product-image {
  flex: 1;
  background-color: #fff;
  overflow: hidden;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12%;
}

.hp-product-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.hp-product-card:hover .hp-product-image img {
  transform: scale(1.05);
}

.hp-product-info {
  padding: 10px 12px 14px;
  background: #fff;
  text-align: center;
}

.hp-product-name {
  font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 14px;
  font-weight: 700;
  color: #333;
  line-height: 1.35;
  min-height: 2.7em;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ═══════ TABLET (768-1024) ═══════ */
@media (max-width: 1024px) {
  .hp-hero-container { padding: 16px 20px; }
  .hp-carousel { height: 340px; }
  .hp-carousel-slide { padding: 0 30px; }
  .hp-slide-content h2 { font-size: 28px; }
  .hp-deals-row { grid-template-columns: repeat(2, 1fr); }
  .hp-promo-row { grid-template-columns: repeat(2, 1fr); }
  .hp-promo-row .hp-promo-card:nth-child(n+3) { display: none; }
  .hp-category-section { grid-template-columns: 180px 1fr 400px; min-height: 380px; }
  .hp-category-explorer { padding: 20px 20px 40px; gap: 16px; }
  .hp-explorer-header { padding: 36px 20px 0; }
}

/* ═══════ MOBILE (<768) ═══════ */
@media (max-width: 767px) {
  /* Hero: stack, hide sidebar */
  .hp-hero-container { padding: 12px 16px; }
  .hp-carousel-container { width: 100%; }
  .hp-carousel { height: 260px; }
  .hp-carousel-slide { padding: 0 24px; }
  .hp-slide-content h2 { font-size: 22px; }
  .hp-slide-content p { font-size: 13px; margin-bottom: 16px; }
  .hp-slide-cta { padding: 10px 20px; font-size: 13px; }
  .hp-carousel-dots { bottom: 16px; left: 24px; }

  /* Deals */
  .hp-deals-row { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
  .hp-deal-card-body { padding: 10px 12px 14px; }
  .hp-deal-card-name { font-size: 12px; }
  .hp-deal-card-price { font-size: 17px; }

  /* Promos */
  .hp-promo-row { grid-template-columns: 1fr; gap: 10px; }
  .hp-promo-card { min-height: 120px; padding: 16px; }
  .hp-promo-card h3 { font-size: 15px; }

  /* Category explorer: hide sticky nav */
  .hp-explorer-header { padding: 28px 16px 0; }
  .hp-explorer-header h2 { font-size: 22px; }
  .hp-category-explorer { flex-direction: column; padding: 16px 16px 40px; gap: 16px; }
  .hp-sticky-nav { display: none; }

  /* Category sections: stack vertically */
  .hp-category-section {
    display: flex;
    flex-direction: column;
    min-height: auto;
    margin-bottom: 16px;
  }
  .hp-category-header { border-right: none; border-bottom: 1px solid #ECEEF1; }
  .hp-category-title-bar { padding: 16px 16px 10px; }
  .hp-category-title { font-size: 20px; }
  .hp-subcategory-list { flex-direction: row; flex-wrap: wrap; padding: 4px 12px 12px; gap: 0; }
  .hp-subcategory-link { padding: 4px 10px; font-size: 13px; border-left: none; }
  .hp-subcategory-link:hover { border-left: none; }
  .hp-subcategory-extra { display: none; }
  .hp-category-image { height: 200px; }
  .hp-category-image img { height: 100%; }
  .hp-products-grid {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: auto;
    border-left: none;
    border-top: 1px solid #ECEEF1;
  }
  .hp-product-image { padding: 8%; }
  .hp-product-info { padding: 8px 8px 12px; }
  .hp-product-name { font-size: 11px; min-height: 2.4em; }
}

/* ═══════ SMALL MOBILE (<400) ═══════ */
@media (max-width: 400px) {
  .hp-deals-row { grid-template-columns: 1fr; }
  .hp-products-grid { grid-template-columns: repeat(2, 1fr); }
  .hp-product-card:nth-child(3n) { border-right: 1px solid #f0f0f0; }
  .hp-product-card:nth-child(2n) { border-right: none; }
}
`
