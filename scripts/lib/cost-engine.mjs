/**
 * scripts/lib/cost-engine.mjs — KULU-MOOTOR
 *
 * Arvutab tarnija-hinnast (feedi price) SINU KULU (cost_net) — ühine sisend
 * hinna-mootorile. Dropship ja oma-lao harud jõuavad cost_net-ini eri teed,
 * edasi identne. Vt kinnitatud valem (reports/hinnastamise-laoseisu-arhitektuur.md §0):
 *
 *   MAP  ÷ (1 + source_vat_rate)     → neto ostuhind (KM maha)
 *        × (1 − discount_value)       → cost_net (edasimüüja-allahindlus)
 *        [× fx kui currency != EUR]
 *
 * KONF: config/suppliers.yaml + config/fx.yaml. Globaalseid hinna-konstante EI OLE.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = resolve(__dirname, "../../config");

let _suppliers = null;
let _fx = null;

export function loadSuppliers(path = resolve(CONFIG_DIR, "suppliers.yaml")) {
  if (_suppliers && _suppliers.__path === path) return _suppliers;
  const doc = yaml.load(readFileSync(path, "utf8")) || {};
  const defaults = doc.defaults || {};
  const merged = {};
  for (const [key, s] of Object.entries(doc.suppliers || {})) {
    merged[key] = { ...defaults, ...s, id: key };
  }
  _suppliers = { __path: path, defaults, suppliers: merged };
  return _suppliers;
}

export function getSupplier(id, path) {
  const { suppliers } = loadSuppliers(path);
  const s = suppliers[id];
  if (!s) throw new Error(`Tundmatu tarnija "${id}" — lisa config/suppliers.yaml-i.`);
  return s;
}

export function loadFx(path = resolve(CONFIG_DIR, "fx.yaml")) {
  if (_fx && _fx.__path === path) return _fx;
  const doc = yaml.load(readFileSync(path, "utf8")) || {};
  _fx = { __path: path, ...doc };
  return _fx;
}

/** Parsib feedi toorhinna numbriks: "330.90EUR" → 330.90, "1,299.00" → 1299.00 */
export function parsePrice(priceStr) {
  if (priceStr == null || priceStr === "") return null;
  const match = String(priceStr).match(/([\d.,]+)/);
  if (!match) return null;
  let s = match[1];
  // tuhandeeraldaja vs kümnend: viimane . või , = kümnend
  const lastDot = s.lastIndexOf("."), lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    // ainult koma: kui 2 numbrit järel → kümnend, muidu tuhat
    s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Teisenda valuuta EUR-i. otstarve: "pricing" (kuu keskmine, stabiilne) | "actual" (ostuhetk).
 * EUR → 1.0 (samm vahele).
 */
export function convertToEur(amount, currency, purpose = "pricing", fxPath) {
  if (!currency || currency === "EUR") return amount;
  const fx = loadFx(fxPath);
  const rule = purpose === "actual" ? fx.fixing_rule_actual : fx.fixing_rule_pricing;
  const table = rule === "monthly_average" ? (fx.monthly_average || fx.rates) : (fx.rates || {});
  const rate = table[currency];
  if (!rate) throw new Error(`Puudub ${currency} kurss config/fx.yaml (${rule}). Lisa rates/monthly_average.`);
  return amount / rate; // rate = ühikut valuutas 1 EUR kohta
}

/**
 * Arvuta cost_net tarnija-konfist + feedi hinnast.
 * @returns {{ cost_net, net_purchase, price_map, discount, currency, supplier }}
 *
 * @param {object} p
 * @param {string|number} p.priceRaw  feedi hind (MAP), string või number
 * @param {object}        p.supplier  suppliers.yaml plokk (getSupplier)
 * @param {string}       [p.purpose]  "pricing" (vaikimisi) | "actual"
 * @param {number}       [p.batchShippingPerUnit]  per_batch veokulu ühiku kohta (own, acquisition'i)
 */
export function computeCost({ priceRaw, supplier, purpose = "pricing", batchShippingPerUnit = 0, fxPath } = {}) {
  const s = supplier;
  const priceParsed = typeof priceRaw === "number" ? priceRaw : parsePrice(priceRaw);
  if (priceParsed == null || priceParsed <= 0) return null;

  // 1) KM maha (kui feedi hind on bruto)
  const vatRate = s.price_includes_vat ? (Number(s.source_vat_rate) || 0) : 0;
  const netPurchase = priceParsed / (1 + vatRate);

  // 2) edasimüüja-allahindlus (kulu-vähendus)
  const discount = Number(s.discount_value) || 0;
  let costNet = netPurchase * (1 - discount);

  // 3) valuuta → EUR
  costNet = convertToEur(costNet, s.currency, purpose, fxPath);

  // 4) oma-lao partii-veokulu läheb kulu sisse (dropship: 0)
  if (s.fulfillment_model !== "dropship" && batchShippingPerUnit > 0) {
    costNet += batchShippingPerUnit;
  }

  return {
    price_map: priceParsed,
    net_purchase: round2(convertToEur(netPurchase, s.currency, purpose, fxPath)),
    discount,
    cost_net: round2(costNet),
    currency: "EUR",
    supplier: s.id,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }
