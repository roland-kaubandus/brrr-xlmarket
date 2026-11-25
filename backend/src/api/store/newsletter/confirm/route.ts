import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { confirmByToken } from "../../../../modules/newsletter/db"

// Double opt-in kinnitus (JALUS-vorm, #2). Token-põhine (kinnituskirja link → storefront → proxy).
// Töötab sõltumata kogumis-lipust (pending rida on juba olemas; kinnitus viib lõpule).
function readToken(req: MedusaRequest): string {
  const q = (req.query as Record<string, string | undefined>).token
  if (typeof q === "string" && q) return q
  const b = (req.body as { token?: unknown } | undefined)?.token
  return typeof b === "string" ? b : ""
}

async function handle(req: MedusaRequest, res: MedusaResponse) {
  const token = readToken(req)
  if (!token) {
    res.status(400).json({ ok: false, error: "token required" })
    return
  }
  try {
    const row = await confirmByToken(token)
    if (!row) {
      res.status(404).json({ ok: false, error: "unknown or used token" })
      return
    }
    res.status(200).json({ ok: true, status: row.status, locale: row.locale })
  } catch (e) {
    console.error("[newsletter] confirm ebaõnnestus:", e)
    res.status(500).json({ ok: false, error: "confirm failed" })
  }
}

export const POST = handle
export const GET = handle
