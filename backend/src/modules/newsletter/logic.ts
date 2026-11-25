// Uudiskirja-nõusolekute PUHAS loogika (DB-vaba, deterministlik) — SSoT.
// .ts: medusa build kompileerib normaalselt; testitav otse `node` type-stripping'uga
// (scripts/newsletter-logic.test.mjs impordib logic.ts). Vt [[uudiskiri-nousolek-plaan]].

import crypto from "node:crypto"

// Nõusoleku-teksti versioon — GDPR-tõend: MIS tekstiga klient nõustus.
// ⚠️ TÕSTA, kui privaatsuspoliitika otseturunduse punkt MATERIAALSELT muutub
// (uus versioon = uued nõusolekud viitavad uuele tekstile; vanad jäävad oma versioonile).
export const CONSENT_TEXT_VERSION = "2026-11-25"

// Lubatud allikad (SSoT).
export const CONSENT_SOURCES = ["footer", "checkout", "account"] as const
// Lubatud staatused.
export const CONSENT_STATUSES = ["pending", "confirmed", "unsubscribed"] as const

// E-posti normaliseerimine SSoT-kujule: trim + lowercase. Unikaalsus-võti DB-s on lower(email).
export function normalizeEmail(email: unknown): string {
  return String(email == null ? "" : email).trim().toLowerCase()
}

// Email-valideerimine — sama muster mis storefront/lib/validation.ts (SSoT-kooskõla).
export function isValidEmail(email: unknown): email is string {
  const e = typeof email === "string" ? email : ""
  return e.length > 0 && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

// Locale normaliseerimine (ainult 2-täheline; vaikimisi et). Kaitseb prügi eest.
export function normalizeLocale(locale: unknown): string {
  const l = String(locale == null ? "" : locale).trim().toLowerCase()
  return /^[a-z]{2}$/.test(l) ? l : "et"
}

// URL-ohutu juhu-token (loobumine / double opt-in kinnitus). 32 baiti = ~43 märki base64url.
export function genToken(): string {
  return crypto.randomBytes(32).toString("base64url")
}

// ID (reale). Eraldi tokenitest — pgcrypto pole garanteeritud, genereerime JS-is.
export function genId(): string {
  return "nlc_" + crypto.randomBytes(16).toString("hex")
}

// IP normaliseerimine x-forwarded-for päisest: esimene aadress (klient), trim, pikkuse-cap.
export function normalizeIp(xff?: string | null, fallback?: string | null): string | null {
  const raw = (xff || fallback || "").toString()
  const first = raw.split(",")[0].trim()
  return first.slice(0, 64) || null
}

// User-Agent cap (ei salvesta lõputut stringi).
export function normalizeUa(ua?: string | null): string | null {
  const s = (ua || "").toString().trim()
  return s ? s.slice(0, 512) : null
}

// RFC 2369 + RFC 8058 List-Unsubscribe päised. Kasutatakse turunduskirjades (kui/kui neid saadetakse).
// unsubUrl = üks-kliki HTTPS-link (POST One-Click); mailtoAddr = valikuline mailto-fallback.
export function buildListUnsubscribeHeaders(
  unsubUrl?: string | null,
  mailtoAddr?: string | null
): Record<string, string> {
  if (!unsubUrl) return {}
  const parts: string[] = []
  if (mailtoAddr) parts.push(`<mailto:${mailtoAddr}?subject=unsubscribe>`)
  parts.push(`<${unsubUrl}>`)
  return {
    "List-Unsubscribe": parts.join(", "),
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  }
}
