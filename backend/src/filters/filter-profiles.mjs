/**
 * filter-profiles.mjs — loads filter-profiles.yaml and resolves the
 * filter set for a product's category.
 *
 * Usage (indexer side):
 *   import { generateFilterTokens } from "./filter-profiles.mjs"
 *   const tokens = generateFilterTokens(specs, categoryHandles, taxonomyTree)
 *
 * Usage (storefront side):
 *   import { getFilterProfile, getAllProfiles } from "./filter-profiles.mjs"
 *   const profile = getFilterProfile("welders")
 */

import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import yaml from "js-yaml"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const YAML_PATH = path.join(__dirname, "..", "data", "filter-profiles.yaml")

let cachedProfiles = null

export function loadProfiles() {
  if (cachedProfiles) return cachedProfiles
  const raw = yaml.load(readFileSync(YAML_PATH, "utf8"))
  const resolved = {}
  // Resolve `extends` — merge filters from parent
  for (const [key, profile] of Object.entries(raw)) {
    if (!profile) continue
    let filters = [...(profile.filters || [])]
    if (profile.extends) {
      const parent = raw[profile.extends]
      if (parent?.filters) {
        // Parent defaults come first; child filters can override by key
        const childKeys = new Set(filters.map(f => f.key))
        const parentOnly = parent.filters.filter(f => !childKeys.has(f.key))
        filters = [...parentOnly, ...filters]
      }
    }
    resolved[key] = { ...profile, filters }
  }
  cachedProfiles = resolved
  return resolved
}

/**
 * Return the filter profile that best matches a product's category
 * handles. Walks the category list in order (most specific first) and
 * falls back to `_fallback` if nothing matches.
 */
export function getFilterProfile(categoryHandles) {
  const profiles = loadProfiles()
  const handles = Array.isArray(categoryHandles) ? categoryHandles : [categoryHandles].filter(Boolean)
  for (const h of handles) {
    if (profiles[h]) return profiles[h]
  }
  return profiles._fallback || profiles._defaults || { filters: [] }
}

export function getAllProfiles() {
  return loadProfiles()
}

/**
 * Convert a numeric value into a bucket token for `range` or `discrete`
 * filter types. Returns null when the value can't be placed.
 */
function bucketValue(value, filter) {
  if (value == null || !Number.isFinite(value)) return null
  const { type, buckets, unit } = filter

  if (type === "discrete") {
    // Find closest discrete value (within ±10% tolerance)
    let best = null
    let bestDist = Infinity
    for (const target of buckets) {
      const dist = Math.abs(value - target)
      if (dist < bestDist && dist / target < 0.1) {
        bestDist = dist
        best = target
      }
    }
    return best != null ? `${best}${unit || ""}` : null
  }

  if (type === "range") {
    for (const [min, max] of buckets) {
      if (max == null) {
        if (value >= min) return `${min}${unit || ""}+`
      } else if (value >= min && value < max) {
        return `${min}-${max}${unit || ""}`
      }
    }
    return null
  }

  return null
}

/**
 * Given a spec object (from spec-extractor.mjs) and a list of category
 * handles, return the filter_tokens list for MeiliSearch.
 *
 * Token format: "<group>:<value>"
 *   e.g. "voltage:220V", "power:1000-1500W", "brand:VEVOR", "fuel:diesel"
 */
export function generateFilterTokens(specs, categoryHandles) {
  const profile = getFilterProfile(categoryHandles)
  const tokens = new Set()

  for (const filter of profile.filters || []) {
    const { key, type } = filter
    const value = specs[key]

    if (value == null) continue

    if (type === "keyword") {
      // brand, fuel, material — verbatim string value
      tokens.add(`${key}:${String(value).toLowerCase()}`)
      continue
    }

    if (type === "discrete" || type === "range") {
      const token = bucketValue(value, filter)
      if (token) tokens.add(`${key}:${token}`)
      continue
    }

    // `price` and `boolean` are handled by the frontend directly, not tokens
  }

  return [...tokens]
}
