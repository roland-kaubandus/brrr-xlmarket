#!/usr/bin/env node
/**
 * Rikastab olemasolevaid tooteid XLSX feedist:
 * - gallery_images (original_img pildid)
 * - rich_description (HTML kirjeldus koos piltidega)
 * - selling_points (1-5)
 * - Medusa images (kuni 20 pilti per toode)
 *
 * Kasutus: node src/scripts/enrich-products.mjs [--limit 100] [--dry-run]
 */

import ExcelJS from "exceljs"
import pg from "pg"
import http from "http"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FEED_PATH = path.resolve(__dirname, "../../data/feeds/vevor-571.xlsx")
const DB_URL = `postgres://xlmarket:${process.env.PGPASSWORD}@localhost:5435/xlmarket`
const MEDUSA_URL = "http://127.0.0.1:9001"
const ADMIN_EMAIL = "admin@xlmarket.eu"
const ADMIN_PASS = process.env.MEDUSA_ADMIN_PASS

const args = process.argv.slice(2)
const LIMIT = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1]) : 0
const DRY_RUN = args.includes("--dry-run")

function apiCall(method, endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, MEDUSA_URL)
    const req = http.request({
      method, hostname: url.hostname, port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
    }, res => {
      let data = ""; res.on("data", c => data += c)
      res.on("end", () => { try { resolve(JSON.parse(data)) } catch { resolve({ raw: data }) } })
    })
    req.on("error", reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function main() {
  console.log("Parsing XLSX...")
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(FEED_PATH)
  const ws = wb.worksheets[0]

  // Build SKU → feed data map
  const feedBySku = new Map()
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return
    const sku = String(row.getCell(1).value || "").trim() // SKU column (col 1)
    if (!sku) return

    const originalPics = String(row.getCell(14).value || "").split(",").map(s => s.trim()).filter(Boolean)
    const mainOriginal = String(row.getCell(15).value || "").trim()
    const descriptionHtml = String(row.getCell(26).value || "").trim()
    const sp = [20, 19, 18, 17, 16].map(c => String(row.getCell(c).value || "").trim())

    // Build gallery: main original + all originals
    const gallery = []
    if (mainOriginal) gallery.push(mainOriginal)
    for (const pic of originalPics) {
      if (!gallery.includes(pic)) gallery.push(pic)
    }

    feedBySku.set(sku, { gallery, descriptionHtml, sellingPoints: sp })
  })

  console.log(`Feed: ${feedBySku.size} SKUs parsed`)

  // Auth
  const authRes = await apiCall("POST", "/auth/user/emailpass", { email: ADMIN_EMAIL, password: ADMIN_PASS })
  const token = authRes.token
  if (!token) { console.error("Auth failed"); process.exit(1) }

  // Load products from DB
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()

  const query = LIMIT
    ? `SELECT id, metadata->>'vevor_sku' as sku FROM product WHERE status='published' AND metadata->>'vevor_sku' IS NOT NULL LIMIT ${LIMIT}`
    : `SELECT id, metadata->>'vevor_sku' as sku FROM product WHERE status='published' AND metadata->>'vevor_sku' IS NOT NULL`
  const { rows } = await client.query(query)
  console.log(`Products to enrich: ${rows.length}`)

  let enriched = 0, skipped = 0, failed = 0

  for (let i = 0; i < rows.length; i++) {
    const { id, sku } = rows[i]
    const feed = feedBySku.get(sku)
    if (!feed || feed.gallery.length === 0) { skipped++; continue }

    if (DRY_RUN) {
      if (i < 3) console.log(`  DRY: ${sku} → ${feed.gallery.length} images, ${feed.descriptionHtml.length} chars HTML`)
      enriched++
      continue
    }

    try {
      // Update metadata (selling_points, rich_description, gallery_images)
      await client.query(`
        UPDATE product SET
          metadata = metadata || $1::jsonb,
          updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify({
        selling_points: feed.sellingPoints,
        rich_description: feed.descriptionHtml.substring(0, 15000),
        gallery_images: feed.gallery.slice(0, 20),
      }), id])

      // Update Medusa images via API (thumbnail + images array)
      await apiCall("POST", `/admin/products/${id}`, {
        thumbnail: feed.gallery[0] || undefined,
        images: feed.gallery.slice(0, 20).map(url => ({ url })),
      }, token)

      enriched++
    } catch (err) {
      failed++
      if (failed <= 5) console.error(`  FAIL ${sku}: ${err.message?.substring(0, 100)}`)
    }

    if ((i + 1) % 200 === 0) {
      console.log(`  Progress: ${i + 1}/${rows.length} (enriched: ${enriched}, skipped: ${skipped}, failed: ${failed})`)
    }
  }

  console.log(`\nDone: enriched=${enriched}, skipped=${skipped}, failed=${failed}`)
  await client.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
