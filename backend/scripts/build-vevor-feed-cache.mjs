#!/usr/bin/env node

import ExcelJS from "exceljs"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FEED_PATH = path.join(__dirname, "..", "data", "feeds", "vevor-latest.xlsx")
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
  const descriptionHtml = normalizeText(values["Product description"])
  const descriptionText = descriptionHtml
    ? descriptionHtml.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n").replace(/\s{2,}/g, " ").trim()
    : null

  if (!sku || !title) return null

  return {
    sku,
    upc,
    title,
    descriptionHtml,
    descriptionText,
    link: normalizeText(values["Product link"]),
    country: normalizeText(values["Country"]),
    condition: normalizeText(values["Product condition"]),
    priceEur: normalizeDecimal(values["Price"]),
    availability: normalizeText(values["Availability"])?.toLowerCase() || null,
    inventoryQuantity: normalizeInteger(values["Inventory quantity"]),
    weightKg: normalizeDecimal(values["Product weight(KG)"]),
    image: normalizeText(values["Image link"]),
    brand: normalizeText(values["Brand"]),
    productType: normalizeText(values["Product type"]),
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

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2))
  console.log(`Feed cache written: ${OUTPUT_PATH} (${count} products)`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
