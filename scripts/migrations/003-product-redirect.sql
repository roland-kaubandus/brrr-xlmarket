-- Migration 003: product_redirect
-- LÜNK 1b / otsus 4: kui feed_status='archived' toode on kadunud >365p (korduv-churn'ita),
-- archive-removal-proposals.mjs --execute SOFT-kustutab (product.deleted_at=now()) JA salvestab
-- siia 301-suunamise vanemasse kategooriasse (SEO säilib, /toode/{handle} → /kategooriad/{cat},
-- MITTE 404). Pööratav: rida kustutades + product.deleted_at=NULL taastad.
--
-- Miks eraldi tabel (mitte slug_redirect): slug_redirect.reason CHECK piirab
-- ('rename'|'merge'|'deprecate'|'legacy') + tema from_slug = KATEGOORIA-handle, middleware
-- rakendab teda AINULT /kategooriad/ + /haru/ segmentidele. Toote-suunamine on eri nimeruum
-- (from_handle = toote-handle, to = kategooria-handle) → eraldi tabel hoiab mõlemad puhtana.
-- Idempotentne.

BEGIN;

CREATE TABLE IF NOT EXISTS product_redirect (
  from_handle          TEXT PRIMARY KEY,      -- kustutatud toote handle (/toode/{from_handle})
  to_category_handle   TEXT NOT NULL,         -- suuna siia (/kategooriad/{to_category_handle})
  reason               TEXT NOT NULL DEFAULT 'removed-365p',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_redirect_to ON product_redirect(to_category_handle);

COMMIT;
