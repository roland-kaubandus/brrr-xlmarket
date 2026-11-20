/**
 * brand-derive.mjs — brändi-tuletus tootemetadata'st. ÜKS MEHHANISM (HARD RULE #5).
 *
 * MIKS: peale VEVOR-title-stripi (2026-08-24) ei sisalda title enam brändi. Bränd tuleb
 *   AINULT metadata'st. KRIITILINE: tundmatu metadata → NULL/"" — MITTE vaikimisi "VEVOR".
 *   Muidu tulevased muu-tarnija tooted (BlackTools/GEKO/Powermat) märgitaks filter_tokens'is,
 *   searchableAttributes brand_name'is JA Google structured-data's valesti VEVORiks.
 *
 * SSoT: see moodul on backend-indekseerija (index-meilisearch.mjs) ainus brändi-allikas →
 *   kirjutab Meili doc-i `brand` (slug) + `brand_name` (kuvanimi). Storefront JsonLdProduct
 *   tarbib indekseerija `brand_name`'i otse; lokaalne TS-peegeldus (deriveBrandName) on ainult
 *   Meili-maas fallback ja peegeldab seda loogikat 1:1 (TS/mjs + eraldi-app piir ei luba importi).
 */

// Brändi-slug → kuvanimi. cms/brands.yaml SSoT-nimed.
export const BRAND_NAMES = { vevor: "VEVOR", powermat: "Powermat", kraftdele: "KraftDele", blacktools: "BlackTools" };

/**
 * deriveBrandSlug — brändi-slug (filter/URL) metadata'st. BRÄND-AGNOSTILINE: tundmatu → null.
 * Prioriteet: source → supplier_sku prefiks (PM-/VV-) → vevor_* markerid → null.
 */
export function deriveBrandSlug(meta) {
  const m = meta || {};
  const src = String(m.source || "").trim().toLowerCase();
  if (src) return src;
  const ssku = String(m.supplier_sku || "").trim().toUpperCase();
  if (ssku.startsWith("PM-")) return "powermat";
  if (ssku.startsWith("VV-")) return "vevor";
  if (m.vevor_sku || m.vevor_product_type || m.vevor_upc) return "vevor";
  return null;
}

/**
 * deriveBrandName — brändi kuvanimi (JSON-LD/PDP/search). TUNDMATU → "" (MITTE "VEVOR").
 * Tundmatu slug (pole BRAND_NAMES'is) → slug ise (nt uus tarnija enne kaardile lisamist).
 */
export function deriveBrandName(meta) {
  const slug = deriveBrandSlug(meta);
  if (!slug) return "";
  return BRAND_NAMES[slug] || slug;
}
