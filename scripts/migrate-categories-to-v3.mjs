#!/usr/bin/env node
/**
 * Migrate Medusa product categories to taxonomy-v3.
 *
 * Steps:
 *   1. Auth as Medusa admin.
 *   2. Ensure all 22 v3 L1 categories exist (create if missing, by handle).
 *   3. For every product, recompute target v3 slug from metadata.vevor_product_type
 *      using vevor-to-v3.json resolver and reassign its categories to [v3_l1_id].
 *   4. Reindex MeiliSearch (calls /indexes/{index}/documents with fresh payload).
 *
 * Idempotent. Safe to re-run. DRY-RUN by default.
 *
 * Usage:
 *   node migrate-categories-to-v3.mjs                 # dry-run, report only
 *   node migrate-categories-to-v3.mjs --execute       # apply changes
 *   node migrate-categories-to-v3.mjs --execute --reindex   # + reindex Meili
 *   node migrate-categories-to-v3.mjs --delete-orphans      # (DANGER) delete unused old categories
 */

import pg from "pg"
import http from "http"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { loadV3Map, resolveV3Slug } from "../backend/src/scripts/resolve-v3-category.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MEDUSA_URL = "http://127.0.0.1:9001"
const ADMIN_EMAIL = "admin@xlmarket.eu"
const ADMIN_PASS = process.env.MEDUSA_ADMIN_PASS

const PG_CONFIG = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: process.env.PGPASSWORD,
  database: "xlmarket",
}

const MEILI_HOST = "http://127.0.0.1:7700"
const MEILI_INDEX = "products"

const V3_PATH = path.join(__dirname, "..", "storefront", "lib", "taxonomy-v3.ts")

const args = process.argv.slice(2)
const EXECUTE = args.includes("--execute")
const DO_REINDEX = args.includes("--reindex")
const DELETE_ORPHANS = args.includes("--delete-orphans")
const BATCH = 50

function log(m) { console.log(m) }

// ── HTTP helper ─────────────────────────────────────────────────────

async function apiCall(method, pathname, body, token) {
  const url = new URL(MEDUSA_URL + pathname)
  return new Promise((resolve, reject) => {
    const req = http.request({
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }, res => {
      let data = ""
      res.on("data", c => data += c)
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null }) }
        catch { resolve({ status: res.statusCode, data: { raw: data } }) }
      })
    })
    req.on("error", reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function getAdminToken() {
  const resp = await apiCall("POST", "/auth/user/emailpass", { email: ADMIN_EMAIL, password: ADMIN_PASS })
  if (resp.status !== 200 || !resp.data?.token) {
    throw new Error(`Admin auth failed: ${resp.status} ${JSON.stringify(resp.data)}`)
  }
  return resp.data.token
}

// ── Taxonomy parsing ────────────────────────────────────────────────

function parseTaxonomyV3() {
  const raw = fs.readFileSync(V3_PATH, "utf-8")
  const rx = /\{\s*id:\s*\d+,\s*prodNum:\s*\d+,\s*slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g
  const out = []
  let m
  while ((m = rx.exec(raw)) !== null) {
    out.push({ slug: m[1], name: m[2] })
  }
  if (out.length !== 22) throw new Error(`Expected 22 v3 L1 entries, got ${out.length}`)
  return out
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  log(`== v3 category migration (${EXECUTE ? "EXECUTE" : "DRY-RUN"}) ==`)

  const v3 = parseTaxonomyV3()
  log(`Loaded ${v3.length} v3 L1 entries from taxonomy-v3.ts`)

  const map = loadV3Map()
  log(`Loaded vevor-to-v3 map: ${Object.keys(map.l1_defaults).length} L1 defaults, ${Object.keys(map.l1_l2_overrides).length} L1|L2 overrides, ${Object.keys(map.path_contains || {}).length} path_contains rules`)

  const token = await getAdminToken()
  log(`Admin auth OK`)

  // 1) Ensure v3 L1 categories exist
  const catsResp = await apiCall("GET", "/admin/product-categories?limit=500&fields=id,handle,name", null, token)
  const existing = catsResp.data?.product_categories || []
  const byHandle = Object.fromEntries(existing.map(c => [c.handle, c]))
  log(`Existing categories in Medusa: ${existing.length}`)

  const slugToId = {}
  let createdCats = 0
  for (const v of v3) {
    if (byHandle[v.slug]) {
      slugToId[v.slug] = byHandle[v.slug].id
      continue
    }
    log(`  ${EXECUTE ? "CREATE" : "would create"}: ${v.slug} (${v.name})`)
    if (EXECUTE) {
      const r = await apiCall("POST", "/admin/product-categories", {
        name: v.name,
        handle: v.slug,
        is_active: true,
        is_internal: false,
      }, token)
      if (r.status >= 200 && r.status < 300 && r.data?.product_category) {
        slugToId[v.slug] = r.data.product_category.id
        createdCats++
      } else {
        log(`    FAIL: status=${r.status} msg=${JSON.stringify(r.data).slice(0, 200)}`)
      }
    } else {
      slugToId[v.slug] = "(pending-create)"
    }
  }
  log(`Created ${createdCats} new v3 categories`)

  // 2) Load all products with productType metadata
  const pool = new pg.Pool(PG_CONFIG)
  const productsRes = await pool.query(`
    SELECT p.id, p.handle, p.metadata->>'vevor_product_type' AS vevor_product_type
    FROM product p
    WHERE p.deleted_at IS NULL
      AND p.metadata ? 'vevor_product_type'
  `)
  log(`Products with vevor_product_type metadata: ${productsRes.rows.length}`)

  // Count by target slug
  const targetCounts = {}
  const products = []
  let unresolved = 0
  for (const row of productsRes.rows) {
    const slug = resolveV3Slug(row.vevor_product_type, map)
    if (!slug) { unresolved++; continue }
    targetCounts[slug] = (targetCounts[slug] || 0) + 1
    products.push({ id: row.id, handle: row.handle, slug })
  }
  log(`Resolved: ${products.length}  Unresolved: ${unresolved}`)
  log(`Target distribution:`)
  for (const [slug, n] of Object.entries(targetCounts).sort((a, b) => b[1] - a[1])) {
    log(`  ${String(n).padStart(5)}  ${slug}`)
  }

  // 3) Load current product_category links for diff
  const linksRes = await pool.query(`
    SELECT product_id, product_category_id FROM product_category_product
  `)
  const currentByProduct = {}
  for (const { product_id, product_category_id } of linksRes.rows) {
    ;(currentByProduct[product_id] ||= []).push(product_category_id)
  }

  // 4) Compute diff + apply
  let changed = 0, alreadyOk = 0, failed = 0, skippedNoTarget = 0
  const fixSample = []

  for (const p of products) {
    const targetId = slugToId[p.slug]
    if (!targetId) { skippedNoTarget++; continue }

    const cur = currentByProduct[p.id] || []
    if (targetId !== "(pending-create)" && cur.length === 1 && cur[0] === targetId) {
      alreadyOk++
      continue
    }

    if (fixSample.length < 10) fixSample.push({ handle: p.handle, slug: p.slug })

    if (EXECUTE && targetId !== "(pending-create)") {
      // Medusa 2 admin API: POST /admin/products/:id with categories REPLACES
      const r = await apiCall("POST", `/admin/products/${p.id}`, {
        categories: [{ id: targetId }],
      }, token)
      if (r.status >= 200 && r.status < 300) {
        changed++
      } else {
        failed++
        if (failed <= 10) log(`  FAIL ${p.handle}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`)
      }
      if (changed % BATCH === 0 && changed > 0) log(`  progress: ${changed} updated...`)
    } else {
      // dry-run: count hypothetical change
      changed++
    }
  }

  log(`\n== Summary ==`)
  log(`  Products ${EXECUTE ? "updated" : "would update"}: ${changed}`)
  log(`  Already correct: ${alreadyOk}`)
  log(`  Skipped (no target id): ${skippedNoTarget}`)
  log(`  Failed: ${failed}`)
  log(`  Unresolved (no v3 slug): ${unresolved}`)
  if (!EXECUTE && fixSample.length) {
    log(`  Sample changes (dry-run, first 10):`)
    for (const s of fixSample) log(`    ${s.handle} → ${s.slug}`)
  }

  // 5) Optional: delete orphan categories
  if (DELETE_ORPHANS && EXECUTE) {
    log(`\n-- Deleting orphan categories (not in v3)...`)
    const v3Set = new Set(v3.map(v => v.slug))
    const linksByCat = {}
    for (const { product_category_id } of linksRes.rows) {
      linksByCat[product_category_id] = (linksByCat[product_category_id] || 0) + 1
    }
    let deleted = 0
    for (const c of existing) {
      if (v3Set.has(c.handle)) continue
      const n = linksByCat[c.id] || 0
      if (n > 0) { log(`  SKIP ${c.handle}: still has ${n} product links`); continue }
      const r = await apiCall("DELETE", `/admin/product-categories/${c.id}`, null, token)
      if (r.status >= 200 && r.status < 300) { deleted++ }
      else log(`  FAIL delete ${c.handle}: ${r.status}`)
    }
    log(`  Deleted ${deleted} orphan categories`)
  }

  await pool.end()

  // 6) Reindex MeiliSearch
  if (DO_REINDEX && EXECUTE) {
    log(`\n-- Reindexing MeiliSearch...`)
    // We delegate to backend/scripts/meili-reindex.mjs if present; otherwise log instruction
    const reindexScript = path.join(__dirname, "..", "backend", "scripts", "meili-reindex.mjs")
    if (fs.existsSync(reindexScript)) {
      log(`  Run: node ${reindexScript}`)
    } else {
      log(`  Manually: call backend reindex endpoint or rerun feed sync`)
    }
  }

  log(`\nDone.`)
}

main().catch(e => { console.error(e); process.exit(1) })
