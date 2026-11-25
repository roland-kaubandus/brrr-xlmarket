import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { unsubscribeByToken } from "../../../../modules/newsletter/db"

// Loobumine on token-põhine (token = autentimine) ja TÖÖTAB ALATI — ka siis kui kogumis-lipp maas.
// Kunagi antud nõusolekust peab saama loobuda sõltumata lipu seisust (GDPR).
function readToken(req: MedusaRequest): string {
  const q = (req.query as Record<string, string | undefined>).token
  if (typeof q === "string" && q) return q
  const b = (req.body as { token?: unknown } | undefined)?.token
  return typeof b === "string" ? b : ""
}

// POST /store/newsletter/unsubscribe  (RFC 8058 üks-kliki + storefront-proxy)
// GET  /store/newsletter/unsubscribe?token=...  (lihtne proxy-kutse storefront-lehelt)
async function handle(req: MedusaRequest, res: MedusaResponse) {
  const token = readToken(req)
  if (!token) {
    res.status(400).json({ ok: false, error: "token required" })
    return
  }
  try {
    const row = await unsubscribeByToken(token)
    if (!row) {
      res.status(404).json({ ok: false, error: "unknown token" })
      return
    }
    res.status(200).json({ ok: true, status: row.status, locale: row.locale })
  } catch (e) {
    console.error("[newsletter] unsubscribe ebaõnnestus:", e)
    res.status(500).json({ ok: false, error: "unsubscribe failed" })
  }
}

export const POST = handle
export const GET = handle
