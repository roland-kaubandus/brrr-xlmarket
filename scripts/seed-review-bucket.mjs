#!/usr/bin/env node
/**
 * Seed the `needs-review-bucket` hidden L1 node.
 *
 * Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §F3.3, §5.2 S8
 *
 * Properties:
 *   handle        = 'needs-review-bucket'
 *   is_active     = false  (never publicly visible)
 *   is_internal   = true   (hidden from storefront)
 *   parent        = NULL   (L1-level, but excluded from L1 counts)
 *
 * Also registers `taxonomy_node_meta` with class='hidden',
 * show_in_mega_menu=false, research_priority=0. INV-10 (L1==22) remains
 * true because the query in invariants filters on
 * `is_active = true AND is_internal = false`.
 *
 * Idempotent. Safe to run repeatedly.
 */

import pg from "pg"
import { randomUUID } from "crypto"

const CONN = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: "PG_PASSWORD_REDACTED",
  database: "xlmarket",
}

const HANDLE = "needs-review-bucket"
const NAME = "Needs Review (internal)"

async function main() {
  const client = new pg.Client(CONN)
  await client.connect()
  try {
    // Look up existing (ignore soft-deleted)
    const existing = await client.query(
      `SELECT id, is_active, is_internal FROM product_category
       WHERE handle = $1 AND deleted_at IS NULL`,
      [HANDLE]
    )

    let id
    if (existing.rows.length > 0) {
      id = existing.rows[0].id
      console.log(`  [skip] product_category exists: ${id}`)
      // Normalise flags in case someone flipped them
      await client.query(
        `UPDATE product_category
         SET is_active = false, is_internal = true, updated_at = NOW()
         WHERE id = $1`,
        [id]
      )
      console.log("  [ok]   flags normalised (is_active=false, is_internal=true)")
    } else {
      id = `pcat_${randomUUID().replace(/-/g, "").slice(0, 26)}`
      await client.query(
        `INSERT INTO product_category
           (id, name, description, handle, mpath, is_active, is_internal, rank,
            parent_category_id, created_at, updated_at, metadata)
         VALUES ($1, $2, $3, $4, $5, false, true, 9999, NULL, NOW(), NOW(), '{}'::jsonb)`,
        [id, NAME, "Hidden bucket for products awaiting manual categorisation.", HANDLE, `${id}.`]
      )
      console.log(`  [create] product_category: ${id}`)
    }

    // taxonomy_node_meta — mark it hidden / out-of-tree
    const metaExists = await client.query(
      `SELECT 1 FROM taxonomy_node_meta WHERE node_id = $1`,
      [id]
    )
    if (metaExists.rows.length === 0) {
      await client.query(
        `INSERT INTO taxonomy_node_meta
           (node_id, level, status, class, source, show_in_mega_menu, research_priority, meili_query)
         VALUES ($1, 1, 'hidden', NULL, 'ssot', false, 0, NULL)`,
        [id]
      )
      console.log("  [create] taxonomy_node_meta (status=hidden)")
    } else {
      await client.query(
        `UPDATE taxonomy_node_meta
         SET status = 'hidden', show_in_mega_menu = false, research_priority = 0, updated_at = NOW()
         WHERE node_id = $1`,
        [id]
      )
      console.log("  [ok]    taxonomy_node_meta normalised")
    }

    // Sanity: verify INV-10 still holds (22 active L1, review bucket excluded)
    const l1 = await client.query(
      `SELECT COUNT(*)::int AS n FROM product_category
       WHERE parent_category_id IS NULL
         AND is_active = true
         AND is_internal = false
         AND deleted_at IS NULL`
    )
    console.log(`  [inv]   active public L1 count = ${l1.rows[0].n} (expect 22)`)
    console.log(`  bucket id: ${id}`)
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error("seed-review-bucket failed:", err.message)
  process.exit(1)
})
