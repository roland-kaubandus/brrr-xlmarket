/**
 * Shared resolver: VEVOR productType → taxonomy-v3 L1 slug.
 *
 * Single source of truth used by both:
 *   - scripts/import-vevor-feed.mjs (4-hour sync)
 *   - scripts/migrate-categories-to-v3.mjs (one-shot / recovery)
 *
 * Resolution order (first hit wins):
 *   1. path_contains — full path substring match (narrowest business rules)
 *   2. l1_l2_overrides — exact "L1|L2" match
 *   3. l1_defaults — exact L1 match
 *   4. null — unresolved (caller handles fallback/logging)
 *
 * Paths in the `skip` list are explicitly ignored (return null).
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MAP_PATH = path.join(__dirname, "vevor-to-v3.json")

let cached = null

export function loadV3Map() {
  if (!cached) cached = JSON.parse(fs.readFileSync(MAP_PATH, "utf-8"))
  return cached
}

export function resolveV3Slug(productType, mp = loadV3Map()) {
  if (!productType) return null
  const parts = productType.split(">").map(s => s.trim())
  const l1 = parts[0] || ""
  const l2 = parts[1] || ""

  if (mp.skip?.includes(l1)) return null

  for (const [needle, slug] of Object.entries(mp.path_contains || {})) {
    if (productType.includes(needle)) return slug
  }
  if (l2 && mp.l1_l2_overrides?.[`${l1}|${l2}`]) {
    return mp.l1_l2_overrides[`${l1}|${l2}`]
  }
  return mp.l1_defaults?.[l1] || null
}
