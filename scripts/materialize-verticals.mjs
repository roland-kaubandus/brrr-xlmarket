#!/usr/bin/env node
/**
 * materialize-verticals.mjs — Faas 4 (F4.3 + F4.7)
 *
 * Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §4.5
 *
 * Reads backend/src/data/taxonomy.yaml `verticals:` section (SSoT), upserts
 * vertical_collection + rule + translation rows, resolves product membership
 * via taxonomy_node_meta + product_category joins, writes
 * vertical_collection_product rows, and patches the corresponding Meili
 * documents with vertical_slugs = ["alustajale:kohvik", ...].
 *
 * Idempotent. Safe to re-run. Invariant INV-17 (materialization ≤26h old).
 *
 * Usage:
 *   node scripts/materialize-verticals.mjs                # execute (writes everything)
 *   node scripts/materialize-verticals.mjs --dry-run      # report only
 *   node scripts/materialize-verticals.mjs --skip-meili   # DB only
 *
 * Suggested cron (after drain-review-queue):
 *   45 4 * * * node /home/brrr/brrr-xlmarket/scripts/materialize-verticals.mjs
 */

import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import yaml from "js-yaml"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const YAML_PATH = resolve(ROOT, "backend/src/data/taxonomy.yaml")

const DB_URL = process.env.DATABASE_URL ||
  `postgres://xlmarket:${process.env.PGPASSWORD}@localhost:5435/xlmarket`
const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_KEY
const INDEX = "products"
const BATCH = 500

const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
const SKIP_MEILI = args.includes("--skip-meili")

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`)
}

async function meili(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      Authorization: "Bearer " + MEILI_KEY,
      "Content-Type": "application/json",
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch(MEILI_HOST + path, opts)
  const text = await r.text()
  if (!r.ok && r.status !== 202 && r.status !== 201) {
    throw new Error(
      `MeiliSearch ${r.status} ${method} ${path}: ${text.slice(0, 200)}`
    )
  }
  return text ? JSON.parse(text) : {}
}

function loadYaml() {
  const raw = readFileSync(YAML_PATH, "utf8")
  const doc = yaml.load(raw)
  if (!doc.verticals || !Array.isArray(doc.verticals)) {
    throw new Error("taxonomy.yaml missing verticals: section")
  }
  return doc.verticals
}

/**
 * Resolve product ids whose taxonomy ancestor chain includes any of the
 * supplied slugs. We rely on taxonomy_node_meta + product_category_product
 * (the standard Medusa M:N) and traverse via recursive mpath match.
 */
async function resolveProductsForNodes(client, includeSlugs, excludeSlugs) {
  if (!includeSlugs?.length) return { products: new Map(), nodeCount: 0 }

  // Step 1: resolve category ids for the include/exclude slugs.
  const includeIds = await client.query(
    `SELECT id FROM product_category WHERE handle = ANY($1) AND deleted_at IS NULL`,
    [includeSlugs]
  )
  const excludeIds = excludeSlugs?.length
    ? await client.query(
        `SELECT id FROM product_category WHERE handle = ANY($1) AND deleted_at IS NULL`,
        [excludeSlugs]
      )
    : { rows: [] }

  const includeCatIds = includeIds.rows.map((r) => r.id)
  const excludeCatIds = excludeIds.rows.map((r) => r.id)

  if (!includeCatIds.length) {
    return { products: new Map(), nodeCount: 0 }
  }

  // Step 2: expand to all descendant categories (mpath prefix match).
  const includeDescendants = await client.query(
    `SELECT DISTINCT pc.id
     FROM product_category pc
     WHERE pc.deleted_at IS NULL
       AND (
         pc.id = ANY($1)
         OR EXISTS (
           SELECT 1 FROM product_category p2
           WHERE p2.id = ANY($1)
             AND pc.mpath LIKE p2.mpath || '.%'
         )
       )`,
    [includeCatIds]
  )
  const excludeDescendants = excludeCatIds.length
    ? await client.query(
        `SELECT DISTINCT pc.id
         FROM product_category pc
         WHERE pc.deleted_at IS NULL
           AND (
             pc.id = ANY($1)
             OR EXISTS (
               SELECT 1 FROM product_category p2
               WHERE p2.id = ANY($1)
                 AND pc.mpath LIKE p2.mpath || '.%'
             )
           )`,
        [excludeCatIds]
      )
    : { rows: [] }

  const includeSet = new Set(includeDescendants.rows.map((r) => r.id))
  const excludeSet = new Set(excludeDescendants.rows.map((r) => r.id))
  const effectiveIncludeIds = [...includeSet].filter((id) => !excludeSet.has(id))

  if (!effectiveIncludeIds.length) {
    return { products: new Map(), nodeCount: 0 }
  }

  // Step 3: resolve product ids joined to those categories.
  const products = await client.query(
    `SELECT DISTINCT pcp.product_id, pcp.product_category_id
     FROM product_category_product pcp
     JOIN product p ON p.id = pcp.product_id AND p.deleted_at IS NULL
     WHERE pcp.product_category_id = ANY($1)
       AND p.status = 'published'`,
    [effectiveIncludeIds]
  )

  // Dedup product_id → first category id for added_via attribution.
  const productMap = new Map()
  for (const r of products.rows) {
    if (!productMap.has(r.product_id)) {
      productMap.set(r.product_id, r.product_category_id)
    }
  }

  return { products: productMap, nodeCount: effectiveIncludeIds.length }
}

async function upsertVertical(client, v) {
  const id = `vc_${v.slug}`
  const heroUrl = v.hero_img || null
  const emtak = v.emtak_codes || []
  const cnae = v.cnae_codes || []

  await client.query(
    `INSERT INTO vertical_collection
       (id, slug, mode, hero_image_url, emtak_codes, cnae_codes, status, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,'active',NOW())
     ON CONFLICT (id) DO UPDATE SET
       slug = EXCLUDED.slug,
       mode = EXCLUDED.mode,
       hero_image_url = EXCLUDED.hero_image_url,
       emtak_codes = EXCLUDED.emtak_codes,
       cnae_codes = EXCLUDED.cnae_codes,
       status = 'active',
       updated_at = NOW()`,
    [id, v.slug, v.mode, heroUrl, emtak, cnae]
  )

  // Rebuild rules: truncate + reinsert (declarative, YAML is SSoT)
  await client.query(`DELETE FROM vertical_collection_rule WHERE collection_id = $1`, [id])
  for (const slug of v.include_nodes || []) {
    await client.query(
      `INSERT INTO vertical_collection_rule (collection_id, kind, node_slug, reason)
       VALUES ($1,'include_node',$2,'YAML SSoT include')`,
      [id, slug]
    )
  }
  for (const slug of v.exclude_nodes || []) {
    await client.query(
      `INSERT INTO vertical_collection_rule (collection_id, kind, node_slug, reason)
       VALUES ($1,'exclude_node',$2,'YAML SSoT exclude')`,
      [id, slug]
    )
  }

  // Translations (et + en). ES is deferred until ES-store launch.
  for (const locale of ["et", "en"]) {
    const name = locale === "et" ? v.name_et : v.name_en
    const tagline = locale === "et" ? v.tagline_et : v.tagline_en
    const description = locale === "et" ? v.description_et : v.description_en
    const metaTitle = locale === "et" ? v.meta_title_et : v.meta_title_en
    const metaDescription = locale === "et" ? v.meta_description_et : v.meta_description_en
    if (!name) continue
    await client.query(
      `INSERT INTO vertical_collection_translation
         (collection_id, locale, name, slug_localized, tagline, description, meta_title, meta_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (collection_id, locale) DO UPDATE SET
         name = EXCLUDED.name,
         slug_localized = EXCLUDED.slug_localized,
         tagline = EXCLUDED.tagline,
         description = EXCLUDED.description,
         meta_title = EXCLUDED.meta_title,
         meta_description = EXCLUDED.meta_description`,
      [id, locale, name, v.slug, tagline || null, description || null, metaTitle || null, metaDescription || null]
    )
  }

  return id
}

async function rewriteProducts(client, collectionId, productMap) {
  await client.query(
    `DELETE FROM vertical_collection_product WHERE collection_id = $1`,
    [collectionId]
  )
  if (!productMap.size) return

  const productIds = [...productMap.keys()]
  const addedVia = productIds.map((pid) => `node:${productMap.get(pid)}`)
  await client.query(
    `INSERT INTO vertical_collection_product
       (collection_id, product_id, sort_weight, added_via, materialized_at)
     SELECT $1, UNNEST($2::text[]), 0, UNNEST($3::text[]), NOW()`,
    [collectionId, productIds, addedVia]
  )
}

async function patchMeiliVerticalSlugs(productToVerticals) {
  if (!productToVerticals.size) {
    log("  Meili: no products to patch")
    return
  }

  const docs = []
  for (const [productId, slugs] of productToVerticals.entries()) {
    docs.push({ id: productId, vertical_slugs: slugs })
  }

  log(`  Meili: patching ${docs.length} docs`)
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH)
    await meili(`/indexes/${INDEX}/documents`, "PUT", batch)
    process.stdout.write(`    ${Math.min(i + BATCH, docs.length)}/${docs.length}\r`)
  }
  process.stdout.write("\n")

  // Wait for Meili to settle
  for (let spin = 0; spin < 60; spin += 1) {
    const t = await meili("/tasks?statuses=enqueued,processing&limit=1")
    if (t.results.length === 0) break
    await new Promise((r) => setTimeout(r, 1000))
  }
}

async function clearStaleMeiliSlugs(client, currentProductToVerticals) {
  // For products that previously had a vertical_slug but are no longer included,
  // reset them to []. We detect via DB diff (vertical_collection_product history)
  // but the simplest + idempotent approach: patch every active collection's
  // previous membership to [] when not in current set. To keep cost low we rely
  // on the fact that rewriteProducts already DELETEd old DB rows, so we can
  // diff current DB snapshot vs the map and clear any orphans from a recent
  // materialization. For pilot (3 verticals, <2000 products), we just scan all
  // products that have ANY vertical_slug set and weren't seen this run.
  const scanned = await meili(
    `/indexes/${INDEX}/search`,
    "POST",
    {
      q: "",
      filter: "vertical_slugs EXISTS",
      limit: 10000,
      attributesToRetrieve: ["id", "vertical_slugs"],
    }
  )

  const stale = []
  for (const hit of scanned.hits || []) {
    if (!currentProductToVerticals.has(hit.id) && (hit.vertical_slugs?.length || 0) > 0) {
      stale.push({ id: hit.id, vertical_slugs: [] })
    }
  }

  if (!stale.length) {
    log("  Meili: no stale vertical_slugs to clear")
    return
  }

  log(`  Meili: clearing ${stale.length} stale vertical_slugs`)
  for (let i = 0; i < stale.length; i += BATCH) {
    const batch = stale.slice(i, i + BATCH)
    await meili(`/indexes/${INDEX}/documents`, "PUT", batch)
  }
}

async function main() {
  const t0 = Date.now()
  log(`materialize-verticals ${DRY_RUN ? "[DRY-RUN]" : ""}${SKIP_MEILI ? " [SKIP-MEILI]" : ""}`)

  const verticals = loadYaml()
  log(`Loaded ${verticals.length} verticals from YAML`)

  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()

  // product_id → ["alustajale:kohvik", ...]
  const productToVerticals = new Map()
  const perCollectionStats = []

  try {
    for (const v of verticals) {
      log(`\n→ ${v.mode}:${v.slug}`)

      const { products, nodeCount } = await resolveProductsForNodes(
        client,
        v.include_nodes,
        v.exclude_nodes
      )
      log(`  nodes=${nodeCount} products=${products.size}`)

      perCollectionStats.push({
        slug: v.slug,
        mode: v.mode,
        nodes: nodeCount,
        products: products.size,
      })

      if (!DRY_RUN) {
        const collectionId = await upsertVertical(client, v)
        await rewriteProducts(client, collectionId, products)
        await client.query(
          `UPDATE vertical_collection SET materialized_at = NOW() WHERE id = $1`,
          [collectionId]
        )
      }

      for (const productId of products.keys()) {
        const slug = `${v.mode}:${v.slug}`
        if (!productToVerticals.has(productId)) {
          productToVerticals.set(productId, [slug])
        } else {
          const arr = productToVerticals.get(productId)
          if (!arr.includes(slug)) arr.push(slug)
        }
      }
    }

    log(`\nUnique products across all verticals: ${productToVerticals.size}`)

    if (!DRY_RUN && !SKIP_MEILI) {
      log("\nPatching Meili documents...")
      await patchMeiliVerticalSlugs(productToVerticals)
      await clearStaleMeiliSlugs(client, productToVerticals)
    }
  } finally {
    await client.end()
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  log(`\nSummary (${elapsed}s):`)
  for (const s of perCollectionStats) {
    log(`  ${s.mode}:${s.slug.padEnd(20)} nodes=${s.nodes} products=${s.products}`)
  }
  log(DRY_RUN ? "\n(DRY-RUN — nothing written)" : "\nDone.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
