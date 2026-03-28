/**
 * VEVOR XLSX Feed Sync Job
 *
 * Downloads VEVOR product feed from S3 and syncs to Medusa.
 * Runs every 4 hours via scheduled job.
 *
 * Feed: https://ads-feed.s3.us-west-2.amazonaws.com/ads/business/132/vevor-132.xlsx
 * Price formula: original_price * 1.15
 *
 * TODO: Implement in WO-XLM-003
 */

import type { MedusaContainer } from "@medusajs/framework/types"

const FEED_URL = "https://ads-feed.s3.us-west-2.amazonaws.com/ads/business/132/vevor-132.xlsx"
const PRICE_MARKUP = 1.15
const SYNC_INTERVAL = "0 */4 * * *" // Every 4 hours

export default async function syncVevorFeed(container: MedusaContainer) {
  // TODO: WO-XLM-003 implementation
  // 1. Download XLSX from FEED_URL
  // 2. Parse rows (SKU, title, description, price, availability, inventory, image, category)
  // 3. For each product:
  //    - Parse price: "123.45 EUR" → 123.45
  //    - Calculate: price * PRICE_MARKUP
  //    - Upsert product by SKU
  //    - Update inventory quantity
  //    - Map category breadcrumb to store categories
  // 4. Mark removed products as draft
  console.log("[VEVOR Feed Sync] Job placeholder — implement in WO-XLM-003")
}

export const config = {
  name: "sync-vevor-feed",
  schedule: SYNC_INTERVAL,
}
