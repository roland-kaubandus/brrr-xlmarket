# XLMarket Designer Brief — Homepage Category Module + Category View

## Context

XLMarket is a B2B-first VEVOR reseller for Estonia/Spain. Target customer: entrepreneurs buying complete business startup kits (café, auto-shop, barber, print-shop, bakery, cleaning). 22-category taxonomy. VAT 24% tax-inclusive. Markup 1.15× on VEVOR base price.

## Non-negotiables

- **B2B positioning** must be visible (volume pricing, Net-30, dedicated manager, starter kits)
- **22-category module system** — these are the L1 categories (see below)
- **Module-based layout** — categories as cards/tiles/cells, not a flat list
- English copy only — do NOT translate to Estonian
- Logo as text only: "XLMarket" — no box, no background
- NO emojis — use inline SVG or Lucide icon names
- Font: DM Sans (load via Google Fonts)
- Color tokens: Deep Navy `#1E293B`, Amber accent `#D97706`, but each designer may adapt
- Images: use existing `/images/cat-*-<slug>.png` atmosphere photos OR generate new ones via nano-banana (limit: 3 new images per designer)

## 22 L1 Categories (use these exact names + slugs)

| # | Name | Slug | Image file |
|---|------|------|------------|
| 1 | HoReCa & Food Service | horeca-food-service | cat-01-horeca-food-service.png |
| 2 | Laser, CNC & Digital Fabrication | laser-cnc-digital-fabrication | cat-05-laser-cnc-digital-fabrication.png |
| 3 | Welding & Metalworking | welding-metalworking | cat-04-welding-metalworking.png |
| 4 | Printing, Packaging & Signage | printing-packaging-signage | cat-07-printing-packaging-signage.png |
| 5 | Electrical & Energy | electrical-energy | cat-08-electrical-energy.png |
| 6 | Woodworking & Carpentry | woodworking-carpentry | cat-06-woodworking-carpentry.png |
| 7 | Construction & Building | construction-building | cat-02-construction-building.png |
| 8 | Cleaning & Janitorial | cleaning-janitorial | cat-15-cleaning-janitorial.png |
| 9 | Hand & Power Tools | hand-power-tools | cat-03-hand-power-tools.png |
| 10 | Fuel, Lubrication & Fluid Management | fuel-lubrication-fluid | cat-14-fuel-lubrication-fluid.png |
| 11 | Outdoor Power & Landscaping | outdoor-power-landscaping | cat-13-outdoor-power-landscaping.png |
| 12 | Warehousing & Material Handling | warehousing-material-handling | cat-11-warehousing-material-handling.png |
| 13 | HVAC & Climate Control | hvac-climate-control | cat-09-hvac-climate-control.png |
| 14 | Plumbing & Water Systems | plumbing-water-systems | cat-10-plumbing-water-systems.png |
| 15 | Safety, Security & Workwear | safety-security-workwear | cat-16-safety-security-workwear.png |
| 16 | Automotive & Workshop | automotive-workshop | cat-12-automotive-workshop.png |
| 17 | Salon, Spa & Wellness | salon-spa-wellness | cat-18-salon-spa-wellness.png |
| 18 | Office & Commercial Interiors | office-commercial-interiors | cat-17-office-commercial-interiors.png |
| 19 | Health & Medical Supply | health-medical-supply | cat-21-health-medical-supply.png |
| 20 | Fitness, Sports & Recreation | fitness-sports-recreation | cat-19-fitness-sports-recreation.png |
| 21 | Boating, Camping & Outdoor | boating-camping-outdoor | cat-20-boating-camping-outdoor.png |
| 22 | Music & Entertainment | music-entertainment | cat-22-music-entertainment.png |

Images are at relative path `../../images/<filename>` when viewing a mockup in `cowork/designers/<name>/`.

## Each L1 has 6 subs (pick 2-3 for "view all" or drill-down)

Example for HoReCa: Commercial Refrigeration, Commercial Cooking Equipment, Food Preparation, Bar & Beverage, Commercial Sinks, Restaurant Shelving.

Get full list from `/home/brrr/brrr-xlmarket/storefront/lib/taxonomy-v3.ts` — `TAXONOMY_V3` array.

## Deliverables (6 HTML files per designer)

### Homepage category modules — 3 variants

Scope: the **category module block** on the homepage — the section that lets a visitor discover 22 L1 categories and navigate into them. Navigation bar may also change. Header/footer may change.

Not needed: full homepage (carousel, deals grid, footer). Focus on:
1. Top nav / header (may redesign)
2. Category module (primary section)
3. One supporting B2B element (starter kits teaser, B2B CTA bar, service plan strip — designer's choice)

### Category view — 3 variants

Scope: user clicks a L1 category (e.g. "HoReCa") and lands on the category page. Must include:
- Immediately visible: all 6 sub-categories (L2) with product counts
- Immediately visible: 8-12 real products in a grid (use VEVOR placeholders or mock)
- Filter sidebar or top bar (price, brand, stock, rating)
- No giant hero — small atmosphere image strip OK
- Sort + pagination control
- Breadcrumb

## File structure

Save to `/home/brrr/brrr-xlmarket/cowork/designers/<your-name>/`:
- `homepage-v1.html`, `homepage-v2.html`, `homepage-v3.html`
- `category-v1.html`, `category-v2.html`, `category-v3.html`
- `README.md` — brief note explaining each variant's concept (1 paragraph each)

## Self-contained HTML

Each file is standalone — inline CSS in `<style>`, Google Fonts OK, no external JS unless needed. Use SVG inline for icons (reference lucide.dev SVG source).

## Taste criteria

- Avoid generic Tailwind-template look
- Show hierarchy through scale + weight, not just color
- Hover/focus states must feel designed, not default
- Both light and dark directions are OK — choose intentionally
- Must look believable as a real production site, not a demo

## B2B CTAs to include somewhere

- "Request a B2B quote" → `#quote`
- "Starter kits from €2,799" → `#starter-kits`
- "Net-30 · Volume pricing · Dedicated manager"
