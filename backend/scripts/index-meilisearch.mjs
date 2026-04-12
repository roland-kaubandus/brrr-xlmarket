#!/usr/bin/env node
import pg from "pg"

const DB_URL = process.env.DATABASE_URL || "postgres://xlmarket:PG_PASSWORD_REDACTED@localhost:5435/xlmarket"
const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_API_KEY || "MEILI_LEGACY_KEY_REDACTED"
const INDEX = "products"
const BATCH = 500

async function meili(path, method = "GET", body = null) {
  const opts = { method, headers: { "Authorization": "Bearer " + MEILI_KEY, "Content-Type": "application/json" } }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch(MEILI_HOST + path, opts)
  const text = await r.text()
  if (!r.ok && r.status !== 202 && r.status !== 201) {
    throw new Error("MeiliSearch " + r.status + " " + method + " " + path + ": " + text.slice(0, 200))
  }
  return text ? JSON.parse(text) : {}
}

async function configureIndex() {
  console.log("⚙️  Seadistan indeksit...")
  // Create index
  try { await meili("/indexes", "POST", { uid: INDEX, primaryKey: "id" }) } catch {}
  // All settings in one call
  await meili("/indexes/" + INDEX + "/settings", "PATCH", {
    searchableAttributes: ["title_et", "title_en", "description_et", "description_en", "categories", "sku", "handle"],
    filterableAttributes: ["categories", "category_handles", "subcategory", "price", "in_stock", "translated"],
    sortableAttributes: ["price", "created_at", "title_en"],
    displayedAttributes: ["*"],
    rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
    typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
    faceting: { maxValuesPerFacet: 500 },
    pagination: { maxTotalHits: 5000 },
  })
  console.log("✅ Seaded konfigureeritud")
}

// Build category ID → ancestor handles map (for adding all ancestor handles to products)
let categoryAncestorMap = {}

async function buildCategoryAncestorMap(client) {
  console.log("🗂  Laen kategooriapuud...")
  const { rows } = await client.query(
    "SELECT id, handle, name, parent_category_id FROM product_category WHERE deleted_at IS NULL"
  )
  const byId = {}
  for (const r of rows) byId[r.id] = r

  // For each category, collect all ancestor handles (including self)
  for (const r of rows) {
    const handles = []
    const names = []
    let current = r
    while (current) {
      handles.push(current.handle)
      names.push(current.name)
      current = current.parent_category_id ? byId[current.parent_category_id] : null
    }
    categoryAncestorMap[r.id] = { handles, names }
  }
  console.log(`🗂  ${rows.length} kategooriat, ancestor map valmis`)
}

async function fetchProducts(client) {
  console.log("📦 Laen tooteid...")
  const { rows } = await client.query(
    "SELECT p.id, p.title, p.handle, p.description, p.thumbnail, p.status, p.created_at, p.metadata, " +
    "v.sku, COALESCE(pp.amount, 0) as price_cents, " +
    "array_agg(DISTINCT pcp.product_category_id) FILTER (WHERE pcp.product_category_id IS NOT NULL) as category_ids " +
    "FROM product p " +
    "LEFT JOIN product_variant v ON v.product_id = p.id AND v.deleted_at IS NULL " +
    "LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = v.id " +
    "LEFT JOIN price_set ps ON ps.id = pvps.price_set_id " +
    "LEFT JOIN price pp ON pp.price_set_id = ps.id AND pp.currency_code = 'eur' " +
    "LEFT JOIN product_category_product pcp ON pcp.product_id = p.id " +
    "WHERE p.status = 'published' AND p.deleted_at IS NULL " +
    "GROUP BY p.id, p.title, p.handle, p.description, p.thumbnail, " +
    "p.status, p.created_at, p.metadata, v.sku, pp.amount"
  )
  // Resolve category IDs to handles + ancestor handles
  for (const row of rows) {
    const allHandles = new Set()
    const allNames = new Set()
    for (const catId of (row.category_ids || [])) {
      const ancestor = categoryAncestorMap[catId]
      if (ancestor) {
        for (const h of ancestor.handles) allHandles.add(h)
        for (const n of ancestor.names) allNames.add(n)
      }
    }
    row.category_handles = [...allHandles]
    row.categories = [...allNames]
  }
  console.log("📦 " + rows.length + " toodet")
  return rows
}

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function transform(row) {
  const meta = row.metadata || {}
  const categoryHandles = [...(row.category_handles || [])]
  
  // Extract ALL levels from vevor_product_type and add as category_handles
  const productType = meta.vevor_product_type || ''
  const parts = productType.split('>').map(s => s.trim()).filter(Boolean)
  let subcategory = ''
  for (let i = 0; i < parts.length; i++) {
    const slug = slugify(parts[i])
    if (slug && !categoryHandles.includes(slug)) categoryHandles.push(slug)
    if (i === 1) subcategory = parts[i]
  }
  
  const cleanDesc = (row.description || '').replace(/<[^>]*>/g, ' ').slice(0, 2000)

  // title_en = always the original English title
  // title_et = Estonian translation (stored in metadata after translate scripts run)
  const title_en = meta.original_title || (meta.translated ? '' : row.title) || ''
  const title_et = meta.translated ? (meta.title_et || row.title) : (meta.title_et || '')
  const description_en = meta.original_description || (meta.translated ? '' : cleanDesc) || ''
  const description_et = meta.translated ? (meta.description_et || cleanDesc) : (meta.description_et || '')

  return {
    id: row.id,
    title: row.title || '',        // display field (current active title)
    title_en,                       // search: English
    title_et,                       // search: Estonian
    // future: title_ru, title_fi — same pattern
    handle: row.handle || '',
    description: cleanDesc,
    description_en,
    description_et,
    thumbnail: row.thumbnail || '',
    sku: row.sku || '',
    price: row.price_cents ? Math.round(row.price_cents) / 100 : 0,
    categories: row.categories || [],
    category_handles: categoryHandles,
    subcategory: subcategory,
    in_stock: true,
    translated: meta.translated === true,
    created_at: Math.floor(new Date(row.created_at).getTime() / 1000),
  }
}

async function indexDocs(docs) {
  console.log("🔄 Indekseerin " + docs.length + " toodet...")
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH)
    await meili("/indexes/" + INDEX + "/documents", "POST", batch)
    process.stdout.write("  " + Math.min(i + BATCH, docs.length) + "/" + docs.length + "\r")
  }
  console.log("\n✅ Saadetud")
}

async function waitDone() {
  process.stdout.write("⏳ Ootan indekseerimist...")
  for (;;) {
    const t = await meili("/tasks?statuses=enqueued,processing&limit=1")
    if (t.results.length === 0) break
    process.stdout.write(".")
    await new Promise(r => setTimeout(r, 1000))
  }
  console.log(" valmis!")
}

async function main() {
  const t0 = Date.now()
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()
  try {
    await configureIndex()
    await buildCategoryAncestorMap(client)
    const rows = await fetchProducts(client)
    const docs = rows.map(transform)
    await indexDocs(docs)
    await waitDone()
    const stats = await meili("/indexes/" + INDEX + "/stats")
    console.log("📊 Indeks: " + stats.numberOfDocuments + " dokumenti")
    console.log("⏱  " + ((Date.now() - t0) / 1000).toFixed(1) + "s")
  } finally { await client.end() }
}

main().catch(e => { console.error("❌", e.message); process.exit(1) })
