import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { recordCheckoutConsent } from "../../../../modules/newsletter/db"
import { isValidEmail } from "../../../../modules/newsletter/logic"

// Kogumise-lipp (vaikimisi OFF). Enne poliitika heakskiitu push EI aktiveeri kogumist.
function collectionEnabled(): boolean {
  return process.env.NEWSLETTER_COLLECTION_ENABLED === "true"
}

// POST /store/newsletter/consent — KASSA single opt-in (kohe confirmed).
// Body: { email, locale?, customer_id? }. IP/UA võetakse päistest (GDPR-tõend).
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!collectionEnabled()) {
    // Lipp maas: ei kogu. Ei ole viga kliendile — vaikne no-op (403 = selge logi).
    res.status(403).json({ error: "newsletter collection disabled" })
    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const email = body.email
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "valid email required" })
    return
  }
  const locale = typeof body.locale === "string" ? body.locale : "et"
  const customerId = typeof body.customer_id === "string" ? body.customer_id : null

  const xff = (req.headers["x-forwarded-for"] as string | undefined) ?? null
  const ip = req.ip ?? (req.socket && req.socket.remoteAddress) ?? null
  const ua = (req.headers["user-agent"] as string | undefined) ?? null

  try {
    const row = await recordCheckoutConsent({ email, locale, customerId, xff, ip, userAgent: ua })
    res.status(200).json({ status: row.status, source: row.source })
  } catch (e) {
    console.error("[newsletter] consent kirjutamine ebaõnnestus:", e)
    res.status(500).json({ error: "consent write failed" })
  }
}
