-- Migration 001: taxonomy_node_meta + taxonomy_node_translation
-- Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §3.2
-- Idempotent. Run: docker exec -i xlmarket-db psql -U xlmarket xlmarket < scripts/migrations/001-taxonomy-node-meta.sql
-- Rollback: DROP TABLE taxonomy_node_meta, taxonomy_node_translation CASCADE;

BEGIN;

-- Per-node taxonomy metadata (shadows product_category).
-- We do NOT duplicate handle/parent/rank — those live in product_category.
-- This table holds SSoT-derived fields: level, class, status, audit info.
CREATE TABLE IF NOT EXISTS taxonomy_node_meta (
  node_id                TEXT PRIMARY KEY
                         REFERENCES product_category(id) ON DELETE CASCADE,
  level                  SMALLINT NOT NULL CHECK (level IN (1, 2, 3)),
  status                 TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'hidden', 'draft', 'archived')),
  class                  CHAR(1)
                         CHECK (class IN ('A', 'B', 'C') OR class IS NULL),
  source                 TEXT NOT NULL DEFAULT 'ssot'
                         CHECK (source IN ('ssot', 'legacy', 'manual')),
  show_in_mega_menu      BOOLEAN NOT NULL DEFAULT TRUE,
  research_priority      SMALLINT,
  meili_query            TEXT,
  product_count_cached   INTEGER NOT NULL DEFAULT 0,
  audit_at               TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_node_meta_level ON taxonomy_node_meta(level);
CREATE INDEX IF NOT EXISTS idx_taxonomy_node_meta_status ON taxonomy_node_meta(status);
CREATE INDEX IF NOT EXISTS idx_taxonomy_node_meta_audit_at ON taxonomy_node_meta(audit_at)
  WHERE audit_at IS NOT NULL;

-- Per-locale display names (name_et, name_en, and later name_es).
-- product_category.name stays as the default/admin display.
CREATE TABLE IF NOT EXISTS taxonomy_node_translation (
  node_id    TEXT NOT NULL
             REFERENCES product_category(id) ON DELETE CASCADE,
  locale     VARCHAR(5) NOT NULL CHECK (locale IN ('et', 'en', 'es')),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (node_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_node_translation_locale
  ON taxonomy_node_translation(locale);

-- Auto-update updated_at on row change.
CREATE OR REPLACE FUNCTION taxonomy_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_taxonomy_node_meta_updated
  ON taxonomy_node_meta;
CREATE TRIGGER trg_taxonomy_node_meta_updated
  BEFORE UPDATE ON taxonomy_node_meta
  FOR EACH ROW EXECUTE FUNCTION taxonomy_touch_updated_at();

DROP TRIGGER IF EXISTS trg_taxonomy_node_translation_updated
  ON taxonomy_node_translation;
CREATE TRIGGER trg_taxonomy_node_translation_updated
  BEFORE UPDATE ON taxonomy_node_translation
  FOR EACH ROW EXECUTE FUNCTION taxonomy_touch_updated_at();

COMMIT;
