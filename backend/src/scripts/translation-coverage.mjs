#!/usr/bin/env node
/**
 * Tõlkekatvuse raport — näitab, kui palju tooteid on tõlgitud ja kus on puudujäägid.
 * Kasutus: node src/scripts/translation-coverage.mjs
 */

import pg from "pg"
const { Client } = pg
const DB_URL = process.env.DATABASE_URL || `postgres://xlmarket:${process.env.PGPASSWORD || "PG_PASSWORD_REDACTED"}@localhost:5435/xlmarket`

async function main() {
  const client = new Client({ connectionString: DB_URL })
  await client.connect()

  try {
    // Overall summary
    const summary = await client.query(`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE metadata->>'translation_batch' IS NOT NULL) as batch_translated,
        count(*) FILTER (WHERE metadata->>'original_title' IS NOT NULL AND metadata->>'original_title' != '' AND metadata->>'translation_batch' IS NULL) as original_saved,
        count(*) FILTER (WHERE (metadata->>'original_title' IS NULL OR metadata->>'original_title' = '') AND metadata->>'translation_batch' IS NULL) as untouched
      FROM product WHERE status = 'published'
    `)
    const s = summary.rows[0]
    const totalEt = parseInt(s.batch_translated)
    const totalProducts = parseInt(s.total)

    console.log("═══════════════════════════════════════════════════════════")
    console.log("  TÕLKEKATVUSE RAPORT — xlmarket.eu")
    console.log("═══════════════════════════════════════════════════════════")
    console.log()
    console.log(`  Tooteid kokku (published):  ${totalProducts}`)
    console.log(`  ✅ Tõlgitud (batch):         ${s.batch_translated}  (${(100 * totalEt / totalProducts).toFixed(1)}%)`)
    console.log(`  🔶 Originaal salvestatud:     ${s.original_saved}  (ettevalmistatud, aga tõlkimata)`)
    console.log(`  ❌ Puutumata:                 ${s.untouched}  (pole üldse tõlkeprotsessis)`)
    console.log(`  📊 Puudu kokku:               ${totalProducts - totalEt}  (${(100 * (totalProducts - totalEt) / totalProducts).toFixed(1)}%)`)
    console.log()

    // By L1 category
    const cats = await client.query(`
      SELECT
        COALESCE(NULLIF(split_part(metadata->>'vevor_product_type', ' > ', 1), ''), 'Unknown') as cat,
        count(*) as total,
        count(*) FILTER (WHERE metadata->>'translation_batch' IS NOT NULL) as translated
      FROM product WHERE status = 'published'
      GROUP BY 1
      ORDER BY count(*) DESC
    `)

    console.log("  KATVUS KATEGOORIA KAUPA (L1)")
    console.log("  ─────────────────────────────────────────────────────────")
    console.log("  Kategooria                   │ Kokku │ Tõlgit │  Puudu │   %")
    console.log("  ─────────────────────────────────────────────────────────")

    for (const row of cats.rows) {
      const total = parseInt(row.total)
      const translated = parseInt(row.translated)
      const missing = total - translated
      const pct = total > 0 ? (100 * translated / total).toFixed(1) : "0.0"
      const bar = pct > 0 ? "▓".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5)) : "░".repeat(20)
      const catName = row.cat.padEnd(28)
      console.log(`  ${catName} │ ${String(total).padStart(5)} │ ${String(translated).padStart(6)} │ ${String(missing).padStart(6)} │ ${bar} ${pct}%`)
    }

    console.log("  ─────────────────────────────────────────────────────────")
    console.log()

    // Selling points coverage
    const sp = await client.query(`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE metadata->>'selling_point_1' IS NOT NULL AND metadata->>'selling_point_1' != '') as has_sp1,
        count(*) FILTER (WHERE metadata->>'selling_point_2' IS NOT NULL AND metadata->>'selling_point_2' != '') as has_sp2,
        count(*) FILTER (WHERE metadata->>'selling_point_3' IS NOT NULL AND metadata->>'selling_point_3' != '') as has_sp3,
        count(*) FILTER (WHERE metadata->>'selling_point_4' IS NOT NULL AND metadata->>'selling_point_4' != '') as has_sp4,
        count(*) FILTER (WHERE metadata->>'selling_point_5' IS NOT NULL AND metadata->>'selling_point_5' != '') as has_sp5
      FROM product WHERE status = 'published'
    `)
    const spRow = sp.rows[0]
    console.log("  SELLING POINTS (ET) KATVUS")
    console.log("  ─────────────────────────────────────────────────────────")
    for (let i = 1; i <= 5; i++) {
      const count = parseInt(spRow[`has_sp${i}`])
      console.log(`  selling_point_${i}: ${count} / ${spRow.total}  (${(100 * count / parseInt(spRow.total)).toFixed(1)}%)`)
    }
    console.log()

    // Batch history
    const batches = await client.query(`
      SELECT
        metadata->>'translation_batch' as batch,
        count(*) as products,
        MIN(metadata->>'translated_at') as first_at,
        MAX(metadata->>'translated_at') as last_at
      FROM product
      WHERE status = 'published' AND metadata->>'translation_batch' IS NOT NULL
      GROUP BY 1
      ORDER BY first_at
    `)
    if (batches.rows.length > 0) {
      console.log("  BATCH AJALUGU")
      console.log("  ─────────────────────────────────────────────────────────")
      for (const b of batches.rows) {
        console.log(`  ${b.batch}: ${b.products} toodet (${b.first_at?.substring(0, 10)})`)
      }
      console.log()
    }

    // Estimate remaining work
    const remainingHours = Math.ceil((totalProducts - totalEt) / 50) // ~50 per batch
    console.log("  HINNANG")
    console.log("  ─────────────────────────────────────────────────────────")
    console.log(`  Batch'e vaja (à ~50 toodet):  ~${remainingHours}`)
    console.log(`  Tõlgitavaid tooteid:          ${totalProducts - totalEt}`)
    console.log()

  } finally {
    await client.end()
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })
