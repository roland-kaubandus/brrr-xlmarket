/**
 * signals.mjs — Signal extractors for taxonomy resolver v2.
 *
 * Every stage in stages.mjs consumes a `signals` object built from a VEVOR
 * row. Centralising extraction makes stages pure and testable.
 *
 * Input shape (VEVOR row as seen by scripts/import-vevor-feed.mjs):
 *   {
 *     sku, title, description, productType, sellingPoints[], brand, spu, ...
 *   }
 */

/**
 * Normalise a free-text blob to lowercase + single-spaced, for substring
 * matching. Never throws.
 */
export function normalizeText(s) {
  if (!s) return ""
  return String(s).toLowerCase().replace(/\s+/g, " ").trim()
}

/**
 * Split a VEVOR productType path ("Tools > Welding & Soldering > MIG") into
 * `{ l1, l2, l3, raw }` trimmed parts. Returns "" for missing levels.
 */
export function parseVevorPath(productType) {
  const raw = productType || ""
  const parts = raw.split(">").map(s => s.trim())
  return {
    raw,
    l1: parts[0] || "",
    l2: parts[1] || "",
    l3: parts[2] || "",
  }
}

/**
 * Build the haystack text that keyword stages score against.
 * Includes title + description + selling points + VEVOR path (low weight).
 */
export function buildHaystack(row) {
  const parts = []
  if (row.title) parts.push(String(row.title))
  if (row.description) parts.push(String(row.description))
  if (Array.isArray(row.sellingPoints)) parts.push(row.sellingPoints.join(" "))
  if (row.productType) parts.push(String(row.productType))
  if (row.brand) parts.push(String(row.brand))
  return normalizeText(parts.join(" "))
}

/**
 * Case-insensitive whole-token-preferred substring match.
 * Falls back to naive includes() if the needle contains non-word characters
 * (so multi-word phrases like "heat press" still match).
 */
export function containsPhrase(haystack, needle) {
  if (!haystack || !needle) return false
  const n = normalizeText(needle)
  if (!n) return false
  if (/[^a-z0-9]/i.test(n)) return haystack.includes(n)
  const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
  return re.test(haystack)
}

/**
 * Extract every signal a stage might need. Cheap; stages read from this.
 */
export function extractSignals(row) {
  const path = parseVevorPath(row.productType)
  const haystack = buildHaystack(row)
  return {
    sku: row.sku ? String(row.sku).trim() : "",
    spu: row.spu ? String(row.spu).trim() : "",
    title: normalizeText(row.title),
    titleRaw: row.title || "",
    description: normalizeText(row.description),
    sellingPoints: (row.sellingPoints || []).map(normalizeText),
    path,
    haystack,
    productType: row.productType || "",
  }
}
