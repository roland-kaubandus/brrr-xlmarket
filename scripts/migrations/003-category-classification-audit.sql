-- Migration 003: category_classification_audit
-- Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §F2.6
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS category_classification_audit (
  id                   BIGSERIAL PRIMARY KEY,
  product_id           TEXT,                -- NULL when action is category-level (e.g. legacy_l1_deleted)
  action               TEXT NOT NULL
                       CHECK (action IN (
                         'dual_assignment_removed',
                         'legacy_shell_deleted',
                         'legacy_l1_deleted',
                         'product_reassigned',
                         'resolver_classified'
                       )),
  before_category_id   TEXT,
  after_category_id    TEXT,
  reason               TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cca_product_id ON category_classification_audit(product_id)
  WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cca_action ON category_classification_audit(action);
CREATE INDEX IF NOT EXISTS idx_cca_created_at ON category_classification_audit(created_at);

COMMIT;
