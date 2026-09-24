-- Migration 007: review_decision_log — review-bucketi otsuste-logi (SAMM 2c)
-- Append-only + undo alus. Kasutab: backend/src/api/admin/review-bucket/route.ts
-- (klassifikaator) ja tuleviku 2b (sünonüümid) — SAMA tabel, SAMA undo-mehhanism.
--
-- MIKS MIGRATSIOON: prod (cutover) peab selle saama automaatselt. route.ts
-- ensureLogTable = turvavõrk staging'us; kanooniline skeem elab SIIN.
-- Idempotentne (IF NOT EXISTS) — ohutu korduvjooksuks.

BEGIN;

CREATE TABLE IF NOT EXISTS review_decision_log (
  id            bigserial PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  actor         text NOT NULL,              -- otsustaja (admin actor_id / email)
  bucket_type   text NOT NULL,              -- 'classification' | 'synonym'
  action        text NOT NULL,              -- assign_existing | create_l3 | quarantine | reject
  concept_key   text,                       -- klastri-võti (DUP-grupeerimine)
  target_handle text,                       -- assign_existing: siht-L3 handle
  target_l2     text,                       -- create_l3: vanem-L2 handle
  new_l3_name   text,                       -- create_l3: kinnitatud uue L3 nimi
  status        text NOT NULL DEFAULT 'applied',  -- applied | approved_pending_build | undone
  affected      jsonb NOT NULL DEFAULT '[]',      -- [{product_id, prev_category_ids[], prev_status}]
  meta          jsonb,
  undone_at     timestamptz,
  undone_by     text
);

-- pending_build päring (approved_pending_build, active) + logi-vaade
CREATE INDEX IF NOT EXISTS idx_rdl_bucket_status
  ON review_decision_log (bucket_type, status)
  WHERE undone_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rdl_recent
  ON review_decision_log (bucket_type, id DESC);

COMMIT;
