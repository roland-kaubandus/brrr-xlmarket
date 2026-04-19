#!/usr/bin/env node
/**
 * Reassign every existing product to its deepest taxonomy-v3 category (L3 > L2 > L1).
 *
 * Why: migrate-categories-to-v3.mjs (Faas 2) bound every product to the L1 node only,
 * because it used the legacy resolveV3Slug() which returns L1-only slugs. As a result
 * every L2/L3 category page renders 0 products (Meili facets are empty for l2/l3).
 *
 * What this does:
 *   - Loads every published product's (id, title, vevor_product_type, vevor_sku, vevor_spu).
 *   - Loads (handle -> id) for every taxonomy_node_meta-tracked product_category.
 *   - Runs the Faas 3 resolver (classifyProductSync) on each row.
 *   - Picks the deepest available DB category (L3 > L2 > L1; review-bucket if low conf).
 *   - In a single transaction: DELETE every taxonomy-v3 row from product_category_product
 *     for that product, INSERT the new leaf binding.
 *
 * Idempotent. Safe to re-run. DRY-RUN by default.
 *
 * Usage:
 *   node scripts/reassign-categories-to-leaves.mjs                # dry-run, report only
 *   node scripts/reassign-categories-to-leaves.mjs --execute       # apply
 *   node scripts/reassign-categories-to-leaves.mjs --execute --limit 100
 */

import pg from "pg"
import { classifyProductSync, loadRules } from "../backend/src/taxonomy/resolver.mjs"

const PG_CONFIG = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: process.env.PGPASSWORD,
  database: "xlmarket",
}

const args = process.argv.slice(2)
const EXECUTE = args.includes("--execute")
const limitIdx = args.indexOf("--limit")
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null

function log(m) { console.log(m) }

async function loadCategoryHandleToId(pgc) {
  // Only categories tracked by taxonomy_node_meta (v3 + review bucket).
  const r = await pgc.query(`
    SELECT pc.handle, pc.id, tnm.level
    FROM product_category pc
    JOIN taxonomy_node_meta tnm ON tnm.node_id = pc.id
    WHERE pc.is_active = true
  `)
  const map = {}
  const levelOf = {}
  for (const row of r.rows) {
    map[row.handle] = row.id
    levelOf[row.id] = row.level
  }
  // Review bucket (hidden node) might not be in taxonomy_node_meta with level — try by handle.
  const rb = await pgc.query(`SELECT id, handle FROM product_category WHERE handle = 'needs-review-bucket' LIMIT 1`)
  if (rb.rows[0] && !map[rb.rows[0].handle]) map[rb.rows[0].handle] = rb.rows[0].id
  return { map, levelOf }
}

async function loadV3CategoryIds(pgc) {
  // Set of category IDs that belong to taxonomy v3 (used to know what to remove).
  const r = await pgc.query(`SELECT node_id FROM taxonomy_node_meta`)
  const set = new Set(r.rows.map(x => x.node_id))
  const rb = await pgc.query(`SELECT id FROM product_category WHERE handle = 'needs-review-bucket' LIMIT 1`)
  if (rb.rows[0]) set.add(rb.rows[0].id)
  return set
}

async function loadProducts(pgc, limit) {
  const limClause = limit ? `LIMIT ${limit}` : ""
  const r = await pgc.query(`
    SELECT
      p.id,
      p.title,
      COALESCE(p.metadata->>'vevor_product_type', '') AS vevor_product_type,
      COALESCE(p.metadata->>'vevor_sku', '')          AS vevor_sku,
      COALESCE(p.metadata->>'vevor_spu', '')          AS vevor_spu,
      COALESCE(p.description, '')                     AS description
    FROM product p
    WHERE p.deleted_at IS NULL
      AND p.status = 'published'
    ORDER BY p.id
    ${limClause}
  `)
  return r.rows
}

function pickLeafHandle(c, catIdMap) {
  if (c.review_bucket) return "needs-review-bucket"
  if (c.l3_slug && catIdMap[c.l3_slug]) return c.l3_slug
  if (c.l2_slug && catIdMap[c.l2_slug]) return c.l2_slug
  if (c.l1_slug && catIdMap[c.l1_slug]) return c.l1_slug
  return null
}

async function main() {
  log("=== Reassign categories to leaves (L3 > L2 > L1) ===")
  log("Mode: " + (EXECUTE ? "EXECUTE" : "DRY-RUN"))
  if (LIMIT) log("Limit: " + LIMIT)

  loadRules()
  const pgc = new pg.Client(PG_CONFIG)
  await pgc.connect()

  try {
    const { map: catIdMap, levelOf } = await loadCategoryHandleToId(pgc)
    log("  Loaded " + Object.keys(catIdMap).length + " v3 category handles")

    const v3CatIds = await loadV3CategoryIds(pgc)
    log("  Tracking " + v3CatIds.size + " v3 category IDs (for cleanup)")

    const rows = await loadProducts(pgc, LIMIT)
    log("  Loaded " + rows.length + " published products")

    const stats = {
      total: rows.length,
      bound_l3: 0,
      bound_l2: 0,
      bound_l1: 0,
      bound_review: 0,
      unmapped: 0,
      already_correct: 0,
      reassigned: 0,
      errors: 0,
    }
    const methodCounts = {}

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const signals = {
        title: row.title,
        productType: row.vevor_product_type,
        sku: row.vevor_sku,
        spu: row.vevor_spu,
        description: row.description,
      }
      let cls
      try {
        cls = classifyProductSync(signals)
      } catch (e) {
        stats.errors++
        if (stats.errors <= 5) log("  ERROR classify [" + row.id + "]: " + e.message)
        continue
      }
      methodCounts[cls.method] = (methodCounts[cls.method] || 0) + 1

      const targetHandle = pickLeafHandle(cls, catIdMap)
      if (!targetHandle) {
        stats.unmapped++
        continue
      }
      const targetId = catIdMap[targetHandle]
      const targetLevel = levelOf[targetId] || (targetHandle === "needs-review-bucket" ? 0 : null)

      // Tally by level
      if (targetLevel === 3) stats.bound_l3++
      else if (targetLevel === 2) stats.bound_l2++
      else if (targetLevel === 1) stats.bound_l1++
      else stats.bound_review++

      if (EXECUTE) {
        try {
          await pgc.query("BEGIN")
          // Remove only the v3 / review-bucket bindings; legacy bindings stay
          // intact (they get cleaned up in a separate sweep). Practically, on
          // a freshly migrated DB every product has exactly one v3 row, so the
          // delete affects 1 row per product.
          await pgc.query(
            `DELETE FROM product_category_product
              WHERE product_id = $1
                AND product_category_id = ANY($2::text[])`,
            [row.id, Array.from(v3CatIds)]
          )
          await pgc.query(
            `INSERT INTO product_category_product (product_id, product_category_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [row.id, targetId]
          )
          await pgc.query("COMMIT")
          stats.reassigned++
        } catch (e) {
          await pgc.query("ROLLBACK")
          stats.errors++
          if (stats.errors <= 10) log("  ERROR write [" + row.id + "]: " + e.message)
        }
      }

      if ((i + 1) % 1000 === 0) {
        log("  Progress: " + (i + 1) + "/" + rows.length +
          " | l3=" + stats.bound_l3 + " l2=" + stats.bound_l2 + " l1=" + stats.bound_l1 +
          " review=" + stats.bound_review + " unmapped=" + stats.unmapped)
      }
    }

    log("")
    log("─── Summary ─────────────────────────────────")
    log("  Total products processed: " + stats.total)
    log("  Bound to L3 leaf:         " + stats.bound_l3)
    log("  Bound to L2 leaf:         " + stats.bound_l2)
    log("  Bound to L1 (no L2/L3):   " + stats.bound_l1)
    log("  Bound to review bucket:   " + stats.bound_review)
    log("  Unmapped (no slug):       " + stats.unmapped)
    log("  Errors:                   " + stats.errors)
    if (EXECUTE) log("  DB writes (reassigned):   " + stats.reassigned)
    log("")
    log("─── Resolver methods ────────────────────────")
    Object.entries(methodCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([m, n]) => log("  " + m.padEnd(40, " ") + " " + n))

    if (!EXECUTE) {
      log("")
      log("Dry run complete. Re-run with --execute to apply.")
    }
  } finally {
    await pgc.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
