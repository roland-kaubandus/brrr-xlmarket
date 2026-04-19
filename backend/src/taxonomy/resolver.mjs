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
import { stageS15PathToLeaf } from "./stages/s15-path-to-leaf.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RULES_DIR = path.join(__dirname, "rules")
// Taxonomy tree snapshot lives in the storefront so FE + resolver agree on shape.
const TREE_PATH = path.join(
  __dirname, "..", "..", "..", "storefront", "lib", "category-tree.generated.json"
)
const PATH_TO_LEAF_PATH = path.join(RULES_DIR, "vevor-path-to-leaf.json")

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
export function resetRuleCache() {
  cachedRules = null
  cachedPathToLeaf = null
  cachedTree = null
}

// ── S1.5 path → leaf context (singleton) ────────────────────────────
let cachedPathToLeaf = null  // { [vevorPath]: leaf_slug }
let cachedTree = null        // { nodes: { [handle]: { parent_handle, level, ... } } }
let cachedValidSlugs = null  // Set<string>

/**
 * Load + cache the VEVOR-path → leaf-slug hardcoded mapping (2692 entries).
 * Safe to call repeatedly.
 */
export function loadPathToLeafMapping(opts = {}) {
  if (cachedPathToLeaf && !opts.force) return cachedPathToLeaf
  const raw = JSON.parse(fs.readFileSync(PATH_TO_LEAF_PATH, "utf-8"))
  cachedPathToLeaf = raw.mappings || {}
  return cachedPathToLeaf
}

/**
 * Load + cache the taxonomy tree snapshot (used to resolve ancestors of a
 * leaf slug). Returns the full snapshot; use `getValidSlugs()` for membership.
 */
export function loadTaxonomyTree(opts = {}) {
  if (cachedTree && !opts.force) return cachedTree
  cachedTree = JSON.parse(fs.readFileSync(TREE_PATH, "utf-8"))
  cachedValidSlugs = new Set(Object.keys(cachedTree.nodes || {}))
  return cachedTree
}

function getValidSlugs() {
  if (!cachedValidSlugs) loadTaxonomyTree()
  return cachedValidSlugs
}

/**
 * Walk up from a leaf slug and fill { l1, l2, l3 } using the tree snapshot.
 * Envelope keeps the legacy 3-level shape — deeper leaves (L4..L7) are kept
 * in `target_slug` / `leaf_slug`. We always try to keep the most specific
 * ancestor at L3 so category pages still surface the product at the
 * deepest L1/L2/L3 rung.
 */
function ancestorsFromLeaf(leafSlug, tree) {
  const nodes = tree && tree.nodes
  if (!nodes || !nodes[leafSlug]) return { l1: null, l2: null, l3: null }

  const chain = []
  let cur = nodes[leafSlug]
  let guard = 0
  while (cur && guard++ < 20) {
    chain.push(cur)
    if (!cur.parent_handle) break
    cur = nodes[cur.parent_handle]
  }
  // chain[0] = leaf, chain[last] = L1
  const byLevel = new Map()
  for (const n of chain) byLevel.set(n.level, n.handle)

  return {
    l1: byLevel.get(1) || null,
    l2: byLevel.get(2) || null,
    // For deep leaves we prefer a real L3 ancestor; if there isn't one
    // (leaf sits at L2), fall back to the leaf itself so category pages
    // still resolve.
    l3: byLevel.get(3) || (chain[0] && chain[0].level >= 3 ? chain[0].handle : null),
  }
}

/**
 * Build the S1.5 context in one place. Loaders are singletons.
 */
function getS15Context() {
  return {
    mapping: loadPathToLeafMapping(),
    validSlugs: getValidSlugs(),
  }
}

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
    // S1.5 fills this with the deepest leaf (L4..L7); older stages leave it null.
    target_slug: hit.target_slug || hit.l3 || hit.l2 || hit.l1 || null,
    confidence: Number(conf.toFixed(3)),
    method: hit.method || "unknown",
    needs_review: !auto,
    review_bucket: review || hit.needs_review === true,
    raw_path: rawPath,
  }
}

/**
 * Turn a raw S1.5 stage hit into the shape envelope() expects (l1/l2/l3
 * ancestors derived from the tree + target_slug kept for deep leaves).
 * Returns null if the mapping target cannot be resolved to a tree node.
 */
function materializeS15Hit(stageHit) {
  if (!stageHit) return null
  const tree = loadTaxonomyTree()
  const { l1, l2, l3 } = ancestorsFromLeaf(stageHit.target_slug, tree)
  if (!l1) {
    // S1.5's own guard already logs; belt + braces here.
    return null
  }
  return {
    method: stageHit.method,
    confidence: stageHit.confidence,
    l1, l2, l3,
    target_slug: stageHit.target_slug,
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

  // S1.5 — hardcoded VEVOR-path → leaf mapping (exact match, conf 1.00).
  // Runs before S2/S3 because a direct leaf target is always more precise
  // than substring / L1-L3 heuristics.
  const s15Raw = stageS15PathToLeaf(signals.productType, getS15Context())
  const s15 = materializeS15Hit(s15Raw)
  if (s15) return envelope(s15, signals.productType)

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

  // S1 (SKU override) runs first.
  let hit = stageS1(signals, rules)
  if (hit) return envelope(hit, signals.productType)

  // S1.5 — hardcoded VEVOR-path → leaf mapping.
  const s15 = materializeS15Hit(
    stageS15PathToLeaf(signals.productType, getS15Context())
  )
  if (s15) return envelope(s15, signals.productType)

  hit = stageS2(signals, rules) || stageS3(signals, rules)
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
