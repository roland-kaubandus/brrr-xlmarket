#!/usr/bin/env node
/**
 * flatten-redundant-layers.mjs — remove pass-through category layers.
 *
 * A layer is "pass-through" when a node N has exactly one child C and
 * count(N) === count(C) in the live Meili index. This means all products
 * under N are also under C, so C adds zero structure — the extra click
 * just wastes the user's time.
 *
 * Algorithm (iterative, works at every level L2..L7):
 *   1. Build list of (parent, child) pairs where parent has 1 child.
 *   2. Query Meili for taxonomy.ancestors counts in parallel.
 *   3. For every pair where counts match AND count > 0:
 *      - Collapse: keep the parent slug (user-facing URL), inherit child's
 *        grandchildren as parent's new children, drop C from the tree.
 *      - Add slug_redirect entry: child_slug → parent_slug.
 *      - Rewrite vevor-path-to-leaf mappings that targeted child to the parent.
 *   4. Repeat until no more redundant layers remain.
 *
 * Edits happen in-memory on a parsed YAML document; final write is atomic.
 *
 * Usage:
 *   MEILISEARCH_KEY=... node scripts/flatten-redundant-layers.mjs            # dry-run
 *   MEILISEARCH_KEY=... node scripts/flatten-redundant-layers.mjs --execute  # write YAML + path-to-leaf + seed redirects
 */

import { readFileSync, writeFileSync } from "node:fs"
import yaml from "js-yaml"

const YAML_PATH = "/home/brrr/brrr-xlmarket/backend/src/data/taxonomy.yaml"
const PATH_TO_LEAF_PATH = "/home/brrr/brrr-xlmarket/backend/src/taxonomy/rules/vevor-path-to-leaf.json"
const REDIRECTS_SQL_PATH = "/tmp/flatten-redirects.sql"

const MEILI_HOST = "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_KEY || process.env.MEILISEARCH_ADMIN_KEY

const EXECUTE = process.argv.includes("--execute")
// --l1=<slug> limits to one L1 subtree (e.g. --l1=renewable-energy-batteries)
const L1_FILTER_ARG = process.argv.find(a => a.startsWith("--l1="))
const L1_FILTER = L1_FILTER_ARG ? L1_FILTER_ARG.slice("--l1=".length) : null

function* walk(subs, parentPath = []) {
  for (const node of subs || []) {
    if (typeof node !== "object" || !node) continue
    const path = [...parentPath, node]
    yield { node, parent: parentPath[parentPath.length - 1] || null, path }
    if (node.subs) yield* walk(node.subs, path)
  }
}

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

async function findRedundantPairs(doc) {
  // For each node with exactly 1 child, compare Meili counts in parallel.
  const candidates = []
  for (const l1 of doc.l1) {
    if (L1_FILTER && l1.slug !== L1_FILTER) continue
    for (const { node } of walk(l1.subs || [])) {
      const subs = node.subs || []
      if (subs.length !== 1) continue
      const child = subs[0]
      if (typeof child !== "object") continue
      candidates.push({ parent: node, child })
    }
    // Also check L1 itself
    if ((l1.subs || []).length === 1) {
      // L1 with single L2 is unusual; skip so L1 anchors stay stable.
    }
  }

  const results = []
  // Run in batches of 25 to keep Meili happy
  for (let i = 0; i < candidates.length; i += 25) {
    const batch = candidates.slice(i, i + 25)
    const counts = await Promise.all(
      batch.flatMap(c => [meiliCount(c.parent.slug), meiliCount(c.child.slug)])
    )
    batch.forEach((c, idx) => {
      const pc = counts[idx * 2]
      const cc = counts[idx * 2 + 1]
      if (pc === cc && pc > 0) {
        results.push({ ...c, count: pc })
      }
    })
  }
  return results
}

function collapse(parent, child) {
  // Parent absorbs child's subs. Parent slug/name stays (user-facing URL).
  // Child slug becomes a redirect to parent slug.
  parent.subs = child.subs || []
  // Product count follows — child had same count as parent by definition.
}

function rewritePathToLeaf(mappings, childSlug, parentSlug) {
  for (const [path, target] of Object.entries(mappings)) {
    if (target === childSlug) {
      mappings[path] = parentSlug
    }
  }
}

async function main() {
  if (!MEILI_KEY) {
    console.error("MEILISEARCH_KEY (or MEILISEARCH_ADMIN_KEY) env var required")
    process.exit(1)
  }
  console.log("=== flatten-redundant-layers ===")
  console.log(EXECUTE ? "MODE: EXECUTE" : "MODE: dry-run\n")

  const doc = yaml.load(readFileSync(YAML_PATH, "utf8"))
  const pathToLeafDoc = JSON.parse(readFileSync(PATH_TO_LEAF_PATH, "utf8"))
  const mappings = pathToLeafDoc.mappings

  const allRedirects = []
  let iteration = 0
  while (true) {
    iteration++
    console.log(`--- iteration ${iteration} ---`)
    const pairs = await findRedundantPairs(doc)
    console.log(`  ${pairs.length} redundant pairs found`)
    if (pairs.length === 0) break

    for (const { parent, child, count } of pairs) {
      console.log(`  collapse: ${parent.slug} absorbs ${child.slug} (${count} t)`)
      collapse(parent, child)
      rewritePathToLeaf(mappings, child.slug, parent.slug)
      allRedirects.push({ from: child.slug, to: parent.slug })
    }
  }

  console.log(`\nTotal collapsed: ${allRedirects.length}`)

  if (!EXECUTE) {
    console.log("\n(dry-run — pass --execute to write)")
    return
  }

  // Write YAML
  writeFileSync(YAML_PATH, yaml.dump(doc, { lineWidth: 999, noRefs: true, sortKeys: false }))
  console.log(`\nWrote YAML: ${YAML_PATH}`)

  // Write path-to-leaf
  writeFileSync(
    PATH_TO_LEAF_PATH,
    JSON.stringify({ ...pathToLeafDoc, mappings, _generated_at: new Date().toISOString() }, null, 2)
  )
  console.log(`Wrote path-to-leaf: ${PATH_TO_LEAF_PATH}`)

  // Emit SQL to seed slug_redirects
  const sql = [
    "BEGIN;",
    ...allRedirects.map(
      r =>
        `INSERT INTO slug_redirect (from_slug, to_slug, reason) VALUES ('${r.from.replace(/'/g, "''")}', '${r.to.replace(/'/g, "''")}', 'merge') ON CONFLICT (from_slug) DO UPDATE SET to_slug = EXCLUDED.to_slug, reason = EXCLUDED.reason;`
    ),
    "COMMIT;",
    "",
  ].join("\n")
  writeFileSync(REDIRECTS_SQL_PATH, sql)
  console.log(`Wrote SQL: ${REDIRECTS_SQL_PATH} (apply with: psql ... -f ${REDIRECTS_SQL_PATH})`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
