-- Migration 004: category_classification_audit resolver extensions
-- Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §5.1, §F3.2
-- Adds resolver metadata columns to the existing audit log (migration 003)
-- and an index/view used by the admin review queue.
-- Idempotent.

BEGIN;

-- New columns for resolver-v2 classifications
ALTER TABLE category_classification_audit
  ADD COLUMN IF NOT EXISTS method        TEXT,            -- S1_sku_override | S2_path_contains | ...
  ADD COLUMN IF NOT EXISTS confidence    NUMERIC(4,3),    -- 0.000 .. 1.000
  ADD COLUMN IF NOT EXISTS l1_slug       TEXT,
  ADD COLUMN IF NOT EXISTS l2_slug       TEXT,
  ADD COLUMN IF NOT EXISTS l3_slug       TEXT,
  ADD COLUMN IF NOT EXISTS raw_path      TEXT,            -- VEVOR productType snapshot
  ADD COLUMN IF NOT EXISTS needs_review  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_at   TIMESTAMPTZ;     -- when admin/cron cleared review

-- Expand the action check to include resolver-specific actions
ALTER TABLE category_classification_audit
  DROP CONSTRAINT IF EXISTS category_classification_audit_action_check;

ALTER TABLE category_classification_audit
  ADD CONSTRAINT category_classification_audit_action_check
  CHECK (action IN (
    'dual_assignment_removed',
    'legacy_shell_deleted',
    'legacy_l1_deleted',
    'product_reassigned',
    'resolver_classified',
    'resolver_reclassified',
    'review_resolved',
    'review_timeout_drafted'
  ));

-- Indexes for the review-queue UI and nightly cron
CREATE INDEX IF NOT EXISTS idx_cca_needs_review
  ON category_classification_audit(needs_review, created_at DESC)
  WHERE needs_review = true AND resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cca_raw_path
  ON category_classification_audit(raw_path)
  WHERE raw_path IS NOT NULL;

-- Convenience view: current open review queue (one row per product,
-- latest un-resolved resolver classification).
CREATE OR REPLACE VIEW v_review_queue AS
SELECT DISTINCT ON (product_id)
  id,
  product_id,
  action,
  method,
  confidence,
  l1_slug,
  l2_slug,
  l3_slug,
  raw_path,
  reason,
  created_at
FROM category_classification_audit
WHERE needs_review = true
  AND resolved_at IS NULL
  AND product_id IS NOT NULL
ORDER BY product_id, created_at DESC;

-- Top unmapped / low-confidence VEVOR paths for digest (spec §5.4)
CREATE OR REPLACE VIEW v_review_queue_top_paths AS
SELECT
  raw_path,
  COUNT(*)      AS product_count,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM category_classification_audit
WHERE needs_review = true
  AND resolved_at IS NULL
  AND raw_path IS NOT NULL
  AND raw_path <> ''
GROUP BY raw_path
ORDER BY product_count DESC;

COMMIT;
