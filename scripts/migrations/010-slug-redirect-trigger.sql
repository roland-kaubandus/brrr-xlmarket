-- Migration 010: slug_redirect AUTO-trigger (HARD RULE #5, Tarmo 2026-10-13)
--
-- EESMÄRK: iga kategooria handle-muutus / eemaldamine kirjutab AUTOMAATSELT slug_redirect
-- rea SAMAS transaktsioonis — ÜKS mehhanism KÕIGILE kutsujatele (auto-create/classify-chain,
-- merge, rename/nimevärav, ETAPP-tööriistad, naabrite-mootor, manuaalne psql, KÕIK tulevased).
-- Trigger on DB-tasandil → ükski kutsuja EI SAA mööda minna (vs 20 skripti käsitsi redigeerida,
-- millest üks ununeks → vaikne 404-leke cutover'il). See ongi "üks mehhanism".
--
-- KATAB:
--   RENAME  — UPDATE handle vana→uus (deleted_at jääb NULL)
--             → from=vana to=uus reason='rename'
--   REMOVE  — soft-delete (deleted_at NULL→NOT NULL) VÕI hard DELETE
--             → from=handle to=COALESCE(GUC 'xl.redirect_target', ELAVA-vanema-handle)
--               reason = 'merge' (kui GUC seatud) muidu 'deprecate'
--   INSERT uut kategooriat EI puuduta (uus handle = midagi ei 404-i) — auto-create on ohutu.
--
-- MERGE TÄPNE SIHT: kui kutsuja tahab suunata KONKREETSESSE sihtkategooriasse (mitte vanemasse),
-- seab enne DELETE/soft-delete SAMAS txn-is:
--     SELECT set_config('xl.redirect_target', '<siht-handle>', true);   -- true = SET LOCAL
-- (vt scripts/lib/slug-redirect.mjs → setRedirectTarget). Ilma selleta → ELAV vanem (ohutu vaikesiht).
--
-- CHAIN-COLLAPSE: kui vana handle oli juba mõne varasema redirect'i SIHT, suunatakse need
-- uuele sihile (väldib surnud-ahelat A→B→C middleware ühe-hüppe lookup'is), + self-loop puhastus.
--
-- SIHT-VALIDEERIMINE: kui arvutatud siht on NULL (vanem ka kustutatud) → EI kirjuta redirect'i
-- (parem puuduv redirect kui redirect teise 404-sse). Kutsuja saab GUC-iga täpse sihi anda.
--
-- Idempotentne (CREATE OR REPLACE + DROP TRIGGER IF EXISTS). ON_ERROR_STOP-ohutu.

BEGIN;

-- EELTINGIMUS: from_slug peab olema UNIKAALNE (single-hop redirect — üks vana slug → üks siht;
-- middleware teeb ühe-hüppe lookup'i, 2 rida sama from_slug'iga oleks mitmetähenduslik). Olemasolev
-- tabel (aprill 2026) loodi ILMA unique-constraint'ita → ON CONFLICT (from_slug) kukkus trigger'is JA
-- backfill'is. Lisa idempotentselt. Kui duplikaate on → ALTER kukub ON_ERROR_STOP all (fail-loud, õige).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slug_redirect_from_slug_key') THEN
    ALTER TABLE slug_redirect ADD CONSTRAINT slug_redirect_from_slug_key UNIQUE (from_slug);
  END IF;
END $$;

-- Ühine kirjutaja: insert + chain-collapse + self-loop puhastus. reason valideeritakse CHECK'iga.
CREATE OR REPLACE FUNCTION xl_slug_redirect_record(p_from text, p_to text, p_reason text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_from = '' OR p_to = '' OR p_from = p_to THEN
    RETURN;  -- tühi/self → no-op
  END IF;
  INSERT INTO slug_redirect (from_slug, to_slug, reason)
  VALUES (p_from, p_to, p_reason)
  ON CONFLICT (from_slug) DO UPDATE
    SET to_slug = EXCLUDED.to_slug, reason = EXCLUDED.reason, created_at = NOW();
  -- varasemad redirect'id, mis sihtisid p_from → suuna p_to-le (ahela kokkuvarisemine)
  UPDATE slug_redirect SET to_slug = p_to
    WHERE to_slug = p_from AND from_slug <> p_to;
  -- koristus: self-loop, mis võis chain-collapse'ist tekkida
  DELETE FROM slug_redirect WHERE from_slug = to_slug;
END;
$$;

CREATE OR REPLACE FUNCTION xl_product_category_redirect_trg()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_guc    text := NULLIF(current_setting('xl.redirect_target', true), '');
  v_target text;
BEGIN
  -- HARD DELETE ──────────────────────────────────────────────────────────────
  IF TG_OP = 'DELETE' THEN
    IF v_guc IS NOT NULL THEN
      v_target := v_guc;
    ELSE
      SELECT handle INTO v_target FROM product_category
        WHERE id = OLD.parent_category_id AND deleted_at IS NULL;
    END IF;
    PERFORM xl_slug_redirect_record(OLD.handle, v_target,
      CASE WHEN v_guc IS NOT NULL THEN 'merge' ELSE 'deprecate' END);
    RETURN OLD;
  END IF;

  -- SOFT-DELETE (deleted_at NULL → NOT NULL) ───────────────────────────────────
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    IF v_guc IS NOT NULL THEN
      v_target := v_guc;
    ELSE
      SELECT handle INTO v_target FROM product_category
        WHERE id = COALESCE(NEW.parent_category_id, OLD.parent_category_id) AND deleted_at IS NULL;
    END IF;
    PERFORM xl_slug_redirect_record(OLD.handle, v_target,
      CASE WHEN v_guc IS NOT NULL THEN 'merge' ELSE 'deprecate' END);
    RETURN NEW;
  END IF;

  -- RENAME (handle muutus, kategooria jääb elus) ───────────────────────────────
  IF NEW.deleted_at IS NULL AND OLD.handle IS DISTINCT FROM NEW.handle THEN
    PERFORM xl_slug_redirect_record(OLD.handle, NEW.handle, 'rename');
    RETURN NEW;
  END IF;

  RETURN NEW;  -- muu UPDATE (updated_at jm) → no-op
END;
$$;

DROP TRIGGER IF EXISTS trg_product_category_slug_redirect ON product_category;
CREATE TRIGGER trg_product_category_slug_redirect
  AFTER UPDATE OR DELETE ON product_category
  FOR EACH ROW EXECUTE FUNCTION xl_product_category_redirect_trg();

COMMIT;
