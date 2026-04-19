#!/usr/bin/env node
/**
 * reassign-v3-from-mapping.mjs — reassign all products based on
 * vevor-path-to-leaf.json (v3 taxonomy, user 2026-04-19).
 *
 * Input:
 *   - backend/src/taxonomy/rules/vevor-path-to-leaf.json  (2692 mappings)
 *   - storefront/lib/category-tree.generated.json         (v3 tree, 3977 nodes)
 *   - product.metadata.vevor_product_type                 (each product's full VEVOR path)
 *
 * Output:
 *   - DB: product_category_product rows updated for every product
 *   - Each product bound to its deepest leaf (from mapping)
 *
 * Usage:
 *   node scripts/reassign-v3-from-mapping.mjs               # dry-run
 *   node scripts/reassign-v3-from-mapping.mjs --execute     # apply
 */

import pg from "pg"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const PG_CONFIG = {
  host: "localhost", port: 5435, user: "xlmarket",
  password: process.env.PGPASSWORD || "PG_PASSWORD_REDACTED", database: "xlmarket",
}

const EXECUTE = process.argv.includes("--execute")

async function main() {
  console.log("=== reassign-v3-from-mapping ===")
  console.log(EXECUTE ? "MODE: EXECUTE" : "MODE: dry-run")

  const mapping = JSON.parse(
    readFileSync(resolve(ROOT, "backend/src/taxonomy/rules/vevor-path-to-leaf.json"), "utf8")
  ).mappings
  const tree = JSON.parse(
    readFileSync(resolve(ROOT, "storefront/lib/category-tree.generated.json"), "utf8")
  )
  console.log(`Loaded ${Object.keys(mapping).length} path mappings`)
  console.log(`Loaded ${Object.keys(tree.nodes).length} tree nodes\n`)

  const c = new pg.Client(PG_CONFIG)
  await c.connect()

  // Load handle → category_id + mpath map from DB
  const catRes = await c.query("SELECT id, handle, mpath FROM product_category WHERE deleted_at IS NULL")
  const handleToId = new Map()
  const handleToMpath = new Map()
  for (const r of catRes.rows) {
    handleToId.set(r.handle, r.id)
    if (r.mpath) handleToMpath.set(r.handle, r.mpath)
  }
  console.log(`Loaded ${handleToId.size} categories from DB`)

  // Find which mapping targets are missing from DB
  const missingInDb = new Set()
  for (const target of Object.values(mapping)) {
    if (!handleToId.has(target)) missingInDb.add(target)
  }
  console.log(`${missingInDb.size} mapping targets not yet in DB (will be created)\n`)

  // Create missing categories from v3 tree
  if (missingInDb.size > 0 && EXECUTE) {
    // First build the full set of nodes we need (ancestors too)
    const allNeeded = new Set()
    for (const target of missingInDb) allNeeded.add(target)
    // Walk up ancestor chain for each
    for (const target of [...allNeeded]) {
      let cur = tree.nodes[target]
      while (cur && cur.parent_handle) {
        if (!handleToId.has(cur.parent_handle)) allNeeded.add(cur.parent_handle)
        cur = tree.nodes[cur.parent_handle]
      }
    }
    // Sort by level asc (parents first)
    const toCreate = [...allNeeded]
      .map((h) => tree.nodes[h])
      .filter(Boolean)
      .sort((a, b) => (a.level || 99) - (b.level || 99))

    console.log(`Creating ${toCreate.length} missing categories (levels ordered parents-first)...`)
    for (const node of toCreate) {
      const parentId = node.parent_handle ? handleToId.get(node.parent_handle) : null
      if (node.parent_handle && !parentId) {
        console.warn(`  skip ${node.handle}: parent ${node.parent_handle} not in DB yet`)
        continue
      }
      // Generate a Medusa-style id (pcat_<random>)
      const newId = "pcat_v3_" + Math.random().toString(36).slice(2, 14).toUpperCase()
      // Compute mpath: parent's mpath + '.' + this id (or just this id if root)
      const parentMpath = node.parent_handle ? handleToMpath.get(node.parent_handle) : null
      const mpath = parentMpath ? `${parentMpath}.${newId}` : newId
      await c.query(
        "INSERT INTO product_category (id, name, handle, parent_category_id, mpath, is_active, is_internal, rank, created_at, updated_at) " +
        "VALUES ($1, $2, $3, $4, $5, true, false, 0, NOW(), NOW())",
        [newId, node.name_en || node.handle, node.handle, parentId, mpath]
      )
      handleToId.set(node.handle, newId)
      handleToMpath.set(node.handle, mpath)
      // Also insert taxonomy_node_meta row
      await c.query(
        "INSERT INTO taxonomy_node_meta (node_id, level, status) VALUES ($1, $2, 'active') " +
        "ON CONFLICT (node_id) DO UPDATE SET level = EXCLUDED.level",
        [newId, node.level]
      )
    }
    console.log(`Created ${toCreate.length} categories\n`)
  } else if (missingInDb.size > 0) {
    console.log(`(dry-run — would create ${missingInDb.size} missing categories + ancestors)\n`)
  }

  // Load all products with vevor_product_type
  const prodRes = await c.query(
    "SELECT id, metadata->>'vevor_product_type' AS vp " +
    "FROM product WHERE deleted_at IS NULL AND status = 'published' " +
    "AND metadata->>'vevor_product_type' IS NOT NULL"
  )
  console.log(`Loaded ${prodRes.rows.length} products\n`)

  // Process in batches
  const stats = { mapped: 0, reviewBucket: 0, unmapped: 0, errors: 0 }
  const levelHistogram = {}
  let processed = 0

  if (EXECUTE) {
    await c.query("BEGIN")
  }

  for (const row of prodRes.rows) {
    const targetSlug = mapping[row.vp]
    if (!targetSlug) { stats.unmapped++; continue }
    const targetId = handleToId.get(targetSlug)
    if (!targetId) { stats.errors++; continue }

    const node = tree.nodes[targetSlug]
    const lvl = node?.level || 1
    levelHistogram[lvl] = (levelHistogram[lvl] || 0) + 1
    stats.mapped++

    if (EXECUTE) {
      // Delete existing taxonomy-v3 bindings (only v3 nodes — those with taxonomy_node_meta)
      await c.query(
        "DELETE FROM product_category_product " +
        "WHERE product_id = $1 AND product_category_id IN " +
        "(SELECT pc.id FROM product_category pc JOIN taxonomy_node_meta tnm ON tnm.node_id = pc.id)",
        [row.id]
      )
      // Insert new binding
      await c.query(
        "INSERT INTO product_category_product (product_id, product_category_id) " +
        "VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [row.id, targetId]
      )
    }

    processed++
    if (processed % 2000 === 0) console.log(`  progress: ${processed}/${prodRes.rows.length}`)
  }

  if (EXECUTE) {
    await c.query("COMMIT")
    console.log("\nCOMMITTED")
  }

  console.log("\n--- Summary ---")
  console.log(`  Mapped:         ${stats.mapped}`)
  console.log(`  Unmapped:       ${stats.unmapped}`)
  console.log(`  Errors:         ${stats.errors}`)
  console.log("\n--- Level histogram ---")
  for (const lvl of Object.keys(levelHistogram).sort()) {
    console.log(`  L${lvl}: ${levelHistogram[lvl]} products`)
  }

  await c.end()
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1) })
