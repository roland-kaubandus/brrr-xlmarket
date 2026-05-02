#!/usr/bin/env node
/**
 * Claude CLI variant of translate-worker.mjs.
 *
 * Uses `claude -p` (non-interactive print mode) against user's Max subscription.
 * Runs on a separate quota pool from Codex, so the two can work in parallel.
 *
 * Same cost-aware-llm-pipeline optimisations as Codex variant:
 *   - Tiered chunks via shared translation-lib.mjs
 *   - Graceful limit detection (different marker patterns than Codex)
 *   - Regex validators (0 API cost)
 *   - Progress tracker + throughput telemetry
 *
 * Claude-specific features:
 *   - `--model sonnet|haiku` routing — we default to sonnet for quality, fall
 *     back to haiku if sonnet overloaded
 *   - `--fallback-model` handles transient overload automatically
 *   - `--no-session-persistence` — stateless, no ~/.claude history bloat
 *   - `--disable-slash-commands` — don't load skills on every spawn
 *   - `--dangerously-skip-permissions` — needed for unattended runs
 *   - Strip common markdown fences from output (```json ... ```)
 *
 * Usage:
 *   node src/scripts/translate-worker-claude.mjs --worker-id 0 --worker-count 2 --parallel 3 --model sonnet --stop-at 20:00
 */

import pg from "pg"
import { execFile } from "child_process"
import { appendFileSync, mkdirSync } from "fs"
import crypto from "crypto"
import path from "path"
import { fileURLToPath } from "url"

import {
  classifyTier,
  chunkSizeForTierClaude,
  tieredChunksWith,
  validateTranslation,
  readTracker,
  writeTracker,
  logThroughput,
  setLimitFlag,
  isLimitFlagSet,
  limitFlagPath,
} from "./translation-lib.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const getArg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback }

const WORKER_ID = parseInt(getArg("--worker-id", "0"))
const WORKER_COUNT = parseInt(getArg("--worker-count", "1"))
const PARALLEL = parseInt(getArg("--parallel", "3"))
const MODEL = getArg("--model", "sonnet")
const FALLBACK_MODEL = getArg("--fallback-model", "haiku")
const STOP_AT = getArg("--stop-at", "20:00")
const BUDGET_TRANSLATIONS = parseInt(getArg("--budget-translations", "0"))
const MAX_CONSECUTIVE_FAILS = 5
const PROVIDER_ID = "claude"

const CLAUDE_BIN = "/usr/bin/claude"
const DB_URL = `postgres://xlmarket:${process.env.PGPASSWORD}@localhost:5435/xlmarket`
const LOG_DIR = path.resolve(__dirname, "../../data/translation-batches")
mkdirSync(LOG_DIR, { recursive: true })
const LOG_FILE = path.join(LOG_DIR, `worker-claude-${WORKER_ID}.log`)
// Separate limit flag per provider so Codex-limit doesn't stop Claude workers
const PROVIDER_LIMIT_FLAG = path.join(LOG_DIR, `.${PROVIDER_ID}-limit-reached`)

const STARTED_AT = Date.now()

function log(msg) {
  const line = `[${new Date().toISOString()}] [CW${WORKER_ID}] ${msg}`
  console.log(line)
  try { appendFileSync(LOG_FILE, line + "\n") } catch {}
}

function shouldStop() {
  const [h, m] = STOP_AT.split(":").map(Number)
  const now = new Date()
  const stop = new Date(now)
  stop.setHours(h, m, 0, 0)
  if (now >= stop) return "stop-at time reached"
  // Check provider-specific limit flag only — Codex limit doesn't affect us
  try {
    const fs = require("fs")
    if (fs.existsSync(PROVIDER_LIMIT_FLAG)) return "claude limit flag set"
  } catch {}
  return null
}

// Pattern library for Claude limit / auth / transient errors
function classifyClaudeError(stdoutOrError) {
  const s = String(stdoutOrError || "")
  if (/limit|quota.*reached|rate.?limit|exceeded/i.test(s) && /daily|monthly|plan/i.test(s)) return "limit_reached"
  if (/not logged in|auth.*fail|invalid.*api.*key|unauthori[sz]ed/i.test(s)) return "config_error"
  if (/Reconnecting|ECONNRESET|ETIMEDOUT|overloaded|temporarily unavailable/i.test(s)) return "transient"
  return "unknown"
}

// Prompt — same structure as Codex worker, adjusted slightly for Claude's
// preference for explicit JSON-only output (Claude tends to add markdown fences
// otherwise)
// Lühike prompt — pikk rule-list (varem 30+ rida) põhjustas Sonnet'il 121s
// timeout + tühja output. Lühikesena töötab 15-prod chunk 19-37s-ga.
const PROMPT_HEADER = `Tõlgi järgmised VEVOR tooted inglise keelest eesti keelde.

Säilita TÄPSELT: numbrid, RPM, mõõdud (mm/cm/inch), ühikud (HP/kW/W/V), mudelitähised, VEVOR brändinimi.
Tõlgi KÕIK ingliskeelsed sõnad (va brändid+ühikud). Title loomulik eesti keel.

Vasta AINULT JSON massiivis:
[{"sku":"","title_et":"","description_et":"","sp1":"","sp2":"","sp3":"","sp4":"","sp5":""}]

Sisend:`

function stripMarkdownFences(text) {
  // Claude sometimes wraps output in ```json ... ``` — strip
  return text
    .replace(/^[\s\n]*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim()
}

// CLAUDE.md projekti-tasemel reegel "100% INGLISE KEEL" eemaldatud
// 2026-04-24 — ei vaja enam cwd-hack'i ega --append-system-prompt override'i.
function execClaude(prompt, model) {
  return new Promise((resolve) => {
    const baseArgs = [
      "-p",
      "--output-format", "text",
      "--model", model,
      // 2026-05-02: --effort low — translation pole multi-step reasoning,
      // extended thinking burns 10× tokens + on tõenäoline 480s timeout põhjus
      // (translation-research-2026-05-02.md, samm 1).
      "--effort", "low",
      "--no-session-persistence",
      "--disable-slash-commands",
      "--dangerously-skip-permissions",
    ]
    // Claude CLI refuses --fallback-model == --model; omit flag in that case
    if (FALLBACK_MODEL && FALLBACK_MODEL !== model) {
      baseArgs.push("--fallback-model", FALLBACK_MODEL)
    }
    // 2026-05-02: timeout 8min → 90s. Väiksemad chunks (10/6/3) peaksid
    // mahtuma alla 60s. 90s = headroom + kiirem failover Haikuga (samm 3).
    const child = execFile(
      CLAUDE_BIN,
      baseArgs,
      { encoding: "utf8", timeout: 90 * 1000, maxBuffer: 20 * 1024 * 1024 },
      (err, stdout) => {
        const combined = (stdout || "") + "\n" + (err?.message || "")
        const kind = classifyClaudeError(combined)
        if (err && kind !== "unknown") {
          resolve({ error: err.message.slice(0, 300), errorKind: kind, raw: stdout.slice(-500) })
          return
        }
        if (err) { resolve({ error: err.message.slice(0, 300), errorKind: "unknown", raw: stdout.slice(-500) }); return }
        const cleaned = stripMarkdownFences(stdout)
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
        if (!jsonMatch) { resolve({ error: "no JSON", errorKind: "unknown", raw: stdout.slice(-300) }); return }
        try { resolve({ translated: JSON.parse(jsonMatch[0]) }) }
        catch (e) { resolve({ error: `JSON parse: ${e.message}`, errorKind: "unknown" }) }
      }
    )
    child.stdin.write(prompt)
    child.stdin.end()
  })
}

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

// 2026-05-02 v3: Critical warnings tühi. validateTranslation regex on liiga
// karm (näeb "06" → "missing", lokaliseeritud units → "unit_missing",
// formated numbrid jne). Kõik tõlked lähevad translated=true sisse + suspect
// flag warnings'iga. Hilisem cron + LLM-as-judge teeb täpsema audit'i (vt
// outputs/translation-research-2026-05-02.md COMETKiwi + GEMBA-MQM samm).
const CRITICAL_WARNING_CODES = new Set([])

// 2026-05-02: source hash for stale detection (samm 5). Kui hiljem source
// EN muutub (price update, description rewrite), võrdleme hashi → mark stale.
function computeSourceHash(en) {
  const payload = `${en.title || ""}|${en.description || ""}`
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16)
}

async function applyTranslations(client, translated, batchId, enBySku) {
  let applied = 0
  let autoRejected = 0
  const validatorCounts = { english_leak: 0, number_missing: 0, unit_missing: 0, too_short: 0 }

  for (const t of translated) {
    if (!t.sku || !t.title_et) continue
    const en = enBySku.get(t.sku) || { title: "", description: "" }
    const warnings = [
      ...validateTranslation(en.title, t.title_et),
      ...validateTranslation(en.description, t.description_et || ""),
    ]
    for (const w of warnings) validatorCounts[w.code] = (validatorCounts[w.code] ?? 0) + 1

    const hasCritical = warnings.some((w) => CRITICAL_WARNING_CODES.has(w.code))

    try {
      const metaPayload = {
        title_et: t.title_et,
        description_et: t.description_et || "",
        selling_point_1_et: t.sp1 || "",
        selling_point_2_et: t.sp2 || "",
        selling_point_3_et: t.sp3 || "",
        selling_point_4_et: t.sp4 || "",
        selling_point_5_et: t.sp5 || "",
        translated_at: new Date().toISOString(),
        translation_batch: batchId,
        translation_provider: PROVIDER_ID,
        source_hash_et: computeSourceHash(en),
      }
      if (hasCritical) {
        // Auto-reject: numbrid/units rikutud — pane queue'isse retry'ks.
        // 'translated' jääb false (või null) → fleet võtab toote järgmises
        // round'is uuesti.
        metaPayload.translated = false
        metaPayload.translation_status = "auto_rejected"
        metaPayload.translation_auto_flag = "critical"
        metaPayload.translation_auto_warnings = warnings.map((w) => `${w.code}:${w.detail}`).join(";")
      } else {
        metaPayload.translated = true
        metaPayload.translation_status = "translated"
        if (warnings.length > 0) {
          metaPayload.translation_auto_flag = "suspect"
          metaPayload.translation_auto_warnings = warnings.map((w) => `${w.code}:${w.detail}`).join(";")
        }
      }
      const res = await client.query(`
        UPDATE product SET
          metadata = metadata || $1::jsonb,
          updated_at = NOW()
        WHERE metadata->>'vevor_sku' = $2
          AND (metadata->>'translation_batch') = $3
      `, [JSON.stringify(metaPayload), t.sku, batchId])
      if (res.rowCount > 0) {
        if (hasCritical) autoRejected++
        else applied++
      }
    } catch (err) {
      log(`  DB error SKU ${t.sku}: ${err.message.slice(0, 100)}`)
    }
  }
  if (autoRejected > 0) log(`  auto-rejected ${autoRejected} (critical warnings: numbers/units lost)`)
  return { applied, validatorCounts }
}

async function releaseClaim(client, ids, batchId) {
  if (!ids.length) return
  await client.query(`
    UPDATE product SET metadata = metadata - 'translation_batch' - 'translation_status'
    WHERE id = ANY($1) AND (metadata->>'translation_batch') = $2
  `, [ids, batchId])
}

function setProviderLimitFlag(detail) {
  // Use provider-specific flag so Codex fleet isn't blocked
  const fs = require("fs")
  fs.writeFileSync(PROVIDER_LIMIT_FLAG, JSON.stringify({
    provider: PROVIDER_ID,
    detected_at: new Date().toISOString(),
    detail: String(detail).slice(0, 500),
  }))
}

async function main() {
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()

  let roundNum = 0
  let consecutiveFails = 0
  let grandTotalApplied = 0
  let validatorsTotal = { english_leak: 0, number_missing: 0, unit_missing: 0, too_short: 0 }

  log(`START claude-worker ${WORKER_ID}/${WORKER_COUNT} parallel=${PARALLEL} model=${MODEL} fallback=${FALLBACK_MODEL} stop-at=${STOP_AT}`)

  while (true) {
    const stopReason = shouldStop()
    if (stopReason) { log(`STOP: ${stopReason}`); break }
    if (consecutiveFails >= MAX_CONSECUTIVE_FAILS) { log(`STOP: ${MAX_CONSECUTIVE_FAILS} consecutive fails`); break }
    if (BUDGET_TRANSLATIONS > 0 && grandTotalApplied >= BUDGET_TRANSLATIONS) { log(`STOP: budget ${BUDGET_TRANSLATIONS} reached`); break }

    roundNum++
    const batchId = `cw${WORKER_ID}-${Date.now()}`

    // Claim enough rows for PARALLEL × max-Claude-chunk (70 = simple tier)
    const claimLimit = PARALLEL * 70
    const rows = await claimProducts(client, claimLimit, batchId)
    if (rows.length === 0) { log(`round ${roundNum}: partition drained, exiting cleanly`); break }

    const chunks = [...tieredChunksWith(rows, chunkSizeForTierClaude)]
    if (chunks.length === 0) continue

    const enBySku = new Map()
    for (const r of rows) enBySku.set(r.sku || "", { title: r.title || "", description: r.description || "" })

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
        const res = await execClaude(prompt, MODEL)
        return { tier, chunk: cr, idx: b + idx, elapsed: ((Date.now() - t0) / 1000).toFixed(1), ...res }
      }))

      for (const { tier, chunk, idx, elapsed, translated, error, errorKind } of results) {
        if (errorKind === "limit_reached") {
          limitHit = true
          setProviderLimitFlag(error)
          log(`  chunk ${idx} tier=${tier} CLAUDE LIMIT REACHED (${elapsed}s) — flagging + exiting`)
          await releaseClaim(client, chunk.map((c) => c.id), batchId)
          continue
        }
        if (errorKind === "config_error") {
          log(`  chunk ${idx} tier=${tier} CONFIG ERROR (${elapsed}s): ${error}`)
          await releaseClaim(client, chunk.map((c) => c.id), batchId)
          roundFailed += chunk.length
          consecutiveFails = MAX_CONSECUTIVE_FAILS
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
      worker: `claude-${WORKER_ID}`, round: roundNum,
      applied: roundApplied, failed: roundFailed,
    })
    log(`ROUND ${roundNum}: ${roundApplied} applied, ${roundFailed} failed | worker total: ${grandTotalApplied}`)
    if (limitHit) break
  }

  log(`FINAL claude-worker ${WORKER_ID}: ${grandTotalApplied} translations, validators=${JSON.stringify(validatorsTotal)}`)
  await client.end()
}

main().catch((e) => { log(`FATAL: ${e.message}`); process.exit(1) })
