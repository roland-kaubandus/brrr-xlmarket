import { Client } from "pg"
import {
  CONSENT_TEXT_VERSION,
  normalizeEmail,
  normalizeLocale,
  normalizeIp,
  normalizeUa,
  genToken,
  genId,
} from "./logic"

// Iseseisev pg-klient (sama DATABASE_URL SSoT mis cms/db.ts). Tahtlikult EI impordi cms/db'st,
// et moodul oleks sõltumatu + strip-types-testitav. Vt cms/db.ts kommentaari DATABASE_URL kohta.
export function makePgClient(): Client {
  if (process.env.DATABASE_URL) {
    return new Client({ connectionString: process.env.DATABASE_URL })
  }
  return new Client({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT) || 5435,
    user: process.env.PGUSER || "xlmarket",
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || "xlmarket",
  })
}

export interface NewsletterConsent {
  id: string
  email: string
  locale: string
  source: string
  status: string
  consent_text_version: string
  consent_ip: string | null
  consent_user_agent: string | null
  customer_id: string | null
  confirm_token: string | null
  unsubscribe_token: string
  created_at: string
  confirmed_at: string | null
  unsubscribed_at: string | null
  updated_at: string
}

// Valikuline injekteeritud klient (transaktsioon-test). Puudumisel avab/sulgeb oma kliendi.
async function withClient<T>(
  client: Client | undefined,
  fn: (c: Client) => Promise<T>
): Promise<T> {
  if (client) return fn(client)
  const c = makePgClient()
  await c.connect()
  try {
    return await fn(c)
  } finally {
    await c.end()
  }
}

export interface CheckoutConsentInput {
  email: string
  locale?: string
  customerId?: string | null
  xff?: string | null // x-forwarded-for päis
  ip?: string | null // otse-IP fallback
  userAgent?: string | null
}

// KASSA nõusolek: single opt-in — KOHE confirmed (selgesõnaline linnuke kassas = nõusolek).
// Idempotentne email-il (lower): kui rida olemas → uuendab (re-subscribe tühistab varasema
// unsubscribe'i, uuendab versiooni/IP/UA/locale). Säilitab loomise-aja + unsubscribe_token'i.
export async function recordCheckoutConsent(
  input: CheckoutConsentInput,
  client?: Client
): Promise<NewsletterConsent> {
  const email = normalizeEmail(input.email)
  const locale = normalizeLocale(input.locale)
  const ip = normalizeIp(input.xff ?? undefined, input.ip ?? undefined)
  const ua = normalizeUa(input.userAgent ?? undefined)
  const customerId = input.customerId ? String(input.customerId).slice(0, 200) : null

  return withClient(client, async (c) => {
    const r = await c.query<NewsletterConsent>(
      `INSERT INTO newsletter_consent
         (id, email, locale, source, status, consent_text_version,
          consent_ip, consent_user_agent, customer_id, unsubscribe_token, confirmed_at)
       VALUES ($1, $2, $3, 'checkout', 'confirmed', $4, $5, $6, $7, $8, now())
       ON CONFLICT (lower(email)) DO UPDATE SET
         status = 'confirmed',
         source = 'checkout',
         locale = EXCLUDED.locale,
         consent_text_version = EXCLUDED.consent_text_version,
         consent_ip = COALESCE(EXCLUDED.consent_ip, newsletter_consent.consent_ip),
         consent_user_agent = COALESCE(EXCLUDED.consent_user_agent, newsletter_consent.consent_user_agent),
         customer_id = COALESCE(EXCLUDED.customer_id, newsletter_consent.customer_id),
         confirmed_at = COALESCE(newsletter_consent.confirmed_at, now()),
         unsubscribed_at = NULL,
         updated_at = now()
       RETURNING *`,
      [genId(), email, locale, CONSENT_TEXT_VERSION, ip, ua, customerId, genToken()]
    )
    return r.rows[0]
  })
}

// JALUS double opt-in: loob/uuendab PENDING rea + confirm_token'i (kinnituskiri saadetakse eraldi).
// Idempotentne: korduv subscribe uuendab tokenit + versiooni, EI loo duplikaati.
export async function createPendingConsent(
  input: { email: string; locale?: string; xff?: string | null; ip?: string | null; userAgent?: string | null },
  client?: Client
): Promise<NewsletterConsent> {
  const email = normalizeEmail(input.email)
  const locale = normalizeLocale(input.locale)
  const ip = normalizeIp(input.xff ?? undefined, input.ip ?? undefined)
  const ua = normalizeUa(input.userAgent ?? undefined)

  return withClient(client, async (c) => {
    const r = await c.query<NewsletterConsent>(
      `INSERT INTO newsletter_consent
         (id, email, locale, source, status, consent_text_version,
          consent_ip, consent_user_agent, confirm_token, unsubscribe_token)
       VALUES ($1, $2, $3, 'footer', 'pending', $4, $5, $6, $7, $8)
       ON CONFLICT (lower(email)) DO UPDATE SET
         locale = EXCLUDED.locale,
         consent_text_version = EXCLUDED.consent_text_version,
         consent_ip = COALESCE(EXCLUDED.consent_ip, newsletter_consent.consent_ip),
         consent_user_agent = COALESCE(EXCLUDED.consent_user_agent, newsletter_consent.consent_user_agent),
         -- juba kinnitatu jääb kinnitatuks; ainult pending/unsubscribed saab uue confirm-tokeni
         confirm_token = CASE WHEN newsletter_consent.status = 'confirmed'
                              THEN newsletter_consent.confirm_token
                              ELSE EXCLUDED.confirm_token END,
         updated_at = now()
       RETURNING *`,
      [genId(), email, locale, CONSENT_TEXT_VERSION, ip, ua, genToken(), genToken()]
    )
    return r.rows[0]
  })
}

// Double opt-in kinnitus: pending → confirmed (confirm_token'i järgi). Idempotentne, tagastab rea või null.
export async function confirmByToken(token: string, client?: Client): Promise<NewsletterConsent | null> {
  const t = String(token || "")
  if (!t) return null
  return withClient(client, async (c) => {
    const r = await c.query<NewsletterConsent>(
      `UPDATE newsletter_consent
         SET status = 'confirmed',
             confirmed_at = COALESCE(confirmed_at, now()),
             unsubscribed_at = NULL,
             confirm_token = NULL,
             updated_at = now()
       WHERE confirm_token = $1
       RETURNING *`,
      [t]
    )
    return r.rows[0] ?? null
  })
}

// Ühe-kliki loobumine: → unsubscribed (unsubscribe_token'i järgi). Idempotentne, tagastab rea või null.
export async function unsubscribeByToken(token: string, client?: Client): Promise<NewsletterConsent | null> {
  const t = String(token || "")
  if (!t) return null
  return withClient(client, async (c) => {
    const r = await c.query<NewsletterConsent>(
      `UPDATE newsletter_consent
         SET status = 'unsubscribed',
             unsubscribed_at = COALESCE(unsubscribed_at, now()),
             updated_at = now()
       WHERE unsubscribe_token = $1
       RETURNING *`,
      [t]
    )
    return r.rows[0] ?? null
  })
}

export async function findByEmail(email: string, client?: Client): Promise<NewsletterConsent | null> {
  const e = normalizeEmail(email)
  return withClient(client, async (c) => {
    const r = await c.query<NewsletterConsent>(
      `SELECT * FROM newsletter_consent WHERE lower(email) = $1`,
      [e]
    )
    return r.rows[0] ?? null
  })
}
