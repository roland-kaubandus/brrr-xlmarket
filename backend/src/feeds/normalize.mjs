/**
 * normalize.mjs — jagatud helperid feed-adapteritele.
 * NormalizedRow skeem: vt backend/src/feeds/README.md
 */

/**
 * Handle tarnija-prefiksiga SKU + pealkirja põhjal (kollisioonivaba mitme feedi vahel).
 * makeHandle("VV", "12345", "VEVOR Sander") → "vevor-sander-vv-12345"
 */
export function makeHandle(supplierSku, title) {
  const cleanSku = String(supplierSku || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
  const base = String(title || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 70)
  return (base + "-" + cleanSku).replace(/-{2,}/g, "-")
}

/** "VV" + "12345" → "VV-12345" (supplier_sku). */
export function namespaceSku(prefix, rawSku) {
  return `${prefix}-${String(rawSku).trim()}`
}

export function parsePrice(v) {
  if (v == null) return null
  const n = parseFloat(String(v).replace(/[^0-9.,]/g, "").replace(",", "."))
  return Number.isFinite(n) && n > 0 ? n : null
}
