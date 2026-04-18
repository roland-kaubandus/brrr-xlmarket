# PIRET — Warm Magazine / Editorial Trade Journal

Three mockups for the XLMarket homepage **category-module block**, designed in a Monocle / Cereal register: warm paper canvas (`#f6f1e8` — cream, not cold off-white), deep ink (`#1a1a1a`), a single muted amber accent (`#b05410`), and a disciplined typographic pairing — **Fraunces** (variable serif with real contrast, for category names, pull-quotes, numerals and editorial captions) paired with **DM Sans** (for UI, body, small labels). Fraunces rather than IBM Plex Serif because the warm paper wants contrast and humanity, not Swiss geometry. No drop-shadows on any photograph. No coloured product-tile backgrounds — photos either live on warm paper with a hairline border or fill the frame fully. Logo is text-only: `XLMarket`, with the "Market" half rendered in thin Fraunces italic amber to distinguish it without caging it in a box. Captions are plain-language, grown-up, and not marketing copy — they describe the discipline the way a trade magazine would.

## module-v1.html — "Contents Page"

A magazine contents spread turned into a live navigation surface. The left column is an editorial list of all **22 disciplines**, each row carrying a serif numeral, the category name in Fraunces, a one-line plain-English caption, and a tabular SKU count on the right. Hover (or keyboard-focus) any row and the right column — a full 4:5 "Feature of the week" panel with atmosphere photograph, editorial pull-quote, pull-list of the six sub-disciplines, and two CTAs — **swaps live** to that discipline. No separate side rail: the left list *is* the rail. The feature panel is sticky, so the reader can scan the full index and the preview stays in view. A dark B2B strip below carries three tabular statistics (Trade accounts · SKUs · Quote response) and four Net-30 / volume / manager chips. Trade-off: the interactive swap relies on pointer/focus events — on touch devices the user taps through to the category page directly, which is a reasonable fallback.

## module-v2.html — "Catalog Spread"

An editorial three-column catalog where every one of the 22 disciplines is presented like a magazine catalog entry: 4:5 atmosphere photo with a paper-chip badge (`N° 01 · HoReCa`), bold serif name on a hairline-ruled header, one-line editorial caption, a compact six-item sub-discipline list with dotted rules, and a small "Enter discipline" underline link that warms on hover. The grid is broken into **five editorial "departments"** — Department one HoReCa & Food, Department two Workshop & Fabrication, Department three Building & Grounds, Department four Operations & Safety, Department five Services & Leisure — each introduced with a centred serif department title and page-range label (`Pages 03 — 08`) that breaks the rhythm like a magazine section-opener. A slim **typographic side rail** on the left of the page lists all 22 numerals vertically with tracked-out small caps, so a reader who knows what they want can skip to any discipline without scrolling through the departments. Trade-off: this is the heaviest layout of the three — deliberately so, because the brief said the category module is the hero of the page. The side rail hides on narrow viewports; department dividers remain.

## module-v3.html — "Journal of Trades"

A broadsheet newspaper front page. The masthead is oversized Fraunces thin ("The **Journal** of Trades"), flanked by the issue number, season, and a centred italic motto. Below: the page breaks into a **lead story** — HoReCa — occupying about 62% of the row with a large 4:5 photograph (a newly generated `lead-horeca.png` of a chef plating food), a serif lead-headline, an italic dek, a **two-column body paragraph with a real drop-cap**, the six sub-disciplines as a numbered list, and two CTAs. Beside it, a **mid stack** of six secondary disciplines sits as horizontal magazine cards (thumb + overline + serif title + caption + count). Below the fold, the **other fifteen disciplines** are presented as compact text-lead entries in a 3-column grid with small square thumbs — the "more sections" lower fold that reads like a contents page within the front page. A Trade Desk notice below — with a hand-stamped amber "Trade Desk · Open" seal rotated 2° — carries Net-30, volume pricing, and the quote-response promise. No side rail: this layout is the rail. Trade-off: the single oversized lead makes HoReCa the visual star of the page, so the choice of which discipline gets the lead slot is a merchandising decision that must be rotated per season.

## nano-banana-pro images generated (2 of 6 budget used)

Both 4:5 portrait, 2K, via `gemini-3-pro-image-preview`:

1. `images/lead-horeca.png` — used as the module-v3 lead photograph. Prompt: *"Editorial magazine photograph, Monocle-style trade journal cover. Professional chef hands plating food in a modern restaurant kitchen, brushed stainless steel surfaces, soft warm window light from the left, subtle steam, shallow depth of field. Muted earthy palette: warm cream, terracotta, deep charcoal, a hint of amber. Fine-grain film quality. No text, no faces — hands and apron only. Intentional, calm, grown-up. 4:5 portrait."*
2. `images/feature-horeca.png` — used as the module-v1 feature-of-the-week photograph. Prompt: *"Trade magazine feature photograph: interior of a warm contemporary European bistro before service — polished wooden bar, matte brass taps, espresso machine on the back counter, linen napkins folded on a zinc-topped table, late afternoon window light, empty and quiet. Warm muted palette: cream white walls, oiled walnut wood, aged brass, deep charcoal ironwork. Shallow depth of field, editorial stills magazine quality, no people, no text, no logos. 4:5 portrait."*

All other discipline photography uses the existing `cowork/images/cat-NN-<slug>.png` atmosphere photos.

## Typography & colour rationale

- **Paper** `#f8f4ec` / `#f6f1e8` — warm cream, one half-step warmer than Aurora's off-white. Reads as printed paper under warm afternoon light rather than as a Swiss broadsheet.
- **Ink** `#1a1a1a`, **Ink-2** `#2d2a26` — deep, slightly warm rather than true black.
- **Rule** `#d8cfbf`, **Rule-2** `#bfb39c` — hairline dividers and dotted rules; a stronger paper-toned rule for broadsheet section dividers.
- **Amber** `#b05410` — single accent, used only where editorial emphasis is needed: italic ampersands in category titles, pull-quote left-border, hover underlines, drop-caps, and the Trade Desk stamp. The `#D97706` from the BRIEF felt too orange for the warm cream palette, so a half-step more burnt/terracotta version is used.
- **Fraunces** — chosen over Newsreader or IBM Plex Serif because Fraunces' higher contrast axis and optical-size grade suit large editorial headlines on warm paper, while its thin italic is the most beautiful ampersand in the wide free-for-commercial corpus — and the ampersand is a recurring motif across every category name.
- **DM Sans** — baseline for UI, labels, captions; never below 13px, always with generous letter-spacing (0.02em standard; 0.18–0.28em for small-caps labels).

## Constraints

- **No emojis.** All icons are inline SVG in lucide.dev geometry (1.8 stroke).
- **English copy only.**
- **Logo = text only,** `XLMarket`, with "Market" in thin Fraunces italic amber.
- **No drop-shadows** on category photos anywhere.
- **No coloured tile backgrounds** for product-style photos — everything sits on `--paper` or `--paper-2` with hairline borders, or goes full-bleed into the frame.
- **Body ≥ 14px, module titles ≥ 20px, captions ≥ 13px** everywhere (captions 13–14.5 px with loose leading).
- **Every image** carries explicit `width` and `height` attributes; atmosphere photos use `loading="lazy"`, the module-v3 lead uses `fetchpriority="high"`.

## Distinctness from Aurora and Luma

- **Aurora** uses cold off-white and IBM Plex Serif — Piret uses warm cream and Fraunces. Aurora's grid v1 is a fixed grid with one photo break; Piret's v1 is an interactive contents page with live feature-swap. Aurora's index v2 is a single text-only 22-row table; Piret's v2 is a photo-led 3-column catalog grouped into five editorial departments with a typographic side rail. Aurora's bento v3 is a mixed-span grid; Piret's v3 is a broadsheet journal front page with one lead story, six mid cards, and fifteen lower-fold entries.
- **Luma** is dark-luxury / glassmorphism — Piret is warm-paper / magazine. There is no visual register shared beyond the tabular SKU counts and the use of a serif for numerals.
