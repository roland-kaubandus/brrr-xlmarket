#!/usr/bin/env node
/**
 * Gatekeeper — sämbib viimati tõlgitud tooteid, laseb Codexil hinnata kvaliteeti 1-5 skaalal.
 * Märgib halvad (<3) `metadata.translation_quality='bad'` ja lisab `metadata.translation_issues` kommentaari.
 * Loopib iga SAMPLE_INTERVAL_MS järel kuni --stop-at ajani.
 *
 * Kasutus:
 *   node src/scripts/translation-gatekeeper.mjs --sample 15 --interval 180 --stop-at 20:55
 */

import pg from "pg"
import { execFile } from "child_process"
import { appendFileSync, mkdirSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const getArg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback }

const SAMPLE = parseInt(getArg("--sample", "15"))
const INTERVAL_S = parseInt(getArg("--interval", "180"))
const STOP_AT = getArg("--stop-at", "20:55")

const CODEX = "/home/brrr/.local/bin/codex"
const DB_URL = `postgres://xlmarket:${process.env.PGPASSWORD}@localhost:5435/xlmarket`
const LOG_DIR = path.resolve(__dirname, "../../data/translation-batches")
mkdirSync(LOG_DIR, { recursive: true })
const LOG_FILE = path.join(LOG_DIR, "gatekeeper.log")
const BAD_LOG = path.join(LOG_DIR, "gatekeeper-bad.jsonl")

function log(msg) {
  const line = `[${new Date().toISOString()}] [GK] ${msg}`
  console.log(line)
  try { appendFileSync(LOG_FILE, line + "\n") } catch {}
}

function shouldStop() {
  const [h, m] = STOP_AT.split(":").map(Number)
  const now = new Date()
  const stop = new Date(now)
  stop.setHours(h, m, 0, 0)
  return now >= stop
}

const PROMPT = `Sa oled eesti keele tõlkekvaliteedi hindaja VEVOR e-poe kontekstis.

Hinda iga toote tõlget 1-5 skaalal:
5 = loomulik eesti keel, tehnilised terminid korrektsed, kõik numbrid/mõõdud/mudelitähised säilinud
4 = enamjaolt hea, väiksed stiiliparandused võimalikud
3 = arusaadav aga kohmakas või tehnilised terminid kaheldavad
2 = mitu viga või ebaloomulik, vajab ümbertegemist
1 = vale tõlge, masin-tõlke, kadunud olulised detailid

Vasta AINULT JSON massiivis:
[{"sku":"...","rating":5,"issues":""}, ...]

issues = lühike märkus kui rating < 4, muidu tühi string.
`

function execCodex(prompt) {
  return new Promise((resolve) => {
    const child = execFile(
      CODEX,
      ["exec", "--dangerously-bypass-approvals-and-sandbox", "-c", "model_reasoning_effort=\"medium\"", "-"],
      { encoding: "utf8", timeout: 6 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) { resolve({ error: err.message?.substring(0, 300) }); return }
        const jsonMatch = stdout.match(/\[[\s\S]*\]/)
        if (!jsonMatch) { resolve({ error: "no JSON", raw: stdout.slice(-200) }); return }
        try { resolve({ ratings: JSON.parse(jsonMatch[0]) }) }
        catch (e) { resolve({ error: `JSON parse: ${e.message}` }) }
      }
    )
    child.stdin.write(prompt)
    child.stdin.end()
  })
}

async function sampleRecent(client) {
  const { rows } = await client.query(`
    SELECT
      metadata->>'vevor_sku' AS sku,
      metadata->>'original_title' AS en_title,
      title AS en_title_fallback,
      metadata->>'title_et' AS et_title,
      LEFT(COALESCE(description, ''), 300) AS en_desc,
      LEFT(COALESCE(metadata->>'description_et', ''), 300) AS et_desc,
      metadata->>'translated_at' AS translated_at
    FROM product
    WHERE (metadata->>'title_et') IS NOT NULL
      AND (metadata->>'title_et') <> ''
      AND (metadata->>'translation_quality') IS NULL
      AND (metadata->>'translated_at') IS NOT NULL
      AND deleted_at IS NULL
    ORDER BY (metadata->>'translated_at') DESC
    LIMIT $1
  `, [SAMPLE])
  return rows
}

async function applyRatings(client, ratings) {
  let flagged = 0
  for (const r of ratings) {
    if (!r.sku || !r.rating) continue
    const quality = r.rating >= 4 ? "good" : (r.rating >= 3 ? "ok" : "bad")
    try {
      await client.query(`
        UPDATE product SET
          metadata = metadata || jsonb_build_object(
            'translation_quality', $1::text,
            'translation_rating', $2::int,
            'translation_issues', $3::text
          )
        WHERE metadata->>'vevor_sku' = $4
      `, [quality, r.rating, r.issues || "", r.sku])
      if (quality === "bad") {
        flagged++
        appendFileSync(BAD_LOG, JSON.stringify({ ts: new Date().toISOString(), ...r }) + "\n")
      }
    } catch (err) {
      log(`  DB error SKU ${r.sku}: ${err.message.substring(0, 80)}`)
    }
  }
  return flagged
}

async function main() {
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()

  log(`START gatekeeper: sample=${SAMPLE}, interval=${INTERVAL_S}s, stop-at=${STOP_AT}`)
  let round = 0
  let totalRated = 0, totalBad = 0

  while (!shouldStop()) {
    round++
    const products = await sampleRecent(client)
    if (products.length === 0) {
      log(`round ${round}: nothing to review yet`)
      await new Promise(r => setTimeout(r, INTERVAL_S * 1000))
      continue
    }

    const input = products.map(p => ({
      sku: p.sku,
      en_title: p.en_title || p.en_title_fallback,
      et_title: p.et_title,
      en_desc: p.en_desc,
      et_desc: p.et_desc,
    }))
    const prompt = PROMPT + "\n" + JSON.stringify(input, null, 2)
    const t0 = Date.now()
    const { ratings, error } = await execCodex(prompt)
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

    if (error || !ratings) {
      log(`round ${round} FAIL ${elapsed}s: ${error}`)
      await new Promise(r => setTimeout(r, INTERVAL_S * 1000))
      continue
    }

    const flagged = await applyRatings(client, ratings)
    const avgRating = (ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length).toFixed(2)
    totalRated += ratings.length
    totalBad += flagged
    log(`round ${round} ${elapsed}s: ${ratings.length} rated, avg=${avgRating}, bad=${flagged} (total rated=${totalRated}, bad=${totalBad})`)

    await new Promise(r => setTimeout(r, INTERVAL_S * 1000))
  }

  log(`FINAL gatekeeper: ${totalRated} rated, ${totalBad} flagged bad`)
  await client.end()
}

main().catch(e => { log(`FATAL: ${e.message}`); process.exit(1) })
