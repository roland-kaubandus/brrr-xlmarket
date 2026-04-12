#!/usr/bin/env node
/**
 * Tõlgib VEVOR tooted eesti keelde kasutades Codex CLI-d otse.
 * Iga chunk rakendatakse KOHE DB-sse — kui protsess katkeb, eelnevad tõlked on salvestatud.
 *
 * Kasutus:
 *   node src/scripts/translate-codex-direct.mjs --limit 11000
 */

import pg from "pg"
import { execFile } from "child_process"
import { appendFileSync, mkdirSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const PARALLEL = parseInt(process.argv.includes("--parallel") ? process.argv[process.argv.indexOf("--parallel") + 1] : "5")

function execCodex(prompt) {
  return new Promise((resolve) => {
    const child = execFile(CODEX, [
      "exec", "--dangerously-bypass-approvals-and-sandbox", "-m", "gpt-4.1-mini", "-"
    ], { encoding: "utf8", timeout: 5 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) { resolve({ error: err.message?.substring(0, 200) }); return }
      const jsonMatch = stdout.match(/\[[\s\S]*\]/)
      if (!jsonMatch) { resolve({ error: "no JSON in output" }); return }
      try { resolve({ translated: JSON.parse(jsonMatch[0]) }) }
      catch (e) { resolve({ error: `JSON parse: ${e.message}` }) }
    })
    child.stdin.write(prompt)
    child.stdin.end()
  })
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_URL = "postgres://xlmarket:xlmarket_pg_2026_secure@localhost:5435/xlmarket"
const LOG_FILE = path.resolve(__dirname, "../../data/translation-batches/progress.log")
const CODEX = "/home/brrr/.local/bin/codex"

const args = process.argv.slice(2)
const getArg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback }
const LIMIT = parseInt(getArg("--limit", "50"))
const CHUNK = 25

const PROMPT_HEADER = `Tõlgi järgmised VEVOR tooted inglise keelest eesti keelde.

Reeglid:
- VEVOR brändinimi jääb muutmata
- Title peab olema loomulik eestikeelne tootenimi
- Säilita numbrid, mõõdud, mudelitähised
- Selling point formaat: "Pealkiri: selgitus"
- Kui selling_point on tühi, tagasta tühi string

Vasta AINULT JSON massiivis, iga element:
{"sku":"...","title_et":"...","description_et":"...","sp1":"...","sp2":"...","sp3":"...","sp4":"...","sp5":"..."}
`

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  try { appendFileSync(LOG_FILE, line + "\n") } catch {}
}

async function applyChunk(client, translated, batchId) {
  let applied = 0
  for (const t of translated) {
    if (!t.sku || !t.title_et) continue
    try {
      const meta = JSON.stringify({
        title_et: t.title_et,
        description_et: t.description_et || "",
        selling_point_1_et: t.sp1 || "",
        selling_point_2_et: t.sp2 || "",
        selling_point_3_et: t.sp3 || "",
        selling_point_4_et: t.sp4 || "",
        selling_point_5_et: t.sp5 || "",
        translated: true,
        translation_batch: batchId,
      })
      const res = await client.query(`
        UPDATE product SET
          metadata = metadata || $1::jsonb,
          updated_at = NOW()
        WHERE metadata->>'vevor_sku' = $2
          AND (metadata->>'translation_batch' IS NULL)
      `, [meta, t.sku])
      if (res.rowCount > 0) applied++
    } catch (err) {
      log(`  DB error SKU ${t.sku}: ${err.message.substring(0, 100)}`)
    }
  }
  return applied
}

async function main() {
  const batchId = `direct-${Date.now()}`
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()

  const { rows } = await client.query(`
    SELECT id, title, COALESCE(description,'') as description,
      metadata->>'vevor_sku' as sku,
      metadata->'selling_points'->0 as sp1,
      metadata->'selling_points'->1 as sp2,
      metadata->'selling_points'->2 as sp3,
      metadata->'selling_points'->3 as sp4,
      metadata->'selling_points'->4 as sp5
    FROM product
    WHERE status = 'published'
      AND (metadata->>'translation_batch' IS NULL)
    ORDER BY id
    LIMIT $1
  `, [LIMIT])

  const totalChunks = Math.ceil(rows.length / CHUNK)
  log(`START: ${rows.length} toodet, ${totalChunks} chunk'i, batch ${batchId}`)
  if (rows.length === 0) { await client.end(); return }

  let totalTranslated = 0, totalApplied = 0, totalFailed = 0

  // Build all chunks
  const allChunks = []
  for (let i = 0; i < rows.length; i += CHUNK) {
    allChunks.push({ num: Math.floor(i / CHUNK) + 1, rows: rows.slice(i, i + CHUNK) })
  }

  // Process in parallel batches
  log(`Paralleelsus: ${PARALLEL}`)
  for (let b = 0; b < allChunks.length; b += PARALLEL) {
    const batch = allChunks.slice(b, b + PARALLEL)

    const results = await Promise.all(batch.map(({ num, rows: chunk }) => {
      const input = chunk.map(r => ({
        sku: r.sku || "",
        title: r.title,
        description: (r.description || "").substring(0, 500),
        sp1: r.sp1 || "", sp2: r.sp2 || "", sp3: r.sp3 || "", sp4: r.sp4 || "", sp5: r.sp5 || ""
      }))
      const prompt = PROMPT_HEADER + "\n" + JSON.stringify(input, null, 2)
      return execCodex(prompt).then(r => ({ num, ...r }))
    }))

    // Apply results to DB sequentially
    for (const { num, translated, error } of results) {
      if (error || !translated) {
        totalFailed += CHUNK
        log(`  Chunk ${num}/${totalChunks} FAIL: ${error}`)
        continue
      }
      totalTranslated += translated.length
      const applied = await applyChunk(client, translated, batchId)
      totalApplied += applied
      log(`  Chunk ${num}/${totalChunks}: ${translated.length} tõlgitud, ${applied} DB-sse | Kokku: ${totalApplied}/${rows.length}`)
    }
  }

  log(`DONE: ${totalTranslated} tõlgitud, ${totalApplied} rakendatud, ${totalFailed} ebaõnnestunud`)
  await client.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
