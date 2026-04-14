# Homepage Redesign Spec — 2026-04-15

## Summary

Redesign the xlmarket.eu homepage with a new white header, slim hero bar, bento category grid using the new 3,413 white-background category icons, AI search button, and organized product sections.

**Reference mockup:** https://xlmarket.store/feeds/mockups/FINAL-white-header.html
**Source file:** `/home/brrr/brrr-xlmarket/data/feeds/mockups/FINAL-white-header.html`

---

## 1. Header

**Style:** White background, sticky, 56px height, max-width 1320px centered.

### Logo
- Text only: `XLMarket` — `XL` in amber (#D97706, weight 800) + `Market` in navy (#1E293B, weight 600)
- No box, no background, no border — ever
- Font-size: ~1.2rem

### Left navigation
Order: `☰ Categories` | `Deals` | `New` | `Best Sellers`
- Categories has a hamburger icon (3 lines) before text
- Font-weight: 600, color: #475569, hover: navy + light bg
- Categories opens the existing MegaMenu

### Search bar (center)
- Real `<input>` element, not a button
- Background: #F8FAFC, border: 1.5px solid #E2E8F0
- Focus: white bg, amber border, amber glow ring (`0 0 0 3px rgba(217,119,6,.10)`)
- Placeholder: "Search 16,000+ products…"
- Magnifying glass icon inside left

### AI button (separate, right of search)
- Standalone button NEXT TO the search bar, not inside it
- Amber gradient background, white text "AI" + globe icon
- On click: opens command palette overlay (see section 7)

### Right side
- Language toggle (EN)
- Account icon (user silhouette)
- Cart icon with amber badge (count)

### Mobile (< 680px)
- Left nav hidden, hamburger menu instead
- Search stays, AI button stays
- EN toggle hidden

---

## 2. Hero Bar

**Style:** Dark navy gradient, slim (~52px content height).

### Left side
- `Professional Tools, Half the Price` — white text, "Half the Price" in amber-light (#F59E0B)
- Subtitle: `Europe's VEVOR authorized dealer — direct from factory` in #94A3B8

### Right side
- `16K+` Products
- `1,688` Categories
- NO shipping price (removed by request)

### Mobile
- Stats hidden, only slogan visible

---

## 3. Category Bento Grid

**Most important section of the page.**

### Layout
- 6-column CSS grid on desktop
- 4 large cards (span 2 cols × 2 rows) + 8 normal cards (1×1)
- Gap: 12px
- Responsive: 4-col (1200px), 3-col (900px), 2-col (680px)

### Cards
- Background: white (#FFFFFF)
- Border: 1px solid #F1F5F9
- Border-radius: 20px
- Hover: translateY(-4px) + subtle shadow
- NO colored backgrounds, NO gradients on cards

### Images
- Large cards: `/cat-icons/400/{handle}.webp`, max-width 240px
- Normal cards: `/cat-icons/80/{handle}.webp`, max-width 96px
- Object-fit: contain
- NO drop-shadow, NO filter effects
- Images are on white backgrounds — they blend naturally with white cards

### Category data
Source: `lib/featured-categories.ts` (update handles/counts) + `public/cat-icons/manifest.json`

### Grid order (12 categories)
| Position | Handle | Size | Image |
|----------|--------|------|-------|
| 1 | tools | large | 400/ |
| 2 | automotive | normal | 80/ |
| 3 | kitchen | large | 400/ |
| 4 | building-materials | normal | 80/ |
| 5 | outdoors | normal | 80/ |
| 6 | sports-outdoors | normal | 80/ |
| 7 | plumbing | large | 400/ |
| 8 | industrial-scientific | normal | 80/ |
| 9 | electrical | large | 400/ |
| 10 | hardware | normal | 80/ |
| 11 | furniture | normal | 80/ |
| 12 | heating-venting-cooling | normal | 80/ |

### "All categories" link
- Top right of section: "All 1,688 categories →"

---

## 4. Popular Subcategories

Horizontal scrolling pill row below the bento grid.

### Pill design
- Rounded pill shape, #F8FAFC background, #F1F5F9 border
- 36px circular icon (from cat-icons/80/) + text label
- Hover: white bg, amber border, lift -2px

### Subcategories to show
angle-grinder, chainsaws, car-jacks, blenders, band-saws, bottle-jacks, adirondack-chairs, above-ground-pools, acoustic-foam-panels, air-compressor-parts-accessories

---

## 5. Product Sections

Five sections in order, each separated by a 1px #F1F5F9 divider:

### 5.1 New Arrivals
- 5-column product grid
- Badge: navy "New" pill

### 5.2 Best Sellers
- Same grid
- Badge: amber "Best" pill

### 5.3 Deals of the Week
- Same grid
- Badge: green discount pill (e.g., "-36%")
- Show old price (strikethrough) + new price

### 5.4 Flash Sale
- Same grid
- Live countdown timer (HH:MM:SS) in navy blocks next to title
- Badge: red "Flash" pill with percentage

### 5.5 Recently Viewed
- Same grid
- No badges
- "Clear" link instead of "See All"

### Product card design
- White bg, #F1F5F9 border, 14px border-radius
- Image area: #F8FAFC background, square aspect ratio, 80% image size
- Hover: lift -3px + shadow
- Info: product name (2 lines clamp), price (18px bold), star rating

### Data source
All product sections use the existing `ProductGrid` component which fetches from MeiliSearch. The implementation should use the same `fetchParams` pattern with appropriate `sort` and `filter` values.

---

## 6. Footer

### Style
Dark navy background, editorial typography.

### Logo
- `XLMarket` — 32px, amber "XL" + white "Market", written together
- Below: tagline paragraph in #94A3B8

### Columns (5)
1. **Brand** — logo + tagline
2. **Shop** — All Categories, New Arrivals, Best Sellers, Deals
3. **Support** — Contact Us, Shipping Info, Returns, FAQ
4. **Company** — About Us, Blog
5. **Newsletter** — description + email input + Subscribe button (amber)

### Bottom bar
- Copyright: "© 2026 Roland Kaubandus OÜ. All rights reserved."
- Legal links: Privacy | Terms | Cookies

---

## 7. AI Search Command Palette

### Trigger
Click the AI button next to search bar, or press Ctrl+K / Cmd+K.

### Desktop
- Centered modal (max-width 620px), backdrop blur overlay
- Top: search input with magnifying glass + AI badge
- Middle: quick actions (Today's Deals, New Arrivals, Best Sellers)
- Bottom: AI chat area with greeting message + input field

### Mobile (< 640px)
- Full-screen overlay below header
- Same structure, adapted to full width

### Functionality (Phase 1 — mockup only)
The AI assistant is not yet implemented. Phase 1 shows the UI only. The chat input is non-functional. Phase 2 will connect to an AI backend.

---

## 8. Migration from Current Design

### Files to modify
| File | Change |
|------|--------|
| `storefront/app/[locale]/page.tsx` | Replace BannerCarousel + CategoryBentoGrid with new hero + bento |
| `storefront/components/VevorHeader.tsx` | Rewrite: white bg, new layout, AI button |
| `storefront/components/BannerCarousel.tsx` | Remove (replaced by slim hero) |
| `storefront/components/CategoryBentoGrid.tsx` | Rewrite with new bento grid using cat-icons |
| `storefront/components/VevorFooter.tsx` | Update: new logo style, newsletter, editorial layout |
| `storefront/lib/featured-categories.ts` | Update image paths: `/cat-thumbs/` → `/cat-icons/400/` |
| `storefront/components/MegaMenu.tsx` | Update thumbnails: `cat-thumbs/` → `cat-icons/80/` |
| `storefront/app/globals.css` | Add new tokens if needed |

### New files
| File | Purpose |
|------|---------|
| `storefront/components/HeroBar.tsx` | Slim dark info bar |
| `storefront/components/SubcategoryPills.tsx` | Horizontal scroll pills |
| `storefront/components/AiSearchPalette.tsx` | Command palette overlay |
| `storefront/components/FlashSaleTimer.tsx` | Countdown timer for flash sale section |

### Files to delete
| File | Reason |
|------|--------|
| `storefront/components/BannerCarousel.tsx` | Replaced by HeroBar |

### Image migration
- `cat-thumbs/` → `cat-icons/80/` and `cat-icons/400/` (manifest.json maps handles)
- Branch images (`/images/branches/`) still used by branch pages, not touched

---

## 9. Constraints

- All product data comes from MeiliSearch (client-side), NOT Medusa API
- Category icons are already generated: 3,413 handles × 2 sizes (80px, 400px)
- No new npm dependencies needed for Phase 1
- Must work in PM2 cluster mode (5 workers, standalone build)
- After build: `cp -r .next/static .next/standalone/.next/static` + `pm2 reload`
- Logo has NO box/background — text only, always

---

## 10. Build Order

1. Header (VevorHeader.tsx rewrite)
2. Hero bar (new component)
3. Category bento grid (rewrite)
4. Subcategory pills (new component)
5. Product sections (update page.tsx to add Deals, Flash, History)
6. AI search palette (new component, UI only)
7. Footer (VevorFooter.tsx update)
8. Responsive pass + visual QA
9. Build + deploy + verify
