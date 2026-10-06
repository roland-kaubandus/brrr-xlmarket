-- Migration 009: review_decision_log — TEGELIK tegija + kanal (intsidendi-järel, 2026-10-06).
-- Kasutab: backend/src/api/admin/review-bucket/route.ts (INSERT + undo),
--          storefront/app/api/admin/review-bucket/route.ts (edastab session.email + kanal 'ui').
--
-- MIKS: senine `actor` veerg = AINULT Medusa auth actor_id, mis storefront-proxy kaudu
-- on ALATI teenuskonto (xl-admin-service). See EI erista tegelikku algatajat ega kanalit.
-- 2026-10-06 intsidendi-uurimine: 8 otsust logiti teenuskonto nime alla, kuigi tegelik
-- tegija oli inimene UI-testiklõpsudes — logist ei saanud seda tuvastada.
--
--   actor_detail = tegelik tegija: sisselogitud xl-admin e-post | 'auto-judge' | skripti nimi
--   channel      = 'ui' (proxy, sisselogitud brauser) | 'api' (otse backend) | 'pipeline' (öine cron)
--
-- Vanad read (enne parandust): actor_detail = 'unknown (enne parandust)', channel = 'unknown'.
-- Idempotentne (IF NOT EXISTS) — ohutu korduvjooksuks. Prod saab cutoveril automaatselt.

BEGIN;

ALTER TABLE review_decision_log ADD COLUMN IF NOT EXISTS actor_detail text;
ALTER TABLE review_decision_log ADD COLUMN IF NOT EXISTS channel      text;

-- Backfill: olemasolevad read ausalt "enne parandust" (ei teeskle, et teame tegijat).
UPDATE review_decision_log
   SET actor_detail = 'unknown (enne parandust)'
 WHERE actor_detail IS NULL;
UPDATE review_decision_log
   SET channel = 'unknown'
 WHERE channel IS NULL;

COMMIT;
