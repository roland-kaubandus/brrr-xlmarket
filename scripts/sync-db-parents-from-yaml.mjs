#!/usr/bin/env node
/**
 * sync-db-parents-from-yaml.mjs — sync DB product_category parent_category_id
 * to match taxonomy.yaml SSoT.
 *
 * Juurpõhjus (2026-04-19): DB parent_category_id mõnede sõlmede jaoks erineb
 * yaml'ist. Näide: plumbing-tools yaml'is construction-building all, DB-s
 * plumbing-water-systems all. See põhjustab Meili ancestors drift'i (INV-14
 * residual 3/50).
 *
 * Usage:
 *   node scripts/sync-db-parents-from-yaml.mjs             # dry-run
 *   node scripts/sync-db-parents-from-yaml.mjs --execute   # apply
 */
import pg from "pg"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const TREE_PATH = resolve(ROOT, "storefront/lib/category-tree.generated.json")
const EXECUTE = process.argv.includes("--execute")

const PG_CONFIG = {
  host: "localhost", port: 5435, user: "xlmarket",
  password: "PG_PASSWORD_REDACTED", database: "xlmarket",
}

async function main() {
  console.log("=== sync-db-parents-from-yaml ===")
  console.log(EXECUTE ? "MODE: EXECUTE" : "MODE: dry-run\n")

  const tree = JSON.parse(readFileSync(TREE_PATH, "utf8"))
  console.log(`Loaded ${Object.keys(tree.nodes).length} tree nodes`)

  const c = new pg.Client(PG_CONFIG)
  await c.connect()

  // handle → {id, parent_category_id}
  const { rows: cats } = await c.query(
    `SELECT pc.id, pc.handle, pc.parent_category_id, pc.mpath
     FROM product_category pc
     JOIN taxonomy_node_meta tnm ON tnm.node_id = pc.id
     WHERE pc.deleted_at IS NULL`
  )
  const handleToId = new Map()
  const dbByHandle = new Map()
  for (const r of cats) {
    handleToId.set(r.handle, r.id)
    dbByHandle.set(r.handle, r)
  }
  console.log(`Loaded ${cats.length} v3 categories from DB\n`)

  // Find drifts: for every tree node (except L1), yaml says parent = X,
  // DB says parent_category_id should resolve to X.
  const idToHandle = new Map()
  for (const r of cats) idToHandle.set(r.id, r.handle)

  const drifts = []
  for (const node of Object.values(tree.nodes)) {
    if (node.level === 1) {
      // L1 should have no parent
      const db = dbByHandle.get(node.handle)
      if (!db) continue
      if (db.parent_category_id) {
        drifts.push({
          handle: node.handle,
          yaml_parent: null,
          db_parent: idToHandle.get(db.parent_category_id) || db.parent_category_id,
          id: db.id,
          new_parent_id: null,
        })
      }
      continue
    }
    const db = dbByHandle.get(node.handle)
    if (!db) continue
    const expectedParentId = handleToId.get(node.parent_handle)
    if (!expectedParentId) {
      console.log(`  WARN: ${node.handle} → yaml parent '${node.parent_handle}' not in DB`)
      continue
    }
    if (db.parent_category_id !== expectedParentId) {
      drifts.push({
        handle: node.handle,
        yaml_parent: node.parent_handle,
        db_parent: idToHandle.get(db.parent_category_id) || db.parent_category_id || "(null)",
        id: db.id,
        new_parent_id: expectedParentId,
      })
    }
  }

  console.log(`=== Drifts found: ${drifts.length} ===`)
  for (const d of drifts) {
    console.log(`  ${d.handle}: db='${d.db_parent}' → yaml='${d.yaml_parent}'`)
  }

  if (!EXECUTE) {
    console.log("\nDry-run only. Re-run with --execute to apply.")
    await c.end()
    return
  }

  if (drifts.length === 0) {
    console.log("\nNothing to do.")
    await c.end()
    return
  }

  console.log("\n=== Applying parent fixes ===")
  await c.query("BEGIN")
  try {
    for (const d of drifts) {
      await c.query(
        "UPDATE product_category SET parent_category_id=$1, updated_at=NOW() WHERE id=$2",
        [d.new_parent_id, d.id]
      )
    }
    // Rebuild mpath for all v3 nodes (simple recursive approach).
    console.log("Rebuilding mpath for all v3 nodes…")
    // Build handle → new mpath from tree (root → leaf chain of IDs)
    for (const node of Object.values(tree.nodes)) {
      const db = dbByHandle.get(node.handle)
      if (!db) continue
      const chain = []
      let cur = node
      let guard = 0
      while (cur && guard++ < 20) {
        const id = handleToId.get(cur.handle)
        if (!id) break
        chain.push(id)
        if (!cur.parent_handle) break
        cur = tree.nodes[cur.parent_handle]
      }
      // mpath format: "root_id.child_id.grandchild_id" (root first)
      const mpath = chain.reverse().join(".")
      await c.query(
        "UPDATE product_category SET mpath=$1 WHERE id=$2",
        [mpath, db.id]
      )
    }
    await c.query("COMMIT")
    console.log(`COMMITTED ${drifts.length} parent updates + mpath rebuild for ${cats.length} nodes`)
  } catch (e) {
    await c.query("ROLLBACK")
    console.error("ROLLBACK:", e.message)
    throw e
  }
  await c.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
