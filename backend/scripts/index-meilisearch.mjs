#!/usr/bin/env node
import pg from "pg"

const DB_URL = process.env.DATABASE_URL || "postgres://xlmarket:xlmarket_pg_2026_secure@localhost:5435/xlmarket"
const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_API_KEY || "xlmarket2024_secure_key"
const INDEX = "products"
const BATCH = 500

async function meili(path, method = "GET", body = null) {
  const opts = { method, headers: { "Authorization": `Bearer ${MEILI_KEY}`, "Content-Type": "application/json" } }
  if (body) opts.body = JSON.stringify(body)
  const response = await fetch(MEILI_HOST + path, opts)
  const text = await response.text()
  if (!response.ok && response.status !== 202 && response.status !== 201) {
    throw new Error(`MeiliSearch ${response.status} ${method} ${path}: ${text.slice(0, 200)}`)
  }
  return text ? JSON.parse(text) : {}
}

async function configureIndex() {
  console.log("⚙️  Seadistan indeksit...")
  try {
    await meili("/indexes", "POST", { uid: INDEX, primaryKey: "id" })
  } catch {}

  await meili(`/indexes/${INDEX}/settings`, "PATCH", {
    searchableAttributes: [
      "title",
      "original_title",
      "description",
      "original_description",
      "selling_points_text",
      "original_selling_points_text",
      "categories",
      "sku",
      "handle",
    ],
    filterableAttributes: ["categories", "category_handles", "subcategory", "price", "in_stock", "translated"],
    sortableAttributes: ["price", "created_at", "title"],
    displayedAttributes: ["*"],
    rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
    typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
    faceting: { maxValuesPerFacet: 500 },
    pagination: { maxTotalHits: 5000 },
  })
  console.log("✅ Seaded konfigureeritud")
}

async function fetchProducts(client) {
  console.log("📦 Laen tooteid...")
  const { rows } = await client.query(
    "SELECT p.id, p.title, p.handle, p.description, p.thumbnail, p.status, p.created_at, p.metadata, " +
    "v.sku, COALESCE(pp.amount, 0) as price_cents, " +
    "array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as categories, " +
    "array_agg(DISTINCT c.handle) FILTER (WHERE c.handle IS NOT NULL) as category_handles " +
    "FROM product p " +
    "LEFT JOIN product_variant v ON v.product_id = p.id AND v.deleted_at IS NULL " +
    "LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = v.id " +
    "LEFT JOIN price_set ps ON ps.id = pvps.price_set_id " +
    "LEFT JOIN price pp ON pp.price_set_id = ps.id AND pp.currency_code = 'eur' " +
    "LEFT JOIN product_category_product pcp ON pcp.product_id = p.id " +
    "LEFT JOIN product_category c ON c.id = pcp.product_category_id " +
    "WHERE p.status = 'published' AND p.deleted_at IS NULL " +
    "GROUP BY p.id, p.title, p.handle, p.description, p.thumbnail, " +
    "p.status, p.created_at, p.metadata, v.sku, pp.amount"
  )
  console.log(`📦 ${rows.length} toodet`)
  return rows
}

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function normalizeText(value) {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

function getSellingPoint(meta, index) {
  const direct = normalizeText(meta[`selling_point_${index}`])
  if (direct) return direct
  if (Array.isArray(meta.selling_points) && meta.selling_points[index - 1]) {
    return normalizeText(meta.selling_points[index - 1])
  }
  return ""
}

function getOriginalSellingPoint(meta, index) {
  const direct = normalizeText(meta[`original_selling_point_${index}`])
  if (direct) return direct
  if (Array.isArray(meta.original_selling_points) && meta.original_selling_points[index - 1]) {
    return normalizeText(meta.original_selling_points[index - 1])
  }
  return ""
}

function transform(row) {
  const meta = row.metadata || {}
  const categoryHandles = [...(row.category_handles || [])]
  const productType = meta.vevor_product_type || ""
  const parts = productType.split(">").map((item) => item.trim()).filter(Boolean)
  let subcategory = ""

  for (let index = 0; index < parts.length; index++) {
    const slug = slugify(parts[index])
    if (slug && !categoryHandles.includes(slug)) categoryHandles.push(slug)
    if (index === 1) subcategory = parts[index]
  }

  const activeTitle = normalizeText(row.title)
  const cleanDesc = normalizeText((row.description || "").replace(/<[^>]*>/g, " ").slice(0, 2000))
  const originalTitle = normalizeText(meta.original_title)
  const originalDescription = normalizeText(meta.original_description)
  const legacyTitleEt = normalizeText(meta.title_et)
  const legacyDescriptionEt = normalizeText(meta.description_et)

  const titleEt = legacyTitleEt || (meta.translated ? activeTitle : "")
  const titleEn = originalTitle || (!meta.translated ? activeTitle : "")
  const descriptionEt = legacyDescriptionEt || (meta.translated ? cleanDesc : "")
  const descriptionEn = originalDescription || (!meta.translated ? cleanDesc : "")

  const sellingPoint1 = getSellingPoint(meta, 1)
  const sellingPoint2 = getSellingPoint(meta, 2)
  const sellingPoint3 = getSellingPoint(meta, 3)
  const sellingPoint4 = getSellingPoint(meta, 4)
  const sellingPoint5 = getSellingPoint(meta, 5)
  const originalSellingPoint1 = getOriginalSellingPoint(meta, 1)
  const originalSellingPoint2 = getOriginalSellingPoint(meta, 2)
  const originalSellingPoint3 = getOriginalSellingPoint(meta, 3)
  const originalSellingPoint4 = getOriginalSellingPoint(meta, 4)
  const originalSellingPoint5 = getOriginalSellingPoint(meta, 5)

  return {
    id: row.id,
    title: activeTitle,
    original_title: originalTitle,
    title_et: titleEt,
    title_en: titleEn,
    handle: row.handle || "",
    description: cleanDesc,
    original_description: originalDescription,
    description_et: descriptionEt,
    description_en: descriptionEn,
    selling_point_1: sellingPoint1,
    selling_point_2: sellingPoint2,
    selling_point_3: sellingPoint3,
    selling_point_4: sellingPoint4,
    selling_point_5: sellingPoint5,
    original_selling_point_1: originalSellingPoint1,
    original_selling_point_2: originalSellingPoint2,
    original_selling_point_3: originalSellingPoint3,
    original_selling_point_4: originalSellingPoint4,
    original_selling_point_5: originalSellingPoint5,
    selling_points_text: [sellingPoint1, sellingPoint2, sellingPoint3, sellingPoint4, sellingPoint5].filter(Boolean).join(" "),
    original_selling_points_text: [
      originalSellingPoint1,
      originalSellingPoint2,
      originalSellingPoint3,
      originalSellingPoint4,
      originalSellingPoint5,
    ].filter(Boolean).join(" "),
    thumbnail: row.thumbnail || "",
    sku: row.sku || "",
    price: row.price_cents ? Math.round(row.price_cents) / 100 : 0,
    categories: row.categories || [],
    category_handles: categoryHandles,
    subcategory,
    in_stock: true,
    translated: meta.translated === true,
    created_at: Math.floor(new Date(row.created_at).getTime() / 1000),
  }
}

async function indexDocs(docs) {
  console.log(`🔄 Indekseerin ${docs.length} toodet...`)
  for (let index = 0; index < docs.length; index += BATCH) {
    const batch = docs.slice(index, index + BATCH)
    await meili(`/indexes/${INDEX}/documents`, "POST", batch)
    process.stdout.write(`  ${Math.min(index + BATCH, docs.length)}/${docs.length}\r`)
  }
  console.log("\n✅ Saadetud")
}

async function waitDone() {
  process.stdout.write("⏳ Ootan indekseerimist...")
  for (;;) {
    const tasks = await meili("/tasks?statuses=enqueued,processing&limit=1")
    if (tasks.results.length === 0) break
    process.stdout.write(".")
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  console.log(" valmis!")
}

async function main() {
  const start = Date.now()
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()

  try {
    await configureIndex()
    const rows = await fetchProducts(client)
    const docs = rows.map(transform)
    await indexDocs(docs)
    await waitDone()
    const stats = await meili(`/indexes/${INDEX}/stats`)
    console.log(`📊 Indeks: ${stats.numberOfDocuments} dokumenti`)
    console.log(`⏱  ${((Date.now() - start) / 1000).toFixed(1)}s`)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error("❌", error.message)
  process.exit(1)
})
