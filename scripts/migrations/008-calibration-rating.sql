-- Migration 008: calibration_rating — AUTO-JUDGE kalibreerimise inimhinnangud (plaan §5).
-- Kasutab: backend/src/api/admin/calibration/route.ts (GET taasta + POST salvesta).
--
-- MIKS DB (mitte ainult localStorage): Tarmo hinnangud peavad püsima, et kalibratsiooni
-- saaks HILJEM KORRATA/AUDITEERIDA (prompti muudatuse mõju mõõta sama valimi peal).
-- localStorage = ainult sama-brauseri mugavus; DB = tõe-allikas.
--
-- Idempotentne (IF NOT EXISTS) — ohutu korduvjooksuks. Prod saab cutoveril automaatselt.

BEGIN;

CREATE TABLE IF NOT EXISTS calibration_rating (
  id            bigserial PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  actor         text NOT NULL,              -- hindaja (admin email)
  kind          text NOT NULL,              -- 'synonym' | 'classify'
  sample_seed   text NOT NULL DEFAULT 'xlm',-- valimi seed (korratavuse-grupp)
  item_id       text NOT NULL,              -- synonym_review id / product_id
  tarmo_verdict text NOT NULL,              -- OK/VALE/EBAKINDEL | assign_existing/new_l3/keep
  judge_verdict text,                       -- kohtuniku otsus (audit-snapshot hindamise hetkel)
  agreed        boolean,                    -- tarmo_verdict == judge_verdict
  meta          jsonb,
  -- üks hinnang (hindaja, valim, kirje) kohta → kordus-hindamine UPDATE'ib, ei dubleeri
  UNIQUE (kind, sample_seed, item_id, actor)
);

CREATE INDEX IF NOT EXISTS idx_calib_lookup
  ON calibration_rating (kind, sample_seed, actor);

COMMIT;
