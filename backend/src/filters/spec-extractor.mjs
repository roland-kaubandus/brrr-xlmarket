/**
 * spec-extractor.mjs — parse structured specs from VEVOR feed text.
 *
 * Reads: VEVOR feed entry (title, descriptionText, sellingPoints) and
 * optionally Medusa meta dimensions/weight.
 *
 * Returns: flat object with normalized spec values in SI units.
 *   { voltage_v: 230, amperage_a: 200, pressure_bar: 9,
 *     power_w: 1500, capacity_l: 15, weight_kg: 23.2,
 *     flow_lmin: 35, rpm: 1780, btu: 10000, duty_cycle_pct: 60,
 *     frequency_hz: 50, brand: "VEVOR",
 *     material: "stainless-steel", fuel: "electric" }
 *
 * Returns `null` for any field not detected.
 */

const PATTERNS = {
  voltage_v: /\b(\d{2,3})\s?V\b(?!\s?\/)/gi,
  amperage_a: /\b(\d{2,4})\s?A(?:mps?|mperes?)?\b(?![a-z/])/gi,
  pressure_bar: /\b(\d{1,4}(?:\.\d+)?)\s?bar\b/gi,
  pressure_psi: /\b(\d{2,5}(?:\.\d+)?)\s?psi\b/gi,
  power_kw: /\b(\d{1,3}(?:\.\d+)?)\s?kW\b/gi,
  power_w: /\b(\d{2,5})\s?W\b(?![a-z/])/gi,
  power_hp: /\b(\d{1,3}(?:\.\d+)?)\s?HP\b/gi,
  capacity_l: /\b(\d{1,4}(?:\.\d+)?)\s?L\b(?![a-z/])/gi,
  capacity_ml: /\b(\d{2,4})\s?mL\b/gi,
  capacity_gal: /\b(\d{1,3}(?:\.\d+)?)\s?gal(?:lons?)?\b/gi,
  flow_lmin: /\b(\d{1,4}(?:\.\d+)?)\s?L\/min\b/gi,
  flow_gpm: /\b(\d{1,3}(?:\.\d+)?)\s?GPM\b/gi,
  rpm: /\b(\d{2,6})\s?RPM\b/gi,
  btu: /\b(\d{1,3}(?:,\d{3})?|\d{3,6})\s?BTU\b/gi,
  duty_cycle_pct: /\b(\d{1,3})\s?%\s?(?:duty|@)/gi,
  frequency_hz: /\b(\d{2,3})\s?Hz\b/gi,
}

// Fuel / power source keywords
const FUEL_KEYWORDS = [
  ["gasoline", "gasoline|gas-powered|petrol|unleaded"],
  ["diesel", "diesel"],
  ["propane", "propane|lpg"],
  ["electric", "electric-powered|corded"],
  ["battery", "cordless|battery-powered|rechargeable battery|li-ion|lithium-ion"],
  ["natural-gas", "natural gas|\\bng\\b"],
  ["solar", "solar-powered|photovoltaic"],
  ["manual", "manual|hand-powered|hand-operated"],
]

// Material keywords — focus on common industrial materials
const MATERIAL_KEYWORDS = [
  ["stainless-steel", "stainless steel|304 steel|201 steel|316 steel|SUS304|18/8"],
  ["carbon-steel", "carbon steel|mild steel"],
  ["cast-iron", "cast iron"],
  ["aluminum", "aluminum|aluminium"],
  ["brass", "brass"],
  ["copper", "copper"],
  ["plastic", "abs plastic|pp plastic|pvc"],
  ["wood", "oak|pine|bamboo|solid wood"],
  ["glass", "tempered glass|borosilicate"],
  ["rubber", "natural rubber|nbr|epdm"],
  ["ceramic", "ceramic|porcelain"],
]

function firstMatch(text, pattern) {
  pattern.lastIndex = 0
  const m = pattern.exec(text)
  if (!m) return null
  const raw = m[1].replace(/,/g, "")
  const num = Number.parseFloat(raw)
  return Number.isFinite(num) ? num : null
}

function detectKeyword(text, table) {
  const lower = text.toLowerCase()
  for (const [value, keywords] of table) {
    if (new RegExp(`\\b(${keywords})\\b`, "i").test(lower)) return value
  }
  return null
}

export function extractSpecs(feedEntry, meta) {
  const text = [
    feedEntry?.title || "",
    feedEntry?.descriptionText || "",
    (feedEntry?.sellingPoints || []).join(" "),
    meta?.goods_description_ad || "",
  ].join(" ")

  const specs = {}

  for (const [key, pattern] of Object.entries(PATTERNS)) {
    const value = firstMatch(text, pattern)
    if (value !== null) specs[key] = value
  }

  // Unit normalization — prefer SI where one or the other hit
  if (specs.power_kw != null && specs.power_w == null) {
    specs.power_w = specs.power_kw * 1000
  }
  if (specs.power_hp != null && specs.power_w == null) {
    specs.power_w = specs.power_hp * 746
  }
  if (specs.pressure_psi != null && specs.pressure_bar == null) {
    specs.pressure_bar = Math.round((specs.pressure_psi / 14.5038) * 10) / 10
  }
  if (specs.capacity_gal != null && specs.capacity_l == null) {
    specs.capacity_l = Math.round(specs.capacity_gal * 3.7854 * 10) / 10
  }
  if (specs.capacity_ml != null && specs.capacity_l == null) {
    specs.capacity_l = Math.round((specs.capacity_ml / 1000) * 100) / 100
  }
  if (specs.flow_gpm != null && specs.flow_lmin == null) {
    specs.flow_lmin = Math.round(specs.flow_gpm * 3.7854 * 10) / 10
  }

  // Weight from meta / feed
  const weight = Number(meta?.weight_kg ?? feedEntry?.weightKg ?? feedEntry?.shippingWeightKg)
  if (Number.isFinite(weight) && weight > 0) specs.weight_kg = weight

  // Dimensions (cm)
  const dims = meta?.dimensions && typeof meta.dimensions === "object"
    ? meta.dimensions
    : feedEntry?.dimensions
  if (dims && typeof dims === "object") {
    const long = Number(dims.long)
    const wide = Number(dims.wide)
    const high = Number(dims.high)
    if (Number.isFinite(long)) specs.length_cm = long
    if (Number.isFinite(wide)) specs.width_cm = wide
    if (Number.isFinite(high)) specs.height_cm = high
  }

  // Brand (always "VEVOR" from feed for now; keep field so future brands work)
  const brand = String(feedEntry?.brand || "").trim()
  if (brand) specs.brand = brand

  // Fuel / material keyword matching
  const fuel = detectKeyword(text, FUEL_KEYWORDS)
  if (fuel) specs.fuel = fuel

  const material = detectKeyword(text, MATERIAL_KEYWORDS)
  if (material) specs.material = material

  return specs
}
