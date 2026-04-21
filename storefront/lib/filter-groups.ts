/**
 * filter-groups.ts — organize raw filter_tokens into UI filter groups.
 *
 * Each token format is `<key>:<value>` (e.g. "voltage_v:220V",
 * "amperage_a:100-200A", "brand:vevor", "fuel:diesel").
 *
 * Output is a list of groups, each with a label, a list of options sorted
 * by natural order (ranges ascending, discrete values ascending,
 * keywords alphabetically), and a count per option.
 *
 * Groups with <2 unique options are hidden — they don't discriminate.
 */

export type FilterOption = {
  token: string       // raw token e.g. "voltage_v:220V"
  value: string       // parsed value "220V"
  label: string       // display "220 V"
  count: number       // how many products match
}

export type FilterGroup = {
  key: string         // raw key "voltage_v"
  label: string       // display "Voltage"
  options: FilterOption[]
}

// Human-readable group labels
const GROUP_LABELS: Record<string, string> = {
  brand: "Brand",
  voltage_v: "Voltage",
  amperage_a: "Amperage",
  pressure_bar: "Pressure",
  power_w: "Power",
  capacity_l: "Capacity",
  flow_lmin: "Flow",
  rpm: "RPM",
  btu: "Heat Output",
  duty_cycle_pct: "Duty Cycle",
  frequency_hz: "Frequency",
  weight_kg: "Weight",
  length_cm: "Length",
  width_cm: "Width",
  height_cm: "Height",
  fuel: "Fuel",
  material: "Material",
}

// Group display order on sidebar. Keys not listed fall to the bottom.
const GROUP_ORDER = [
  "brand",
  "voltage_v",
  "amperage_a",
  "power_w",
  "pressure_bar",
  "btu",
  "capacity_l",
  "flow_lmin",
  "rpm",
  "duty_cycle_pct",
  "frequency_hz",
  "fuel",
  "material",
  "weight_kg",
  "length_cm",
  "width_cm",
  "height_cm",
]

function titleCase(str: string): string {
  return str.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

// Format value for display: "220V" -> "220 V", "100-200A" -> "100–200 A",
// "300A+" -> "300 A+", "vevor" -> "VEVOR", "stainless-steel" -> "Stainless Steel"
function formatValue(key: string, value: string): string {
  if (!value) return ""

  // Brand — uppercase for VEVOR etc.
  if (key === "brand") return value.toUpperCase()

  // Range "100-200A" / "2000-4000W" / "100-200L"
  const range = value.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)([a-zA-Z/]+)$/)
  if (range) {
    const [, a, b, unit] = range
    return `${a}–${b} ${prettyUnit(unit)}`
  }

  // Open-ended "300A+", "50L+"
  const openEnded = value.match(/^(\d+(?:\.\d+)?)([a-zA-Z/]+)\+$/)
  if (openEnded) {
    const [, n, unit] = openEnded
    return `${n} ${prettyUnit(unit)}+`
  }

  // Discrete single value "220V"
  const discrete = value.match(/^(\d+(?:\.\d+)?)([a-zA-Z/]+)$/)
  if (discrete) {
    const [, n, unit] = discrete
    return `${n} ${prettyUnit(unit)}`
  }

  // Keyword — title case slugs ("stainless-steel" -> "Stainless Steel")
  return titleCase(value)
}

function prettyUnit(unit: string): string {
  const u = unit.toLowerCase()
  if (u === "kw") return "kW"
  if (u === "l/min") return "L/min"
  if (u === "kg") return "kg"
  if (u === "cm" || u === "mm") return u
  return unit.toUpperCase()
}

// Sort key — for numeric ranges, sort by min value; for discrete, by value;
// for keywords, alphabetically.
function sortKey(value: string): number {
  const range = value.match(/^(\d+(?:\.\d+)?)/)
  if (range) return Number.parseFloat(range[1])
  return Number.POSITIVE_INFINITY
}

export function buildFilterGroups(
  facetDistribution: Record<string, number> | undefined
): FilterGroup[] {
  if (!facetDistribution) return []

  // Bucket tokens by group key
  const grouped = new Map<string, FilterOption[]>()

  for (const [token, count] of Object.entries(facetDistribution)) {
    if (!count) continue
    const colon = token.indexOf(":")
    if (colon === -1) continue
    const key = token.slice(0, colon)
    const value = token.slice(colon + 1)
    if (!value) continue

    const option: FilterOption = {
      token,
      value,
      label: formatValue(key, value),
      count,
    }
    const bucket = grouped.get(key) || []
    bucket.push(option)
    grouped.set(key, bucket)
  }

  // Sort options within each group and filter out groups with <2 options
  const groups: FilterGroup[] = []
  for (const [key, options] of grouped.entries()) {
    if (options.length < 2) continue
    const sorted = [...options].sort((a, b) => {
      const ka = sortKey(a.value)
      const kb = sortKey(b.value)
      if (ka !== kb) return ka - kb
      return a.value.localeCompare(b.value)
    })
    groups.push({
      key,
      label: GROUP_LABELS[key] || titleCase(key),
      options: sorted,
    })
  }

  // Order groups
  groups.sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a.key)
    const ib = GROUP_ORDER.indexOf(b.key)
    if (ia === -1 && ib === -1) return a.label.localeCompare(b.label)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  return groups
}

/**
 * Parse the `filters` URL param into a set of active tokens.
 * Multi-select syntax: comma-separated tokens.
 *   ?filters=voltage_v:220V,amperage_a:100-200A
 */
export function parseActiveFilters(raw: string | undefined): Set<string> {
  if (!raw) return new Set()
  return new Set(raw.split(",").map(s => s.trim()).filter(Boolean))
}

export function serializeActiveFilters(tokens: Iterable<string>): string {
  return [...tokens].join(",")
}
