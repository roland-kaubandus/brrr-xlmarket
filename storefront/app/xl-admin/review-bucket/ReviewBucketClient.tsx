"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

// ── tüübid (peegeldab backend /admin/review-bucket vastust) ──────────

export interface CandidateHome {
  kind: "existing" | "new"
  // existing:
  handle?: string | null
  name?: string | null
  parent_name?: string | null
  exists?: boolean
  dup_hint?: boolean          // new_l3-ämbrist tulnud "lähim olemas, ei kata" → DUP-hoiatus
  // new:
  l2_raw?: string | null      // suggest_l2 toorik (handle VÕI label)
  l2_handle?: string | null   // resolveeritud L2 handle (null → vali käsitsi)
  l2_label?: string | null    // L2 nimi kuvamiseks
  from_buckets: string[]
  n: number
}
export interface Member {
  product_id: string
  sku: string | null
  title: string | null
  bucket: string
  confidence: number | null
  proposed_l3: string | null
  suggest_name: string | null
  suggest_l2: string | null
}
export interface Cluster {
  concept_key: string
  is_dup: boolean
  buckets: string[]
  n: number
  avg_conf: number | null
  candidate_homes: CandidateHome[]
  members: Member[]
}
export interface PendingBuild {
  log_id: number
  created_at: string
  new_l3_name: string | null
  target_l2: string | null
  concept_key: string | null
  n: number
  sample_titles: string | null
  age_seconds: number
}
export interface Decision {
  id: number
  created_at: string
  actor: string
  action: string
  concept_key: string | null
  target_handle: string | null
  new_l3_name: string | null
  status: string
  n_affected: number
  undone_at: string | null
}
export interface ReviewBucketData {
  table_exists: boolean
  total: number
  by_bucket: { bucket: string; n: number }[]
  clusters: Cluster[]
  pending_build: PendingBuild[]
  recent_decisions: Decision[]
}

const BUCKET_META: Record<string, { label: string; icon: string; badge: string }> = {
  new_l3: { label: "Uus tüüp", icon: "🆕", badge: "bg-amber-100 text-amber-800 border-amber-300" },
  quarantine: { label: "Kodutu", icon: "⚠️", badge: "bg-red-100 text-red-700 border-red-300" },
  review: { label: "Madal kindlus", icon: "❓", badge: "bg-sky-100 text-sky-800 border-sky-300" },
}

function shortHandle(h: string | null | undefined): string {
  if (!h) return "—"
  return h.replace(/^v4-/, "").split("-").slice(-3).join("-")
}
function homeId(h: CandidateHome): string {
  return h.kind === "existing" ? "existing:" + h.handle : "new:" + h.name + "@" + (h.l2_raw || "")
}
function ageStr(sec: number): string {
  const d = Math.floor(sec / 86400)
  if (d >= 1) return `${d}p`
  const h = Math.floor(sec / 3600)
  return h >= 1 ? `${h}h` : "äsja"
}

// ── L3/L2 otsingu-valija ("muu olemas-L3", 2a) ───────────────────────
interface SearchHit { handle: string; name: string; parent_name: string | null }
function CatSearch({ onPick, placeholder }: { onPick: (h: SearchHit) => void; placeholder: string }) {
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [loading, setLoading] = useState(false)
  async function run() {
    const term = q.trim()
    if (term.length < 2) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/review-bucket?search=${encodeURIComponent(term)}`)
      const json = await res.json()
      setHits(json?.data?.search_results ?? json?.search_results ?? [])
    } catch {
      setHits([])
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="mt-1">
      <div className="flex gap-1">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); run() } }}
          placeholder={placeholder}
          className="flex-1 text-xs border border-slate-300 rounded px-2 py-1"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading || q.trim().length < 2}
          className="px-2 py-1 text-xs rounded bg-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-300"
        >
          {loading ? "…" : "Otsi"}
        </button>
      </div>
      {hits && (
        <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 rounded bg-white">
          {hits.length === 0 ? (
            <div className="text-xs text-slate-400 px-2 py-1">Vasteid ei leitud (ainult leht-L3 kuvatakse)</div>
          ) : (
            hits.map((h) => (
              <button
                type="button"
                key={h.handle}
                onClick={() => { onPick(h); setHits(null); setQ("") }}
                className="block w-full text-left text-xs px-2 py-1 hover:bg-teal-50 border-b border-slate-100 last:border-0"
              >
                <span className="font-medium">{h.name}</span>
                {h.parent_name && <span className="text-slate-400"> · {h.parent_name}</span>}
                <span className="ml-1 font-mono text-[10px] text-slate-400">{shortHandle(h.handle)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function ReviewBucketClient({ data }: { data: ReviewBucketData }) {
  const router = useRouter()
  // valitud kodu klastri-võtme kaupa (DUP-värav — propose-not-create)
  const [chosen, setChosen] = useState<Record<string, string>>({})
  // "muu olemas-L3" käsitsi valitud kodu (kui chosen[ck] === "custom")
  const [customHome, setCustomHome] = useState<Record<string, SearchHit>>({})
  // create_l3 vanem-L2 käsitsi valik (kui suggest_l2 polnud handle)
  const [l2Pick, setL2Pick] = useState<Record<string, SearchHit>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  async function act(action: string, payload: Record<string, unknown>, busyKey: string) {
    setBusy(busyKey)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/review-bucket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setMsg({ kind: "ok", text: `✓ ${action} — logi #${json.result?.log_id ?? "?"}` })
      router.refresh()
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(null)
    }
  }

  const bc = (b: string) => data.by_bucket.find((x) => x.bucket === b)?.n ?? 0
  const health = data.total === 0 ? "tühi" : data.total < 30 ? "korras" : data.total < 150 ? "tähelepanu" : "kuhjub"
  const pb = data.pending_build || []

  return (
    <div>
      {/* koondriba */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3 text-sm">
          <span className="text-amber-800">🆕 uus tüüp: <strong>{bc("new_l3")}</strong></span>
          <span className="text-sky-800">❓ madal kindlus: <strong>{bc("review")}</strong></span>
          <span className="text-red-700">⚠️ kodutu: <strong>{bc("quarantine")}</strong></span>
        </div>
        <span className="inline-block px-3 py-1.5 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">
          {data.total} ootel · {health}
        </span>
      </div>

      {msg && (
        <div
          className={`rounded-lg p-3 mb-4 text-sm ${
            msg.kind === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* ── OOTAB BUILDI (1b — eraldi sektsioon, EI segamini otsustamata klastritega) ── */}
      {pb.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 mb-6">
          <h2 className="text-sm font-bold text-amber-900 mb-1">
            🏗 Kinnitatud, ootab struktuuri-buildi ({pb.reduce((s, x) => s + x.n, 0)} toodet / {pb.length} L3)
          </h2>
          <p className="text-xs text-amber-800 mb-3">
            create_l3 otsused. L3 luuakse struktuuri-buildil (genyM + 4-sammu deploy), siis tooted
            määratakse automaatselt. Need EI ilmu enam otsustamata-klastritena. Vale otsus → võta tagasi.
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-amber-700 border-b border-amber-200">
                <th className="py-1 pr-2">uus L3</th>
                <th className="py-1 pr-2">vanem-L2</th>
                <th className="py-1 pr-2">tooteid</th>
                <th className="py-1 pr-2">vanus</th>
                <th className="py-1 pr-2">näited</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {pb.map((b) => (
                <tr key={b.log_id} className="border-b border-amber-100">
                  <td className="py-1 pr-2 font-medium text-amber-900">{b.new_l3_name || "—"}</td>
                  <td className="py-1 pr-2 font-mono text-amber-700" title={b.target_l2 || ""}>{shortHandle(b.target_l2)}</td>
                  <td className="py-1 pr-2">{b.n}</td>
                  <td className="py-1 pr-2">{ageStr(b.age_seconds)}{b.age_seconds > 14 * 86400 ? " 🔴" : ""}</td>
                  <td className="py-1 pr-2 text-amber-700 truncate max-w-[220px]" title={b.sample_titles || ""}>{b.sample_titles || "—"}</td>
                  <td className="py-1 text-right">
                    <button
                      disabled={busy === `undo-${b.log_id}`}
                      onClick={() => act("undo", { log_id: b.log_id }, `undo-${b.log_id}`)}
                      className="px-2 py-0.5 rounded border border-amber-400 text-amber-800 disabled:opacity-40 hover:bg-amber-100"
                    >
                      Võta tagasi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.clusters.length === 0 && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-8 text-center text-emerald-700">
          0 klastrit ootel. Kõik kodutud on paigutatud või ülevaadatud.
        </div>
      )}

      <div className="grid gap-4">
        {data.clusters.map((c) => {
          const sel = chosen[c.concept_key]
          const custom = customHome[c.concept_key]
          const existingHomes = c.candidate_homes.filter((h) => h.kind === "existing")
          const newHomes = c.candidate_homes.filter((h) => h.kind === "new")
          // lähim olemas-L3 (DUP-hoiatus) uue L3 kõrvale
          const dupNearest = existingHomes.filter((h) => h.dup_hint)

          // valitud kodu resolveerimine (candidate VÕI custom otsing)
          let selKind: "existing" | "new" | "custom" | null = null
          let selHandle: string | null | undefined = null
          let selNewName: string | null | undefined = null
          let selL2Handle: string | null | undefined = null
          if (sel === "custom" && custom) {
            selKind = "custom"; selHandle = custom.handle
          } else if (sel) {
            const h = c.candidate_homes.find((x) => homeId(x) === sel)
            if (h?.kind === "existing") { selKind = "existing"; selHandle = h.handle }
            else if (h?.kind === "new") {
              selKind = "new"; selNewName = h.name
              selL2Handle = l2Pick[c.concept_key]?.handle ?? h.l2_handle ?? null
            }
          }
          const productIds = c.members.map((m) => m.product_id)
          const bk = `${c.concept_key}`
          const canAssign = selKind === "existing" || selKind === "custom"
          const canCreate = selKind === "new" && !!selL2Handle

          return (
            <div
              key={c.concept_key}
              className={`rounded-lg border bg-white p-4 ${
                c.is_dup ? "border-red-300 ring-1 ring-red-200" : "border-[#E2E8F0]"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  {c.is_dup && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold border border-red-300 bg-red-100 text-red-700 mb-1.5">
                      🚪 DUP-värav — vali ÜKS kodu enne loomist
                    </span>
                  )}
                  <h3 className="font-semibold text-[#1a1a2e] leading-tight">
                    {c.concept_key}
                    <span className="ml-2 text-xs font-normal text-[#94A3B8]">
                      {c.buckets.map((b) => BUCKET_META[b]?.icon || b).join(" ")}
                    </span>
                  </h3>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-[#0b7d79]">{c.n}</div>
                  <div className="text-xs text-[#64748B]">toodet</div>
                </div>
              </div>

              <div className="text-xs text-[#94A3B8] mb-2">
                Kandidaat-kodud {c.is_dup ? "(vali üks)" : ""} · keskm. kindlus{" "}
                {c.avg_conf != null ? `${(c.avg_conf * 100).toFixed(0)}%` : "—"}
              </div>

              {/* UUS L3 ettepanekud — pakutud vanem-L2 JA lähim olemas-L3 ERALDI (Tarmo 2b) */}
              {newHomes.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {newHomes.map((h) => {
                    const id = homeId(h)
                    const picked = l2Pick[c.concept_key]
                    const effL2 = picked?.handle ?? h.l2_handle ?? null
                    return (
                      <div key={id} className={`rounded border px-2 py-1.5 ${sel === id ? "bg-amber-50 border-amber-300" : "border-slate-200"}`}>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="radio" name={`home-${bk}`} checked={sel === id}
                            onChange={() => setChosen((s) => ({ ...s, [c.concept_key]: id }))}
                          />
                          <span className="text-amber-700 font-medium">🆕 uus L3:</span>
                          <span className="font-medium">{h.name}</span>
                          <span className="text-xs text-[#94A3B8] ml-auto">{h.n}× {h.from_buckets.join("/")}</span>
                        </label>
                        {sel === id && (
                          <div className="mt-1.5 ml-6 space-y-1 text-xs">
                            {/* pakutud vanem-L2 */}
                            <div>
                              <span className="text-slate-500">pakutud vanem-L2:</span>{" "}
                              {effL2 ? (
                                <span className="text-emerald-700 font-mono">{shortHandle(effL2)}</span>
                              ) : (
                                <span className="text-red-600">⚠️ suggest_l2 = <em>{h.l2_raw || "puudub"}</em> (label, mitte handle) → vali L2 käsitsi</span>
                              )}
                              {picked && <span className="text-slate-400"> · valitud: {picked.name}</span>}
                              <CatSearch
                                placeholder={effL2 ? "muuda vanem-L2…" : "otsi vanem-L2 (nimi)…"}
                                onPick={(hit) => setL2Pick((s) => ({ ...s, [c.concept_key]: hit }))}
                              />
                            </div>
                            {/* lähim olemas-L3 = DUP-hoiatus */}
                            {dupNearest.length > 0 && (
                              <div className="text-red-600">
                                🚪 lähim olemas-L3 (DUP-hoiatus, kaalu enne uut):{" "}
                                {dupNearest.map((d, i) => (
                                  <span key={d.handle}>
                                    {i > 0 && ", "}
                                    <button
                                      type="button"
                                      onClick={() => setChosen((s) => ({ ...s, [c.concept_key]: homeId(d) }))}
                                      className="underline decoration-dotted hover:text-red-800"
                                      title={d.handle || ""}
                                    >
                                      {d.name}
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* OLEMAS-L3 kodud (määra-siht; dup_hint = lähim uue kõrvalt) */}
              {existingHomes.length > 0 && (
                <div className="mb-2 space-y-1">
                  {existingHomes.map((h) => {
                    const id = homeId(h)
                    return (
                      <label
                        key={id}
                        className={`flex items-center gap-2 text-sm rounded px-2 py-1 cursor-pointer border ${
                          sel === id ? "bg-emerald-50 border-emerald-300" : "border-transparent hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio" name={`home-${bk}`} checked={sel === id}
                          onChange={() => setChosen((s) => ({ ...s, [c.concept_key]: id }))}
                        />
                        <span className="text-emerald-700 font-medium">olemas-L3:</span>
                        <span className="font-medium">{h.name}</span>
                        {h.parent_name && <span className="text-xs text-slate-400">· {h.parent_name}</span>}
                        {h.dup_hint && (
                          <span className="text-[10px] px-1 rounded bg-red-100 text-red-600 border border-red-200">DUP-hoiatus</span>
                        )}
                        {h.exists === false && (
                          <span className="text-[10px] px-1 rounded bg-slate-100 text-slate-500">puudub puust</span>
                        )}
                        <span className="text-xs text-[#94A3B8] ml-auto">{h.n}× {h.from_buckets.join("/")}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* 4. VALIK — "muu olemas-L3" otsinguga (2a); sama DUP-lukk */}
              <div className={`rounded border px-2 py-1.5 mb-3 ${sel === "custom" ? "bg-teal-50 border-teal-300" : "border-slate-200"}`}>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio" name={`home-${bk}`} checked={sel === "custom"}
                    onChange={() => setChosen((s) => ({ ...s, [c.concept_key]: "custom" }))}
                  />
                  <span className="text-teal-700 font-medium">🔎 muu olemas-L3</span>
                  {custom && <span className="font-medium">→ {custom.name}</span>}
                  {custom?.parent_name && <span className="text-xs text-slate-400">· {custom.parent_name}</span>}
                </label>
                <CatSearch
                  placeholder="otsi kogu taksonoomiast (L3 nimi)…"
                  onPick={(hit) => {
                    setCustomHome((s) => ({ ...s, [c.concept_key]: hit }))
                    setChosen((s) => ({ ...s, [c.concept_key]: "custom" }))
                  }}
                />
              </div>

              {/* näidistooted */}
              <details className="text-xs mb-3">
                <summary className="cursor-pointer text-[#0b7d79] hover:underline">
                  Tooted ({c.members.length})
                </summary>
                <ul className="mt-2 space-y-1 text-[#64748B]">
                  {c.members.map((m) => (
                    <li key={m.product_id} className="flex gap-2">
                      <span className={`px-1 rounded text-[10px] border ${BUCKET_META[m.bucket]?.badge || ""}`}>
                        {BUCKET_META[m.bucket]?.icon}
                      </span>
                      <span className="font-mono text-[#94A3B8] shrink-0">{m.sku || "—"}</span>
                      <span className="truncate" title={m.title || ""}>{m.title}</span>
                    </li>
                  ))}
                </ul>
              </details>

              {/* otsused — propose-not-create: assign/create lubatud alles kui kodu valitud */}
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busy === bk || !canAssign}
                  onClick={() => act("assign_existing", { product_ids: productIds, target_handle: selHandle, concept_key: c.concept_key }, bk)}
                  className="px-3 py-1.5 rounded text-sm font-medium bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700"
                  title={canAssign ? "" : "Vali olemas-L3 või 'muu olemas-L3'"}
                >
                  Määra olemas-L3-sse
                </button>
                <button
                  disabled={busy === bk || !canCreate}
                  onClick={() => act("create_l3", { product_ids: productIds, l2_handle: selL2Handle, new_l3_name: selNewName, concept_key: c.concept_key }, bk)}
                  className="px-3 py-1.5 rounded text-sm font-medium bg-amber-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-700"
                  title={selKind !== "new" ? "Vali uus L3" : !selL2Handle ? "Vali vanem-L2 (suggest_l2 polnud handle)" : "Kinnitab L3-loomise (build teeb tegeliku loomise)"}
                >
                  Loo L3 valitud L2 alla
                </button>
                <button
                  disabled={busy === bk}
                  onClick={() => act("quarantine", { product_ids: productIds, concept_key: c.concept_key }, bk)}
                  className="px-3 py-1.5 rounded text-sm font-medium bg-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-300"
                >
                  Quarantine
                </button>
                <button
                  disabled={busy === bk}
                  onClick={() => act("reject", { product_ids: productIds, concept_key: c.concept_key }, bk)}
                  className="px-3 py-1.5 rounded text-sm font-medium bg-white border border-red-300 text-red-600 disabled:opacity-40 hover:bg-red-50"
                >
                  Lükka tagasi
                </button>
              </div>
              {c.is_dup && !sel && (
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ DUP-värav: paigutus-nupud on lukus kuni valid ÜHE kodu — muidu topelt-kodu.
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* otsuste-logi + tagasivõtmine */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[#475569] mb-2">Viimased otsused (tagasivõetavad)</h2>
        {data.recent_decisions.length === 0 ? (
          <p className="text-xs text-[#94A3B8]">Otsuseid pole veel.</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-[#94A3B8] border-b border-[#E2E8F0]">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">aeg</th>
                <th className="py-1 pr-2">tegevus</th>
                <th className="py-1 pr-2">kontsept</th>
                <th className="py-1 pr-2">siht</th>
                <th className="py-1 pr-2">n</th>
                <th className="py-1 pr-2">staatus</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {data.recent_decisions.map((d) => (
                <tr key={d.id} className="border-b border-[#F1F5F9]">
                  <td className="py-1 pr-2 font-mono">{d.id}</td>
                  <td className="py-1 pr-2 text-[#64748B]">{new Date(d.created_at).toLocaleString("et-EE")}</td>
                  <td className="py-1 pr-2">{d.action}</td>
                  <td className="py-1 pr-2">{d.concept_key || "—"}</td>
                  <td className="py-1 pr-2 font-mono" title={d.target_handle || d.new_l3_name || ""}>
                    {shortHandle(d.target_handle) !== "—" ? shortHandle(d.target_handle) : d.new_l3_name || "—"}
                  </td>
                  <td className="py-1 pr-2">{d.n_affected}</td>
                  <td className="py-1 pr-2">
                    {d.undone_at ? <span className="text-slate-400">tagasi võetud</span>
                      : d.status === "approved_pending_build" ? <span className="text-amber-700">ootab buildi</span>
                        : <span className="text-emerald-700">rakendatud</span>}
                  </td>
                  <td className="py-1 text-right">
                    {!d.undone_at && (
                      <button
                        disabled={busy === `undo-${d.id}`}
                        onClick={() => act("undo", { log_id: d.id }, `undo-${d.id}`)}
                        className="px-2 py-0.5 rounded border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-slate-100"
                      >
                        Võta tagasi
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
