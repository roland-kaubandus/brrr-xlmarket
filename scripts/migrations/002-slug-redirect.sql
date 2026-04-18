-- Migration 002: slug_redirect
-- Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §7.1
-- Idempotent. Seed data populated by scripts/seed-slug-redirects.mjs.

BEGIN;

CREATE TABLE IF NOT EXISTS slug_redirect (
  from_slug    TEXT PRIMARY KEY,
  to_slug      TEXT NOT NULL,
  reason       TEXT NOT NULL CHECK (reason IN ('rename', 'merge', 'deprecate', 'legacy')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ  -- NULL = permanent
);

CREATE INDEX IF NOT EXISTS idx_slug_redirect_to ON slug_redirect(to_slug);
CREATE INDEX IF NOT EXISTS idx_slug_redirect_expires
  ON slug_redirect(expires_at) WHERE expires_at IS NOT NULL;

COMMIT;
