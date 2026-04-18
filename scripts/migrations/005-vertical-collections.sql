-- Migration 005: vertical_collection infrastructure (Faas 4)
-- Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §4.4
-- Tables: vertical_collection, vertical_collection_rule,
--         vertical_collection_translation, vertical_collection_product
-- Idempotent. Safe to re-run.

BEGIN;

-- 1. Vertical definition
CREATE TABLE IF NOT EXISTS vertical_collection (
  id              TEXT PRIMARY KEY,              -- "vc_kohvik"
  slug            TEXT NOT NULL UNIQUE,          -- "kohvik"
  mode            TEXT NOT NULL,                 -- alustajale | arikliendile | hooldus
  hero_image_url  TEXT,
  emtak_codes     TEXT[],
  cnae_codes      TEXT[],
  status          TEXT NOT NULL DEFAULT 'active',-- draft | active | archived
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  materialized_at TIMESTAMPTZ,                   -- last successful materialize run

  CONSTRAINT vertical_collection_mode_check
    CHECK (mode IN ('alustajale', 'arikliendile', 'hooldus')),
  CONSTRAINT vertical_collection_status_check
    CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE INDEX IF NOT EXISTS vertical_collection_mode_idx
  ON vertical_collection (mode, status);

-- 2. Include/exclude rules (declarative; YAML is source of truth,
-- this table is the materialized rule-set per run)
CREATE TABLE IF NOT EXISTS vertical_collection_rule (
  id              BIGSERIAL PRIMARY KEY,
  collection_id   TEXT NOT NULL REFERENCES vertical_collection(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,                 -- include_node | exclude_node | include_product | exclude_product
  node_slug       TEXT,                          -- L1/L2/L3 slug when kind = *_node
  product_id      TEXT,                          -- product id when kind = *_product
  weight          NUMERIC DEFAULT 0,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT vertical_collection_rule_kind_check
    CHECK (kind IN ('include_node', 'exclude_node', 'include_product', 'exclude_product'))
);

CREATE INDEX IF NOT EXISTS vertical_collection_rule_collection_idx
  ON vertical_collection_rule (collection_id, kind);

-- 3. Locale-aware display strings
CREATE TABLE IF NOT EXISTS vertical_collection_translation (
  collection_id    TEXT NOT NULL REFERENCES vertical_collection(id) ON DELETE CASCADE,
  locale           VARCHAR(5) NOT NULL,          -- et | en | es
  name             TEXT NOT NULL,
  slug_localized   TEXT NOT NULL,
  tagline          TEXT,
  description      TEXT,
  meta_title       TEXT,
  meta_description TEXT,
  faq_markdown_path TEXT,

  PRIMARY KEY (collection_id, locale)
);

CREATE INDEX IF NOT EXISTS vertical_collection_translation_slug_idx
  ON vertical_collection_translation (locale, slug_localized);

-- 4. Materialized product membership (populated by materialize-verticals.mjs)
CREATE TABLE IF NOT EXISTS vertical_collection_product (
  collection_id   TEXT NOT NULL REFERENCES vertical_collection(id) ON DELETE CASCADE,
  product_id      TEXT NOT NULL,
  sort_weight     NUMERIC NOT NULL DEFAULT 0,
  added_via       TEXT,                          -- node:horeca-food-service | manual | kit:starter
  materialized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS vertical_collection_product_product_idx
  ON vertical_collection_product (product_id);

CREATE INDEX IF NOT EXISTS vertical_collection_product_collection_idx
  ON vertical_collection_product (collection_id, sort_weight DESC);

COMMIT;
