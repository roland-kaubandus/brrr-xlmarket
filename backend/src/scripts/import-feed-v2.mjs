/**
 * XLMARKET — VEVOR Feed Importer v2.0
 *
 * Imports vevor-571.xlsx with:
 *   - Category tree from Product type paths
 *   - Multi-variant products grouped by goods_spu
 *   - Rich metadata (selling points, HTML description, gallery, dimensions)
 *
 * Usage:
 *   node src/scripts/import-feed-v2.mjs                     # full import
 *   node src/scripts/import-feed-v2.mjs --limit 50          # process 50 SPU groups
 *   node src/scripts/import-feed-v2.mjs --dry-run            # parse only, show stats
 *   node src/scripts/import-feed-v2.mjs --stock-only         # update existing products
 *   node src/scripts/import-feed-v2.mjs --categories-only    # only create category tree
 *   node src/scripts/import-feed-v2.mjs --delete-categories  # delete all categories first
 *
 * Env:
 *   ADMIN_PASS          — required (tarmo@xlmarket.eu password)
 *   MEDUSA_URL           — default http://127.0.0.1:9001
 *   ADMIN_EMAIL          — default tarmo@xlmarket.eu
 *   SALES_CHANNEL_ID     — auto-detected if omitted
 */

import ExcelJS from "exceljs"
import http from "http"
import https from "https"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Config ──
const PRICE_MARKUP = 1.15
const MEDUSA_URL = process.env.MEDUSA_URL || "http://127.0.0.1:9001"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "tarmo@xlmarket.eu"
const ADMIN_PASS = process.env.ADMIN_PASS
const FEED_PATH = path.resolve(__dirname, "../../data/feeds/vevor-571.xlsx")
const BATCH_SIZE = 10
const SALES_CHANNEL_ID = process.env.SALES_CHANNEL_ID || ""

// ── CLI args ──
const args = process.argv.slice(2)
const LIMIT = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1]) : 0
const DRY_RUN = args.includes("--dry-run")
const STOCK_ONLY = args.includes("--stock-only")
const CATEGORIES_ONLY = args.includes("--categories-only")
const DELETE_CATEGORIES = args.includes("--delete-categories")

// ── Global state ──
let globalToken = null
const stats = {
  totalRows: 0,
  totalSpuGroups: 0,
  productsCreated: 0,
  variantsCreated: 0,
  categoriesCreated: 0,
  categoriesExisted: 0,
  categoriesDeleted: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
}

// ── HTTP helpers ──

function apiCall(method, endpoint, body, useAuth = true) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, MEDUSA_URL)
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
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
        if (res.statusCode === 429) {
          resolve({ __rate_limited: true, status: 429 })
          return
        }
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

async function apiCallWithRetry(method, endpoint, body, useAuth = true, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await apiCall(method, endpoint, body, useAuth)
    if (resp.__rate_limited && attempt < maxRetries) {
      const delay = Math.pow(2, attempt + 1) * 1000 // 2s, 4s, 8s
      console.log(`  Rate limited on ${endpoint}, retrying in ${delay / 1000}s...`)
      await sleep(delay)
      continue
    }
    return resp
  }
}

async function authenticate() {
  const resp = await apiCall(
    "POST",
    "/auth/user/emailpass",
    { email: ADMIN_EMAIL, password: ADMIN_PASS },
    false
  )
  if (!resp.token) {
    throw new Error(`Auth failed: ${JSON.stringify(resp).substring(0, 200)}`)
  }
  return resp.token
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Data helpers ──

function parsePrice(priceStr) {
  if (!priceStr) return null
  const match = String(priceStr).match(/([\d,.]+)/)
  if (!match) return null
  return parseFloat(match[1].replace(",", ""))
}

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
}

function makeHandle(sku, title) {
  const cleanSku = slugify(sku || "product")
  const base = slugify(title || "product").substring(0, 70)
  return `${base}-${cleanSku}`.replace(/-{2,}/g, "-")
}

function splitCommaUrls(str) {
  if (!str) return []
  return String(str)
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http"))
}

// ── Phase 1: Parse XLSX ──

async function parseXlsx() {
  console.log("[Phase 1] Parsing XLSX...")
  if (!fs.existsSync(FEED_PATH)) {
    throw new Error(`Feed file not found: ${FEED_PATH}`)
  }
  const fileSize = (fs.statSync(FEED_PATH).size / 1024 / 1024).toFixed(1)
  console.log(`  File: ${FEED_PATH} (${fileSize} MB)`)

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(FEED_PATH)
  const sheet = workbook.worksheets[0]
  const headers = []
  const rows = []

  sheet.eachRow((row, rowNum) => {
    const vals = row.values.slice(1)
    if (rowNum === 1) {
      vals.forEach((v) => headers.push(String(v || "").trim()))
      return
    }

    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = vals[i]
    })

    const sku = String(obj["SKU"] || "").trim()
    if (!sku) return

    const price = parsePrice(obj["Price"])
    if (!price) return

    const sp1 = String(obj["Selling point 1"] || "").trim()
    const sp2 = String(obj["Selling point 2"] || "").trim()
    const sp3 = String(obj["Selling point 3"] || "").trim()
    const sp4 = String(obj["Selling point 4"] || "").trim()
    const sp5 = String(obj["Selling point 5"] || "").trim()

    rows.push({
      sku,
      country: String(obj["Country"] || "").trim(),
      title: String(obj["Product title"] || "").trim(),
      description: String(obj["Product description"] || "").trim(),
      link: String(obj["Product link"] || "").trim(),
      condition: String(obj["Product condition"] || "").trim(),
      price,
      availability: String(obj["Availability"] || "").trim().toLowerCase(),
      inventoryQty: parseInt(obj["Inventory quantity"]) || 0,
      weightKg: parseFloat(obj["Product weight(KG)"]) || 0,
      imageLink: String(obj["Image link"] || "").trim(),
      brand: String(obj["Brand"] || "").trim(),
      productType: String(obj["Product type"] || "").trim(),
      originalPictures: splitCommaUrls(obj["goods_original_picture"]),
      mainOriginalPicture: String(obj["goods_main_original_picture"] || "").trim(),
      sellingPoints: [sp1, sp2, sp3, sp4, sp5].filter(Boolean),
      attributeName1: String(obj["attribute_name_1"] || "").trim(),
      attribute1: String(obj["attribute_1"] || "").trim(),
      attributeName2: String(obj["attribute_name_2"] || "").trim(),
      attribute2: String(obj["attribute_2"] || "").trim(),
      descriptionAd: String(obj["goods_description_ad"] || "").trim(),
      descriptionHtml: String(obj["description_html"] || "").trim(),
      dimensions: {
        high: parseFloat(obj["High"]) || 0,
        wide: parseFloat(obj["Wide"]) || 0,
        long: parseFloat(obj["Long"]) || 0,
        unit: String(obj["goods_size_unit"] || "").trim(),
      },
      goodsWeight: parseFloat(obj["Goods Weight"]) || 0,
      goodsWeightUnit: String(obj["goods_weight_unit"] || "").trim(),
      shippingWeight: parseFloat(obj["Shipping Weight"]) || 0,
      galleryImages: splitCommaUrls(obj["image_link1"]),
      spu: String(obj["goods_spu"] || "").trim(),
      upc: String(obj["UPC"] || "").trim(),
    })
  })

  stats.totalRows = rows.length
  console.log(`  Parsed: ${rows.length} valid rows from ${sheet.rowCount - 1} total`)
  console.log(`  Headers: ${headers.length} columns`)
  return rows
}

// ── Phase 2: Category tree ──

function buildCategoryTree(rows) {
  // Collect unique product type paths
  const pathSet = new Set()
  for (const row of rows) {
    if (row.productType) pathSet.add(row.productType)
  }

  // Build a tree: each node has { name, handle, children: Map, fullPath }
  const tree = new Map() // L1 name -> node

  for (const fullPath of pathSet) {
    const parts = fullPath
      .split(">")
      .map((p) => p.trim())
      .filter(Boolean)
    let currentLevel = tree
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const handle = slugify(name)
      if (!currentLevel.has(name)) {
        currentLevel.set(name, {
          name,
          handle,
          children: new Map(),
          fullPath: parts.slice(0, i + 1).join(" > "),
        })
      }
      if (i < parts.length - 1) {
        currentLevel = currentLevel.get(name).children
      }
    }
  }

  // Flatten tree for creation order (BFS — parents first)
  const ordered = []
  const queue = [...tree.values()].map((node) => ({ node, parentPath: null }))
  while (queue.length > 0) {
    const { node, parentPath } = queue.shift()
    ordered.push({ name: node.name, handle: node.handle, parentPath, fullPath: node.fullPath })
    for (const child of node.children.values()) {
      queue.push({ node: child, parentPath: node.fullPath })
    }
  }

  return { tree, ordered, pathCount: pathSet.size }
}

async function deleteAllCategories() {
  console.log("  Deleting all existing categories...")
  let deleted = 0
  // Load all categories
  let offset = 0
  const allCats = []
  while (true) {
    const resp = await apiCallWithRetry("GET", `/admin/product-categories?limit=100&offset=${offset}`)
    const cats = resp.product_categories || []
    if (cats.length === 0) break
    allCats.push(...cats)
    offset += 100
  }

  // Delete from deepest first (children before parents)
  // Sort by depth (number of ancestors) descending
  const byDepth = allCats.sort((a, b) => {
    const depthA = (a.parent_category_id ? 1 : 0)
    const depthB = (b.parent_category_id ? 1 : 0)
    return depthB - depthA
  })

  // Multi-pass: keep deleting until empty (handles deep nesting)
  let remaining = byDepth.map((c) => c.id)
  for (let pass = 0; pass < 10 && remaining.length > 0; pass++) {
    const nextRemaining = []
    for (const id of remaining) {
      const resp = await apiCallWithRetry("DELETE", `/admin/product-categories/${id}`)
      if (resp.deleted || resp.id) {
        deleted++
      } else {
        nextRemaining.push(id)
      }
    }
    remaining = nextRemaining
  }

  stats.categoriesDeleted = deleted
  console.log(`  Deleted ${deleted} categories`)
}

async function createCategories(ordered) {
  console.log(`  Creating ${ordered.length} category nodes...`)
  // Map fullPath -> medusa category ID
  const categoryIdMap = {}

  // First, load existing categories to avoid duplicates
  let offset = 0
  const existingByHandle = {}
  while (true) {
    const resp = await apiCallWithRetry("GET", `/admin/product-categories?limit=100&offset=${offset}&fields=id,name,handle,parent_category_id`)
    const cats = resp.product_categories || []
    if (cats.length === 0) break
    for (const cat of cats) {
      // Key by handle + parent for uniqueness
      existingByHandle[cat.handle] = existingByHandle[cat.handle] || []
      existingByHandle[cat.handle].push(cat)
    }
    offset += 100
  }
  console.log(`  Loaded ${Object.values(existingByHandle).flat().length} existing categories`)

  // Create in order (parents first)
  for (const entry of ordered) {
    const parentId = entry.parentPath ? categoryIdMap[entry.parentPath] : null

    // Check if already exists with same handle and parent
    const existing = (existingByHandle[entry.handle] || []).find((c) => {
      if (parentId) return c.parent_category_id === parentId
      return !c.parent_category_id
    })

    if (existing) {
      categoryIdMap[entry.fullPath] = existing.id
      stats.categoriesExisted++
      continue
    }

    const body = {
      name: entry.name,
      handle: entry.handle,
      is_active: true,
      is_internal: false,
    }
    if (parentId) body.parent_category_id = parentId

    const resp = await apiCallWithRetry("POST", "/admin/product-categories", body)
    if (resp.product_category) {
      categoryIdMap[entry.fullPath] = resp.product_category.id
      stats.categoriesCreated++
    } else {
      // Might be duplicate race condition — try to find it
      console.log(`  WARN: Failed to create category "${entry.name}" (${entry.handle}): ${(resp.message || "").substring(0, 100)}`)
      stats.errors++
    }

    // Log progress every 100
    if ((stats.categoriesCreated + stats.categoriesExisted) % 100 === 0) {
      process.stdout.write(`\r  Categories: ${stats.categoriesCreated} created, ${stats.categoriesExisted} existed`)
    }
  }

  console.log(`\n  Categories done: ${stats.categoriesCreated} created, ${stats.categoriesExisted} already existed`)
  return categoryIdMap
}

// Build map from productType string -> deepest category ID
function buildProductTypeToCategoryId(rows, categoryIdMap) {
  const map = {}
  for (const row of rows) {
    if (!row.productType || map[row.productType]) continue
    const parts = row.productType
      .split(">")
      .map((p) => p.trim())
      .filter(Boolean)

    // Find deepest existing category
    for (let depth = parts.length; depth > 0; depth--) {
      const fullPath = parts.slice(0, depth).join(" > ")
      if (categoryIdMap[fullPath]) {
        map[row.productType] = categoryIdMap[fullPath]
        break
      }
    }
  }
  return map
}

// ── Phase 3: Group by SPU ──

function groupBySpu(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = row.spu || row.sku // fallback to SKU if no SPU
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  return groups
}

// ── Phase 4: Create products ──

function buildProductPayload(spu, skuRows, productTypeCategoryMap, salesChannelId) {
  const first = skuRows[0]
  const isMultiVariant = skuRows.length > 1

  // Title: use shortest title from group for cleaner display
  const titles = skuRows.map((r) => r.title).filter(Boolean)
  const groupTitle = titles.sort((a, b) => a.length - b.length)[0] || first.title || first.sku

  // Handle
  const handle = makeHandle(first.sku, groupTitle)

  // Collect all unique images across all variants
  const allImages = new Set()
  for (const row of skuRows) {
    if (row.imageLink) allImages.add(row.imageLink)
    for (const img of row.originalPictures) allImages.add(img)
    for (const img of row.galleryImages) allImages.add(img)
    if (row.mainOriginalPicture) allImages.add(row.mainOriginalPicture)
  }

  // Status: published if any variant in stock
  const anyInStock = skuRows.some((r) => r.availability === "in stock")

  // Category
  const categoryId = productTypeCategoryMap[first.productType] || null

  // Description
  const description = first.descriptionAd || first.description || ""

  // Build options and variants
  let options = []
  let variants = []

  if (isMultiVariant) {
    // Determine option names from attribute fields
    const optionName1Set = new Set()
    const optionName2Set = new Set()
    for (const row of skuRows) {
      if (row.attributeName1) optionName1Set.add(row.attributeName1)
      if (row.attributeName2) optionName2Set.add(row.attributeName2)
    }

    const optName1 = [...optionName1Set][0] || "Option 1"
    const optName2 = [...optionName2Set][0] || null

    // Collect all option values
    const values1 = [...new Set(skuRows.map((r) => r.attribute1 || "Default").filter(Boolean))]
    const values2 = optName2 ? [...new Set(skuRows.map((r) => r.attribute2 || "").filter(Boolean))] : []

    options.push({ title: optName1, values: values1.length > 0 ? values1 : ["Default"] })
    if (optName2 && values2.length > 0) {
      options.push({ title: optName2, values: values2 })
    }

    // Build variant for each SKU
    for (const row of skuRows) {
      const finalPrice = Math.round(row.price * PRICE_MARKUP * 100)
      const val1 = row.attribute1 || "Default"
      const val2 = row.attribute2 || ""

      const variantTitle = optName2 && val2 ? `${val1} / ${val2}` : val1

      const optionsMap = { [optName1]: val1 }
      if (optName2 && val2) optionsMap[optName2] = val2

      variants.push({
        title: variantTitle,
        sku: row.sku,
        barcode: row.upc || undefined,
        manage_inventory: true,
        prices: [{ amount: finalPrice, currency_code: "eur" }],
        options: optionsMap,
        metadata: {
          vevor_sku: row.sku,
          image_link: row.imageLink,
        },
      })
    }
  } else {
    // Single variant
    const row = first
    const finalPrice = Math.round(row.price * PRICE_MARKUP * 100)

    options = [{ title: "Default", values: ["Default"] }]
    variants = [
      {
        title: "Default",
        sku: row.sku,
        barcode: row.upc || undefined,
        manage_inventory: true,
        prices: [{ amount: finalPrice, currency_code: "eur" }],
        options: { Default: "Default" },
      },
    ]
  }

  // Metadata — rich data
  const galleryImagesAll = []
  for (const row of skuRows) {
    for (const img of row.galleryImages) {
      if (!galleryImagesAll.includes(img)) galleryImagesAll.push(img)
    }
    for (const img of row.originalPictures) {
      if (!galleryImagesAll.includes(img)) galleryImagesAll.push(img)
    }
  }

  const productData = {
    title: groupTitle,
    handle,
    description,
    status: anyInStock ? "published" : "draft",
    is_giftcard: false,
    metadata: {
      vevor_sku: first.sku,
      vevor_upc: first.upc || "",
      vevor_link: first.link || "",
      vevor_product_type: first.productType || "",
      vevor_spu: spu,
      weight_kg: first.weightKg || 0,
      selling_points: first.sellingPoints,
      rich_description: first.descriptionHtml,
      gallery_images: galleryImagesAll,
      dimensions: first.dimensions,
      goods_description_ad: first.descriptionAd || "",
    },
    images: [...allImages].slice(0, 20).map((url) => ({ url })), // Medusa limit
    thumbnail: first.imageLink || first.mainOriginalPicture || "",
    options,
    variants,
    sales_channels: salesChannelId ? [{ id: salesChannelId }] : [],
  }

  if (categoryId) {
    productData.categories = [{ id: categoryId }]
  }

  return productData
}

async function loadExistingProducts() {
  console.log("  Loading existing products...")
  const existing = {} // handle -> product id
  const existingBySku = {} // sku -> product id
  let offset = 0
  let total = Infinity

  while (offset < total) {
    const resp = await apiCallWithRetry("GET", `/admin/products?limit=100&offset=${offset}`)
    total = resp.count || 0
    for (const p of resp.products || []) {
      existing[p.handle] = p.id
      const sku = p.metadata?.vevor_sku
      if (sku) existingBySku[sku] = p.id
    }
    offset += 100
    if ((resp.products || []).length === 0) break
  }

  console.log(`  Loaded ${Object.keys(existing).length} existing products`)
  return { byHandle: existing, bySku: existingBySku }
}

async function loadSalesChannelId() {
  if (SALES_CHANNEL_ID) return SALES_CHANNEL_ID
  const resp = await apiCallWithRetry("GET", "/admin/stores")
  return resp.stores?.[0]?.default_sales_channel_id || ""
}

async function createProduct(productData) {
  try {
    const resp = await apiCallWithRetry("POST", "/admin/products", productData)
    if (resp.product) {
      stats.productsCreated++
      stats.variantsCreated += (resp.product.variants || []).length
      return resp.product.id
    } else {
      const msg = resp.message || JSON.stringify(resp).substring(0, 200)
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        stats.skipped++
      } else {
        stats.errors++
        if (stats.errors <= 20) {
          console.log(`\n  ERROR creating "${productData.title?.substring(0, 50)}": ${msg}`)
        }
      }
      return null
    }
  } catch (err) {
    stats.errors++
    if (stats.errors <= 20) console.log(`\n  ERROR: ${err.message}`)
    return null
  }
}

async function updateProduct(productId, skuRows) {
  const first = skuRows[0]
  const anyInStock = skuRows.some((r) => r.availability === "in stock")

  try {
    await apiCallWithRetry("POST", `/admin/products/${productId}`, {
      status: anyInStock ? "published" : "draft",
      metadata: {
        vevor_sku: first.sku,
        vevor_spu: first.spu,
        weight_kg: first.weightKg || 0,
        selling_points: first.sellingPoints,
        rich_description: first.descriptionHtml,
        gallery_images: first.galleryImages,
        dimensions: first.dimensions,
      },
    })

    // Update variant prices
    const prodResp = await apiCallWithRetry("GET", `/admin/products/${productId}?fields=id,variants.id,variants.sku`)
    const existingVariants = prodResp.product?.variants || []
    for (const row of skuRows) {
      const variant = existingVariants.find((v) => v.sku === row.sku)
      if (variant) {
        const finalPrice = Math.round(row.price * PRICE_MARKUP * 100)
        await apiCallWithRetry("POST", `/admin/products/${productId}/variants/${variant.id}`, {
          prices: [{ amount: finalPrice, currency_code: "eur" }],
        })
      }
    }
    stats.updated++
  } catch (err) {
    stats.errors++
  }
}

// ── Main ──

async function main() {
  console.log("=".repeat(56))
  console.log("  XLMARKET -- VEVOR Feed Importer v2.0 (vevor-571)")
  console.log("=".repeat(56))
  console.log("")

  if (DRY_RUN) console.log("  MODE: DRY RUN (no API calls)")
  if (STOCK_ONLY) console.log("  MODE: STOCK ONLY (update existing)")
  if (CATEGORIES_ONLY) console.log("  MODE: CATEGORIES ONLY")
  if (DELETE_CATEGORIES) console.log("  MODE: DELETE CATEGORIES first")
  if (LIMIT) console.log(`  LIMIT: ${LIMIT} SPU groups`)
  console.log("")

  // Phase 1: Parse
  const rows = await parseXlsx()

  // Phase 2: Category tree
  console.log("\n[Phase 2] Building category tree...")
  const { ordered: categoryNodes, pathCount } = buildCategoryTree(rows)
  console.log(`  Unique product type paths: ${pathCount}`)
  console.log(`  Category nodes to create: ${categoryNodes.length}`)

  // Show depth distribution
  const depthCounts = {}
  for (const node of categoryNodes) {
    const depth = node.fullPath.split(" > ").length
    depthCounts[depth] = (depthCounts[depth] || 0) + 1
  }
  console.log(`  Depth distribution: ${Object.entries(depthCounts).map(([d, c]) => `L${d}:${c}`).join(", ")}`)

  // Phase 3: Group by SPU
  console.log("\n[Phase 3] Grouping by SPU...")
  const spuGroups = groupBySpu(rows)
  stats.totalSpuGroups = spuGroups.size
  const multiVariant = [...spuGroups.values()].filter((g) => g.length > 1).length
  console.log(`  SPU groups: ${spuGroups.size} (${multiVariant} multi-variant, ${spuGroups.size - multiVariant} single)`)

  const spuEntries = [...spuGroups.entries()]
  const toProcess = LIMIT ? spuEntries.slice(0, LIMIT) : spuEntries

  if (DRY_RUN) {
    // Show detailed stats
    console.log("\n--- DRY RUN STATS ---")
    console.log(`  Total valid rows: ${rows.length}`)
    console.log(`  SPU groups to process: ${toProcess.length}`)
    console.log(`  Total variants: ${toProcess.reduce((sum, [, g]) => sum + g.length, 0)}`)

    // Category distribution (top 15)
    const catCounts = {}
    for (const [, group] of toProcess) {
      const pt = group[0].productType
      const l1 = pt ? pt.split(">")[0].trim() : "NONE"
      catCounts[l1] = (catCounts[l1] || 0) + 1
    }
    console.log("\n  Top L1 categories:")
    for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      console.log(`    ${cat}: ${count}`)
    }

    // Price stats
    const prices = rows.map((r) => r.price * PRICE_MARKUP)
    console.log(`\n  Price stats (after ${PRICE_MARKUP}x markup):`)
    console.log(`    Min:  EUR ${Math.min(...prices).toFixed(2)}`)
    console.log(`    Max:  EUR ${Math.max(...prices).toFixed(2)}`)
    console.log(`    Avg:  EUR ${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)}`)

    const inStock = rows.filter((r) => r.availability === "in stock").length
    console.log(`\n  In stock: ${inStock}/${rows.length} (${((inStock / rows.length) * 100).toFixed(1)}%)`)

    // Variant distribution
    const variantDist = {}
    for (const [, group] of toProcess) {
      const size = group.length
      const bucket = size <= 5 ? String(size) : size <= 10 ? "6-10" : size <= 20 ? "11-20" : "21+"
      variantDist[bucket] = (variantDist[bucket] || 0) + 1
    }
    console.log(`\n  Variants per product: ${Object.entries(variantDist).map(([k, v]) => `${k}:${v}`).join(", ")}`)

    // Selling points coverage
    const withSP = rows.filter((r) => r.sellingPoints.length > 0).length
    const withHtml = rows.filter((r) => r.descriptionHtml.length > 100).length
    console.log(`\n  Selling points: ${withSP}/${rows.length} rows have at least one`)
    console.log(`  HTML description: ${withHtml}/${rows.length} rows have > 100 chars`)

    console.log("\n  DRY RUN complete. No API calls made.")
    return
  }

  // ── Live import ──
  if (!ADMIN_PASS) throw new Error("ADMIN_PASS env variable required")

  console.log("\n[Auth] Authenticating...")
  globalToken = await authenticate()
  console.log("  Authenticated OK")

  // Delete categories if requested
  if (DELETE_CATEGORIES) {
    await deleteAllCategories()
  }

  // Create category tree
  console.log("\n[Phase 2b] Creating categories in Medusa...")
  const categoryIdMap = await createCategories(categoryNodes)
  const productTypeCategoryMap = buildProductTypeToCategoryId(rows, categoryIdMap)

  if (CATEGORIES_ONLY) {
    console.log("\n  CATEGORIES ONLY mode. Done.")
    printStats()
    return
  }

  // Load existing data
  console.log("\n[Phase 4] Loading existing data...")
  const existingProducts = await loadExistingProducts()
  const salesChannelId = await loadSalesChannelId()
  console.log(`  Sales channel: ${salesChannelId}`)

  // Import products in batches
  console.log(`\n[Phase 4b] Importing ${toProcess.length} products...`)
  const startTime = Date.now()

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async ([spu, skuRows]) => {
      const payload = buildProductPayload(spu, skuRows, productTypeCategoryMap, salesChannelId)

      // Check if already exists
      const existingId = existingProducts.byHandle[payload.handle] || existingProducts.bySku[skuRows[0].sku]
      if (existingId) {
        if (STOCK_ONLY) {
          await updateProduct(existingId, skuRows)
        } else {
          stats.skipped++
        }
        return
      }

      if (!STOCK_ONLY) {
        await createProduct(payload)
      }
    })
    await Promise.all(promises)

    const done = Math.min(i + BATCH_SIZE, toProcess.length)
    if (done % 50 === 0 || done === toProcess.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      const rate = (done / ((Date.now() - startTime) / 1000)).toFixed(1)
      process.stdout.write(
        `\r  Progress: ${done}/${toProcess.length} (${rate}/s, ${elapsed}s) | created: ${stats.productsCreated}, skipped: ${stats.skipped}, errors: ${stats.errors}`
      )
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log("")

  printStats(totalTime)
}

function printStats(totalTime) {
  console.log("")
  console.log("=".repeat(56))
  console.log("  IMPORT COMPLETE")
  console.log("=".repeat(56))
  console.log(`  Total rows:          ${stats.totalRows}`)
  console.log(`  SPU groups:          ${stats.totalSpuGroups}`)
  console.log(`  Products created:    ${stats.productsCreated}`)
  console.log(`  Variants created:    ${stats.variantsCreated}`)
  console.log(`  Categories created:  ${stats.categoriesCreated}`)
  console.log(`  Categories existed:  ${stats.categoriesExisted}`)
  if (stats.categoriesDeleted) console.log(`  Categories deleted:  ${stats.categoriesDeleted}`)
  console.log(`  Updated:             ${stats.updated}`)
  console.log(`  Skipped:             ${stats.skipped}`)
  console.log(`  Errors:              ${stats.errors}`)
  if (totalTime) console.log(`  Time:                ${totalTime}s`)
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
