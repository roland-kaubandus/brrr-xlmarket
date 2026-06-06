/**
 * feed-bulk-price.mjs — VEVOR feed → hindade BULK update otse SQL-iga.
 *
 * MIKS: import-vevor-feed.mjs uuendab tooteid Medusa Admin API kaudu →
 * Meili-subscriber reindeksib IGA toote → ~8s/toode (17441 toodet = tunde).
 * See skript läheb API-st MÖÖDA: parsib feed'i, võrdleb DB hindadega, teeb
 * ainult muutunud hindadele ühe bulk UPDATE (price-tabel). Sekundid, mitte tunnid.
 *
 * Kasutus: DATABASE_URL=... node feed-bulk-price.mjs [--execute]
 *   --execute puudub → DRY-RUN (näitab mitu muutuks, ei kirjuta).
 *
 * Hinnavalem: feed Price × 1.15 (käibemaks) → cents. (CLAUDE.md reegel)
 * Laoseis/in_stock EI uuene siin — see tuleb feed-cache rebuild + reindex kaudu.
 */
import ExcelJS from "exceljs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FEED_PATH = process.env.FEED_PATH || path.join(__dirname, "..", "data", "feeds", "vevor-571.xlsx")
const MARKUP = 1.15
const EXECUTE = process.argv.includes("--execute")
const DB_URL = process.env.DATABASE_URL
if (!DB_URL) { console.error("DATABASE_URL puudub"); process.exit(1) }

function toPriceCents(v) {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.,]/g, "").replace(",", "."))
  return Number.isFinite(n) && n > 0 ? Math.round(n * MARKUP * 100) : null
}

async function parseFeed() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(FEED_PATH)
  const ws = wb.worksheets[0]
  if (!ws) throw new Error("Feed workbook has no worksheets")
  const headers = ws.getRow(1).values.slice(1).map((v) => String(v || "").trim())
  const skuIdx = headers.indexOf("SKU")
  const priceIdx = headers.indexOf("Price")
  if (skuIdx < 0 || priceIdx < 0) throw new Error(`Feed columns puudu: SKU=${skuIdx} Price=${priceIdx}`)
  const map = new Map()
  ws.eachRow((row, n) => {
    if (n === 1) return
    const sku = String(row.getCell(skuIdx + 1).value ?? "").trim()
    if (!sku) return
    const cents = toPriceCents(row.getCell(priceIdx + 1).value)
    if (cents != null) map.set(sku, cents)
  })
  return map
}

;(async () => {
  const feedPrice = await parseFeed()
  console.log("Feed SKU-hindu:", feedPrice.size)

  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()
  try {
    const { rows } = await client.query(`
      SELECT p.metadata->>'vevor_sku' sku, pr.id price_id, pr.amount
      FROM product p
      JOIN product_variant v ON v.product_id=p.id AND v.deleted_at IS NULL
      JOIN product_variant_price_set pvps ON pvps.variant_id=v.id
      JOIN price_set ps ON ps.id=pvps.price_set_id
      JOIN price pr ON pr.price_set_id=ps.id AND pr.currency_code='eur'
      WHERE p.deleted_at IS NULL AND p.metadata->>'vevor_sku' IS NOT NULL`)

    // Diff: muutunud hinnad
    const updates = []
    const dbSkus = new Set()
    for (const r of rows) {
      dbSkus.add(r.sku)
      const want = feedPrice.get(r.sku)
      if (want == null) continue
      if (Number(r.amount) !== want) updates.push({ id: r.price_id, amt: want })
    }
    // Uued SKU-d (feed'is, DB-s puuduvad) — neid bulk EI lisa (vajavad täis-importi)
    let newSkus = 0
    for (const sku of feedPrice.keys()) if (!dbSkus.has(sku)) newSkus++

    console.log(`DB eur-hindu: ${rows.length} | hind MUUTUKS: ${updates.length} | UUSI SKU-sid (vaja täis-import): ${newSkus}`)

    if (!EXECUTE) {
      console.log("DRY-RUN — midagi ei kirjutatud. --execute rakendab.")
      return
    }
    let done = 0
    for (let i = 0; i < updates.length; i += 2000) {
      const batch = updates.slice(i, i + 2000)
      const vals = batch.map((_, j) => `($${j * 2 + 1}::text, $${j * 2 + 2}::numeric)`).join(",")
      const params = batch.flatMap((u) => [u.id, u.amt])
      await client.query(
        `UPDATE price SET amount = v.amt, updated_at = now() FROM (VALUES ${vals}) AS v(id, amt) WHERE price.id = v.id`,
        params
      )
      done += batch.length
    }
    console.log("RAKENDATUD: hindu uuendatud", done)
    if (newSkus > 0) console.log(`NB: ${newSkus} uut SKU-d ootab täis-importi (import-vevor-feed.mjs --execute --update)`)
  } finally {
    await client.end()
  }
})().catch((e) => { console.error("VIGA:", e.message); process.exit(1) })
