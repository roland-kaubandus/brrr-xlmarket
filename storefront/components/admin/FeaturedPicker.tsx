"use client"

import { useEffect, useMemo, useState } from "react"
import { useAdmin } from "./AdminProvider"
import {
  getChildren,
  getNode,
  nodeName,
  type CategoryNode,
} from "@/lib/category-tree"

interface Props {
  l1Handle: string
  locale: string
  /** Current 6 handles displayed in the bento grid (for highlight + initial load). */
  currentFeatured: string[]
}

interface SearchableNode {
  node: CategoryNode
  trail: string
}

function flattenDescendants(l1: string): SearchableNode[] {
  const out: SearchableNode[] = []
  const queue: Array<{ handle: string; trail: string[] }> = []
  for (const c of getChildren(l1)) queue.push({ handle: c.handle, trail: [c.handle] })
  while (queue.length > 0) {
    const cur = queue.shift()!
    const node = getNode(cur.handle)
    if (!node) continue
    out.push({ node, trail: cur.trail.join(" › ") })
    for (const child of node.child_handles) {
      queue.push({ handle: child, trail: [...cur.trail, child] })
    }
  }
  return out
}

export default function FeaturedPicker({ l1Handle, locale, currentFeatured }: Props) {
  const { isAdmin } = useAdmin()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>(currentFeatured.slice(0, 6))
  const [search, setSearch] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  // Refresh selected when modal opens (currentFeatured may have changed)
  useEffect(() => {
    if (open) {
      setSelected(currentFeatured.slice(0, 6))
      setSearch("")
      setError(null)
      setStatus(null)
    }
  }, [open, currentFeatured])

  const allCandidates = useMemo<SearchableNode[]>(() => {
    if (!open) return []
    return flattenDescendants(l1Handle)
  }, [open, l1Handle])

  const filtered = useMemo(() => {
    if (!search.trim()) return allCandidates.slice(0, 200)
    const q = search.trim().toLowerCase()
    return allCandidates
      .filter((c) => {
        const name = nodeName(c.node, locale).toLowerCase()
        return c.node.handle.includes(q) || name.includes(q)
      })
      .slice(0, 200)
  }, [allCandidates, search, locale])

  if (!isAdmin) return null

  function toggle(handle: string) {
    setSelected((prev) => {
      if (prev.includes(handle)) return prev.filter((h) => h !== handle)
      if (prev.length >= 6) return prev // can't exceed 6
      return [...prev, handle]
    })
  }

  function move(handle: string, dir: -1 | 1) {
    setSelected((prev) => {
      const idx = prev.indexOf(handle)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const out = [...prev]
      out.splice(idx, 1)
      out.splice(next, 0, handle)
      return out
    })
  }

  async function save() {
    setError(null)
    setStatus(null)
    setBusy(true)
    try {
      const res = await fetch("/api/admin/homepage-overrides", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ l1: l1Handle, featured_handles: selected }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setStatus("Salvestatud. Värskendan...")
      setTimeout(() => window.location.reload(), 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvestamine ebaõnnestus")
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    setError(null)
    setStatus(null)
    setBusy(true)
    try {
      const res = await fetch("/api/admin/homepage-overrides", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ l1: l1Handle, featured_handles: [] }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setStatus("Kasutusel automaatne valik. Värskendan...")
      setTimeout(() => window.location.reload(), 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lähtestamine ebaõnnestus")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FCD34D] border border-[#0b7d79] text-[#1a1a2e] hover:bg-[#2dd4bf]"
      >
        ✎ 6 alakategooriat
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Vali 6 alakategooriat"
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false)
          }}
        >
          <div className="w-full max-w-[1000px] max-h-[88vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <header className="px-6 py-4 border-b border-[#E2E8F0] flex items-start justify-between bg-[#F8FAFC] gap-3">
              <div className="min-w-0">
                <h2 className="text-[18px] font-bold text-[#1a1a2e]">
                  Vali 6 alakategooriat
                </h2>
                <p className="text-[12px] text-[#64748B] mt-0.5 truncate">
                  L1: <code className="text-[11px] bg-[#F1F5F9] px-1.5 py-0.5 rounded">{l1Handle}</code>
                  <span className="mx-1">·</span>
                  <span>
                    Valitud: <span className="font-semibold text-[#1a1a2e]">{selected.length} / 6</span>
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                disabled={busy}
                className="text-[#64748B] hover:text-[#1a1a2e] text-2xl leading-none px-2 -my-1"
                aria-label="Sulge"
              >
                ×
              </button>
            </header>

            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[300px_1fr] divide-x divide-[#E2E8F0]">
              {/* Selected list */}
              <aside className="p-4 overflow-y-auto bg-[#f0fdf9]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                  Praegune järjestus
                </div>
                {selected.length === 0 ? (
                  <p className="text-[13px] text-[#64748B] italic">
                    Pole valitud — vajuta kategooria peale paremal.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {selected.map((h, idx) => {
                      const node = getNode(h)
                      return (
                        <li
                          key={h}
                          className="flex items-center gap-2 px-2 py-1.5 bg-white border border-[#FCD34D] rounded text-[13px]"
                        >
                          <span className="font-bold text-[#0b7d79] text-[12px] w-4">{idx + 1}.</span>
                          <span className="flex-1 truncate">
                            {node ? nodeName(node, locale) : h}
                          </span>
                          <button
                            type="button"
                            onClick={() => move(h, -1)}
                            disabled={idx === 0 || busy}
                            className="text-[#64748B] hover:text-[#1a1a2e] disabled:opacity-30 px-1"
                            aria-label="Liiguta üles"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => move(h, 1)}
                            disabled={idx === selected.length - 1 || busy}
                            className="text-[#64748B] hover:text-[#1a1a2e] disabled:opacity-30 px-1"
                            aria-label="Liiguta alla"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => toggle(h)}
                            disabled={busy}
                            className="text-red-600 hover:text-red-700 px-1"
                            aria-label="Eemalda"
                          >
                            ×
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </aside>

              {/* Browser */}
              <section className="overflow-y-auto">
                <div className="sticky top-0 bg-white p-3 border-b border-[#E2E8F0]">
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Otsi nime või handle järgi..."
                    className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30 focus:border-[#0ea5a0]"
                  />
                </div>
                <ul className="p-3 space-y-1">
                  {filtered.map(({ node, trail }) => {
                    const isPicked = selected.includes(node.handle)
                    const atLimit = !isPicked && selected.length >= 6
                    return (
                      <li key={node.handle}>
                        <button
                          type="button"
                          onClick={() => toggle(node.handle)}
                          disabled={busy || atLimit}
                          className={
                            "w-full text-left px-3 py-2 text-[13px] rounded flex items-start gap-2 border " +
                            (isPicked
                              ? "bg-[#ccfbf1] border-[#FCD34D] text-[#1a1a2e]"
                              : atLimit
                                ? "bg-[#F8FAFC] border-transparent text-[#94A3B8] cursor-not-allowed"
                                : "bg-white border-[#F1F5F9] hover:bg-[#F8FAFC] text-[#334155]")
                          }
                        >
                          <span className="mt-0.5 w-4 text-[11px] font-bold">
                            {isPicked ? "✓" : ""}
                          </span>
                          <span className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{nodeName(node, locale)}</div>
                            <div className="text-[11px] text-[#94A3B8] truncate">
                              L{node.level} · {trail}
                            </div>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                  {filtered.length === 0 && (
                    <li className="text-[13px] text-[#94A3B8] italic px-3 py-2">
                      Ei leitud {search ? `"${search}"` : "kategooriaid"}.
                    </li>
                  )}
                </ul>
              </section>
            </div>

            {error && (
              <div className="px-6 py-2 bg-red-50 border-t border-red-200 text-sm text-red-700">{error}</div>
            )}
            {status && (
              <div className="px-6 py-2 bg-[#ccfbf1] border-t border-[#FCD34D] text-sm text-[#1a1a2e]">
                {status}
              </div>
            )}

            <footer className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={busy}
                className="text-[12px] text-[#64748B] hover:text-[#1a1a2e] underline disabled:opacity-50"
              >
                Lähtesta automaatsele valikule
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => !busy && setOpen(false)}
                  disabled={busy}
                  className="px-4 py-2 text-sm rounded bg-white border border-[#CBD5E1] text-[#1a1a2e] hover:bg-[#F1F5F9]"
                >
                  Tühista
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={busy || selected.length === 0}
                  className="px-4 py-2 text-sm rounded bg-[#1a1a2e] text-white font-semibold hover:bg-[#12121f] disabled:opacity-40"
                >
                  {busy ? "Salvestan..." : "Salvesta"}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
