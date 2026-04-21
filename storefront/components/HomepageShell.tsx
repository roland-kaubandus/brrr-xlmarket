"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import SafeLink from "@/components/SafeLink"
import { categoryPath, branchPath, type Locale } from "@/lib/i18n"
import { V3_ICONS } from "@/lib/taxonomy-v3"
import type { HomepageL1Node } from "@/lib/menu-data"

// Adapter: render the homepage category explorer from the SSoT 18-L1 taxonomy
// tree instead of the legacy hard-coded 22-entry TAXONOMY_V3 list.
// Per L1: numeric id (stable scroll anchor), slug (=handle), localized name.
// prodNum drives the /images/mockup-prods/prod-NN-MM.jpg fallback — kept 1..18
// for now; real L2 images from node.image_path take priority where present.
interface HomepageCategory {
  id: number
  slug: string
  name: string
  prodNum: number
}

// Unified Scandinavian-grade grotesk across all 18 modules.
// Mulish — rounded, humanist, quietly premium. User-locked 2026-04-19.
const CATEGORY_FONT_FAMILY = "'Mulish', system-ui, sans-serif"


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
  /** Pre-computed L1 nodes from getHomepageL1Nodes() — server-side only. */
  l1Nodes: HomepageL1Node[]
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
type PromoItem = {
  tag: string
  tagTone: "amber" | "red" | "green" | "navy"
  title: string
  sub: string
  image?: string
  bg?: string
  href: string
}

const PROMOS: PromoItem[] = [
  { tag: "Starter Kit", tagTone: "amber", title: "Caf\u00e9 & Coffee Shop", sub: "From \u20AC8,499 \u2014 espresso, fridge, prep, shelving", image: "/images/cat-01-horeca-food-service.png", href: "LOCALE/alustajale#cafe" },
  { tag: "Starter Kit", tagTone: "amber", title: "Barber Shop", sub: "From \u20AC3,499 \u2014 chairs, mirrors, tools, sterilizer", image: "/images/cat-18-salon-spa-wellness.png", href: "LOCALE/alustajale#barber" },
  { tag: "Starter Kit", tagTone: "amber", title: "Bakery & Pastry", sub: "From \u20AC7,499 \u2014 oven, proofer, mixer, display", image: "/images/cat-01-kitchen.png", href: "LOCALE/alustajale#bakery" },
  { tag: "Deal", tagTone: "red", title: "Deal of the week", sub: "Hand-picked discounts refreshed every Monday.", bg: "linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%)", href: "LOCALE/kategooriad?deals=1" },
  { tag: "New", tagTone: "green", title: "Pay in 3 with Montonio", sub: "Split your order into 3 interest-free payments at checkout.", bg: "linear-gradient(135deg, #064E3B 0%, #059669 100%)", href: "LOCALE/arikliendile#financing" },
  { tag: "Beta", tagTone: "navy", title: "AI product finder", sub: "Describe what you need \u2014 we match the right tool and variant.", bg: "linear-gradient(135deg, #0F1B2D 0%, #334155 100%)", href: "LOCALE/otsing" },
]

/* ═══════════════════════════════════════════════
   MEILI SEARCH HELPER
   ═══════════════════════════════════════════════ */
const MEILI_KEY = process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY || ""

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
/* Short labels for horizontal sticky nav — hand-picked so they stay meaningful.
   Fallback: first segment of the full name if slug missing here. */
const NAV_SHORT_NAMES: Record<string, string> = {
  "renewable-energy": "Energy",
  "horeca-food-service": "HoReCa",
  "automotive-workshop": "Automotive",
  "cleaning-janitorial": "Cleaning",
  "crafts-sewing-printing": "Crafts",
  "salon-spa-wellness": "Salon",
  "health-medical-supply": "Medical",
  "fitness-sports-recreation": "Sport",
  "boating-camping-outdoor": "Outdoor",
  "music-instruments": "Music",
  "pets-animal-supplies": "Pets",
  "backyard-landscaping-farm": "Garden",
  "construction-building": "Construction",
  "safety-security": "Safety",
  "hand-power-tools": "Tools",
  "warehousing-material-handling": "Warehousing",
  "welding-metalworking": "Welding",
  "laser-cnc-digital-fabrication": "CNC",
  "industrial-scientific": "Industrial",
  "hvac-climate-control": "HVAC",
  "electrical-energy": "Electrical",
  "building-materials": "Materials",
  "fuel-lubrication-fluid": "Fuel",
  "kids-playgrounds": "Kids",
  "kitchen": "Kitchen",
}

function shortNavLabel(slug: string, name: string): string {
  if (NAV_SHORT_NAMES[slug]) return NAV_SHORT_NAMES[slug]
  // Fallback: strip trailing descriptors, keep up to two punchy words
  const cleaned = name.replace(/\s*[,&/].*$/, "").trim()
  return cleaned
}

export default function HomepageShell({ locale, l1Nodes }: HomepageShellProps) {
  const loc = locale as Locale

  /* ── 18 L1 from SSoT taxonomy tree (pre-computed server-side, PERF-C1) ── */
  const CATEGORIES: HomepageCategory[] = useMemo(
    () =>
      l1Nodes.map((n, i) => ({
        id: i + 1,
        slug: n.handle,
        name: n.name_en,
        prodNum: i + 1,
      })),
    [l1Nodes],
  )

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

  /* ── Deal products — real Meili hits, one per seed query. ── */
  interface Deal {
    id: string
    title: string
    handle: string
    thumbnail: string
    category: string
    price: number
    oldPrice: number
    discountPct: number
  }
  const DEAL_SEEDS: Array<{ query: string; category: string; discountPct: number }> = [
    { query: "espresso machine",  category: "HoReCa & Food Service",   discountPct: 23 },
    { query: "mig welder",        category: "Metalworks & Welding",    discountPct: 18 },
    { query: "car lift hydraulic", category: "Automotive & Workshop",  discountPct: 15 },
    { query: "barber chair",      category: "Salon, Spa & Wellness",   discountPct: 28 },
  ]
  const [deals, setDeals] = useState<Deal[]>([])

  useEffect(() => {
    let cancelled = false
    async function loadDeals() {
      const results = await Promise.all(
        DEAL_SEEDS.map(async (seed, idx) => {
          const hits = await searchMeili(seed.query, { limit: 1 })
          const hit = hits[0]
          if (!hit) return null
          // Meili `price` is euros (float). We store cents in Deal for the
          // shared formatPrice() helper (it divides by 100).
          const priceEur = typeof hit.price === "number" ? hit.price : 0
          const priceCents = Math.round(priceEur * 100)
          const oldPriceCents = Math.round(priceCents * (100 / (100 - seed.discountPct)))
          return {
            id: `deal-${idx + 1}`,
            title: hit.title,
            handle: hit.handle,
            thumbnail: hit.thumbnail,
            category: seed.category,
            price: priceCents,
            oldPrice: oldPriceCents,
            discountPct: seed.discountPct,
          } as Deal
        }),
      )
      if (!cancelled) setDeals(results.filter((d): d is Deal => d !== null))
    }
    loadDeals()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Section refs for sticky nav highlighting ── */
  const sectionRefs = useRef<Record<number, HTMLElement | null>>({})

  /* ── Nav background activates only when nav is stuck (scrolled past origin). */
  const navRef = useRef<HTMLDivElement | null>(null)
  const [navStuck, setNavStuck] = useState(false)
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const headerOffset = 116
    function update() {
      if (!el) return
      const rect = el.getBoundingClientRect()
      setNavStuck(rect.top <= headerOffset + 1)
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  /* ── Sticky nav highlighting — tracks which section is centred in viewport.
     rootMargin narrows the "active zone" to ~40% band around viewport centre,
     so a section only becomes active once its body crosses the middle. */
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
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    )
    const refs = sectionRefs.current
    for (const cat of CATEGORIES) {
      const el = refs[cat.id]
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [CATEGORIES])

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
            {PROMOS.map((promo, idx) => {
              const style = promo.image
                ? { backgroundImage: `url('${promo.image}')` }
                : { backgroundImage: promo.bg }
              const modifier = promo.image ? "hp-promo-card--photo" : "hp-promo-card--solid"
              return (
                <SafeLink
                  key={idx}
                  href={`/${promo.href.replace("LOCALE", loc)}`}
                  className={`hp-promo-card ${modifier}`}
                  style={style}
                >
                  <span className={`hp-promo-tag hp-promo-tag--${promo.tagTone}`}>{promo.tag}</span>
                  <h3>{promo.title}</h3>
                  <div className="hp-promo-sub">{promo.sub}</div>
                </SafeLink>
              )
            })}
          </div>

          {/* Deal Cards — mockup v2 layout: aspect-[4/3] product image,
              red percentage badge top-left, category small + title + amber
              price + struck-through old price below. */}
          <div className="hp-deals-row">
            {deals.map((deal) => (
              <SafeLink
                key={deal.id}
                href={`/${loc}/toode/${deal.handle}`}
                className="hp-deal-card"
              >
                <div className="hp-deal-card-media">
                  <img
                    className="hp-deal-card-img"
                    src={deal.thumbnail}
                    alt={deal.title}
                    loading="lazy"
                  />
                  <span className="hp-deal-card-badge">-{deal.discountPct}%</span>
                </div>
                <div className="hp-deal-card-body">
                  <p className="hp-deal-card-cat">{deal.category}</p>
                  <h3 className="hp-deal-card-name">{deal.title}</h3>
                  <div className="hp-deal-card-prices">
                    <span className="hp-deal-card-price">{formatPrice(deal.price)}</span>
                    <span className="hp-deal-card-oldprice">{formatPrice(deal.oldPrice)}</span>
                  </div>
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
          <span className="hp-count">18 categories &middot; 16,000+ products</span>
        </div>
      </div>

      <div className="hp-category-explorer">
        {/* Sticky Nav */}
        <div ref={navRef} className={`hp-sticky-nav${navStuck ? " hp-sticky-nav--stuck" : ""}`}>
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
                <span className="hp-tooltip">{shortNavLabel(cat.slug, cat.name)}</span>
              </button>
            )
          })}
        </div>

        {/* Categories Grid — mockup v2 vertical layout */}
        <div className="hp-categories-grid">
          {CATEGORIES.map((cat) => {
            const Icon = V3_ICONS[cat.slug]
            // l1Data pre-computed server-side via getHomepageL1Nodes() (PERF-C1).
            const l1Data = l1Nodes.find((n) => n.handle === cat.slug)
            const l2List = l1Data?.l2_list ?? []
            const featured = l1Data?.featured ?? []
            const atmosphere = `/images/cat-atmosphere/${cat.slug}.png`
            return (
              <section
                key={cat.id}
                className="hp-category-section"
                data-cat-id={cat.id}
                ref={(el) => { sectionRefs.current[cat.id] = el }}
                aria-labelledby={`cat-${cat.id}-title`}
                style={{ ["--hp-cat-font" as string]: CATEGORY_FONT_FAMILY }}
              >
                {/* 1 — Atmosphere banner with huge title overlaid */}
                <div className="hp-cat-banner">
                  <img
                    src={atmosphere}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget
                      img.style.display = "none"
                      const parent = img.parentElement
                      if (parent) parent.classList.add("hp-cat-banner--placeholder")
                    }}
                  />
                  {Icon ? (
                    <span className="hp-cat-banner-fallback" aria-hidden="true">
                      <Icon size={160} strokeWidth={1} />
                    </span>
                  ) : null}
                  <div className="hp-cat-banner-overlay" />
                  <div className="hp-cat-banner-title-wrap">
                    <h2 id={`cat-${cat.id}-title`} className="hp-cat-banner-title">{cat.name}</h2>
                    {l1Data && l1Data.l2_count > 0 ? (
                      <p className="hp-cat-banner-sub">{l1Data.l2_count} subcategories</p>
                    ) : null}
                  </div>
                </div>

                {/* 2 — Large subcategory name list (max 10, clips remainder) */}
                {l2List.length > 0 ? (
                  <nav className="hp-cat-sublist" aria-label={`${cat.name} subcategories`}>
                    {l2List.map((l2) => (
                      <SafeLink
                        key={l2.handle}
                        href={categoryPath(loc, l2.handle)}
                        className="hp-cat-sublist-item"
                      >
                        <span className="hp-cat-sublist-dot" aria-hidden="true" />
                        <span className="hp-cat-sublist-name">{l2.name_en}</span>
                      </SafeLink>
                    ))}
                  </nav>
                ) : null}

                {/* 3 — 6 featured cards (L2 / L3 fallback, BFS pre-computed server-side) */}
                <div className="hp-cat-cards">
                  {featured.map((child) => {
                    // image_path guaranteed non-null by getHomepageL1Nodes BFS filter.
                    const imgSrc = decodeURIComponent(child.image_path)
                    return (
                      <SafeLink
                        key={child.handle}
                        href={categoryPath(loc, child.handle)}
                        className="hp-cat-card"
                      >
                        <div className="hp-cat-card-image">
                          <img
                            src={imgSrc}
                            alt={child.name_en}
                            loading="lazy"
                          />
                        </div>
                        <div className="hp-cat-card-name">{child.name_en}</div>
                      </SafeLink>
                    )
                  })}
                </div>
              </section>
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
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 44px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.005em;
  color: #fff;
  margin-bottom: 12px;
}

.hp-slide-content p {
  font-family: 'Mulish', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: rgba(255,255,255,0.9);
  margin-bottom: 24px;
  line-height: 1.5;
}

.hp-slide-cta {
  display: inline-block;
  padding: 12px 28px;
  background-color: #E8920A;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: 'Mulish', system-ui, sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
  text-decoration: none;
}

.hp-slide-cta:hover {
  background-color: #CF7F00;
  transform: translateY(-2px);
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
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  min-height: 170px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px;
  color: #fff;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(27,36,56,0.04);
  background-color: #0F1B2D;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  isolation: isolate;
}

.hp-promo-card--photo::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(10, 14, 20, 0.78) 0%,
    rgba(10, 14, 20, 0.45) 28%,
    rgba(10, 14, 20, 0.10) 55%,
    rgba(10, 14, 20, 0) 80%);
  z-index: -1;
  transition: opacity 0.2s ease;
}

.hp-promo-card h3, .hp-promo-card .hp-promo-sub {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}

.hp-promo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(27,36,56,0.18);
}

.hp-promo-card:hover::before {
  opacity: 0.9;
}

.hp-promo-card > * {
  position: relative;
}

.hp-promo-tag {
  display: inline-block;
  font-family: 'Mulish', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: #E8920A;
  color: #fff;
  padding: 3px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
  width: fit-content;
}
.hp-promo-tag--amber { background: #E8920A; color: #fff; }
.hp-promo-tag--red   { background: #DC2626; color: #fff; }
.hp-promo-tag--green { background: #059669; color: #fff; }
.hp-promo-tag--navy  { background: #1E293B; color: #fff; }

.hp-promo-card h3 {
  font-family: 'Mulish', system-ui, sans-serif;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.3;
  margin: 0;
}

.hp-promo-sub {
  font-family: 'Mulish', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 500;
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

/* Deal cards — mockup v2 spec.
   aspect-[4/3] product photo top, red discount badge top-left,
   below: muted category, semibold title, amber price + struck old price. */
.hp-deal-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #E2E5EB;
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hp-deal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(27,36,56,0.08);
}

.hp-deal-card-media {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #fff;
}

.hp-deal-card-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 14px;
  transition: transform 0.3s ease;
}

.hp-deal-card:hover .hp-deal-card-img {
  transform: scale(1.05);
}

.hp-deal-card-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: #DC2626;
  color: #fff;
  font-family: 'Mulish', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  padding: 3px 7px;
  border-radius: 4px;
  z-index: 2;
}

.hp-deal-card-body {
  padding: 12px 14px 16px;
}

.hp-deal-card-cat {
  font-family: 'Mulish', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: #6B7280;
  margin: 0 0 4px;
}

.hp-deal-card-name {
  font-family: 'Mulish', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  color: #1F2937;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hp-deal-card-prices {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.hp-deal-card-price {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #E8920A;
  line-height: 1;
}

.hp-deal-card-oldprice {
  font-family: 'Mulish', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #9CA3AF;
  text-decoration: line-through;
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
  font-family: 'Mulish', system-ui, sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #1F2937;
  white-space: nowrap;
  margin: 0;
  letter-spacing: -0.005em;
}

.hp-line {
  flex: 1;
  height: 1px;
  background: #E2E5EB;
}

.hp-count {
  font-family: 'Mulish', system-ui, sans-serif;
  font-size: 12px;
  color: #6B7280;
  font-weight: 500;
  white-space: nowrap;
}

.hp-category-explorer {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 40px 60px;
  max-width: 1440px;
  margin: 0 auto;
}

/* ── Horizontal Sticky Nav — sits under header (68+48=116px), transparent strip ── */
.hp-sticky-nav {
  width: 100%;
  position: sticky;
  top: 116px; /* header 68 + secondary bar 48 */
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0;
  background: transparent;
  box-shadow: none;
  border-bottom: 0;
  border-radius: 0;
  padding: 4px 6px;
  margin-top: 20px;
  overflow: hidden;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.hp-sticky-nav--stuck {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: saturate(1.1) blur(6px);
  -webkit-backdrop-filter: saturate(1.1) blur(6px);
  box-shadow: 0 1px 0 rgba(15,27,45,0.08), 0 2px 6px rgba(15,27,45,0.04);
}

.hp-sticky-nav-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  flex: 1 1 0;
  min-width: 0;
  height: 60px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  opacity: 0.75;
  border: none;
  background: none;
  padding: 4px 2px;
  border-radius: 0;
}

.hp-sticky-nav-icon:hover,
.hp-sticky-nav-icon.active {
  opacity: 1;
  background: transparent;
}

.hp-sticky-nav-icon.active {
  box-shadow: inset 0 -2px 0 0 #E8920A;
}

.hp-sticky-nav-icon svg {
  width: 28px;
  height: 28px;
  color: #4B5563;
  stroke-width: 1.4;
  transition: color 0.15s;
  flex-shrink: 0;
}

.hp-sticky-nav-icon:hover svg,
.hp-sticky-nav-icon.active svg {
  color: #E8920A;
}

.hp-tooltip {
  font-family: 'Mulish', system-ui, sans-serif;
  font-size: 10.5px;
  font-weight: 600;
  color: #4B5563;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 100%;
  text-align: center;
  letter-spacing: 0;
  line-height: 1.2;
}

.hp-sticky-nav-icon:hover .hp-tooltip,
.hp-sticky-nav-icon.active .hp-tooltip { color: #E8920A; }

/* ── Category Sections ── */
.hp-categories-grid {
  flex: 1;
  min-width: 0;
}

/* Category module — locked spec (2026-04-19, mockup v2).
   Layout:  280px banner | 200px sublist | 1fr cards (3 cols, 2 rows, square).
   Height:  driven by card grid, identical across all 18 L1s.
   Banner:  stretches to section height, 135 deg dark gradient scrim.
   Title:   Barlow Condensed Bold 24px white bottom-left of banner.
   Sublist: DM Sans 15px Medium, amber dot, up to 10 rows, clipped beyond.
   Cards:   aspect-ratio 1:1, image top (10 percent padding), DM Sans 14px SemiBold name. */
.hp-category-section {
  display: grid;
  grid-template-columns: 280px 200px 1fr;
  margin-bottom: 20px;
  background: #fff;
  overflow: hidden;
  border: 1px solid #E2E5EB;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(27,36,56,0.04);
}

/* 1 — Atmosphere banner (left). Stretches to row height set by card grid. */
.hp-cat-banner {
  position: relative;
  overflow: hidden;
  align-self: stretch;
  background: linear-gradient(135deg, #1B2438 0%, #2A3650 100%);
  min-height: 100%;
}

.hp-cat-banner img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 6s ease;
}

.hp-category-section:hover .hp-cat-banner img {
  transform: scale(1.03);
}

.hp-cat-banner-fallback {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  color: #E8920A;
  opacity: 0.45;
}

.hp-cat-banner--placeholder .hp-cat-banner-fallback { display: flex; }

/* Subtle bottom scrim — keeps title readable without washing the photo. */
.hp-cat-banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top,
    rgba(10,14,20,0.70) 0%,
    rgba(10,14,20,0.35) 30%,
    rgba(10,14,20,0.05) 60%,
    rgba(10,14,20,0.00) 100%);
  pointer-events: none;
}

.hp-cat-banner-title-wrap {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 18px;
  z-index: 2;
}

.hp-cat-banner-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
  letter-spacing: 0.01em;
  margin: 0 0 4px;
  text-shadow: 0 1px 8px rgba(0,0,0,0.35);
}

.hp-cat-banner-sub {
  font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 12px;
  font-weight: 500;
  color: rgba(255,255,255,0.72);
  margin: 0;
}

/* 2 — Subcategory name list (middle). Up to 10 rows, clips extra. */
.hp-cat-sublist {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 20px 18px;
  border-left: 1px solid #E2E5EB;
  border-right: 1px solid #E2E5EB;
  background: #F9FAFB;
  overflow: hidden;
}

.hp-cat-sublist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  text-decoration: none;
  color: #1F2937;
  transition: color 0.15s ease;
  flex-shrink: 0;
}

.hp-cat-sublist-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #E8920A;
  opacity: 0.55;
  flex-shrink: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.hp-cat-sublist-name {
  font-family: var(--hp-cat-font, var(--font-dm-sans, 'DM Sans', system-ui, sans-serif));
  font-size: 15px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: -0.005em;
}

.hp-cat-sublist-item:hover {
  color: #CF7F00;
}

.hp-cat-sublist-item:hover .hp-cat-sublist-dot {
  opacity: 1;
  transform: scale(1.3);
}

/* 3 — 6 featured square cards (3×2). Banner height follows these two rows. */
.hp-cat-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1fr;
  gap: 0;
}

.hp-cat-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: #1F2937;
  background: #fff;
  border-right: 1px solid #EEF0F3;
  border-bottom: 1px solid #EEF0F3;
  /* +10% taller than wide — module height grows proportionally,
     banner stretches to match via align-self:stretch above. */
  aspect-ratio: 1 / 1.1;
  min-height: 0;
}

.hp-cat-card:nth-child(3n) { border-right: none; }
.hp-cat-card:nth-last-child(-n+3) { border-bottom: none; }

/* Card stays white on hover — only the image scales and the name shifts amber.
   Avoids the "card-inside-a-card" effect when product PNGs have a white bg. */

.hp-cat-card-image {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10%;
  background: transparent;
  position: relative;
  overflow: hidden;
}

.hp-cat-card-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.hp-cat-card:hover .hp-cat-card-image img {
  transform: scale(1.05);
}

.hp-cat-card-fallback {
  display: none;
  align-items: center;
  justify-content: center;
  color: #E8920A;
  opacity: 0.35;
}

.hp-cat-card-image:not(:has(img)) .hp-cat-card-fallback,
.hp-cat-card-image--placeholder .hp-cat-card-fallback {
  display: flex;
}

.hp-cat-card-name {
  padding: 10px 12px 14px;
  font-family: var(--hp-cat-font, var(--font-dm-sans, 'DM Sans', system-ui, sans-serif));
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: #1F2937;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.15s ease;
}

.hp-cat-card:hover .hp-cat-card-name {
  color: #CF7F00;
}

@media (prefers-reduced-motion: reduce) {
  .hp-cat-banner img,
  .hp-category-section:hover .hp-cat-banner img,
  .hp-cat-card-image img,
  .hp-cat-card:hover .hp-cat-card-image img {
    transition: none;
    transform: none;
  }
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
  .hp-category-explorer { padding: 20px 20px 40px; gap: 16px; }
  .hp-explorer-header { padding: 36px 20px 0; }
  .hp-category-section { grid-template-columns: 240px 180px 1fr; }
  .hp-cat-banner-title { font-size: 22px; }
  .hp-cat-sublist { padding: 16px 14px; }
  .hp-cat-sublist-name { font-size: 14px; }
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

  /* Category sections stack vertically on mobile */
  .hp-category-section {
    display: flex;
    flex-direction: column;
    min-height: auto;
    margin-bottom: 20px;
  }
  .hp-cat-banner { height: 240px; border-right: none; border-bottom: 1px solid #ECEEF1; }
  .hp-cat-banner-title-wrap { left: 20px; right: 20px; bottom: 18px; }
  .hp-cat-banner-title { font-size: 28px; line-height: 1.05; }
  .hp-cat-sublist {
    flex-direction: row;
    flex-wrap: wrap;
    padding: 12px 16px;
    gap: 2px 16px;
    border-right: none;
    border-bottom: 1px solid #ECEEF1;
  }
  .hp-cat-sublist-item { padding: 4px 0; }
  .hp-cat-sublist-name { font-size: 13px; }
  .hp-cat-cards { grid-template-columns: repeat(3, 1fr); }
  .hp-cat-card-image { padding: 10%; }
  .hp-cat-card-name { padding: 10px 6px 14px; font-size: 12px; }
}

/* ═══════ SMALL MOBILE (<400) ═══════ */
@media (max-width: 400px) {
  .hp-deals-row { grid-template-columns: 1fr; }
  .hp-cat-cards { grid-template-columns: repeat(2, 1fr); }
  .hp-cat-card:nth-child(3n) { border-right: 1px solid #ECEEF1; }
  .hp-cat-card:nth-last-child(-n+3):not(:nth-last-child(-n+2)) { border-bottom: 1px solid #ECEEF1; }
}
`
