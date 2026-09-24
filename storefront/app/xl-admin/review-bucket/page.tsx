/**
 * Review-bucket — klassifikaatori KLASTRI-ülevaatus + otsused (SAMM 2c).
 *
 * Loeb backend `/admin/review-bucket` (classification_review, status='pending')
 * KONTSEPTI-klastritena. DUP-värav: sama kontsept mitmes ämbris/kodus → ÜKS plokk,
 * sunnib valima ÜHE sihtkoha enne loomist (HARD RULE meetodi jõustus UI-s).
 *
 * PROPOSE-NOT-CREATE: midagi ei liigu ega looda ilma inimese klõpsuta. `create_l3`
 * ei lisa kategooriat live-puusse — salvestab kinnitatud L3-loomise (struktuuri-build
 * teeb tegeliku loomise + SSoT-regen + 4-sammu deploy). Otsused on tagasivõetavad.
 */

import { medusaAdminFetch } from "@/lib/medusa-admin"
import ReviewBucketClient, { type ReviewBucketData } from "./ReviewBucketClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ReviewBucketPage() {
  let data: ReviewBucketData | null = null
  let error: string | null = null
  try {
    data = await medusaAdminFetch<ReviewBucketData>("/admin/review-bucket", { cache: "no-store" })
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Review-bucket — klassifikaator</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Kodutud feed-tooted, mille öine klassifikaator jättis inimotsuseks (propose-not-create).
          Klastrite kaupa · DUP-värav sunnib ühe kodu · otsused tagasivõetavad.
        </p>
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
          tabel <code>classification_review</code> tekib esimesel live-jooksul.
        </div>
      )}

      {data?.table_exists && <ReviewBucketClient data={data} />}
    </div>
  )
}
