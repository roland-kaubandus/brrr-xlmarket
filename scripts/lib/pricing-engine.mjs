/**
 * scripts/lib/pricing-engine.mjs — HINNASTAMISE MOOTOR
 *
 * ASENDAB vana `PRICE_MARKUP = 1.15` konstandi (import-vevor-feed.mjs).
 * Markup rakendub KULULE (cost_net), MITTE MAP-ile. Valem (§0):
 *
 *   retail_net   = cost_net × markup
 *   retail_gross = retail_net × (1 + sell_vat_rate)   ← kliendi hind (tax-inclusive)
 *
 * KONF: config/pricing-rules.yaml. Astmed/kaal/kategooria/tarnija tingimused
 * on VALMIS, aga enabled:false → praegu 1 reegel (default_markup 1.15) = TÄNANE.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import yaml from "js-yaml";
import { computeCost, getSupplier } from "./cost-engine.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = resolve(__dirname, "../../config");

let _rules = null;

export function loadPricingRules(path = resolve(CONFIG_DIR, "pricing-rules.yaml")) {
  if (_rules && _rules.__path === path) return _rules;
  const doc = yaml.load(readFileSync(path, "utf8")) || {};
  _rules = {
    __path: path,
    sell_vat_rate: Number(doc.sell_vat_rate) || 0,
    default_markup: Number(doc.default_markup) || 1,
    band_variable: doc.band_variable || "cost_net",
    rounding: doc.rounding || { mode: "none" },
    rules: (doc.rules || []).filter((r) => r.enabled),
    shipping_cost_mode: doc.shipping_cost_mode || "absorbed",
  };
  return _rules;
}

/** Kas reegel sobib kontekstiga? */
function ruleMatches(rule, ctx) {
  const w = rule.when || {};
  const band = ctx.band; // band_variable väärtus (cost_net/map/weight)
  if (w.cost_min != null && !(band >= w.cost_min)) return false;
  if (w.cost_max != null && !(band < w.cost_max)) return false;
  if (w.weight_min != null && !((ctx.weight || 0) >= w.weight_min)) return false;
  if (w.weight_max != null && !((ctx.weight || 0) < w.weight_max)) return false;
  if (w.supplier != null && w.supplier !== ctx.supplier) return false;
  if (w.stock_source != null && w.stock_source !== ctx.stock_source) return false;
  if (w.category != null && !(ctx.categories || []).includes(w.category)) return false;
  return true;
}

/**
 * Vali markup + surcharge reeglitest. Kõrgeim priority sobiv markup-reegel võidab;
 * surcharge-reeglid (surcharge_pct) stäkivad. Ükski markup-reegel ei sobi → default_markup.
 */
export function selectMarkup(ctx, cfg) {
  const bandVar = cfg.band_variable;
  const band = bandVar === "map" ? ctx.map : bandVar === "weight" ? ctx.weight : ctx.cost_net;
  const c = { ...ctx, band };

  let markup = cfg.default_markup;
  let ruleId = "default";
  let bestPriority = -Infinity;
  let surcharge = 0;

  for (const r of cfg.rules) {
    if (!ruleMatches(r, c)) continue;
    if (r.surcharge_pct != null) { surcharge += Number(r.surcharge_pct) || 0; continue; }
    if (r.markup != null) {
      const pr = Number(r.priority) || 0;
      const narrower = pr === bestPriority && r.when && r.when.cost_min != null;
      if (pr > bestPriority || narrower) { markup = Number(r.markup); ruleId = r.id; bestPriority = pr; }
    }
  }
  return { markup: markup + surcharge, rule_id: ruleId, base_markup: markup, surcharge };
}

function applyRounding(cents, rounding) {
  if (!rounding || rounding.mode === "none") return cents;
  const eur = cents / 100;
  if (rounding.mode === "psychological") return Math.floor(eur) * 100 + 99;
  if (rounding.mode === "up_to_x9") return Math.ceil(eur / 10) * 10 * 100 - 100 + 99;
  return cents;
}

/**
 * Arvuta jaehind cost_net-ist + kontekstist.
 * @returns {{ retail_net, retail_gross, amount_cents, markup, rule_id, sell_vat_rate }}
 */
export function computePrice({ cost_net, map, weight = 0, supplier, stock_source = "dropship", categories = [] }, rulesPath) {
  const cfg = loadPricingRules(rulesPath);
  const ctx = { cost_net, map, weight, supplier, stock_source, categories };
  const sel = selectMarkup(ctx, cfg);

  const retailNet = cost_net * sel.markup;
  const retailGross = retailNet * (1 + cfg.sell_vat_rate);
  let cents = Math.round(retailGross * 100);
  cents = applyRounding(cents, cfg.rounding);

  return {
    retail_net: round2(retailNet),
    retail_gross: round2(cents / 100),
    amount_cents: cents,
    markup: sel.markup,
    rule_id: sel.rule_id,
    sell_vat_rate: cfg.sell_vat_rate,
  };
}

/**
 * MUGAVUS: feedi toorhind → kliendi hind sentides (KOGU ahel).
 * See on ainus, mida import-vevor-feed.mjs vajab PRICE_MARKUP asemel.
 *
 * @param {object} p
 * @param {string|number} p.priceRaw    feedi MAP (string "330.90EUR" või number)
 * @param {string}        p.supplierId  suppliers.yaml võti (nt "vevor")
 * @param {number}       [p.weight]     kaal kg (kaalu-reeglid)
 * @param {string}       [p.stockSource]
 * @param {string[]}     [p.categories]
 * @returns {{ amount_cents, retail_gross, cost_net, markup, rule_id } | null}
 */
export function computeRetail({ priceRaw, supplierId, weight = 0, stockSource = "dropship", categories = [], batchShippingPerUnit = 0 } = {}) {
  const supplier = getSupplier(supplierId);
  const cost = computeCost({ priceRaw, supplier, batchShippingPerUnit });
  if (!cost) return null;
  const price = computePrice({
    cost_net: cost.cost_net,
    map: cost.price_map,
    weight,
    supplier: supplierId,
    stock_source: stockSource,
    categories,
  });
  return {
    amount_cents: price.amount_cents,
    retail_gross: price.retail_gross,
    retail_net: price.retail_net,
    cost_net: cost.cost_net,
    net_purchase: cost.net_purchase,
    map: cost.price_map,
    markup: price.markup,
    rule_id: price.rule_id,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }
