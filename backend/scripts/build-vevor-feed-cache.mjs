#!/usr/bin/env node

import ExcelJS from "exceljs"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FEED_PATH = path.join(__dirname, "..", "data", "feeds", "vevor-571.xlsx")
const OUTPUT_PATH = path.join(__dirname, "..", "data", "feeds", "vevor-feed-cache.json")

function normalizeText(value) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

function normalizeInteger(value) {
  if (value === null || value === undefined || value === "") return null
  const number = Number.parseInt(String(value).replace(/[^\d-]/g, ""), 10)
  return Number.isFinite(number) ? number : null
}

function normalizeDecimal(value) {
  if (value === null || value === undefined || value === "") return null
  const cleaned = String(value).replace(",", ".").match(/-?\d+(?:\.\d+)?/)
  if (!cleaned) return null
  const number = Number.parseFloat(cleaned[0])
  return Number.isFinite(number) ? number : null
}

function mapRow(headers, row) {
  const values = {}
  headers.forEach((header, index) => {
    values[header] = row.getCell(index + 1).value
  })

  const sku = normalizeText(values["SKU"])
  const upc = normalizeText(values["UPC"])
  const title = normalizeText(values["Product title"])
  const descriptionRaw = normalizeText(values["Product description"])
  // Only keep a short plain text version for search/previews
  const descriptionText = descriptionRaw
    ? descriptionRaw.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n").replace(/\s{2,}/g, " ").trim().substring(0, 300)
    : null

  if (!sku || !title) return null

  // Parse selling points (1-5)
  const sellingPoints = []
  for (let i = 1; i <= 5; i++) {
    const sp = normalizeText(values[`Selling point ${i}`])
    if (sp) sellingPoints.push(sp)
  }

  // Parse image galleries (comma-separated URLs)
  const originalImages = normalizeText(values["goods_original_picture"])
    ?.split(",").map(u => u.trim()).filter(Boolean) || []
  const galleryImages = normalizeText(values["image_link1"])
    ?.split(",").map(u => u.trim()).filter(Boolean) || []

  // Parse dimensions
  const dimensionHigh = normalizeDecimal(values["High"])
  const dimensionWide = normalizeDecimal(values["Wide"])
  const dimensionLong = normalizeDecimal(values["Long"])
  const dimensionUnit = normalizeText(values["goods_size_unit"]) || "cm"

  // Parse shipping weight JSON
  let shippingWeightKg = null
  const shippingRaw = normalizeText(values["Shipping Weight"])
  if (shippingRaw) {
    try {
      const parsed = JSON.parse(shippingRaw)
      shippingWeightKg = parsed?.value || null
    } catch {
      shippingWeightKg = normalizeDecimal(shippingRaw)
    }
  }

  // Rich description HTML — too large for cache, truncate heavily
  const rawRichHtml = normalizeText(values["description_html"])
  const richDescriptionHtml = rawRichHtml ? rawRichHtml.substring(0, 500) : null
  const descriptionAd = normalizeText(values["goods_description_ad"])

  // Variants/attributes
  const attributeName1 = normalizeText(values["attribute_name_1"])
  const attributeValue1 = normalizeText(values["attribute_1"])
  const attributeName2 = normalizeText(values["attribute_name_2"])
  const attributeValue2 = normalizeText(values["attribute_2"])

  return {
    sku,
    upc,
    title,
    descriptionText,
    link: normalizeText(values["Product link"]),
    condition: normalizeText(values["Product condition"]),
    priceEur: normalizeDecimal(values["Price"]),
    availability: normalizeText(values["Availability"])?.toLowerCase() || null,
    inventoryQuantity: normalizeInteger(values["Inventory quantity"]),
    weightKg: normalizeDecimal(values["Product weight(KG)"]),
    shippingWeightKg,
    image: normalizeText(values["Image link"]),
    originalImages,
    galleryImages,
    brand: normalizeText(values["Brand"]),
    productType: normalizeText(values["Product type"]),
    sellingPoints,
    dimensions: (dimensionHigh || dimensionWide || dimensionLong) ? {
      high: dimensionHigh,
      wide: dimensionWide,
      long: dimensionLong,
      unit: dimensionUnit,
    } : null,
    attributes: (attributeName1 || attributeName2) ? [
      ...(attributeName1 ? [{ name: attributeName1, value: attributeValue1 }] : []),
      ...(attributeName2 ? [{ name: attributeName2, value: attributeValue2 }] : []),
    ] : null,
    spu: normalizeText(values["goods_spu"]),
    mainOriginalImage: normalizeText(values["goods_main_original_picture"]),
  }
}

async function main() {
  if (!fs.existsSync(FEED_PATH)) {
    throw new Error(`Feed not found: ${FEED_PATH}`)
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(FEED_PATH)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error("Feed workbook has no worksheets")
  }

  const headerRow = worksheet.getRow(1)
  const headers = headerRow.values.slice(1).map((value) => String(value || "").trim())

  const bySku = {}
  const byUpc = {}
  let count = 0

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const entry = mapRow(headers, row)
    if (!entry) return
    bySku[entry.sku] = entry
    if (entry.upc) byUpc[entry.upc] = entry
    count += 1
  })

  const payload = {
    generatedAt: new Date().toISOString(),
    source: FEED_PATH,
    count,
    bySku,
    byUpc,
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload))
  console.log(`Feed cache written: ${OUTPUT_PATH} (${count} products)`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
