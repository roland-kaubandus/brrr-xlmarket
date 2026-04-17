# LUMA — Dark Luxury / Atmospheric Direction for XLMarket

Six mockups for the XLMarket homepage and category view, explored in one consistent visual system: a deep-ink base (`#0b0e14`), burnished amber accents (`#b45309` / `#d4a574`), layered glass surfaces with 14 px backdrop-blur, DM Sans for body, and Fraunces (italic) for one serif editorial tension. Every large dark area carries a subtle SVG-generated grain so the surfaces do not feel flat.

## Why dark luxury for a B2B equipment reseller?

XLMarket sells industrial equipment to business buyers — people opening a cafe, a print shop, a garage. The mainstream B2B tooling market looks like Amazon wholesale: white backgrounds, yellow ribbons, stock-photo placeholders. That works for price-first buyers and nobody else. A buyer putting €15,000 on Net-30 for a full workshop expects the floor to feel like a showroom, not a warehouse. Dark luxury signals: curated selection, not a dump of SKUs; specialists behind the counter; the product photography matters. It makes Net-30 and "dedicated account manager" land as premises, not sales copy. And the atmospheric category images (already shot in this register) earn their keep — they were never going to sing against white.

## Homepage variants

### homepage-v1.html — The Library
22 atmosphere-photo tiles in a calm 4-wide glass grid. Each tile has a Roman-numeral "discipline number" (I·01 through VI·22), an italic Fraunces serif for the number, a SKU count in tabular figures, and an amber hairline that lights up on hover. The hero reads "Industrial equipment, selected like a library" — setting the tone. Below the grid, a single wide B2B card with Net-30 / volume / manager chips and three tabular statistics (1,847 active B2B customers · 16,046 SKUs · under-4-hour quote response).

**Use when** the site needs to feel authoritative and complete without playing favourites — exploratory shoppers who want to see the whole floor before deciding. This is the default.

### homepage-v2.html — Flagships & Supporting
Four wide "flagship" cards dominate the screen: HoReCa, Laser/CNC, Welding, Automotive. Each is a horizontal atmosphere card with a short pitch and an amber-bordered "Enter" glass pill. Below, the remaining 18 disciplines sit as compact glass chips with small thumbnail strips on the left. The service strip at the top glows with two low-opacity amber radial gradients. A starter-kit section at the bottom displays four collections with Fraunces-set prices (€2,799 / €6,450 / €9,200 / €14,500).

**Use when** XLMarket wants to editorialise — "these are the disciplines we do best." Good during sector-focused campaigns (e.g. HoReCa Q1 push). The flagships rotate per season.

### homepage-v3.html — The Catalog, Vol. 01
The fashion-magazine lookbook. A masthead top ("Vol. 01 — Spring / 2026"), the full XLMarket wordmark centred on the page in huge Fraunces thin italic, and an editorial grid where the 22 disciplines are mosaic-sized (one hero, one tall, two wide, several mediums, many smalls) — each with a "N° 01" serif italic number. A floating glass "Request a B2B quote" pill follows the user in the corner. A horizontal scroll band of six "Collections" (starter kits treated as curated editions) replaces the traditional deals carousel.

**Use when** the goal is brand — editorial content, press coverage, magazine ads. This is the cover. The density is deliberate; the browse experience is meant to feel like flipping through a serious quarterly.

## Category variants — all shown with Automotive & Workshop

### category-v1.html — Atmosphere Strip + Sidebar
A 220 px atmosphere strip (the workshop photo, radial-gradient-faded toward a deep-ink right edge) carries the breadcrumb, title, and SKU count. Below: six sub-category cards, each with a small atmosphere-thumbnail background that grades darker and lights up on hover. The main area splits into a sticky left-side filter panel (price, brand checkboxes with counts, availability, rating, power supply) and a three-wide product grid with glass cards, amber hairlines on hover, and Fraunces prices.

**Use when** the user has drilled down and now needs precise filtering — faceted discovery is the primary job. Classic e-commerce category page, rendered in the dark-luxury register.

### category-v2.html — Hero-Less / Pill-Filter
No atmosphere strip. The page opens directly on breadcrumb, title, sub-category pill bar, then a single dark-glass filter pill at the top of the product grid. The product grid is four-wide and denser — smaller cards designed for scanning velocity. The filter bar is a pill-shaped capsule with active filters shown as amber-bordered removable chips.

**Use when** the user is returning, knows what they want, and the atmosphere is noise. Also better for narrow categories where the hero would feel performative. Optimises for ruthless browse speed.

### category-v3.html — Moody / Sticky CTA
A 140 px atmosphere banner (compact, full-width, heavily vignetted, centre-aligned title). Below: six LARGE sub-category cards (each 2.3:1 aspect, atmosphere photo with 90% opacity dark-gradient on the left, serif sub-discipline name, count, and a circular amber arrow button). Then filter bar, four-wide product grid, and a persistent sticky-bottom-right "Outfitting a bay? → Request B2B quote" glass pill that is the defining feature.

**Use when** the category is an investment purchase (opening a workshop, a print shop, a bar). The sticky CTA is the call: browse the catalog, but there is always a human one click away. Works especially well for the four flagship categories.

## Consistent system across all six

- Logo is text-only — `XL` in DM Sans semibold + `Market` in Fraunces thin italic amber. No box.
- Zero emojis — all icons are inline SVG (lucide-style stroke 1.6–1.8).
- B2B positioning lives permanently in the service strip (Net-30 · volume · manager) at the very top and recurs as a dedicated card at the bottom of every homepage.
- Starter kits from €2,799 appears on every homepage and is reachable from the "Starter kits" nav link.
- Prices always use tabular-nums with `€` prefix, rendered in Fraunces thin for emphasis.
- Category page loads immediately show six subs + twelve products + filters + breadcrumb without scrolling past a giant hero.
- Real depth: base ink (#0b0e14) → elevated glass surface (rgba 255 255 255 .035 + 14 px blur) → hovered surface (.075). Not one flat plane with drop shadows.
- Every variant loads the same three Google Fonts weights (DM Sans 300/400/500 + Fraunces 300 italic) so swap-between-variants feels like one brand, six voices.
