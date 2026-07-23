#!/usr/bin/env node
// backfill-content-fields.mjs — TÄITAB AINULT PUUDUVAD sisu-väljad feedist.
// Muster: apply-956 ("üks kirjutus, ainult puuduv väli") — MITTE import --update.
//
// MIKS ERALDI SKRIPT (2026-07-23): import-vevor-feed.mjs --update puudutab KEELATUD välju:
//   - HIND (variant prices POST, iga sync) → pricing-engine SSoT konflikt (reprice-existing.mjs)
//   - KATEGOORIA (classifyRow = resolver-v2, iga sync) → Opus-klassifikaator SSoT konflikt + v4 lukud
//   - STATUS "published" (iga sync) → tühistaks archive-proposals delist'i
//   - translation_status="pending" (re-flag) + dimensions overwrite
// See skript EI kutsu variant/price-endpoint'i, EI kirjuta categories/status → puudutab AINULT metadata't.
//
// TÄIDAB (ainult kui PUUDU): selling_points · rich_description (+sanitized_rich_description) · gallery_images
// SÄILITAB (spread + allowlist-värav): title_et/description_et/selling_point_N_et · specs · filter_tokens ·
//   compare_specs · category_override · KÕIK muu metadata · hind · kategooria · status.
//
// KASUTUS:
//   node scripts/backfill-content-fields.mjs                 # DRY-RUN (vaikimisi) — näita mis muutuks
//   node scripts/backfill-content-fields.mjs --execute       # kirjuta (ainult puuduvad väljad)
//   FEED_XLSX_PATH=/data/vevor-571.xlsx  (vaikimisi)  ·  DATABASE_URL (vajalik)
//
// VÄRAV: iga toote juures arvutatakse MUUTUVAD metadata-võtmed; kui MÕNI on väljaspool
//   ALLOWLIST'i → skript PEATUB VALJULT (parem keelduda kui vaikselt üle kirjutada).

import ExcelJS from "exceljs"
import pg from "pg"
import path from "path"
import { fileURLToPath } from "url"
import { sanitizeHtml, cleanRichDescription } from "./lib/vevor-content.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXECUTE = process.argv.includes("--execute")
const LIMIT = process.argv.includes("--limit") ? parseInt(process.argv[process.argv.indexOf("--limit") + 1]) : 0
const FEED_PATH = process.env.FEED_XLSX_PATH || "/data/vevor-571.xlsx"

// AINSAD metadata-võtmed, mida see skript tohib muuta. Miski muu → ABORT.
const ALLOWLIST = new Set(["selling_points", "rich_description", "sanitized_rich_description", "gallery_images"])
// Väljad, mida EI TOHI KUNAGI puutuda (kontroll-nimekiri; värav kinnitab, et need ei muutu).
const FORBIDDEN = ["title_et", "description_et", "specs", "filter_tokens", "compare_specs", "category_override", "price", "prices"]

function txt(v) { return String(v ?? "").trim() }

// KVALITEEDI-VÄRAV: VEVOR xlsx kärbib description_html'i Excel 32767-märgi cell-cap juures →
// 32% ridadest = 30000 märki puhast CSS slider-widget boilerplate't (.vevor-m-label-swiperbox…),
// päris tootesisu (img/p) on kärbitud CAP-i taha. cleanRichDescription EI suuda kärbitut taastada.
// See värav keeldub CSS-junki kirjutamast — parem jätta väli tühjaks kui panna prügi lehele.
function isJunkRich(plain) {
  return /vevor-m-label|:checked\s*~|slideLabel/i.test(plain) || (plain.match(/\{/g) || []).length > 3
}

async function loadFeed() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(FEED_PATH)
  const ws = wb.worksheets[0]
  const headers = ws.getRow(1).values.slice(1).map((v) => txt(v))
  const bySku = {}
  ws.eachRow((row, n) => {
    if (n === 1) return
    const vals = {}
    const rv = row.values
    headers.forEach((h, i) => { vals[h] = rv[i + 1] })
    const sku = txt(vals["SKU"])
    if (!sku) return
    const sellingPoints = []
    for (let i = 1; i <= 8; i++) { const sp = txt(vals["Selling point " + i]); if (sp) sellingPoints.push(sp) }
    const originalImages = txt(vals["goods_original_picture"]).split(",").map((u) => u.trim()).filter(Boolean)
    const galleryImages = txt(vals["image_link1"]).split(",").map((u) => u.trim()).filter(Boolean)
    bySku[sku] = {
      sku,
      sellingPoints,
      richHtml: txt(vals["description_html"]) || null,
      gallery: originalImages.length > 0 ? originalImages : galleryImages,
    }
  })
  return bySku
}

function changedKeys(oldMeta, newMeta) {
  const keys = new Set([...Object.keys(oldMeta || {}), ...Object.keys(newMeta || {})])
  const changed = []
  for (const k of keys) {
    if (JSON.stringify(oldMeta?.[k]) !== JSON.stringify(newMeta?.[k])) changed.push(k)
  }
  return changed
}

async function main() {
  console.log(`=== backfill-content-fields ${EXECUTE ? "EXECUTE" : "DRY-RUN"} · feed=${FEED_PATH} ===`)
  const bySku = await loadFeed()
  console.log(`feed: ${Object.keys(bySku).length} SKU`)

  const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  // Ainult feed-managed (variant.sku === vevor_sku), published, mitte kustutatud.
  const { rows } = await c.query(`
    SELECT p.id, p.handle, p.title, p.metadata,
           v.sku, p.metadata->>'vevor_sku' AS vevor_sku
    FROM product p
    JOIN product_variant v ON v.product_id = p.id AND v.deleted_at IS NULL
    WHERE p.status = 'published' AND p.deleted_at IS NULL
      AND p.metadata->>'vevor_sku' IS NOT NULL
      AND v.sku = p.metadata->>'vevor_sku'
  `)

  let scanned = 0, willChange = 0, notInFeed = 0, feedEmpty = 0
  let fillSp = 0, fillRich = 0, fillGal = 0, richJunkSkipped = 0
  const touchedUnion = new Set()
  const abortCases = []
  const updates = []
  const samples = []

  for (const r of rows) {
    scanned++
    const meta = r.metadata || {}
    const feed = bySku[txt(r.vevor_sku)] || bySku[txt(r.sku)]
    if (!feed) { notInFeed++; continue }

    const spMissing = !Array.isArray(meta.selling_points) || meta.selling_points.length === 0
    // DISPLAY-väli: tooteleht renderdab metadata.sanitized_rich_description (route.ts:426, nõue >50).
    // EI kontrolli raw rich_description'it: 3477 toodet hoiab IDENTSET CSS-boilerplate't (vevor slider
    // widget) raw rich_description'is (vana April-adapter salvestas puhastamata description_html) —
    // see EI ole tootesisu. Fix = RE-DERIVE feedi description_html'ist läbi cleanRichDescription
    // (strib <style>/boilerplate), MITTE raw-välja re-sanitize (annaks sama prügi).
    const richMissing = txt(meta.sanitized_rich_description).length <= 50
    const galMissing = !Array.isArray(meta.gallery_images) || meta.gallery_images.length === 0

    const newMeta = { ...meta }
    const did = []
    if (spMissing && feed.sellingPoints.length > 0) { newMeta.selling_points = feed.sellingPoints; did.push("selling_points"); fillSp++ }
    if (richMissing && feed.richHtml) {
      const cleaned = cleanRichDescription(feed.richHtml, feed.gallery)
      const san = cleaned ? sanitizeHtml(cleaned) : ""
      const plain = san.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      // Kirjuta AINULT päris tootesisu (>=120 märki, mitte CSS-junk). Feed-capped boilerplate → skip.
      if (cleaned && plain.length >= 120 && !isJunkRich(plain)) {
        newMeta.rich_description = cleaned
        newMeta.sanitized_rich_description = san
        did.push("rich_description"); fillRich++
      } else {
        richJunkSkipped++
      }
    }
    if (galMissing && feed.gallery.length > 0) { newMeta.gallery_images = feed.gallery; did.push("gallery_images"); fillGal++ }

    if (did.length === 0) { feedEmpty++; continue }

    // ── VÄRAV: mis metadata-võtmed päriselt muutuvad? Kõik PEAVAD olema allowlist'is ──
    const changed = changedKeys(meta, newMeta)
    const illegal = changed.filter((k) => !ALLOWLIST.has(k))
    if (illegal.length > 0) {
      abortCases.push({ handle: r.handle, illegal })
      continue // ei lisata updates'i; raporteerime lõpus ja ABORT
    }
    changed.forEach((k) => touchedUnion.add(k))
    willChange++
    updates.push({ id: r.id, meta: newMeta })
    if (samples.length < 6) samples.push({ handle: r.handle, title: (r.title || "").slice(0, 50), did })
    if (LIMIT && willChange >= LIMIT) break
  }

  console.log(`\nskännitud (feed-managed published): ${scanned}`)
  console.log(`  pole feedis: ${notInFeed} · feedis puudub sisu täiteks: ${feedEmpty}`)
  console.log(`\nMUUTUKS: ${willChange} toodet`)
  console.log(`  → täidab selling_points: ${fillSp}`)
  console.log(`  → täidab rich_description: ${fillRich}  (feed-CSS-junk vahele jäetud: ${richJunkSkipped})`)
  console.log(`  → täidab gallery_images: ${fillGal}`)
  console.log(`\nPUUDUTATUD metadata-võtmed (liit): ${[...touchedUnion].join(", ") || "(none)"}`)
  console.log(`EI PUUDUTA: hind (variant/price-endpoint'i EI kutsuta) · kategooria (categories EI kirjutata) · status (EI kirjutata) · tõlked/specs/filter_tokens/compare_specs (metadata säilib spread'iga)`)

  // Kinnita FORBIDDEN väljad ei ole puutunud
  const forbiddenHit = FORBIDDEN.filter((f) => touchedUnion.has(f) || [...touchedUnion].some((k) => k.endsWith("_et")))
  if (forbiddenHit.length > 0 || abortCases.length > 0) {
    console.error(`\n❌ PEATUS — keelatud välja muutus tuvastatud:`)
    if (forbiddenHit.length) console.error(`   FORBIDDEN võtmed liidus: ${forbiddenHit.join(", ")}`)
    abortCases.slice(0, 10).forEach((a) => console.error(`   ${a.handle}: illegaalsed võtmed ${a.illegal.join(", ")}`))
    console.error(`   (kokku ${abortCases.length} toodet illegaalsete muutustega) — EI KIRJUTA MIDAGI.`)
    await c.end()
    process.exit(3)
  }

  console.log(`\nNÄIDISED:`)
  for (const s of samples) console.log(`  [${s.did.join("+")}]  ${s.title}  /${s.handle}`)

  if (!EXECUTE) {
    console.log(`\n(DRY-RUN — midagi ei kirjutatud. --execute et rakendada.)`)
    await c.end()
    return
  }

  // ── EXECUTE: ainult metadata UPDATE, transaktsioonis, tükkidena ──
  console.log(`\n✍️  kirjutan ${updates.length} toote metadata't...`)
  await c.query("BEGIN")
  try {
    for (const u of updates) {
      await c.query("UPDATE product SET metadata = $1::jsonb, updated_at = now() WHERE id = $2", [JSON.stringify(u.meta), u.id])
    }
    await c.query("COMMIT")
  } catch (e) {
    await c.query("ROLLBACK")
    console.error("❌ ROLLBACK:", e.message)
    await c.end()
    process.exit(1)
  }
  console.log(`✅ Kirjutatud: ${updates.length} toodet (ainult sisu-metadata).`)
  console.log(`ℹ️  Meili EI vaja reindeksit (selling_points/rich ei ole Meili's; tooteleht loeb Medusa API → DB otse).`)
  await c.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
