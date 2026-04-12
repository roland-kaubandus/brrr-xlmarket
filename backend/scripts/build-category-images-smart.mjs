#!/usr/bin/env node
/**
 * Smart Category Image Picker
 *
 * For each category, finds the most "iconic" product image by:
 * 1. Searching MeiliSearch with category name as query (relevance scoring)
 * 2. Filtering to only products IN that category
 * 3. Scoring candidates by:
 *    - Title relevance (MeiliSearch ranking — most important)
 *    - Price position (prefer mid-range, not cheapest junk or niche expensive)
 *    - Gallery richness (products with more images are better photographed)
 *    - Thumbnail existence (skip products without images)
 * 4. Picking the highest-scoring product's thumbnail
 *
 * Usage: node scripts/build-category-images-smart.mjs
 * Output: storefront/lib/category-images.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MEILI_HOST = "http://127.0.0.1:7700"
const MEILI_KEY = "MEILI_LEGACY_KEY_REDACTED"
const MEDUSA_URL = "http://127.0.0.1:9001"
const API_KEY = "pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3"
const OUTPUT = path.join(__dirname, "../../storefront/lib/category-images.json")

// ── Helpers ──

async function meiliSearch(query, filter, limit = 20) {
  const res = await fetch(`${MEILI_HOST}/indexes/products/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${MEILI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      q: query,
      limit,
      filter: [filter],
      attributesToRetrieve: ["id", "title", "handle", "thumbnail", "price", "category_handles"],
      attributesToHighlight: [],
    }),
  })
  const data = await res.json()
  return data.hits || []
}

async function getAllCategories() {
  const all = []
  let offset = 0
  while (true) {
    const res = await fetch(`${MEDUSA_URL}/store/product-categories?limit=500&offset=${offset}`, {
      headers: { "x-publishable-api-key": API_KEY },
    })
    const data = await res.json()
    all.push(...data.product_categories)
    if (data.product_categories.length < 500) break
    offset += 500
  }
  return all
}

// ── Scoring ──

function scoreProduct(hit, rankIndex, totalHits, priceStats) {
  let score = 0

  // 1. Relevance rank (MeiliSearch already sorted by relevance)
  // Top result gets 50 points, linearly decreasing
  score += Math.max(0, 50 - (rankIndex / totalHits) * 50)

  // 2. Must have thumbnail
  if (!hit.thumbnail) return -1

  // 3. Price position — prefer mid-range (30-70th percentile)
  if (priceStats.range > 0 && hit.price > 0) {
    const percentile = (hit.price - priceStats.min) / priceStats.range
    // Bell curve scoring: peak at 0.4 (slightly below median)
    const priceScore = 25 * Math.exp(-Math.pow((percentile - 0.4) / 0.3, 2))
    score += priceScore
  }

  // 4. Thumbnail URL quality — prefer "original_img" VEVOR CDN (higher res)
  if (hit.thumbnail.includes("original_img")) score += 10
  if (hit.thumbnail.includes("m100-1.2")) score += 5 // main product image

  return score
}

// ── Main ──

async function main() {
  console.log("Smart Category Image Picker")
  console.log("=".repeat(50))

  const categories = await getAllCategories()
  console.log(`Categories: ${categories.length}`)

  const images = {}
  let found = 0
  let noProducts = 0
  let noImage = 0
  const BATCH = 5

  for (let i = 0; i < categories.length; i += BATCH) {
    const batch = categories.slice(i, i + BATCH)

    const results = await Promise.all(
      batch.map(async (cat) => {
        // Search using category NAME as query, filtered to this category's products
        // This leverages MeiliSearch relevance to find the most representative product
        const hits = await meiliSearch(cat.name, `category_handles = "${cat.handle}"`, 20)

        if (hits.length === 0) {
          noProducts++
          return { handle: cat.handle, thumb: null }
        }

        // Calculate price stats for scoring
        const prices = hits.map((h) => h.price).filter((p) => p > 0)
        const priceStats = {
          min: Math.min(...prices),
          max: Math.max(...prices),
          range: prices.length > 1 ? Math.max(...prices) - Math.min(...prices) : 0,
        }

        // Score all candidates
        const scored = hits
          .map((hit, idx) => ({
            hit,
            score: scoreProduct(hit, idx, hits.length, priceStats),
          }))
          .filter((s) => s.score >= 0)
          .sort((a, b) => b.score - a.score)

        if (scored.length === 0) {
          noImage++
          return { handle: cat.handle, thumb: null }
        }

        return { handle: cat.handle, thumb: scored[0].hit.thumbnail }
      })
    )

    for (const { handle, thumb } of results) {
      if (thumb) {
        images[handle] = thumb
        found++
      }
    }

    if ((i + BATCH) % 100 === 0 || i + BATCH >= categories.length) {
      const checked = Math.min(i + BATCH, categories.length)
      console.log(`  ${checked}/${categories.length} checked, ${found} images found`)
    }
  }

  // Sort by key for stable output
  const sorted = Object.fromEntries(Object.entries(images).sort(([a], [b]) => a.localeCompare(b)))

  fs.writeFileSync(OUTPUT, JSON.stringify(sorted, null, 2))
  console.log("")
  console.log("=".repeat(50))
  console.log(`Done: ${found} category images`)
  console.log(`  No products: ${noProducts}`)
  console.log(`  No thumbnail: ${noImage}`)
  console.log(`Saved to ${OUTPUT}`)
}

main().catch(console.error)
