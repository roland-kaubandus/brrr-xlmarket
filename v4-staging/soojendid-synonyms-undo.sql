-- UNDO SOOJENDID sünonüümid: eemalda gen_version='manual-soojendid-2026-11-17' read + resync Meili.
\set ON_ERROR_STOP on
BEGIN;
DELETE FROM product_synonym WHERE gen_version = 'manual-soojendid-2026-11-17';
COMMIT;
-- Pärast: docker exec <medusa> node backend/scripts/sync-synonyms.mjs (taasta Meili graaf ilma nende ridadeta).
