/**
 * Categorization Queue — spec F3.5
 *
 * Lists products that are in needs-review-bucket (resolver v2 could not
 * confidently assign). Data comes from Meili (category_handles contains
 * "needs-review-bucket" token).
 *
 * For each product, shows:
 *   - product title + VEVOR SKU
 *   - raw VEVOR product type path (feed string)
 *   - resolver hint (why did it end up here)
 *
 * Spec: action buttons ("approve", "create rule") are implemented in a
 * later faas — this page is read-only for now, so a human can eyeball the
 * queue size and drain via the `scripts/drain-review-queue.mjs` batch job.
 */

import Link from "next/link"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface MeiliHit {
  id: string
  handle: string
  title?: string
  title_en?: string
  category_handles?: string[]
  vevor_sku?: string
  vevor_product_type?: string
}

async function fetchQueue(): Promise<{ hits: MeiliHit[]; total: number }> {
  const host = process.env.MEILI_INTERNAL_URL || "http://127.0.0.1:7700"
  const key = process.env.MEILI_ADMIN_KEY || process.env.MEILISEARCH_ADMIN_KEY
  if (!key) {
    throw new Error("MEILI_ADMIN_KEY not configured — cannot read queue")
  }

  const res = await fetch(`${host}/indexes/products/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      q: "",
      filter: 'category_handles = "needs-review-bucket"',
      limit: 200,
      attributesToRetrieve: [
        "id",
        "handle",
        "title",
        "title_en",
        "category_handles",
        "vevor_sku",
        "vevor_product_type",
      ],
    }),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Meili query failed: ${res.status}`)
  }
  const data = (await res.json()) as { hits: MeiliHit[]; estimatedTotalHits: number }
  return { hits: data.hits || [], total: data.estimatedTotalHits || 0 }
}

export default async function CategorizationQueuePage() {
  let hits: MeiliHit[] = []
  let total = 0
  let error: string | null = null
  try {
    const res = await fetchQueue()
    hits = res.hits
    total = res.total
  } catch (err: any) {
    error = err.message || String(err)
  }

  const healthLabel = total < 100 ? "healthy" : total < 500 ? "attention" : total < 2000 ? "backlog" : "alert"
  const healthColor =
    healthLabel === "healthy"
      ? "bg-emerald-100 text-emerald-700"
      : healthLabel === "attention"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Categorization Queue</h1>
          <p className="text-sm text-[#64748B] mt-1">Products flagged by resolver v2 as needing review.</p>
        </div>
        <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${healthColor}`}>
          {total} / 500 {healthLabel}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6 text-sm text-red-700">
          <strong>Cannot read queue:</strong> {error}
          <p className="mt-2 text-xs">Check MEILI_ADMIN_KEY env var and Meili service status.</p>
        </div>
      )}

      <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 mb-6">
        <p className="text-sm mb-2">
          <strong>Drain command</strong> (runs classify pipeline with updated rules):
        </p>
        <pre className="bg-[#1a1a2e] text-[#E2E8F0] p-3 rounded text-xs overflow-x-auto">
          node scripts/drain-review-queue.mjs --limit=100
        </pre>
      </div>

      {hits.length === 0 && !error ? (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-8 text-center text-emerald-700">
          Queue is empty. All products classified with confidence.
        </div>
      ) : (
        <table className="w-full text-sm bg-white rounded-lg shadow-sm overflow-hidden">
          <thead>
            <tr className="bg-[#F1F5F9] text-[#64748B] text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-left px-4 py-3 w-40">VEVOR SKU</th>
              <th className="text-left px-4 py-3">VEVOR path</th>
            </tr>
          </thead>
          <tbody>
            {hits.map((h) => (
              <tr key={h.id} className="border-t border-[#E2E8F0]">
                <td className="px-4 py-3">
                  <Link
                    href={`/et/toode/${h.handle}`}
                    className="text-[#0ea5a0] hover:underline font-medium"
                    target="_blank"
                  >
                    {h.title_en || h.title || h.handle}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{h.vevor_sku || "—"}</td>
                <td className="px-4 py-3 text-xs text-[#64748B]">{h.vevor_product_type || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
