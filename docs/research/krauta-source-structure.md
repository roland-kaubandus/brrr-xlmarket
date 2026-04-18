# K-Rauta.ee HTML Structure Analysis

Source: HTML saved from browser by user, 2026-04-15.
Platform: Kesko Senukai Digital (Ruby on Rails)

## Key Structural Elements

### SVG Icon System
K-rauta uses inline SVG `<symbol>` definitions with `id` attributes for category icons.
Icons are referenced via `<use href="#icon-name">` pattern.

Known icon IDs from source:
- icon-tech (electronics shape)
- icon-electronics (monitor shape)
- icon-construction (building blocks)
- icon-tools (wrench+hammer)
- icon-tools-ee (extended tools, bigger viewBox)
- icon-plumbing (pipe/faucet shape)
- icon-decoration (vase/flower)
- icon-interior (sofa/armchair)
- icon-lighting / icon-lamp (pendant light)
- icon-household (pot/cooking)
- icon-perfume (perfume bottle)
- icon-toys (dinosaur/toy)
- icon-leisure (ball/sports)
- icon-pets (bone/paw)
- icon-garden (flower/leaf)
- icon-kitchen (oven/stove)
- icon-heating (radiator/flame)
- icon-security (shield/lock)
- icon-sink (faucet/basin)
- icon-categories-discount (percent circles)
- icon-automoto (car outline)
- icon-beauty (hairdryer)
- icon-computers (laptop)
- icon-coupons (ticket/voucher)
- icon-footwear (shoe)
- icon-foto (camera)
- icon-pccomponents (chip/processor)
- icon-phones (smartphone)
- icon-refurbished (recycle box)
- icon-tourism (backpack/compass)
- icon-books (books)
- icon-food (bowl/apple)
- icon-christmas (tree)
- icon-gifts (gift box)
- icon-gaming (controller)

### CSS Classes (from application CSS)
- `.site` — root wrapper
- `.site-top` — sticky header area (padding-top: 212px for fixed elements)
- `.site-top__menu` — top utility bar (E-poest, Maksmisviisid, Tarne, etc.)
- `.site-top__menu-left` — left links in top bar
- `.site-top__menu-right` — right links (language, stores, contact)

### Header Structure (3 rows)
1. **Top utility bar** — small links: E-poest, Maksmisviisid, Tarne, KKK, Äpp, Teenused, Ärikliendile
2. **Main header** — Logo (SVG) + Search bar + Smart Net promo + Account/Wishlist/Cart
3. **Category nav bar** — colored tabs: Kampaaniad, SMART NET, 3€ SULLE, Koduomanik, etc.

### Left Sidebar
- Fixed ~52px icon column with SVG category icons
- Each icon is a circle/rounded square button
- Active state: highlighted background + border
- Below icons: expandable text category list

### Category Section Pattern (THE KEY LAYOUT)
```
.category-section
├── .category-section-header (icon + name + "vaata kõiki" link)
└── .category-section-body
    ├── .category-section-left (280px)
    │   ├── .category-hero-image (large photo, ~280x200)
    │   │   └── .category-label (yellow/amber strip with name at bottom)
    │   └── .category-sub-links (text links to L2 subcategories)
    └── .category-sub-grid (flex:1, 3 cols x 2 rows)
        ├── .sub-card (product photo + subcategory name)
        ├── .sub-card
        ├── .sub-card
        ├── .sub-card
        ├── .sub-card
        └── .sub-card
```

Grid cells separated by 1px borders (gray), white background.
Sub-card images are ~100x100px product photos.

### Footer
- Trust info section (Tarne, Garantii, Makseviisid, Klienditeenindus)
- 4-column grid: Tootegrupid, E-poe teave, Ettevõttest, Sotsiaalmeedia
- Copyright bar at bottom

### Key CSS Variables / Colors (K-Rauta)
- Primary: Yellow #FFCC00
- Secondary: Blue (Ukraine flag integration)
- Text: Dark gray/black
- Background: White
- Borders: #E2E8F0 equivalent

### XLMarket Adaptation Notes
- Replace yellow #FFCC00 → amber #D97706
- Replace K-Rauta SVG icons → XLMarket category icons (use /cat-icons/80/*.webp)
- Keep same proportions: 52px sidebar, 280px left panel, 3x2 grid right
- Same border/gap treatment (1px solid gray between grid cells)
- Same sticky header height (~60px main + ~40px nav bar + ~30px top bar)
