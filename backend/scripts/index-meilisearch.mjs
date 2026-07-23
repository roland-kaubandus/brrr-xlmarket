#!/usr/bin/env node
import fs from "fs"
import pg from "pg"
import { extractSpecs } from "../src/filters/spec-extractor.mjs"
import { generateFilterTokens } from "../src/filters/filter-profiles.mjs"

const DB_URL = process.env.DATABASE_URL || `postgres://xlmarket:${process.env.PGPASSWORD}@localhost:5435/xlmarket`
const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_KEY
const INDEX = "products"
const BATCH = 500
// Cache-path env-override (nt kui ../data/feeds pole kirjutatav — Coolify konteiner → /tmp).
const FEED_CACHE_PATH = process.env.FEED_CACHE_PATH || new URL("../data/feeds/vevor-feed-cache.json", import.meta.url)

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
  // Create index — "already exists" (4xx with 'already_exists' code) is OK,
  // anything else (auth, disk, corrupt) must fail fast so we don't upload
  // 17k docs into a broken index (audit 2026-04-20 C4).
  try {
    await meili("/indexes", "POST", { uid: INDEX, primaryKey: "id" })
  } catch (e) {
    const msg = e && e.message ? String(e.message) : ""
    if (!msg.includes("index_already_exists") && !msg.match(/\b409\b/)) {
      throw e
    }
  }
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
// Churned-fix (2026-07-22): feed-managed toode, mis KADUS feedist → OOS (dropship'i ei saa
// tarnida kui tarnija ei paku). Feed-managed = variant-sku === vevor_sku. Käsitsi/Outlet
// (custom sku ≠ vevor_sku, nt "...-OUTLET") → EI OOS (jäta saadavaks).
function isOosFromFeed(sku, meta) {
  if (!sku) return false
  const cache = loadFeedCache()
  // SAFETY-GUARD: kui feed-cache tühi/puudub → ÄRA OOS'i kõike (churned-loogika vajab TÖÖTAVAT cache't).
  // Ilma selleta: cache puudub → iga toode "pole feedis" → kõik OOS. Tühi cache → vana ohutu käitumine (laos).
  if (!cache.bySku || Object.keys(cache.bySku).length === 0) return false
  const entry = cache.bySku[String(sku).trim()]
  if (entry) {
    if (entry.availability && entry.availability !== "in stock") return true
    if ((entry.inventoryQuantity || 0) === 0) return true
    return false
  }
  // POLE feedis: churned dropship → OOS AINULT kui feed-managed (variant-sku === vevor_sku).
  const vevorSku = meta && meta.vevor_sku ? String(meta.vevor_sku).trim() : null
  return vevorSku && vevorSku === String(sku).trim() ? true : false
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
    // Arhiveeritud (feed_status='archived') → EI indekseerita → kaob otsingust/listingust.
    // Toode jääb Medusa's published → toote-API loeb Medusa'st → LEHT+URL renderdub (SEO). Vt archive-proposals.mjs.
    "WHERE p.status = 'published' AND p.deleted_at IS NULL " +
    "AND (p.metadata->>'feed_status' IS DISTINCT FROM 'archived') " +
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


function resolveFeedEntry(row) {
  const cache = loadFeedCache()
  const sku = String(row.sku || "").trim()
  if (sku && cache.bySku?.[sku]) return cache.bySku[sku]
  const upc = String(row.metadata?.vevor_upc || "").trim()
  if (upc && cache.byUpc?.[upc]) return cache.byUpc[upc]
  return null
}

/**
 * Tuleta brändi-slug tootemetadata'st (cms/brands.yaml `filter: brand:<slug>`).
 * Prioriteet: 1) multi-feed `source`, 2) `supplier_sku` prefiks (VV-/PM-),
 * 3) VEVOR-i legacy metadata (vevor_*). Tundmatu → null (brand-tokenit ei lisa).
 */
function deriveBrandSlug(meta) {
  const src = String(meta.source || "").trim().toLowerCase()
  if (src) return src
  const ssku = String(meta.supplier_sku || "").trim().toUpperCase()
  if (ssku.startsWith("PM-")) return "powermat"
  if (ssku.startsWith("VV-")) return "vevor"
  if (meta.vevor_sku || meta.vevor_product_type || meta.vevor_upc) return "vevor"
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

  // Adaptive filter tokens — spec extraction + per-category profile (F6).
  // Profile matching walks L2 first, then L1, then falls back to `_fallback`.
  const specs = extractSpecs(feedEntry, { ...meta, dimensions: meta?.dimensions ?? feedEntry?.dimensions })
  const profileKeys = [
    row.taxonomy?.l2_slug,
    row.taxonomy?.l1_slug,
  ].filter(Boolean)
  const filter_tokens = generateFilterTokens(specs, profileKeys)

  // Brändi-token (esilehe brand-carousel + otsingu brand-filter, cms/brands.yaml).
  // Tuletus: multi-feed source → supplier_sku prefix → VEVOR metadata fallback.
  const brandSlug = deriveBrandSlug(meta)
  if (brandSlug) filter_tokens.push(`brand:${brandSlug}`)

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
    // Hover-pildivahetus (VEVOR-stiil): gallery_images[0] = TEINE pilt (≠ thumbnail).
    // Kaart näitab hover'il seda; tühi gallery (5%) → null → kaart ei vaheta.
    hover_image: (Array.isArray(meta.gallery_images) && typeof meta.gallery_images[0] === 'string' && meta.gallery_images[0])
      ? meta.gallery_images[0].replace(/\/goods_img-/, '/original_img-')
      : null,
    sku: row.sku || '',
    price: row.price_cents ? Math.round(row.price_cents) / 100 : 0,
    categories: row.categories || [],
    category_handles: categoryHandles,
    subcategory: subcategory,
    filter_tokens,
    specs,
    compare_specs: meta.specs || null,
    in_stock: !isOosFromFeed(row.sku, meta),
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

// SAFETY-VÄRAV (2026-07-23): reindeks ilma feed-cache'ita OOS'is churned-loogika kaudu MITTE ühtki
// (isOosFromFeed tagastab tühja cache'i puhul false) → KÕIK tooted in_stock=true → vaikne revert.
// 2026-07-22 juhtum: konteineri /data-volume tühi → 3 reindeksit → OOS 6420 → 0. Parem katkestada
// VALJULT kui vaikselt kõik laos-tada. Override: ALLOW_EMPTY_FEED_CACHE=1 (esmakäivitus / teadlik test).
function preflightFeedCache() {
  if (process.env.ALLOW_EMPTY_FEED_CACHE === "1") {
    console.warn("⚠️  ALLOW_EMPTY_FEED_CACHE=1 — luban tühja feed-cache'i (kõik jäävad laos). Ainult esmakäivitus/test.")
    return
  }
  const { bySku } = loadFeedCache()
  const n = bySku ? Object.keys(bySku).length : 0
  if (n === 0) {
    console.error("❌ ABORT: feed-cache tühi/puudub (" + String(FEED_CACHE_PATH) + ").")
    console.error("   Reindeks ilma cache'ita määraks KÕIK tooted in_stock=true (churned→OOS revert).")
    console.error("   Paranda: värskenda cache (scripts/refresh-feed-cache.sh) VÕI sea ALLOW_EMPTY_FEED_CACHE=1 kui tõesti soovid.")
    process.exit(2)
  }
  console.log("✓ feed-cache OK (" + n + " SKU) — churned→OOS aktiivne.")
}

async function main() {
  const t0 = Date.now()
  preflightFeedCache()
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
