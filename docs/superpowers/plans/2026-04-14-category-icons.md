# Category Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate iconic product images (80x80 + 400x400 WebP) for all ~2400 categories using MeiliSearch + VEVOR CDN, with nano-banana fallback for L1 categories without good matches.

**Architecture:** A multi-agent pipeline: (1) export all categories with hierarchy from Medusa API, (2) 5 parallel search agents query MeiliSearch per category and pick the best iconic product image URL, (3) a review agent validates image quality, (4) processing agents download and resize to 80x80 + 400x400 WebP, (5) nano-banana generates fallback images for L1 categories that fail review.

**Tech Stack:** Node.js (ESM), MeiliSearch API, sharp (in storefront/node_modules), VEVOR CDN, nano-banana skill

**Spec:** `docs/superpowers/specs/2026-04-14-category-icons-design.md`

---

## File Structure

```
backend/scripts/
  export-categories.mjs          — Task 1: Export all categories with hierarchy
  search-category-icons.mjs      — Task 2: MeiliSearch search + scoring (run by each search agent)
  review-category-icons.mjs      — Task 3: Review quality of selected images
  process-category-icons.mjs     — Task 4: Download + resize to 80x80 and 400x400 WebP

storefront/public/cat-icons/
  80/{handle}.webp               — 80x80 thumbnails
  400/{handle}.webp              — 400x400 medium images
  manifest.json                  — {handle: {sm: "/cat-icons/80/...", md: "/cat-icons/400/..."}}

data/category-icons/
  categories-by-level.json       — Task 1 output: all categories grouped by level
  search-results-part-{1-5}.json — Task 2 output: each search agent's results
  search-results-merged.json     — Task 2 output: merged results
  review-results.json            — Task 3 output: review pass/fail per image
  retry-queue.json               — Task 3 output: categories that need re-search
```

## Constants (used across all scripts)

```javascript
const MEILI_HOST = "http://127.0.0.1:7700"
const MEILI_KEY = "xlmarket2024_secure_key"
const MEDUSA_URL = "http://127.0.0.1:9001"
const API_KEY = "pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3"
```

---

## Task 1: Export categories with hierarchy

**Files:**
- Create: `backend/scripts/export-categories.mjs`
- Create: `data/category-icons/categories-by-level.json`

- [ ] **Step 1: Create the export script**

```javascript
#!/usr/bin/env node
/**
 * Export all categories from Medusa API, compute hierarchy levels,
 * and save grouped by level for the icon pipeline.
 *
 * Output: data/category-icons/categories-by-level.json
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MEDUSA_URL = "http://127.0.0.1:9001"
const API_KEY = "pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3"
const OUTPUT_DIR = path.join(__dirname, "../../data/category-icons")
const OUTPUT = path.join(OUTPUT_DIR, "categories-by-level.json")

async function getAllCategories() {
  const all = []
  let offset = 0
  while (true) {
    const res = await fetch(
      `${MEDUSA_URL}/store/product-categories?limit=500&offset=${offset}&fields=id,name,handle,parent_category_id`,
      { headers: { "x-publishable-api-key": API_KEY } }
    )
    if (!res.ok) throw new Error(`Medusa API error: ${res.status}`)
    const data = await res.json()
    const cats = data.product_categories || []
    all.push(...cats)
    if (cats.length < 500) break
    offset += 500
  }
  return all
}

function computeLevels(categories) {
  const byId = new Map(categories.map((c) => [c.id, c]))

  function getLevel(cat) {
    let level = 1
    let curr = cat
    while (curr.parent_category_id && byId.has(curr.parent_category_id)) {
      level++
      curr = byId.get(curr.parent_category_id)
    }
    return level
  }

  const byLevel = {}
  for (const cat of categories) {
    const level = getLevel(cat)
    if (!byLevel[level]) byLevel[level] = []
    byLevel[level].push({
      id: cat.id,
      name: cat.name,
      handle: cat.handle,
      parent_category_id: cat.parent_category_id,
      level,
    })
  }

  // Sort each level alphabetically by name
  for (const level of Object.keys(byLevel)) {
    byLevel[level].sort((a, b) => a.name.localeCompare(b.name))
  }

  return byLevel
}

async function main() {
  console.log("Exporting categories from Medusa...")
  const categories = await getAllCategories()
  console.log(`Fetched ${categories.length} categories`)

  const byLevel = computeLevels(categories)

  for (const [level, cats] of Object.entries(byLevel).sort(([a], [b]) => +a - +b)) {
    console.log(`  L${level}: ${cats.length} categories`)
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(OUTPUT, JSON.stringify(byLevel, null, 2))
  console.log(`\nSaved to ${OUTPUT}`)

  // Also create flat list for splitting among search agents
  const flat = Object.values(byLevel).flat()
  const PARTS = 5
  const partSize = Math.ceil(flat.length / PARTS)
  for (let i = 0; i < PARTS; i++) {
    const part = flat.slice(i * partSize, (i + 1) * partSize)
    const partFile = path.join(OUTPUT_DIR, `search-queue-part-${i + 1}.json`)
    fs.writeFileSync(partFile, JSON.stringify(part, null, 2))
    console.log(`  Part ${i + 1}: ${part.length} categories -> ${partFile}`)
  }
}

main().catch(console.error)
```

Write this to `backend/scripts/export-categories.mjs`.

- [ ] **Step 2: Create output directory and run**

```bash
mkdir -p data/category-icons
node backend/scripts/export-categories.mjs
```

Expected: prints category counts per level, creates `data/category-icons/categories-by-level.json` and 5 `search-queue-part-{1-5}.json` files.

- [ ] **Step 3: Verify output**

```bash
node -e "const d=require('./data/category-icons/categories-by-level.json'); Object.entries(d).sort(([a],[b])=>+a-+b).forEach(([l,c])=>console.log('L'+l+': '+c.length))"
```

Expected: L1: 31, L2: 250, L3: 942, L4: 777, ...

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/export-categories.mjs data/category-icons/
git commit -m "[XL] Category icons: export categories with hierarchy levels"
```

---

## Task 2: Search agent script (MeiliSearch iconic image picker)

**Files:**
- Create: `backend/scripts/search-category-icons.mjs`

This script is run by each of the 5 search agents. Each agent receives a different `--part N` argument.

- [ ] **Step 1: Create the search script**

```javascript
#!/usr/bin/env node
/**
 * Search for iconic product images for a batch of categories.
 *
 * Each category is searched in MeiliSearch by name, filtered to products
 * in that category. The best candidate is scored by:
 * - MeiliSearch relevance rank
 * - Price position (mid-range preferred)
 * - Thumbnail quality (VEVOR CDN original_img preferred)
 * - Single-product appearance (title heuristics)
 *
 * Usage: node scripts/search-category-icons.mjs --part 1
 * Input:  data/category-icons/search-queue-part-1.json
 * Output: data/category-icons/search-results-part-1.json
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MEILI_HOST = "http://127.0.0.1:7700"
const MEILI_KEY = "xlmarket2024_secure_key"
const DATA_DIR = path.join(__dirname, "../../data/category-icons")

const partArg = process.argv.find((a) => a.startsWith("--part"))
const PART = partArg ? parseInt(process.argv[process.argv.indexOf(partArg) + 1] || partArg.split("=")[1]) : null
if (!PART || PART < 1 || PART > 5) {
  console.error("Usage: node search-category-icons.mjs --part <1-5>")
  process.exit(1)
}

const INPUT = path.join(DATA_DIR, `search-queue-part-${PART}.json`)
const OUTPUT = path.join(DATA_DIR, `search-results-part-${PART}.json`)

async function meiliSearch(query, filter, limit = 20) {
  const res = await fetch(`${MEILI_HOST}/indexes/products/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${MEILI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      q: query,
      limit,
      filter: [filter],
      attributesToRetrieve: ["id", "title", "handle", "thumbnail", "price", "images", "category_handles"],
      attributesToHighlight: [],
    }),
  })
  if (!res.ok) throw new Error(`MeiliSearch error: ${res.status}`)
  const data = await res.json()
  return data.hits || []
}

function scoreCandidate(hit, rankIndex, totalHits, priceStats) {
  let score = 0

  // Must have thumbnail
  if (!hit.thumbnail) return -1

  // 1. Relevance rank (50 pts max, top result gets 50)
  score += Math.max(0, 50 - (rankIndex / Math.max(totalHits, 1)) * 50)

  // 2. Price position — mid-range preferred (25 pts max)
  if (priceStats.range > 0 && hit.price > 0) {
    const percentile = (hit.price - priceStats.min) / priceStats.range
    score += 25 * Math.exp(-Math.pow((percentile - 0.4) / 0.3, 2))
  }

  // 3. VEVOR CDN image quality (15 pts max)
  const thumb = hit.thumbnail
  if (thumb.includes("original_img")) score += 10
  if (thumb.includes("m100-1.2")) score += 5 // main product image, usually best angle

  // 4. Title heuristics — penalize multi-packs, accessories, parts
  const titleLower = hit.title.toLowerCase()
  if (/\d+\s*(pcs|pack|set of|pieces)/.test(titleLower)) score -= 5
  if (/replacement|accessory|part for|compatible/.test(titleLower)) score -= 10
  if (/kit|combo|bundle/.test(titleLower)) score -= 3

  // 5. Gallery richness — more images = better photographed product
  const imageCount = Array.isArray(hit.images) ? hit.images.length : 0
  score += Math.min(imageCount, 5) * 2

  return score
}

async function searchCategory(cat) {
  const hits = await meiliSearch(cat.name, `category_handles = "${cat.handle}"`, 20)

  if (hits.length === 0) {
    return { handle: cat.handle, name: cat.name, level: cat.level, imageUrl: null, score: 0, reason: "no_products" }
  }

  const prices = hits.map((h) => h.price).filter((p) => p > 0)
  const priceStats = {
    min: prices.length > 0 ? Math.min(...prices) : 0,
    max: prices.length > 0 ? Math.max(...prices) : 0,
    range: prices.length > 1 ? Math.max(...prices) - Math.min(...prices) : 0,
  }

  const scored = hits
    .map((hit, idx) => ({
      hit,
      score: scoreCandidate(hit, idx, hits.length, priceStats),
    }))
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    return { handle: cat.handle, name: cat.name, level: cat.level, imageUrl: null, score: 0, reason: "no_thumbnail" }
  }

  const best = scored[0]
  return {
    handle: cat.handle,
    name: cat.name,
    level: cat.level,
    imageUrl: best.hit.thumbnail,
    productTitle: best.hit.title,
    score: Math.round(best.score * 10) / 10,
    reason: "found",
    // Keep runner-up for retry scenarios
    runnerUp: scored.length > 1 ? { imageUrl: scored[1].hit.thumbnail, score: Math.round(scored[1].score * 10) / 10 } : null,
  }
}

async function main() {
  const categories = JSON.parse(fs.readFileSync(INPUT, "utf-8"))
  console.log(`[Part ${PART}] Searching icons for ${categories.length} categories...`)

  const results = []
  const BATCH = 5

  for (let i = 0; i < categories.length; i += BATCH) {
    const batch = categories.slice(i, i + BATCH)
    const batchResults = await Promise.all(batch.map(searchCategory))
    results.push(...batchResults)

    if ((i + BATCH) % 50 === 0 || i + BATCH >= categories.length) {
      const done = Math.min(i + BATCH, categories.length)
      const found = results.filter((r) => r.reason === "found").length
      console.log(`  [Part ${PART}] ${done}/${categories.length} — ${found} found`)
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2))

  const found = results.filter((r) => r.reason === "found").length
  const noProducts = results.filter((r) => r.reason === "no_products").length
  const noThumb = results.filter((r) => r.reason === "no_thumbnail").length
  console.log(`\n[Part ${PART}] Done: ${found} found, ${noProducts} no products, ${noThumb} no thumbnail`)
  console.log(`Saved to ${OUTPUT}`)
}

main().catch(console.error)
```

Write this to `backend/scripts/search-category-icons.mjs`.

- [ ] **Step 2: Test with part 1**

```bash
node backend/scripts/search-category-icons.mjs --part 1
```

Expected: processes ~480 categories, creates `data/category-icons/search-results-part-1.json` with most having `reason: "found"`.

- [ ] **Step 3: Run all 5 parts in parallel**

```bash
for i in 1 2 3 4 5; do
  node backend/scripts/search-category-icons.mjs --part $i &
done
wait
echo "All 5 parts complete"
```

- [ ] **Step 4: Merge results**

```bash
node -e "
const fs = require('fs');
const path = require('path');
const dir = 'data/category-icons';
const merged = [];
for (let i = 1; i <= 5; i++) {
  const part = JSON.parse(fs.readFileSync(path.join(dir, 'search-results-part-' + i + '.json')));
  merged.push(...part);
}
merged.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
fs.writeFileSync(path.join(dir, 'search-results-merged.json'), JSON.stringify(merged, null, 2));
const found = merged.filter(r => r.reason === 'found').length;
const missing = merged.filter(r => r.reason !== 'found').length;
console.log('Merged: ' + merged.length + ' total, ' + found + ' found, ' + missing + ' missing');
"
```

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/search-category-icons.mjs data/category-icons/
git commit -m "[XL] Category icons: MeiliSearch search agent script with scoring"
```

---

## Task 3: Review agent script (image quality validation)

**Files:**
- Create: `backend/scripts/review-category-icons.mjs`

The review agent downloads each selected image, checks dimensions and visual characteristics, and passes/fails each one.

- [ ] **Step 1: Create the review script**

```javascript
#!/usr/bin/env node
/**
 * Review selected category icon images for quality.
 *
 * For each image URL from search results:
 * 1. Download the image
 * 2. Check with sharp: dimensions, format, dominant colors
 * 3. Score on 5 criteria (white bg, single object, recognizable at 80px, representative, lighting)
 * 4. Pass (score >= 6) or fail (score < 6, goes to retry queue)
 *
 * Usage: node scripts/review-category-icons.mjs
 * Input:  data/category-icons/search-results-merged.json
 * Output: data/category-icons/review-results.json
 *         data/category-icons/retry-queue.json
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// sharp is in storefront/node_modules
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sharpPath = path.join(__dirname, "../../storefront/node_modules/sharp")
const sharp = (await import(sharpPath)).default

const DATA_DIR = path.join(__dirname, "../../data/category-icons")
const INPUT = path.join(DATA_DIR, "search-results-merged.json")
const OUTPUT = path.join(DATA_DIR, "review-results.json")
const RETRY_OUTPUT = path.join(DATA_DIR, "retry-queue.json")

async function downloadImage(url, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return buf
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function analyzeImage(buf) {
  const metadata = await sharp(buf).metadata()
  const { width, height, format, channels } = metadata

  // Get dominant color stats by resizing to 1x1
  const { dominant } = await sharp(buf).stats()

  // Check if background is white-ish by sampling corners
  // Resize to 10x10 and check corner pixels
  const tiny = await sharp(buf).resize(10, 10, { fit: "fill" }).raw().toBuffer()

  // Corner pixels (top-left, top-right, bottom-left, bottom-right)
  const corners = [
    { r: tiny[0], g: tiny[1], b: tiny[2] },
    { r: tiny[(9 * 3)], g: tiny[(9 * 3) + 1], b: tiny[(9 * 3) + 2] },
    { r: tiny[(90 * 3)], g: tiny[(90 * 3) + 1], b: tiny[(90 * 3) + 2] },
    { r: tiny[(99 * 3)], g: tiny[(99 * 3) + 1], b: tiny[(99 * 3) + 2] },
  ]

  const whiteCorners = corners.filter(
    (c) => c.r > 230 && c.g > 230 && c.b > 230
  ).length

  // Check how much of the image is near-white (background ratio)
  const raw = await sharp(buf).resize(50, 50, { fit: "fill" }).raw().toBuffer()
  let whitePixels = 0
  for (let i = 0; i < raw.length; i += 3) {
    if (raw[i] > 230 && raw[i + 1] > 230 && raw[i + 2] > 230) whitePixels++
  }
  const bgRatio = whitePixels / (50 * 50)

  return {
    width,
    height,
    format,
    channels,
    dominant,
    whiteCorners,
    bgRatio,
    isLargeEnough: width >= 200 && height >= 200,
  }
}

function scoreImage(analysis) {
  const scores = {}

  // 1. White/clean background (0-10)
  // 4 white corners = 10, 3 = 7, 2 = 4, 1 = 2, 0 = 0
  // Bonus for high background ratio
  scores.whiteBg = Math.min(10, analysis.whiteCorners * 2.5 + (analysis.bgRatio > 0.3 ? 2 : 0))

  // 2. Single clear object (0-10) — estimated by bg ratio
  // Good range: 20-60% white (object fills center, white surround)
  // Too low = busy image, too high = too small object
  if (analysis.bgRatio >= 0.2 && analysis.bgRatio <= 0.7) {
    scores.singleObject = 8
  } else if (analysis.bgRatio > 0.7) {
    scores.singleObject = 5 // object might be too small
  } else {
    scores.singleObject = 3 // too busy
  }

  // 3. Recognizable at 80x80 (0-10) — based on source resolution
  if (analysis.width >= 400) {
    scores.recognizable = 9
  } else if (analysis.width >= 200) {
    scores.recognizable = 6
  } else {
    scores.recognizable = 3
  }

  // 4. Representative — can't auto-judge, give neutral score
  scores.representative = 6

  // 5. Uniform lighting (0-10) — low contrast in bg = good lighting
  // If background is white and dominant color is reasonable, likely studio
  scores.lighting = analysis.whiteCorners >= 3 ? 8 : analysis.whiteCorners >= 2 ? 5 : 3

  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length
  return { scores, average: Math.round(avg * 10) / 10 }
}

async function main() {
  const results = JSON.parse(fs.readFileSync(INPUT, "utf-8"))
  const withImages = results.filter((r) => r.reason === "found" && r.imageUrl)
  const withoutImages = results.filter((r) => r.reason !== "found" || !r.imageUrl)

  console.log(`Reviewing ${withImages.length} images (${withoutImages.length} already missing)...`)

  const reviewed = []
  const retryQueue = [...withoutImages.map((r) => ({ ...r, retryReason: "no_image_found" }))]
  const BATCH = 10
  let passed = 0
  let failed = 0

  for (let i = 0; i < withImages.length; i += BATCH) {
    const batch = withImages.slice(i, i + BATCH)

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const buf = await downloadImage(item.imageUrl)
        if (!buf) {
          return { ...item, reviewStatus: "fail", reviewScore: 0, retryReason: "download_failed" }
        }

        try {
          const analysis = await analyzeImage(buf)
          const { scores, average } = scoreImage(analysis)

          if (!analysis.isLargeEnough) {
            return { ...item, reviewStatus: "fail", reviewScore: average, reviewScores: scores, retryReason: "too_small", analysis: { width: analysis.width, height: analysis.height } }
          }

          return {
            ...item,
            reviewStatus: average >= 6 ? "pass" : "fail",
            reviewScore: average,
            reviewScores: scores,
            retryReason: average < 6 ? "low_score" : null,
            analysis: { width: analysis.width, height: analysis.height, bgRatio: analysis.bgRatio, whiteCorners: analysis.whiteCorners },
          }
        } catch {
          return { ...item, reviewStatus: "fail", reviewScore: 0, retryReason: "analysis_error" }
        }
      })
    )

    for (const result of batchResults) {
      if (result.reviewStatus === "pass") {
        reviewed.push(result)
        passed++
      } else {
        // Try runner-up before adding to retry queue
        if (result.runnerUp && result.runnerUp.imageUrl) {
          result.imageUrl = result.runnerUp.imageUrl
          result.runnerUp = null
          result.retryReason = "promoted_runner_up"
          reviewed.push({ ...result, reviewStatus: "pending_recheck" })
        } else {
          retryQueue.push(result)
          failed++
        }
      }
    }

    if ((i + BATCH) % 100 === 0 || i + BATCH >= withImages.length) {
      const done = Math.min(i + BATCH, withImages.length)
      console.log(`  ${done}/${withImages.length} — ${passed} pass, ${failed} fail`)
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(reviewed, null, 2))
  fs.writeFileSync(RETRY_OUTPUT, JSON.stringify(retryQueue, null, 2))

  console.log(`\nReview complete:`)
  console.log(`  Passed: ${passed}`)
  console.log(`  Failed/retry: ${retryQueue.length}`)
  console.log(`  Saved: ${OUTPUT}`)
  console.log(`  Retry queue: ${RETRY_OUTPUT}`)
}

main().catch(console.error)
```

Write this to `backend/scripts/review-category-icons.mjs`.

- [ ] **Step 2: Run the review**

```bash
node backend/scripts/review-category-icons.mjs
```

Expected: downloads and analyzes each image, outputs pass/fail counts.

- [ ] **Step 3: Check retry queue**

```bash
node -e "const d=require('./data/category-icons/retry-queue.json'); console.log('Retry queue:', d.length); const byReason={}; d.forEach(r=>{byReason[r.retryReason]=(byReason[r.retryReason]||0)+1}); console.log(byReason); const l1=d.filter(r=>r.level===1); console.log('L1 in retry:', l1.length, l1.map(r=>r.handle))"
```

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/review-category-icons.mjs data/category-icons/
git commit -m "[XL] Category icons: review agent with quality scoring"
```

---

## Task 4: Process images (download + resize to 80x80 and 400x400 WebP)

**Files:**
- Create: `backend/scripts/process-category-icons.mjs`
- Create: `storefront/public/cat-icons/80/` (directory with WebP files)
- Create: `storefront/public/cat-icons/400/` (directory with WebP files)
- Create: `storefront/public/cat-icons/manifest.json`

- [ ] **Step 1: Create the processing script**

```javascript
#!/usr/bin/env node
/**
 * Download approved images and resize to 80x80 + 400x400 WebP.
 *
 * Usage: node scripts/process-category-icons.mjs
 * Input:  data/category-icons/review-results.json
 * Output: storefront/public/cat-icons/80/{handle}.webp
 *         storefront/public/cat-icons/400/{handle}.webp
 *         storefront/public/cat-icons/manifest.json
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sharpPath = path.join(__dirname, "../../storefront/node_modules/sharp")
const sharp = (await import(sharpPath)).default

const DATA_DIR = path.join(__dirname, "../../data/category-icons")
const INPUT = path.join(DATA_DIR, "review-results.json")
const OUTPUT_80 = path.join(__dirname, "../../storefront/public/cat-icons/80")
const OUTPUT_400 = path.join(__dirname, "../../storefront/public/cat-icons/400")
const MANIFEST = path.join(__dirname, "../../storefront/public/cat-icons/manifest.json")

const WHITE_BG = { r: 255, g: 255, b: 255, alpha: 1 }

async function downloadImage(url, timeoutMs = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function processImage(buf, handle) {
  // Resize to 400x400 with white background, contain fit
  const medium = await sharp(buf)
    .resize(400, 400, { fit: "contain", background: WHITE_BG })
    .flatten({ background: WHITE_BG })
    .webp({ quality: 85 })
    .toFile(path.join(OUTPUT_400, `${handle}.webp`))

  // Resize to 80x80 with white background, contain fit
  const small = await sharp(buf)
    .resize(80, 80, { fit: "contain", background: WHITE_BG })
    .flatten({ background: WHITE_BG })
    .webp({ quality: 80 })
    .toFile(path.join(OUTPUT_80, `${handle}.webp`))

  return { medium, small }
}

async function main() {
  fs.mkdirSync(OUTPUT_80, { recursive: true })
  fs.mkdirSync(OUTPUT_400, { recursive: true })

  const results = JSON.parse(fs.readFileSync(INPUT, "utf-8"))
  const approved = results.filter((r) => r.reviewStatus === "pass" && r.imageUrl)
  console.log(`Processing ${approved.length} approved images...`)

  const manifest = {}
  let processed = 0
  let errors = 0
  const BATCH = 5

  for (let i = 0; i < approved.length; i += BATCH) {
    const batch = approved.slice(i, i + BATCH)

    await Promise.all(
      batch.map(async (item) => {
        try {
          const buf = await downloadImage(item.imageUrl)
          if (!buf) {
            errors++
            return
          }
          await processImage(buf, item.handle)
          manifest[item.handle] = {
            sm: `/cat-icons/80/${item.handle}.webp`,
            md: `/cat-icons/400/${item.handle}.webp`,
          }
          processed++
        } catch (err) {
          console.error(`  Error processing ${item.handle}: ${err.message}`)
          errors++
        }
      })
    )

    if ((i + BATCH) % 100 === 0 || i + BATCH >= approved.length) {
      const done = Math.min(i + BATCH, approved.length)
      console.log(`  ${done}/${approved.length} — ${processed} OK, ${errors} errors`)
    }
  }

  // Sort manifest by key
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2))

  console.log(`\nProcessing complete:`)
  console.log(`  Processed: ${processed}`)
  console.log(`  Errors: ${errors}`)
  console.log(`  80x80:  ${OUTPUT_80}`)
  console.log(`  400x400: ${OUTPUT_400}`)
  console.log(`  Manifest: ${MANIFEST}`)
}

main().catch(console.error)
```

Write this to `backend/scripts/process-category-icons.mjs`.

- [ ] **Step 2: Run the processor**

```bash
node backend/scripts/process-category-icons.mjs
```

Expected: downloads and resizes all approved images, creates WebP files in both directories.

- [ ] **Step 3: Verify output**

```bash
ls storefront/public/cat-icons/80/ | wc -l
ls storefront/public/cat-icons/400/ | wc -l
ls -lh storefront/public/cat-icons/80/ | head -10
ls -lh storefront/public/cat-icons/400/ | head -10
node -e "const m=require('./storefront/public/cat-icons/manifest.json'); console.log('Manifest entries:', Object.keys(m).length)"
```

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/process-category-icons.mjs storefront/public/cat-icons/
git commit -m "[XL] Category icons: process images to 80x80 + 400x400 WebP"
```

---

## Task 5: Nano-banana fallback for failed L1 categories

**Files:**
- Modify: `data/category-icons/retry-queue.json` (read L1 entries)
- Create: generated images in `storefront/public/cat-icons/80/` and `400/`

This task uses the nano-banana skill to generate images for L1 categories that failed review. It must be done manually (one per L1 category) since nano-banana is interactive.

- [ ] **Step 1: Identify L1 categories needing generation**

```bash
node -e "const d=require('./data/category-icons/retry-queue.json'); const l1=d.filter(r=>r.level===1); console.log('L1 needing nano-banana:', l1.length); l1.forEach(r=>console.log('  '+r.handle+' — '+r.name+' ('+r.retryReason+')'))"
```

- [ ] **Step 2: For each L1 category, generate with nano-banana**

Use the `/nano-banana:generate` skill with this prompt template for each failed L1 category:

```
iconic {CATEGORY_NAME} product, white background, studio lighting, single object centered,
product photography, clean minimal, no text, no labels, high detail
```

For example, if "Other" failed:
```
iconic household products assortment, white background, studio lighting, single object centered,
product photography, clean minimal, no text, no labels, high detail
```

- [ ] **Step 3: Resize generated images to both sizes**

After each nano-banana generation, resize the output:

```bash
cd storefront && node -e "
const sharp = require('sharp');
const handle = 'HANDLE_HERE';
sharp('PATH_TO_GENERATED_IMAGE')
  .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .flatten({ background: { r: 255, g: 255, b: 255 } })
  .webp({ quality: 85 })
  .toFile('public/cat-icons/400/' + handle + '.webp')
  .then(() => sharp('PATH_TO_GENERATED_IMAGE')
    .resize(80, 80, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .webp({ quality: 80 })
    .toFile('public/cat-icons/80/' + handle + '.webp'))
  .then(() => console.log('Done:', handle))
"
```

- [ ] **Step 4: Update manifest with generated images**

```bash
node -e "
const fs = require('fs');
const manifest = require('./storefront/public/cat-icons/manifest.json');
const dir80 = fs.readdirSync('storefront/public/cat-icons/80');
for (const f of dir80) {
  const handle = f.replace('.webp', '');
  if (!manifest[handle]) {
    manifest[handle] = { sm: '/cat-icons/80/' + handle + '.webp', md: '/cat-icons/400/' + handle + '.webp' };
    console.log('Added:', handle);
  }
}
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a],[b]) => a.localeCompare(b)));
fs.writeFileSync('storefront/public/cat-icons/manifest.json', JSON.stringify(sorted, null, 2));
console.log('Manifest updated:', Object.keys(sorted).length, 'entries');
"
```

- [ ] **Step 5: Commit**

```bash
git add storefront/public/cat-icons/ data/category-icons/
git commit -m "[XL] Category icons: nano-banana fallback for L1 categories"
```

---

## Task 6: Final verification and stats

- [ ] **Step 1: Run full verification**

```bash
node -e "
const fs = require('fs');
const manifest = require('./storefront/public/cat-icons/manifest.json');
const categories = require('./data/category-icons/categories-by-level.json');
const allCats = Object.values(categories).flat();
const covered = allCats.filter(c => manifest[c.handle]);
const missing = allCats.filter(c => !manifest[c.handle]);

console.log('=== Category Icons Coverage ===');
console.log('Total categories:', allCats.length);
console.log('Icons created:', Object.keys(manifest).length);
console.log('Coverage:', Math.round(covered.length / allCats.length * 100) + '%');
console.log('');

for (const [level, cats] of Object.entries(categories).sort(([a],[b]) => +a - +b)) {
  const levelCovered = cats.filter(c => manifest[c.handle]).length;
  console.log('L' + level + ': ' + levelCovered + '/' + cats.length + ' (' + Math.round(levelCovered/cats.length*100) + '%)');
}

if (missing.length > 0 && missing.length <= 30) {
  console.log('');
  console.log('Missing:');
  missing.forEach(c => console.log('  L' + c.level + ' ' + c.handle + ' — ' + c.name));
}

// Check file sizes
const files80 = fs.readdirSync('storefront/public/cat-icons/80');
const files400 = fs.readdirSync('storefront/public/cat-icons/400');
console.log('');
console.log('Files: 80px=' + files80.length + ', 400px=' + files400.length);

const sizes80 = files80.map(f => fs.statSync('storefront/public/cat-icons/80/' + f).size);
const sizes400 = files400.map(f => fs.statSync('storefront/public/cat-icons/400/' + f).size);
console.log('80px avg:', Math.round(sizes80.reduce((a,b)=>a+b,0)/sizes80.length/1024) + 'KB');
console.log('400px avg:', Math.round(sizes400.reduce((a,b)=>a+b,0)/sizes400.length/1024) + 'KB');
"
```

Expected: L1 100% coverage, overall 90%+ coverage.

- [ ] **Step 2: Commit final state**

```bash
git add -A
git commit -m "[XL] Category icons: final verification, full L1-L4 coverage"
```
