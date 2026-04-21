#!/usr/bin/env node
/**
 * gen-category-counts.mjs — produce storefront/lib/category-counts.generated.json
 * with product counts per category handle, sourced from Meili.
 *
 * Used by menu-data.getHomepageL1Nodes() to order the sublist and featured
 * cards by product volume (biggest L2 first). Runs after Meili reindex in the
 * feed-sync cron so counts stay fresh.
 *
 * Output shape: { _generated_at, counts: { [handle]: number } }
 *
 * Usage:
 *   MEILISEARCH_ADMIN_KEY=... node scripts/gen-category-counts.mjs
 */

import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const TREE_PATH = resolve(ROOT, "storefront/lib/category-tree.generated.json")
const OUT_PATH = resolve(ROOT, "storefront/lib/category-counts.generated.json")

const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_ADMIN_KEY || process.env.MEILISEARCH_KEY

if (!MEILI_KEY) {
  console.error("MEILISEARCH_ADMIN_KEY required")
  process.exit(1)
}

async function count(slug) {
  const res = await fetch(`${MEILI_HOST}/indexes/products/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MEILI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: "",
      limit: 0,
      filter: `taxonomy.ancestors = "${slug}"`,
    }),
  })
  if (!res.ok) return 0
  const d = await res.json()
  return d.estimatedTotalHits ?? d.totalHits ?? 0
}

async function main() {
  const tree = JSON.parse(readFileSync(TREE_PATH, "utf8"))
  const handles = Object.keys(tree.nodes)
  console.log(`Fetching Meili counts for ${handles.length} category handles…`)

  const counts = {}
  const BATCH = 25
  for (let i = 0; i < handles.length; i += BATCH) {
    const batch = handles.slice(i, i + BATCH)
    const values = await Promise.all(batch.map(count))
    batch.forEach((h, idx) => {
      counts[h] = values[idx]
    })
    if ((i + BATCH) % 200 === 0 || i + BATCH >= handles.length) {
      console.log(`  ${Math.min(i + BATCH, handles.length)}/${handles.length}`)
    }
  }

  const out = {
    _generated_at: new Date().toISOString(),
    counts,
  }
  writeFileSync(OUT_PATH, JSON.stringify(out))
  console.log(`Wrote ${OUT_PATH}`)

  const nonZero = Object.values(counts).filter((c) => c > 0).length
  console.log(`Coverage: ${nonZero}/${handles.length} categories have products`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
