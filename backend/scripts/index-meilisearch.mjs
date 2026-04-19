#!/usr/bin/env node
import fs from "fs"
import pg from "pg"

const DB_URL = process.env.DATABASE_URL || "postgres://xlmarket:PG_PASSWORD_REDACTED@localhost:5435/xlmarket"
const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_API_KEY || "MEILI_LEGACY_KEY_REDACTED"
const INDEX = "products"
const BATCH = 500
const FEED_CACHE_PATH = new URL("../data/feeds/vevor-feed-cache.json", import.meta.url)

let feedCacheBySku = null
let feedCacheByUpc = null

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
    filterableAttributes: [
      "categories", "category_handles", "subcategory", "price", "in_stock", "translated", "filter_tokens",
      // Taxonomy v3 SSoT fields (F2.8). See docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §6.
      "taxonomy.l1_slug", "taxonomy.l2_slug", "taxonomy.l3_slug", "taxonomy.ancestors",
      "vertical_slugs",
      // Required for exact-match product lookups from the product page API
      // route (getMeiliProductByHandle). Without this, the filter silently
      // fails and breadcrumb candidates collapse to Medusa only — which can
      // return [] for products whose categories are not publicly listed.
      "handle",
    ],
    sortableAttributes: ["price", "created_at", "title_en"],
    displayedAttributes: ["*"],
    rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
    typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
    faceting: { maxValuesPerFacet: 500 },
    pagination: { maxTotalHits: 20000 },
  })
  console.log("✅ Seaded konfigureeritud")
}

// Build category ID → ancestor handles map (for adding all ancestor handles to products)
let categoryAncestorMap = {}

async function buildCategoryAncestorMap(client) {
  console.log("🗂  Laen kategooriapuud...")
  const { rows } = await client.query(
    "SELECT pc.id, pc.handle, pc.name, pc.parent_category_id, tnm.level " +
    "FROM product_category pc " +
    "LEFT JOIN taxonomy_node_meta tnm ON tnm.node_id = pc.id " +
    "WHERE pc.deleted_at IS NULL"
  )
  const byId = {}
  for (const r of rows) byId[r.id] = r

  // For each category, collect all ancestor handles (including self) plus
  // the L1/L2/L3 slug at the corresponding depth (SSoT-registered only).
  for (const r of rows) {
    const handles = []
    const names = []
    const byLevel = { 1: null, 2: null, 3: null }
    let current = r
    while (current) {
      handles.push(current.handle)
      names.push(current.name)
      if (current.level === 1) byLevel[1] = current.handle
      else if (current.level === 2) byLevel[2] = current.handle
      else if (current.level === 3) byLevel[3] = current.handle
      current = current.parent_category_id ? byId[current.parent_category_id] : null
    }
    categoryAncestorMap[r.id] = {
      handles,
      names,
      l1_slug: byLevel[1],
      l2_slug: byLevel[2],
      l3_slug: byLevel[3],
    }
  }
  console.log(`🗂  ${rows.length} kategooriat, ancestor map valmis`)
}

function loadFeedCache() {
  if (feedCacheBySku !== null && feedCacheByUpc !== null) {
    return { bySku: feedCacheBySku, byUpc: feedCacheByUpc }
  }

  feedCacheBySku = {}
  feedCacheByUpc = {}

  try {
    const raw = fs.readFileSync(FEED_CACHE_PATH, "utf8")
    const cache = JSON.parse(raw)
    feedCacheBySku = cache.bySku || {}
    feedCacheByUpc = cache.byUpc || {}
  } catch (error) {
    console.log("⚠️  VEVOR feed cache puudub või on katki, jätkan metadata põhjal")
  }

  return { bySku: feedCacheBySku, byUpc: feedCacheByUpc }
}

// PR #3: derive stock status from VEVOR feed cache (availability + inventoryQuantity)
function isOosFromFeed(sku) {
  if (!sku) return false
  const cache = loadFeedCache()
  const entry = cache.bySku?.[String(sku).trim()]
  if (!entry) return false
  if (entry.availability && entry.availability !== "in stock") return true
  if ((entry.inventoryQuantity || 0) === 0) return true
  return false
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
  // Resolve category IDs to handles + ancestor handles + taxonomy L1/L2/L3.
  // If a product sits under multiple leaves, we prefer the deepest L3 (then L2
  // then L1) seen. In practice post-F2.6 cleanup each product hits one branch.
  for (const row of rows) {
    const allHandles = new Set()
    const allNames = new Set()
    let bestL1 = null
    let bestL2 = null
    let bestL3 = null
    for (const catId of (row.category_ids || [])) {
      const ancestor = categoryAncestorMap[catId]
      if (!ancestor) continue
      for (const h of ancestor.handles) allHandles.add(h)
      for (const n of ancestor.names) allNames.add(n)
      if (ancestor.l3_slug && !bestL3) bestL3 = ancestor.l3_slug
      if (ancestor.l2_slug && !bestL2) bestL2 = ancestor.l2_slug
      if (ancestor.l1_slug && !bestL1) bestL1 = ancestor.l1_slug
    }
    row.category_handles = [...allHandles]
    row.categories = [...allNames]
    row.taxonomy = {
      l1_slug: bestL1,
      l2_slug: bestL2,
      l3_slug: bestL3,
      ancestors: [...allHandles],
    }
  }
  console.log("📦 " + rows.length + " toodet")
  return rows
}

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function normalizeFilterValue(value) {
  return slugify(String(value)).replace(/^-|-$/g, "")
}

function addFilterToken(tokens, token) {
  if (!token) return
  const normalized = String(token).trim()
  if (!normalized) return
  tokens.add(normalized)
}

function toNumber(value) {
  if (value === null || value === undefined) return null
  const parsed = Number.parseFloat(String(value).replace(",", ".").match(/-?\d+(?:\.\d+)?/)?.[0] || "")
  return Number.isFinite(parsed) ? parsed : null
}

function bucketRange(value, ranges) {
  for (const range of ranges) {
    if (value < range.max) return range.label
  }
  return ranges[ranges.length - 1].overflow
}

function convertToCm(value, unit) {
  const normalizedUnit = String(unit || "cm").toLowerCase()
  if (normalizedUnit === "mm") return value / 10
  if (normalizedUnit === "m") return value * 100
  return value
}

function formatRangeLabel(label, unit) {
  return `${label} ${unit}`.replace(/\s+/g, " ").trim()
}

function bucketWeightKg(value) {
  return bucketRange(value, [
    { max: 2, label: "under-2kg", overflow: "2kg+" },
    { max: 5, label: "2-5kg", overflow: "5kg+" },
    { max: 10, label: "5-10kg", overflow: "10kg+" },
    { max: 25, label: "10-25kg", overflow: "25kg+" },
    { max: 50, label: "25-50kg", overflow: "50kg+" },
  ])
}

function bucketLengthCm(value, unit) {
  const cm = convertToCm(value, unit)
  return bucketRange(cm, [
    { max: 20, label: "0-20cm", overflow: "20cm+" },
    { max: 50, label: "20-50cm", overflow: "50cm+" },
    { max: 100, label: "50-100cm", overflow: "100cm+" },
    { max: 200, label: "100-200cm", overflow: "200cm+" },
  ])
}

function bucketPower(value, unit) {
  const normalizedUnit = String(unit || "w").toLowerCase()
  const watts = normalizedUnit === "kw" ? value * 1000 : normalizedUnit === "hp" ? value * 745.7 : value
  return bucketRange(watts, [
    { max: 250, label: "0-250w", overflow: "250w+" },
    { max: 500, label: "250-500w", overflow: "500w+" },
    { max: 1000, label: "500-1000w", overflow: "1kw+" },
    { max: 2000, label: "1-2kw", overflow: "2kw+" },
    { max: 5000, label: "2-5kw", overflow: "5kw+" },
  ])
}

function bucketCapacity(value, unit) {
  const normalizedUnit = String(unit || "l").toLowerCase()
  let liters = value
  if (normalizedUnit === "ml") liters = value / 1000
  return bucketRange(liters, [
    { max: 1, label: "0-1l", overflow: "1l+" },
    { max: 5, label: "1-5l", overflow: "5l+" },
    { max: 10, label: "5-10l", overflow: "10l+" },
    { max: 20, label: "10-20l", overflow: "20l+" },
    { max: 50, label: "20-50l", overflow: "50l+" },
  ])
}

function detectColor(text) {
  const haystack = String(text || "").toLowerCase()
  const colors = [
    "black", "white", "gray", "grey", "silver", "red", "blue", "green",
    "orange", "yellow", "brown", "pink", "purple", "gold", "beige",
  ]
  for (const color of colors) {
    if (new RegExp(`\\b${color}\\b`, "i").test(haystack)) return color
  }
  return null
}

function extractFilterTokens(meta, cleanDesc, feedEntry) {
  const tokens = new Set()
  const weight = toNumber(meta?.weight_kg ?? feedEntry?.weightKg ?? feedEntry?.shippingWeightKg)
  if (weight !== null) {
    addFilterToken(tokens, `weight:${bucketWeightKg(weight)}`)
  }

  const dims = meta?.dimensions && typeof meta.dimensions === "object" ? meta.dimensions : feedEntry?.dimensions
  if (dims && typeof dims === "object") {
    const long = toNumber(dims.long)
    const wide = toNumber(dims.wide)
    const high = toNumber(dims.high)
    const unit = String(dims.unit || "cm")

    if (long !== null) addFilterToken(tokens, `length:${bucketLengthCm(long, unit)}`)
    const maxDim = [long, wide, high].filter((v) => v !== null && Number.isFinite(v))
    if (maxDim.length > 0) {
      addFilterToken(tokens, `size:${bucketLengthCm(Math.max(...maxDim), unit)}`)
    }
  }

  const text = `${cleanDesc || ""} ${feedEntry?.title || ""} ${meta?.goods_description_ad || ""}`
  const powerMatch = text.match(/(\d+(?:\.\d+)?)\s?(kw|w|hp)\b/i)
  if (powerMatch) {
    const rawValue = Number.parseFloat(powerMatch[1])
    const unit = powerMatch[2].toLowerCase()
    if (Number.isFinite(rawValue)) {
      addFilterToken(tokens, `power:${bucketPower(rawValue, unit)}`)
    }
  }

  const capacityMatch = text.match(/(\d+(?:\.\d+)?)\s?(ml|l)\b/i)
  if (capacityMatch) {
    const rawValue = Number.parseFloat(capacityMatch[1])
    const unit = capacityMatch[2].toLowerCase()
    if (Number.isFinite(rawValue)) {
      addFilterToken(tokens, `capacity:${bucketCapacity(rawValue, unit)}`)
    }
  }

  const color = detectColor(text)
  if (color) addFilterToken(tokens, `color:${color}`)

  return [...tokens]
}

function resolveFeedEntry(row) {
  const cache = loadFeedCache()
  const sku = String(row.sku || "").trim()
  if (sku && cache.bySku?.[sku]) return cache.bySku[sku]
  const upc = String(row.metadata?.vevor_upc || "").trim()
  if (upc && cache.byUpc?.[upc]) return cache.byUpc[upc]
  return null
}

function transform(row) {
  const meta = row.metadata || {}
  const categoryHandles = [...(row.category_handles || [])]
  const feedEntry = resolveFeedEntry(row)
  
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
  const filter_tokens = extractFilterTokens(meta, cleanDesc, feedEntry)

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
    filter_tokens,
    in_stock: !isOosFromFeed(row.sku),
    translated: meta.translated === true,
    created_at: Math.floor(new Date(row.created_at).getTime() / 1000),
    // Taxonomy v3 SSoT fields (F2.8). vertical_slugs populated by F4 materializer.
    taxonomy: row.taxonomy || { l1_slug: null, l2_slug: null, l3_slug: null, ancestors: [] },
    vertical_slugs: [],
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
