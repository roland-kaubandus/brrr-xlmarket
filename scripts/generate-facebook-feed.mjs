#!/usr/bin/env node
/**
 * Facebook Commerce XML product feed generator for xlmarket.eu
 *
 * Generates XML feed in Facebook/Meta Commerce format from Medusa Store API.
 * Output: data/feeds/facebook-feed.xml
 *
 * Usage: node scripts/generate-facebook-feed.mjs
 *
 * Facebook Commerce feed spec:
 * https://developers.facebook.com/docs/commerce-platform/catalog/fields
 */

import { writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, "..")

// Configuration
const MEDUSA_URL = process.env.MEDUSA_URL || "http://127.0.0.1:9001"
const API_KEY = process.env.MEDUSA_API_KEY || "pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3"
const STORE_URL = process.env.STORE_URL || "https://xlmarket.eu"
const BATCH_SIZE = 200
const OUTPUT_PATH = join(PROJECT_ROOT, "data", "feeds", "facebook-feed.xml")

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

// Map Estonian categories to Google Product Categories
const CATEGORY_MAP = {
  "Ehitus ja remont": "Hardware > Tools",
  "Tööstus ja seadmed": "Hardware > Power Tools",
  "Kodu ja aed": "Home & Garden",
  "Auto ja garaaž": "Vehicles & Parts > Vehicle Parts & Accessories",
  "Sport ja vaba aeg": "Sporting Goods",
  "Kunst ja käsitöö": "Arts & Entertainment > Hobbies & Creative Arts",
  "Toitlustus ja köök": "Home & Garden > Kitchen & Dining",
  "Elektroonika": "Electronics",
  "Lemmikloomad": "Animals & Pet Supplies",
  "Kontor ja ladustamine": "Office Supplies",
  "Meditsiin ja tervishoid": "Health & Beauty",
}

// Fetch all products from Medusa API with pagination
async function fetchAllProducts() {
  const products = []
  let offset = 0
  let total = Infinity

  const fields = "id,title,handle,description,thumbnail,variants.calculated_price,variants.sku,categories.name"

  while (offset < total) {
    const url = `${MEDUSA_URL}/store/products?limit=${BATCH_SIZE}&offset=${offset}&fields=${fields}`
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

// Generate Facebook Commerce XML feed
function generateXml(products) {
  const lines = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">')
  lines.push("<channel>")
  lines.push("  <title>XLMARKET</title>")
  lines.push(`  <link>${STORE_URL}</link>`)
  lines.push("  <description>Kvaliteetsed tööriistad, seadmed ja kodukaup soodsa hinnaga.</description>")

  let skipped = 0

  for (const product of products) {
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
    const title = truncate(stripHtml(product.title), 150)
    const description = truncate(stripHtml(product.description), 5000) || title
    const categoryName = product.categories?.[0]?.name || "Muud"
    const googleCategory = CATEGORY_MAP[categoryName] || "Hardware"
    const thumbnail = product.thumbnail || ""
    const url = `${STORE_URL}/toode/${product.handle}`

    if (!title || !thumbnail) {
      skipped++
      continue
    }

    lines.push("  <item>")
    lines.push(`    <g:id>${escapeXml(sku)}</g:id>`)
    lines.push(`    <g:title>${escapeXml(title)}</g:title>`)
    lines.push(`    <g:description>${escapeXml(description)}</g:description>`)
    lines.push(`    <g:link>${escapeXml(url)}</g:link>`)
    lines.push(`    <g:image_link>${escapeXml(thumbnail)}</g:image_link>`)
    lines.push(`    <g:availability>in stock</g:availability>`)
    lines.push(`    <g:price>${formatPrice(price)}</g:price>`)
    lines.push(`    <g:brand>VEVOR</g:brand>`)
    lines.push(`    <g:condition>new</g:condition>`)
    lines.push(`    <g:product_type>${escapeXml(categoryName)}</g:product_type>`)
    lines.push(`    <g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>`)
    lines.push("  </item>")
  }

  lines.push("</channel>")
  lines.push("</rss>")

  console.log(`  Products in feed: ${products.length - skipped}`)
  if (skipped > 0) {
    console.log(`  Skipped (no price/title/image): ${skipped}`)
  }

  return lines.join("\n")
}

// Main
async function main() {
  console.log("Facebook Commerce XML feed generator")
  console.log("====================================")
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
