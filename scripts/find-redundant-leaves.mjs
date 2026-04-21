#!/usr/bin/env node
/**
 * find-redundant-leaves.mjs — detect parent→child pairs where the child is
 * the only descendant and carries the same product count. Such layers are
 * pass-through noise and should be flattened.
 *
 * Dry-run only — prints a report. Actual YAML edits are manual because the
 * right "merge" depends on naming (keep the parent's name, leaf's slug, etc.).
 *
 * Usage:
 *   MEILISEARCH_KEY=... node scripts/find-redundant-leaves.mjs
 */

import { readFileSync } from "node:fs"

const TREE_PATH = "/home/brrr/brrr-xlmarket/storefront/lib/category-tree.generated.json"
const MEILI_HOST = "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_KEY || process.env.MEILISEARCH_ADMIN_KEY

async function meiliCount(ancestor) {
  const res = await fetch(`${MEILI_HOST}/indexes/products/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MEILI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: "",
      limit: 0,
      filter: `taxonomy.ancestors = "${ancestor}"`,
    }),
  })
  const d = await res.json()
  return d.estimatedTotalHits ?? d.totalHits ?? 0
}

async function main() {
  const tree = JSON.parse(readFileSync(TREE_PATH, "utf8"))
  const nodes = tree.nodes

  const candidates = []
  for (const [handle, n] of Object.entries(nodes)) {
    const kids = n.child_handles || []
    // Only flag single-child parents
    if (kids.length !== 1) continue
    // Skip L1 (always keep L2 structure)
    if (n.level < 2) continue
    const childHandle = kids[0]
    const child = nodes[childHandle]
    if (!child) continue
    candidates.push({ parent: handle, child: childHandle, parentLvl: n.level, childLvl: child.level })
  }

  console.log(`${candidates.length} single-child parents found\n`)
  console.log("parent → child  (parent_count / child_count)")
  console.log("-".repeat(80))

  const redundant = []
  for (const c of candidates) {
    const pc = await meiliCount(c.parent)
    const cc = await meiliCount(c.child)
    const flag = pc === cc ? "  REDUNDANT" : ""
    console.log(`L${c.parentLvl} ${c.parent.padEnd(45)} → L${c.childLvl} ${c.child.padEnd(35)} (${pc} / ${cc})${flag}`)
    if (pc === cc && pc > 0) redundant.push({ ...c, count: pc })
  }

  console.log(`\n${redundant.length} redundant layers to flatten:`)
  for (const r of redundant) {
    console.log(`  ${r.parent} === ${r.child}  (${r.count} products)`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
