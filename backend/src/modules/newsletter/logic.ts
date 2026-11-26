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

// Honeypot: peidetud vorm-väli, mille näeb AINULT bot (CSS-peidetud, tab-index -1). Inimene jätab
// tühjaks, bot täidab automaatselt. Täidetud → bot. HARD RULE #6: bot → vaikne no-op, MITTE viga.
export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0
}

// Lihtne mälusisene libisev-akna rate-limiter (per-võti, nt per-IP). Deterministlik:
// `now` on injekteeritav (test). ESIMENE kaitse jaluse-vormile (koos honeypot'iga) — üks protsess,
// MITTE klaster-jagatud; tõsisem/hajus kaitse = edge/CDN. Mälu puhastub laisalt (ei kasva lõputult).
export class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>()
  private readonly max: number
  private readonly windowMs: number
  constructor(max: number, windowMs: number) {
    this.max = max
    this.windowMs = windowMs
  }
  // true = LUBATUD (alla limiidi akna sees), false = üle limiidi (blokeeri).
  check(key: string, now: number = Date.now()): boolean {
    const k = String(key || "")
    const cutoff = now - this.windowMs
    const arr = (this.hits.get(k) || []).filter((t) => t > cutoff)
    if (arr.length >= this.max) {
      this.hits.set(k, arr)
      return false
    }
    arr.push(now)
    this.hits.set(k, arr)
    // Laisk puhastus: map liiga suur → viska minema aknast väljunud võtmed.
    if (this.hits.size > 5000) {
      for (const [kk, v] of this.hits) {
        if (v.every((t) => t <= cutoff)) this.hits.delete(kk)
      }
    }
    return true
  }
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
