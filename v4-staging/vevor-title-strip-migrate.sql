-- vevor-title-strip-migrate.sql — 2026-08-24
-- FAAS 1 samm 1: eemalda "VEVOR" bränd-prefiks tootepealkirjadest (display title).
-- Skoop (mälu homne-stardipunkt-title-glossary-sisu.md): strip ENNE tõlget, handle EI muutu (0 redirect).
--
-- ROBUST-REGEX (mälu-regex ^VEVOR\s+ oli PUUDULIK — jättis 63 vahele):
--   ^[Vv][Ee][Vv][Oo][Rr]([[:space:]]|NBSP)+   → kate 18279
--   - VEVOR + ASCII-space: 18216
--   - VEVOR + NBSP (U+00A0, chr(160); \s EI matchi): 47
--   - Vevor (väiketäht-variant): 16
-- Strip = 18278 (18279 − E1 skip).
--
-- ERANDID (EI strippi, liputatud reports/title-parandus-nimekiri.md):
--   E1 prod_01KNXX8WWK90WXW59S0963A1AN "VEVOR 20" — jääks "20" (katkine title, tootenimi puudu) → SKIP.
--   E2 "VVEVOR…" (trükiviga) — ^[Vv][Ee][Vv]… EI matchi (2. täht V≠E) → jääb iseenesest puutumata.
--
-- BRÄND SÄILIB: deriveBrandSlug (metadata vevor_*) → Meili filter_tokens brand:vevor + searchable brand_name.
--   Title-strip EI mõjuta brändi-facet'it ega "vevor" otsingut (brand_name searchable lisatud ENNE stripi).
-- HANDLE: UPDATE puudutab AINULT title + updated_at. Handle on eraldi veerg → muutumatu.
-- IDEMPOTENTNE: strip AINULT ridadel kus p.title = backup.old_title (topelt-strip võimatu).
-- ROLLBACK: UPDATE product SET title=b.old_title FROM title_strip_backup_20260824 b WHERE product.id=b.product_id;
BEGIN;

-- 1. Backup-tabel (rollback-allikas)
CREATE TABLE IF NOT EXISTS title_strip_backup_20260824 (
  product_id  text PRIMARY KEY,
  old_title   text NOT NULL,
  new_title   text NOT NULL,
  stripped_at timestamptz DEFAULT now()
);

-- 2. Täida backup strippitavate ridadega (robust-regex, E1 väljas)
--    KORDUMIS-MUSTER ^(VEVOR sep+)+ — 3 tootel oli bränd KAKS korda ("VEVOR VEVOR ...",
--    "VEVOR Vevor ..."); üks-pass jättis teise alles → kordumis-grupp eemaldab kõik prefiksid.
INSERT INTO title_strip_backup_20260824 (product_id, old_title, new_title)
SELECT id, title,
  regexp_replace(title, '^([Vv][Ee][Vv][Oo][Rr]([[:space:]]|'||chr(160)||')+)+', '', '')
FROM product
WHERE deleted_at IS NULL
  AND title ~ ('^[Vv][Ee][Vv][Oo][Rr]([[:space:]]|'||chr(160)||')+')
  AND id <> 'prod_01KNXX8WWK90WXW59S0963A1AN'
ON CONFLICT (product_id) DO NOTHING;

-- 3. Turvavärav: katkesta kui mõni new_title jääks tühjaks/liiga lühikeseks
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM title_strip_backup_20260824 WHERE char_length(new_title) < 2;
  IF bad > 0 THEN RAISE EXCEPTION 'ABORT: % title jääks liiga lühikeseks (<2)', bad; END IF;
END $$;

-- 4. Rakenda strip (idempotentne: ainult kui title=old_title)
UPDATE product p
SET title = b.new_title, updated_at = now()
FROM title_strip_backup_20260824 b
WHERE p.id = b.product_id AND p.title = b.old_title;

-- 5. Turvavõrk: eemalda võimalik jääk-prefiks otse (kui pass ei tabanud kordumist).
--    Idempotentne — peale strippi 0 rida (v.a E1 skip, E2 'VVEVOR' ei matchi).
UPDATE product p
SET title = regexp_replace(title, '^([Vv][Ee][Vv][Oo][Rr]([[:space:]]|'||chr(160)||')+)+', '', ''), updated_at = now()
WHERE p.deleted_at IS NULL
  AND p.title ~ ('^[Vv][Ee][Vv][Oo][Rr]([[:space:]]|'||chr(160)||')+')
  AND p.id <> 'prod_01KNXX8WWK90WXW59S0963A1AN';

COMMIT;
