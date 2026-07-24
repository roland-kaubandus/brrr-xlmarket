/**
 * Klassifikatsiooni review — KLASTRITE vaade (feed-pipeline review-bucket).
 *
 * Allikas: backend `/admin/categorization-queue?view=clusters` → tabel
 * `classification_review` (tekib klassifikaatori --execute'il). Propose-not-create:
 * feed-cron paigutab AINULT olemas-L3-desse (conf ≥ 0.85); uus tüüp / madal kindlus /
 * kodutu → siia, INIMENE otsustab L3-loomise.
 *
 * MIKS klaster, mitte tootekaupa: Tarmo otsustab klastritena (tüüp · arv · lähim-L3).
 * Digest (Slack/console) on push — see on koht kuhu MINNA ja vaadata, et kodutud
 * ei koonduks vaikselt (sama muster mida feed-sync 3 kuud tegi).
 *
 * READ-ONLY (nagu vana queue): tegevusnupud (loo L3 / paiguta) = järgmine faas.
 */

import { medusaAdminFetch } from "@/lib/medusa-admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface Cluster {
  bucket: "new_l3" | "review" | "quarantine"
  label: string
  suggest_l2: string | null
  nearest_l3: string | null
  n: number
  avg_conf: number | null
  samples: string[]
  skus: (string | null)[]
}
interface ClustersResp {
  table_exists: boolean
  total: number
  by_bucket: { bucket: string; n: number }[]
  clusters: Cluster[]
}

const BUCKET_META: Record<Cluster["bucket"], { label: string; icon: string; badge: string; hint: string }> = {
  new_l3: {
    label: "Uus tüüp",
    icon: "🆕",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    hint: "kodu puudub — vaja luua uus L3 (inimene otsustab)",
  },
  quarantine: {
    label: "Kodutu",
    icon: "⚠️",
    badge: "bg-red-100 text-red-700 border-red-300",
    hint: "ei mahtunud ühtegi olemas-L3-sse ega selget uut tüüpi — inimene otsustab",
  },
  review: {
    label: "Madal kindlus",
    icon: "❓",
    badge: "bg-sky-100 text-sky-800 border-sky-300",
    hint: "olemas-L3 lähedal, aga kindlus madal — kinnita paigutus",
  },
}

function humanHandle(h: string | null): string {
  if (!h) return "—"
  // v4-tooriistad-…-uldtooriistakomplektid → "uldtooriistakomplektid"
  const last = h.replace(/^v4-/, "").split("-").slice(-4).join("-")
  return last || h
}

export default async function CategorizationQueuePage() {
  let data: ClustersResp | null = null
  let error: string | null = null
  try {
    data = await medusaAdminFetch<ClustersResp>("/admin/categorization-queue?view=clusters&limit=200")
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  const total = data?.total ?? 0
  const clusters = data?.clusters ?? []
  const health = total === 0 ? "tühi" : total < 30 ? "korras" : total < 150 ? "tähelepanu" : "kuhjub"
  const healthColor =
    health === "tühi" || health === "korras"
      ? "bg-emerald-100 text-emerald-700"
      : health === "tähelepanu"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-700"

  const bucketCount = (b: string) => data?.by_bucket.find((x) => x.bucket === b)?.n ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Klassifikatsiooni review</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Kodutud tooted, mille feed-cron jättis inimotsuseks (propose-not-create). Klastrite kaupa —
            tüüp · arv · lähim olemas-L3.
          </p>
        </div>
        <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${healthColor}`}>
          {total} ootel · {health}
        </span>
      </div>

      {/* bucket-koondriba */}
      <div className="flex gap-3 mb-6 text-sm">
        <span className="text-amber-800">🆕 uus tüüp: <strong>{bucketCount("new_l3")}</strong></span>
        <span className="text-sky-800">❓ madal kindlus: <strong>{bucketCount("review")}</strong></span>
        <span className="text-red-700">⚠️ kodutu: <strong>{bucketCount("quarantine")}</strong></span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6 text-sm text-red-700">
          <strong>Ei saanud review-bucketit lugeda:</strong> {error}
          <p className="mt-2 text-xs">Kontrolli MEDUSA_ADMIN_EMAIL/PASSWORD + backend'i ühendust.</p>
        </div>
      )}

      {data && !data.table_exists && !error && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-8 text-center text-slate-600">
          Klassifikaator pole veel <code className="bg-slate-200 px-1 rounded">--execute</code> jooksnud —
          tabel <code>classification_review</code> tekib esimesel live-jooksul. Seni 0 ootel.
        </div>
      )}

      {data?.table_exists && clusters.length === 0 && !error && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-8 text-center text-emerald-700">
          0 klastrit ootel. Kõik kodutud on paigutatud või ülevaadatud.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {clusters.map((c, i) => {
          const meta = BUCKET_META[c.bucket] ?? BUCKET_META.quarantine
          return (
            <div key={`${c.bucket}-${c.label}-${i}`} className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border mb-1.5 ${meta.badge}`}
                  >
                    {meta.icon} {meta.label}
                  </span>
                  <h3 className="font-semibold text-[#1a1a2e] leading-tight">{c.label}</h3>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-[#0b7d79]">{c.n}</div>
                  <div className="text-xs text-[#64748B]">toodet</div>
                </div>
              </div>

              <p className="text-xs text-[#64748B] mb-3">{meta.hint}</p>

              <dl className="text-xs space-y-1 mb-3">
                <div className="flex gap-2">
                  <dt className="text-[#94A3B8] w-24 shrink-0">Lähim L3 (DUP)</dt>
                  <dd className="font-mono text-[#475569] break-all" title={c.nearest_l3 || ""}>
                    {humanHandle(c.nearest_l3)}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-[#94A3B8] w-24 shrink-0">Sobiks L2 alla</dt>
                  <dd className="font-mono text-[#475569] break-all" title={c.suggest_l2 || ""}>
                    {humanHandle(c.suggest_l2)}
                  </dd>
                </div>
                {c.avg_conf != null && (
                  <div className="flex gap-2">
                    <dt className="text-[#94A3B8] w-24 shrink-0">Keskm. kindlus</dt>
                    <dd className="text-[#475569]">{(c.avg_conf * 100).toFixed(0)}%</dd>
                  </div>
                )}
              </dl>

              <details className="text-xs">
                <summary className="cursor-pointer text-[#0b7d79] hover:underline">
                  Näidistooted ({c.samples.length})
                </summary>
                <ul className="mt-2 space-y-1 text-[#64748B]">
                  {c.samples.map((s, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="font-mono text-[#94A3B8] shrink-0">{c.skus[j] || "—"}</span>
                      <span className="truncate" title={s}>{s}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-[#94A3B8] mt-6">
        Read-only ülevaade. Tegevused (loo L3 / kinnita paigutus) = järgmine faas. Vana resolver-v2 järjekord
        (Meili <code>needs-review-bucket</code>) on asendumas selle pipeline-bucketiga.
      </p>
    </div>
  )
}
