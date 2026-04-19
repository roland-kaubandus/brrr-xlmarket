#!/usr/bin/env node
/**
 * Sitemap.xml generator for xlmarket.eu
 *
 * Generates sitemap with all products, categories, and static pages.
 * Output: data/feeds/sitemap.xml
 *
 * Usage: node scripts/generate-sitemap.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, "..")

const MEDUSA_URL = process.env.MEDUSA_URL || "http://127.0.0.1:9001"
const API_KEY = process.env.MEDUSA_API_KEY || process.env.NEXT_PUBLIC_MEDUSA_KEY
const STORE_URL = process.env.STORE_URL || "https://xlmarket.eu"
const BATCH_SIZE = 200
const OUTPUT_PATH = join(PROJECT_ROOT, "data", "feeds", "sitemap.xml")

function escapeXml(str) {
  if (!str) return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function today() {
  return new Date().toISOString().split("T")[0]
}

async function fetchAllProducts() {
  const products = []
  let offset = 0
  let total = Infinity

  while (offset < total) {
    const url = `${MEDUSA_URL}/store/products?limit=${BATCH_SIZE}&offset=${offset}&fields=handle,updated_at`
    const res = await fetch(url, {
      headers: { "x-publishable-api-key": API_KEY },
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json()
    total = data.count
    products.push(...data.products)
    offset += BATCH_SIZE
    if (offset % 2000 === 0 || offset >= total) {
      console.log(`  Products: ${Math.min(offset, total)}/${total}`)
    }
  }
  return products
}

async function fetchCategories() {
  const url = `${MEDUSA_URL}/store/product-categories?limit=100&fields=handle,updated_at`
  const res = await fetch(url, {
    headers: { "x-publishable-api-key": API_KEY },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  console.log(`  Categories: ${data.product_categories.length}`)
  return data.product_categories
}

function generateSitemap(products, categories) {
  const lines = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

  // Static pages
  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/kategooriad", priority: "0.8", changefreq: "daily" },
    { path: "/otsing", priority: "0.3", changefreq: "monthly" },
  ]

  for (const page of staticPages) {
    lines.push("  <url>")
    lines.push(`    <loc>${escapeXml(STORE_URL + page.path)}</loc>`)
    lines.push(`    <lastmod>${today()}</lastmod>`)
    lines.push(`    <changefreq>${page.changefreq}</changefreq>`)
    lines.push(`    <priority>${page.priority}</priority>`)
    lines.push("  </url>")
  }

  // Category pages
  for (const cat of categories) {
    const lastmod = cat.updated_at ? cat.updated_at.split("T")[0] : today()
    lines.push("  <url>")
    lines.push(`    <loc>${escapeXml(STORE_URL + "/kategooriad/" + cat.handle)}</loc>`)
    lines.push(`    <lastmod>${lastmod}</lastmod>`)
    lines.push(`    <changefreq>daily</changefreq>`)
    lines.push(`    <priority>0.7</priority>`)
    lines.push("  </url>")
  }

  // Product pages
  for (const product of products) {
    const lastmod = product.updated_at ? product.updated_at.split("T")[0] : today()
    lines.push("  <url>")
    lines.push(`    <loc>${escapeXml(STORE_URL + "/toode/" + product.handle)}</loc>`)
    lines.push(`    <lastmod>${lastmod}</lastmod>`)
    lines.push(`    <changefreq>weekly</changefreq>`)
    lines.push(`    <priority>0.6</priority>`)
    lines.push("  </url>")
  }

  lines.push("</urlset>")

  console.log(`  Total URLs: ${staticPages.length + categories.length + products.length}`)
  return lines.join("\n")
}

async function main() {
  console.log("Sitemap generator")
  console.log("=================")

  console.log("Fetching data...")
  const [products, categories] = await Promise.all([
    fetchAllProducts(),
    fetchCategories(),
  ])

  console.log("Generating sitemap...")
  const xml = generateSitemap(products, categories)

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, xml, "utf-8")

  const sizeMb = (Buffer.byteLength(xml, "utf-8") / 1024 / 1024).toFixed(2)
  console.log(`\nSitemap written: ${OUTPUT_PATH} (${sizeMb} MB)`)
  console.log("Done!")
}

main().catch((err) => {
  console.error("FATAL:", err.message)
  process.exit(1)
})
