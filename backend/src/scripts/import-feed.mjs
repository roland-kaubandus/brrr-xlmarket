/**
 * WO-XLM-003: VEVOR XLSX Feed Importer
 *
 * Downloads VEVOR product feed and imports into Medusa.
 * Price formula: original_price * 1.15
 *
 * Usage:
 *   node src/scripts/import-feed.mjs                    # full import
 *   node src/scripts/import-feed.mjs --limit 50         # test with 50 products
 *   node src/scripts/import-feed.mjs --dry-run          # parse only, no API calls
 *   node src/scripts/import-feed.mjs --stock-only       # update stock/prices only
 */

import ExcelJS from "exceljs"
import https from "https"
import http from "http"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Config
const FEED_URL = "https://ads-feed.s3.us-west-2.amazonaws.com/ads/business/132/vevor-132.xlsx"
const PRICE_MARKUP = 1.15
const MEDUSA_URL = process.env.MEDUSA_URL || "http://127.0.0.1:9001"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "tarmo@xlmarket.eu"
const ADMIN_PASS = process.env.ADMIN_PASS
if (!ADMIN_PASS) throw new Error("ADMIN_PASS env variable required")
const FEED_DIR = path.join(__dirname, "../../data/feeds")
const BATCH_SIZE = 20 // concurrent API calls per batch
const SALES_CHANNEL_ID = process.env.SALES_CHANNEL_ID || ""

// Category mapping
const categoryMap = JSON.parse(
  fs.readFileSync(path.join(__dirname, "category-map.json"), "utf-8")
)

// Parse CLI args
const args = process.argv.slice(2)
const LIMIT = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1]) : 0
const DRY_RUN = args.includes("--dry-run")
const STOCK_ONLY = args.includes("--stock-only")

// ── Helpers ──

async function authenticate() {
  const resp = await apiCall("POST", "/auth/user/emailpass", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  }, false)
  return resp.token
}

function apiCall(method, endpoint, body, useAuth = true) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, MEDUSA_URL)
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { "Content-Type": "application/json" },
    }
    if (useAuth && globalToken) {
      options.headers["Authorization"] = `Bearer ${globalToken}`
    }

    const proto = url.protocol === "https:" ? https : http
    const req = proto.request(options, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve({ raw: data, status: res.statusCode })
        }
      })
    })
    req.on("error", reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject)
      }
      response.pipe(file)
      file.on("finish", () => { file.close(); resolve() })
    }).on("error", (err) => { fs.unlink(dest, () => {}); reject(err) })
  })
}

function parsePrice(priceStr) {
  if (!priceStr) return null
  const match = String(priceStr).match(/([\d,.]+)/)
  if (!match) return null
  return parseFloat(match[1].replace(",", ""))
}

function mapCategory(productType) {
  if (!productType) return null
  const l1 = productType.split(">")[0].trim()
  return categoryMap[l1] || null
}

function makeHandle(sku, title) {
  const cleanSku = (sku || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
  const base = (title || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 70)
  return `${base}-${cleanSku}`.replace(/-{2,}/g, "-")
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Main ──

let globalToken = null
let stats = { total: 0, created: 0, updated: 0, skipped: 0, errors: 0, unmapped: 0 }
let categoryIdCache = {}
let existingProducts = {}
let existingVariants = {}

async function loadCategoryIds() {
  const resp = await apiCall("GET", "/admin/product-categories?limit=100")
  for (const cat of resp.product_categories || []) {
    categoryIdCache[cat.handle] = cat.id
  }
  console.log(`  Loaded ${Object.keys(categoryIdCache).length} categories`)
}

async function loadExistingProducts() {
  let offset = 0
  const limit = 100
  let total = Infinity

  while (offset < total) {
    const resp = await apiCall("GET", `/admin/products?limit=${limit}&offset=${offset}`)
    total = resp.count || 0
    for (const p of resp.products || []) {
      const sku = p.metadata?.vevor_sku
      if (sku) existingProducts[sku] = p.id
    }
    offset += limit
    if ((resp.products || []).length === 0) break
  }
  console.log(`  Loaded ${Object.keys(existingProducts).length} existing products`)
}

async function loadSalesChannelId() {
  if (SALES_CHANNEL_ID) return SALES_CHANNEL_ID
  const resp = await apiCall("GET", "/admin/stores")
  return resp.stores?.[0]?.default_sales_channel_id || ""
}

async function createProduct(row, salesChannelId) {
  const { sku, title, description, price, availability, inventory, image, productType, weight, upc, link } = row

  const finalPrice = Math.round(price * PRICE_MARKUP * 100) // cents
  const categoryHandle = mapCategory(productType)
  const categoryId = categoryHandle ? categoryIdCache[categoryHandle] : null

  if (!categoryHandle) {
    const l1 = (productType || "").split(">")[0].trim()
    if (l1 && !unmappedCategories.has(l1)) {
      unmappedCategories.add(l1)
      stats.unmapped++
    }
  }

  const handle = makeHandle(sku, title)
  const isInStock = availability === "in stock"

  const productData = {
    title: title,
    handle: handle,
    description: description || "",
    status: "published",
    is_giftcard: false,
    metadata: {
      vevor_sku: sku,
      vevor_upc: upc || "",
      vevor_link: link || "",
      vevor_product_type: productType || "",
      weight_kg: weight || 0,
    },
    images: image ? [{ url: image }] : [],
    options: [
      { title: "Default", values: ["Default"] }
    ],
    variants: [
      {
        title: "Default",
        sku: sku,
        barcode: upc || undefined,
        manage_inventory: true,
        prices: [
          { amount: finalPrice, currency_code: "eur" }
        ],
        options: { Default: "Default" },
      }
    ],
    sales_channels: salesChannelId ? [{ id: salesChannelId }] : [],
  }

  if (categoryId) {
    productData.categories = [{ id: categoryId }]
  }

  try {
    const resp = await apiCall("POST", "/admin/products", productData)
    if (resp.product) {
      stats.created++
      return resp.product.id
    } else {
      if (resp.message?.includes("already exists") || resp.code === "duplicate_error") {
        stats.skipped++
      } else {
        stats.errors++
        if (stats.errors <= 10) {
          console.error(`  ERROR creating ${sku}: ${resp.message || JSON.stringify(resp).substring(0, 200)}`)
        }
      }
      return null
    }
  } catch (err) {
    stats.errors++
    if (stats.errors <= 10) console.error(`  ERROR ${sku}: ${err.message}`)
    return null
  }
}

async function updateProduct(productId, row) {
  const finalPrice = Math.round(row.price * PRICE_MARKUP * 100)
  const isInStock = row.availability === "in stock"

  try {
    await apiCall("POST", `/admin/products/${productId}`, {
      status: "published",
      metadata: {
        vevor_sku: row.sku,
        weight_kg: row.weight || 0,
      },
    })
    // Fetch variant ID and update price
    const prodResp = await apiCall("GET", `/admin/products/${productId}?fields=id,variants.id`)
    const variantId = prodResp.product?.variants?.[0]?.id
    if (variantId) {
      await apiCall("POST", `/admin/products/${productId}/variants/${variantId}`, {
        prices: [{ amount: finalPrice, currency_code: "eur" }],
      })
    }
    stats.updated++
  } catch (err) {
    stats.errors++
  }
}
const unmappedCategories = new Set()

async function main() {
  console.log("╔══════════════════════════════════════════════╗")
  console.log("║  XLMARKET — VEVOR Feed Importer v1.0        ║")
  console.log("╚══════════════════════════════════════════════╝")
  console.log("")

  if (DRY_RUN) console.log("  MODE: DRY RUN (no API calls)")
  if (STOCK_ONLY) console.log("  MODE: STOCK ONLY (update existing)")
  if (LIMIT) console.log(`  LIMIT: ${LIMIT} products`)
  console.log("")

  // 1. Download feed
  const feedPath = path.join(FEED_DIR, "vevor-latest.xlsx")
  console.log("[1/5] Downloading XLSX feed...")
  await downloadFile(FEED_URL, feedPath)
  const fileSize = (fs.statSync(feedPath).size / 1024 / 1024).toFixed(1)
  console.log(`  Downloaded: ${fileSize} MB`)

  // 2. Parse XLSX
  console.log("[2/5] Parsing XLSX...")
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(feedPath)
  const sheet = workbook.worksheets[0]
  const rows = []
  const headers = []

  sheet.eachRow((row, rowNum) => {
    const vals = row.values.slice(1) // exceljs is 1-indexed
    if (rowNum === 1) {
      vals.forEach((v) => headers.push(String(v || "").trim()))
      return
    }

    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] })

    const sku = String(obj["SKU"] || "").trim()
    if (!sku) return

    const price = parsePrice(obj["Price"])
    if (!price) return

    rows.push({
      sku,
      title: String(obj["Product title"] || "").trim(),
      description: String(obj["Product description"] || "").trim(),
      link: String(obj["Product link"] || "").trim(),
      upc: String(obj["UPC"] || "").trim(),
      price,
      availability: String(obj["Availability"] || "").trim().toLowerCase(),
      inventory: parseInt(obj["Inventory quantity"]) || 0,
      weight: parseFloat(obj["Product weight (KG)"]) || 0,
      image: String(obj["Image link"] || "").trim(),
      productType: String(obj["Product type"] || "").trim(),
    })
  })

  console.log(`  Parsed: ${rows.length} valid products`)
  console.log(`  Headers: ${headers.join(", ")}`)

  const toProcess = LIMIT ? rows.slice(0, LIMIT) : rows
  stats.total = toProcess.length
  console.log(`  Processing: ${toProcess.length} products`)

  if (DRY_RUN) {
    // Show stats and exit
    const catCounts = {}
    for (const row of toProcess) {
      const cat = mapCategory(row.productType) || "UNMAPPED"
      catCounts[cat] = (catCounts[cat] || 0) + 1
    }
    console.log("\n  Category distribution:")
    for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${cat}: ${count}`)
    }
    console.log("\n  Price stats:")
    const prices = toProcess.map((r) => r.price * PRICE_MARKUP)
    console.log(`    Min: €${Math.min(...prices).toFixed(2)}`)
    console.log(`    Max: €${Math.max(...prices).toFixed(2)}`)
    console.log(`    Avg: €${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)}`)
    const inStock = toProcess.filter((r) => r.availability === "in stock").length
    console.log(`\n  In stock: ${inStock} (${((inStock / toProcess.length) * 100).toFixed(1)}%)`)
    console.log("\n  DRY RUN complete. No products created.")
    return
  }

  // 3. Authenticate
  console.log("[3/5] Authenticating...")
  globalToken = await authenticate()
  console.log("  Authenticated OK")

  // 4. Load existing data
  console.log("[4/5] Loading existing data...")
  await loadCategoryIds()
  await loadExistingProducts()
  const salesChannelId = await loadSalesChannelId()
  console.log(`  Sales channel: ${salesChannelId}`)

  // 5. Import products
  console.log("[5/5] Importing products...")
  const startTime = Date.now()

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async (row) => {
      const existingId = existingProducts[row.sku]
      if (existingId) {
        if (STOCK_ONLY) {
          await updateProduct(existingId, row)
        } else {
          stats.skipped++
        }
      } else if (!STOCK_ONLY) {
        await createProduct(row, salesChannelId)
      }
    })
    await Promise.all(promises)

    const done = Math.min(i + BATCH_SIZE, toProcess.length)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const rate = (done / ((Date.now() - startTime) / 1000)).toFixed(1)
    process.stdout.write(`\r  Progress: ${done}/${toProcess.length} (${rate}/s, ${elapsed}s)`)
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log("\n")
  console.log("╔══════════════════════════════════════════════╗")
  console.log("║  IMPORT COMPLETE                             ║")
  console.log("╚══════════════════════════════════════════════╝")
  console.log(`  Total:    ${stats.total}`)
  console.log(`  Created:  ${stats.created}`)
  console.log(`  Updated:  ${stats.updated}`)
  console.log(`  Skipped:  ${stats.skipped}`)
  console.log(`  Errors:   ${stats.errors}`)
  console.log(`  Unmapped: ${stats.unmapped} categories`)
  console.log(`  Time:     ${totalTime}s`)

  if (unmappedCategories.size > 0) {
    console.log(`\n  Unmapped L1 categories:`)
    for (const cat of unmappedCategories) {
      console.log(`    - "${cat}"`)
    }
  }
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
