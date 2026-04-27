#!/usr/bin/env node
/**
 * Translate product_category names + descriptions EN → ET via `claude -p`.
 *
 * Targets product_category rows where deleted_at IS NULL AND
 *   (metadata->>'name_et' IS NULL OR metadata->>'name_et' = '').
 *
 * Stores translations in metadata JSONB:
 *   metadata.name_et          — translated name (1-3 words usually)
 *   metadata.description_et   — translated description (only if non-empty)
 *   metadata.translated_at    — ISO timestamp
 *
 * Batches 25 categories per claude call (names are short, batch is cheap).
 *
 * Usage:
 *   node src/scripts/translate-categories.mjs [--limit 100] [--dry-run] [--model sonnet|haiku] [--batch 25]
 */
import pg from "pg"
import { execFile } from "child_process"
import { readFileSync, mkdirSync, appendFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}
const hasFlag = (name) => args.includes(name)

const LIMIT = parseInt(getArg("--limit", "0"))
const DRY_RUN = hasFlag("--dry-run")
const MODEL = getArg("--model", "sonnet")
const FALLBACK_MODEL = getArg("--fallback-model", "haiku")
const BATCH_SIZE = parseInt(getArg("--batch", "25"))
const STOP_AT = getArg("--stop-at", "23:55")
const CLAUDE_BIN = "/usr/bin/claude"

const ROOT = path.resolve(__dirname, "../../..")
try {
  for (const line of readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
} catch { /* env may already be set */ }

const PG_PASSWORD = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD
if (!PG_PASSWORD) {
  console.error("FATAL: POSTGRES_PASSWORD not set in environment")
  process.exit(1)
}

const DB_URL = `postgres://xlmarket:${PG_PASSWORD}@localhost:5435/xlmarket`
const LOG_DIR = path.resolve(__dirname, "../../data/translation-batches")
mkdirSync(LOG_DIR, { recursive: true })
const LOG_FILE = path.join(LOG_DIR, `categories-translate.log`)
const LIMIT_FLAG = path.join(LOG_DIR, ".claude-limit-reached")

function log(msg) {
  const line = `[${new Date().toISOString()}] [CAT-T] ${msg}`
  console.log(line)
  try { appendFileSync(LOG_FILE, line + "\n") } catch {}
}

function shouldStop() {
  const [h, m] = STOP_AT.split(":").map(Number)
  const now = new Date()
  const stop = new Date(now)
  stop.setHours(h, m, 0, 0)
  if (now >= stop) return "stop-at reached"
  try {
    const fs = require("fs")
    if (fs.existsSync(LIMIT_FLAG)) return "claude limit flag set"
  } catch {}
  return null
}

const PROMPT = (rows) => `Tõlgi XLMarket toote-kategooria nimed ja kirjeldused eesti keelde, ESINDUSE kvaliteediga.

EESMÄRK: kategooria-pealkiri, mida võib näidata professionaalse Eesti e-poe peamenüüs. EI TOHI olla masintõlkelik.

KRIITILISED REEGLID:
- Tagasta AINULT JSON: massiiv objekte {"id": "<original_id>", "name_et": "<eesti>", "description_et": "<eesti või tühi>"}.
- Sama pikkus ja järjekord kui sisendis. Ära muuda "id" välja.
- Brändid jäävad: VEVOR, XLMarket, HoReCa, B2B, AI, ATV, UTV, RV.
- Numbrid ja ühikud jäävad nii nagu on (12V, 24kW, 230V, kg, L, mm, RPM).
- Tühi description = "".
- Ära tõlgi mudelikoode, SKU numbreid, mõõtmeid.

KONTEKSTI KASUTAMINE:
- Iga sisend sisaldab "parent_path" (vanemkategooria) ja võimalik "sample_products" (3 toote pealkirja sellest kategooriast).
- Kasuta neid, et leida ÕIGE Eesti vaste — sama EN sõna tähendab eri asju eri kontekstis:
  * "Mops" + parent="Cleaning" + tooted "Floor Mops" → "Põrandamopid" (mitte koeratõug)
  * "Jacks" + parent="Auto Tools" + tooted "Floor Jack 3 Ton" → "Tungrauad" (mitte mängukaardid)
  * "Bits" + parent="Drilling" + tooted "Drill Bits" → "Puuriotsikud"
  * "Pumps" + parent="Plumbing" → "Pumbad"; aga "Pumps" + parent="Footwear" → "Kingad"

KEELATUD VEAD (eelmistest tõlgetest):
- "Mag puur bitid" → ÕIGE "Magnetpuuriotsikud"
- "Põrandastatív" → ÕIGE "Põrandastatiiv" (ä → iiv)
- "Dispenseer" → ÕIGE "Jaotur" / "Dosaator"
- "Kopp-laadur" (backhoe) → ÕIGE "Tagakopp" / "Tagakaeve-seade"
- "Kanavõrkaed" (hardware cloth) → ÕIGE "Metallvõrk" / "Tugevdatud võrk"
- "Tasanduskopa piik" (box blade) → ÕIGE "Tasanduslaba"
- "Vaatetornitelk" → ÕIGE "Vaatetorn-telk"
- "Põrandapõrand" / topelt-eesliited → ÄRA tee
- ÄRA jäta inglise sõnu: "Heavy Duty", "Brand New", "Portable", "Stainless", "Inch", "Feet", "16 Gauge"

EESTI E-KAUBANDUSE STIIL:
- Lühike, selge, mitmuses (Eesti pood: "Mopid" mitte "Mopp")
- Erialane terminoloogia kus võimalik (mitte "kanavõrkaed" vaid "metallvõrk")
- Kui ei saa elegantset 1-2 sõnalist tõlget, kasuta selget kirjeldavat fraasi (mitte sõna-sõnaline tõlge)

KONTROLLI ENNE VASTUST:
1. Iga "name_et" on eesti keeles, ilma inglise sõnadeta?
2. Kategooria-nimi sobib parent_path konteksti?
3. Kõlab loomulikult Eesti müüja kirjutatuna?

Sisend kategooriad:
${JSON.stringify(rows, null, 2)}`

function callClaude(prompt, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      CLAUDE_BIN,
      [
        "-p",
        "--output-format", "text",
        "--model", MODEL,
        "--fallback-model", FALLBACK_MODEL,
        "--no-session-persistence",
        "--disable-slash-commands",
        "--dangerously-skip-permissions",
      ],
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`claude error: ${err.message}\n${stderr.slice(0, 500)}`))
        resolve(stdout)
      }
    )
    child.stdin.end(prompt)
  })
}

function stripFences(s) {
  let out = s.trim()
  out = out.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim()
  // Claude sometimes adds preamble like "Tagasta ainult JSON:\n[...]" or
  // trailing commentary. Extract first balanced JSON array.
  const start = out.indexOf("[")
  if (start === -1) return out
  let depth = 0
  let inStr = false
  let escape = false
  for (let i = start; i < out.length; i++) {
    const ch = out[i]
    if (escape) { escape = false; continue }
    if (ch === "\\") { escape = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === "[") depth++
    else if (ch === "]") {
      depth--
      if (depth === 0) return out.slice(start, i + 1)
    }
  }
  return out.slice(start)
}

function classifyError(s) {
  const x = String(s || "")
  if (/limit|quota.*reached|rate.?limit|exceeded/i.test(x) && /daily|monthly|plan/i.test(x)) return "limit_reached"
  if (/not logged in|auth.*fail|invalid.*api.*key|unauthori[sz]ed/i.test(x)) return "config_error"
  if (/Reconnecting|ECONNRESET|ETIMEDOUT|overloaded|temporarily unavailable/i.test(x)) return "transient"
  return "unknown"
}

async function translateBatch(client, rows) {
  const t0 = Date.now()
  const ids = rows.map((r) => r.id)
  const input = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || "",
    parent_path: r.parent_name || "",
    sample_products: Array.isArray(r.sample_titles)
      ? r.sample_titles.filter(Boolean).slice(0, 3)
      : [],
  }))

  let raw
  try {
    raw = await callClaude(PROMPT(input))
  } catch (e) {
    const kind = classifyError(e.message)
    if (kind === "limit_reached") {
      log(`!! limit detected — writing ${LIMIT_FLAG}`)
      try { appendFileSync(LIMIT_FLAG, `${new Date().toISOString()} categories worker hit limit\n`) } catch {}
    }
    log(`!! batch FAIL ${ids.length} ids [${kind}]: ${e.message.slice(0, 200)}`)
    return { ok: 0, failed: ids.length, kind }
  }

  let parsed
  try {
    parsed = JSON.parse(stripFences(raw))
  } catch (e) {
    log(`!! JSON parse FAIL: ${e.message}`)
    log(`   first 200: ${stripFences(raw).slice(0, 200)}`)
    return { ok: 0, failed: ids.length, kind: "json_parse" }
  }

  if (!Array.isArray(parsed) || parsed.length !== rows.length) {
    log(`!! shape mismatch: got ${Array.isArray(parsed) ? parsed.length : "non-array"}, expected ${rows.length}`)
    return { ok: 0, failed: ids.length, kind: "shape_mismatch" }
  }

  let applied = 0
  const now = new Date().toISOString()
  for (let i = 0; i < rows.length; i++) {
    const out = parsed[i]
    const original = rows[i]
    if (!out || typeof out.name_et !== "string" || out.name_et.trim() === "" || out.id !== original.id) {
      log(`   skip ${original.id}: invalid output`)
      continue
    }
    if (DRY_RUN) {
      applied++
      continue
    }
    try {
      const newMeta = {
        ...(original.metadata || {}),
        name_et: out.name_et.trim(),
        description_et: typeof out.description_et === "string" ? out.description_et.trim() : "",
        translated_at: now,
      }
      await client.query(
        `UPDATE product_category SET metadata = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(newMeta), original.id]
      )
      applied++
    } catch (e) {
      log(`   db write FAIL ${original.id}: ${e.message.slice(0, 100)}`)
    }
  }

  log(`   batch ${rows.length}: ${applied}/${rows.length} applied (${Date.now() - t0}ms)`)
  return { ok: applied, failed: rows.length - applied, kind: "ok" }
}

async function main() {
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()

  const limitClause = LIMIT > 0 ? `LIMIT ${LIMIT}` : ""
  // Build context: parent_path (breadcrumb chain) + 3 sample product titles per category.
  // mpath is dot-separated parent ids. We resolve only the immediate parent name (most useful context).
  const allRs = await client.query(
    `WITH cat AS (
       SELECT c.id, c.name, c.description, c.metadata, c.handle, c.parent_category_id
       FROM product_category c
       WHERE c.deleted_at IS NULL
         AND (c.metadata->>'name_et' IS NULL OR c.metadata->>'name_et' = '')
       ORDER BY length(c.handle), c.name
       ${limitClause}
     )
     SELECT cat.id, cat.name, cat.description, cat.metadata,
            COALESCE(parent.name, '') AS parent_name,
            (
              SELECT array_agg(p.title)
              FROM (
                SELECT pp.title, pp.created_at
                FROM product pp
                JOIN product_category_product pcp ON pcp.product_id = pp.id
                WHERE pcp.product_category_id = cat.id
                  AND pp.deleted_at IS NULL
                ORDER BY pp.created_at DESC
                LIMIT 3
              ) p
            ) AS sample_titles
       FROM cat
       LEFT JOIN product_category parent ON parent.id = cat.parent_category_id`
  )
  const total = allRs.rows.length
  log(`START: ${total} pending categories, batch=${BATCH_SIZE}, model=${MODEL}, dry-run=${DRY_RUN}, stop-at=${STOP_AT}`)

  let totalApplied = 0
  let totalFailed = 0
  let consecutiveFails = 0

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const stop = shouldStop()
    if (stop) {
      log(`STOPPING: ${stop}`)
      break
    }
    if (consecutiveFails >= 5) {
      log(`STOPPING: 5 consecutive batch failures`)
      break
    }

    const batch = allRs.rows.slice(i, i + BATCH_SIZE)
    const r = await translateBatch(client, batch)
    totalApplied += r.ok
    totalFailed += r.failed
    if (r.kind === "ok" && r.ok > 0) {
      consecutiveFails = 0
    } else {
      consecutiveFails++
    }
    if (r.kind === "limit_reached") break
  }

  log(`DONE: ${totalApplied}/${total} applied, ${totalFailed} failed`)
  await client.end()
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(2)
})
