"use client"

import { useEffect, useState } from "react"
import { useAdmin } from "./AdminProvider"
import { getAllL1, getChildren, getNode, nodeName, type CategoryNode } from "@/lib/category-tree"

interface Props {
  productId: string
  productHandle: string
  locale: string
  /** Current category handle as shown in the breadcrumb (may be null if uncategorized). */
  currentHandle: string | null
  /** Optional callback after successful save. */
  onSaved?: (newHandle: string) => void
}

export default function CategoryPicker({
  productId,
  productHandle,
  locale,
  currentHandle,
  onSaved,
}: Props) {
  const { isAdmin } = useAdmin()
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState<string[]>([]) // chosen handles, deepest is leaf
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize path from current handle when modal opens.
  useEffect(() => {
    if (!open) return
    if (!currentHandle) {
      setPath([])
      return
    }
    // climb ancestors from currentHandle
    const stack: string[] = []
    let cur = getNode(currentHandle)
    while (cur) {
      stack.unshift(cur.handle)
      if (!cur.parent_handle) break
      cur = getNode(cur.parent_handle)
    }
    setPath(stack)
  }, [open, currentHandle])

  if (!isAdmin) return null

  const selectedHandle = path[path.length - 1] ?? null
  const selectedNode = selectedHandle ? getNode(selectedHandle) : null

  // Columns: L1, then for each chosen handle, its children
  const columns: { parent: string | null; nodes: CategoryNode[]; selected: string | null }[] = []
  columns.push({ parent: null, nodes: getAllL1(), selected: path[0] ?? null })
  for (let i = 0; i < path.length; i++) {
    const kids = getChildren(path[i])
    if (kids.length === 0) break
    columns.push({ parent: path[i], nodes: kids, selected: path[i + 1] ?? null })
  }

  function pick(level: number, handle: string) {
    setPath((prev) => [...prev.slice(0, level), handle])
  }

  async function save() {
    if (!selectedHandle) {
      setError("Vali kategooria")
      return
    }
    setError(null)
    setBusy(true)
    try {
      const lookup = await fetch(`/api/admin/category-id?handle=${encodeURIComponent(selectedHandle)}`)
      if (!lookup.ok) {
        const data = (await lookup.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || `Lookup failed (${lookup.status})`)
      }
      const { id } = (await lookup.json()) as { id: string }
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          handle: productHandle,
          category_ids: [id],
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || `Save failed (${res.status})`)
      }
      setOpen(false)
      onSaved?.(selectedHandle)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvestamine ebaõnnestus")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FCD34D] border border-[#0b7d79] text-[#1a1a2e] hover:bg-[#2dd4bf] align-middle"
      >
        ✎ Muuda kategooriat
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Vali kategooria"
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false)
          }}
        >
          <div className="w-full max-w-[1100px] max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <header className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h2 className="text-[18px] font-bold text-[#1a1a2e]">Vali kategooria</h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Valitud:{" "}
                  <span className="font-semibold text-[#1a1a2e]">
                    {selectedNode ? nodeName(selectedNode, locale) : "—"}
                  </span>
                  {selectedNode && (
                    <span className="ml-1 text-[#94A3B8]">
                      (Tase {selectedNode.level} · {selectedNode.handle})
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="text-[#64748B] hover:text-[#1a1a2e] text-xl leading-none px-2"
                aria-label="Sulge"
              >
                ×
              </button>
            </header>

            <div className="flex-1 overflow-x-auto overflow-y-hidden flex divide-x divide-[#E2E8F0]">
              {columns.map((col, level) => (
                <div key={level} className="min-w-[260px] max-w-[300px] overflow-y-auto">
                  <div className="sticky top-0 px-3 py-2 bg-[#F1F5F9] border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    {level === 0 ? "L1 — Põhikategooriad" : `Tase ${level + 1}`}
                  </div>
                  <ul>
                    {col.nodes.map((n) => {
                      const isSelected = col.selected === n.handle
                      const hasKids = (n.child_handles?.length ?? 0) > 0
                      return (
                        <li key={n.handle}>
                          <button
                            type="button"
                            onClick={() => pick(level, n.handle)}
                            className={
                              "w-full text-left px-3 py-2 text-[13px] flex items-center justify-between gap-2 border-b border-[#F1F5F9] " +
                              (isSelected
                                ? "bg-[#ccfbf1] text-[#1a1a2e] font-semibold"
                                : "hover:bg-[#F8FAFC] text-[#334155]")
                            }
                          >
                            <span className="line-clamp-2">{nodeName(n, locale)}</span>
                            {hasKids && <span className="text-[#94A3B8] flex-shrink-0">›</span>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {error && (
              <div className="px-6 py-2 bg-red-50 border-t border-red-200 text-sm text-red-700">{error}</div>
            )}

            <footer className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-end gap-2">
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
                disabled={busy || !selectedHandle || selectedHandle === currentHandle}
                className="px-4 py-2 text-sm rounded bg-[#1a1a2e] text-white font-semibold hover:bg-[#12121f] disabled:opacity-40"
              >
                {busy ? "Salvestan..." : "Salvesta"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
