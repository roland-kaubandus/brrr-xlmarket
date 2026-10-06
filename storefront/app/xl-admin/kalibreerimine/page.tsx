/**
 * Kalibreerimine — AUTO-JUDGE pime-hindamise leht (plaan §5).
 *
 * Tarmo hindab dry-run valimi (100 sünonüümi + 40 klassifikaatorit) PIMESI — kohtuniku
 * vastust ei näe enne, kui kõik on hinnatud. Siis paljastub võrdlustabel + veamäärad +
 * lävend-verdikt (sünonüüm VALE-OK ≤5% · klassifikaator VALE-assign ≤2,5%).
 *
 * Valim tuleb: node scripts/auto-judge-run.mjs --kind <k> --dry --json storefront/public/xl-admin/calib-<k>.json
 * (dry-run EI kirjuta DB-sse — kalibreerimine on värav ENNE kui kohtunik päriselt otsustab.)
 */

import CalibrationClient from "./CalibrationClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function CalibrationPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Auto-judge kalibreerimine</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Hinda iga kirje <strong>pimesi</strong> (kohtuniku otsus peidetud). Kui kõik hinnatud → võrdlustabel +
          veamäärad. Lävend: sünonüüm VALE-OK ≤5% · klassifikaator VALE-assign ≤2,5%. Üle läve → kohtunik jääb
          dry-run režiimi, prompti parandatakse.
        </p>
      </div>
      <CalibrationClient />
    </div>
  )
}
