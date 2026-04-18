# MIKK — Industrial Bento

Three alternative compositions for the XLMarket homepage category-module block. Shared language: warm linen canvas (`#f4efe6` / `#ebe6db`), deep ink `#17171a`, amber `#d97706` as the only accent. Typography pairs DM Sans (body) with Archivo (display, 700–900) for industrial weight; JetBrains Mono carries counts where tabular numerals matter. Flat surfaces, 2 px ink borders, zero drop-shadows, zero pillowy radii. Hover: 180 ms inversion (paper → ink, chip borders → amber) with a 4 px translate on the tile arrow.

## Variants

**module-v1.html — Weighted Atlas.** A 12-column asymmetric bento where tile size is a function of product count — XL (≥ 900 SKUs, 6×3) carries a full-bleed atmosphere photo + six sub-category chips; L (≥ 400, 4×2) adds a 84 px photo band + three chips; M (≥ 150, 3×2) goes text-only with six sub-links as a dashed-underline table; S (< 100, 2×1) is a compact name+count. The 22 disciplines literally redraw the grid in proportion to catalogue reality — HoReCa's 1,907 SKUs get the biggest block, Music's 9 get a 2×1 chip. A 240 px left rail persists as a stacked A–Z-by-discipline index with hairline hover (amber tick slides in before the link text). One starter-kits pitch-block lives at the bottom of the rail; a four-column ink B2B strip closes the page.

**module-v2.html — Bureau / Workshop.** No side rail — the 22 disciplines are served horizontally via a sticky ink navigator band ("Disciplines 01 – 22 →") pinned beneath the header, scrollable with numeric + count metadata. Below, the 22 disciplines become equal-weight 4:5 photo-backed tiles in a 4-column grid with a flat dark gradient overlay (rgba(23,23,26,0) 20% → 0.88 at 100%) that delivers real legibility without gradient cliché. Each tile overlays a name + chip row + square arrow-button corner. A paper-coloured break-row lands after row 3 carrying the Net-30 / kit-ladder / <24h quote B2B proposition, physically splitting the grid into two halves. Trade-off: eight rows of photo-backed tiles is visually rich — works because the overlay is disciplined and the arrow-button carries consistent hierarchy.

**module-v3.html — Kanban Shelves.** Horizontal-first. Four supergroup shelves, each a sticky 240 px label + tagline + rule, paired with a right-hand horizontal scroll row of 5–6 discipline cards. Shelves group by B2B intent: Kitchen & Hospitality (HoReCa, salon, health, fitness, office) · Workshop & Fabrication (laser, welding, woodworking, hand-tools, automotive) · Building & Infrastructure (construction, HVAC, plumbing, electrical, warehousing, water) · Service, Safety & Leisure (cleaning, outdoor, safety, printing, boating, music). Each card: 128 px atmosphere thumb + monotype badge + name + SKU count + three sub-cat chips. Side rail becomes a 22-item chip cloud directly under the masthead acting as a "jump-to" filter. An ink-lead B2B bento closes the page: amber CTA plus three paper data-columns.

## Constraints & notes
- No nano-banana-pro generation used. The 22 existing atmosphere photos at `../../images/cat-NN-<slug>.png` carried all three compositions; adding six more would have introduced style drift across variants and eroded the "one visual system" constraint.
- Breaking 1a.ee: no pastel tile clones — all product-style images live on paper tiles with hairline borders OR full-bleed with flat-rgb overlay, never half-measures.
- Font pair: DM Sans + Archivo (justified: Archivo's 900 weight delivers the Braun-catalogue display weight DM Sans cannot). JetBrains Mono is used only for tabular counts & discipline numbers so the quantitative anchors read as instruments, not body copy.
- Body text floor: 12.5 px for chips/meta, 13 px for description copy, 14 px for nav — all legible at 1440 px and 1024 px without needing a zoom.
- Each variant answers the "how does a visitor find a discipline they don't know by name" problem differently: v1 by visual weight, v2 by the sticky horizontal navigator + photo-led grid, v3 by B2B intent supergroups.

## Preview
- http://100.93.186.17:8095/designers/mikk/module-v1.html
- http://100.93.186.17:8095/designers/mikk/module-v2.html
- http://100.93.186.17:8095/designers/mikk/module-v3.html
