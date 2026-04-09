#!/usr/bin/env node
// Fetches one product thumbnail per category handle from MeiliSearch
// Outputs: storefront/lib/category-images.json

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MEILI_HOST = "http://127.0.0.1:7700"
const MEILI_KEY = "MEILI_LEGACY_KEY_REDACTED"
const MEDUSA_URL = "http://127.0.0.1:9001"
const API_KEY = "pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3"
const OUTPUT = path.join(__dirname, '../../storefront/lib/category-images.json')

async function getAllCategories() {
  const all = []
  let offset = 0
  while (true) {
    const res = await fetch(`${MEDUSA_URL}/store/product-categories?limit=100&offset=${offset}`, {
      headers: { "x-publishable-api-key": API_KEY }
    })
    const data = await res.json()
    all.push(...data.product_categories)
    if (data.product_categories.length < 100) break
    offset += 100
  }
  return all
}

async function getProductThumbnail(handle) {
  try {
    const res = await fetch(`${MEILI_HOST}/indexes/products/search`, {
      method: 'POST',
      headers: { "Authorization": `Bearer ${MEILI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ q: "", limit: 1, filter: [`category_handles = "${handle}"`] })
    })
    const data = await res.json()
    return data.hits?.[0]?.thumbnail || null
  } catch {
    return null
  }
}

async function main() {
  console.log('Loading categories from Medusa...')
  const categories = await getAllCategories()
  console.log(`Found ${categories.length} categories`)

  const images = {}
  let found = 0
  const BATCH = 10

  for (let i = 0; i < categories.length; i += BATCH) {
    const batch = categories.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(async (cat) => {
      const thumb = await getProductThumbnail(cat.handle)
      return { handle: cat.handle, thumb }
    }))
    for (const { handle, thumb } of results) {
      if (thumb) {
        images[handle] = thumb
        found++
      }
    }
    if ((i + BATCH) % 200 === 0 || i + BATCH >= categories.length) {
      console.log(`  ${Math.min(i + BATCH, categories.length)}/${categories.length} checked, ${found} images found`)
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(images, null, 2))
  console.log(`Done: ${found} category images saved to ${OUTPUT}`)
}

main().catch(console.error)
