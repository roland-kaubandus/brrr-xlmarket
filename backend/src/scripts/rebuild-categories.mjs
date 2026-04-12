/**
 * XLMARKET — Category Rebuild & Product Relink
 *
 * Rebuilds the entire category tree from VEVOR XLSX product_type paths,
 * then links ALL existing products to their deepest category based on
 * vevor_product_type metadata.
 *
 * Usage:
 *   ADMIN_PASS=xxx node src/scripts/rebuild-categories.mjs              # full rebuild + relink
 *   ADMIN_PASS=xxx node src/scripts/rebuild-categories.mjs --dry-run    # show stats only
 *   ADMIN_PASS=xxx node src/scripts/rebuild-categories.mjs --relink-only # skip delete+create, just relink
 *
 * Env:
 *   ADMIN_PASS  — required
 *   MEDUSA_URL  — default http://127.0.0.1:9001
 */

import ExcelJS from "exceljs"
import http from "http"
import https from "https"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MEDUSA_URL = process.env.MEDUSA_URL || "http://127.0.0.1:9001"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@xlmarket.eu"
const ADMIN_PASS = process.env.ADMIN_PASS
const FEED_PATH = path.resolve(__dirname, "../../data/feeds/vevor-571.xlsx")

const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
const RELINK_ONLY = args.includes("--relink-only")

let globalToken = null

const stats = {
  categoriesDeleted: 0,
  categoriesCreated: 0,
  categoriesExisted: 0,
  productsLinked: 0,
  productsAlreadyLinked: 0,
  productsNoMatch: 0,
  productsTotal: 0,
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

async function apiRetry(method, endpoint, body, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await apiCall(method, endpoint, body)
      if (resp.__rate_limited && attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000
        console.log(`  Rate limited on ${endpoint}, retry in ${delay / 1000}s...`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      return resp
    } catch (err) {
      if (attempt < maxRetries && (err.code === "ECONNRESET" || err.code === "EPIPE")) {
        const delay = Math.pow(2, attempt + 1) * 1000
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
}

async function authenticate() {
  const resp = await apiCall("POST", "/auth/user/emailpass", { email: ADMIN_EMAIL, password: ADMIN_PASS }, false)
  if (!resp.token) throw new Error(`Auth failed: ${JSON.stringify(resp).substring(0, 200)}`)
  return resp.token
}

// ── Helpers ──

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
}

// ── Phase 1: Parse XLSX ──

async function parseXlsx() {
  console.log(`  Reading ${FEED_PATH}...`)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(FEED_PATH)
  const ws = wb.worksheets[0]

  // Find column indices
  const header = {}
  ws.getRow(1).eachCell((cell, colNumber) => {
    header[String(cell.value).trim().toLowerCase()] = colNumber
  })

  const ptCol = header["product type"] || header["product_type"]
  if (!ptCol) throw new Error("Cannot find 'Product type' column in XLSX")

  const pathSet = new Set()
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const pt = row.getCell(ptCol).value
    if (pt && String(pt).trim()) {
      pathSet.add(String(pt).trim())
    }
  })

  console.log(`  Found ${pathSet.size} unique product_type paths from ${ws.rowCount - 1} rows`)
  return pathSet
}

// ── Phase 2: Build category tree ──

function buildCategoryTree(pathSet) {
  const tree = new Map()

  for (const fullPath of pathSet) {
    const parts = fullPath.split(">").map((p) => p.trim()).filter(Boolean)
    let currentLevel = tree
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      if (!currentLevel.has(name)) {
        currentLevel.set(name, {
          name,
          handle: slugify(name),
          children: new Map(),
          fullPath: parts.slice(0, i + 1).join(" > "),
        })
      }
      if (i < parts.length - 1) {
        currentLevel = currentLevel.get(name).children
      }
    }
  }

  // BFS flatten — parents first
  const ordered = []
  const queue = [...tree.values()].map((node) => ({ node, parentPath: null }))
  while (queue.length > 0) {
    const { node, parentPath } = queue.shift()
    ordered.push({ name: node.name, handle: node.handle, parentPath, fullPath: node.fullPath })
    for (const child of node.children.values()) {
      queue.push({ node: child, parentPath: node.fullPath })
    }
  }

  // Stats
  const depthCounts = {}
  for (const node of ordered) {
    const depth = node.fullPath.split(" > ").length
    depthCounts[depth] = (depthCounts[depth] || 0) + 1
  }

  return { ordered, l1Count: tree.size, depthCounts }
}

// ── Phase 3: Delete all categories ──

async function deleteAllCategories() {
  console.log("\n[Delete] Loading all existing categories...")
  let offset = 0
  const allCats = []
  while (true) {
    const resp = await apiRetry("GET", `/admin/product-categories?limit=100&offset=${offset}`)
    const cats = resp.product_categories || []
    if (cats.length === 0) break
    allCats.push(...cats)
    offset += 100
    if (offset % 500 === 0) process.stdout.write(`\r  Loaded ${allCats.length} categories...`)
  }
  console.log(`  Total categories to delete: ${allCats.length}`)

  // Build parent chain depth for proper ordering
  const idToParent = {}
  for (const c of allCats) idToParent[c.id] = c.parent_category_id
  function getDepth(id) {
    let d = 0
    let current = id
    while (idToParent[current]) {
      d++
      current = idToParent[current]
    }
    return d
  }

  // Sort deepest first
  const sorted = allCats.map((c) => ({ id: c.id, depth: getDepth(c.id) })).sort((a, b) => b.depth - a.depth)

  let deleted = 0
  for (const { id } of sorted) {
    const resp = await apiRetry("DELETE", `/admin/product-categories/${id}`)
    if (resp.deleted || resp.id) {
      deleted++
    } else {
      // Retry once more
      await new Promise((r) => setTimeout(r, 500))
      const resp2 = await apiRetry("DELETE", `/admin/product-categories/${id}`)
      if (resp2.deleted || resp2.id) deleted++
      else stats.errors++
    }
    if (deleted % 100 === 0) process.stdout.write(`\r  Deleted ${deleted}/${sorted.length}...`)
  }
  stats.categoriesDeleted = deleted
  console.log(`\n  Deleted ${deleted} categories`)
}

// ── Phase 4: Create categories ──

async function createCategories(ordered) {
  console.log(`\n[Create] Creating ${ordered.length} category nodes...`)
  const categoryIdMap = {} // fullPath -> medusa ID

  // Load existing (in case of --relink-only)
  let offset = 0
  const existingByHandle = {}
  while (true) {
    const resp = await apiRetry("GET", `/admin/product-categories?limit=100&offset=${offset}&fields=id,handle,name,parent_category_id`)
    const cats = resp.product_categories || []
    if (cats.length === 0) break
    for (const c of cats) {
      existingByHandle[c.handle] = existingByHandle[c.handle] || []
      existingByHandle[c.handle].push(c)
    }
    offset += 100
  }

  for (const node of ordered) {
    const parentId = node.parentPath ? categoryIdMap[node.parentPath] : null

    // Check existing
    const candidates = existingByHandle[node.handle] || []
    const existing = candidates.find((c) =>
      parentId ? c.parent_category_id === parentId : !c.parent_category_id
    )

    if (existing) {
      categoryIdMap[node.fullPath] = existing.id
      stats.categoriesExisted++
      continue
    }

    const body = {
      name: node.name,
      handle: node.handle,
      is_active: true,
      is_internal: false,
    }
    if (parentId) body.parent_category_id = parentId

    const resp = await apiRetry("POST", "/admin/product-categories", body)
    if (resp.product_category && resp.product_category.id) {
      categoryIdMap[node.fullPath] = resp.product_category.id
      stats.categoriesCreated++
    } else {
      console.error(`\n  ERROR creating category "${node.name}": ${JSON.stringify(resp).substring(0, 200)}`)
      stats.errors++
    }

    if ((stats.categoriesCreated + stats.categoriesExisted) % 100 === 0) {
      process.stdout.write(`\r  Categories: ${stats.categoriesCreated} created, ${stats.categoriesExisted} existed`)
    }
  }

  console.log(`\n  Categories done: ${stats.categoriesCreated} created, ${stats.categoriesExisted} existed`)
  return categoryIdMap
}

// ── Phase 5: Build SKU → productType map from XLSX ──

async function buildSkuToProductType() {
  console.log("\n[SKU Map] Reading XLSX for SKU → product_type mapping...")
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(FEED_PATH)
  const ws = wb.worksheets[0]

  const header = {}
  ws.getRow(1).eachCell((cell, col) => {
    header[String(cell.value).trim().toLowerCase()] = col
  })

  const skuCol = header["sku"]
  const ptCol = header["product type"] || header["product_type"]
  if (!skuCol || !ptCol) throw new Error("Cannot find SKU or Product type column")

  const skuMap = {} // SKU (uppercase) → normalized product_type path
  ws.eachRow((row, n) => {
    if (n === 1) return
    const sku = String(row.getCell(skuCol).value || "").trim().toUpperCase()
    const pt = String(row.getCell(ptCol).value || "").trim()
    if (sku && pt) {
      skuMap[sku] = pt.split(">").map((p) => p.trim()).filter(Boolean).join(" > ")
    }
  })

  console.log(`  SKU map: ${Object.keys(skuMap).length} entries`)
  return skuMap
}

// ── Phase 6: Relink products via SKU matching ──

async function relinkProducts(categoryIdMap, skuMap) {
  console.log("\n[Relink] Loading all products...")

  // Build productType -> categoryId map (fullPath → deepest catId)
  const ptToCatId = {}
  for (const [fullPath, catId] of Object.entries(categoryIdMap)) {
    ptToCatId[fullPath] = catId
  }

  function findCategoryId(productTypePath) {
    const parts = productTypePath.split(" > ")
    for (let depth = parts.length; depth > 0; depth--) {
      const path = parts.slice(0, depth).join(" > ")
      if (ptToCatId[path]) return ptToCatId[path]
    }
    return null
  }

  let offset = 0
  let processed = 0
  const noMatch = []
  const noSku = []

  while (true) {
    const resp = await apiRetry("GET", `/admin/products?limit=100&offset=${offset}&fields=id,title,handle,metadata,categories`)
    const products = resp.products || []
    if (products.length === 0) break

    for (const product of products) {
      stats.productsTotal++
      const sku = (product.metadata?.vevor_sku || "").trim().toUpperCase()

      // Try SKU match from XLSX first
      let productTypePath = sku ? skuMap[sku] : null

      // Fallback: use stored metadata vevor_product_type
      if (!productTypePath) {
        const pt = product.metadata?.vevor_product_type
        if (pt) {
          productTypePath = pt.split(">").map((p) => p.trim()).filter(Boolean).join(" > ")
        }
      }

      if (!productTypePath) {
        stats.productsNoMatch++
        noSku.push(product.handle)
        continue
      }

      const categoryId = findCategoryId(productTypePath)
      if (!categoryId) {
        stats.productsNoMatch++
        noMatch.push(productTypePath)
        continue
      }

      // Check if already correctly linked
      const currentCatIds = (product.categories || []).map((c) => c.id)
      if (currentCatIds.length === 1 && currentCatIds[0] === categoryId) {
        stats.productsAlreadyLinked++
        continue
      }

      // Update product category only (metadata update skipped for speed)
      const resp2 = await apiRetry("POST", `/admin/products/${product.id}`, {
        categories: [{ id: categoryId }],
      })
      if (resp2.product) {
        stats.productsLinked++
      } else {
        console.error(`\n  ERROR linking ${product.handle}: ${JSON.stringify(resp2).substring(0, 200)}`)
        stats.errors++
      }
    }

    offset += 100
    processed += products.length
    if (processed % 200 === 0) {
      process.stdout.write(
        `\r  Products: ${processed} processed, ${stats.productsLinked} linked, ${stats.productsNoMatch} no match`
      )
    }
    // Small pause to avoid overloading Medusa
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log(
    `\n  Relink done: ${stats.productsLinked} linked, ${stats.productsAlreadyLinked} already OK, ${stats.productsNoMatch} no match`
  )

  if (noMatch.length > 0) {
    const byPath = {}
    for (const p of noMatch) byPath[p] = (byPath[p] || 0) + 1
    console.log(`\n  Unmatched paths (${noMatch.length} products):`)
    for (const [path, count] of Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
      console.log(`    ${count}x — ${path}`)
    }
  }
  if (noSku.length > 0) {
    console.log(`\n  No SKU match and no metadata: ${noSku.length} products`)
  }
}

// ── Main ──

async function main() {
  console.log("=".repeat(56))
  console.log("  XLMARKET — Category Rebuild & Product Relink")
  console.log("=".repeat(56))
  if (DRY_RUN) console.log("  MODE: DRY RUN")
  if (RELINK_ONLY) console.log("  MODE: RELINK ONLY (skip delete+create)")

  // Parse XLSX
  console.log("\n[Parse] Reading XLSX feed...")
  const pathSet = await parseXlsx()

  // Build tree
  console.log("\n[Tree] Building category tree...")
  const { ordered, l1Count, depthCounts } = buildCategoryTree(pathSet)
  console.log(`  L1 categories: ${l1Count}`)
  console.log(`  Total nodes: ${ordered.length}`)
  console.log(`  Depth: ${Object.entries(depthCounts).map(([d, c]) => `L${d}:${c}`).join(", ")}`)

  if (DRY_RUN) {
    console.log("\n  DRY RUN — no API changes made.")
    console.log(`  Would create ${ordered.length} categories`)
    console.log(`  Would relink up to 14310 products`)

    // Show L1 categories
    console.log("\n  L1 categories:")
    for (const node of ordered.filter((n) => !n.parentPath)) {
      console.log(`    ${node.name} (${node.handle})`)
    }
    return
  }

  if (!ADMIN_PASS) throw new Error("ADMIN_PASS env required")

  console.log("\n[Auth] Authenticating...")
  globalToken = await authenticate()
  console.log("  OK")

  let categoryIdMap

  if (!RELINK_ONLY) {
    // Delete all
    await deleteAllCategories()
    // Create fresh
    categoryIdMap = await createCategories(ordered)
  } else {
    // Load existing categories into map
    categoryIdMap = await createCategories(ordered)
  }

  // Build SKU → product_type map from XLSX
  const skuMap = await buildSkuToProductType()

  // Relink products
  await relinkProducts(categoryIdMap, skuMap)

  // Summary
  console.log("\n" + "=".repeat(56))
  console.log("  REBUILD COMPLETE")
  console.log("=".repeat(56))
  console.log(`  Categories deleted:     ${stats.categoriesDeleted}`)
  console.log(`  Categories created:     ${stats.categoriesCreated}`)
  console.log(`  Categories existed:     ${stats.categoriesExisted}`)
  console.log(`  Products total:         ${stats.productsTotal}`)
  console.log(`  Products linked:        ${stats.productsLinked}`)
  console.log(`  Products already OK:    ${stats.productsAlreadyLinked}`)
  console.log(`  Products no match:      ${stats.productsNoMatch}`)
  console.log(`  Errors:                 ${stats.errors}`)
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
