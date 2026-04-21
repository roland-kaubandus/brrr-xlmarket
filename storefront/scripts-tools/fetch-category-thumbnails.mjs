#!/usr/bin/env node
/**
 * fetch-category-thumbnails.mjs — download a first-product thumbnail from
 * Meili for every category that has no image of its own.
 *
 * Usage:
 *   MEILISEARCH_KEY=... node scripts/fetch-category-thumbnails.mjs
 *   MEILISEARCH_KEY=... node scripts/fetch-category-thumbnails.mjs --execute
 *   MEILISEARCH_KEY=... node scripts/fetch-category-thumbnails.mjs --execute --include-inherited
 *
 * Writes /public/cat-thumbs/<slug>.webp using sharp for the conversion.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import sharp from "sharp"

const TREE_PATH = "/home/brrr/brrr-xlmarket/storefront/lib/category-tree.generated.json"
const OUT_DIR = "/home/brrr/brrr-xlmarket/storefront/public/cat-thumbs"
const MEILI_HOST = "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_KEY || process.env.MEILISEARCH_ADMIN_KEY

const EXECUTE = process.argv.includes("--execute")
const INCLUDE_INHERITED = process.argv.includes("--include-inherited")
// Also fetch direct thumbnails for nodes that currently rely on inherited/fuzzy
// donor images. Useful when a category gets a donor image that's a poor match
// (e.g. personal-care-appliances inheriting heat-therapy-products).
const FORCE_RESOLVE = process.argv.includes("--force-resolve")

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

async function meiliFirstThumbnail(ancestor) {
  const res = await fetch(`${MEILI_HOST}/indexes/products/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MEILI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: "",
      limit: 1,
      filter: `taxonomy.ancestors = "${ancestor}"`,
      attributesToRetrieve: ["thumbnail", "title"],
    }),
  })
  if (!res.ok) return null
  const d = await res.json()
  return d.hits?.[0] || null
}

async function downloadWebp(url, destPath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  // Convert to webp, resize to 400x400 (category thumbs are displayed at ~200x)
  await sharp(buf)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .webp({ quality: 82 })
    .toFile(destPath)
}

async function main() {
  if (!MEILI_KEY) {
    console.error("MEILISEARCH_KEY or MEILISEARCH_ADMIN_KEY required")
    process.exit(1)
  }

  const tree = JSON.parse(readFileSync(TREE_PATH, "utf8"))
  const candidates = []
  for (const [handle, n] of Object.entries(tree.nodes)) {
    if (n.image_source === "none") candidates.push(handle)
    else if (INCLUDE_INHERITED && n.image_source === "inherited") candidates.push(handle)
    else if (FORCE_RESOLVE && (n.image_source === "fuzzy" || n.image_source === "inherited")) candidates.push(handle)
  }

  console.log(`=== fetch-category-thumbnails ===`)
  console.log(`MODE: ${EXECUTE ? "EXECUTE" : "dry-run"}`)
  console.log(`${candidates.length} categories to fetch\n`)

  let fetched = 0
  let noHit = 0
  let failed = 0

  for (const handle of candidates) {
    const dest = path.join(OUT_DIR, `${handle}.webp`)
    if (existsSync(dest)) {
      // Already have one — skip
      continue
    }
    const hit = await meiliFirstThumbnail(handle)
    if (!hit || !hit.thumbnail) {
      noHit++
      continue
    }
    if (!EXECUTE) {
      console.log(`[dry] ${handle}  ←  ${hit.thumbnail.slice(0, 70)}`)
      fetched++
      continue
    }
    try {
      await downloadWebp(hit.thumbnail, dest)
      fetched++
      if (fetched % 25 === 0) console.log(`  progress: ${fetched}/${candidates.length}`)
    } catch (err) {
      console.error(`FAIL ${handle}: ${err.message}`)
      failed++
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`  Fetched:    ${fetched}`)
  console.log(`  No product: ${noHit}`)
  console.log(`  Failed:     ${failed}`)
  if (EXECUTE) console.log(`\nRun 'node scripts/gen-category-tree.mjs' to update image_path pointers.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
