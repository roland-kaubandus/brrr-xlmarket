"use client"

import { useMemo, useState } from "react"

export interface CatRow {
  handle: string
  level: number
  parent: string
  name: string
  isLeaf: boolean
  count: number
}

type SortKey = "count" | "name" | "level"

export default function CategoriesTable({ rows }: { rows: CatRow[] }) {
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<SortKey>("count")
  const [onlyEmpty, setOnlyEmpty] = useState(false)
  const [maxLevel, setMaxLevel] = useState(0) // 0 = kõik

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let r = rows
    if (needle) r = r.filter((x) => x.name.toLowerCase().includes(needle) || x.handle.includes(needle))
    if (onlyEmpty) r = r.filter((x) => x.count === 0)
    if (maxLevel > 0) r = r.filter((x) => x.level <= maxLevel)
    const sorted = [...r]
    if (sort === "count") sorted.sort((a, b) => b.count - a.count)
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "et"))
    else sorted.sort((a, b) => a.level - b.level || b.count - a.count)
    return sorted
  }, [rows, q, sort, onlyEmpty, maxLevel])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Otsi nime või handle järgi…"
          className="px-3 py-2 border border-[#CBD5E1] rounded text-sm w-64"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="px-2 py-2 border border-[#CBD5E1] rounded text-sm">
          <option value="count">Sorteeri: tootearv</option>
          <option value="name">Sorteeri: nimi</option>
          <option value="level">Sorteeri: tase</option>
        </select>
        <select value={maxLevel} onChange={(e) => setMaxLevel(Number(e.target.value))} className="px-2 py-2 border border-[#CBD5E1] rounded text-sm">
          <option value={0}>Kõik tasemed</option>
          <option value={1}>Ainult L1</option>
          <option value={2}>L1–L2</option>
          <option value={3}>L1–L3</option>
        </select>
        <label className="text-sm text-[#475569] flex items-center gap-1">
          <input type="checkbox" checked={onlyEmpty} onChange={(e) => setOnlyEmpty(e.target.checked)} /> ainult tühjad
        </label>
        <span className="text-sm text-[#94A3B8] ml-auto">{filtered.length} näidatud</span>
      </div>

      <div className="overflow-auto border border-[#E2E8F0] rounded-lg max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] sticky top-0">
            <tr className="text-left text-[#64748B]">
              <th className="px-3 py-2 font-semibold">Nimi</th>
              <th className="px-3 py-2 font-semibold">Handle</th>
              <th className="px-3 py-2 font-semibold w-16">Tase</th>
              <th className="px-3 py-2 font-semibold w-20 text-right">Tooteid</th>
              <th className="px-3 py-2 font-semibold">Vanem</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 1500).map((r) => (
              <tr key={r.handle} className="border-t border-[#F1F5F9] hover:bg-[#FFFBEB]">
                <td className="px-3 py-1.5 text-[#1E293B]">
                  <a href={`/et/kategooriad/${r.handle}`} target="_blank" rel="noreferrer" className="hover:text-[#E8920A]">{r.name}</a>
                  {!r.isLeaf && <span className="ml-1 text-[10px] text-[#94A3B8]">(vanem)</span>}
                </td>
                <td className="px-3 py-1.5 text-[#94A3B8] font-mono text-[11px]">{r.handle}</td>
                <td className="px-3 py-1.5 text-[#64748B]">L{r.level}</td>
                <td className={`px-3 py-1.5 text-right tabular-nums ${r.count === 0 ? "text-red-500" : r.count <= 2 ? "text-amber-600" : "text-[#1E293B]"}`}>{r.count}</td>
                <td className="px-3 py-1.5 text-[#94A3B8] font-mono text-[11px]">{r.parent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 1500 && (
        <p className="text-xs text-[#94A3B8] mt-2">Näidatud esimesed 1500/{filtered.length} — kitsenda otsinguga.</p>
      )}
    </div>
  )
}
