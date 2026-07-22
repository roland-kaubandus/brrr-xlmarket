/**
 * scripts/adapters/index.mjs — FEED-ADAPTER REGISTER
 *
 * Migratsiooni-tõestus (reports/hinnastamise-laoseisu-arhitektuur.md §I):
 * uus tarnija TUNTUD formaadis (xlsx/csv/xml) = KONF (suppliers.yaml field_map),
 * MITTE koodimuudatus. Eksootiline transport (JSON-API vms) = isoleeritud ~1-faili
 * adapter siia, mis EI puuduta hinna-/kulu-/saadavus-loogikat.
 *
 * Iga adapter: parse(filePath, fieldMap) → [ normalized row ]
 * Normaliseeritud rida: { sku, price, priceRaw, title, description, weight,
 *                         brand, productType, availability, _raw }
 * väljad tulevad fieldMap-ist (suppliers.yaml), väärtus _raw-ist toorreast.
 */
import { parse as parseXlsx } from "./xlsx.mjs";
import { parse as parseCsv } from "./csv.mjs";
import { parse as parseXml } from "./xml.mjs";

const ADAPTERS = {
  xlsx: parseXlsx,
  csv: parseCsv,
  xml: parseXml,
};

/** Tagasta adapter formaadi järgi; tundmatu → selge viga (mitte vaikne fallback). */
export function getAdapter(format) {
  const fn = ADAPTERS[format];
  if (!fn) {
    throw new Error(
      `Tundmatu feed_format: "${format}". Toetatud: ${Object.keys(ADAPTERS).join(", ")}. ` +
      `Eksootiline transport → lisa isoleeritud adapter scripts/adapters/<format>.mjs + registreeri siin.`
    );
  }
  return fn;
}

/** Normaliseeri üks toorrida canonical-kujule fieldMap abil. */
export function normalizeRow(raw, fieldMap) {
  const get = (key) => (key && raw[key] != null ? raw[key] : undefined);
  const priceRaw = get(fieldMap.price) ?? get(fieldMap.price_fallback);
  return {
    sku: String(get(fieldMap.sku) ?? "").trim(),
    priceRaw,                                   // toorstring (nt "330.90EUR") — cost-engine parsib
    title: String(get(fieldMap.title) ?? "").trim(),
    description: String(get(fieldMap.description) ?? "").trim(),
    weight: parseFloat(get(fieldMap.weight)) || 0,
    brand: String(get(fieldMap.brand) ?? "").trim(),
    productType: String(get(fieldMap.product_type) ?? "").trim(),
    availability: String(get(fieldMap.availability) ?? "").trim().toLowerCase(),
    _raw: raw,                                  // täisrida (import-vevor-feed vajab lisavälju)
  };
}

/**
 * Peamine sissepääs: loe feed tarnija-konfi järgi → normaliseeritud read.
 * @param {string} filePath
 * @param {object} supplier  suppliers.yaml plokk (feed_format + field_map)
 */
export function readFeed(filePath, supplier) {
  const adapter = getAdapter(supplier.feed_format);
  const rawRows = adapter(filePath, supplier.field_map || {});
  return rawRows.map((r) => normalizeRow(r, supplier.field_map || {}));
}
