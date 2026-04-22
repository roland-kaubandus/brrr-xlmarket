#!/usr/bin/env node
/**
 * Convert all PNGs in public/images/ to WebP at 85% quality.
 * Writes .webp file NEXT TO each PNG (originals untouched).
 * Produces a size-savings report.
 *
 * Safe to re-run: skips files where .webp already exists and is newer.
 */
import sharp from "sharp"
import { readdir, stat, writeFile } from "fs/promises"
import { join, extname } from "path"

const ROOT = "/home/brrr/brrr-xlmarket/storefront/public/images"
const OUT_REPORT = "/home/brrr/brrr-xlmarket/reports/overnight-2026-04-22/lighthouse/webp-conversion.md"
const QUALITY = 85

async function walk(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (e.isFile() && extname(p).toLowerCase() === ".png") out.push(p)
  }
  return out
}

const pngs = await walk(ROOT)
console.log(`Found ${pngs.length} PNG files`)

const results = []
let totalPng = 0
let totalWebp = 0
let skipped = 0
let errored = 0

for (const png of pngs) {
  try {
    const pngStat = await stat(png)
    totalPng += pngStat.size
    const webp = png.replace(/\.png$/i, ".webp")

    // Skip if webp already exists and is newer
    try {
      const webpStat = await stat(webp)
      if (webpStat.mtime > pngStat.mtime) {
        totalWebp += webpStat.size
        skipped++
        continue
      }
    } catch {}

    await sharp(png).webp({ quality: QUALITY, effort: 5 }).toFile(webp)
    const webpStat = await stat(webp)
    totalWebp += webpStat.size
    results.push({ png, pngBytes: pngStat.size, webpBytes: webpStat.size })

    if (results.length % 10 === 0) {
      console.log(`  ${results.length}/${pngs.length} converted…`)
    }
  } catch (e) {
    errored++
    console.error(`  FAIL ${png}: ${e.message}`)
  }
}

results.sort((a, b) => (b.pngBytes - b.webpBytes) - (a.pngBytes - a.webpBytes))

const lines = [
  "# PNG → WebP Conversion Report",
  `Generated: ${new Date().toISOString()}`,
  `Quality: ${QUALITY}`,
  "",
  "## Totals",
  `- PNG total: **${(totalPng / 1024 / 1024).toFixed(1)} MB** (${pngs.length} files)`,
  `- WebP total: **${(totalWebp / 1024 / 1024).toFixed(1)} MB**`,
  `- Savings: **${((totalPng - totalWebp) / 1024 / 1024).toFixed(1)} MB** (${Math.round((1 - totalWebp / totalPng) * 100)}%)`,
  `- Converted now: ${results.length}, skipped (already current): ${skipped}, errored: ${errored}`,
  "",
  "## Top 30 savings",
  "| PNG | PNG size | WebP size | Savings |",
  "|---|---|---|---|",
]
for (const r of results.slice(0, 30)) {
  const rel = r.png.replace(ROOT + "/", "")
  const png = (r.pngBytes / 1024).toFixed(0) + " KB"
  const wp = (r.webpBytes / 1024).toFixed(0) + " KB"
  const pct = Math.round((1 - r.webpBytes / r.pngBytes) * 100)
  lines.push(`| ${rel} | ${png} | ${wp} | −${pct}% |`)
}
lines.push("")
lines.push("## How to use")
lines.push("Originals are UNTOUCHED. WebP files sit next to each PNG.")
lines.push("Swap by:")
lines.push("1. In component code, change `.png` → `.webp` in image paths, OR")
lines.push("2. Add nginx rule: if `.webp` exists and client supports it, serve WebP instead.")
lines.push("3. Delete originals only after switching is verified.")

await writeFile(OUT_REPORT, lines.join("\n"))
console.log(`\n✓ Report: ${OUT_REPORT}`)
console.log(`  Total PNG: ${(totalPng / 1024 / 1024).toFixed(1)} MB`)
console.log(`  Total WebP: ${(totalWebp / 1024 / 1024).toFixed(1)} MB`)
console.log(`  Saved: ${((totalPng - totalWebp) / 1024 / 1024).toFixed(1)} MB`)
