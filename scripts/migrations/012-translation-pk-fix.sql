-- Migration 012 — taasta taxonomy_node_translation puuduv komposiit-PK (node_id, locale).
-- Konteksti: migration 001 DEKLAREERIS `PRIMARY KEY (node_id, locale)`, AGA see ei rakendunud
-- k33g staging-DB-s (tabel eksisteerib ainult CHECK-constraint'iga, ilma PK/unique indeksita).
-- Tagajärg: ON CONFLICT (node_id, locale) UPSERT kukub ("no unique or exclusion constraint").
-- EN-pakett backfill (taxonomy_node_translation locale='en' UPSERT) vajab seda.
-- Ohutu: kontrollitud 0 duplikaati (node_id, locale) enne lisamist.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'taxonomy_node_translation'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE taxonomy_node_translation
      ADD CONSTRAINT taxonomy_node_translation_pkey PRIMARY KEY (node_id, locale);
  END IF;
END $$;

COMMIT;
