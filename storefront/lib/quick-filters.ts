export type QuickFilter = {
  token: string
  label: string
  count: number
  group: string
}

type TokenInfo = {
  group: string
  value: string
}

const GROUP_PRIORITY = [
  "power",
  "length",
  "size",
  "weight",
  "capacity",
  "color",
]

function parseToken(token: string): TokenInfo {
  const normalized = String(token || "").trim()
  const colonIndex = normalized.indexOf(":")
  if (colonIndex === -1) {
    return { group: "other", value: normalized }
  }
  return {
    group: normalized.slice(0, colonIndex),
    value: normalized.slice(colonIndex + 1),
  }
}

function humanizeWord(word: string): string {
  const clean = String(word || "").trim()
  if (!clean) return ""
  if (clean.includes("+")) return clean.replace(/\+/g, "+")
  return clean
    .split(/[-_]/g)
    .map((part) => {
      if (/^\d+(?:\.\d+)?$/.test(part)) return part
      if (/^\d+(?:\.\d+)?[a-z]+$/.test(part)) {
        return part.replace(/^(\d+(?:\.\d+)?)([a-z]+)$/i, (_, num, unit) => `${num} ${unit.toUpperCase()}`)
      }
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(" ")
}

function formatRange(value: string, unit: string, plus = false): string {
  const cleanUnit = unit.trim()
  return `${value.replace(/-/g, "–")} ${cleanUnit}${plus ? "+" : ""}`.trim()
}

function formatTokenLabel(group: string, value: string): string {
  const cleanValue = String(value || "").trim()
  if (!cleanValue) return humanizeWord(group)

  if (group === "color") {
    return humanizeWord(cleanValue)
  }

  if (group === "weight") {
    if (cleanValue.startsWith("under-")) {
      const amount = cleanValue.replace(/^under-/, "").replace(/kg$/i, "").trim()
      return `Under ${amount} kg`
    }
    if (cleanValue.endsWith("kg+")) {
      return `${cleanValue.replace(/kg\+$/i, "").replace(/-/g, "–")} kg+`
    }
    const range = cleanValue.match(/^(\d+(?:\.\d+)?)\-(\d+(?:\.\d+)?)(kg)$/i)
    if (range) return formatRange(`${range[1]}–${range[2]}`, range[3].toLowerCase())
    return cleanValue.replace(/kg$/i, " kg")
  }

  if (group === "length" || group === "size" || group === "capacity" || group === "power") {
    const plus = /\+$/.test(cleanValue)
    const stripped = cleanValue.replace(/\+$/, "")
    const range = stripped.match(/^(\d+(?:\.\d+)?)\-(\d+(?:\.\d+)?)(cm|kw|w|l)$/i)
    if (range) {
      const unit = range[3].toLowerCase()
      const prettyUnit = unit === "kw" ? "kW" : unit.toUpperCase()
      return formatRange(`${range[1]}–${range[2]}`, prettyUnit, plus)
    }
    const single = stripped.match(/^(\d+(?:\.\d+)?)(cm|kw|w|l)$/i)
    if (single) {
      const unit = single[2].toLowerCase()
      const prettyUnit = unit === "kw" ? "kW" : unit.toUpperCase()
      return formatRange(single[1], prettyUnit, plus)
    }
    return humanizeWord(cleanValue)
  }

  return humanizeWord(cleanValue)
}

export function buildQuickFilters(
  facetDistribution: Record<string, number> | undefined,
  totalHits: number,
  limit = 5
): QuickFilter[] {
  if (!facetDistribution) return []

  const grouped = new Map<string, QuickFilter[]>()

  Object.entries(facetDistribution)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .forEach(([token, count]) => {
      const parsed = parseToken(token)
      const label = formatTokenLabel(parsed.group, parsed.value)
      if (!label) return
      if (totalHits >= 8 && parsed.group === "brand" && count === totalHits) return
      const bucket = grouped.get(parsed.group) || []
      bucket.push({ token, label, count, group: parsed.group })
      grouped.set(parsed.group, bucket)
    })

  const result: QuickFilter[] = []
  for (const group of GROUP_PRIORITY) {
    const options = grouped.get(group)
    if (!options?.length) continue
    result.push(options[0])
    if (result.length >= limit) return result
  }

  if (result.length < limit) {
    const remaining = [...grouped.entries()]
      .filter(([group]) => !GROUP_PRIORITY.includes(group))
      .flatMap(([, items]) => items)
      .sort((a, b) => b.count - a.count)

    for (const item of remaining) {
      result.push(item)
      if (result.length >= limit) break
    }
  }

  return result
}

export function isQuickFilterActive(current: string | undefined, token: string): boolean {
  return String(current || "") === token
}
