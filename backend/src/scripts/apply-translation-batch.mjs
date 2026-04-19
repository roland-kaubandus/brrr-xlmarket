#!/usr/bin/env node
/**
 * Rakendab tõlkebatchi DB-sse idempotentselt.
 *
 * Sihtmudel:
 * - product.title / product.description = aktiivne ET sisu
 * - metadata.original_title / original_description = varasem EN
 * - metadata.selling_point_1..5 = aktiivsed ET väärtused
 * - metadata.original_selling_point_1..5 = varasemad EN väärtused
 *
 * Ülemineku ajaks uuendatakse ka metadata.selling_points massiiv,
 * sest olemasolev storefront loeb seda endiselt kuvamiseks.
 */

import pg from "pg"
import { readFileSync } from "fs"
import path from "path"

const { Client } = pg
const DEFAULT_DB_URL = `postgres://xlmarket:${process.env.PGPASSWORD || "PG_PASSWORD_REDACTED"}@localhost:5435/xlmarket`

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return fallback
  return process.argv[idx + 1] ?? fallback
}

function hasFlag(name) {
  return process.argv.includes(name)
}

const DB_URL = process.env.DATABASE_URL || DEFAULT_DB_URL
const INPUT_FILE = getArg("--input")
const DRY_RUN = hasFlag("--dry-run")
const LIMIT = Number.parseInt(getArg("--limit", "0"), 10)

if (!INPUT_FILE) {
  console.error("❌ Kasuta: node src/scripts/apply-translation-batch.mjs --input data/translation-batches/wo-codex-001-batch-001.json")
  process.exit(1)
}

function normalizeText(value) {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

function normalizeDescription(value) {
  if (value === null || value === undefined) return ""
  return String(value).replace(/\r\n/g, "\n").trim()
}

function batchRowKey(row) {
  return `${normalizeText(row.id)}::${normalizeText(row.sku)}`
}

function parseBatch(filePath) {
  const raw = JSON.parse(readFileSync(filePath, "utf8"))
  if (!Array.isArray(raw)) {
    throw new Error("Batch-fail peab olema JSON massiiv")
  }

  const rows = raw.map((item) => {
    if ((!item?.id && !item?.sku) || typeof item?.title_et !== "string") {
      throw new Error(`Vigane batch-kirje: ${JSON.stringify(item)}`)
    }

    for (let index = 1; index <= 5; index++) {
      if (typeof item[`selling_point_${index}_et`] !== "string") {
        throw new Error(`Puuduv selling_point_${index}_et batch-kirjel ${JSON.stringify(item)}`)
      }
    }

    if (typeof item.description_et !== "string") {
      throw new Error(`Puuduv description_et batch-kirjel ${JSON.stringify(item)}`)
    }

    return {
      id: normalizeText(item.id),
      sku: normalizeText(item.sku),
      original_title: normalizeText(item.original_title),
      title_et: normalizeText(item.title_et),
      original_description: normalizeDescription(item.original_description),
      description_et: normalizeDescription(item.description_et),
      original_selling_point_1: normalizeText(item.original_selling_point_1),
      selling_point_1_et: normalizeText(item.selling_point_1_et),
      original_selling_point_2: normalizeText(item.original_selling_point_2),
      selling_point_2_et: normalizeText(item.selling_point_2_et),
      original_selling_point_3: normalizeText(item.original_selling_point_3),
      selling_point_3_et: normalizeText(item.selling_point_3_et),
      original_selling_point_4: normalizeText(item.original_selling_point_4),
      selling_point_4_et: normalizeText(item.selling_point_4_et),
      original_selling_point_5: normalizeText(item.original_selling_point_5),
      selling_point_5_et: normalizeText(item.selling_point_5_et),
    }
  })

  const seen = new Set()
  for (const row of rows) {
    const key = batchRowKey(row)
    if (seen.has(key)) {
      throw new Error(`Dubleeritud id/sku batch-failis: ${key}`)
    }
    seen.add(key)
  }

  return LIMIT > 0 ? rows.slice(0, LIMIT) : rows
}

function getCurrentSellingPoint(metadata, index) {
  const direct = normalizeText(metadata?.[`selling_point_${index}`])
  if (direct) return direct
  if (Array.isArray(metadata?.selling_points) && metadata.selling_points[index - 1]) {
    return normalizeText(metadata.selling_points[index - 1])
  }
  return ""
}

function deriveOriginalSellingPoint(metadata, batchRow, index) {
  const originalKey = `original_selling_point_${index}`
  return (
    normalizeText(metadata?.[originalKey]) ||
    normalizeText(batchRow[originalKey]) ||
    getCurrentSellingPoint(metadata, index)
  )
}

function buildNextMetadata(metadata, batchRow, batchId) {
  const next = { ...(metadata || {}) }
  const translatedPoints = []
  const originalPoints = []

  if (!normalizeText(next.original_title) && batchRow.original_title) {
    next.original_title = batchRow.original_title
  }
  if (!normalizeDescription(next.original_description) && batchRow.original_description) {
    next.original_description = batchRow.original_description
  }

  for (let index = 1; index <= 5; index++) {
    const originalKey = `original_selling_point_${index}`
    const translatedKey = `selling_point_${index}`
    const translatedBatchKey = `selling_point_${index}_et`

    const originalValue = deriveOriginalSellingPoint(metadata, batchRow, index)
    if (!normalizeText(next[originalKey]) && originalValue) {
      next[originalKey] = originalValue
    }

    next[translatedKey] = normalizeText(batchRow[translatedBatchKey])

    if (normalizeText(next[translatedKey])) translatedPoints.push(normalizeText(next[translatedKey]))
    if (normalizeText(next[originalKey])) originalPoints.push(normalizeText(next[originalKey]))
  }

  next.selling_points = translatedPoints
  if (!Array.isArray(next.original_selling_points) || next.original_selling_points.length === 0) {
    next.original_selling_points = originalPoints
  }

  next.translated = true
  next.translation_batch = batchId
  if (!next.translated_at) {
    next.translated_at = new Date().toISOString()
  }

  return next
}

async function main() {
  const batchPath = path.resolve(INPUT_FILE)
  const batchId = path.basename(batchPath, path.extname(batchPath))
  const batch = parseBatch(batchPath)

  const client = new Client({ connectionString: DB_URL })
  await client.connect()

  let updated = 0
  let skipped = 0

  try {
    for (const row of batch) {
      const currentRes = await client.query(
        `
          SELECT id, title, COALESCE(description, '') AS description, COALESCE(metadata, '{}'::jsonb) AS metadata
          FROM product
          WHERE id = $1 OR ($2 <> '' AND metadata->>'vevor_sku' = $2)
        `,
        [row.id, row.sku]
      )

      const current = currentRes.rows[0]
      if (!current) {
        console.warn(`⚠️  Toodet ei leitud: id=${row.id || "-"} sku=${row.sku || "-"}`)
        skipped++
        continue
      }

      const metadata = current.metadata || {}
      const currentOriginalTitle = normalizeText(metadata.original_title)
      const currentTitle = normalizeText(current.title)
      const alreadyApplied =
        currentTitle === row.title_et &&
        normalizeText(metadata.translation_batch) === batchId

      if (!alreadyApplied && !currentOriginalTitle && currentTitle && row.original_title && currentTitle !== row.original_title) {
        throw new Error(`Toote ${current.id} title ei klapi batch-failiga. DB='${currentTitle}' FILE='${row.original_title}'`)
      }

      const nextMetadata = buildNextMetadata(metadata, row, batchId)
      const nextTitle = row.title_et
      const nextDescription = row.description_et

      if (DRY_RUN) {
        console.log(`DRY RUN ${current.id}: ${currentTitle} -> ${nextTitle}`)
        updated++
        continue
      }

      await client.query(
        `
          UPDATE product
          SET
            title = $1,
            description = $2,
            metadata = $3::jsonb,
            updated_at = NOW()
          WHERE id = $4
        `,
        [nextTitle, nextDescription, JSON.stringify(nextMetadata), current.id]
      )

      updated++
    }

    console.log(`✅ Batch ${batchId} töödeldud. Updated=${updated}, Skipped=${skipped}, DryRun=${DRY_RUN}`)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error("❌", error.message)
  process.exit(1)
})
