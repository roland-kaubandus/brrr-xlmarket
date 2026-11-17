-- SOOJENDID sünonüümid (Tarmo 2026-11-17): torpeedo · soojapuhur · parkimissoojendi · webasto-tüüpi · diiselsoojendi.
-- Mudel: product_synonym on TOOTE-skoobis (product_id NOT NULL); sync-synonyms.mjs ehitab GLOBAALSE
--   kahesuunalise Meili-graafi (word+synonyms+variants, per-rida klikk, EI ole transitiivne).
-- parkimissoojendi on JUBA olemas (reinforce ok). diiselsoojendi = sild mõlemas rühmas (umbrella-termin).
-- gen_version='manual-soojendid-2026-11-17' → undo = DELETE by gen_version + resync.
-- Kandja-toode: representatiiv kummastki L3-st (subquery, LIMIT 1).

\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE pid1 text; pid2 text;
BEGIN
  SELECT pcp.product_id INTO pid1 FROM product_category_product pcp
    JOIN product p ON p.id=pcp.product_id AND p.deleted_at IS NULL
    WHERE pcp.product_category_id='pcat_d9_1' ORDER BY pcp.product_id LIMIT 1;
  SELECT pcp.product_id INTO pid2 FROM product_category_product pcp
    JOIN product p ON p.id=pcp.product_id AND p.deleted_at IS NULL
    WHERE pcp.product_category_id='pcat_d3_1' ORDER BY pcp.product_id LIMIT 1;
  IF pid1 IS NULL OR pid2 IS NULL THEN
    RAISE EXCEPTION 'GUARD: kandja-toodet ei leitud (pid1=% pid2=%)', pid1, pid2;
  END IF;

  -- Rühm 1 (kütust-põletav soojapuhur / torpeedo) — kandja d9_1
  INSERT INTO product_synonym (product_id, word, synonyms, variants, lang, gen_version, confidence)
  VALUES (pid1, 'torpeedo',
    ARRAY['soojapuhur','diiselsoojendi','torpedo heater','kuumaõhupuhur','petrooleumi soojapuhur'],
    ARRAY['torpeedotüüpi','torpeedo tüüpi','kuumaohupuhur','kuumaõhupuhur','petrooleumisoojapuhur'],
    'et', 'manual-soojendid-2026-11-17', 1.0);

  -- Rühm 2 (autonoomne diiselsoojendi / parkimissoojendi / webasto) — kandja d3_1
  INSERT INTO product_synonym (product_id, word, synonyms, variants, lang, gen_version, confidence)
  VALUES (pid2, 'webasto-tüüpi',
    ARRAY['parkimissoojendi','diiselsoojendi','diesel air heater','parking heater','autonoomne diiselsoojendi'],
    ARRAY['webastotüüpi','webasto tüüpi','webastotuupi','webastotyypi','diiselsoojendi'],
    'et', 'manual-soojendid-2026-11-17', 1.0);
END $$;

COMMIT;
