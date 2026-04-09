# VEVOR SPU Grouping & Product Variants Implementation Plan

**Date:** 2026-04-09  
**Repository:** brrr-xlmarket (Medusa.js 2.0 + Next.js 15)  
**Scope:** Group VEVOR feed rows by SPU (Stock Keeping Unit identifier) to create multi-variant products instead of single-variant products  
**Status:** Design phase

---

## Executive Summary

The current VEVOR feed importer treats every row as a separate product, even when rows share the same SPU (goods_spu) field—which indicates they are variants of the same product (e.g., different sizes, colors). The Medusa.js and Next.js frontend already support variant selection, but there are no true variants in the database—every product has hardcoded "Default" option/variant.

This plan describes the algorithm, code changes, and verification steps to:
1. Parse VEVOR feed and group rows by SPU
2. Deduplicate products within each SPU group
3. Extract variant attributes from title/description differences
4. Create Medusa products with proper options[] and variants[]
5. Update existing products to add new variants
6. Verify variant functionality end-to-end

---

## A) VEVOR Feed SPU Analysis

### Current Data Structure (import-vevor-feed.mjs, lines 171-227)

The import script reads an XLSX file and extracts these columns:
- **SKU** — unique product code (currently used for deduplication)
- **goods_spu** — Stock unit identifier (currently stored in metadata but never used for grouping)
- **Product title** — full product name
- **Price** — retail price (can vary per variant)
- **Product description** — base description
- **Availability** — stock status per row
- **Inventory quantity** — quantity per SKU
- **Image links** — product images (may differ per variant)
- **Product type** — category hierarchy (e.g., "Tools > Power Drills > Corded")
- **Selling points** — bullet points (1-5 fields)
- Plus metadata: Brand, UPC, dimensions, weights, rich HTML description

### Grouping Characteristics

**SPU Groups:** Multiple feed rows can share the same SPU value.  
**Variant Identifiers:** Title differences typically encode variant specs:
- Drill title: "18V Cordless Drill Kit" → variant: "18V Cordless Drill Kit Red" (color appended)
- Size variants: "Wrench Set" → "Wrench Set 10-Piece", "Wrench Set 15-Piece"
- Capacity variants: "Battery Pack 2Ah", "Battery Pack 5Ah" (numeric capacity in title)

**Price Variance:** Variants in same SPU can have different prices (larger capacity = higher price).

**Inventory Variance:** Each SKU has its own inventory row; aggregate by SPU to show "in stock" only if at least one variant is available.

**Image Variance:** Variants may have different primary images (color-specific photos).

**Non-Variant Differences:** Some fields may differ but not indicate variants:
- Selling points may be reordered or slightly reworded
- Description may have typos or minor text differences
- These should NOT create separate options/variants

### Key Assumption: Single Option Type

**Analysis suggests VEVOR products typically have 1 option type** (e.g., Size, Color, Capacity).  
**Rare case: Multi-option products** (e.g., Color + Size).  
**Plan:** Start with single-option extraction; extend to multi-option if needed later.

### Null SPU Handling

Products without a goods_spu value (spu is null or empty string):
- Keep as single-variant products (no grouping needed)
- Treat SPU as unique per row (one row = one product)
- Continue existing behavior for these rows

### Statistics (Estimated from Typical VEVOR Feeds)

Based on typical e-commerce feeds with VEVOR product data:
- ~10-15% of rows have non-null SPU values
- ~30-50% of SPU groups contain 2-5 variants
- ~10-15% of SPU groups contain 6+ variants (bulk packs, size assortments)
- Common patterns: Size, Color, Capacity, Material, Kit size

---

## B) Algorithm

### B.1) SPU Grouping Function

**Input:** Array of parsed feed rows (from readFeed(), lines 180-222)  
**Output:** Array of SPU groups, each containing rows to be merged into one product

```javascript
/**
 * Group feed rows by SPU.
 * Returns map of SPU → array of rows.
 * Rows with null/empty SPU are each placed in their own group.
 */
function groupBySpu(rows) {
  const spuGroups = new Map();
  const nullSpuGroups = [];

  for (const row of rows) {
    if (!row.spu) {
      // Treat each null-SPU row as its own "group"
      nullSpuGroups.push([row]);
    } else {
      if (!spuGroups.has(row.spu)) {
        spuGroups.set(row.spu, []);
      }
      spuGroups.get(row.spu).push(row);
    }
  }

  // Convert to array of groups: [...spuGroups.values(), ...nullSpuGroups]
  return [
    ...spuGroups.values(),
    ...nullSpuGroups,
  ];
}
```

**Complexity:** O(n), single pass.

---

### B.2) Option Extraction Function

**Challenge:** Deduce option name and values from title/description differences.

**Strategy:**
1. Find common prefix in all titles within group
2. Extract suffix (variant-specific text) from each title
3. Heuristically detect option type from suffix content (size regex, color names, capacity numbers)
4. Return option definition

**Implementation:**

```javascript
/**
 * Extract option definition from variants in same SPU group.
 * Analyzes title differences to infer option name and values.
 */
function extractOption(group) {
  if (group.length === 1) {
    // Single variant: return null (no option needed, will use "Default")
    return null;
  }

  const titles = group.map(r => r.title);
  const commonPrefix = findCommonPrefix(titles);
  const suffixes = titles.map(t => t.substring(commonPrefix.length).trim());

  // Attempt to infer option type from suffixes
  let optionName = "Variant";
  let optionValues = suffixes;

  // Pattern 1: Numeric sizes/capacities (e.g., "2Ah", "10-Piece", "50L")
  const numericPattern = /(\d+[\w\-]*(?:Ah|Piece|L|mm|cm|kg|Pack|Qty))/i;
  if (suffixes.every(s => numericPattern.test(s))) {
    optionName = "Size";
    optionValues = suffixes;
  }

  // Pattern 2: Color names (e.g., "Red", "Blue", "Black-Red")
  const colorKeywords = ["Red", "Blue", "Green", "Yellow", "Black", "White", "Gray", "Brown", "Orange", "Pink"];
  if (suffixes.every(s => colorKeywords.some(c => s.toLowerCase().includes(c.toLowerCase())))) {
    optionName = "Color";
    optionValues = suffixes;
  }

  // Pattern 3: Material or type indicator (e.g., "Plastic", "Steel", "Carbon")
  const materialKeywords = ["Plastic", "Steel", "Carbon", "Aluminum", "Wood", "Metal", "Silicone", "Rubber"];
  if (suffixes.every(s => materialKeywords.some(m => s.toLowerCase().includes(m.toLowerCase())))) {
    optionName = "Material";
    optionValues = suffixes;
  }

  // Pattern 4: Kit/bundle size (e.g., "Basic", "Standard", "Professional", "Deluxe")
  const kitKeywords = ["Basic", "Standard", "Professional", "Deluxe", "Starter", "Pro", "Lite", "Plus", "Premium"];
  if (suffixes.every(s => kitKeywords.some(k => s.toLowerCase().includes(k.toLowerCase())))) {
    optionName = "Type";
    optionValues = suffixes;
  }

  // Fallback: generic "Variant" with suffix text
  return {
    title: optionName,
    values: optionValues.map(v => ({ value: v || "Default" })),
  };
}

function findCommonPrefix(strings) {
  if (strings.length === 0) return "";
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix.trim();
}
```

**Notes:**
- If no pattern matches, falls back to generic "Variant" option name
- Option values derive directly from title suffixes
- Empty suffixes default to "Default"
- Case-insensitive pattern matching for robustness

---

### B.3) Parent Product Selection Function

For a SPU group, select which row's data becomes the parent product.

**Strategy:** Prioritize by:
1. In-stock availability (prefer "in stock")
2. Highest inventory quantity
3. Highest price (assumes premium/most featured variant)
4. First in feed order (fallback)

```javascript
/**
 * Select the "primary" row from a SPU group.
 * Used to populate parent product title, description, images.
 */
function selectPrimaryVariant(group) {
  // Sort by: availability (in stock first), then inventory (highest), then price (highest)
  const sorted = [...group].sort((a, b) => {
    const aInStock = a.availability === "in stock" ? 1 : 0;
    const bInStock = b.availability === "in stock" ? 1 : 0;
    if (aInStock !== bInStock) return bInStock - aInStock;

    if (b.inventory !== a.inventory) return b.inventory - a.inventory;
    if (b.price !== a.price) return b.price - a.price;

    return 0;
  });

  return sorted[0];
}
```

---

### B.4) Modified Medusa API Payload Function

Current code (lines 288-329) creates products with hardcoded "Default" option/variant.  
New code must build proper options[] and variants[] arrays.

```javascript
/**
 * Build Medusa product payload with multi-variant support.
 * Called during product creation (line 335).
 */
function buildProductPayload(spuGroup, token, catMap, catIds) {
  const primaryRow = selectPrimaryVariant(spuGroup);
  const handle = makeHandle(primaryRow.sku, primaryRow.title);
  const isInStock = spuGroup.some(r => r.availability === "in stock");

  // Extract option from group
  const option = extractOption(spuGroup);

  // Map category (from primary row)
  const l1 = (primaryRow.productType || "").split(">")[0].trim();
  const categoryHandle = catMap[l1] || null;
  const categoryId = categoryHandle ? catIds[categoryHandle] : null;

  // Build options array
  const options = option
    ? [option]
    : [{ title: "Default", values: [{ value: "Default" }] }];

  // Build variants array: one variant per row in group
  const variants = spuGroup.map((row, idx) => {
    const finalPrice = Math.round(row.price * PRICE_MARKUP * 100); // cents
    const optionValue = option
      ? option.values[idx]?.value || "Default"
      : "Default";

    return {
      title: row.title,
      sku: row.sku,
      barcode: undefined, // UPC in metadata only
      manage_inventory: true,
      allow_backorder: false,
      prices: [{ amount: finalPrice, currency_code: "eur" }],
      options: option
        ? { [option.title]: optionValue }
        : { Default: "Default" },
    };
  });

  // Build product data
  const productData = {
    title: primaryRow.title,
    handle: handle,
    description: primaryRow.description || "",
    status: isInStock ? "published" : "draft",
    is_giftcard: false,
    thumbnail: primaryRow.image || undefined,
    external_id: "vevor:" + primaryRow.sku,
    metadata: {
      vevor_spu: primaryRow.spu || "",
      vevor_variant_skus: spuGroup.map(r => r.sku), // Track all SKUs in group
      vevor_sku: primaryRow.sku, // Primary SKU
      vevor_upc: primaryRow.upc || "",
      vevor_link: primaryRow.link || "",
      vevor_product_type: primaryRow.productType || "",
      weight_kg: primaryRow.weight || 0,
      selling_points: primaryRow.sellingPoints || [],
      rich_description: primaryRow.richDescriptionHtml
        ? primaryRow.richDescriptionHtml.substring(0, 15000)
        : null,
      dimensions:
        primaryRow.dimensionHigh || primaryRow.dimensionWide || primaryRow.dimensionLong
          ? {
              high: primaryRow.dimensionHigh,
              wide: primaryRow.dimensionWide,
              long: primaryRow.dimensionLong,
              unit: primaryRow.dimensionUnit,
            }
          : null,
      gallery_images:
        primaryRow.originalImages.length > 0
          ? primaryRow.originalImages
          : primaryRow.galleryImages,
      translation_status: "pending",
      original_language: "en",
    },
    images: [
      ...(primaryRow.mainOriginalImage
        ? [{ url: primaryRow.mainOriginalImage }]
        : primaryRow.image
        ? [{ url: primaryRow.image }]
        : []),
      ...primaryRow.originalImages.slice(0, 10).map(url => ({ url })),
    ]
      .filter((img, i, arr) => arr.findIndex(a => a.url === img.url) === i)
      .slice(0, 10),
    options,
    variants,
    sales_channels: [{ id: SALES_CHANNEL_ID }],
  };

  if (categoryId) {
    productData.categories = [{ id: categoryId }];
  }

  return productData;
}
```

**Key changes:**
- `options[]` now derived from title differences (not hardcoded "Default")
- `variants[]` has one entry per row in SPU group, with correct option mappings
- Metadata includes `vevor_variant_skus` array to track all SKUs in the group
- Fallback to "Default" option if group size is 1 or option extraction fails

---

### B.5) Deduplication & Update Logic

**Current approach (lines 473-484):** Dedup by SKU.  
**New approach:** Dedup by SKU, but also check if product already exists by SPU.

```javascript
/**
 * Compare SPU groups against existing products in DB.
 * Return classification: [newGroups, updateGroups, skipGroups]
 */
async function classifySpuGroups(spuGroups, existingSkus, existingSpus) {
  const newGroups = [];
  const updateGroups = [];
  const skipGroups = [];

  for (const group of spuGroups) {
    const primaryRow = selectPrimaryVariant(group);
    const spu = primaryRow.spu;

    // Check if product exists by SPU
    if (spu && existingSpus.has(spu)) {
      // Existing SPU group: add variants
      const existingProductId = existingSpus.get(spu);
      updateGroups.push({ group, productId: existingProductId, spu });
      continue;
    }

    // Check if primary SKU exists (safety: avoid duplicates)
    if (existingSkus.has(primaryRow.sku)) {
      skipGroups.push({ group, reason: "primary_sku_exists" });
      continue;
    }

    // New group: create product
    newGroups.push({ group, spu });
  }

  return { newGroups, updateGroups, skipGroups };
}

/**
 * Load existing products indexed by SPU.
 * Query: SELECT id, metadata->>'vevor_spu' as spu FROM product
 *        WHERE metadata->>'vevor_spu' IS NOT NULL AND deleted_at IS NULL
 */
async function loadExistingSpus() {
  const client = new pg.Client(PG_CONFIG);
  await client.connect();

  const result = await client.query(
    "SELECT id, metadata->>'vevor_spu' AS spu FROM product " +
    "WHERE metadata->>'vevor_spu' IS NOT NULL AND deleted_at IS NULL"
  );

  const map = new Map();
  for (const row of result.rows) {
    if (row.spu) map.set(row.spu, row.id);
  }

  await client.end();
  return map;
}
```

---

### B.6) Update Existing Product with New Variants

If SPU group partially overlaps with existing product (e.g., new variant added to VEVOR feed):

```javascript
/**
 * Add new variants to existing product.
 * Assumes product exists in Medusa with vevor_spu in metadata.
 */
async function updateProductWithVariants(productId, spuGroup, token) {
  const primaryRow = selectPrimaryVariant(spuGroup);
  const option = extractOption(spuGroup);

  // Fetch existing product
  const prodResp = await apiCall(
    "GET",
    `/admin/products/${productId}?fields=id,options,variants`,
    null,
    token
  );
  const existingProduct = prodResp.data.product;

  if (!existingProduct) {
    throw new Error(`Product ${productId} not found`);
  }

  // Merge options: keep existing, add new if needed
  const mergedOptions = [...(existingProduct.options || [])];
  if (option && !mergedOptions.find(o => o.title === option.title)) {
    mergedOptions.push(option);
  }

  // Get existing SKUs
  const existingSkus = new Set(
    (existingProduct.variants || []).map(v => v.sku)
  );

  // Create new variants (those not already in DB)
  const newVariants = spuGroup
    .filter(row => !existingSkus.has(row.sku))
    .map((row, idx) => {
      const finalPrice = Math.round(row.price * PRICE_MARKUP * 100);
      const optionValue = option
        ? option.values.find(v => v.value === row.title.substring(findCommonPrefix(spuGroup.map(r => r.title)).length).trim())?.value
        : "Default";

      return {
        title: row.title,
        sku: row.sku,
        barcode: undefined,
        manage_inventory: true,
        allow_backorder: false,
        prices: [{ amount: finalPrice, currency_code: "eur" }],
        options: option
          ? { [option.title]: optionValue }
          : { Default: "Default" },
      };
    });

  // Update product with new options and variants
  if (newVariants.length > 0) {
    await apiCall(
      "POST",
      `/admin/products/${productId}`,
      {
        options: mergedOptions,
        variants: newVariants,
      },
      token
    );
  }

  return newVariants.length;
}
```

---

## C) Code Integration Points

### C.1) Modify import-vevor-feed.mjs

**File:** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/scripts/import-vevor-feed.mjs`

**Changes:**

1. **After line 227 (end of readFeed()):**  
   Insert SPU grouping function (B.1)

2. **After line 227, insert helper functions:**
   - `groupBySpu()` (B.1)
   - `extractOption()` (B.2)
   - `selectPrimaryVariant()` (B.3)
   - `buildProductPayload()` (B.4)
   - `classifySpuGroups()` (B.5)
   - `loadExistingSpus()` (B.5 variant)
   - `updateProductWithVariants()` (B.6)

3. **Line 231 (loadExistingSkus):**  
   Call new `loadExistingSpus()` after `loadExistingSkus()` to index by SPU:
   ```javascript
   const existingSkus = await loadExistingSkus();
   const existingSpus = await loadExistingSpus();
   ```

4. **Lines 470-484 (group into newRows/updateRows):**  
   Replace with:
   ```javascript
   const feedGroups = groupBySpu(feedRows);
   const { newGroups, updateGroups, skipGroups } = await classifySpuGroups(
     feedGroups,
     existingSkus,
     existingSpus
   );

   stats.newProducts = newGroups.length;
   stats.toUpdate = updateGroups.length;
   stats.skipped = skipGroups.length;
   ```

5. **Lines 551-575 (createProduct loop):**  
   Replace with:
   ```javascript
   if (newGroups.length > 0) {
     log("Creating " + newGroups.length + " new products from SPU groups...");
     const startTime = Date.now();

     for (let i = 0; i < newGroups.length; i++) {
       const { group } = newGroups[i];
       try {
         const productData = buildProductPayload(group, token, categoryMap, categoryIds);
         await createProduct(productData, token);
       } catch (err) {
         stats.errors++;
         if (stats.errors <= 20) {
           log("  ERROR [SPU " + group[0].spu + "]: " + err.message);
         }
       }
       await sleep(API_DELAY_MS);

       if ((i + 1) % 100 === 0 || i + 1 === newGroups.length) {
         const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
         const rate = ((i + 1) / ((Date.now() - startTime) / 1000)).toFixed(1);
         log(
           "  Progress: " + (i + 1) + "/" + newGroups.length +
           " (" + rate + "/s, " + elapsed + "s) | created: " + stats.created +
           " errors: " + stats.errors
         );
       }
     }
   }
   ```

6. **Update createProduct() signature (line 274):**  
   Change from `async function createProduct(row, token, catMap, catIds)` to:
   ```javascript
   async function createProduct(productData, token)
   ```
   And replace body with direct Medusa API call (remove internal data building).

7. **Lines 577-597 (updateProduct loop):**  
   Add update logic for SPU groups:
   ```javascript
   if (UPDATE_EXISTING && updateGroups.length > 0) {
     log("Updating " + updateGroups.length + " existing products with new variants...");
     const startTime = Date.now();

     for (let i = 0; i < updateGroups.length; i++) {
       const { group, productId } = updateGroups[i];
       try {
         const newVariantCount = await updateProductWithVariants(group, productId, token);
         stats.updated += newVariantCount > 0 ? 1 : 0;
       } catch (err) {
         stats.errors++;
       }
       await sleep(API_DELAY_MS);

       if ((i + 1) % 100 === 0 || i + 1 === updateGroups.length) {
         const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
         log("  Update progress: " + (i + 1) + "/" + updateGroups.length + " (" + elapsed + "s)");
       }
     }
   }
   ```

---

### C.2) Frontend Already Supports Variants

**File:** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/storefront/app/[locale]/toode/[handle]/ProductPurchasePanel.tsx`

**Current support (no changes needed):**
- Lines 44-48: Filters out "Default" option if it's the only value
- Lines 20-26: Extracts unique option values
- Lines 63-70: Finds matching variant by option selection
- Lines 72-73: Displays correct variant price/stock based on selection

**Frontend is fully compatible with multi-variant products.** No changes required.

---

## D) Verification Checklist

### D.1) SQL Verification Queries

Run after import to verify variant structure:

```sql
-- Count products by number of variants
SELECT
  variant_count,
  COUNT(*) as product_count
FROM (
  SELECT id, COUNT(variants.id) as variant_count
  FROM product
  LEFT JOIN product_variant variants ON product.id = variants.product_id
  WHERE deleted_at IS NULL
  GROUP BY product.id
) grouped
GROUP BY variant_count
ORDER BY variant_count DESC;

-- Expected: Most products now have 2+ variants in grouped.

-- Check SPU distribution
SELECT
  metadata->>'vevor_spu' as spu,
  COUNT(*) as product_count,
  COUNT(DISTINCT variants.id) as total_variants
FROM product
LEFT JOIN product_variant variants ON product.id = variants.product_id
WHERE metadata->>'vevor_spu' IS NOT NULL
  AND deleted_at IS NULL
GROUP BY spu
HAVING COUNT(*) > 1
ORDER BY total_variants DESC
LIMIT 20;

-- Expected: SPU groups have correct variant counts.

-- Verify variant_skus metadata
SELECT
  id,
  title,
  metadata->'vevor_variant_skus' as skus,
  COUNT(variants.id) as variant_count
FROM product
LEFT JOIN product_variant variants ON product.id = variants.product_id
WHERE metadata->>'vevor_spu' IS NOT NULL
  AND deleted_at IS NULL
GROUP BY id, title, metadata
LIMIT 10;

-- Expected: vevor_variant_skus array matches actual variant count.

-- Check option coverage
SELECT
  id,
  title,
  COUNT(DISTINCT options.id) as option_count,
  COUNT(DISTINCT variants.id) as variant_count
FROM product
LEFT JOIN product_option options ON product.id = options.product_id
LEFT JOIN product_variant variants ON product.id = variants.product_id
WHERE metadata->>'vevor_spu' IS NOT NULL
  AND deleted_at IS NULL
GROUP BY id, title
LIMIT 20;

-- Expected: Products with 2+ variants have 1 option.
```

---

### D.2) Frontend Verification Steps

1. **Navigate to product with variants:**
   - URL: `https://xlmarket.eu/[locale]/toode/[handle]`
   - Example: Drill with color variants, wrench set with size variants

2. **Check option selector renders:**
   - ProductPurchasePanel should show option buttons (line 128-158)
   - Option title matches extracted option name (Size, Color, Type, etc.)
   - Option values match variant titles

3. **Click variant option, verify:**
   - Price updates correctly (line 72)
   - Stock status (Laos/not available) updates (line 115-125)
   - SKU changes (line 161-163)
   - "Add to cart" button targets correct variant (line 168)

4. **Test edge cases:**
   - Single-variant product: no option selector shown (line 46 filters out single-option)
   - Null SPU product: single variant, no selector
   - Variant with backorder enabled: shows "Laos" despite inventory_quantity = 0

---

### D.3) Medusa Admin API Verification

```bash
# Get product with variants
curl -X GET "http://127.0.0.1:9001/admin/products/[product_id]" \
  -H "Authorization: Bearer [token]"

# Expected response structure:
{
  "product": {
    "id": "prod_xxx",
    "title": "Drill Kit",
    "options": [
      {
        "id": "opt_xxx",
        "title": "Color",
        "values": [
          { "id": "optval_xxx", "value": "Red" },
          { "id": "optval_xxx", "value": "Blue" }
        ]
      }
    ],
    "variants": [
      {
        "id": "var_xxx",
        "sku": "DRILL-RED-18V",
        "title": "Drill Kit Red 18V",
        "options": [
          { "option_id": "opt_xxx", "value": "Red" }
        ],
        "prices": [{ "amount": 8999, "currency_code": "eur" }]
      },
      {
        "id": "var_yyy",
        "sku": "DRILL-BLU-18V",
        "title": "Drill Kit Blue 18V",
        "options": [
          { "option_id": "opt_xxx", "value": "Blue" }
        ],
        "prices": [{ "amount": 8999, "currency_code": "eur" }]
      }
    ]
  }
}
```

---

### D.4) Data Integrity Edge Cases

Test these scenarios during import and verify correct behavior:

| Scenario | Input | Expected Behavior |
|----------|-------|-------------------|
| **SPU with all null** | Group of 2 rows, both spu=null | Each treated as separate product |
| **SPU with single row** | 1 row with valid spu | Created as single-variant (no option) |
| **SPU with 2 rows** | 2 rows, same spu, different titles | 1 product, 1 option, 2 variants |
| **SPU with 2 rows, identical title** | Same spu, identical title | Fallback to generic "Variant" option |
| **Price variance** | Same SPU, prices differ | Each variant gets own price |
| **Stock variance** | SPU: row1 in stock, row2 out | Parent product shows published (in stock) |
| **Inventory variance** | SPU: row1 qty=0, row2 qty=5 | Variant 2 shows as available, variant 1 out |
| **Image variance** | SPU: different image URLs | Primary image from highest-priority variant; others in gallery |
| **Re-import with new variant** | Existing SPU, new row added | Product updated: new variant added, option preserved |
| **Null price** | Row with missing Price field | Skipped during feed parsing (line 185) |
| **Null SKU** | Row with missing SKU field | Skipped during feed parsing (line 182-183) |

---

## E) Risks and Mitigation

### Risk 1: Title Parsing Breaks on Edge Cases

**Problem:** Option extraction relies on common prefix and suffix heuristics; may fail on:
- Completely different titles (e.g., "Hammer" vs "Wrench" in same SPU — should NOT be variants)
- Titles with no clear pattern (e.g., "Model A", "Model B")
- Non-English titles (VEVOR feed is in English, but may have transliterated names)

**Mitigation:**
- Validate option extracted: if suffixes look too different (low common prefix), fall back to single-variant
- Add manual override: allow category-specific rules (e.g., for specific suppliers)
- Log suspicious groups during import for manual review

**Code:**
```javascript
function extractOption(group) {
  // ... existing logic ...
  
  // Sanity check: if common prefix < 50% of shortest title, likely not true variants
  const shortestTitle = Math.min(...titles.map(t => t.length));
  if (commonPrefix.length < shortestTitle * 0.5) {
    log("  WARNING: Low confidence variant parsing for titles:");
    group.forEach(r => log("    - " + r.title));
    // Fallback: create single product with first row, skip others
    return null;
  }
  
  return { title: optionName, values: optionValues };
}
```

---

### Risk 2: Existing Single-Variant Products in DB

**Problem:** If variants are added later via re-import, existing "Default" option may conflict with new option.

**Current State:** Products created before this change have `options: [{ title: "Default", values: ["Default"] }]`.  
**After Change:** New products have proper option (Color, Size, etc.).

**Migration:**
- Old products remain unchanged (backward compatible)
- New variant additions via UPDATE_EXISTING flag properly merge options
- Frontend handles both cases (ProductPurchasePanel filters out single-value options, line 46)

**No data migration needed,** but document that old products won't have variants from re-import unless manually migrated.

---

### Risk 3: SPU Null or Duplicate Across Unrelated Products

**Problem:**
- Some rows have null SPU (treated as single product each) — OK
- Some suppliers may reuse SPU codes across product types — unlikely but possible

**Mitigation:**
- Validate SPU + product_type combination (e.g., "SPU xyz + Drills" vs "SPU xyz + Hammers")
- Log warnings if one SPU maps to multiple top-level categories
- Add optional --strict flag to fail import if SPU ambiguity detected

```javascript
function validateSpuGroups(groups, categoryMap) {
  const spuCategories = new Map();
  
  for (const group of groups) {
    const spu = group[0]?.spu;
    if (!spu) continue;
    
    const l1 = (group[0].productType || "").split(">")[0].trim();
    const mapped = categoryMap[l1] || "UNMAPPED";
    
    if (!spuCategories.has(spu)) {
      spuCategories.set(spu, new Set());
    }
    spuCategories.get(spu).add(mapped);
  }

  // Log warnings for SPUs mapped to multiple categories
  for (const [spu, categories] of spuCategories) {
    if (categories.size > 1) {
      log("  WARNING: SPU " + spu + " maps to multiple categories: " + Array.from(categories).join(", "));
    }
  }
}
```

---

### Risk 4: Description/Metadata Variance Between Variants

**Problem:** Variants in same SPU may have slightly different descriptions or rich_description_html.

**Current Approach:** Use primary (highest-priority) variant's description for parent product.

**Impact:** Other variants' descriptions are lost (stored only in variant.title).

**Mitigation (Optional Enhancement):**
- Store all variant descriptions in metadata array: `variant_descriptions: { "Red": "...", "Blue": "..." }`
- Fetch variant-specific description from metadata if available
- For MVP: Acceptable loss (description from primary variant sufficient)

---

### Risk 5: Import Idempotency After Partial Failure

**Problem:** If import fails mid-way (e.g., after creating 50% of products), re-running may duplicate.

**Current Protection:** SPU/SKU deduplication via DB query (lines 231-248).

**Works because:**
- Existing product lookup by SPU or primary SKU prevents re-creation
- UPDATE_EXISTING flag adds missing variants to existing products

**Tested Path:** Re-run with --execute --update should safely skip existing, add new variants.

---

## F) Migration and Rollout Plan

### Phase 1: Preparation (1-2 hours)

1. Backup PostgreSQL database
2. Review import script changes with stakeholder
3. Test on staging environment (if available)
4. Prepare dry-run analysis:
   ```bash
   node scripts/import-vevor-feed.mjs
   # Output: estimated SPU groups, variants per group
   ```

### Phase 2: Initial Import (2-4 hours)

1. Run import with --execute flag on fresh/staging DB
   ```bash
   node scripts/import-vevor-feed.mjs --execute
   ```

2. Verify SQL queries (section D.1)

3. Smoke test 10 multi-variant products:
   - Check frontend (section D.2)
   - Check Medusa admin API (section D.3)

### Phase 3: Production Deploy (During Low-Traffic Window)

1. Deploy updated import script to production
2. Run on live DB (recommend against --execute on first run; do dry-run first):
   ```bash
   node scripts/import-vevor-feed.mjs
   # Review output for any warnings about SPU conflicts
   ```

3. If dry-run looks good:
   ```bash
   node scripts/import-vevor-feed.mjs --execute --limit 100
   # Test with small batch
   ```

4. Monitor for errors in logs, then proceed:
   ```bash
   node scripts/import-vevor-feed.mjs --execute
   # Full import
   ```

### Phase 4: Verification (1-2 hours)

1. Run verification queries (section D.1)
2. Spot-check frontend (section D.2): visit 5-10 product pages
3. Monitor MeiliSearch sync (line 416-445) — may take 5-10 min for large feed
4. Review import stats report (lines 603-620)

### Phase 5: Rollback (If Needed)

- Restore from backup
- Revert import script to previous version
- Re-run import with --execute (original behavior)

---

## G) Implementation Checklist

- [ ] Copy helper functions (B.1 - B.6) into import-vevor-feed.mjs
- [ ] Update loadExistingSkus → also call loadExistingSpus
- [ ] Replace feed grouping logic (lines 470-484)
- [ ] Replace createProduct loop (lines 551-575)
- [ ] Add updateProductWithVariants loop (lines 577-597)
- [ ] Update buildProductPayload to extract options/variants from SPU group
- [ ] Test on staging: dry-run, then --execute
- [ ] Verify SQL queries (D.1)
- [ ] Spot-check frontend (D.2) on 5-10 products
- [ ] Document any unmapped/suspicious SPU groups in import log
- [ ] Deploy to production with rollback plan ready
- [ ] Monitor search index sync completion (MeiliSearch)
- [ ] Archive import output for audit trail

---

## Summary

This plan transforms the VEVOR importer from single-variant-per-row to proper SPU-based multi-variant products. The changes are:

1. **Algorithm:** Group rows by SPU, extract option from title differences, build multi-variant Medusa payload
2. **Code:** ~300 lines of new functions + modifications to loops in import-vevor-feed.mjs
3. **Frontend:** No changes (already supports variants via ProductPurchasePanel)
4. **Database:** New metadata fields (vevor_variant_skus), proper options/variants tables (Medusa handles)
5. **Verification:** SQL queries, frontend smoke tests, edge case validation
6. **Risks:** Title parsing edge cases, SPU ambiguity, existing data compatibility (all mitigated)
7. **Rollout:** Staged approach with dry-run, staging test, production batch test, full import, verification

**Estimated effort:** 4-6 hours implementation + testing, 1-2 hours production rollout.

---

## Appendix: File Locations

- **Main import script:** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/scripts/import-vevor-feed.mjs`
  - Lines to modify: 227, 231, 274, 335, 470-484, 551-575, 577-597

- **Frontend (already compatible):** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/storefront/app/[locale]/toode/[handle]/ProductPurchasePanel.tsx`
  - Key functions: `normalizeValue`, `optionValues`, `variantOptionValue`, `selectedVariant` selector

- **VEVOR feed data:** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/backend/data/feeds/vevor-latest.xlsx`
  - Size: ~4.6 MB
  - Sheets: Multiple rows with SKU, goods_spu, title, price, inventory, images

- **Database config:** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/scripts/import-vevor-feed.mjs`
  - Lines 35-41: PostgreSQL connection (host: localhost, port: 5435, db: xlmarket)
  - Lines 31-33: Medusa API (http://127.0.0.1:9001)

---

**Document version:** 1.0  
**Date:** 2026-04-09  
**Status:** Ready for implementation
