# KAISA — Nordic precision, Swiss grid, editorial ledger

Three alternative compositions for the XLMarket homepage category-module block. The ask: solve the 1A.ee information problem (22 disciplines, sub-cats per module, atmosphere image, quick-jump side nav) without looking like a 1A.ee ripoff.

Shared system: off-white paper (`#faf7f2`), deep ink (`#0a0a0a`), a single amber accent (`#b8560e`), hairline dividers, tabular numerals, small-caps mono labels, DM Sans baseline. Variant 3 pairs DM Sans with Fraunces (optical-size serif) because the ledger concept wants editorial weight. Logo is text-only ("XL" ink + "Market" amber italic). No emojis, SVG icons inline. No drop-shadows, no coloured tiles around product photos, no full dark-mode page.

## module-v1.html — "The Index"

**Core move:** the 22 disciplines are rendered as a classical ordered index — numeral, title, descriptor, six sub-cat chips separated by hairline pipes, small atmosphere thumb aligned right. Silent side rail lists all 22 with leading zeros for quick jumping. Each entry is a row, not a tile; hover reveals a small "View catalogue →" CTA sliding in at the right edge and a subtle amber wash. Reads like a trade catalogue's table of contents, not a marketplace grid. **Trade-off:** scroll-heavy; mitigated by sticky side rail. No large photography — the discipline name is the hero, thumbs are punctuation.

## module-v2.html — "Disciplines Grid"

**Core move:** an irregular 6-column grid where four priority disciplines (HoReCa, Hand & Power, Welding, Construction — top revenue) occupy 2×2 photographic hero cells with ink-wash gradients, and the remaining 18 fill 2-wide or 3-wide text cells including one ink-black cell (Laser/CNC) and one Music cell as visual full-stops. Side rail replaced by a horizontal chip bar that lists all 22 disciplines with SKU counts — a very different navigation DNA from 1A.ee. Text cells reveal their six sub-cats on hover via a max-height transition. **Trade-off:** hover-to-reveal sub-cats is desktop-friendly only; on touch the cells link straight to the L1 page (acceptable — the chip bar handles discovery).

## module-v3.html — "Two-column Ledger"

**Core move:** strict two-column reading layout. Left column is a persistent 280px sticky rail listing all 22 disciplines as a Fraunces serif ledger with dotted-rule separators and right-aligned tabular SKU counts (no photos — pure typography). Right column is a single scrollable stack of full-bleed rows: giant serif numeral, title, six sub-cat links, meta strip with SKUs / sub-classes / starter-kit price, and a landscape atmosphere thumb right-aligned. Each row gets an amber top-rule that draws left-to-right on hover — a deliberate editorial tell. Masthead uses Fraunces with optical size at 120 for a proper editorial headline. Ends with an ink-black Trade Desk strip inline in the ledger. **Trade-off:** widest variant — collapses to single column below 1100px by hiding rail and thumbs.

## Images

All 22 atmosphere photos reused from `/home/brrr/brrr-xlmarket/cowork/images/cat-NN-<slug>.png`. No new nano-banana images generated — the concepts are about composition and typography, not new photography; burning the budget for decoration was not justified.

## Preview

Mockup server on port 8095:

- http://100.93.186.17:8095/designers/kaisa/module-v1.html
- http://100.93.186.17:8095/designers/kaisa/module-v2.html
- http://100.93.186.17:8095/designers/kaisa/module-v3.html

## Distinct from aurora

- Aurora's "Index" leans on IBM Plex Serif numerals and an editorial masthead feature-of-the-week that breaks into a 12-column cell grid. Kaisa v1 is row-based, not a cell grid; no masthead feature; numbered entries with a paragraph descriptor and in-row atmosphere thumb.
- Aurora's bento uses ink-dark image-hero tiles on a paper bento. Kaisa v2 is an irregular 6-col grid with four light-gradient photo cells and a chip bar navigation — no side rail, hover-reveal sub-cats, a single dark cell only.
- Aurora's vertical list runs on a single-column typographic table. Kaisa v3 is a true two-column layout: sticky rail on one side, ledger rows on the other — sub-cats always visible, not on hover; adds a landscape atmosphere thumb per row; uses Fraunces, not IBM Plex Serif.
