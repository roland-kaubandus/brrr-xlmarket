#!/usr/bin/env node
/**
 * category-assign.mjs — bulk: määra toodetele käsitsi-kategooriad CSV-st.
 * Salvestab metadata.category_override (FAAS 0 austab seda feed-sync'il) +
 * uuendab product_category_product bindingud. Toetab MITUT kategooriat.
 *
 * CSV-sisend (päisega): sku,category_handles
 *   - sku = metadata.vevor_sku (nt 1.5KWTSSGJ0000001V2) VÕI supplier_sku
 *   - category_handles = pipe-eraldatud handle'd, nt "power-tools|construction-building"
 *
 * Kasutus:
 *   DATABASE_URL=... node scripts/category-assign.mjs failmida.csv            # dry-run
 *   DATABASE_URL=... node scripts/category-assign.mjs failmida.csv --execute  # rakenda
 */
import { readFileSync } from "node:fs"
import pg from "pg"

const FILE = process.argv[2]
const EXECUTE = process.argv.includes("--execute")
if (!FILE) { console.error("Anna CSV-fail. Vt --help kommentaar."); process.exit(1) }
const DB = process.env.DATABASE_URL
if (!DB) { console.error("DATABASE_URL puudub"); process.exit(1) }

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const header = lines.shift().split(",").map((h) => h.trim())
  const iSku = header.indexOf("sku")
  const iCats = header.indexOf("category_handles")
  if (iSku < 0 || iCats < 0) throw new Error("CSV vajab veerge: sku, category_handles")
  return lines.map((l) => {
    // lihtne CSV (handle'd ei sisalda koma); category_handles pipe-eraldatud
    const cols = l.split(",")
    return { sku: cols[iSku].trim(), handles: (cols[iCats] || "").split("|").map((h) => h.trim()).filter(Boolean) }
  })
}

;(async () => {
  const rows = parseCsv(readFileSync(FILE, "utf8"))
  console.log(`Loetud ${rows.length} rida. Režiim: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`)
  const c = new pg.Client({ connectionString: DB })
  await c.connect()

  // handle → category id
  const { rows: cats } = await c.query("SELECT id, handle FROM product_category WHERE deleted_at IS NULL")
  const idByHandle = {}
  for (const r of cats) idByHandle[r.handle] = r.id

  let ok = 0, skipNoProduct = 0, skipBadHandle = 0
  for (const r of rows) {
    const badHandles = r.handles.filter((h) => !idByHandle[h])
    if (badHandles.length) { console.log(`  ✗ ${r.sku}: tundmatud handle'd: ${badHandles.join(",")}`); skipBadHandle++; continue }
    const { rows: prod } = await c.query(
      "SELECT id, metadata FROM product WHERE (metadata->>'vevor_sku'=$1 OR metadata->>'supplier_sku'=$1) AND deleted_at IS NULL LIMIT 1",
      [r.sku]
    )
    if (!prod.length) { console.log(`  ✗ ${r.sku}: toodet ei leitud`); skipNoProduct++; continue }
    const pid = prod[0].id
    const catIds = r.handles.map((h) => idByHandle[h])
    if (EXECUTE) {
      // 1. metadata.category_override (merge)
      await c.query(
        "UPDATE product SET metadata = COALESCE(metadata,'{}'::jsonb) || $2::jsonb WHERE id=$1",
        [pid, JSON.stringify({ category_override: r.handles })]
      )
      // 2. asenda bindingud override-kategooriatega
      await c.query("DELETE FROM product_category_product WHERE product_id=$1", [pid])
      for (const cid of catIds) {
        await c.query(
          "INSERT INTO product_category_product (product_id, product_category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
          [pid, cid]
        )
      }
    }
    ok++
  }
  console.log(`${EXECUTE ? "Rakendatud" : "Rakendaks"}: ${ok} | toode puudu: ${skipNoProduct} | vigane handle: ${skipBadHandle}`)
  if (EXECUTE && ok > 0) console.log("NB: jooksuta Meili reindex, et muudatused otsingusse jõuaks (index-meilisearch.mjs).")
  await c.end()
})().catch((e) => { console.error("VIGA:", e.message); process.exit(1) })
