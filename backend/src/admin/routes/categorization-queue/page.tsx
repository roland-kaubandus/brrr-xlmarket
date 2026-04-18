/**
 * Admin UI — /admin/categorization-queue
 *
 * Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §F3.5
 *
 * MVP:
 *  - Stats banner (open count, aged-over-14d, method distribution)
 *  - Table of open review items with title, raw VEVOR path, confidence
 *  - Inline assign form (paste l1/l2/l3 slug, submit)
 *  - "Create rule from path" button — writes l1-l2-overrides.json
 *  - "Dismiss" button — marks resolved without moving the product
 */

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

type QueueItem = {
  id: number
  product_id: string
  method: string
  confidence: number | null
  l1_slug: string | null
  l2_slug: string | null
  l3_slug: string | null
  raw_path: string | null
  reason: string | null
  created_at: string
  title: string | null
  handle: string | null
  status: string | null
}

type Stats = {
  open: number
  aged_over_14d: number
  by_method: { method: string; n: number }[]
}

const BASE = "/admin/categorization-queue"

async function apiGet<T>(view?: string): Promise<T> {
  const q = view ? `?view=${view}` : ""
  const r = await fetch(BASE + q, { credentials: "include" })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

async function apiPost<T>(body: any): Promise<T> {
  const r = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12 }}>
      <span style={{ color: "#666" }}>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        style={{ padding: "4px 6px", border: "1px solid #ccc", borderRadius: 4, fontSize: 13 }}
      />
    </label>
  )
}

function Row({ item, onResolved }: { item: QueueItem; onResolved: () => void }) {
  const [l1, setL1] = useState(item.l1_slug || "")
  const [l2, setL2] = useState(item.l2_slug || "")
  const [l3, setL3] = useState(item.l3_slug || "")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function doAssign() {
    setBusy(true); setErr(null)
    try {
      await apiPost({ action: "assign", audit_id: item.id, l1_slug: l1, l2_slug: l2 || undefined, l3_slug: l3 || undefined })
      onResolved()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  async function doDismiss() {
    setBusy(true); setErr(null)
    try {
      await apiPost({ action: "dismiss", audit_id: item.id })
      onResolved()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  async function doCreateRule() {
    if (!item.raw_path) return
    const parts = item.raw_path.split(">").map(s => s.trim())
    const [vevorL1, vevorL2] = [parts[0] || "", parts[1] || ""]
    if (!vevorL1 || !vevorL2) { setErr("raw_path has no L1|L2"); return }
    const target = l2 ? `${l1}/${l2}` : l1
    if (!target) { setErr("Fill l1/l2 slug fields first"); return }
    setBusy(true); setErr(null)
    try {
      const r = await apiPost<{ drained: number }>({ action: "create_rule", vevor_l1: vevorL1, vevor_l2: vevorL2, target_slug: target })
      alert(`Rule ${vevorL1}|${vevorL2} → ${target} saved. ${r.drained} queued item(s) drained.`)
      onResolved()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  const conf = typeof item.confidence === "number" ? item.confidence.toFixed(2) : "—"
  return (
    <tr style={{ borderBottom: "1px solid #eee", verticalAlign: "top" }}>
      <td style={{ padding: "8px 6px" }}>
        <div style={{ fontWeight: 500 }}>{item.title || <em>(no title)</em>}</div>
        <div style={{ fontSize: 11, color: "#888" }}>{item.handle} · {item.product_id}</div>
      </td>
      <td style={{ padding: "8px 6px", fontSize: 12, color: "#555", maxWidth: 280 }}>
        {item.raw_path || <em>(empty)</em>}
      </td>
      <td style={{ padding: "8px 6px", fontSize: 12 }}>
        <div>{item.method}</div>
        <div style={{ color: "#888" }}>conf={conf}</div>
      </td>
      <td style={{ padding: "8px 6px", minWidth: 320 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <Field label="l1" value={l1} onChange={setL1} placeholder="e.g. hand-power-tools" />
          <Field label="l2" value={l2} onChange={setL2} placeholder="optional" />
          <Field label="l3" value={l3} onChange={setL3} placeholder="optional" />
        </div>
        {err ? <div style={{ color: "#b00", fontSize: 11, marginTop: 4 }}>{err}</div> : null}
      </td>
      <td style={{ padding: "8px 6px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button disabled={busy || !l1} onClick={doAssign}>Assign</button>
          <button disabled={busy || !l1 || !item.raw_path} onClick={doCreateRule} title="Also adds l1-l2 rule">+Rule</button>
          <button disabled={busy} onClick={doDismiss}>Dismiss</button>
        </div>
      </td>
    </tr>
  )
}

function CategorizationQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true); setError(null)
    try {
      const [{ items }, { stats }] = await Promise.all([
        apiGet<{ items: QueueItem[] }>(),
        apiGet<{ stats: Stats }>("stats"),
      ])
      setItems(items); setStats(stats)
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Categorization queue</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
        Resolver v2 flagged these products for manual review. Assign a canonical taxonomy slug,
        or create a feed-level rule so the whole category drains next sync.
      </p>

      {stats ? (
        <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
          <div><b>Open:</b> {stats.open}</div>
          <div><b>Aged &gt;14d:</b> {stats.aged_over_14d}</div>
          <div>
            <b>By method:</b> {stats.by_method.map(m => `${m.method}=${m.n}`).join(", ") || "—"}
          </div>
        </div>
      ) : null}

      {error ? <div style={{ color: "#b00", marginBottom: 12 }}>{error}</div> : null}
      {loading ? <div>Loading…</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "6px" }}>Product</th>
              <th style={{ padding: "6px" }}>VEVOR path</th>
              <th style={{ padding: "6px" }}>Method</th>
              <th style={{ padding: "6px" }}>Assign to</th>
              <th style={{ padding: "6px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <Row key={item.id} item={item} onResolved={refresh} />
            ))}
          </tbody>
        </table>
      )}

      {!loading && items.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "#888" }}>
          Queue is empty. Resolver v2 is auto-classifying everything. Nice.
        </div>
      ) : null}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Categorization queue",
})

export default CategorizationQueuePage
