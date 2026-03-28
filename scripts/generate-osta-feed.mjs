#!/usr/bin/env node
/**
 * osta.ee XML product feed generator for xlmarket.eu
 *
 * Generates XML feed in osta.ee format from Medusa Store API.
 * Output: data/feeds/osta-ee.xml
 *
 * Usage: node scripts/generate-osta-feed.mjs
 *
 * osta.ee feed format:
 * <offers>
 *   <offer>
 *     <name>Product title (max 60 chars)</name>
 *     <description>Product description (max 300 chars)</description>
 *     <url>Product URL</url>
 *     <price>12.99 EUR</price>
 *     <image>Image URL</image>
 *     <category>Category name</category>
 *     <id>SKU or product ID</id>
 *   </offer>
 * </offers>
 */

import { writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, "..")

// Configuration
const MEDUSA_URL = process.env.MEDUSA_URL || "http://127.0.0.1:9001"
const API_KEY = process.env.MEDUSA_API_KEY
if (!API_KEY) { console.error("MEDUSA_API_KEY env var is required"); process.exit(1) }
const REGION_ID = process.env.MEDUSA_REGION_ID
if (!REGION_ID) { console.error("MEDUSA_REGION_ID env var is required"); process.exit(1) }
const STORE_URL = process.env.STORE_URL || "https://xlmarket.eu"
const BATCH_SIZE = 200
const OUTPUT_PATH = join(PROJECT_ROOT, "data", "feeds", "osta-ee.xml")

// Strip HTML tags and clean text
function stripHtml(html) {
  if (!html) return ""
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

// Truncate text to max length, respecting word boundaries
function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text
  const truncated = text.substring(0, maxLen)
  const lastSpace = truncated.lastIndexOf(" ")
  return lastSpace > maxLen * 0.7 ? truncated.substring(0, lastSpace) : truncated
}

// Escape XML special characters
function escapeXml(str) {
  if (!str) return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// Format price from cents to "XX.XX EUR"
function formatPrice(amountInCents) {
  return (amountInCents / 100).toFixed(2) + " EUR"
}

// Fetch all products from Medusa API with pagination
async function fetchAllProducts() {
  const products = []
  let offset = 0
  let total = Infinity

  const fields = "id,title,handle,description,thumbnail,variants.calculated_price,variants.sku,categories.name"

  while (offset < total) {
    const url = `${MEDUSA_URL}/store/products?region_id=${REGION_ID}&limit=${BATCH_SIZE}&offset=${offset}&fields=${fields}`
    const res = await fetch(url, {
      headers: { "x-publishable-api-key": API_KEY },
    })

    if (!res.ok) {
      throw new Error(`Medusa API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    total = data.count
    products.push(...data.products)
    offset += BATCH_SIZE

    if (offset % 2000 === 0 || offset >= total) {
      console.log(`  Fetched ${Math.min(offset, total)}/${total} products`)
    }
  }

  return products
}

// Generate XML feed
function generateXml(products) {
  const lines = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push("<offers>")

  let skipped = 0

  for (const product of products) {
    // Get first variant with price
    const variant = product.variants?.[0]
    if (!variant?.calculated_price?.calculated_amount) {
      skipped++
      continue
    }

    const price = variant.calculated_price.calculated_amount
    if (price <= 0) {
      skipped++
      continue
    }

    const sku = variant.sku || product.id
    const title = truncate(stripHtml(product.title), 60)
    const description = truncate(stripHtml(product.description), 300)
    const category = product.categories?.[0]?.name || "Muud"
    const thumbnail = product.thumbnail || ""
    const url = `${STORE_URL}/toode/${product.handle}`

    if (!title) {
      skipped++
      continue
    }

    lines.push("  <offer>")
    lines.push(`    <id>${escapeXml(sku)}</id>`)
    lines.push(`    <name>${escapeXml(title)}</name>`)
    lines.push(`    <description>${escapeXml(description)}</description>`)
    lines.push(`    <url>${escapeXml(url)}</url>`)
    lines.push(`    <price>${formatPrice(price)}</price>`)
    if (thumbnail) {
      lines.push(`    <image>${escapeXml(thumbnail)}</image>`)
    }
    lines.push(`    <category>${escapeXml(category)}</category>`)
    lines.push("  </offer>")
  }

  lines.push("</offers>")

  console.log(`  Products in feed: ${products.length - skipped}`)
  if (skipped > 0) {
    console.log(`  Skipped (no price/title): ${skipped}`)
  }

  return lines.join("\n")
}

// Main
async function main() {
  console.log("osta.ee XML feed generator")
  console.log("=========================")
  console.log(`Medusa API: ${MEDUSA_URL}`)
  console.log(`Store URL: ${STORE_URL}`)
  console.log(`Output: ${OUTPUT_PATH}`)
  console.log("")

  console.log("Fetching products from Medusa...")
  const products = await fetchAllProducts()
  console.log(`Total products fetched: ${products.length}`)
  console.log("")

  console.log("Generating XML...")
  const xml = generateXml(products)

  // Ensure output directory exists
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, xml, "utf-8")

  const sizeMb = (Buffer.byteLength(xml, "utf-8") / 1024 / 1024).toFixed(2)
  console.log(`\nFeed written: ${OUTPUT_PATH} (${sizeMb} MB)`)
  console.log("Done!")
}

main().catch((err) => {
  console.error("FATAL:", err.message)
  process.exit(1)
})
