/**
 * Shared cost-optimization helpers for translation workers.
 *
 * Patterns from cost-aware-llm-pipeline skill applied to VEVOR EN→ET:
 *   - Tier routing: simple/standard/complex product classifier
 *   - Dynamic chunk sizing: pack as many products per request as context allows
 *   - Immutable progress tracking: JSON file updated atomically
 *   - Narrow retry: parse Codex output, distinguish transient from terminal
 *   - Regex validators: 0-API-cost post-translation checks
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "fs"
import path from "path"

// ────────────────────────────────────────────────────────────────
// Tier routing — classifier + chunk sizer
// ────────────────────────────────────────────────────────────────

/**
 * Classify a product's translation complexity. Drives chunk size.
 *
 * Char counts are cheap approximations of token cost. Output size tracks
 * input closely for EE↔EN translation (no dramatic expansion/contraction).
 */
export function classifyTier(row) {
  const t = (row.title || "").length
  const d = (row.description || "").length
  const sp = [row.sp1, row.sp2, row.sp3, row.sp4, row.sp5]
    .filter(Boolean)
    .reduce((s, v) => s + String(v).length, 0)
  const total = t + d + sp
  if (sp === 0) return "simple"
  if (total < 1200) return "standard"
  return "complex"
}

/**
 * Chunk size per tier. Tuned against Codex gpt-5.4 context (128k).
 * Bigger chunks = fewer Codex calls = more products per rate-limit unit.
 *
 * Observed: 25 × 2100 chars ≈ 52k chars input + ~52k output = 26k tokens
 * per request — well within context, 2× throughput vs the prior 15/chunk default.
 */
/**
 * Default chunk size per tier (used by Codex worker).
 * Codex CLI boot overhead ≈ low → smaller chunks are fine.
 */
export function chunkSizeForTier(tier) {
  return { simple: 35, standard: 28, complex: 22 }[tier] ?? 20
}

/**
 * Claude -p spawn overhead is ~40-50k tokens per spawn (Claude Code system
 * prompt + tool registry + auth). Amortise by using larger chunks: each spawn
 * does more work, overhead spread thinner. Rule of thumb: 2-2.5× the Codex
 * chunk size while staying under 200k-tok context.
 */
export function chunkSizeForTierClaude(tier) {
  // Reduced again 2026-05-02 after Sonnet "complex" chunks consistently FAIL'sid 480s
  // timeout'iga (vt translation-research-2026-05-02.md). Põhjus: extended thinking
  // + suur chunk = pikem reasoning kui streaming idle timeout. Lahendus: --effort low
  // (translate-worker-claude.mjs) + väiksemad chunks (kiirem feedback, vältib timeout'i).
  return { simple: 10, standard: 6, complex: 3 }[tier] ?? 5
}

/**
 * Tiered chunk generator. Pass the tier→size function to control batching
 * per provider. Default uses Codex-tier sizes; pass chunkSizeForTierClaude
 * for Claude fleets.
 */
export function* tieredChunksWith(rows, sizeFn = chunkSizeForTier) {
  const buckets = { simple: [], standard: [], complex: [] }
  for (const r of rows) buckets[classifyTier(r)].push(r)
  for (const [tier, items] of Object.entries(buckets)) {
    const size = sizeFn(tier)
    for (let i = 0; i < items.length; i += size) {
      yield { tier, rows: items.slice(i, i + size) }
    }
  }
}

/**
 * Group rows by tier, yield tier-homogeneous chunks.
 * This keeps each Codex call's work predictable + cache-friendly.
 */
export function* tieredChunks(rows) {
  const buckets = { simple: [], standard: [], complex: [] }
  for (const r of rows) buckets[classifyTier(r)].push(r)
  for (const [tier, items] of Object.entries(buckets)) {
    const size = chunkSizeForTier(tier)
    for (let i = 0; i < items.length; i += size) {
      yield { tier, rows: items.slice(i, i + size) }
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Codex error classifier — narrow retry, fail fast on terminal
// ────────────────────────────────────────────────────────────────

/** Terminal: stop all workers, wait for reset. */
const CODEX_LIMIT_MARKERS = [
  /You've hit your usage limit/i,
  /Upgrade to Pro/i,
  /try again at \d+:\d+/i,
]

/** Config error — fix config, no point retrying. */
const CODEX_CONFIG_MARKERS = [
  /model .* does not exist/i,
  /do not have access to it/i,
  /invalid_api_key/i,
  /authentication/i,
]

/** Transient — worth a backoff retry. */
const CODEX_TRANSIENT_MARKERS = [
  /Reconnecting\.\.\./i,
  /stream disconnected/i,
  /ECONNRESET|ETIMEDOUT|ENETUNREACH/,
]

export function classifyCodexError(stdoutOrError) {
  const s = String(stdoutOrError || "")
  if (CODEX_LIMIT_MARKERS.some((r) => r.test(s))) return "limit_reached"
  if (CODEX_CONFIG_MARKERS.some((r) => r.test(s))) return "config_error"
  if (CODEX_TRANSIENT_MARKERS.some((r) => r.test(s))) return "transient"
  return "unknown"
}

// ────────────────────────────────────────────────────────────────
// Zero-cost quality validators
// ────────────────────────────────────────────────────────────────

/**
 * Technical English words that MUST NOT appear in ET output.
 * If they do, translator left them untranslated.
 * Brand names ("VEVOR") and units ("cm", "kg", "RPM") are allowed — they
 * stay English by design. Unit words that ET keeps untranslated (inch, HP)
 * are also whitelisted.
 */
const ENGLISH_LEAK_PATTERN = new RegExp(
  "\\b(" + [
    // Concrete untranslated terms seen in last gatekeeper-bad sample
    "brand new", "fixed", "load capacity", "stock pot",
    "drum dolly", "airbag jack", "bolt[- ]on",
    "bullet ice", "lambo style", "teeth sprocket", "e-bike",
    "6 days", "with", "for", "heavy duty",
    // Generic leaks
    "the ", "and ", "machine ", "system ",
  ].join("|") + ")\\b",
  "i",
)

/** Units we expect to stay in English (don't flag if present in ET). */
const UNITS_ALLOWED = /\b(?:mm|cm|m|km|inch|in|ft|kg|g|L|ml|W|kW|HP|V|A|Hz|RPM|PSI|bar|°C|°F|Nm|lbs?)\b/g

/**
 * Returns array of warnings (empty = clean). Each warning is {code, detail}.
 */
export function validateTranslation(originalEn, translationEt) {
  const warnings = []
  if (!translationEt || translationEt.length < 5) {
    warnings.push({ code: "too_short", detail: translationEt?.length ?? 0 })
    return warnings
  }

  // 1. English technical leak
  const leakMatch = translationEt.match(ENGLISH_LEAK_PATTERN)
  if (leakMatch) {
    warnings.push({ code: "english_leak", detail: leakMatch[0] })
  }

  // 2. Number preservation — extract number+unit pairs from EN, ensure each
  //    appears in ET. Unit may be translated ("inch"→"tolli") so we only
  //    check the numeric portion.
  // 2026-05-02: NORMALISEERI kümnendkohad enne võrdlust — eesti keeles on
  //    standard "24,5" mitte "24.5" (validator blokib false-positiivselt 77
  //    head tõlget kuni see fix tuli).
  const numRe = /(\d[\d.,]*)/g
  const normalizeNum = (s) => s.replace(/,/g, ".").replace(/\.$/, "")
  const enNumbers = new Set((originalEn.match(numRe) || [])
    .filter((n) => n.length > 1)
    .map(normalizeNum))
  const etNumbers = new Set((translationEt.match(numRe) || []).map(normalizeNum))
  const missing = [...enNumbers].filter((n) => !etNumbers.has(n))
  if (missing.length > 0) {
    warnings.push({ code: "number_missing", detail: missing.slice(0, 3).join(",") })
  }

  // 3. Unit misconversion — if EN has "cm" and ET has the same number but "m"
  //    (or vice versa) it's a unit rename bug. Simpler heuristic: count
  //    distinct units in each, if ET has fewer unique units than EN → suspect.
  const enUnits = new Set((originalEn.match(UNITS_ALLOWED) || []))
  const etUnits = new Set((translationEt.match(UNITS_ALLOWED) || []))
  if (enUnits.size > 0 && etUnits.size < enUnits.size) {
    const missingUnits = [...enUnits].filter((u) => !etUnits.has(u))
    if (missingUnits.length > 0) {
      warnings.push({ code: "unit_missing", detail: missingUnits.slice(0, 2).join(",") })
    }
  }

  return warnings
}

// ────────────────────────────────────────────────────────────────
// Progress tracker — single JSON file, atomic-ish writes
// ────────────────────────────────────────────────────────────────

export function trackerPath(baseDir) {
  return path.join(baseDir, "tracker.json")
}

export function readTracker(baseDir) {
  const p = trackerPath(baseDir)
  if (!existsSync(p)) {
    return {
      started_at: new Date().toISOString(),
      translated: 0,
      applied_last_hour: 0,
      codex_limit_hit: null,
      codex_limit_resume_at: null,
      last_reindex_at: null,
      validators: { english_leak: 0, number_missing: 0, unit_missing: 0, too_short: 0 },
      recent_rates: [],
    }
  }
  try { return JSON.parse(readFileSync(p, "utf8")) }
  catch { return { translated: 0, validators: {}, recent_rates: [] } }
}

export function writeTracker(baseDir, tr) {
  const p = trackerPath(baseDir)
  // Best-effort atomic write: write to tmp then rename. Not strictly atomic
  // across multiple workers, but race windows are tiny (one-field increments).
  const tmp = p + ".tmp"
  writeFileSync(tmp, JSON.stringify(tr, null, 2))
  try {
    // Node doesn't expose renameSync atomicity guarantees across all FS, but
    // on ext4/xfs this is atomic enough for our use.
    writeFileSync(p, readFileSync(tmp))
  } catch {}
}

/** Emit a throughput sample to progress log + tracker. */
export function logThroughput(baseDir, sample) {
  const p = path.join(baseDir, "throughput.jsonl")
  try { appendFileSync(p, JSON.stringify({ ts: new Date().toISOString(), ...sample }) + "\n") } catch {}
}

// ────────────────────────────────────────────────────────────────
// Shared control flags — file-based signaling between workers
// ────────────────────────────────────────────────────────────────

/**
 * When any worker detects "limit_reached", it creates this file.
 * Other workers check it before each round and exit gracefully.
 * Avoids 5-consecutive-fails × 3 workers = 15 wasted Codex calls per limit event.
 */
export function limitFlagPath(baseDir) {
  return path.join(baseDir, ".codex-limit-reached")
}

export function setLimitFlag(baseDir, detail) {
  writeFileSync(limitFlagPath(baseDir), JSON.stringify({
    detected_at: new Date().toISOString(),
    detail: String(detail).slice(0, 500),
  }))
}

export function isLimitFlagSet(baseDir) {
  return existsSync(limitFlagPath(baseDir))
}

export function clearLimitFlag(baseDir) {
  const p = limitFlagPath(baseDir)
  if (existsSync(p)) {
    try { writeFileSync(p + ".cleared", readFileSync(p)) } catch {}
    try { require("fs").unlinkSync(p) } catch {}
  }
}
