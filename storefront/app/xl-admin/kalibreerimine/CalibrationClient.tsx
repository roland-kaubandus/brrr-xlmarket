"use client"

/**
 * CalibrationClient — AUTO-JUDGE kalibreerimine (PIME hindamine, plaan §5).
 *
 * Tarmo hindab iga kirje PIMESI (kohtuniku vastust EI näe) → kui kõik hinnatud,
 * paljastub võrdlustabel + kaks veamäära (VALE-OK · liiga-ettevaatlik) + lävend-verdikt.
 *
 * Andmed: dry-run runner (auto-judge-run.mjs --json) → /xl-admin/calib-<kind>.json
 *   { kind, decisions:[{ id, verdict|judge, ...input }] }  — kohtuniku väli on peidetud kuni lõpp.
 *
 * Tarmo hinnangud localStorage'is (per kind) → ei kao lehe-värskendusel, saab pooleli jätta.
 */

import { useEffect, useMemo, useState } from "react"

type Kind = "synonym" | "classify"

interface SynItem {
  id: string
  word: string
  synonyms: string[]
  title_en?: string
  title_et?: string
  category?: string
  gen_confidence?: number
  verdict: "OK" | "VALE" | "EBAKINDEL" // peidetud kuni lõpp
  reason: string
}
interface ClsfItem {
  id: string
  title: string
  bucket: string
  proposed?: string
  judge: { action: "assign_existing" | "group" | "new_l3" | "keep"; target_handle?: string; new_l3_name?: string; confidence: number; reason: string; quarantine_cause?: string }
}

const SYN_CHOICES = [
  { key: "OK", label: "✅ OK", hint: "sõna juhib õigesti tooteni" },
  { key: "VALE", label: "❌ VALE", hint: "ei kuulu siia" },
  { key: "EBAKINDEL", label: "❓ Ebakindel", hint: "ei oska otsustada" },
] as const
const CLSF_CHOICES = [
  { key: "assign_existing", label: "✅ Paiguta olemas-L3", hint: "kodu on olemas" },
  { key: "new_l3", label: "🆕 Vaja uut L3", hint: "kodu puudub" },
  { key: "keep", label: "❓ Jääk / andmeviga", hint: "jääb inimesele" },
] as const

const THRESHOLD: Record<Kind, { metric: string; max: number; note: string }> = {
  synonym: { metric: "VALE-OK", max: 5, note: "kohtunik ütles OK, Tarmo VALE" },
  classify: { metric: "VALE-assign", max: 2.5, note: "kohtunik paigutas, Tarmo poleks (≤1/40)" },
}

export default function CalibrationClient() {
  const [kind, setKind] = useState<Kind>("synonym")
  const [items, setItems] = useState<(SynItem | ClsfItem)[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState(false)

  const lsKey = `xlm-calib-${kind}`

  useEffect(() => {
    setRevealed(false)
    setItems([])
    setLoadErr(null)
    fetch(`/xl-admin/calib-${kind}.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status} — jooksuta dry-run runner --json`))))
      .then((d) => setItems(d.decisions || []))
      .catch((e) => setLoadErr(String(e.message || e)))
    try {
      const saved = localStorage.getItem(lsKey)
      setRatings(saved ? JSON.parse(saved) : {})
    } catch {
      setRatings({})
    }
  }, [kind, lsKey])

  const rate = (id: string, choice: string) => {
    setRatings((prev) => {
      const next = { ...prev, [id]: choice }
      try {
        localStorage.setItem(lsKey, JSON.stringify(next))
      } catch {
        /* privaatrežiim — jätka ilma */
      }
      return next
    })
  }
  const resetRatings = () => {
    setRatings({})
    setRevealed(false)
    try {
      localStorage.removeItem(lsKey)
    } catch {
      /* ignore */
    }
  }

  const rated = items.filter((it) => ratings[it.id]).length
  const allRated = items.length > 0 && rated === items.length

  // ── Võrdlus + veamäärad (alles reveal'il) ──
  const comparison = useMemo(() => {
    if (!revealed) return null
    let agree = 0
    let valeOk = 0 // KRIITILINE: kohtunik "positiivne" (OK/assign), Tarmo mitte
    let overCautious = 0 // kohtunik keep/ebakindel, Tarmo oleks otsustanud
    const judgeKey = (it: SynItem | ClsfItem) => (kind === "synonym" ? (it as SynItem).verdict : (it as ClsfItem).judge.action)
    const positiveJudge = (k: string) => (kind === "synonym" ? k === "OK" : k === "assign_existing")
    const positiveTarmo = (k: string) => (kind === "synonym" ? k === "OK" : k === "assign_existing")
    const cautiousJudge = (k: string) => (kind === "synonym" ? k === "EBAKINDEL" : k === "keep")
    for (const it of items) {
      const j = judgeKey(it)
      const t = ratings[it.id]
      if (j === t) agree++
      if (positiveJudge(j) && !positiveTarmo(t)) valeOk++
      if (cautiousJudge(j) && !cautiousJudge(t)) overCautious++
    }
    const n = items.length
    const th = THRESHOLD[kind]
    const valeOkPct = n ? (valeOk / n) * 100 : 0
    return {
      n,
      agree,
      agreePct: n ? (agree / n) * 100 : 0,
      valeOk,
      valeOkPct,
      overCautious,
      pass: valeOkPct <= th.max,
      th,
    }
  }, [revealed, items, ratings, kind])

  return (
    <div>
      {/* Mode-tabid */}
      <div className="flex gap-2 mb-4">
        {(["synonym", "classify"] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              kind === k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {k === "synonym" ? "🔤 Sünonüümi-kohtunik" : "🏷 Klassifikaatori-kohtunik"}
          </button>
        ))}
      </div>

      {/* Progress + juht */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Hinnatud {rated}/{items.length} <span className="text-slate-400">(pimesi — kohtuniku vastus peidetud)</span>
          </span>
          <div className="flex gap-2">
            {allRated && !revealed && (
              <button onClick={() => setRevealed(true)} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
                Paljasta võrdlus →
              </button>
            )}
            <button onClick={resetRatings} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 text-sm hover:bg-slate-50">
              Nulli
            </button>
          </div>
        </div>
        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-slate-900 transition-all" style={{ width: `${items.length ? (rated / items.length) * 100 : 0}%` }} />
        </div>
      </div>

      {loadErr && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-5 text-sm text-amber-800">
          Valimit ei leitud: {loadErr}
          <pre className="mt-2 text-xs bg-white/60 p-2 rounded">node scripts/auto-judge-run.mjs --kind {kind} --sample {kind === "synonym" ? 100 : 40} --dry --json storefront/public/xl-admin/calib-{kind}.json</pre>
        </div>
      )}

      {/* VÕRDLUSTABEL (reveal'il) */}
      {comparison && (
        <div className={`rounded-xl border-2 p-5 mb-6 ${comparison.pass ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
          <h2 className="text-lg font-bold mb-3">
            {comparison.pass ? "✅ LÄVEND LÄBITUD" : "🔴 LÄVEND ÜLETATUD — kohtunik EI tohi veel auto-režiimi"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Kokkulangevus" value={`${comparison.agree}/${comparison.n}`} sub={`${comparison.agreePct.toFixed(0)}%`} />
            <Stat
              label={`${comparison.th.metric} (KRIITILINE)`}
              value={`${comparison.valeOkPct.toFixed(1)}%`}
              sub={`lävi ≤${comparison.th.max}% · ${comparison.th.note}`}
              bad={!comparison.pass}
            />
            <Stat label="Liiga ettevaatlik" value={`${comparison.overCautious}`} sub="ohutu, ainult efektiivsus" />
            <Stat label="Valim" value={`${comparison.n}`} sub={kind === "synonym" ? "sünonüümi" : "klassifikaatorit"} />
          </div>
        </div>
      )}

      {/* KIRJED */}
      <div className="space-y-3">
        {items.map((it) => {
          const chosen = ratings[it.id]
          const choices = kind === "synonym" ? SYN_CHOICES : CLSF_CHOICES
          const judgeAns = kind === "synonym" ? (it as SynItem).verdict : (it as ClsfItem).judge.action
          const judgeReason = kind === "synonym" ? (it as SynItem).reason : (it as ClsfItem).judge.reason
          const disagree = revealed && chosen && chosen !== judgeAns
          return (
            <div key={it.id} className={`rounded-lg border p-4 ${disagree ? "border-red-300 bg-red-50/40" : chosen ? "border-slate-300 bg-white" : "border-slate-200 bg-white"}`}>
              {kind === "synonym" ? <SynCard it={it as SynItem} /> : <ClsfCard it={it as ClsfItem} />}

              {/* Hinnangu-nupud */}
              <div className="flex flex-wrap gap-2 mt-3">
                {choices.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => rate(it.id, c.key)}
                    title={c.hint}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      chosen === c.key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Kohtuniku vastus — AINULT reveal'il */}
              {revealed && (
                <div className={`mt-3 rounded-md p-3 text-sm ${disagree ? "bg-red-100 text-red-900" : "bg-emerald-50 text-emerald-900"}`}>
                  <strong>{disagree ? "⚡ LAHKNEB — " : "✓ nõus — "}</strong>
                  kohtunik: <code className="font-semibold">{judgeAns}</code>
                  {kind === "classify" && (it as ClsfItem).judge.target_handle ? ` → ${(it as ClsfItem).judge.target_handle}` : ""}
                  <span className="block mt-1 text-slate-600">{judgeReason}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, bad }: { label: string; value: string; sub?: string; bad?: boolean }) {
  return (
    <div className="rounded-lg bg-white/70 border border-slate-200 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-bold ${bad ? "text-red-600" : "text-slate-900"}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function SynCard({ it }: { it: SynItem }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-base font-semibold">&ldquo;{it.word}&rdquo;</span>
        <span className="text-xs text-slate-400">{it.category || "kategooriata"}</span>
      </div>
      {it.synonyms?.length > 0 && <div className="text-sm text-slate-600 mt-0.5">sünonüümid: {it.synonyms.join(", ")}</div>}
      <div className="text-sm text-slate-500 mt-1">toode: {it.title_et || it.title_en || "—"}</div>
    </div>
  )
}

function ClsfCard({ it }: { it: ClsfItem }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold">{it.title || "(tühi title)"}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{it.bucket}</span>
      </div>
      {it.proposed && <div className="text-sm text-slate-500 mt-0.5">klassifikaator pakkus: {it.proposed}</div>}
    </div>
  )
}
