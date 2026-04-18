/**
 * resolver.mjs — Feed-resolver v2 main API.
 *
 * Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §5
 *
 *   classifyProduct(row, { meiliClient? } = {}) →
 *     {
 *       l1_slug, l2_slug, l3_slug,       // taxonomy v3 canonical slugs
 *       confidence,                      // 0.0..1.00
 *       method,                          // S1_sku_override | S2_path_contains | ...
 *       needs_review,                    // true if conf < 0.85
 *       review_bucket,                   // true if conf < 0.60 (park as hidden)
 *       raw_path                         // original VEVOR productType for audit
 *     }
 *
 * Confidence thresholds (spec §5.3):
 *   ≥ 0.85  → auto-assign, needs_review=false
 *   0.60–0.84 → auto-assign, needs_review=true, surface in queue
 *   < 0.60  → park in needs-review-bucket, status stays draft
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { extractSignals } from "./signals.mjs"
import {
  stageS1, stageS2, stageS3, stageS4,
  stagePriority, stageS5, stageS6, stageS7, stageS8,
} from "./stages.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RULES_DIR = path.join(__dirname, "rules")

// Thresholds (spec §5.3)
export const CONF_AUTO = 0.85
export const CONF_REVIEW = 0.60

let cachedRules = null

function loadJson(name) {
  const p = path.join(RULES_DIR, name)
  return JSON.parse(fs.readFileSync(p, "utf-8"))
}

/**
 * Load + cache all rule files. Safe to call repeatedly.
 * Callers may pass overrides via loadRules({ force: true }) for tests.
 */
export function loadRules(opts = {}) {
  if (cachedRules && !opts.force) return cachedRules
  cachedRules = {
    skuOverrides: loadJson("sku-overrides.json"),
    pathContains: loadJson("path-contains.json"),
    l1l2l3: loadJson("l1-l2-l3-overrides.json"),
    l1l2: loadJson("l1-l2-overrides.json"),
    l1Defaults: loadJson("l1-defaults.json"),
    l2Keywords: loadJson("l2-keywords.json"),
    priority: loadJson("category-priority.json"),
  }
  return cachedRules
}

/** Reset rule cache (used by admin UI after writing a new rule). */
export function resetRuleCache() { cachedRules = null }

/**
 * Shape a stage hit into the uniform response envelope.
 */
function envelope(hit, rawPath) {
  const conf = typeof hit.confidence === "number" ? hit.confidence : 0
  const auto = conf >= CONF_AUTO
  const review = conf < CONF_REVIEW
  return {
    l1_slug: hit.l1 || null,
    l2_slug: hit.l2 || null,
    l3_slug: hit.l3 || null,
    confidence: Number(conf.toFixed(3)),
    method: hit.method || "unknown",
    needs_review: !auto,
    review_bucket: review || hit.needs_review === true,
    raw_path: rawPath,
  }
}

/**
 * Main resolver. Synchronous unless S6 (Meili NN) is enabled via opts.meiliClient.
 *
 * @param {object} row     — VEVOR row (title, productType, sku, ...)
 * @param {object} opts    — { meiliClient?, rules? }
 * @returns {Promise<object>} — classification envelope (always resolves)
 */
export async function classifyProduct(row, opts = {}) {
  const rules = opts.rules || loadRules()
  const signals = extractSignals(row)

  // Short-circuit stages
  let hit = stageS1(signals, rules)
  if (hit) return envelope(hit, signals.productType)

  hit = stageS2(signals, rules)
  if (hit) return envelope(hit, signals.productType)

  hit = stageS3(signals, rules)
  if (hit) return envelope(hit, signals.productType)

  // S4 locks L1; may still need L2 refinement from S5.
  const s4 = stageS4(signals, rules)

  // S5 edge-case priority (pressure-washer vs generator etc.)
  const priority = stagePriority(signals, rules)
  if (priority) {
    // If S4 locked a *different* L1, only take priority override when
    // we have no L4 override (S4 business rules win).
    if (!s4 || s4.l1 === priority.l1) return envelope(priority, signals.productType)
  }

  const s5 = stageS5(signals, rules)

  // Combine S4 + S5 when both present and on same L1
  let combined = null
  if (s4 && s5 && s4.l1 === s5.l1) {
    combined = {
      l1: s4.l1,
      l2: s4.l2 || s5.l2 || null,
      l3: null,
      confidence: Math.max(s4.confidence, s5.confidence),
      method: s4.l2 ? "S4_l1_l2+S5_keyword" : "S4_l1+S5_keyword",
    }
  } else if (s4) {
    combined = s4
  } else if (s5) {
    combined = s5
  }

  if (combined && combined.confidence >= CONF_REVIEW) {
    return envelope(combined, signals.productType)
  }

  // S6 — optional Meili NN (async). Caller wires this in via opts.meiliClient.
  if (opts.meiliClient) {
    const s6Rules = { ...rules, meiliClient: opts.meiliClient, _s6L1: combined?.l1 }
    const s6 = await stageS6(signals, s6Rules)
    if (s6 && s6.confidence >= CONF_REVIEW) return envelope(s6, signals.productType)
  }

  // S7 deferred — always null
  const s7 = await stageS7(signals, rules)
  if (s7) return envelope(s7, signals.productType)

  // S8 fallback
  const s8 = stageS8()
  return envelope(s8, signals.productType)
}

/**
 * Sync wrapper — use when caller cannot await. Skips S6/S7.
 */
export function classifyProductSync(row, opts = {}) {
  const rules = opts.rules || loadRules()
  const signals = extractSignals(row)

  let hit =
    stageS1(signals, rules) ||
    stageS2(signals, rules) ||
    stageS3(signals, rules)
  if (hit) return envelope(hit, signals.productType)

  const s4 = stageS4(signals, rules)
  const priority = stagePriority(signals, rules)
  if (priority) {
    if (!s4 || s4.l1 === priority.l1) return envelope(priority, signals.productType)
  }
  const s5 = stageS5(signals, rules)

  let combined = null
  if (s4 && s5 && s4.l1 === s5.l1) {
    combined = {
      l1: s4.l1,
      l2: s4.l2 || s5.l2 || null,
      l3: null,
      confidence: Math.max(s4.confidence, s5.confidence),
      method: s4.l2 ? "S4_l1_l2+S5_keyword" : "S4_l1+S5_keyword",
    }
  } else if (s4) {
    combined = s4
  } else if (s5) {
    combined = s5
  }

  if (combined && combined.confidence >= CONF_REVIEW) {
    return envelope(combined, signals.productType)
  }
  return envelope(stageS8(), signals.productType)
}
