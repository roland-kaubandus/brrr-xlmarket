/**
 * stages.mjs — S1..S8 pipeline stages for resolver v2.
 *
 * Every stage is a pure function:
 *   stage(signals, rules) → ClassificationHit | null
 *
 * Where ClassificationHit = {
 *   l1, l2?, l3?, confidence, method, needs_review?
 * }
 *
 * Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §5.2
 */

import { containsPhrase } from "./signals.mjs"

/**
 * Split an "l1/l2/l3" or "l1/l2" or "l1" target string into components.
 * Silently tolerates stray whitespace.
 */
function splitTarget(target) {
  if (!target) return { l1: null, l2: null, l3: null }
  const parts = String(target).split("/").map(s => s.trim()).filter(Boolean)
  return {
    l1: parts[0] || null,
    l2: parts[1] || null,
    l3: parts[2] || null,
  }
}

// ── S1: Manual SKU override ────────────────────────────────────────
// rules.skuOverrides: { [sku]: "l1" | "l1/l2" | "l1/l2/l3" }
export function stageS1(signals, rules) {
  const sku = signals.sku
  if (!sku) return null
  const target = rules.skuOverrides?.overrides?.[sku]
  if (!target) return null
  const { l1, l2, l3 } = splitTarget(target)
  if (!l1) return null
  return { l1, l2, l3, confidence: 1.00, method: "S1_sku_override" }
}

// ── S2: path_contains substring ────────────────────────────────────
// rules.pathContains.rules: { [needle]: "l1" | "l1/l2" | "l1/l2/l3" }
export function stageS2(signals, rules) {
  const path = signals.productType
  if (!path) return null
  for (const [needle, target] of Object.entries(rules.pathContains?.rules || {})) {
    if (path.includes(needle)) {
      const { l1, l2, l3 } = splitTarget(target)
      if (!l1) continue
      return { l1, l2, l3, confidence: 0.95, method: "S2_path_contains" }
    }
  }
  return null
}

// ── S3: l1_l2_l3_overrides ─────────────────────────────────────────
// Exact "VEVOR_L1|VEVOR_L2|VEVOR_L3" → "l1/l2" or "l1/l2/l3"
export function stageS3(signals, rules) {
  const { l1, l2, l3 } = signals.path
  if (!l1 || !l2 || !l3) return null
  const key = `${l1}|${l2}|${l3}`
  const target = rules.l1l2l3?.overrides?.[key]
  if (!target) return null
  const s = splitTarget(target)
  if (!s.l1) return null
  return { l1: s.l1, l2: s.l2, l3: s.l3, confidence: 0.95, method: "S3_l1_l2_l3" }
}

// ── S4: l1_l2_overrides ────────────────────────────────────────────
// Exact "VEVOR_L1|VEVOR_L2" → "l1" or "l1/l2"
// L1 locks; L3 (and L2 if not in target) continues to S5 for refinement.
export function stageS4(signals, rules) {
  const { l1, l2 } = signals.path
  if (!l1 || !l2) return null
  const key = `${l1}|${l2}`
  const target = rules.l1l2?.overrides?.[key]
  if (!target) return null
  const s = splitTarget(target)
  if (!s.l1) return null
  return { l1: s.l1, l2: s.l2 || null, l3: null, confidence: 0.85, method: "S4_l1_l2" }
}

// ── S5a: category-priority override (edge case disambiguator) ──────
// Applied *before* keyword scoring so that "pressure washer" wins over
// "Appliances" / generic generator when present in title.
export function stagePriority(signals, rules) {
  const hay = signals.haystack
  if (!hay) return null
  for (const [phrase, target] of Object.entries(rules.priority?.rules || {})) {
    if (containsPhrase(hay, phrase)) {
      const s = splitTarget(target)
      if (!s.l1) continue
      return { l1: s.l1, l2: s.l2, l3: s.l3, confidence: 0.90, method: "S5_priority" }
    }
  }
  return null
}

// ── S5: l1_defaults + L2 keyword scoring ───────────────────────────
// 1. Look up VEVOR L1 in l1_defaults → resolved L1.
// 2. Score every L2 candidate under that L1 from l2-keywords.json.
// 3. Winner + conf = score / (score + runner_up + 1).
export function stageS5(signals, rules) {
  const vevorL1 = signals.path.l1
  if (!vevorL1) return null
  const defaults = rules.l1Defaults?.defaults || {}
  const skip = rules.l1Defaults?.skip || []
  if (skip.includes(vevorL1)) return null
  const resolvedL1 = defaults[vevorL1]
  if (!resolvedL1) return null

  const hay = signals.haystack
  const l2Rules = rules.l2Keywords?.l1?.[resolvedL1] || {}
  if (Object.keys(l2Rules).length === 0 || !hay) {
    return { l1: resolvedL1, l2: null, l3: null, confidence: 0.70, method: "S5_l1_default_only" }
  }

  const scored = []
  for (const [l2Slug, rule] of Object.entries(l2Rules)) {
    const reqAny = rule.required_any || []
    const reqNone = rule.required_none || []
    const boosts = rule.boost || []
    const weight = typeof rule.weight === "number" ? rule.weight : 1.0

    // required_none: any match disqualifies candidate
    let blocked = false
    for (const kill of reqNone) {
      if (containsPhrase(hay, kill)) { blocked = true; break }
    }
    if (blocked) continue

    // required_any: at least one must match to be a candidate
    let matched = 0
    for (const needle of reqAny) {
      if (containsPhrase(hay, needle)) matched++
    }
    if (reqAny.length > 0 && matched === 0) continue

    // base score = weight * matched
    let score = weight * (matched || (reqAny.length === 0 ? 1 : 0))
    for (const b of boosts) {
      if (containsPhrase(hay, b)) score += 0.3
    }
    scored.push({ l2: l2Slug, score })
  }

  if (scored.length === 0) {
    return { l1: resolvedL1, l2: null, l3: null, confidence: 0.65, method: "S5_l1_default_only" }
  }

  scored.sort((a, b) => b.score - a.score)
  const winner = scored[0]
  const runnerUp = scored[1]?.score || 0
  // Separation-based confidence: margin over runner-up + floor for solid solo hits.
  // 0 runner-up and winner>=1.0 → 0.82 (firm single-winner)
  // margin=winner-runner → 0.65 + 0.20*margin/winner, clamped
  let conf
  if (runnerUp === 0) {
    conf = winner.score >= 1.0 ? 0.82 : 0.70
  } else {
    const margin = (winner.score - runnerUp) / winner.score
    conf = 0.65 + 0.20 * margin
  }
  conf = Math.max(0.60, Math.min(0.90, conf))
  return { l1: resolvedL1, l2: winner.l2, l3: null, confidence: conf, method: "S5_l1_default+keyword" }
}

// ── S6: Meili nearest-neighbour (within resolved L1) ───────────────
// Optional stage. Spec caps conf at 0.75. Skipped unless the caller passes
// a meiliClient into rules. Returns majority L2 among top-k NN products in
// the same L1.
export async function stageS6(signals, rules) {
  const client = rules.meiliClient
  const resolvedL1 = rules._s6L1 // set by resolver when S4/S5 produced an L1
  if (!client || !resolvedL1 || !signals.title) return null
  try {
    const result = await client.searchNeighbours({
      query: signals.titleRaw || signals.title,
      filter: [`taxonomy.l1_slug = "${resolvedL1}"`],
      limit: 10,
    })
    const hits = Array.isArray(result?.hits) ? result.hits : []
    if (hits.length < 3) return null
    const tally = {}
    for (const h of hits) {
      const l2 = h?.taxonomy?.l2_slug
      if (!l2) continue
      tally[l2] = (tally[l2] || 0) + 1
    }
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return null
    const [winner, votes] = sorted[0]
    if (votes < 3) return null
    return { l1: resolvedL1, l2: winner, l3: null, confidence: 0.75, method: "S6_meili_nn" }
  } catch {
    return null
  }
}

// ── S7: LLM classifier — DEFERRED per spec §10 Faas 3.8 ────────────
// Implemented as a stub that always returns null. Activate when review
// queue stabilises >500 (spec §F3.8).
export async function stageS7(/* signals, rules */) {
  return null
}

// ── S8: Fallback review bucket ─────────────────────────────────────
// Always matches. Never reaches a public page.
export function stageS8() {
  return {
    l1: "needs-review-bucket",
    l2: null,
    l3: null,
    confidence: 0.0,
    method: "S8_review_bucket",
    needs_review: true,
  }
}
