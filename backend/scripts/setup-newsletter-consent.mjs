#!/usr/bin/env node
/**
 * setup-newsletter-consent.mjs — loob `newsletter_consent` tabeli (nõusolekute SSoT).
 * IDEMPOTENT: CREATE ... IF NOT EXISTS, võib ohutult korrata. EI kustuta ega muuda andmeid.
 *
 * Kasutus (konteineris, kus DATABASE_URL on olemas):
 *   docker exec <medusa|storefront-k33g> node scripts/setup-newsletter-consent.mjs
 * või hostist:
 *   DATABASE_URL=postgres://... node backend/scripts/setup-newsletter-consent.mjs
 *
 * id/tokenid genereeritakse JS-is (crypto) — pgcrypto/gen_random_uuid pole garanteeritud.
 * GDPR: tõendatav nõusolek = email + consent_text_version + created_at/confirmed_at + source + IP/UA.
 */
import pg from "pg"

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error("🔴 DATABASE_URL puudub.")
  process.exit(1)
}

const DDL = `
CREATE TABLE IF NOT EXISTS newsletter_consent (
  id                   text        PRIMARY KEY,
  email                text        NOT NULL,
  locale               text        NOT NULL DEFAULT 'et',
  source               text        NOT NULL,          -- footer | checkout | account
  status               text        NOT NULL DEFAULT 'pending', -- pending | confirmed | unsubscribed
  consent_text_version text        NOT NULL,
  consent_ip           text,
  consent_user_agent   text,
  customer_id          text,
  confirm_token        text,
  unsubscribe_token    text        NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  confirmed_at         timestamptz,
  unsubscribed_at      timestamptz,
  updated_at           timestamptz NOT NULL DEFAULT now()
);
-- Üks rida e-posti kohta (case-insensitive). Vajalik ON CONFLICT (lower(email)) jaoks.
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_consent_email_lower_uq
  ON newsletter_consent (lower(email));
CREATE INDEX IF NOT EXISTS newsletter_consent_confirm_token_ix
  ON newsletter_consent (confirm_token) WHERE confirm_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_consent_unsub_token_uq
  ON newsletter_consent (unsubscribe_token);
CREATE INDEX IF NOT EXISTS newsletter_consent_status_ix
  ON newsletter_consent (status);
`

const c = new pg.Client({ connectionString: DB_URL })
await c.connect()
try {
  await c.query(DDL)
  const r = await c.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'newsletter_consent' ORDER BY ordinal_position`
  )
  console.log("✅ newsletter_consent valmis. Veerud:", r.rows.map((x) => x.column_name).join(", "))
  const idx = await c.query(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'newsletter_consent' ORDER BY indexname`
  )
  console.log("   Indeksid:", idx.rows.map((x) => x.indexname).join(", "))
} finally {
  await c.end()
}
