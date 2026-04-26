#!/usr/bin/env node
/**
 * Cost-optimised partitsioneeritud tõlkija.
 *
 * Rakendatud cost-aware-llm-pipeline skilli mustrid:
 *   - Tier-routing (simple/standard/complex) → dynamic chunk size 35/28/22
 *     (varem 15 kõigile → ~80% rohkem tooteid per Codex-request)
 *   - Graceful limit detection: üks worker näeb "usage limit" → kirjutab
 *     flag-faili, teised exit-ivad järgmisel ringil. Varasem 5-fail-cycle
 *     × 3 workerit = 15 raisatud kõnet per limit → uus = max 3 raisatud.
 *   - Regex validators: english leak + number preservation (0 API kulu)
 *   - Progress tracker + throughput telemetry (tracker.json, throughput.jsonl)
 *
 * Kasutus:
 *   node src/scripts/translate-worker.mjs --worker-id 0 --worker-count 3 --parallel 3 --stop-at 21:00
 *
 * Lisad varasemale:
 *   --budget-translations 5000   # pehme limiit: seiska kui N uut tõlget lisatud
 *   --budget-seconds 14400       # pehme limiit: seiska peale N sekundit
 */

import pg from "pg"
import { execFile } from "child_process"
import { appendFileSync, mkdirSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

import {
  classifyTier,
  tieredChunks,
  classifyCodexError,
  validateTranslation,
  readTracker,
  writeTracker,
  logThroughput,
  setLimitFlag,
  isLimitFlagSet,
} from "./translation-lib.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const getArg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback }

const WORKER_ID = parseInt(getArg("--worker-id", "0"))
const WORKER_COUNT = parseInt(getArg("--worker-count", "1"))
const PARALLEL = parseInt(getArg("--parallel", "3"))
const STOP_AT = getArg("--stop-at", "20:55")
const BUDGET_TRANSLATIONS = parseInt(getArg("--budget-translations", "0")) // 0 = no soft cap
const BUDGET_SECONDS = parseInt(getArg("--budget-seconds", "0"))
const MAX_CONSECUTIVE_FAILS = 5

const CODEX = "/home/brrr/.local/bin/codex"
const DB_URL = `postgres://xlmarket:${process.env.PGPASSWORD}@localhost:5435/xlmarket`
const LOG_DIR = path.resolve(__dirname, "../../data/translation-batches")
mkdirSync(LOG_DIR, { recursive: true })
const LOG_FILE = path.join(LOG_DIR, `worker-${WORKER_ID}.log`)
const STARTED_AT = Date.now()

function log(msg) {
  const line = `[${new Date().toISOString()}] [W${WORKER_ID}] ${msg}`
  console.log(line)
  try { appendFileSync(LOG_FILE, line + "\n") } catch {}
}

function shouldStop() {
  const [h, m] = STOP_AT.split(":").map(Number)
  const now = new Date()
  const stop = new Date(now)
  stop.setHours(h, m, 0, 0)
  if (now >= stop) return "stop-at time reached"
  if (BUDGET_SECONDS > 0 && (Date.now() - STARTED_AT) / 1000 > BUDGET_SECONDS) return "budget-seconds exceeded"
  if (isLimitFlagSet(LOG_DIR)) return "codex limit flag set by another worker"
  return null
}

// Prompt: rules + two few-shot examples (good vs bad) to reduce English leaks
// and protect numbers. Examples taken from real gatekeeper-flagged mistakes.
const PROMPT_HEADER = `Tõlgi järgmised VEVOR tooted inglise keelest eesti keelde.

KRIITILINE — NUMBRID + ÜHIKUD:
- SÄILITA KÕIK NUMBRID TÄPSELT: RPM, V, W, kW, HP, Hz, A, mm, cm, m, km, inch, ft, kg, g, L, ml, °C, °F, Nm, bar, PSI
- "50-2500 RPM" jääb "50-2500 RPM" (mitte 0-2500, mitte 50-2000)
- "170 cm" jääb "170 cm" (MITTE 170 m — üks täht = meetrid asemel sentimeetrid!)
- Mudelitähised, seerianumbrid, koodid (0618WXCC, VFD-500, G80) jäävad muutmata

KRIITILINE — TÕLGI KÕIK SÕNAD:
- Ei ühtegi ingliskeelset sõna ET tõlkes (välja arvatud: VEVOR, mõõtühikud nagu mm/cm/inch/HP/RPM, mudelikoodid)
- Kui ei leia otsest eesti vastet, kasuta kirjeldavat väljendit
- "drum dolly" → "vaadikäru"; "stock pot" → "supipott"; "airbag jack" → "padjaga tungraud"
- "Load Capacity" → "kandevõime"; "Heavy Duty" → "tugev"; "Brand new" → "uus"

NÄITED:
Sisend:  {"title":"VEVOR Heavy Duty Drum Dolly 600 LBS"}
Õige:    {"title_et":"VEVOR tugev vaadikäru 600 lbs (272 kg)"}
Vale:    "VEVOR Heavy Duty drum dolly 600 lbs" (jättis 2 ingliskeelset terminit)

Sisend:  {"title":"Mini Metal Lathe 50-2500 RPM 7x14 Inch"}
Õige:    {"title_et":"Mini-metallitreipink 50-2500 RPM 7x14 inch"}
Vale:    "Mini-metallitreipink 0-2500 RPM 7x14 toll" (RPM moonutatud 50→0; inch → toll lubatud ainult kui kogu tekst ühtlaselt)

REEGLID:
- VEVOR brändinimi muutumatu
- Title loomulikult eesti keelses sõnajärjes
- Selling point formaat: "Lühipealkiri: selgitav lause"
- Kui selling_point tühi, tagasta ""

Vasta AINULT JSON massiivis:
[{"sku":"...","title_et":"...","description_et":"...","sp1":"...","sp2":"...","sp3":"...","sp4":"...","sp5":"..."}]
`

function execCodex(prompt) {
  return new Promise((resolve) => {
    const child = execFile(
      CODEX,
      ["exec", "--dangerously-bypass-approvals-and-sandbox",
       "-c", "model_reasoning_effort=\"medium\"", "-"],
      { encoding: "utf8", timeout: 10 * 60 * 1000, maxBuffer: 20 * 1024 * 1024 },
      (err, stdout) => {
        const combined = (stdout || "") + "\n" + (err?.message || "")
        const kind = classifyCodexError(combined)
        if (err && kind !== "unknown") {
          resolve({ error: err.message.slice(0, 300), errorKind: kind, raw: stdout.slice(-500) })
          return
        }
        if (err) { resolve({ error: err.message.slice(0, 300), errorKind: "unknown", raw: stdout.slice(-500) }); return }
        const jsonMatch = stdout.match(/\[[\s\S]*\]/)
        if (!jsonMatch) { resolve({ error: "no JSON", errorKind: "unknown", raw: stdout.slice(-300) }); return }
        try { resolve({ translated: JSON.parse(jsonMatch[0]) }) }
        catch (e) { resolve({ error: `JSON parse: ${e.message}`, errorKind: "unknown" }) }
      }
    )
    child.stdin.write(prompt)
    child.stdin.end()
  })
}

/**
 * Claim up to `limit` products for this worker's partition.
 * FOR UPDATE SKIP LOCKED avoids races if we ever run >1 process with same worker-id.
 */
async function claimProducts(client, limit, batchId) {
  const { rows } = await client.query(`
    WITH candidates AS (
      SELECT id FROM product
      WHERE status = 'published'
        AND deleted_at IS NULL
        AND (metadata->>'translation_batch') IS NULL
        AND (abs(hashtext(id)) % $1) = $2
        AND title IS NOT NULL
      ORDER BY id
      LIMIT $3
      FOR UPDATE SKIP LOCKED
    )
    UPDATE product p
    SET metadata = metadata || jsonb_build_object('translation_batch', $4::text, 'translation_status', 'claimed'::text)
    FROM candidates c
    WHERE p.id = c.id
    RETURNING p.id,
      p.title,
      COALESCE(p.description, '') AS description,
      p.metadata->>'vevor_sku' AS sku,
      p.metadata->'selling_points'->>0 AS sp1,
      p.metadata->'selling_points'->>1 AS sp2,
      p.metadata->'selling_points'->>2 AS sp3,
      p.metadata->'selling_points'->>3 AS sp4,
      p.metadata->'selling_points'->>4 AS sp5;
  `, [WORKER_COUNT, WORKER_ID, limit, batchId])
  return rows
}

async function applyTranslations(client, translated, batchId, enBySku) {
  let applied = 0
  const validatorCounts = { english_leak: 0, number_missing: 0, unit_missing: 0, too_short: 0 }
  const suspectSkus = []

  for (const t of translated) {
    if (!t.sku || !t.title_et) continue

    // Zero-cost validation pass
    const en = enBySku.get(t.sku) || { title: "", description: "" }
    const warnings = [
      ...validateTranslation(en.title, t.title_et),
      ...validateTranslation(en.description, t.description_et || ""),
    ]
    for (const w of warnings) validatorCounts[w.code] = (validatorCounts[w.code] ?? 0) + 1

    const qualityFlag = warnings.length === 0 ? null : "suspect"
    if (qualityFlag) suspectSkus.push(t.sku)

    try {
      const metaPayload = {
        title_et: t.title_et,
        description_et: t.description_et || "",
        selling_point_1_et: t.sp1 || "",
        selling_point_2_et: t.sp2 || "",
        selling_point_3_et: t.sp3 || "",
        selling_point_4_et: t.sp4 || "",
        selling_point_5_et: t.sp5 || "",
        translated: true,
        translated_at: new Date().toISOString(),
        translation_status: "translated",
        translation_batch: batchId,
      }
      if (qualityFlag) {
        metaPayload.translation_auto_flag = qualityFlag
        metaPayload.translation_auto_warnings = warnings.map((w) => `${w.code}:${w.detail}`).join(";")
      }
      const res = await client.query(`
        UPDATE product SET
          metadata = metadata || $1::jsonb,
          updated_at = NOW()
        WHERE metadata->>'vevor_sku' = $2
          AND (metadata->>'translation_batch') = $3
      `, [JSON.stringify(metaPayload), t.sku, batchId])
      if (res.rowCount > 0) applied++
    } catch (err) {
      log(`  DB error SKU ${t.sku}: ${err.message.slice(0, 100)}`)
    }
  }
  return { applied, validatorCounts, suspectSkus }
}

async function releaseClaim(client, ids, batchId) {
  if (!ids.length) return
  await client.query(`
    UPDATE product SET metadata = metadata - 'translation_batch' - 'translation_status'
    WHERE id = ANY($1) AND (metadata->>'translation_batch') = $2
  `, [ids, batchId])
}

async function main() {
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()

  let roundNum = 0
  let consecutiveFails = 0
  let grandTotalApplied = 0
  let validatorsTotal = { english_leak: 0, number_missing: 0, unit_missing: 0, too_short: 0 }

  log(`START worker ${WORKER_ID}/${WORKER_COUNT} parallel=${PARALLEL} stop-at=${STOP_AT} budget=${BUDGET_TRANSLATIONS || "∞"}`)

  while (true) {
    const stopReason = shouldStop()
    if (stopReason) { log(`STOP: ${stopReason}`); break }
    if (consecutiveFails >= MAX_CONSECUTIVE_FAILS) { log(`STOP: ${MAX_CONSECUTIVE_FAILS} consecutive fails`); break }
    if (BUDGET_TRANSLATIONS > 0 && grandTotalApplied >= BUDGET_TRANSLATIONS) { log(`STOP: budget ${BUDGET_TRANSLATIONS} reached`); break }

    roundNum++
    const batchId = `w${WORKER_ID}-${Date.now()}`

    // Claim a batch roughly matching PARALLEL × chunk capacity.
    // Pull more than we need so tier bucketing can fill chunks evenly.
    const claimLimit = PARALLEL * 35  // 35 = max simple-chunk size
    const rows = await claimProducts(client, claimLimit, batchId)
    if (rows.length === 0) { log(`round ${roundNum}: partition drained, exiting cleanly`); break }

    const chunks = [...tieredChunks(rows)]
    if (chunks.length === 0) continue

    // EN lookup table for validator pass
    const enBySku = new Map()
    for (const r of rows) enBySku.set(r.sku || "", { title: r.title || "", description: r.description || "" })

    // Run PARALLEL chunks at a time against Codex
    let roundApplied = 0
    let roundFailed = 0
    let limitHit = false

    for (let b = 0; b < chunks.length; b += PARALLEL) {
      const batch = chunks.slice(b, b + PARALLEL)
      const results = await Promise.all(batch.map(async ({ tier, rows: cr }, idx) => {
        const input = cr.map((r) => ({
          sku: r.sku || "",
          title: r.title,
          description: (r.description || "").slice(0, 400),
          sp1: r.sp1 || "", sp2: r.sp2 || "", sp3: r.sp3 || "", sp4: r.sp4 || "", sp5: r.sp5 || "",
        }))
        const prompt = PROMPT_HEADER + "\n" + JSON.stringify(input, null, 2)
        const t0 = Date.now()
        const res = await execCodex(prompt)
        return { tier, chunk: cr, idx: b + idx, elapsed: ((Date.now() - t0) / 1000).toFixed(1), ...res }
      }))

      for (const { tier, chunk, idx, elapsed, translated, error, errorKind } of results) {
        if (errorKind === "limit_reached") {
          limitHit = true
          setLimitFlag(LOG_DIR, error)
          log(`  chunk ${idx} tier=${tier} LIMIT REACHED (${elapsed}s) — setting flag for fleet`)
          await releaseClaim(client, chunk.map((c) => c.id), batchId)
          continue
        }
        if (errorKind === "config_error") {
          log(`  chunk ${idx} tier=${tier} CONFIG ERROR (${elapsed}s): ${error}`)
          await releaseClaim(client, chunk.map((c) => c.id), batchId)
          roundFailed += chunk.length
          consecutiveFails = MAX_CONSECUTIVE_FAILS  // fail-fast on config
          continue
        }
        if (error || !translated) {
          log(`  chunk ${idx} tier=${tier} FAIL ${elapsed}s [${errorKind || "unknown"}]: ${error}`)
          await releaseClaim(client, chunk.map((c) => c.id), batchId)
          roundFailed += chunk.length
          continue
        }
        const { applied, validatorCounts } = await applyTranslations(client, translated, batchId, enBySku)
        roundApplied += applied
        for (const [k, v] of Object.entries(validatorCounts)) validatorsTotal[k] += v
        const warned = Object.values(validatorCounts).reduce((a, b) => a + b, 0)
        log(`  chunk ${idx} tier=${tier} ${elapsed}s: ${translated.length} translated, ${applied} applied, ${warned} warnings`)
      }

      if (limitHit) break
    }

    grandTotalApplied += roundApplied
    consecutiveFails = (roundApplied === 0 && roundFailed > 0) ? consecutiveFails + 1 : 0

    logThroughput(LOG_DIR, {
      worker: WORKER_ID, round: roundNum,
      applied: roundApplied, failed: roundFailed,
      validators: validatorsTotal,
    })

    log(`ROUND ${roundNum}: ${roundApplied} applied, ${roundFailed} failed | worker total: ${grandTotalApplied}`)

    if (limitHit) { log(`STOP: limit flag set during round`); break }
  }

  log(`FINAL worker ${WORKER_ID}: ${grandTotalApplied} translations, validators=${JSON.stringify(validatorsTotal)}`)

  // Update shared tracker (best-effort; watchdog also updates)
  try {
    const tr = readTracker(LOG_DIR)
    tr.validators = tr.validators || {}
    for (const [k, v] of Object.entries(validatorsTotal)) {
      tr.validators[k] = (tr.validators[k] || 0) + v
    }
    writeTracker(LOG_DIR, tr)
  } catch {}

  await client.end()
}

main().catch((e) => { log(`FATAL: ${e.message}`); process.exit(1) })
