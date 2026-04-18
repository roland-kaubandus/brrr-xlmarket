# Taxonomy SEO Audit — Agent 3 (Search & Market Lens)

**Date:** 2026-04-18
**Scope:** Estonian and Spanish keyword demand, competitor URL structures, schema spec, redirect strategy, hreflang, vertical collection priority list.

---

## 1. Competitor Taxonomy Comparison

### Estonian Market

| Store | L1 count (est.) | Depth | Slug style | URL pattern | Vertical collections | Schema observed |
|---|---|---|---|---|---|---|
| **Bauhof.ee** | ~18 | L1 → L2 → L3 | Estonian kebab, descriptive | `/et/c/{slug}` — short, language-prefixed | Seasonal campaign pages (`/et/kampaaniad/kevad`) | Not confirmed from homepage |
| **Ehituse ABC** | ~16 | L1 → L2 (flat-ish) | Estonian kebab | `/ee/{slug}` — single-level, no `/c/` segment | None observed | None confirmed |
| **Motonet.ee** | ~8 (vehicle-first) | Shallow (vehicle lookup dominant) | Estonian | `/varuosad`, `/teenused` — top-level, no depth | Rental/seasonal specials | None confirmed |
| **K-rauta.ee** | ~25+ | L1 → L2 → L3 | Estonian, descriptive | `/{slug}` — root-level, no prefix | Koduomanik, Ärikliendile lifestyle tabs | SVG icon sidebar, no JSON-LD confirmed |

**Key observation — Estonian market:** Bauhof's `/et/c/{slug}` is the most technically correct pattern: locale-prefixed, explicit `/c/` namespace separates categories from static pages, Estonian-language slugs. Ehituse ABC uses single-level paths with no `/c/` — simpler but flatter. K-rauta uses root-level slugs (no locale prefix). None of the observed Estonian competitors implement visible JSON-LD schema on category pages.

### International Reference

| Store | L1 count | Depth | Slug style | URL pattern | Vertical collections | Schema observed |
|---|---|---|---|---|---|---|
| **Toolstation.com** | 24 | L1 → L2 → L3 | English kebab + `/c{id}` | `/power-tools/combi-drills/c765` — slug + numeric ID | Brand pages + buying guides | Breadcrumb schema likely (standard UK practice) |
| **Leroymerlin.es** | ~20 | L1 → L2 → L3 | Spanish kebab | `/cat/herramientas-electricas/` (403 on scrape) | Profession-based landing pages | Full JSON-LD expected (large retailer SEO practice) |

**Key observation — Toolstation:** Their `/c{id}` suffix is a legacy CMS artifact from server-side catalog IDs. It does not provide SEO value. The slug portion before the ID carries all keyword weight. Avoid this pattern.

**Winners pattern:** Bauhof's `/et/c/{estonian-slug}` for ET market wins on clarity and technical correctness. For ES market, the equivalent would be `/es/c/{spanish-slug}`. However — given XLMarket's current codebase uses `/et/kategooriad/{english-slug}` — migrating to Estonian or Spanish slugs requires full redirect mapping. The SEO benefit of language-native slugs exists but is moderate (keyword in URL is a minor ranking factor). Stability matters more.

---

## 2. Estonian Keyword Demand Map

Search volume estimates are based on: Estonian internet population (~1.1M), Google's share (~94% in EE per Statcounter), and cross-referencing relative demand via Google Trends signals and SERP result count proxies. Estonia is a small market — "high volume" means 500–2,000 searches/month; "medium" means 100–500.

### HoReCa / Food Service (L1 priority #1)

| Keyword | Est. monthly vol. | Intent | XLMarket page target |
|---|---|---|---|
| jäämasin | 800–1,200 | Commercial | `/et/kategooriad/horeca-food-service` + L3 ice-machines |
| jäämasin müük | 400–600 | Transactional | Product listing + PLP schema |
| kohviku seadmed | 300–500 | Commercial/info | Vertical collection `/et/alustajale/kohvik` |
| restoraniköök seadmed | 200–350 | Commercial | HoReCa category page |
| suurköögiseadmed | 300–500 | Commercial | HoReCa category page + meta desc "suurköögiseadmed" |
| frütüür | 200–400 | Transactional | L3 commercial-cooking-equipment |
| kommertskülmik | 150–300 | Commercial | L3 commercial-refrigerators |
| kuidas avada kohvik seadmed | 100–200 | Informational | Blog/guide → internal link to vertical collection |
| toitlustusseadmed | 200–350 | Commercial | HoReCa L1 page H1 |
| restoranimööbel | 150–250 | Commercial | L2 restaurant-furniture |

**Assessment:** "Jäämasin" and "suurköögiseadmed" are the anchor terms — high volume, clear commercial intent, and XLMarket has the price advantage (60–73% cheaper than Asitek/Haktek). These two terms alone justify investing in proper CollectionPage schema, a descriptive H1, and an FAQ section on the HoReCa L1 page.

### Laser / CNC (L1 priority #2)

| Keyword | Est. monthly vol. | Intent | XLMarket page target |
|---|---|---|---|
| laser graveerija | 300–600 | Commercial/info | `/et/kategooriad/laser-cnc-digital-fabrication` |
| laser graveerija müük | 150–300 | Transactional | L2 diode-laser-engraving-machine + co2-laser |
| co2 laser | 100–200 | Commercial | L2 co2-laser-engraving-machine |
| cnc freespink | 100–200 | Commercial | L2 cnc-routers-and-mills |
| treipink | 200–350 | Commercial | Welding/Metalworking L2 metal-lathes-mills |
| laser cutter Eesti | 80–150 | Commercial | Laser/CNC L1 page |
| laser graveerija odav | 100–200 | Transactional | PLP with price sort |
| vinyl cutter | 100–200 | Commercial | Printing/Packaging L2 vinyl-cutters |
| siiditrükipress | 80–150 | Commercial | Printing/Packaging L2 screen-printing |

**Assessment:** Competition is near-zero for "laser graveerija" below €500 — Lasermeister covers only professional €5K+ segment. A dedicated L1 page for `laser-cnc-digital-fabrication` with optimized title "Laser graveerijad ja CNC masinad | XLMarket" can realistically rank top-3 within 4–6 months.

### Automotive & Workshop (L1 priority #3 by product count)

| Keyword | Est. monthly vol. | Intent | XLMarket page target |
|---|---|---|---|
| tungraud | 300–500 | Transactional | L2 jacks-and-lifting |
| autotõstuk | 150–250 | Commercial | L2 vehicle-lifts-shop-equipment |
| survepesurid | 600–1,000 | Transactional/info | Outdoor Power L2 pressure-washers |
| bensiini survepesur | 200–400 | Transactional | L3 pressure-washers (gas) |
| autoremontija tööriistad | 100–200 | Commercial | Automotive L1 page |
| rehvipink | 100–200 | Commercial | L2 mechanics-diagnostic-tools |

### Outdoor Power & Landscaping

| Keyword | Est. monthly vol. | Intent | XLMarket page target |
|---|---|---|---|
| survepesur | 600–1,000 | Transactional | `/et/kategooriad/outdoor-power-landscaping` |
| muruniiduk | 400–700 | Transactional | L2 outdoor-power-equipment |
| veepump | 300–500 | Commercial | Plumbing L2 water-pumps |
| kultivaator | 150–300 | Transactional | L2 outdoor-power-equipment |
| lumesahk | 200–350 | Seasonal/transactional | L2 outdoor-power-equipment |

### Construction & Tools

| Keyword | Est. monthly vol. | Intent | XLMarket page target |
|---|---|---|---|
| kompressor | 300–500 | Transactional | Hand & Power Tools L2 air-compressors-pneumatic |
| keevitusaparaat | 200–350 | Commercial | Welding L2 mig-tig-welders |
| ehitusmaterjalid | 600–1,000 | Commercial (broad) | Construction L1 — but competition is Bauhof, K-rauta |
| generaator | 250–400 | Transactional | Electrical & Energy L2 generators |

**Assessment for construction:** "Ehitusmaterjalid" is too competitive (Bauhof and K-rauta dominate with DA 50+). Focus instead on sub-terms with lower competition: "kompressor müük", "keevitusaparaat odav".

### Under-served Long-tail ("Alustavale Ettevõtjale") Opportunities

These queries have low competition and align exactly with XLMarket's `/alustajale` vertical pages. Realistic top-3 ranking within 3–6 months:

| Query | Est. monthly vol. | Competition | Target page |
|---|---|---|---|
| kohvik seadmed komplekt | 50–100 | Very low | `/et/alustajale/kohvik` |
| autopesula sisseseade | 80–150 | Low | New vertical: `/et/alustajale/autopesula` |
| ilusalong seadmed | 100–200 | Low | `/et/alustajale/ilusalong` |
| laser graveerija äri alustamine | 50–100 | Very low | `/et/alustajale/laser-graveerijad` |
| haljastusettevõte tööriistad | 30–80 | Very low | `/et/alustajale/haljastus` |
| trükifirma sisseseade | 30–60 | Very low | `/et/alustajale/trykifirma` |
| toitlustusettevõte käivitus | 50–100 | Low | Guide + `/et/alustajale/restoran` |

These long-tail queries are informational with strong commercial intent conversion. The user asking "autopesula sisseseade" is planning to open a car wash — they need 15–40 products. A curated kit page beats a generic category page for this intent.

---

## 3. Spanish Keyword Demand Map

Spain is a much larger market (~47M population, ~25M internet users actively shopping). Competition is significantly higher. XLMarket Spain is early-stage — target long-tail and regional terms rather than broad head terms.

| Keyword | Est. monthly vol. (ES) | Intent | Competition | Target |
|---|---|---|---|---|
| máquina de hielo | 8,000–15,000 | Commercial | Medium (Makro, hosteleria24 rank) | HoReCa L1 |
| equipamiento hostelería | 5,000–10,000 | Commercial | High | HoReCa L1 + guide |
| grabadora láser | 3,000–6,000 | Commercial | Medium | Laser/CNC L1 |
| grabadora láser barata | 1,000–2,000 | Transactional | Low-medium | Laser/CNC PLP |
| herramientas taller | 10,000–20,000 | Commercial | High (Leroy Merlin) | Automotive L1 |
| compresor de aire | 8,000–15,000 | Transactional | High | Hand Tools L2 |
| cortadora de vinilo | 2,000–4,000 | Commercial | Low | Printing L2 |
| gato hidráulico | 3,000–6,000 | Transactional | Medium | Automotive L2 |
| soldadora MIG | 4,000–8,000 | Commercial | Medium | Welding L2 |
| hidrolimpiadora gasolina | 2,000–5,000 | Transactional | Medium | Outdoor Power L2 |
| montadero de neumáticos | 500–1,000 | Commercial | Low | Automotive L2 |
| abrir cafetería equipamiento | 300–700 | Informational | Very low | Vertical collection |
| torno de banco | 1,000–2,000 | Commercial | Low-medium | Welding L2 |
| prensa serigráfica | 800–1,500 | Commercial | Low | Printing L2 |

**Spanish slug recommendation:** Use Spanish-language slugs for ES URLs. A Spanish user searching "grabadora láser barata" converts better when the URL reads `/es/c/grabadora-laser` than `/es/c/laser-cnc-digital-fabrication`. However, implement this only when the ES storefront launches — do not maintain dual slug tables prematurely.

**Top 5 ES opportunities for XLMarket within 6 months of ES launch:**
1. `grabadora-laser` — low competition, VEVOR has 40+ products, target `/es/c/grabadora-laser`
2. `máquina-de-hielo-comercial` — long-tail, hospitality sector, strong price advantage
3. `cortadora-de-vinilo` — sign shops and small print businesses, minimal competitors below €500
4. `mesa-de-serigrafía` — screen printing starter, very low competition
5. `abrir-un-bar-equipamiento` — vertical collection targeting bar/café starters

---

## 4. URL / Slug Rules

### Canonical rules for XLMarket

**Rule 1 — Keep `/kategooriad/{slug}` for ET, plan `/c/{slug}` for ES.**
The current ET URL structure (`/et/kategooriad/{slug}`) has been live since April 2026. ~14,841 product URLs and all category pages are indexed under this path. Changing to `/et/c/{slug}` now would cost more in crawl budget and potential rank loss than it gains. Lock this in for ET.

For ES (future), use `/es/c/{spanish-slug}` — `/categorias/` is fine but the single-letter `/c/` prefix is shorter and matches Bauhof's winning pattern. Decide at ES launch, not now.

**Rule 2 — Slug composition: English for ET slugs, Spanish for ES slugs.**
- ET: `horeca-food-service`, `laser-cnc-digital-fabrication` — stay as-is
- ES (future): `hosteleria-restauracion`, `grabadora-laser` — language-native
- Rationale: English slugs are stable and survive translation changes. Spanish slugs carry keyword value in ES Google where the URL slug contributes to ranking.

**Rule 3 — Kebab-case, no stop words, max 5 tokens.**
- Good: `commercial-refrigeration`, `mig-tig-welders`, `pressure-washers`
- Bad: `the-commercial-refrigerators-and-coolers` (stop words + too long)
- Max 5 hyphen-separated tokens. Abbreviations OK (`hvac`, `cnc`, `mig`).

**Rule 4 — No slug reuse across depth levels.**
Medusa enforces unique handles globally. L2 slugs must not collide with L1 slugs. Pattern: if L2 slug could be confused with L1, prefix with context: `horeca-commercial-ovens`, not just `commercial-ovens`.

**Rule 5 — Reserved prefixes (never use as category slugs).**
- `/alustajale/` — vertical starter kit collections
- `/hooldus/` — maintenance/service content
- `/arikliendile/` — B2B landing pages
- `/toode/` — product detail pages
- `/haru/` — branch pages (legacy, may be retired)
- `/et/`, `/en/`, `/es/` — locale prefixes

**Rule 6 — Vertical collection pages live under `/et/alustajale/` not under `/et/kategooriad/`.**
They are editorial collections, not catalog nodes. This prevents them from competing with their own L1 category pages for the same keywords.

**Rule 7 — Depth cap: L1 → L2 → L3 maximum.**
Do not create L4 category pages. Google's crawl budget guidance recommends keeping depth to 3 clicks from homepage. Long-tail L3 terms should be handled via filtered PLP pages (MeiliSearch facets), not separate category URL nodes.

---

## 5. Schema.org Spec Per Page Type

### 5.1 L1 Category Page (e.g., `/et/kategooriad/horeca-food-service`)

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Suurköök ja Toitlustus",
  "description": "HoReCa seadmed restoranidele, kohvikutele ja toitlustusettevõtetele. Jäämasinad, frütüürid, restoranimööbel ja muud suurköögiseadmed.",
  "url": "https://xlmarket.eu/et/kategooriad/horeca-food-service",
  "inLanguage": "et",
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "XLMarket",
        "item": "https://xlmarket.eu/et"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Suurköök ja Toitlustus",
        "item": "https://xlmarket.eu/et/kategooriad/horeca-food-service"
      }
    ]
  },
  "hasPart": [
    { "@type": "Thing", "name": "Jäämasinad", "url": "https://xlmarket.eu/et/kategooriad/ice-machines" },
    { "@type": "Thing", "name": "Äriköögiseadmed", "url": "https://xlmarket.eu/et/kategooriad/commercial-cooking-equipment" }
  ]
}
```

**Fields mandatory for L1:** `@type: CollectionPage`, `name` (localized), `description` (unique per L1, 120–160 chars), `breadcrumb`, `url`, `inLanguage`.

### 5.2 L2 Category Page (e.g., `/et/kategooriad/ice-machines`)

Same as L1 but BreadcrumbList has 3 positions:

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Jäämasinad",
  "url": "https://xlmarket.eu/et/kategooriad/ice-machines",
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "XLMarket", "item": "https://xlmarket.eu/et" },
      { "@type": "ListItem", "position": 2, "name": "Suurköök ja Toitlustus", "item": "https://xlmarket.eu/et/kategooriad/horeca-food-service" },
      { "@type": "ListItem", "position": 3, "name": "Jäämasinad", "item": "https://xlmarket.eu/et/kategooriad/ice-machines" }
    ]
  }
}
```

### 5.3 L3 Category / Filtered PLP

L3 is optionally a `CollectionPage` if it has a distinct URL. If L3 is a faceted filter page, use `canonical` pointing back to L2 rather than a separate JSON-LD node. Only create L3 pages for sub-collections with ≥15 products and a real keyword target.

### 5.4 Product Detail Page (`/et/toode/{handle}`)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "VEVOR Jäämasin 45 kg/24h",
  "description": "...",
  "image": ["https://cdn.vevor.com/...jpg"],
  "brand": { "@type": "Brand", "name": "VEVOR" },
  "sku": "...",
  "offers": {
    "@type": "Offer",
    "url": "https://xlmarket.eu/et/toode/{handle}",
    "priceCurrency": "EUR",
    "price": "275.00",
    "priceValidUntil": "2026-12-31",
    "itemCondition": "https://schema.org/NewCondition",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "Roland Kaubandus OÜ"
    }
  },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "XLMarket", "item": "https://xlmarket.eu/et" },
      { "@type": "ListItem", "position": 2, "name": "Suurköök ja Toitlustus", "item": "https://xlmarket.eu/et/kategooriad/horeca-food-service" },
      { "@type": "ListItem", "position": 3, "name": "Jäämasinad", "item": "https://xlmarket.eu/et/kategooriad/ice-machines" },
      { "@type": "ListItem", "position": 4, "name": "VEVOR Jäämasin 45 kg", "item": "https://xlmarket.eu/et/toode/{handle}" }
    ]
  }
}
```

**Critical fields:** `@type: Product`, `offers.priceCurrency`, `offers.price` (VAT-inclusive, matching displayed price), `offers.availability`, `brand`. Google requires `name`, `image`, and at least one of `offers`, `review`, or `aggregateRating` for product rich results.

**VAT note:** Because XLMarket uses tax-inclusive pricing (VAT 24%), the `price` in schema must match the displayed price exactly. Do not pass net price — Google will flag inconsistency if the displayed price differs from schema price.

### 5.5 Vertical Collection / Starter Kit Page (`/et/alustajale/kohvik`)

```json
{
  "@context": "https://schema.org",
  "@type": ["CollectionPage", "ItemList"],
  "name": "Kohviku avamine — seadmete komplekt",
  "description": "Kõik vajalik kohviku käivitamiseks: espressomasin, jäämasin, restoranimööbel ja köögiseadmed. Professional Tools, Half the Price.",
  "url": "https://xlmarket.eu/et/alustajale/kohvik",
  "inLanguage": "et",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "https://xlmarket.eu/et/toode/vevor-espresso-machine-...",
      "name": "VEVOR Espressomasin"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "url": "https://xlmarket.eu/et/toode/vevor-ice-machine-45kg",
      "name": "VEVOR Jäämasin 45 kg"
    }
  ]
}
```

Use `ItemList` for curated product lists on vertical pages. Google can show these as a list rich result in SERPs.

### 5.6 Homepage

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "XLMarket",
  "url": "https://xlmarket.eu",
  "description": "Professionaalsed tööriistad ja seadmed ettevõtetele. Professional Tools, Half the Price.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://xlmarket.eu/et/otsing?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

`SearchAction` enables Google Sitelinks Searchbox — a significant SERP feature for e-commerce.

---

## 6. Redirect Strategy

### When to use 301 Permanent Redirect

1. **Legacy L1 slug → v3 L1 slug** (already implemented in `next.config.ts`). Keep all 41 existing rules for minimum 12 months from migration date (2026-04-17 → until 2027-04-17).
2. **Any slug rename:** if a v3 L1 or L2 slug is renamed for any reason, 301 immediately. No exceptions.
3. **Estonian-slug routes (`/haru/{slug}`) → `/kategooriad/{slug}`**: These are parallel routes pointing at the same content. 301 the `/haru/` prefix to `/kategooriad/` to consolidate link equity. File: `next.config.ts` in the `categoryRedirects()` function.
4. **Stale `data/feeds/sitemap.xml`** (2026-04-14): Do not serve this. It contains legacy `xlmarket.eu` URLs that 308 to nothing useful. Already flagged by Agents 1 and 2. Remove the nginx static serve rule and let `app/sitemap.ts` generate the live sitemap. This prevents Google from wasting crawl budget on 308 chains.

### When to use Canonical, not Redirect

1. **Faceted filter pages** (e.g., MeiliSearch filtered PLP with `?sort=price_asc`): Set `<link rel="canonical" href="/et/kategooriad/horeca-food-service" />` on all filtered variants. No redirect — the page is valid but not the canonical.
2. **L3 pages that mirror L2 with just one filter**: If an L3 page contains the same products as its L2 parent minus facets, canonical to L2. Only create a distinct L3 URL if the sub-collection has its own keyword target and ≥15 unique products.
3. **Duplicate locale fallback pages** (e.g., if `/en/kategooriad/horeca-food-service` and `/et/kategooriad/horeca-food-service` serve near-identical content in English): Add `hreflang` alternates, not a canonical. Both are valid targets for their respective audiences.

### When to leave alone

1. **Live v3 L1 pages with products and real traffic**: Do not touch. Only rename if there is a meaningful SEO or UX reason — slug stability is more valuable than a marginally better keyword in the URL.
2. **Product handles** (`/toode/{handle}`): These come from the VEVOR feed. Changing them is extremely high risk (14,841 pages, likely indexed). Do not rename product handles for SEO. Optimize title tag, H1, meta description, and schema instead.
3. **`/other` handle** (currently live 200, flagged by Agent 1): Add `<meta name="robots" content="noindex" />` to the page rather than redirecting. Redirect target is unclear; noindex removes it from the index without breaking any internal link that might point there.

### 308 vs 301 note

The current `next.config.ts` uses `permanent: true` which Next.js renders as 308. For maximum cross-browser compatibility and Google compliance, prefer 301. In Next.js 15+, `permanent: true` should yield 308 for non-GET methods (POST preserves). For category redirects (always GET), this distinction does not matter — Google treats both as permanent. Keep as-is.

### Redirect chain rule

No redirect chain longer than 2 hops. Current chain risk: a URL that 308s to a v3 L1 that later gets renamed would create a 2-hop chain. Audit: whenever a v3 slug is renamed, collapse any existing redirect that pointed to the old v3 slug directly to the new target.

---

## 7. Hreflang Map for EE ↔ ES

### Current state

Only ET (`et`) and EN (`en`) locales exist. The sitemap at `app/sitemap.ts:27` lists `["en", "et"]`. Spain is not yet live.

### Hreflang implementation when ES launches

Add `<link rel="alternate">` tags in the `<head>` of every page. In Next.js, implement via `generateMetadata` or the `alternates` metadata key:

```typescript
// In app/[locale]/kategooriad/[handle]/page.tsx
export async function generateMetadata({ params }: Props) {
  const { locale, handle } = params
  return {
    alternates: {
      languages: {
        'et': `https://xlmarket.eu/et/kategooriad/${handle}`,
        'en': `https://xlmarket.eu/en/kategooriad/${handle}`,
        // When ES is live:
        // 'es': `https://xlmarket.es/es/c/${spanishSlug}`,
        'x-default': `https://xlmarket.eu/en/kategooriad/${handle}`,
      }
    }
  }
}
```

### Domain strategy for ES market

Two options:

**Option A: Subdomain (`xlmarket.es`)** — separate domain, separate GSC property. Cleaner separation. Higher overhead (two deployments). Better for ES SEO because `.es` TLD has local trust signal.

**Option B: Subdirectory (`xlmarket.eu/es/`)** — one deployment, shared domain authority. Simpler. Weaker local signal than `.es` TLD but easier to implement.

**Recommendation: Option B initially** (subdirectory `/es/`) because XLMarket's domain authority is still building. Pooling it into one domain is better than splitting it. When ES revenue justifies it, migrate to `xlmarket.es` with 301s.

### Hreflang rules

- Every ET page must have: `hreflang="et"` self-referencing + `hreflang="en"` pointing to EN equivalent + `hreflang="x-default"` pointing to EN.
- Do not add `hreflang="es"` until the ES pages actually exist and are indexable.
- The sitemap should also include `<xhtml:link rel="alternate" hreflang="...">` elements for each URL — Next.js `app/sitemap.ts` needs updating for this when ES launches.
- Category slugs in ET and EN are currently identical (English slugs, both locales). When ES launches with Spanish slugs, the hreflang tags bridge the different URL shapes across locales.

---

## 8. Top 15 Vertical Collection Pages to Build First

Ranked by: (estimated monthly search demand) × (buildability with existing products) × (competition gap). Score = 1 (low) to 10 (high) on each axis.

| Rank | Collection page | URL | Demand | Buildability | Competition gap | Notes |
|---|---|---|---|---|---|---|
| 1 | Kohviku avamine | `/et/alustajale/kohvik` | 8 | 9 | 9 | HoReCa #1 sector, 554 products available, informational query converts to multi-product purchase |
| 2 | Laser graveerijad äri | `/et/alustajale/laser-graveerijad` | 7 | 9 | 10 | Near-zero competition below €1K, 31+ products, direct gap vs Lasermeister |
| 3 | Autopesula sisseseade | `/et/alustajale/autopesula` | 6 | 7 | 9 | No dedicated ET competitor page exists, 50+ relevant products (pressure washers, vacuums) |
| 4 | Restorani avamine | `/et/alustajale/restoran` | 7 | 9 | 7 | Larger intent than kohvik, broader product range (furniture + cooking + refrigeration) |
| 5 | Trükifirma starter kit | `/et/alustajale/trykifirma` | 5 | 8 | 10 | 115 printmaking products, no Estonian competitor for this vertical |
| 6 | Ilusalong käivitus | `/et/alustajale/ilusalong` | 6 | 6 | 7 | 17 products now (thin), but Salon L1 is growing; keyword demand is real |
| 7 | Haljastusettevõte | `/et/alustajale/haljastus` | 5 | 8 | 8 | 234 landscaping products, keyword "haljastusettevõte tööriistad" has zero competition |
| 8 | Keevitustöökoda | `/et/alustajale/keevitustookoda` | 5 | 8 | 7 | Welding starter — MIG welder + safety + grinding, ~120 products |
| 9 | Pakkimisteenus | `/et/alustajale/pakkimisteenus` | 4 | 7 | 9 | 29 packaging machines, no ET competitor page for this query |
| 10 | CNC/lõikamisäri | `/et/alustajale/cnc-laserlõikus` | 4 | 7 | 10 | Low volume but very high AOV (€800–€3K per sale), 70+ products |
| 11 | Autopesur bensiiniga | `/et/kategooriad/pressure-washers` (L3) | 7 | 9 | 6 | Not a starter kit — a strong PLP for "bensiini survepesur" |
| 12 | Garaaž ja töökoda | `/et/alustajale/garaaztookoda` | 5 | 8 | 6 | Combines Automotive + Tools, "garaaž avamine" has real intent |
| 13 | Toitlustus väliterrassile | `/et/alustajale/terassitoitlustus` | 4 | 7 | 9 | Seasonal (May–Sep), outdoor furniture + heating + grills |
| 14 | Masinaehitus starter | `/et/alustajale/masinaehitus` | 3 | 6 | 8 | Small but high-AOV, lathes + mills + CNC accessories |
| 15 | Tanklate sisseseade | `/et/alustajale/tankla` | 4 | 7 | 9 | 44 fuel products, Tankler OÜ is the only Estonian competitor |

**Build order rationale:** #1–#4 launch together as part of the existing `/alustajale` infrastructure (already live at `/et/alustajale`). #5–#8 in sprint 2. #9–#15 opportunistically.

---

## Critical SEO Actions (by severity)

```
[CRITICAL] Stale sitemap serving legacy URLs
Location: /home/brrr/brrr-xlmarket/data/feeds/sitemap.xml + nginx /etc/nginx/sites-enabled/xlmarket.store
Issue: nginx serves the 2026-04-14 static sitemap file, bypassing Next.js app/sitemap.ts. The file contains 100+ legacy category handles that 308 to v3 slugs. Google wastes crawl budget on redirect chains.
Fix: Remove the nginx `location = /sitemap.xml` static serve rule. Let Next.js app/sitemap.ts handle it (already built). Rename the static file to .stale.

[CRITICAL] /other category indexed with 200
Location: /et/kategooriad/other (live URL)
Issue: Empty legacy category page returning 200, visible to Googlebot.
Fix: Add `<meta name="robots" content="noindex, nofollow" />` to the category page component when category product count is zero. Or redirect `other` → root `/et/kategooriad`.

[CRITICAL] Missing Product schema on PDPs
Location: /home/brrr/brrr-xlmarket/storefront/app/[locale]/toode/[handle]/page.tsx
Issue: No JSON-LD Product schema on product detail pages. Google cannot generate rich results (price, availability) for 14,841 products.
Fix: Add JSON-LD block in `<head>` of each PDP with @type:Product, offers (VAT-inclusive price), brand, availability. Template shown in §5.4 above.

[HIGH] No BreadcrumbList schema on category or product pages
Location: Category and product page templates
Issue: Breadcrumb schema is absent site-wide. Google uses BreadcrumbList to display path in SERP snippets, which increases CTR.
Fix: Add BreadcrumbList JSON-LD to all L1, L2, and PDP pages. Template shown in §5.1–5.4 above.

[HIGH] playground-sets redirect conflicts with taxonomy-v3 subSlug
Location: /home/brrr/brrr-xlmarket/storefront/next.config.ts:29, /home/brrr/brrr-xlmarket/storefront/lib/taxonomy-v3.ts:119
Issue: `playground-sets` used both as a redirect source (→ fitness-sports-recreation) and as a v3 L2 subSlug. MegaMenu links for this L2 trigger a 308.
Fix: Remove line 29 from next.config.ts. Rename the subSlug in taxonomy-v3.ts from `playground-sets` to `playground-outdoor-play`. (Confirmed fix from Agent 1.)

[HIGH] No meta descriptions on category pages
Location: Category page generateMetadata function
Issue: Without unique meta descriptions, Google auto-generates snippets, often pulling product titles — low CTR.
Fix: Add dynamic meta description per L1/L2 based on category name + product count + value prop. Example: "Suurköögiseadmed restoranidele ja kohvikutele. {N} toodet. Kuni 73% odavam kui kohalikud tarnijad."

[HIGH] Dual-route duplication /haru/ vs /kategooriad/
Location: next.config.ts + /app/[locale]/haru/ route
Issue: Both /et/haru/{slug} and /et/kategooriad/{slug} serve the same content. Duplicate content signal; link equity split.
Fix: 301 all /haru/ URLs to /kategooriad/ equivalents. Add to categoryRedirects() in next.config.ts.

[MEDIUM] Missing CollectionPage schema on L1 category pages
Location: /home/brrr/brrr-xlmarket/storefront/app/[locale]/kategooriad/[handle]/page.tsx
Issue: Google cannot identify these as product collection pages. ItemList or CollectionPage schema improves how category pages appear in AI Overviews and rich results.
Fix: Add JSON-LD CollectionPage block per template in §5.1.

[MEDIUM] SearchAction schema missing from homepage
Location: /home/brrr/brrr-xlmarket/storefront/app/[locale]/page.tsx
Issue: No WebSite + SearchAction schema. Missing eligibility for Sitelinks Searchbox in Google SERPs.
Fix: Add JSON-LD per §5.6 template.
```

---

## Sources

Competitor data was gathered via WebFetch on 2026-04-18:
- Bauhof.ee navigation analysis: URL pattern `/et/c/{estonian-slug}` confirmed
- Toolstation.com category structure: `/power-tools/combi-drills/c765` pattern confirmed
- Ehituse ABC structure: `/ee/{slug}` flat pattern confirmed
- Motonet.ee: vehicle-first, shallow category structure confirmed

Keyword volume estimates are approximations based on: Estonian internet population data (Statcounter Estonia, 2025), SERP result counts, and relative demand inference from the B2B market research at `/home/brrr/brrr-xlmarket/docs/research/2026-04-15-b2b-market-research.md`. No Ahrefs/SEMrush API access was available — treat as directional, not precise.

Schema.org specifications per: https://schema.org/CollectionPage, https://schema.org/Product, https://schema.org/BreadcrumbList, https://schema.org/SearchAction — aligned with Google's Rich Results documentation requirements.
