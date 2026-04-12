#!/usr/bin/env node
/**
 * Category Image Optimizer
 *
 * Downloads category thumbnail images from VEVOR CDN,
 * resizes to 150x150 WebP, and saves locally.
 * Updates category-images.json to use local paths.
 *
 * Usage: node scripts/optimize-category-images.mjs
 * Requires: sharp (installed in storefront/)
 *
 * Output:
 *   storefront/public/cat-thumbs/{handle}.webp  — optimized images
 *   storefront/lib/category-images.json         — updated paths
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createRequire } from "module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(__dirname, "../../storefront/package.json"))
const sharp = require("sharp")

const IMAGES_JSON = path.join(__dirname, "../../storefront/lib/category-images.json")
const OUTPUT_DIR = path.join(__dirname, "../../storefront/public/cat-thumbs")
const THUMB_SIZE = 150
const QUALITY = 80
const BATCH_SIZE = 10
const MAX_RETRIES = 2

// ── Helpers ──

async function downloadImage(url, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "XLMarket/1.0" },
      })
      clearTimeout(timeout)
      if (!res.ok) return null
      return Buffer.from(await res.arrayBuffer())
    } catch {
      if (attempt === retries) return null
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  return null
}

async function processImage(buffer, outputPath) {
  await sharp(buffer)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .webp({ quality: QUALITY })
    .toFile(outputPath)
}

// ── Main ──

async function main() {
  console.log("Category Image Optimizer")
  console.log("=".repeat(50))

  // Load current category images
  const images = JSON.parse(fs.readFileSync(IMAGES_JSON, "utf8"))
  const handles = Object.keys(images)
  console.log(`Categories with images: ${handles.length}`)

  // Create output dir
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // Check which are already optimized (local path)
  let alreadyLocal = 0
  let toProcess = []
  for (const handle of handles) {
    const url = images[handle]
    if (url.startsWith("/cat-thumbs/")) {
      alreadyLocal++
      continue
    }
    toProcess.push({ handle, url })
  }
  console.log(`Already local: ${alreadyLocal}`)
  console.log(`To download+optimize: ${toProcess.length}`)

  let downloaded = 0
  let failed = 0
  const updatedImages = { ...images }

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE)

    const results = await Promise.all(
      batch.map(async ({ handle, url }) => {
        const outputFile = path.join(OUTPUT_DIR, `${handle}.webp`)

        // Skip if file already exists
        if (fs.existsSync(outputFile)) {
          return { handle, success: true, cached: true }
        }

        const buffer = await downloadImage(url)
        if (!buffer || buffer.length < 100) {
          return { handle, success: false }
        }

        try {
          await processImage(buffer, outputFile)
          return { handle, success: true, cached: false }
        } catch {
          return { handle, success: false }
        }
      })
    )

    for (const result of results) {
      if (result.success) {
        updatedImages[result.handle] = `/cat-thumbs/${result.handle}.webp`
        downloaded++
      } else {
        failed++
      }
    }

    const done = Math.min(i + BATCH_SIZE, toProcess.length)
    if (done % 100 === 0 || done === toProcess.length) {
      console.log(`  ${done}/${toProcess.length} — ${downloaded} OK, ${failed} failed`)
    }
  }

  // Sort and save
  const sorted = Object.fromEntries(
    Object.entries(updatedImages).sort(([a], [b]) => a.localeCompare(b))
  )
  fs.writeFileSync(IMAGES_JSON, JSON.stringify(sorted, null, 2))

  console.log("")
  console.log("=".repeat(50))
  console.log(`Done: ${downloaded} optimized, ${failed} failed, ${alreadyLocal} already local`)
  console.log(`Output: ${OUTPUT_DIR}`)

  // Show size stats
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".webp"))
  const totalSize = files.reduce((sum, f) => sum + fs.statSync(path.join(OUTPUT_DIR, f)).size, 0)
  console.log(`Files: ${files.length}, Total size: ${(totalSize / 1024 / 1024).toFixed(1)} MB`)
  console.log(`Average: ${files.length ? Math.round(totalSize / files.length / 1024) : 0} KB per image`)
}

main().catch(console.error)
