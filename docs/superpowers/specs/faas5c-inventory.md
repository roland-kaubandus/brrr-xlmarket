# Faas 5c — koodiinventuur

**Kuupäev:** 2026-04-18  
**Eesmärk:** Kaardistada olemasolev kood Faas 5c implementeerimise eeltööks  
**Spec allikas:** `docs/superpowers/specs/2026-04-18-taxonomy-final-design.md` §3.5, §3.6, §6, §8

---

## 1. `storefront/app/[locale]/kategooriad/[handle]/page.tsx`

**Failirada:** `/home/brrr/brrr-xlmarket/storefront/app/[locale]/kategooriad/[handle]/page.tsx`

### Praegune render-struktuur

```
breadcrumb (ancestors from getAncestors())
H1 + tootearv + SortSelect + mobile filter button
[sidebar VevorSearchFilters | main content]
  main:
    children.length > 0 → subcategory grid (2/3/4/5/6 grid)
    ProductGrid (filter: category_handles = "{handle}")
    VevorPagination
"Sulle võib meeldida ka" → ProductGrid (same level sibling filter)
```

### Breadcrumb

Rida 204–215. Kasutab `getAncestors(handle)` + `nodeName()`. **Faas 5c §3.5.3 nõue on täidetud** — ancestors from SSoT, locale-aware, non-link viimane element olemas.

Puudu: `trail.length === depth(handle) + 1` kontroll (INV-27) ei toimu lehe koodis, ainult invariant-skriptis.

### Alamkategooriate sektsioon

Rida 290–320. On olemas — `getChildren(handle)` + `CategoryThumb` + Link. **Kuid see on GRID, mitte karusell.** Spec §3.5.4 nõuab full-width horisontaalset scroll-karusselli snap-to-item käitumisega.

Lisaks: karusell ei filteeri 0-toote alamkategooriaid (spec §3.5.4: "Alamkategooria, mille tootearv = 0, ei kuvata"). INV-25.

### Filter + grid

Rida 104–115: Meili filter ehitatakse `category_handles = "${handle}"` põhjal.  
**Spec §3.5.6 nõuab `taxonomy.ancestors = "${handle}"`.** See on INV-28 rikkumine praeguses koodis.

Sidebar: `VevorSearchFilters` saab `categoryFacets` — filtered `allowedSidebarHandles` (siblings + children, rida 141–156). Spec §3.5.5: "alamkategooria-filter ei dubleeri karuselli." Kuna karusell on grid praegu, mitte karusell, siis kategoriate facet sidebar'is dubleerib sisu.

### Puuduvad sektsioonid (spec §3.5.7)

- **History** (recently viewed) — puudub
- **Deals** (discount_pct:desc, sama L1) — puudub  
- **Best sellers** (popularity:desc, sama L1) — puudub

Kõik kolm nõuavad `getL1Ancestor(handle)` + Meili `taxonomy.ancestors = L1` päringuid.

### Puuduvad Meili väljad (spec §3.5.6)

`discount_pct` ja `popularity` pole praegu Meili dokumentides (vt §5 all). Ilma nendeta ei saa Deals + Best sellers lõike teha.

**Vaja muuta: JAH** — karusell → horisontaalne scroll, filter muutus `taxonomy.ancestors`, 3 uut sektsiooni (history/deals/best sellers).

---

## 2. `storefront/lib/category-tree.ts`

**Failirada:** `/home/brrr/brrr-xlmarket/storefront/lib/category-tree.ts`

### Avalikud funktsioonid

| Funktsioon | Signatuur | Olemas |
|---|---|---|
| `getNode(handle)` | `(string) → CategoryNode \| null` | Jah |
| `nodeName(node, locale)` | `(CategoryNode, Locale) → string` | Jah |
| `nodeImage(node)` | `(CategoryNode \| null) → string \| null` | Jah |
| `getAncestors(handle)` | `(string) → CategoryNode[]` | Jah, root→parent (excludes self) |
| `getL1Ancestor(handle)` | `(string) → CategoryNode \| null` | Jah |
| `getSiblings(handle)` | `(string) → CategoryNode[]` | Jah |
| `getChildren(handle)` | `(string) → CategoryNode[]` | Jah |
| `getAllL1()` | `() → CategoryNode[]` | Jah |
| `getBreadcrumbTrail(handle, locale)` | `(string, Locale) → {handle, name}[]` | Jah, root→node inclusive |
| `firstKnownHandle(candidates)` | `(string[]) → CategoryNode \| null` | Jah |
| `totalNodes()` | `() → number` | Jah |

**Puuduv funktsioon Faas 5c jaoks:** `getChildrenWithProductCounts(handle)` — spec §3.5.4 nõuab Meili facet-count't iga alamkategooria jaoks tühjade filtreerimiseks. See on eraldi Meili päring, mitte category-tree.ts sisu.

### `CategoryNode` tüüp

```typescript
interface CategoryNode {
  handle: string
  name_en: string
  name_et: string
  level: 1 | 2 | 3
  parent_handle: string | null
  child_handles: string[]
  image_path: string | null
  image_source: "direct" | "alias" | "fuzzy" | "none"
  description_et?: string | null
  description_en?: string | null
  tagline_et?: string | null
  tagline_en?: string | null
}
```

Puudub: `showInMegaMenu?: boolean` (spec §3.1.1 classifitseerib salon/music kui C-PEIDA). Vaja lisada gen-category-tree.mjs-i genereerimisloogikasse.

### `category-tree.generated.json` — struktuur

`image_path`, `child_handles`, `parent_handle` väljad **on olemas**. Näidissõlm:

```json
{
  "handle": "commercial-refrigeration",
  "level": 2,
  "parent_handle": "horeca-food-service",
  "child_handles": ["commercial-refrigerators", "ice-machines", "display-cases", "bain-maries"],
  "image_path": "/cat-thumbs/refrigerators.webp",
  "image_source": "alias"
}
```

Puudub: `tagline_et/en` pole täidetud L3 sõlmedel (vaikeväärtus null). Puudub `showInMegaMenu` väli.

**Vaja muuta: EI** (täiendada küll — lisada `showInMegaMenu` gen-skripti, tagline'id YAML'i).

---

## 3. `storefront/components/ProductGrid.tsx`, `CategoryThumb.tsx`, `MegaMenu.tsx`

### ProductGrid

**Failirada:** `/home/brrr/brrr-xlmarket/storefront/components/ProductGrid.tsx`

```typescript
type ProductGridProps = {
  initialProducts?: any[]
  fetchParams?: {
    q?: string; filter?: string; sort?: string
    limit?: number; offset?: number; locale?: string; facets?: string
  }
  locale: string
  columns?: "2-3-4" | "2-3-5"
  className?: string
}
```

Kasutab `/meili/indexes/products/search` otse brauserist (nginx proxy). `filter` on string, split `;` -> array. `sort` on string, split `,` -> array.

**Puuduv:** `columns="2-3-4"` defaultiga ei toeta spec §3.5.6 nõuet "4 veergu ≥1280px" (praegu `lg:grid-cols-4` = 1024px+). Spec nõuab `xl:grid-cols-4`. Vaja uus columns variand või CSS muudatus.

**Consumers:** kategooriad/[handle]/page.tsx (2x), tooteleht, alustajale lehed.

### CategoryThumb

**Failirada:** `/home/brrr/brrr-xlmarket/storefront/components/CategoryThumb.tsx`

```typescript
interface CategoryThumbProps {
  handle: string
  size?: number
  className?: string
  alt?: string
  node?: CategoryNode | null  // pre-resolved, skip tree lookup
}
```

Prioriteet: `node.image_path` → L1 Lucide icon fallback. Server-renderitav (ei ole `"use client"`). Kasutatakse MegaMenu, kategooria grid, HomepageShell.

**Vaja muuta: EI** — API sobib karuselli kaartidele.

### MegaMenu

**Failirada:** `/home/brrr/brrr-xlmarket/storefront/components/MegaMenu.tsx`

```typescript
interface MegaMenuProps {
  locale?: string
  variant?: "light" | "dark"
}
```

N-level rekursiivne drill `hoverPath` state'iga. `getAllL1()` + `getChildren()` SSoT-ist. Build-time data, runtime API fetch puudub.

**Puuduv spec §3.1.1 nõue:** salon/music tuleks `showInMegaMenu: false` puhul peidete. Praegu kuvab kõik 22 L1-d.

**Vaja muuta: EI** (väike täiendus — `showInMegaMenu` filter L1 loendis).

---

## 4. `storefront/components/search/VevorSearchFilters.tsx`

**Failirada:** `/home/brrr/brrr-xlmarket/storefront/components/search/VevorSearchFilters.tsx`

### Props

```typescript
type Props = {
  totalHits: number; query: string; currentSort: string
  currentMin?: string; currentMax?: string
  currentCategories?: string[]; currentInStock?: boolean
  categoryFacets?: Record<string, number>
  categoryLabels?: Record<string, string>
  quickFilters?: QuickFilter[]; currentQuickFilter?: string
  locale: string; basePath?: string
}
```

### Faceting käitumine

`categoryFacets` prop on pre-filtered (allowed: siblings + children), ei sisalda täielikku facet-listi. Kuvab kategooria checkboxe, hinnavaheliku, "laos" toggle, kiirfiltrid.

### Alamkategooria filter vs karusell dubleerimine

Praegu: sidebar näitab category facets (siblings + children). Karusell näitab same children. **Spec §3.5.5:** "alamkategooria-filter ei dubleeri karuselli — kui karusell katab ühe tasme, ei ole facet'is sama tasme."

**Lahendus Faas 5c-s:** kui `children.length > 0` (karusell nähtav), eemaldada kategoriate sektsiooni sidebar'ist. `VevorSearchFilters`-ile lisada `hasCarousel?: boolean` prop. Kui `true`, peidetakse categories sektsiooni.

**Puuduv:** brand facet (spec §3.5.5: "brand" filterable). Praegu `brand` pole Meili dokumentides ega facets listis.

**Vaja muuta: JAH** — lisada `hasCarousel` prop + konditsionaalne kategoriate sektsiooni peitmise loogika.

---

## 5. Meili indeksi schema (`backend/scripts/index-meilisearch.mjs`)

**Failirada:** `/home/brrr/brrr-xlmarket/backend/scripts/index-meilisearch.mjs`

### Konfiguratsioon (configureIndex, read 32–46)

```javascript
filterableAttributes: [
  "categories", "category_handles", "subcategory", "price", "in_stock", 
  "translated", "filter_tokens",
  "taxonomy.l1_slug", "taxonomy.l2_slug", "taxonomy.l3_slug", "taxonomy.ancestors",
  "vertical_slugs",
],
sortableAttributes: ["price", "created_at", "title_en"],
pagination: { maxTotalHits: 20000 },
```

### Dokumendi väljad (transform, read 343–366)

| Väli | Olemas | Spec §6.1 nõue |
|---|---|---|
| `taxonomy.l1_slug` | Jah | Jah |
| `taxonomy.l2_slug` | Jah | Jah |
| `taxonomy.l3_slug` | Jah | Jah |
| `taxonomy.ancestors` | Jah (`[...allHandles]`) | Jah |
| `vertical_slugs` | Jah (tühi array, materialize-verticals täidab) | Jah |
| `category_handles` | Jah (backward compat) | 30 päeva deprecated |
| `discount_pct` | **EI** | Nõutud Deals sektsiooni (§3.5.7) |
| `popularity` | **EI** | Nõutud Best sellers sektsiooni (§3.5.7) |
| `brand` | **EI** | Nõutud §6.1 + brand facet |
| `published_at` | **EI** (on `created_at` unix) | Spec nimetab `published_at` |
| `selling_points` | **EI** | Spec §6.1 searchable |
| `description_snippet` | **EI** | Spec §6.1 (≤400 chars) |
| `attributes` | **EI** | Spec §6.1 whitelisted flat attrs |

`sortableAttributes` puudub `popularity` — **ei saa sortida Best sellers**.

**Vaja muuta: JAH** — lisada `discount_pct`, `popularity`, `brand` väljade arvutamine transform()-i. Lisa `popularity` ja `published_at` sortableAttributes hulka. `discount_pct = round((original_price - price) / original_price * 100)` kui `original_price` metadata'st saadaval.

---

## 6. `scripts/check-taxonomy-invariants.mjs`

**Failirada:** `/home/brrr/brrr-xlmarket/scripts/check-taxonomy-invariants.mjs`

### Praegune INV count

**23 invarianti** (INV-01 kuni INV-23, sh INV-10..14 "skipped" backend env nõudega).

### Muster uue INV lisamiseks

```javascript
check("INV-XX", "CRIT"|"WARN", "Invariant kirjeldus", () => {
  // loeb yamlDoc, tree, aliasMap (loadAll() poolt laetud)
  // tagastab { pass: boolean, detail: string }
  const failures = []
  // ... kontrolliloogika ...
  return { pass: failures.length === 0, detail: failures.length ? `...` : "OK" }
})
```

`loadAll()` laeb: `taxonomy.yaml` → `yamlDoc`, `category-tree.generated.json` → `tree`, `taxonomy-image-aliases.yaml` → `aliasMap`.

Võrgu- või DB-päringuid vajavad INV-d (INV-10..19) märgitakse "skipped" ning aktiveeritakse env-lipuga (`TAXONOMY_HEALTH_LIVE=1`).

### INV-24..31 lisamise nõuded

| INV | Allikas | Vajab |
|---|---|---|
| INV-24 (breadcrumb lõpeb kategooriaga) | `tree.nodes` + `getBreadcrumbTrail` loogika | Ainult tree — ✓ lisatav kohe |
| INV-25 (0-toote sõlm ei kuva karusellil) | Meili count + tree | Vajab network (skipped mode OK) |
| INV-26 (karuselli kaardil image_path) | INV-20 laiendus, tree | ✓ lisatav kohe |
| INV-27 (trail.length === depth+1) | tree walk | ✓ lisatav kohe |
| INV-28 (`taxonomy.ancestors` mitte `category_handles`) | grep source files | `execSync` + grep |
| INV-29 (4-veeruline grid ≥1280px) | Playwright | E2E, eraldi test-failis |
| INV-30 (MegaMenu drillib L1→Ln) | Playwright | E2E, eraldi test-failis |
| INV-31 (VEVOR slug/nimi ei leki UI-sse) | grep + tree | `execSync` + grep |

**Vaja muuta: JAH** — INV-24,26,27,28,31 lisatav check-taxonomy-invariants.mjs'i. INV-25 skipped-mode. INV-29,30 Playwright-testid eraldi failis.

---

## 7. `storefront/lib/meilisearch.ts`

**Failirada:** `/home/brrr/brrr-xlmarket/storefront/lib/meilisearch.ts`

### API

```typescript
searchProducts(options: SearchOptions): Promise<MeiliSearchResult>
getMeiliProductByHandle(handle: string): Promise<MeiliHit | null>
escapeMeiliFilterValue(v: string): string
isSafeHandleToken(v: string): boolean
```

`SearchOptions.filter` on `string | string[]`. Page.tsx kasutab string[] (`filter: searchFilters`).  
`ProductGrid.tsx` kasutab string (`;`-separated, split kliendipoolt).

### `MeiliHit` tüüp — puuduvad Faas 5c väljad

```typescript
export type MeiliHit = {
  // ... olemasolevad ...
  // PUUDUVAD:
  discount_pct?: number      // Deals sektsiooni jaoks
  popularity?: number        // Best sellers sektsiooni jaoks
  brand?: string             // Brand filter jaoks
  taxonomy?: {
    l1_slug: string | null
    l2_slug: string | null
    l3_slug: string | null
    ancestors: string[]
  }
  vertical_slugs?: string[]
}
```

`taxonomy` ja `vertical_slugs` on Meili dokumentides olemas, aga `MeiliHit` tüübis deklareerimata — TypeScript ei tea nendest.

**Vaja muuta: JAH** — täiendada `MeiliHit` tüüpi; lisada `discount_pct`, `popularity`, `brand`.

---

## 8. `category-tree.generated.json` — struktuur kokkuvõte

**Failirada:** `/home/brrr/brrr-xlmarket/storefront/lib/category-tree.generated.json`

Sõlmede struktuur (täielik):

```json
{
  "generated_at": "2026-04-18T10:50:01.301Z",
  "nodes": {
    "{handle}": {
      "handle": "commercial-refrigeration",
      "name_en": "Commercial Refrigeration",
      "name_et": "Tööstuslik külmutustehnika",
      "level": 2,
      "parent_handle": "horeca-food-service",
      "child_handles": ["commercial-refrigerators", "ice-machines", ...],
      "description_et": null,
      "description_en": null,
      "image_path": "/cat-thumbs/refrigerators.webp",
      "image_source": "alias"
    }
  },
  "order": ["horeca-food-service", "commercial-refrigeration", ...]
}
```

Olemas: `image_path`, `child_handles`, `parent_handle`, `level`, `name_et`, `name_en`.  
Puudub: `tagline_et/en` (null kõikidel L2/L3-del), `showInMegaMenu`.

---

## Faas 5c muudatuste kokkuvõte

| Fail | Muudatus | Prioriteet |
|---|---|---|
| `app/[locale]/kategooriad/[handle]/page.tsx` | Grid → karusell (full-width scroll); `category_handles` → `taxonomy.ancestors` filter; +3 sektsiooni (history/deals/best sellers) | KRIITILINE |
| `components/search/VevorSearchFilters.tsx` | Lisa `hasCarousel` prop; kui `true`, peida kategooriate sektsiooni | KÕRGE |
| `components/ProductGrid.tsx` | Lisa `columns="2-3-4-xl"` variant (4 veergu ≥1280px, mitte ≥1024px) | KÕRGE |
| `backend/scripts/index-meilisearch.mjs` | Lisa `discount_pct`, `popularity`, `brand` väljad + `sortableAttributes` | KRIITILINE |
| `storefront/lib/meilisearch.ts` | Täiendada `MeiliHit` tüüpi | KESKMINE |
| `scripts/check-taxonomy-invariants.mjs` | Lisa INV-24, 26, 27, 28, 31 | KÕRGE |
| `scripts/gen-category-tree.mjs` | Lisa `showInMegaMenu` välja genereerimisloogika | KESKMINE |
| `components/MegaMenu.tsx` | Filter `showInMegaMenu: false` L1-d | MADAL |

**Uued failid vaja luua:**
- `components/CategoryCarousel.tsx` — full-width karusell spec §3.5.4 järgi
- `components/ProductCarousel.tsx` — history/deals/best sellers ribade jaoks (spec §3.5.7)
- `hooks/useRecentlyViewed.ts` — localStorage `xl.recently_viewed[]` haldus
- `tests/e2e/category-invariants.spec.ts` — INV-29, INV-30 Playwright testid

