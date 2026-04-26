-- Migration 006: CMS multi-locale support
-- Spec: /home/brrr/.claude/plans/hei-homsest-hakkavad-natuke-binary-lobster.md §6
-- Adds `locale` column to cms_page and cms_page_revision so the same page_key
-- can have multiple translations (en, et, es, ...). EN rows keep PRIMARY KEY id
-- equal to page_key; non-EN rows get id = "<page_key>-<locale>".
--
-- Idempotent. Safe to re-run.

BEGIN;

-- 1. Add locale column with EN default (matches existing rows)
ALTER TABLE cms_page
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en';

ALTER TABLE cms_page_revision
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en';

-- 2. Replace single-key unique with composite (page_key, locale)
ALTER TABLE cms_page
  DROP CONSTRAINT IF EXISTS cms_page_page_key_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cms_page_page_key_locale_key'
      AND conrelid = 'cms_page'::regclass
  ) THEN
    ALTER TABLE cms_page
      ADD CONSTRAINT cms_page_page_key_locale_key UNIQUE (page_key, locale);
  END IF;
END $$;

-- 3. Index revision lookups by (page_id, locale)
CREATE INDEX IF NOT EXISTS cms_page_revision_page_locale_idx
  ON cms_page_revision (page_id, locale, created_at DESC);

COMMIT;
