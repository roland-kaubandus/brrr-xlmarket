# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the xlmarket.eu homepage with white header, slim hero bar, bento category grid with cat-icons, subcategory pills, 5 product sections, AI search palette, and editorial footer — matching the approved mockup FINAL-white-header.html.

**Architecture:** Component-by-component rewrite of the storefront homepage. Each component is self-contained with Tailwind CSS. All product data comes from MeiliSearch (client-side via `/meili/` nginx proxy). Category icons come from `/cat-icons/80/` and `/cat-icons/400/` (already deployed). No new npm dependencies.

**Tech Stack:** Next.js 16, React, Tailwind CSS, MeiliSearch (client-side), lucide-react (already installed)

**Reference mockup:** `/home/brrr/brrr-xlmarket/data/feeds/mockups/FINAL-white-header.html`
**Design spec:** `/home/brrr/brrr-xlmarket/docs/superpowers/specs/2026-04-15-homepage-redesign.md`

---

## File Structure

### Files to Create
| File | Purpose |
|------|---------|
| `storefront/components/HeroBar.tsx` | Slim dark navy info bar below header |
| `storefront/components/HomeBentoGrid.tsx` | New 6-col bento category grid with cat-icons |
| `storefront/components/SubcategoryPills.tsx` | Horizontal scrolling pill row |
| `storefront/components/FlashSaleTimer.tsx` | Countdown timer for flash sale section |
| `storefront/components/AiSearchPalette.tsx` | Command palette overlay (UI only, Phase 1) |
| `storefront/components/HomeProductSection.tsx` | Reusable product section wrapper (title + badge + "See All") |

### Files to Modify
| File | Change |
|------|--------|
| `storefront/components/VevorHeader.tsx` | Full rewrite: white bg, single row, new search, AI button |
| `storefront/components/SearchBar.tsx` | Restyle for white header (dark text, light bg, amber focus) |
| `storefront/components/VevorFooter.tsx` | Rewrite: editorial layout, newsletter, new logo style |
| `storefront/app/[locale]/page.tsx` | Replace BannerCarousel + old sections with new layout |
| `storefront/lib/featured-categories.ts` | Update: 12 categories, cat-icons paths, new sizes |
| `storefront/app/globals.css` | Add new CSS tokens/utilities for bento grid |

### Files to Delete
| File | Reason |
|------|--------|
| `storefront/components/BannerCarousel.tsx` | Replaced by HeroBar |

---

## Task 1: Update Design Tokens in globals.css

**Files:**
- Modify: `storefront/app/globals.css`

- [ ] **Step 1: Add new CSS custom properties and bento utilities**

Add these tokens to the `@theme` block in globals.css:

```css
/* Add to @theme block */
--color-surface: #F8FAFC;
--color-card-border: #F1F5F9;
--color-text-secondary: #475569;
--color-text-muted: #94A3B8;
--color-amber-light: #F59E0B;
--color-amber-glow: rgba(217, 119, 6, 0.10);
```

Add these utility classes after existing utility classes:

```css
/* Bento grid explicit placement */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}

@media (max-width: 1200px) {
  .bento-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 900px) {
  .bento-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 680px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /home/brrr/brrr-xlmarket/storefront && npm run build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add storefront/app/globals.css
git commit -m "[XL] Add design tokens and bento grid utilities for homepage redesign"
```

---

## Task 2: Update featured-categories.ts

**Files:**
- Modify: `storefront/lib/featured-categories.ts`

- [ ] **Step 1: Rewrite featured-categories.ts with 12 categories and new image paths**

Replace entire file content with:

```typescript
export type FeaturedCategory = {
  handle: string
  label: string
  labelEt: string
  image80: string
  image400: string
  size: "large" | "normal"
  productCount: string
}

export const FEATURED_CATEGORIES: FeaturedCategory[] = [
  {
    handle: "tools",
    label: "Tools & Machinery",
    labelEt: "Tööriistad",
    image80: "/cat-icons/80/tools.webp",
    image400: "/cat-icons/400/tools.webp",
    size: "large",
    productCount: "2,400+",
  },
  {
    handle: "automotive",
    label: "Automotive",
    labelEt: "Auto",
    image80: "/cat-icons/80/automotive.webp",
    image400: "/cat-icons/400/automotive.webp",
    size: "normal",
    productCount: "1,840",
  },
  {
    handle: "kitchen",
    label: "Kitchen & Catering",
    labelEt: "Köök",
    image80: "/cat-icons/80/kitchen.webp",
    image400: "/cat-icons/400/kitchen.webp",
    size: "large",
    productCount: "820+",
  },
  {
    handle: "building-materials",
    label: "Building Materials",
    labelEt: "Ehitusmaterjalid",
    image80: "/cat-icons/80/building-materials.webp",
    image400: "/cat-icons/400/building-materials.webp",
    size: "normal",
    productCount: "1,100",
  },
  {
    handle: "outdoors",
    label: "Outdoors",
    labelEt: "Õues",
    image80: "/cat-icons/80/outdoors.webp",
    image400: "/cat-icons/400/outdoors.webp",
    size: "normal",
    productCount: "950",
  },
  {
    handle: "sports-outdoors",
    label: "Sports & Fitness",
    labelEt: "Sport ja fitness",
    image80: "/cat-icons/80/sports-outdoors.webp",
    image400: "/cat-icons/400/sports-outdoors.webp",
    size: "normal",
    productCount: "780",
  },
  {
    handle: "plumbing",
    label: "Plumbing",
    labelEt: "Torustik",
    image80: "/cat-icons/80/plumbing.webp",
    image400: "/cat-icons/400/plumbing.webp",
    size: "large",
    productCount: "380+",
  },
  {
    handle: "industrial-scientific",
    label: "Industrial",
    labelEt: "Tööstus",
    image80: "/cat-icons/80/industrial-scientific.webp",
    image400: "/cat-icons/400/industrial-scientific.webp",
    size: "normal",
    productCount: "520",
  },
  {
    handle: "electrical",
    label: "Electrical",
    labelEt: "Elekter",
    image80: "/cat-icons/80/electrical.webp",
    image400: "/cat-icons/400/electrical.webp",
    size: "large",
    productCount: "460+",
  },
  {
    handle: "hardware",
    label: "Hardware",
    labelEt: "Riistvara",
    image80: "/cat-icons/80/hardware.webp",
    image400: "/cat-icons/400/hardware.webp",
    size: "normal",
    productCount: "340",
  },
  {
    handle: "furniture",
    label: "Furniture",
    labelEt: "Mööbel",
    image80: "/cat-icons/80/furniture.webp",
    image400: "/cat-icons/400/furniture.webp",
    size: "normal",
    productCount: "290",
  },
  {
    handle: "heating-venting-cooling",
    label: "Heating & Cooling",
    labelEt: "Küte ja jahutus",
    image80: "/cat-icons/80/heating-venting-cooling.webp",
    image400: "/cat-icons/400/heating-venting-cooling.webp",
    size: "normal",
    productCount: "410",
  },
]

export const SUBCATEGORY_PILLS = [
  { handle: "angle-grinder", label: "Angle Grinders", labelEt: "Nurklihvijad" },
  { handle: "chainsaws", label: "Chainsaws", labelEt: "Mootorsaed" },
  { handle: "car-jacks", label: "Car Jacks", labelEt: "Tungrauad" },
  { handle: "blenders", label: "Blenders", labelEt: "Blenderid" },
  { handle: "band-saws", label: "Band Saws", labelEt: "Lintsaed" },
  { handle: "bottle-jacks", label: "Bottle Jacks", labelEt: "Pudelitungrauad" },
  { handle: "adirondack-chairs", label: "Adirondack Chairs", labelEt: "Aiatoolid" },
  { handle: "above-ground-pools", label: "Above Ground Pools", labelEt: "Maapealsed basseinid" },
  { handle: "acoustic-foam-panels", label: "Acoustic Foam", labelEt: "Helipaneelid" },
  { handle: "air-compressor-parts-accessories", label: "Compressor Parts", labelEt: "Kompressori osad" },
]
```

- [ ] **Step 2: Commit**

```bash
git add storefront/lib/featured-categories.ts
git commit -m "[XL] Update featured categories: 12 items, cat-icons paths, subcategory pills data"
```

---

## Task 3: Rewrite VevorHeader.tsx

**Files:**
- Modify: `storefront/components/VevorHeader.tsx`
- Modify: `storefront/components/SearchBar.tsx`

The header changes from dark 2-row (navy + orange nav) to white single-row, max-width 1320px, 56px height.

- [ ] **Step 1: Rewrite VevorHeader.tsx**

Replace the entire file. Key design decisions from mockup:
- White background, sticky, 56px height, 1px bottom border `#E2E8F0`
- Logo: `XL` amber (#D97706, weight 800) + `Market` navy (#1E293B, weight 600), ~1.2rem, NO box
- Left nav: ☰ Categories (opens MegaMenu) | Deals | New | Best Sellers — font-weight 600, color #475569, hover: navy + light bg
- Search: centered, flex-1, max-width 520px, `#F8FAFC` bg, `#E2E8F0` border, 8px radius, 36px height
- AI button: separate from search, amber gradient pill, white "AI" + globe icon
- Right: EN toggle, account icon, cart with amber badge
- Mobile (<680px): left nav hidden, search + AI stay, EN hidden

```tsx
import Link from "@/components/SafeLink"
import NavCartButton from "@/components/NavCartButton"
import SearchBar from "@/components/SearchBar"
import MegaMenu from "@/components/MegaMenu"
import AuthButton from "@/components/AuthButton"
import LocaleSwitcher from "@/components/LocaleSwitcher"
import MobileSearchToggle from "@/components/MobileSearchToggle"

const getNavLinks = (locale: string) => locale === "et" ? [
  { label: "Pakkumised", href: `/${locale}/otsing?tag=deals` },
  { label: "Uued", href: `/${locale}/otsing?sort=newest` },
  { label: "Bestsellerid", href: `/${locale}/otsing?tag=hot` },
] : [
  { label: "Deals", href: `/${locale}/otsing?tag=deals` },
  { label: "New", href: `/${locale}/otsing?sort=newest` },
  { label: "Best Sellers", href: `/${locale}/otsing?tag=hot` },
]

export default function VevorHeader({ locale = "et" }: { locale?: string }) {
  const NAV_LINKS = getNavLinks(locale)
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0]">
      <div className="max-w-[1320px] mx-auto h-[56px] flex items-center px-6 gap-3">
        {/* Logo — text only, no box */}
        <Link href={`/${locale}`} className="shrink-0 flex items-baseline" style={{ letterSpacing: "-0.03em" }}>
          <span className="text-[1.2rem] font-extrabold text-[#D97706] leading-none">XL</span>
          <span className="text-[1.2rem] font-semibold text-[#1E293B] leading-none">Market</span>
        </Link>

        {/* Left nav — desktop only */}
        <nav className="hidden lg:flex items-center gap-0.5">
          <MegaMenu locale={locale} />
          {NAV_LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className="px-2.5 py-1.5 text-[0.8rem] font-semibold text-[#475569] rounded-md hover:text-[#1E293B] hover:bg-[#F8FAFC] transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search + AI button — centered */}
        <div className="flex-1 flex items-center gap-1.5 max-w-[520px] mx-auto">
          <div className="flex-1 hidden md:block">
            <SearchBar locale={locale} variant="light" />
          </div>
          <button
            type="button"
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-[0.7rem] font-bold uppercase tracking-wider"
            style={{ background: "linear-gradient(135deg, #D97706, #E8910A)" }}
            aria-label="AI Search"
            data-ai-trigger
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            <span className="hidden sm:inline">AI</span>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <div className="hidden md:block">
            <LocaleSwitcher locale={locale} />
          </div>
          <div className="md:hidden">
            <MobileSearchToggle locale={locale} />
          </div>
          <AuthButton />
          <NavCartButton />
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Update SearchBar.tsx to support `variant="light"` prop**

The current SearchBar is styled for dark background (white text, white/10 bg). Add a `variant` prop:
- `"dark"` (default, existing) — for any future dark-bg usage
- `"light"` — for white header: `#F8FAFC` bg, `#E2E8F0` border, dark text, amber focus ring

Add `variant?: "light" | "dark"` to props. When `variant="light"`:
- Input wrapper: `bg-[#F8FAFC] border-[1.5px] border-[#E2E8F0] rounded-lg h-[36px]`
- Focus: `bg-white border-[#D97706] shadow-[0_0_0_3px_rgba(217,119,6,0.10)]`
- Text color: `text-[#0F172A]`, placeholder: `text-[#94A3B8]`
- Search button: `bg-[#F8FAFC] hover:bg-[#E2E8F0]` with dark icon
- Dropdown: stays the same (already white)

Key changes in SearchBar.tsx:
1. Add `variant` prop with default `"dark"`
2. Compute conditional classNames based on variant
3. Keep all existing logic (debounce, dropdown, keyboard nav) unchanged

- [ ] **Step 3: Verify build**

```bash
cd /home/brrr/brrr-xlmarket/storefront && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add storefront/components/VevorHeader.tsx storefront/components/SearchBar.tsx
git commit -m "[XL] Rewrite header: white bg, single row, AI button, light search bar"
```

---

## Task 4: Create HeroBar.tsx

**Files:**
- Create: `storefront/components/HeroBar.tsx`

- [ ] **Step 1: Create HeroBar component**

Slim dark navy gradient bar below header. Server component (no "use client").

```tsx
export default function HeroBar({ locale = "et" }: { locale?: string }) {
  const isEt = locale === "et"
  return (
    <div
      className="border-t border-white/[.06]"
      style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 60%, #334155 100%)" }}
    >
      <div className="max-w-[1320px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left: slogan */}
        <div className="text-white">
          <h2 className="text-[1.05rem] font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            {isEt ? (
              <>Professional Tools, <span className="text-[#F59E0B]">Half the Price</span></>
            ) : (
              <>Professional Tools, <span className="text-[#F59E0B]">Half the Price</span></>
            )}
          </h2>
          <p className="text-[0.78rem] text-[#94A3B8] mt-0.5">
            {isEt
              ? "Euroopa VEVOR volitatud edasimüüja — otse tehasest"
              : "Europe's VEVOR authorized dealer — direct from factory"}
          </p>
        </div>

        {/* Right: stats — hidden on mobile */}
        <div className="hidden sm:flex gap-7">
          <div className="text-right">
            <div className="text-[1.1rem] font-extrabold text-[#F59E0B] tabular-nums">16K+</div>
            <div className="text-[0.6rem] text-[#94A3B8] uppercase tracking-widest mt-px">
              {isEt ? "Toodet" : "Products"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[1.1rem] font-extrabold text-[#F59E0B] tabular-nums">1,688</div>
            <div className="text-[0.6rem] text-[#94A3B8] uppercase tracking-widest mt-px">
              {isEt ? "Kategooriat" : "Categories"}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add storefront/components/HeroBar.tsx
git commit -m "[XL] Add slim hero bar component"
```

---

## Task 5: Create HomeBentoGrid.tsx

**Files:**
- Create: `storefront/components/HomeBentoGrid.tsx`

- [ ] **Step 1: Create the bento grid component**

Server component. 6-column CSS grid with explicit placement matching the mockup.
- 4 large cards (span 2 cols × 2 rows): tools, kitchen, plumbing, electrical
- 8 normal cards (1×1): automotive, building-materials, outdoors, sports-outdoors, industrial-scientific, hardware, furniture, heating-venting-cooling
- White cards, `#F1F5F9` border, 20px radius
- Large images: max-width 240px from `/cat-icons/400/`
- Normal images: max-width 96px from `/cat-icons/80/`
- Hover: translateY(-4px) + subtle shadow
- NO drop-shadow on images, NO colored card backgrounds
- Top right: "All 1,688 categories →" link

```tsx
import Link from "@/components/SafeLink"
import { FEATURED_CATEGORIES, type FeaturedCategory } from "@/lib/featured-categories"

function BentoCard({ cat, locale, index }: { cat: FeaturedCategory; locale: string; index: number }) {
  const isLarge = cat.size === "large"
  const label = locale === "et" ? cat.labelEt : cat.label
  const imgSrc = isLarge ? cat.image400 : cat.image80
  const imgMax = isLarge ? "max-w-[240px]" : "max-w-[96px]"

  // Explicit grid placement classes matching mockup layout
  const placementClasses: Record<number, string> = {
    0: "col-span-2 row-span-2",          // tools (large)
    1: "",                                 // automotive
    2: "col-span-2 row-span-2",          // kitchen (large)
    3: "",                                 // building-materials
    4: "",                                 // outdoors
    5: "",                                 // sports-outdoors
    6: "col-span-2 row-span-2",          // plumbing (large)
    7: "",                                 // industrial-scientific
    8: "col-span-2 row-span-2",          // electrical (large)
    9: "",                                 // hardware
    10: "",                                // furniture
    11: "",                                // heating-venting-cooling
  }

  return (
    <Link
      href={`/${locale}/kategooriad/${cat.handle}`}
      prefetch={false}
      className={`
        group bg-white border border-[#F1F5F9] rounded-[20px] overflow-hidden
        flex flex-col items-center justify-center text-center
        transition-all duration-300 hover:-translate-y-1
        hover:shadow-[0_8px_25px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.04)]
        hover:border-[#E2E8F0]
        ${placementClasses[index] || ""}
        ${isLarge ? "min-h-[280px] p-5" : "min-h-[150px] p-4"}
      `}
      style={{ transitionTimingFunction: "cubic-bezier(.16,1,.3,1)" }}
    >
      <img
        src={imgSrc}
        alt={label}
        loading={index < 4 ? "eager" : "lazy"}
        className={`w-full ${imgMax} aspect-square object-contain mb-2.5 transition-transform duration-300 group-hover:scale-[1.04]`}
        style={{ transitionTimingFunction: "cubic-bezier(.16,1,.3,1)" }}
      />
      <div className={`font-semibold text-[#0F172A] mb-0.5 ${isLarge ? "text-[18px]" : "text-[14px]"}`}>
        {label}
      </div>
      <div className="text-[12px] text-[#94A3B8] font-medium">
        {cat.productCount} {locale === "et" ? "toodet" : "products"}
      </div>
    </Link>
  )
}

export default function HomeBentoGrid({ locale }: { locale: string }) {
  return (
    <section className="pt-12 pb-0">
      <div className="max-w-[1320px] mx-auto px-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-[1.5px]">
            {locale === "et" ? "Kategooriad" : "Shop by Category"}
          </span>
          <Link
            href={`/${locale}/kategooriad`}
            className="text-[13px] font-semibold text-[#D97706] flex items-center gap-1 hover:gap-2 transition-all"
          >
            {locale === "et" ? "Kõik 1 688 kategooriat" : "All 1,688 categories"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>

        {/* Bento grid */}
        <div className="bento-grid">
          {FEATURED_CATEGORIES.map((cat, i) => (
            <BentoCard key={cat.handle} cat={cat} locale={locale} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

Note: The `.bento-grid` class with responsive breakpoints is defined in globals.css (Task 1). On mobile (<680px), large cards become `col-span-2 row-span-1` — add this override in globals.css:

```css
@media (max-width: 680px) {
  .bento-grid .col-span-2.row-span-2 {
    grid-row: span 1;
  }
  .bento-grid .col-span-2 .min-h-\[280px\] {
    min-height: 180px;
  }
}
```

Actually, use Tailwind responsive classes directly in the component instead. The large cards should use:
- Desktop: `md:col-span-2 md:row-span-2`
- Mobile: `col-span-2` (span 2 cols but only 1 row)

Update the placement classes to use responsive prefixes:
```
0: "col-span-2 md:row-span-2"  // large cards get 2 rows on md+
```

- [ ] **Step 2: Commit**

```bash
git add storefront/components/HomeBentoGrid.tsx
git commit -m "[XL] Add bento category grid with cat-icons"
```

---

## Task 6: Create SubcategoryPills.tsx

**Files:**
- Create: `storefront/components/SubcategoryPills.tsx`

- [ ] **Step 1: Create subcategory pills component**

Server component. Horizontal scrolling pill row.

```tsx
import Link from "@/components/SafeLink"
import { SUBCATEGORY_PILLS } from "@/lib/featured-categories"

export default function SubcategoryPills({ locale }: { locale: string }) {
  return (
    <section className="pt-10">
      <div className="max-w-[1320px] mx-auto px-6">
        <div className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-[1.5px] mb-5">
          {locale === "et" ? "Populaarsed alamkategooriad" : "Popular Subcategories"}
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}>
          {SUBCATEGORY_PILLS.map(pill => (
            <Link
              key={pill.handle}
              href={`/${locale}/kategooriad/${pill.handle}`}
              prefetch={false}
              className="flex items-center gap-2 pl-2 pr-4 py-2 rounded-full bg-[#F8FAFC] border border-[#F1F5F9] whitespace-nowrap shrink-0 transition-all duration-150 hover:bg-white hover:border-[#D97706] hover:-translate-y-0.5"
              style={{ scrollSnapAlign: "start" }}
            >
              <img
                src={`/cat-icons/80/${pill.handle}.webp`}
                alt=""
                className="w-9 h-9 rounded-full object-contain bg-white border border-[#F1F5F9]"
                loading="lazy"
              />
              <span className="text-[13px] font-medium text-[#0F172A]">
                {locale === "et" ? pill.labelEt : pill.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add storefront/components/SubcategoryPills.tsx
git commit -m "[XL] Add subcategory pills horizontal scroll"
```

---

## Task 7: Create HomeProductSection.tsx and FlashSaleTimer.tsx

**Files:**
- Create: `storefront/components/HomeProductSection.tsx`
- Create: `storefront/components/FlashSaleTimer.tsx`

- [ ] **Step 1: Create HomeProductSection — reusable section wrapper**

Client component (wraps ProductGrid which is client-side).

```tsx
import Link from "@/components/SafeLink"
import ProductGrid from "@/components/ProductGrid"

type Props = {
  title: string
  seeAllHref: string
  seeAllLabel?: string
  locale: string
  fetchParams: Record<string, unknown>
  badge?: "new" | "best" | "deal" | "flash"
  timer?: React.ReactNode
  clearable?: boolean
}

export default function HomeProductSection({
  title, seeAllHref, seeAllLabel, locale, fetchParams, timer, clearable,
}: Props) {
  return (
    <section className="pt-12 first:pt-12 [&+&]:border-t [&+&]:border-[#F1F5F9] [&+&]:mt-12">
      <div className="max-w-[1320px] mx-auto px-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-[22px] font-bold text-[#0F172A] tracking-tight" style={{ letterSpacing: "-0.3px" }}>
              {title}
            </h2>
            {timer}
          </div>
          <Link
            href={seeAllHref}
            className="text-[13px] font-semibold text-[#D97706] flex items-center gap-1 hover:gap-2 transition-all"
          >
            {clearable
              ? (locale === "et" ? "Tühjenda" : "Clear")
              : (seeAllLabel || (locale === "et" ? "Vaata kõiki" : "See All"))}
            {clearable ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            )}
          </Link>
        </div>

        {/* Product grid */}
        <ProductGrid
          fetchParams={fetchParams}
          locale={locale}
          columns="2-3-5"
        />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create FlashSaleTimer — countdown timer**

Client component with live countdown. Timer counts down to midnight UTC daily (resets every 24h).

```tsx
"use client"

import { useState, useEffect } from "react"

export default function FlashSaleTimer() {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    function calcRemaining() {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setUTCHours(24, 0, 0, 0)
      const diff = Math.max(0, midnight.getTime() - now.getTime())
      return {
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      }
    }

    setTime(calcRemaining())
    const interval = setInterval(() => setTime(calcRemaining()), 1000)
    return () => clearInterval(interval)
  }, [])

  const pad = (n: number) => n.toString().padStart(2, "0")

  return (
    <div className="flex items-center gap-2 ml-4">
      <span className="px-2 py-1 rounded-md bg-[#1E293B] text-white text-[14px] font-bold tabular-nums min-w-[34px] text-center">{pad(time.h)}</span>
      <span className="text-[#1E293B] font-bold text-[16px]">:</span>
      <span className="px-2 py-1 rounded-md bg-[#1E293B] text-white text-[14px] font-bold tabular-nums min-w-[34px] text-center">{pad(time.m)}</span>
      <span className="text-[#1E293B] font-bold text-[16px]">:</span>
      <span className="px-2 py-1 rounded-md bg-[#1E293B] text-white text-[14px] font-bold tabular-nums min-w-[34px] text-center">{pad(time.s)}</span>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add storefront/components/HomeProductSection.tsx storefront/components/FlashSaleTimer.tsx
git commit -m "[XL] Add product section wrapper and flash sale timer"
```

---

## Task 8: Create AiSearchPalette.tsx

**Files:**
- Create: `storefront/components/AiSearchPalette.tsx`

- [ ] **Step 1: Create AI search command palette (UI only, Phase 1)**

Client component. Opens on AI button click or Ctrl+K / Cmd+K.

```tsx
"use client"

import { useState, useEffect, useRef } from "react"

export default function AiSearchPalette({ locale = "et" }: { locale?: string }) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Listen for AI button click via data-ai-trigger attribute
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("[data-ai-trigger]")) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [])

  // Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  if (!open) return null

  const isEt = locale === "et"

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[100px] bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="w-[90%] max-w-[620px] bg-white rounded-[20px] shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden">
        {/* Search input row */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F1F5F9]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder={isEt ? "Otsi tooteid või küsi AI-lt…" : "Search products or ask AI…"}
            className="flex-1 border-none outline-none text-[16px] text-[#0F172A] bg-transparent placeholder:text-[#94A3B8]"
          />
          <span className="shrink-0 px-2.5 py-1 rounded-md text-white text-[0.65rem] font-bold uppercase tracking-wider" style={{ background: "linear-gradient(135deg, #D97706, #E8910A)" }}>
            AI
          </span>
        </div>

        {/* Quick actions */}
        <div className="px-5 py-4">
          <div className="text-[12px] text-[#94A3B8] mb-3">{isEt ? "Kiirtoimingud" : "Quick actions"}</div>
          <div className="flex flex-col gap-1">
            {[
              { icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", label: isEt ? "Tänased pakkumised" : "Today's Deals" },
              { icon: "M12 2v20M2 12h20", label: isEt ? "Uued tooted" : "New Arrivals" },
              { icon: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z", label: isEt ? "Bestsellerid" : "Best Sellers" },
            ].map(action => (
              <button
                key={action.label}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors text-left"
              >
                <span className="w-7 h-7 rounded-md bg-[#F8FAFC] flex items-center justify-center text-[#94A3B8] shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={action.icon}/>
                  </svg>
                </span>
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI chat area (static, Phase 1) */}
        <div className="px-5 py-4 border-t border-[#F1F5F9]">
          <div className="px-3.5 py-2.5 rounded-[10px_10px_10px_2px] bg-[#F8FAFC] text-[13px] text-[#475569] leading-relaxed max-w-[85%] mb-2">
            {isEt
              ? "Tere! Saan aidata õige tööriista leidmisel. Proovi: \"Millist puuri betoonile vaja?\" või \"Parim keevitusaparaat alla 200€\""
              : "Hi! I can help you find the right tool for your project. Try: \"What drill do I need for concrete?\" or \"Best welder under €200\""}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder={isEt ? "Küsi toote kohta…" : "Ask about any product…"}
              className="flex-1 px-3.5 py-2 border-[1.5px] border-[#F1F5F9] rounded-full text-[13px] outline-none focus:border-[#D97706]"
              disabled
            />
            <button
              className="px-4 py-2 rounded-full bg-[#D97706] text-white text-[12px] font-semibold shrink-0 opacity-50 cursor-not-allowed"
              disabled
            >
              {isEt ? "Saada" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add storefront/components/AiSearchPalette.tsx
git commit -m "[XL] Add AI search command palette (UI only, Phase 1)"
```

---

## Task 9: Rewrite VevorFooter.tsx

**Files:**
- Modify: `storefront/components/VevorFooter.tsx`

- [ ] **Step 1: Rewrite footer with editorial layout**

Replace entire file. New layout per mockup:
- Dark navy background (#1E293B)
- 5-column grid: Brand (1.4fr) | Shop | Support | Company | Newsletter (1.2fr)
- Logo: XLMarket 32px, amber XL + white Market, written together, NO box
- Newsletter: email input + Subscribe button
- Bottom bar: copyright + legal links

```tsx
import Link from "@/components/SafeLink"

export default function VevorFooter({ locale = "et" }: { locale?: string }) {
  const isEt = locale === "et"
  return (
    <footer className="mt-20 bg-[#1E293B] text-[#CBD5E1]" style={{ padding: "64px 0 32px" }}>
      <div className="max-w-[1320px] mx-auto px-6">
        {/* Top grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr] gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link href={`/${locale}`} className="inline-block mb-4" style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1 }}>
              <span className="text-[#D97706]">XL</span><span className="text-white">Market</span>
            </Link>
            <p className="text-[14px] text-[#94A3B8] leading-relaxed max-w-[260px]">
              {isEt
                ? "Professionaalne varustus igale valdkonnale. Eesti juhtiv profiseadmete e-pood."
                : "Your trusted source for professional tools, equipment, and home improvement products across Europe."}
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-[12px] font-bold text-[#64748B] uppercase tracking-[1.5px] mb-4">
              {isEt ? "Pood" : "Shop"}
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li><Link href={`/${locale}/kategooriad`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Kõik kategooriad" : "All Categories"}</Link></li>
              <li><Link href={`/${locale}/otsing?sort=newest`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Uued tooted" : "New Arrivals"}</Link></li>
              <li><Link href={`/${locale}/otsing?tag=hot`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Bestsellerid" : "Best Sellers"}</Link></li>
              <li><Link href={`/${locale}/otsing?tag=deals`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Pakkumised" : "Deals"}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-[12px] font-bold text-[#64748B] uppercase tracking-[1.5px] mb-4">
              {isEt ? "Tugi" : "Support"}
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li><Link href={`/${locale}/kontakt`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Kontakt" : "Contact Us"}</Link></li>
              <li><Link href={`/${locale}/tarne`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Tarne info" : "Shipping Info"}</Link></li>
              <li><Link href={`/${locale}/tagastamine`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Tagastamine" : "Returns"}</Link></li>
              <li><Link href={`/${locale}/kontakt`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "KKK" : "FAQ"}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[12px] font-bold text-[#64748B] uppercase tracking-[1.5px] mb-4">
              {isEt ? "Ettevõte" : "Company"}
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li><Link href={`/${locale}/meist`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Meist" : "About Us"}</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-[12px] font-bold text-[#64748B] uppercase tracking-[1.5px] mb-4">
              {isEt ? "Uudiskiri" : "Newsletter"}
            </h4>
            <p className="text-[13px] text-[#94A3B8] leading-relaxed mb-3.5">
              {isEt
                ? "Saa teada parimatest pakkumistest ja uutest toodetest."
                : "Stay updated with the best deals and new product launches."}
            </p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder={isEt ? "sinu@email.ee" : "your@email.com"}
                className="flex-1 px-4 py-2.5 rounded-full border border-[#334155] bg-[#0F172A] text-white text-[13px] outline-none placeholder:text-[#475569] focus:border-[#D97706] min-w-0"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-[#D97706] hover:bg-[#F59E0B] text-white text-[13px] font-semibold shrink-0 transition-colors"
              >
                {isEt ? "Telli" : "Subscribe"}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[.06] pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-[12px] text-[#475569]">
          <span>&copy; 2026 Roland Kaubandus OÜ. {isEt ? "Kõik õigused kaitstud." : "All rights reserved."}</span>
          <div className="flex gap-5">
            <Link href={`/${locale}/privaatsus`} className="text-[#64748B] hover:text-[#94A3B8] transition-colors">{isEt ? "Privaatsus" : "Privacy"}</Link>
            <Link href={`/${locale}/tingimused`} className="text-[#64748B] hover:text-[#94A3B8] transition-colors">{isEt ? "Tingimused" : "Terms"}</Link>
            <Link href={`/${locale}/kupsised`} className="text-[#64748B] hover:text-[#94A3B8] transition-colors">{isEt ? "Küpsised" : "Cookies"}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add storefront/components/VevorFooter.tsx
git commit -m "[XL] Rewrite footer: editorial layout, newsletter, new logo style"
```

---

## Task 10: Rewrite Homepage (page.tsx) and Delete BannerCarousel

**Files:**
- Modify: `storefront/app/[locale]/page.tsx`
- Delete: `storefront/components/BannerCarousel.tsx`

- [ ] **Step 1: Rewrite page.tsx**

Replace BannerCarousel + old CategoryBentoGrid + 2 product sections with:
HeroBar → HomeBentoGrid → SubcategoryPills → 5 HomeProductSections (New, Best Sellers, Deals, Flash Sale, Recently Viewed) → AiSearchPalette

```tsx
import type { Metadata } from "next"
import HeroBar from "@/components/HeroBar"
import HomeBentoGrid from "@/components/HomeBentoGrid"
import SubcategoryPills from "@/components/SubcategoryPills"
import HomeProductSection from "@/components/HomeProductSection"
import FlashSaleTimer from "@/components/FlashSaleTimer"
import AiSearchPalette from "@/components/AiSearchPalette"

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isEt = locale === "et"
  return {
    title: isEt
      ? "XLMarket — Professionaalsed tööriistad poole hinnaga"
      : "XLMarket — Professional Tools, Half the Price",
    description: isEt
      ? "Üle 16 000 toote: tööriistad, seadmed, köögivarustus, autovarustus. Soodne hind, 2-aastane garantii, tarne üle Euroopa."
      : "Over 16,000 products: tools, equipment, kitchen, automotive. Affordable prices, 2-year warranty, delivery across Europe.",
    alternates: {
      canonical: `https://xlmarket.store/${locale}`,
      languages: {
        et: "https://xlmarket.store/et",
        en: "https://xlmarket.store/en",
      },
    },
  }
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const isEt = locale === "et"

  return (
    <>
      <HeroBar locale={locale} />

      <HomeBentoGrid locale={locale} />

      <SubcategoryPills locale={locale} />

      {/* New Arrivals */}
      <HomeProductSection
        title={isEt ? "Uued tooted" : "New Arrivals"}
        seeAllHref={`/${locale}/otsing?sort=newest`}
        locale={locale}
        fetchParams={{ q: "", sort: "created_at:desc", limit: 10, locale }}
      />

      {/* Best Sellers */}
      <HomeProductSection
        title={isEt ? "Bestsellerid" : "Best Sellers"}
        seeAllHref={`/${locale}/otsing?tag=hot`}
        locale={locale}
        fetchParams={{ q: "", sort: "price:desc", limit: 10, locale }}
      />

      {/* Deals of the Week */}
      <HomeProductSection
        title={isEt ? "Nädala pakkumised" : "Deals of the Week"}
        seeAllHref={`/${locale}/otsing?tag=deals`}
        locale={locale}
        fetchParams={{ q: "", filter: "discount > 0", sort: "discount:desc", limit: 10, locale }}
      />

      {/* Flash Sale */}
      <HomeProductSection
        title={isEt ? "Välkmüük" : "Flash Sale"}
        seeAllHref={`/${locale}/otsing?tag=flash-sale`}
        locale={locale}
        fetchParams={{ q: "", filter: "discount > 30", sort: "discount:desc", limit: 10, locale }}
        timer={<FlashSaleTimer />}
      />

      <AiSearchPalette locale={locale} />
    </>
  )
}
```

- [ ] **Step 2: Delete BannerCarousel.tsx**

```bash
rm storefront/components/BannerCarousel.tsx
```

- [ ] **Step 3: Verify no other imports of BannerCarousel exist**

Search for `BannerCarousel` in the codebase. If found elsewhere, remove those imports.

```bash
grep -r "BannerCarousel" storefront/ --include="*.tsx" --include="*.ts"
```

Expected: No matches (page.tsx was the only consumer).

- [ ] **Step 4: Verify build**

```bash
cd /home/brrr/brrr-xlmarket/storefront && npm run build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add storefront/app/\[locale\]/page.tsx storefront/components/
git commit -m "[XL] Assemble new homepage: hero + bento + pills + 5 product sections + AI palette"
```

---

## Task 11: Deploy and Verify

**Files:** None (build + deploy)

- [ ] **Step 1: Full build**

```bash
cd /home/brrr/brrr-xlmarket/storefront && npm run build
```

- [ ] **Step 2: Copy static assets to standalone**

```bash
cp -r .next/static .next/standalone/.next/static
```

- [ ] **Step 3: Reload PM2**

```bash
pm2 reload xlmarket-storefront
```

- [ ] **Step 4: Wait 10s, then verify**

```bash
sleep 10
curl -s -o /dev/null -w "%{http_code} %{time_total}s" https://xlmarket.store/en
curl -s -o /dev/null -w "%{http_code} %{time_total}s" https://xlmarket.store/et
```

Expected: 200 for both, response time < 3s.

- [ ] **Step 5: Visual QA — check key elements**

```bash
# Check that hero bar renders
curl -s https://xlmarket.store/en | grep -o "Professional Tools" | head -1

# Check that bento grid renders with cat-icons
curl -s https://xlmarket.store/en | grep -o "cat-icons/400" | head -3

# Check footer has new logo style
curl -s https://xlmarket.store/en | grep -o "Roland Kaubandus" | head -1
```

Expected: All three return matches.

---

## Task 12: Responsive Pass and Polish

After deploy, visually review at breakpoints 320, 680, 900, 1200, 1440px. Fix any issues found:
- Header: mobile hamburger visible, search bar responsive
- Hero bar: stats hidden on mobile, slogan visible
- Bento grid: 2→3→4→6 columns responsive
- Subcategory pills: scroll behavior on mobile
- Product sections: 2→3→5 columns
- Footer: stacks properly on mobile
- AI palette: mobile full-width

- [ ] **Step 1: Test responsive breakpoints via curl + browser**

Check each breakpoint in browser at https://xlmarket.store/en

- [ ] **Step 2: Fix any responsive issues found**

Apply fixes as needed.

- [ ] **Step 3: Rebuild + deploy fixes**

```bash
cd /home/brrr/brrr-xlmarket/storefront && npm run build && cp -r .next/static .next/standalone/.next/static && pm2 reload xlmarket-storefront
```

- [ ] **Step 4: Final commit**

```bash
git add -A storefront/
git commit -m "[XL] Homepage redesign: responsive polish"
```

---

## Dependency Graph

```
Task 1 (globals.css tokens) ──┐
Task 2 (featured-categories) ─┤
                               ├── Task 5 (HomeBentoGrid) ──┐
Task 3 (Header + SearchBar) ──┤                              │
Task 4 (HeroBar) ─────────────┤                              ├── Task 10 (page.tsx assembly)
Task 6 (SubcategoryPills) ─────┤                              │      │
Task 7 (ProductSection+Timer) ─┤                              │      ├── Task 11 (Deploy)
Task 8 (AiSearchPalette) ──────┘                              │      │      │
Task 9 (Footer) ───────────────────────────────────────────────┘      │      ├── Task 12 (Polish)
                                                                       │
```

**Parallelizable groups:**
- **Wave 1** (independent): Tasks 1, 2, 3, 4, 6, 7, 8, 9
- **Wave 2** (depends on 1+2): Task 5
- **Wave 3** (depends on all): Task 10
- **Wave 4** (sequential): Tasks 11 → 12

Most tasks in Wave 1 can run as parallel subagents in isolated worktrees, then be merged.
