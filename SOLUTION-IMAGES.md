# Solution: Remove Duplicate Images from Product Rich Text Descriptions

**Document Version:** 1.0  
**Created:** 2026-04-09  
**Status:** Ready for Implementation  
**Scope:** XL Market (xlmarket.eu) — Medusa.js 2.0 + Next.js 15  

---

## Executive Summary

XL Market products have images appearing twice on product detail pages:
- Once in the **gallery carousel** (from Medusa product images + metadata gallery_images)
- Once in the **rich text description** (HTML img tags in metadata rich_description from VEVOR feed)

This document provides a complete implementation plan to remove duplicate images from rich text descriptions while preserving unique product images that add value to the product story.

---

## A. Analysis: Image Source Architecture

### Current Flow

```
VEVOR Feed (XLSX)
  ├─ goods_original_picture (comma-separated URLs)
  ├─ image_link1 (comma-separated URLs)
  ├─ goods_main_original_picture (single URL)
  └─ description_html (HTML with <img> tags)
        │
        └─> Import Script (import-vevor-feed.mjs)
              ├─ Creates product.images[] from main + originalImages (line 313-315)
              ├─ Stores gallery_images in metadata (line 308)
              └─ Stores rich_description in metadata (line 304)
                    │
                    └─> Product Detail Page (toode/[handle]/page.tsx)
                          ├─ ProductGallery (images array, line 328)
                          │   └─ Shows gallery carousel
                          └─ CollapsibleDescription (sanitizeHtml(rich_description), line 477)
                              └─ Renders HTML with img tags (line 31)
```

### Image Sources in Product Detail Page

**File:** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/storefront/app/[locale]/toode/[handle]/page.tsx`

Gallery images are deduplicated at **lines 217-228**:
```typescript
const images = Array.from(
  new Map(
    [
      ...media.images,                    // From product-media utility
      ...metaGalleryImages,               // From metadata.gallery_images
      ...(product.images || []).map(...), // From product.images array
      ...(product.thumbnail ? [...] : []),
    ]
      .filter((image) => Boolean(image?.url))
      .map((image, index) => [image.url, { id: image.id || `img_${index}`, url: image.url }])
  ).values()
)
```

This **deduplicates within gallery only** (uses Map keyed by URL). It does NOT check rich_description.

Rich description is rendered at **lines 472-478**:
```typescript
{richDescription && (
  <section className="mt-12 pt-10 border-t border-soft-border">
    <h2>Toote kirjeldus</h2>
    <CollapsibleDescription html={sanitizeHtml(richDescription)} collapsedHeight={600} />
  </section>
)}
```

### URL Patterns in VEVOR Feed

VEVOR CDN URLs follow patterns:
- Base: `https://image.vevor.com/us%2F{SKU}%2Fgoods_img-v{N}%2F{filename}`
- URL-encoded slashes (%2F) in path
- Version numbers: goods_img-v7, goods_img-v9, goods_img-v10
- Possible query params: sizing, format conversion

Example comparison:
```
Gallery URL 1:    https://image.vevor.com/us/SKU123/goods_img-v10/product-detail.jpg
Gallery URL 2:    https://image.vevor.com/us%2FSKU123%2Fgoods_img-v10%2Fproduct-detail.jpg
Rich HTML:        https://image.vevor.com/us%2FSKU123%2Fgoods_img-v10%2Fproduct-detail.jpg?w=800
```

These are the same image (encoding and sizing params don't change content).

### Known Duplicate Patterns

1. **Exact URL match** — Same URL in both gallery and rich HTML
2. **URL encoding mismatch** — Slashes: `/` vs `%2F`
3. **Query parameter variation** — `?w=400` vs `?w=800` (sizing for CDN)
4. **Protocol mismatch** — `http://` vs `https://`

### Unique Rich Text Images

NOT all images in rich_description are duplicates. Some are:
- Product lifestyle shots (showing product in use)
- Comparison diagrams
- Warranty/certification badges
- Custom charts or infographics

These should be **preserved**.

---

## B. Recommended Approach: Import-Time Filtering

### Decision Matrix

| Approach | Pros | Cons | Recommendation |
|----------|------|------|---|
| **Import-time** (clean at source) | • Data stays clean in DB<br>• No repeated client-side processing<br>• Single point of logic<br>• Improves API payload | • Harder to test against live feed<br>• Requires feed re-import to fix bugs | ✅ **RECOMMENDED** |
| **Render-time** (strip in frontend) | • Easy to test in browser<br>• Reversible (no DB changes)<br>• Can A/B test | • Performance cost per page load<br>• Duplicate data in DB wastes storage<br>• Gallery dedup happens twice | Not recommended |

**Rationale:** Clean data at import means smaller database footprint, faster API responses, and proper separation of concerns (data preparation vs. rendering).

---

## C. Detailed Implementation

### Strategy Overview

1. **Normalize gallery image URLs** to canonical form (decode, strip query params)
2. **Extract all img src URLs** from rich_description HTML
3. **Normalize rich HTML image URLs** to match gallery normalization
4. **Filter**: Remove rich HTML images that match normalized gallery URLs
5. **Store cleaned rich_description** in metadata

### Step 1: Create Utility Function for URL Normalization

**File:** Create new file `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/scripts/lib/url-utils.mjs`

```javascript
/**
 * Normalize image URL to canonical form for comparison
 * - Decode percent-encoded characters
 * - Remove query parameters (except critical ones like auth)
 * - Normalize protocol (always https://)
 * - Trim whitespace
 *
 * @param {string} url - Raw image URL
 * @returns {string} Normalized URL for comparison
 */
export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  
  try {
    // Trim and decode
    let normalized = decodeURIComponent(url.trim())
    
    // Normalize protocol to https
    normalized = normalized.replace(/^https?:\/\//i, 'https://')
    
    // Remove query parameters (they're usually just CDN sizing directives)
    // Exception: preserve auth tokens if present (very rare in public CDNs)
    const queryIndex = normalized.indexOf('?')
    if (queryIndex > -1) {
      const queryPart = normalized.substring(queryIndex)
      // Only remove if it looks like sizing/format params, not auth
      if (!/[Aa]uth|[Tt]oken|[Kk]ey|[Ss]ign/.test(queryPart)) {
        normalized = normalized.substring(0, queryIndex)
      }
    }
    
    return normalized
  } catch (err) {
    // If decoding fails, return as-is
    return url.trim()
  }
}

/**
 * Extract all image URLs from HTML img tags
 *
 * @param {string} html - HTML content
 * @returns {string[]} Array of src URLs (not normalized)
 */
export function extractImageUrls(html) {
  if (!html || typeof html !== 'string') return []
  
  const urls = []
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi
  let match
  
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1].trim()
    if (src.length > 0) {
      urls.push(src)
    }
  }
  
  return urls
}

/**
 * Remove img tags from HTML that match any URL in the exclusion set
 *
 * @param {string} html - HTML content
 * @param {Set<string>} excludeUrls - Set of normalized URLs to exclude
 * @returns {string} HTML with matching img tags removed
 */
export function removeImagesFromHtml(html, excludeUrls) {
  if (!html || typeof html !== 'string') return html
  if (excludeUrls.size === 0) return html
  
  // Replace img tags whose src matches excluded URLs (normalized)
  return html.replace(/<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi, (match, src) => {
    const normalized = normalizeImageUrl(src)
    if (excludeUrls.has(normalized)) {
      // Remove the img tag entirely
      return ''
    }
    // Keep the tag if it's not in exclusion set
    return match
  })
}
```

### Step 2: Create Rich Description Cleaner Function

**File:** Create new file `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/scripts/lib/rich-description-cleaner.mjs`

```javascript
import {
  normalizeImageUrl,
  extractImageUrls,
  removeImagesFromHtml,
} from './url-utils.mjs'

/**
 * Clean rich description HTML by removing images that appear in gallery
 *
 * @param {string} richHtml - Rich description HTML from VEVOR
 * @param {string[]} galleryImages - Array of gallery image URLs
 * @returns {object} Result with cleaned HTML and stats
 */
export function cleanRichDescription(richHtml, galleryImages = []) {
  if (!richHtml || typeof richHtml !== 'string') {
    return { cleaned: null, removed: 0, kept: 0 }
  }

  // Normalize all gallery URLs
  const normalizedGalleryUrls = new Set(
    galleryImages
      .filter(Boolean)
      .map(url => normalizeImageUrl(url))
      .filter(url => url.length > 0)
  )

  if (normalizedGalleryUrls.size === 0) {
    // No gallery images to compare against, return as-is
    return { cleaned: richHtml, removed: 0, kept: countImages(richHtml) }
  }

  // Extract all images currently in rich HTML
  const richImageUrls = extractImageUrls(richHtml)
  const richImageCount = richImageUrls.length

  // Normalize rich HTML image URLs and count removals
  let removedCount = 0
  for (const url of richImageUrls) {
    const normalized = normalizeImageUrl(url)
    if (normalizedGalleryUrls.has(normalized)) {
      removedCount++
    }
  }

  // Remove matching images from HTML
  const cleaned = removeImagesFromHtml(richHtml, normalizedGalleryUrls)

  return {
    cleaned,
    removed: removedCount,
    kept: richImageCount - removedCount,
    totalGalleryImages: normalizedGalleryUrls.size,
  }
}

/**
 * Count total img tags in HTML
 *
 * @param {string} html - HTML content
 * @returns {number} Number of img tags
 */
function countImages(html) {
  if (!html) return 0
  const matches = html.match(/<img[^>]*>/gi)
  return matches ? matches.length : 0
}

/**
 * Get summary of what would be cleaned (for logging/debugging)
 *
 * @param {string} richHtml - Rich description HTML
 * @param {string[]} galleryImages - Gallery image URLs
 * @returns {object} Summary with examples
 */
export function summarizeCleanup(richHtml, galleryImages = []) {
  const result = cleanRichDescription(richHtml, galleryImages)

  return {
    willRemove: result.removed,
    willKeep: result.kept,
    galleryImagesCount: result.totalGalleryImages,
    summary: `Will remove ${result.removed} duplicate images, keep ${result.kept} unique images`,
  }
}
```

### Step 3: Integrate into Import Script

**File:** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/scripts/import-vevor-feed.mjs`

**Modifications:**

At the top of the file (after imports, around **line 22**), add:
```javascript
import { cleanRichDescription } from "./lib/rich-description-cleaner.mjs"
```

In the `createProduct()` function, modify metadata creation (around **lines 304**):

**BEFORE:**
```javascript
metadata: {
  vevor_sku: row.sku,
  // ... other fields ...
  rich_description: row.richDescriptionHtml ? row.richDescriptionHtml.substring(0, 15000) : null,
  gallery_images: row.originalImages.length > 0 ? row.originalImages : row.galleryImages,
  // ...
}
```

**AFTER:**
```javascript
const galleryImgs = row.originalImages.length > 0 ? row.originalImages : row.galleryImages
const cleanResult = cleanRichDescription(row.richDescriptionHtml, galleryImgs)

metadata: {
  vevor_sku: row.sku,
  // ... other fields ...
  rich_description: cleanResult.cleaned ? cleanResult.cleaned.substring(0, 15000) : null,
  gallery_images: galleryImgs,
  _image_dedup_stats: { // Internal tracking only
    gallery_images_count: galleryImgs.length,
    rich_images_before: row.richDescriptionHtml ? (row.richDescriptionHtml.match(/<img[^>]*>/gi) || []).length : 0,
    rich_images_removed: cleanResult.removed,
    rich_images_kept: cleanResult.kept,
  },
  // ...
}
```

Similarly update `updateProduct()` function (around **lines 373**):

**BEFORE:**
```javascript
rich_description: row.richDescriptionHtml ? row.richDescriptionHtml.substring(0, 15000) : null,
```

**AFTER:**
```javascript
rich_description: (() => {
  const galleryImgs = row.originalImages.length > 0 ? row.originalImages : row.galleryImages
  const cleanResult = cleanRichDescription(row.richDescriptionHtml, galleryImgs)
  return cleanResult.cleaned ? cleanResult.cleaned.substring(0, 15000) : null
})(),
```

### Step 4: Add Logging for Verification

In the import script's main progress loop (around **line 569-573**), enhance logging:

```javascript
if ((i + 1) % 100 === 0 || i + 1 === toCreate.length) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  const rate = ((i + 1) / ((Date.now() - startTime) / 1000)).toFixed(1)
  
  // Sample recent dedups for logging
  const recent = stats.recentDedups ? stats.recentDedups.slice(-3) : []
  let dedupInfo = ""
  if (recent.length > 0) {
    const avgRemoved = (recent.reduce((s, d) => s + d.removed, 0) / recent.length).toFixed(1)
    dedupInfo = ` | dedup: removed avg ${avgRemoved} imgs/product`
  }
  
  log(
    "  Progress: " + (i + 1) + "/" + toCreate.length +
    " (" + rate + "/s, " + elapsed + "s) | created: " + stats.created +
    " errors: " + stats.errors + dedupInfo
  )
}
```

And add tracking to stats (line 62-72):

```javascript
const stats = {
  feedRows: 0,
  existingInDb: 0,
  newProducts: 0,
  toUpdate: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  unmappedCategories: new Set(),
  totalImagesDuplicated: 0,  // Add this
  totalImagesRemoved: 0,     // Add this
  recentDedups: [],          // Track last 10 for progress logging
}
```

In createProduct catch block (around line 558-565), track dedup:

```javascript
try {
  const galleryImgs = row.originalImages.length > 0 ? row.originalImages : row.galleryImages
  const cleanResult = cleanRichDescription(row.richDescriptionHtml, galleryImgs)
  
  // Track stats
  stats.totalImagesDuplicated += cleanResult.totalGalleryImages
  stats.totalImagesRemoved += cleanResult.removed
  stats.recentDedups.push(cleanResult)
  if (stats.recentDedups.length > 10) stats.recentDedups.shift()
  
  await createProduct(row, token, categoryMap, categoryIds)
} catch (err) {
  // ...
}
```

At end of main() function (after line 612), add summary:

```javascript
if (stats.totalImagesRemoved > 0) {
  console.log("")
  log("Image deduplication summary:")
  log("  Gallery images scanned:    " + stats.totalImagesDuplicated)
  log("  Duplicates removed:        " + stats.totalImagesRemoved)
  log("  Dedup ratio:               " + ((stats.totalImagesRemoved / stats.totalImagesDuplicated) * 100).toFixed(1) + "%")
}
```

---

## D. Code Examples & Integration Points

### Complete URL Normalization Function

Location: `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/scripts/lib/url-utils.mjs`

```javascript
/**
 * Normalize image URL to canonical form for comparison
 * Handles: percent-encoding, query params, protocol variations
 */
export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  
  try {
    let normalized = decodeURIComponent(url.trim())
    normalized = normalized.replace(/^https?:\/\//i, 'https://')
    
    const queryIndex = normalized.indexOf('?')
    if (queryIndex > -1) {
      const queryPart = normalized.substring(queryIndex)
      if (!/[Aa]uth|[Tt]oken|[Kk]ey|[Ss]ign/.test(queryPart)) {
        normalized = normalized.substring(0, queryIndex)
      }
    }
    
    return normalized
  } catch (err) {
    return url.trim()
  }
}
```

### HTML Image Filtering Function

Location: `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/scripts/lib/url-utils.mjs`

```javascript
export function removeImagesFromHtml(html, excludeUrls) {
  if (!html || typeof html !== 'string') return html
  if (excludeUrls.size === 0) return html
  
  return html.replace(
    /<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi,
    (match, src) => {
      const normalized = normalizeImageUrl(src)
      return excludeUrls.has(normalized) ? '' : match
    }
  )
}
```

### Integration in Product Creation

Location: `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/scripts/import-vevor-feed.mjs` (lines 274-330)

```javascript
async function createProduct(row, token, catMap, catIds) {
  const finalPrice = Math.round(row.price * PRICE_MARKUP * 100)
  const handle = makeHandle(row.sku, row.title)
  const isInStock = row.availability === "in stock"

  // ... category mapping code ...

  // Clean rich description by removing duplicate gallery images
  const galleryImgs = row.originalImages.length > 0 ? row.originalImages : row.galleryImages
  const cleanResult = cleanRichDescription(row.richDescriptionHtml, galleryImgs)

  const productData = {
    title: row.title,
    handle: handle,
    description: row.description || "",
    status: isInStock ? "published" : "draft",
    is_giftcard: false,
    thumbnail: row.image || undefined,
    external_id: "vevor:" + row.sku,
    metadata: {
      vevor_sku: row.sku,
      vevor_upc: row.upc || "",
      vevor_link: row.link || "",
      vevor_product_type: row.productType || "",
      vevor_spu: row.spu || "",
      weight_kg: row.weight || 0,
      selling_points: row.sellingPoints || [],
      rich_description: cleanResult.cleaned ? cleanResult.cleaned.substring(0, 15000) : null,
      dimensions: (row.dimensionHigh || row.dimensionWide || row.dimensionLong)
        ? { high: row.dimensionHigh, wide: row.dimensionWide, long: row.dimensionLong, unit: row.dimensionUnit }
        : null,
      gallery_images: galleryImgs,
      translation_status: "pending",
      original_language: "en",
    },
    // ... rest of product data ...
  }

  // ... rest of function ...
}
```

---

## E. Verification Checklist

### Pre-Implementation Testing

- [ ] Unit test URL normalization with sample VEVOR URLs
  ```bash
  node -e "
  import { normalizeImageUrl } from './scripts/lib/url-utils.mjs'
  const tests = [
    'https://image.vevor.com/us%2FSKU123%2Fgoods_img-v10%2Fproduct.jpg',
    'https://image.vevor.com/us/SKU123/goods_img-v10/product.jpg',
    'https://image.vevor.com/us/SKU123/goods_img-v10/product.jpg?w=800',
    'http://image.vevor.com/us/SKU123/goods_img-v10/product.jpg',
  ]
  tests.forEach(url => console.log('Input:', url, '→', normalizeImageUrl(url)))
  "
  ```

- [ ] Test image extraction with sample HTML containing img tags
  ```bash
  node -e "
  import { extractImageUrls } from './scripts/lib/url-utils.mjs'
  const html = '<p>Text</p><img src=\"url1\" /><p>More</p><img src=\"url2\"/>'
  console.log('Found images:', extractImageUrls(html))
  "
  ```

- [ ] Test removal function with mock gallery and rich HTML
  ```bash
  node -e "
  import { cleanRichDescription } from './scripts/lib/rich-description-cleaner.mjs'
  const result = cleanRichDescription(
    '<img src=\"http://cdn.com/img1\" /><img src=\"http://cdn.com/img2\" />',
    ['https://cdn.com/img1']
  )
  console.log('Result:', result)
  "
  ```

### Production Verification (After Implementation)

**1. Dry Run with Enhanced Logging**

```bash
cd /sessions/stoic-modest-ritchie/mnt/brrr-xlmarket
node scripts/import-vevor-feed.mjs --limit 10
# Review output for dedup stats
```

**2. Check Database Deduplication Stats**

After first 100 products imported:

```sql
-- Query: Check for rich descriptions with image count
SELECT 
  id,
  metadata->>'vevor_sku' as sku,
  (metadata->>'_image_dedup_stats')::jsonb->>'rich_images_kept' as unique_images,
  (metadata->>'_image_dedup_stats')::jsonb->>'rich_images_removed' as duplicate_images
FROM product
WHERE metadata->>'_image_dedup_stats' IS NOT NULL
LIMIT 20;
```

**3. Visual Inspection in Frontend**

For each test product:

```bash
# View in browser: http://localhost:3000/toode/[handle]
```

Check:
- [ ] Gallery carousel shows unique images only (no duplicates)
- [ ] Rich description appears below gallery with "Toote kirjeldus" header
- [ ] Rich description images are NOT in the gallery carousel
- [ ] Rich description images render properly (no broken img tags)
- [ ] No layout shift or missing content after image removal

**4. Browser DevTools Inspection**

In Chrome/Firefox Developer Tools on product page:

```javascript
// Check gallery images
Array.from(document.querySelectorAll('[role="button"] img')).map(img => img.src)

// Check rich description images
Array.from(
  document.querySelectorAll('.rich-desc img')
).map(img => ({src: img.src, visible: img.offsetParent !== null}))

// Count unique URLs across both sections
const allImgUrls = new Set()
document.querySelectorAll('img').forEach(img => allImgUrls.add(img.src))
console.log('Total unique image URLs on page:', allImgUrls.size)
```

**5. Database Query: Verify Dedup Worked**

```sql
-- Count products with dedup stats
SELECT COUNT(*) as total_with_dedup
FROM product
WHERE metadata->>'_image_dedup_stats' IS NOT NULL
  AND (metadata->>'_image_dedup_stats')::jsonb->>'rich_images_removed'::int > 0;

-- Average dedup ratio
SELECT AVG(
  ((metadata->>'_image_dedup_stats')::jsonb->>'rich_images_removed'::int /
   NULLIF(((metadata->>'_image_dedup_stats')::jsonb->>'rich_images_removed'::int +
           (metadata->>'_image_dedup_stats')::jsonb->>'rich_images_kept'::int), 0))
) as avg_dedup_ratio
FROM product
WHERE metadata->>'_image_dedup_stats' IS NOT NULL;
```

**6. Performance Check**

Measure page load time before/after:

```javascript
// In browser console on product page
// Before implementation: check waterfall in DevTools Network tab
// After implementation: 
// - Smaller HTML payload (fewer img tags in rich_description)
// - Same number of gallery image requests (no change)
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('image.vevor.com'))
  .map(r => ({url: r.name, size: r.transferSize}))
```

**7. Content Integrity Check**

For a sample of products:

- [ ] Rich description HTML is still valid (no broken tags)
- [ ] Links within rich description still work
- [ ] Product specs still render properly
- [ ] No critical images were removed (only actual duplicates)

### Rollback Plan

If issues found:

1. **Stop import script** (Ctrl+C if running)
2. **Revert code changes**:
   ```bash
   git checkout scripts/import-vevor-feed.mjs
   rm scripts/lib/url-utils.mjs scripts/lib/rich-description-cleaner.mjs
   ```
3. **Clear affected products** (if needed):
   ```sql
   DELETE FROM product 
   WHERE external_id LIKE 'vevor:%'
     AND created_at > NOW() - INTERVAL '1 hour';
   ```
4. **Re-import** without dedup

---

## F. Edge Cases and Risks

### Edge Case 1: URL Encoding Variations

**Problem:** Gallery URL may be decoded while rich HTML URL is percent-encoded.

**Solution:** `normalizeImageUrl()` decodes both before comparison.

**Test:**
```javascript
const gallery = 'https://image.vevor.com/us%2FSKU123%2Fgoods_img.jpg'
const richHtml = 'https://image.vevor.com/us/SKU123/goods_img.jpg'
normalizeImageUrl(gallery) === normalizeImageUrl(richHtml) // true
```

### Edge Case 2: Query Parameters for Image Sizing

**Problem:** VEVOR CDN may serve same image with different sizing params: `?w=400` vs `?w=800`.

**Solution:** Strip all non-auth query parameters before comparison.

**Limitation:** If a product genuinely has two different resolutions of the same image in rich description (e.g., thumbnail + full-size), both will be deduplicated. This is rare and acceptable trade-off.

### Edge Case 3: Missing or Null Rich Description

**Problem:** Row has no rich HTML to clean.

**Solution:** `cleanRichDescription()` returns early if input is falsy.

```javascript
if (!richHtml || typeof richHtml !== 'string') {
  return { cleaned: null, removed: 0, kept: 0 }
}
```

### Edge Case 4: Rich Description with Only Duplicate Images

**Problem:** Rich HTML contains ONLY images that are in gallery (e.g., copied HTML).

**Solution:** Rich description becomes empty or nearly empty after dedup. Result is correct—no value to show.

**Mitigation:** `_image_dedup_stats` in metadata allows visibility into what happened.

### Edge Case 5: Very Large Rich Description HTML

**Problem:** Rich description HTML is truncated at 15,000 chars (line 304). Dedup happens BEFORE truncation.

**Solution:** Apply dedup first, then truncate result.

**Implementation:** Already correct in the code example above.

### Edge Case 6: VEVOR Image URLs Change Format

**Problem:** If VEVOR changes their CDN URL format (e.g., domain name), old products won't match.

**Solution:** This is acceptable—dedup applies to new imports. Existing products are unaffected. To reprocess old products:

```bash
node scripts/import-vevor-feed.mjs --execute --update
```

This will re-import all products with updated dedup logic.

### Risk: False Positive Deduplication

**Scenario:** A rich description image that LOOKS the same as gallery but is actually different (e.g., different crop or different variant).

**Mitigation:** 
- We only deduplicate by **exact URL match** (after normalization)
- If URLs are different, images are different
- VEVOR feed should provide unique URLs for different content

**Acceptance:** This risk is very low because:
1. URL is source of truth for image identity
2. CDN would serve different URLs for different images
3. VEVOR would not duplicate the same URL for different products/variants

### Risk: Database Storage

**Current:** 15,000 character limit on rich_description ensures metadata doesn't explode.

**After dedup:** Size will decrease (fewer img tags), staying well under limit.

**Benefit:** Smaller database footprint, faster API responses.

### Risk: Migration of Existing Data

**Current situation:** Existing products may have duplicates already imported.

**Options:**
1. **Leave as-is** (dedup only applies to new imports)
2. **Re-import existing** with `--update` flag
3. **Write migration script** to clean existing products

**Recommendation:** Option 1 (leave existing) for now. Re-import only if dedup issues are critical.

---

## G. Implementation Checklist

### Code Preparation
- [ ] Create `/scripts/lib/url-utils.mjs`
- [ ] Create `/scripts/lib/rich-description-cleaner.mjs`
- [ ] Add `import` statement to `import-vevor-feed.mjs` (line ~22)
- [ ] Modify `createProduct()` function (lines ~274-330)
- [ ] Modify `updateProduct()` function (lines ~355-412)
- [ ] Add dedup stats tracking to global `stats` object
- [ ] Add summary logging at end of `main()`

### Testing
- [ ] Unit test URL normalization
- [ ] Unit test image extraction
- [ ] Unit test removal function
- [ ] Dry-run with --limit 10
- [ ] Review dry-run output for dedup stats
- [ ] Test with --execute --limit 50
- [ ] Query database to verify metadata storage

### Verification
- [ ] Check 5 sample product pages visually
- [ ] Browser DevTools image count check
- [ ] Database query verification
- [ ] Performance measurement (optional)
- [ ] Content integrity spot-check

### Documentation
- [ ] Update SOLUTION-IMAGES.md with results
- [ ] Add comments to import script
- [ ] Document dedup behavior in API docs (if applicable)

### Deployment
- [ ] Commit changes to git
- [ ] Run full import: `--execute --refresh`
- [ ] Monitor logs for errors
- [ ] Spot-check products after import completes

---

## H. Future Enhancements

1. **Config option** to disable dedup if needed:
   ```javascript
   const SKIP_IMAGE_DEDUP = process.env.SKIP_IMAGE_DEDUP === 'true'
   ```

2. **Whitelist for images** that should never be deduplicated (for special products)

3. **Analytics dashboard** showing dedup effectiveness:
   - Total duplicates removed
   - Average images per product
   - Dedup ratio trends

4. **Gallery image size upgrade** (separate project):
   - Detect when gallery has thumbnail and rich HTML has full-size
   - Upgrade gallery to full-size version
   - Currently out of scope for this solution

---

## References

- **Import script:** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/scripts/import-vevor-feed.mjs`
- **Product page:** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/storefront/app/[locale]/toode/[handle]/page.tsx`
- **Gallery component:** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/storefront/components/ProductGallery.tsx`
- **Sanitization:** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/storefront/lib/sanitize.ts`
- **Description component:** `/sessions/stoic-modest-ritchie/mnt/brrr-xlmarket/storefront/components/CollapsibleDescription.tsx`

---

**End of Document**
