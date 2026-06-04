# Multi-feed alus (backend/src/feeds/)

> Loodud 2026-06-04. Alus tulevasele multi-feed pipeline'ile (~37k toodet, 3+ tarnijat).
> Vt arhitektuur: `outputs/multi-feed-plaan-2026-06-04.md`.

## Mis on praegu (alus) vs mis tuleb (migratsioon)

**Praegu (see alus, additiivne — ei muuda töötavat importi):**
- `data/feeds.yaml` — feed-registry (SSoT). Iga feed: id, format, url, sku_prefix, mapping, adapter, markup, image_source.
- `feeds/registry.mjs` — laeb feeds.yaml, tagastab enabled feedid.
- `feeds/adapters/vevor.mjs` — VEVOR XLSX → **NormalizedRow[]** (sama veeru-mapping kui `scripts/import-vevor-feed.mjs`, + SKU-namespace + image_source).
- `feeds/normalize.mjs` — jagatud helperid (makeHandle prefiksiga).

**Migratsioon (HILJEM, eraldi samm — riskantsem):**
- Rewire `scripts/import-vevor-feed.mjs` kasutama `registry` + `adapters` (loop üle feedide).
- Praegu import-vevor-feed.mjs töötab endiselt iseseisvalt — EI ole veel muudetud.

## NormalizedRow skeem (ühine kõigile tarnijatele)

Iga adapter `parse()` tagastab massiivi NormalizedRow-sid:

```js
{
  source: "vevor",              // feed.id — läheb metadata.source
  supplier_sku: "VV-12345",     // feed.sku_prefix + "-" + raw_sku (kollisioonivaba)
  raw_sku: "12345",             // tarnija algne SKU
  title: "...",
  description: "...",
  rich_description_html: "..." | null,
  brand: "VEVOR",               // feed.brand_lock || rea bränd
  product_type: "Tools|Welding",// tarnija kategooriaskeem (resolveri sisend)
  price: 123.45,                // ALGHIND (markup rakendub pipeline'is, mitte adapteris)
  availability: "in stock",
  inventory: 10,
  weight: 5.2,
  dimensions: { high, wide, long, unit },
  images: {
    main: "https://...",
    gallery: ["https://..."],
    original: ["https://..."],
    image_source: "vevor_cdn"   // feed.image_source — kust pildid (cdn|r2|...)
  },
  selling_points: ["...", ...],
  upc: "...", spu: "..." | null, link: "..."
}
```

Pärast adapterit on pipeline tarnija-agnostiline: resolver (mapping) → markup → handle →
Medusa upsert (dedup `supplier_sku`, metadata.source/image_source) → Meili (1× lõpus).

## Põhiprintsiibid
- **Taxonomy.yaml = 1 kureeritud SSoT** — ükski feed ei loo kategooriaid.
- **SKU-namespace** per tarnija → ei kollideeru (handle + dedup `supplier_sku`).
- **metadata.source + image_source** igal tootel → filtreerimine, per-feed kustutus, pildi-migratsioon.
- **Reindex 1× lõpus** (mitte per-feed) — väldib vahepealset katki-indeksit.
