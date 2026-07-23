#!/usr/bin/env node
// sync-medusa-inventory.mjs — Medusa `stocked_quantity` ← feed-tõde.
//
// MIKS (2026-07-23, launch-blokeerija): kaks tõe-allikat lahknesid — kategooria luges Meili
// `in_stock` ("Otsas"), aga OSTUKORV/CHECKOUT luges Medusa inventory'd. KÕIGIL variantidel
// `manage_inventory=true` + `allow_backorder=false`, AGA `stocked_quantity=100` dummy → Medusa
// EI blokeerinud churned toodet → klient sai osta tarnimatu dropshipi. Fix: churned/OOS → 0
// → Medusa BLOKEERIB add-to-cart + checkout SERVERIPOOLEL (ka otse-API-kutse, mitte ainult UI).
//
// ÜKS TÕDE: kasutab SAMA `isOosFromFeed` otsust mis Meili-indekseerija (lib/feed-stock.mjs).
// Meili `in_stock` ja Medusa `stocked_quantity` = KAKS projektsiooni, ÜKS otsus → ei lahkne.
//
// SKOOP: feed-managed AINULT (variant.sku === metadata.vevor_sku). Custom/Outlet puutumata.
//   churned/OOS + praegu >0  → stocked_quantity = 0        (blokeeri)
//   in-feed    + praegu = 0  → stocked_quantity = RESTORE  (tagasitulek → taas ostetav)
// Muu (juba õige) → ei puuduta.
//
// KÄIVITUS: `node sync-medusa-inventory.mjs [--dry-run]`. Jookseb refresh-feed-cache.sh sammuna.
import pg from "pg"
import fs from "fs"
import { isOosFromFeed } from "./lib/feed-stock.mjs"

const DRY = process.argv.includes("--dry-run")
const RESTORE_QTY = Number(process.env.INSTOCK_QTY || 100)
const DB_URL = process.env.DATABASE_URL || `postgres://xlmarket:${process.env.PGPASSWORD}@localhost:5435/xlmarket`
const FEED_CACHE_PATH = process.env.FEED_CACHE_PATH || new URL("../data/feeds/vevor-feed-cache.json", import.meta.url)

function loadBySku() {
  try { return JSON.parse(fs.readFileSync(FEED_CACHE_PATH, "utf8")).bySku || {} }
  catch { return {} }
}

const bySku = loadBySku()
const cacheSize = Object.keys(bySku).length
// PREFLIGHT: tühi/puuduv cache → KATKESTA. Ilma selleta oleks isOosFromFeed=false kõigile →
// see EI zero'iks kedagi valesti (ohutu suund), aga töö oleks mõttetu — parem valjult katkeda,
// et mitte peita katkist cache-teed (sama muster mis index-meilisearch preflightFeedCache).
if (cacheSize === 0 && process.env.ALLOW_EMPTY_FEED_CACHE !== "1") {
  console.error("❌ feed-cache TÜHI/puudub (" + FEED_CACHE_PATH + ") — katkestan. Override: ALLOW_EMPTY_FEED_CACHE=1")
  process.exit(2)
}
console.log(`📦 feed-cache: ${cacheSize} SKU · ${DRY ? "DRY-RUN" : "EXECUTE"} · restore-qty=${RESTORE_QTY}`)

const c = new pg.Client({ connectionString: DB_URL })
await c.connect()

// Feed-managed variandid + praegune stocked_quantity (üks location per inv_item).
const { rows } = await c.query(`
  SELECT v.sku, il.inventory_item_id, il.stocked_quantity, p.metadata AS meta
  FROM product_variant v
  JOIN product p ON p.id = v.product_id AND p.deleted_at IS NULL
  JOIN product_variant_inventory_item pvii ON pvii.variant_id = v.id
  JOIN inventory_item ii ON ii.id = pvii.inventory_item_id
  JOIN inventory_level il ON il.inventory_item_id = ii.id
  WHERE v.deleted_at IS NULL AND p.status = 'published'
`)

const toZero = []
const toRestore = []
let skipCustom = 0, alreadyOk = 0
for (const r of rows) {
  const meta = r.meta || {}
  const vevorSku = meta.vevor_sku ? String(meta.vevor_sku).trim() : null
  const feedManaged = vevorSku && r.sku && vevorSku === String(r.sku).trim()
  if (!feedManaged) { skipCustom++; continue }   // custom/Outlet → puutumata
  const oos = isOosFromFeed(r.sku, meta, bySku)
  const cur = Number(r.stocked_quantity)
  if (oos && cur > 0) toZero.push(r)
  else if (!oos && cur === 0) toRestore.push(r)
  else alreadyOk++
}

console.log(`  feed-managed: ${rows.length - skipCustom} · custom vahele: ${skipCustom}`)
console.log(`  → 0 (churned/OOS blokeeri): ${toZero.length}`)
console.log(`  → restore ${RESTORE_QTY} (tagasitulek): ${toRestore.length}`)
console.log(`  muutmata (juba õige): ${alreadyOk}`)

if (DRY) {
  console.log("DRY-RUN — ei kirjutanud. Näidised churned→0 (kuni 5):")
  for (const r of toZero.slice(0, 5)) console.log(`    ${r.sku}: ${r.stocked_quantity} → 0`)
  await c.end()
  process.exit(0)
}

async function bulkSet(list, qty) {
  const CH = 2000
  for (let i = 0; i < list.length; i += CH) {
    const ids = list.slice(i, i + CH).map(r => r.inventory_item_id)
    await c.query(
      `UPDATE inventory_level SET stocked_quantity = $2 WHERE inventory_item_id = ANY($1::text[])`,
      [ids, qty]
    )
  }
}
await bulkSet(toZero, 0)
await bulkSet(toRestore, RESTORE_QTY)
console.log(`✅ Kirjutatud: ${toZero.length} → 0 · ${toRestore.length} → ${RESTORE_QTY}`)
await c.end()
