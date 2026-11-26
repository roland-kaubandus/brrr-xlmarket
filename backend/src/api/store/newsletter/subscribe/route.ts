import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createPendingConsent } from "../../../../modules/newsletter/db"
import {
  isValidEmail,
  normalizeIp,
  isHoneypotFilled,
  SlidingWindowRateLimiter,
} from "../../../../modules/newsletter/logic"
import { sendNewsletterConfirmation } from "../../../../lib/email"

// JALUS double opt-in (GO #2). Erineb kassast (consent, single opt-in): siin EI usaldata, et aadress
// on tõesti külastaja oma → loome PENDING rea + saadame kinnituskirja; alles lingi-klõps kinnitab.
//
// Kaitsed (HARD RULE #6 — turvaline vaikeväärtus):
//   1) Kogumis-lipp vaikimisi OFF (NEWSLETTER_COLLECTION_ENABLED) → 403, sama mis consent.
//   2) Honeypot: peidetud väli täidetud → bot → VAIKNE 200 no-op (ei viga, ei DB-kirjet, ei kirja).
//   3) Rate-limit per-IP → üle limiidi 429 (ei lase botil pending-ridu + kirju vorpida).
//   4) Vastus EI leki, kas aadress on juba olemas: alati sama geneeriline 200 (olgo pending/confirmed).

function collectionEnabled(): boolean {
  return process.env.NEWSLETTER_COLLECTION_ENABLED === "true"
}

// Per-IP: max 5 tellimust 10 min akna kohta (inimene vajab ühte; bot proovib palju).
// Modulitasandil (üks instants protsessi kohta) — vt SlidingWindowRateLimiter kommentaari.
const limiter = new SlidingWindowRateLimiter(5, 10 * 60 * 1000)

// Storefront AVALIK baas-URL kinnituslingile. STORE_URL = avalik (nt https://staging.xlmarket.ee);
// MITTE STOREFRONT_URL (see on sisevõrgu http://storefront:3030, ei kõlba kirja-lingiks).
function storefrontBase(): string {
  return (process.env.STORE_URL || "https://xlmarket.ee").trim().replace(/\/+$/, "")
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!collectionEnabled()) {
    res.status(403).json({ ok: false, error: "newsletter collection disabled" })
    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>

  // 2) Honeypot — bot täitis peidetud välja → teeskle edu, ÄRA tee midagi (HARD RULE #6).
  if (isHoneypotFilled(body.website)) {
    console.log("[newsletter] subscribe honeypot vallandus → vaikne no-op (bot)")
    res.status(200).json({ ok: true })
    return
  }

  const email = body.email
  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, error: "valid email required" })
    return
  }
  const locale = typeof body.locale === "string" ? body.locale : "et"

  const xff = (req.headers["x-forwarded-for"] as string | undefined) ?? null
  const directIp = req.ip ?? (req.socket && req.socket.remoteAddress) ?? null
  const ua = (req.headers["user-agent"] as string | undefined) ?? null

  // 3) Rate-limit per-IP (normaliseeritud XFF esimene aadress; puudu → "unknown" ühine ämber).
  const ipKey = normalizeIp(xff, directIp) || "unknown"
  if (!limiter.check(ipKey)) {
    console.log(`[newsletter] subscribe rate-limit ületatud ip=${ipKey}`)
    res.status(429).json({ ok: false, error: "too many requests" })
    return
  }

  try {
    const row = await createPendingConsent({ email, locale, xff, ip: directIp, userAgent: ua })

    // Kinnituskiri AINULT kui on kinnitamata (confirm_token olemas). Juba-confirmed rida hoiab
    // confirm_token = NULL → ei saada uut kirja (juba tellitud). Vastus jääb geneeriliseks (ei leki).
    if (row.confirm_token) {
      const confirmUrl = `${storefrontBase()}/${encodeURIComponent(
        row.locale
      )}/uudiskiri/kinnita?token=${encodeURIComponent(row.confirm_token)}`
      try {
        await sendNewsletterConfirmation(row.email, row.locale, confirmUrl)
      } catch (e) {
        // Kiri kukkus → logi (fail-loud), AGA vastus jääb 200: pending rida on olemas,
        // klient saab uuesti proovida (idempotentne). Ära leki viga vormile.
        console.error("[newsletter] kinnituskirja saatmine ebaõnnestus:", e)
      }
    }

    // 4) Alati sama geneeriline vastus (ei paljasta, kas aadress oli juba olemas/kinnitatud).
    res.status(200).json({ ok: true })
  } catch (e) {
    console.error("[newsletter] subscribe (createPendingConsent) ebaõnnestus:", e)
    res.status(500).json({ ok: false, error: "subscribe failed" })
  }
}
