/**
 * brand-strip.mjs — SSoT brändi-tuvastus + brändi-prefiksi strip (HARD RULE #5 transform).
 *
 * ÜKS transform, KAKS kutsujat (ei tohi lahkneda):
 *   - BACKFILL   : pipeline-strip-titles.mjs --all   (kogu korpus, ühekordne)
 *   - HOOK [3.5] : pipeline-strip-titles.mjs --skus   (öine delta, ~100 SKU)
 * Sama funktsioon, eri sisend (kogu korpus vs delta-nimekiri).
 *
 * BRÄND-TEADLIK (MITTE VEVOR-hardcode): deriveBrandSlug = SAMA loogika mis
 * backend/scripts/index-meilisearch.mjs (brand_name searchable) + storefront JsonLdProduct.tsx.
 * Prefiks-muster genereeritakse BRAND_NAMES-ist → uus bränd (Powermat/KraftDele/BlackTools)
 * saab strip-võime AUTOMAATSELT, niipea kui feed toob `source`/`supplier_sku`.
 *
 * ROBUSTNE REGEX (mälu-õppetund: `^VEVOR\s+` jättis 63 vahele):
 *   ^( <bränd> (space|NBSP)+ )+   — tõstutundetu, NBSP (U+00A0), KORDUMIS-grupp (topelt-bränd "VEVOR VEVOR").
 *
 * HANDLE EI MUUTU: see transform puudutab AINULT title-stringi; kutsuja kirjutab ainult `title`.
 */

// Brändi-slug → kuvanimi (cms/brands.yaml SSoT). SAMA map mis index-meilisearch.mjs + JsonLdProduct.tsx.
export const BRAND_NAMES = { vevor: "VEVOR", powermat: "Powermat", kraftdele: "KraftDele", blacktools: "BlackTools" }

/**
 * Tuleta brändi-slug tootemetadata'st. PEEGELDAB index-meilisearch.mjs deriveBrandSlug (SSoT).
 * Prioriteet: 1) multi-feed `source`, 2) `supplier_sku` prefiks (VV-/PM-), 3) VEVOR legacy metadata.
 * Tundmatu → null (ei strippi).
 */
export function deriveBrandSlug(meta) {
  const m = meta || {}
  const src = String(m.source || "").trim().toLowerCase()
  if (src) return src
  const ssku = String(m.supplier_sku || "").trim().toUpperCase()
  if (ssku.startsWith("PM-")) return "powermat"
  if (ssku.startsWith("VV-")) return "vevor"
  if (m.vevor_sku || m.vevor_product_type || m.vevor_upc) return "vevor"
  return null
}

// Regex-escape brändi kuvanime (nt punkt/sidekriips brändinimes ei riku mustrit).
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Ehita brändi-prefiksi regex kuvanimest — tõstutundetu, space|NBSP, KORDUMIS-grupp (topelt-bränd).
// Cache per-bränd (ei re-kompileeri iga toote peale).
const _prefixCache = new Map()
function brandPrefixRe(brandSlug) {
  if (_prefixCache.has(brandSlug)) return _prefixCache.get(brandSlug)
  const name = BRAND_NAMES[brandSlug]
  const re = name ? new RegExp("^((?:" + escapeRe(name) + ")[\\s\\u00A0]+)+", "i") : null
  _prefixCache.set(brandSlug, re)
  return re
}

/**
 * Strip brändi-prefiks title'ist. PUHAS FUNKTSIOON (ei puuduta DB-d).
 * @param {string} title      toore title (nt "VEVOR 30L Air Compressor")
 * @param {string} brandSlug  deriveBrandSlug tulem (nt "vevor")
 * @returns {{ newTitle: string, changed: boolean, skip: boolean, reason: string }}
 *   changed=true  → strip tegi muudatuse, newTitle kirjutamiseks
 *   changed=false, skip=false → prefiksit polnud (idempotentne no-op)
 *   changed=false, skip=true  → prefiks OLI, aga strip teeks katkise (E1: tühi/liiga lühike) → JÄTA, logi
 */
export function stripBrandPrefix(title, brandSlug) {
  const orig = String(title == null ? "" : title)
  const re = brandPrefixRe(brandSlug)
  if (!re) return { newTitle: orig, changed: false, skip: false, reason: "no-brand-pattern" }
  if (!re.test(orig)) return { newTitle: orig, changed: false, skip: false, reason: "no-prefix" }
  const stripped = orig.replace(re, "").trim()
  // E1-värav: strip jätaks KATKISE tootenime → EI strippi, liputa käsitsi-parandusse.
  //   - tühi / liiga lühike (<2), VÕI
  //   - TÄHTEDETA jääk (ainult numbrid/kirjavahemärgid, nt "VEVOR 20" → "20") — title juba katki enne stripi
  //     (tootenimi puudu); tähtedeta string EI ole päris tootenimi. \p{L} = mistahes kirja täht.
  if (stripped.length < 2 || !/\p{L}/u.test(stripped)) {
    return { newTitle: orig, changed: false, skip: true, reason: "broken-title-after-strip" }
  }
  return { newTitle: stripped, changed: true, skip: false, reason: "stripped" }
}
