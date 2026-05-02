#!/usr/bin/env node
/**
 * Rakenda wo-codex-001-batch-001.json tõlge DB-sse.
 *
 * Selle batch'i tõlke (50 toodet) tegi codex aprill 2026, aga JSON kunagi
 * pärisesse DB-sse ei rakendatud. Praegune fleet hüpates üle nendest tooete
 * (sest nad pole "translated"-il) — duplicate work.
 *
 * Kasutab sama metadata struktuuri mis translate-worker-claude.mjs:
 * title_et, description_et, selling_point_N_et, translated=true, source_hash_et.
 */

import pg from "pg"
import crypto from "crypto"
import { readFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BATCH_FILE = path.resolve(__dirname, "../../data/translation-batches/wo-codex-001-batch-001.json")
const DB_URL = process.env.DATABASE_URL || `postgres://xlmarket:${process.env.PGPASSWORD}@localhost:5435/xlmarket`

function computeSourceHash(en) {
  const payload = `${en.title || ""}|${en.description || ""}`
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16)
}

async function main() {
  if (!process.env.PGPASSWORD && !process.env.DATABASE_URL) {
    console.error("FATAL: PGPASSWORD env var required")
    process.exit(1)
  }

  const batch = JSON.parse(readFileSync(BATCH_FILE, "utf8"))
  console.log(`Loaded ${batch.length} translations from ${BATCH_FILE}`)

  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()

  let applied = 0
  let skipped = 0
  let alreadyDone = 0
  let notFound = 0

  for (const t of batch) {
    if (!t.sku || !t.title_et) { skipped++; continue }

    // Loe EN versioon (source hash jaoks + skip kui juba translated)
    const { rows } = await client.query(
      `SELECT id, title, description,
              (metadata->>'translated')::boolean AS already_translated
       FROM product
       WHERE metadata->>'vevor_sku' = $1
       LIMIT 1`,
      [t.sku]
    )

    if (rows.length === 0) { notFound++; continue }
    if (rows[0].already_translated) { alreadyDone++; continue }

    const en = { title: rows[0].title || "", description: rows[0].description || "" }

    const metaPayload = {
      title_et: t.title_et,
      description_et: t.description_et || "",
      selling_point_1_et: t.selling_point_1_et || t.sp1 || "",
      selling_point_2_et: t.selling_point_2_et || t.sp2 || "",
      selling_point_3_et: t.selling_point_3_et || t.sp3 || "",
      selling_point_4_et: t.selling_point_4_et || t.sp4 || "",
      selling_point_5_et: t.selling_point_5_et || t.sp5 || "",
      translated: true,
      translated_at: new Date().toISOString(),
      translation_status: "translated",
      translation_batch: "wo-codex-001-recovered",
      translation_provider: "codex-orphan-recovery",
      source_hash_et: computeSourceHash(en),
    }

    const res = await client.query(
      `UPDATE product SET
        metadata = metadata || $1::jsonb,
        updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(metaPayload), rows[0].id]
    )

    if (res.rowCount > 0) applied++
  }

  await client.end()

  console.log(`\n=== TULEMUS ===`)
  console.log(`Applied:        ${applied}`)
  console.log(`Already done:   ${alreadyDone}`)
  console.log(`Not found:      ${notFound}`)
  console.log(`Skipped (data): ${skipped}`)
  console.log(`Total in JSON:  ${batch.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
