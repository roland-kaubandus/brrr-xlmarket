#!/usr/bin/env node
/**
 * reassign-solar-panel-kits.mjs — move portable/foldable/flexible/trickle
 * solar products from `solar-panels` leaf into `solar-panel-kits` leaf.
 *
 * VEVOR feed puts all of these under "Solar Panels" in vevor_product_type,
 * so path-to-leaf can't split them. This script runs title-based filtering
 * AFTER reassign-v3-from-mapping to move the non-static panels.
 *
 * Regex: /\b(portable|foldable|flexible|trickle)\b/i
 *
 * Usage:
 *   node scripts/reassign-solar-panel-kits.mjs            # dry-run
 *   node scripts/reassign-solar-panel-kits.mjs --execute  # apply
 *
 * Must run in feed-sync.sh AFTER reassign-v3-from-mapping and BEFORE
 * index-meilisearch so the Meili taxonomy.ancestors reflects the new binds.
 */

import pg from "pg"

const PG_CONFIG = {
  host: "localhost", port: 5435, user: "xlmarket",
  password: process.env.PGPASSWORD, database: "xlmarket",
}

const EXECUTE = process.argv.includes("--execute")
const PORTABLE_RE = /\b(portable|foldable|flexible|trickle|kit|kits|bundle|system|systems|package)\b/i

async function main() {
  console.log("=== reassign-solar-panel-kits ===")
  console.log(EXECUTE ? "MODE: EXECUTE" : "MODE: dry-run")

  const c = new pg.Client(PG_CONFIG)
  await c.connect()

  // Resolve category IDs — we look at the leaf nodes under solar-panels AND
  // solar-panel-kits, since products are bound to the deepest leaf.
  const catRes = await c.query(
    `SELECT id, handle FROM product_category
     WHERE handle IN ('solar-panel-kits','monocrystalline-solar-panel','solar-trickle-charger')
     AND deleted_at IS NULL`
  )
  const idByHandle = new Map(catRes.rows.map(r => [r.handle, r.id]))
  const kitsId = idByHandle.get("solar-panel-kits")
  const monoId = idByHandle.get("monocrystalline-solar-panel")
  const trickleId = idByHandle.get("solar-trickle-charger")
  if (!kitsId || !monoId || !trickleId) {
    console.error("Missing category in DB:", { kitsId, monoId, trickleId })
    await c.end()
    process.exit(1)
  }
  console.log(`solar-panel-kits:           ${kitsId}`)
  console.log(`monocrystalline-solar-panel: ${monoId}`)
  console.log(`solar-trickle-charger:       ${trickleId}\n`)

  // Find all products currently bound to mono-panel or trickle-charger leaves
  const prodRes = await c.query(
    `SELECT p.id, p.title, pcp.product_category_id AS current_cat
     FROM product_category_product pcp
     JOIN product p ON p.id = pcp.product_id
     WHERE pcp.product_category_id IN ($1, $2) AND p.deleted_at IS NULL`,
    [monoId, trickleId]
  )
  console.log(`${prodRes.rows.length} products under mono-panel + trickle-charger leaves`)

  // Move rules:
  //   1. ALL trickle-charger products → solar-panel-kits (they're all kits-ish)
  //   2. mono-panel products whose title matches portable/foldable/flexible → kits
  const toMove = prodRes.rows.filter(r => {
    if (r.current_cat === trickleId) return true
    return PORTABLE_RE.test(r.title)
  })
  console.log(`${toMove.length} to move to solar-panel-kits`)
  const byReason = {
    all_trickle: toMove.filter(r => r.current_cat === trickleId).length,
    portable_mono: toMove.filter(r => r.current_cat === monoId).length,
  }
  console.log(`  (${byReason.all_trickle} trickle-chargers, ${byReason.portable_mono} portable/foldable/flexible mono-panels)\n`)

  if (toMove.length === 0) {
    console.log("Nothing to move. Exiting.")
    await c.end()
    return
  }

  // Sample first 5
  console.log("Sample of products to move:")
  for (const p of toMove.slice(0, 5)) {
    console.log(`  - ${p.title.slice(0, 90)}`)
  }
  console.log()

  if (EXECUTE) {
    await c.query("BEGIN")
    for (const p of toMove) {
      // Remove from current leaf (mono or trickle)
      await c.query(
        "DELETE FROM product_category_product WHERE product_id = $1 AND product_category_id = $2",
        [p.id, p.current_cat]
      )
      // Add to solar-panel-kits
      await c.query(
        "INSERT INTO product_category_product (product_id, product_category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [p.id, kitsId]
      )
    }
    await c.query("COMMIT")
    console.log(`\nCOMMITTED: ${toMove.length} products moved to solar-panel-kits`)
  } else {
    console.log("\n(dry-run — pass --execute to apply)")
  }

  await c.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
