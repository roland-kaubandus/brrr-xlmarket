import SafeLink from "@/components/SafeLink"

/**
 * SpecComparisonTable — tüübi-oluliste tehniliste näitajate võrdlustabel kategooria-lehel.
 * Geneeriline: veerud tuletatakse toodetel olevatest `compare_specs` võtmetest (union),
 * ET-labelid mapist. Spec-väärtus = `{v, d}` (v=arv võrdluseks, d=kuva) VÕI string (nt määrimine).
 * Kuvatakse ainult kui ≥2 tootel on compare_specs (nt Õhukompressorid piloot).
 */
type SpecVal = { v?: number; d?: string } | string | null
type CompareSpecs = Record<string, SpecVal>
export type CompareProduct = {
  handle: string
  title: string
  thumbnail?: string | null
  compare_specs?: CompareSpecs | null
}

// Eelistatud veeru-järjekord + ET-labelid (laieneb tüübiti).
const FIELD_ORDER = ["voimsus", "max_rohk", "paagi_maht", "ohuvool", "myra", "maarimine", "rpm", "pinge", "materjal"]
const LABELS: Record<string, { et: string; en: string }> = {
  voimsus: { et: "Võimsus", en: "Power" },
  max_rohk: { et: "Max. rõhk", en: "Max. pressure" },
  paagi_maht: { et: "Paagi maht", en: "Tank volume" },
  ohuvool: { et: "Õhuvool", en: "Air flow" },
  myra: { et: "Müra", en: "Noise" },
  maarimine: { et: "Määrimine", en: "Lubrication" },
  rpm: { et: "Pöörlemiskiirus", en: "Speed" },
  pinge: { et: "Pinge", en: "Voltage" },
  materjal: { et: "Materjal", en: "Material" },
}

function cellText(val: SpecVal): string {
  if (val == null) return "—"
  if (typeof val === "string") return val
  return val.d || (typeof val.v === "number" ? String(val.v) : "—")
}

export default function SpecComparisonTable({
  products,
  locale,
}: {
  products: CompareProduct[]
  locale: string
}) {
  const loc = (locale === "et" ? "et" : "en") as "et" | "en"
  const withSpecs = products.filter((p) => p.compare_specs && Object.keys(p.compare_specs).length > 0)
  if (withSpecs.length < 2) return null

  // Union kõigi toodete spec-võtmetest, eelistatud järjekorras.
  const present = new Set<string>()
  for (const p of withSpecs) for (const k of Object.keys(p.compare_specs || {})) present.add(k)
  const cols = FIELD_ORDER.filter((k) => present.has(k))
  if (cols.length === 0) return null

  return (
    <details className="mb-6 group rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden" open>
      <summary className="flex items-center justify-between cursor-pointer px-4 sm:px-5 py-3.5 text-[15px] font-bold text-[#1a1a2e] list-none select-none">
        <span>{loc === "et" ? "Võrdle tehnilisi andmeid" : "Compare technical specs"}
          <span className="ml-2 text-[13px] font-medium text-[#64748B]">({withSpecs.length})</span>
        </span>
        <span aria-hidden className="text-[#94A3B8] group-open:rotate-90 transition-transform text-[18px]">&rsaquo;</span>
      </summary>
      <div className="overflow-x-auto border-t border-[#F1F5F9]">
        <table className="w-full text-[13.5px] border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] text-left">
              <th className="sticky left-0 bg-[#F8FAFC] px-4 py-2.5 font-semibold text-[#475569] min-w-[180px] z-10">
                {loc === "et" ? "Toode" : "Product"}
              </th>
              {cols.map((k) => (
                <th key={k} className="px-3 py-2.5 font-semibold text-[#475569] whitespace-nowrap">
                  {LABELS[k]?.[loc] || k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {withSpecs.map((p) => (
              <tr key={p.handle} className="border-t border-[#F1F5F9] hover:bg-[#f0fdf9] transition-colors">
                <td className="sticky left-0 bg-white px-4 py-2.5 z-10">
                  <SafeLink
                    href={`/${loc}/toode/${p.handle}`}
                    className="flex items-center gap-2.5 text-[#1a1a2e] hover:text-[#0b7d79] font-medium"
                  >
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt="" className="w-9 h-9 rounded-md object-cover border border-[#F1F5F9] shrink-0" loading="lazy" />
                    ) : null}
                    <span className="line-clamp-2 leading-tight">{p.title}</span>
                  </SafeLink>
                </td>
                {cols.map((k) => (
                  <td key={k} className="px-3 py-2.5 text-[#1a1a2e] tabular-nums whitespace-nowrap">
                    {cellText((p.compare_specs || {})[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
