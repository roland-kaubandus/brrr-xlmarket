-- A3 MERGE/SPLIT — Tarmo otsused 2026-11-17 (merge-judge 🔴×3 kandidaadid, per-toode kontseptsioonitest).
-- ÜKS struktuuri-deploy (4-sammu + 301 + undo). Undo: v4-staging/a3-merge-split-2026-11-17-undo.sql
--
-- #1 Jalgratta trenažöörialused (pcat_12trainer, 1 toode) → Velotrenažöörid (pcat_el_12x3_17).
--    KOONDA täielikult: liiguta ainus toode, soft-delete tühjaks jäänud L3, 301.
-- #2 Vintsid (pcat_t3f_10_13, 8 toodet) → EI koonda tervikuna; jaga TOOTE kaupa:
--    2× käsi-trossivints (Wire Rope Puller/Hand Winch, väljatõmme) → Auto Käsivintsid (pcat_ag2_3x1_3, CROSS-L1)
--    6× elektritali (Electric Hoist 220/230V, tõste)              → Elektrilised talid (pcat_t3f_10_15, sama L2)
--    L3 jääb tühjaks → soft-delete + 301 → Elektrilised talid (dominantne siht 6/8). A1 vints-rida lahendatud.
-- #3 Hüdrofoorid JÄÄVAD eraldi (Eesti kliendikontseptsioon + otsingutermin). Piirireegli-koristus:
--    1× pinnapump PAAGIGA (745W Shallow Well Pump WITH Pressure Tank) → Hüdrofoorid (pcat_es_10x2_11).
--    Ülejäänud 4 Pinnapumbad = ilma paagita → JÄÄVAD. Piirireegel Pinnapumbad kirjeldusse
--    (Hüdrofooridel on piirireegel juba olemas). MÕLEMAD L3 jäävad alles.
--
-- 301: soft-delete trigger (xl_product_category_redirect_trg) loob redirecti kui xl.redirect_target GUC seatud
--      (reason='merge', idempotentne ON CONFLICT + chain-collapse). Seega SET LOCAL enne iga soft-delete'i.
-- Cross-list (hübriid) = Phase-2.

\set ON_ERROR_STOP on
BEGIN;

-- ── PRE-GUARD (fail-loud, enne muudatust) ────────────────────────────────────
DO $$
BEGIN
  -- #1
  IF NOT EXISTS (SELECT 1 FROM product_category WHERE id='pcat_12trainer' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'GUARD#1: allikas pcat_12trainer puudub'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category WHERE id='pcat_el_12x3_17' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'GUARD#1: siht pcat_el_12x3_17 puudub'; END IF;
  IF (SELECT count(*) FROM product_category_product WHERE product_category_id='pcat_12trainer') <> 1 THEN RAISE EXCEPTION 'GUARD#1: pcat_12trainer ei sisalda täpselt 1 toodet'; END IF;
  -- #2
  IF NOT EXISTS (SELECT 1 FROM product_category WHERE id='pcat_t3f_10_13' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'GUARD#2: allikas pcat_t3f_10_13 puudub'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category WHERE id='pcat_ag2_3x1_3' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'GUARD#2: siht pcat_ag2_3x1_3 (Käsivintsid) puudub'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category WHERE id='pcat_t3f_10_15' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'GUARD#2: siht pcat_t3f_10_15 (Elektrilised talid) puudub'; END IF;
  IF (SELECT count(*) FROM product_category_product WHERE product_category_id='pcat_t3f_10_13') <> 8 THEN RAISE EXCEPTION 'GUARD#2: pcat_t3f_10_13 ei sisalda täpselt 8 toodet'; END IF;
  -- #3
  IF NOT EXISTS (SELECT 1 FROM product_category WHERE id='pcat_es_10x2_11' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'GUARD#3: Hüdrofoorid pcat_es_10x2_11 puudub'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXGQ20Y4YRJWTPF8EBWZBZ' AND product_category_id='pcat_es_10x2_10') THEN RAISE EXCEPTION 'GUARD#3: paagiga pump pole Pinnapumbad-is'; END IF;
END $$;

-- ═══ #1 KOONDA: Jalgratta trenažöörialused → Velotrenažöörid ═══════════════════
INSERT INTO product_category_product (product_id, product_category_id)
  VALUES ('prod_01KNXX76QZR8M9HRA6GA8722EY','pcat_el_12x3_17') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXX76QZR8M9HRA6GA8722EY' AND product_category_id='pcat_12trainer';
SET LOCAL xl.redirect_target = 'v4-sport-ja-vaba-aeg-fitness-ja-treeningseadmed-velo-ja-jalgrattatrenazoorid';
UPDATE product_category SET deleted_at=NOW(), is_active=false, updated_at=NOW() WHERE id='pcat_12trainer';

-- ═══ #2 JAGA Vintsid toote kaupa ══════════════════════════════════════════════
-- 2× käsi-trossivints (väljatõmme) → Auto Käsivintsid (cross-L1)
INSERT INTO product_category_product (product_id, product_category_id) VALUES
  ('prod_01KNXX6BEZZ6DNJQMAZ8A4F8KQ','pcat_ag2_3x1_3'),
  ('prod_01KNXX68JBPHHJBJ6TDV5MGXAN','pcat_ag2_3x1_3') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_t3f_10_13'
  AND product_id IN ('prod_01KNXX6BEZZ6DNJQMAZ8A4F8KQ','prod_01KNXX68JBPHHJBJ6TDV5MGXAN');
-- 6× elektritali (tõste) → Elektrilised talid (sama L2)
INSERT INTO product_category_product (product_id, product_category_id) VALUES
  ('prod_01KPJVB1H2578ZGM614X535MEJ','pcat_t3f_10_15'),
  ('prod_01KNXX864X8QJ4KVEP435AKY84','pcat_t3f_10_15'),
  ('prod_01KNXXGBT3A8P56DNFMNM4M898','pcat_t3f_10_15'),
  ('prod_01KNXX864X7MPR0G21D6609SN7','pcat_t3f_10_15'),
  ('prod_01KNXX865AQDCDKSP2WESNBXJ9','pcat_t3f_10_15'),
  ('prod_01KNXXGCPS3SG0FW9GP6HSJJYC','pcat_t3f_10_15') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_t3f_10_13'
  AND product_id IN ('prod_01KPJVB1H2578ZGM614X535MEJ','prod_01KNXX864X8QJ4KVEP435AKY84',
    'prod_01KNXXGBT3A8P56DNFMNM4M898','prod_01KNXX864X7MPR0G21D6609SN7',
    'prod_01KNXX865AQDCDKSP2WESNBXJ9','prod_01KNXXGCPS3SG0FW9GP6HSJJYC');
-- L3 tühi → soft-delete + 301 → Elektrilised talid (dominantne siht)
SET LOCAL xl.redirect_target = 'v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-elektrilised-talid';
UPDATE product_category SET deleted_at=NOW(), is_active=false, updated_at=NOW() WHERE id='pcat_t3f_10_13';

-- ═══ #3 PIIRIREEGLI-KORISTUS: paagiga pump → Hüdrofoorid + Pinnapumbad kirjeldus ═
INSERT INTO product_category_product (product_id, product_category_id)
  VALUES ('prod_01KNXXGQ20Y4YRJWTPF8EBWZBZ','pcat_es_10x2_11') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXGQ20Y4YRJWTPF8EBWZBZ' AND product_category_id='pcat_es_10x2_10';
UPDATE product_category SET
  description = 'Pinnapealsed ja iseimevad pumbad ILMA surveparaata: jet-pumbad ja aiapumbad vee pumpamiseks kaevust, mahutist või veekogust (shallow well jet pump, garden pump). Paigaldus: maapealne, ilma paisupaagi ja rõhulülitita. PIIRIREEGEL: ainult pump (ilma paagita) → siia; pump + surveparaak komplektina → Hüdrofoorid; süvave/puurkaevupumbad → Puurkaevu- ja süvaveepumbad.',
  updated_at = NOW()
WHERE id = 'pcat_es_10x2_10';

-- ── POST-GUARD (fail-loud, pärast muudatust) ─────────────────────────────────
DO $$
BEGIN
  -- #1
  IF EXISTS (SELECT 1 FROM product_category WHERE id='pcat_12trainer' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'POST#1: pcat_12trainer pole kustutatud'; END IF;
  IF (SELECT count(*) FROM product_category_product WHERE product_category_id='pcat_12trainer') <> 0 THEN RAISE EXCEPTION 'POST#1: pcat_12trainer veel lingitud'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXX76QZR8M9HRA6GA8722EY' AND product_category_id='pcat_el_12x3_17') THEN RAISE EXCEPTION 'POST#1: toode pole Velotrenažöörides'; END IF;
  -- #2
  IF EXISTS (SELECT 1 FROM product_category WHERE id='pcat_t3f_10_13' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'POST#2: pcat_t3f_10_13 pole kustutatud'; END IF;
  IF (SELECT count(*) FROM product_category_product WHERE product_category_id='pcat_t3f_10_13') <> 0 THEN RAISE EXCEPTION 'POST#2: pcat_t3f_10_13 veel lingitud'; END IF;
  IF (SELECT count(*) FROM product_category_product WHERE product_category_id='pcat_ag2_3x1_3' AND product_id IN ('prod_01KNXX6BEZZ6DNJQMAZ8A4F8KQ','prod_01KNXX68JBPHHJBJ6TDV5MGXAN')) <> 2 THEN RAISE EXCEPTION 'POST#2: 2 käsivintsi pole Käsivintsides'; END IF;
  IF (SELECT count(*) FROM product_category_product WHERE product_category_id='pcat_t3f_10_15' AND product_id IN ('prod_01KPJVB1H2578ZGM614X535MEJ','prod_01KNXX864X8QJ4KVEP435AKY84','prod_01KNXXGBT3A8P56DNFMNM4M898','prod_01KNXX864X7MPR0G21D6609SN7','prod_01KNXX865AQDCDKSP2WESNBXJ9','prod_01KNXXGCPS3SG0FW9GP6HSJJYC')) <> 6 THEN RAISE EXCEPTION 'POST#2: 6 elektritali pole Elektrilistes talides'; END IF;
  -- #3
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXGQ20Y4YRJWTPF8EBWZBZ' AND product_category_id='pcat_es_10x2_11') THEN RAISE EXCEPTION 'POST#3: paagiga pump pole Hüdrofoorides'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXGQ20Y4YRJWTPF8EBWZBZ' AND product_category_id='pcat_es_10x2_10') THEN RAISE EXCEPTION 'POST#3: paagiga pump veel Pinnapumbades'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category WHERE id='pcat_es_10x2_11' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'POST#3: Hüdrofoorid kadusid'; END IF;
  -- 301 redirectid loodud (trigger)
  IF NOT EXISTS (SELECT 1 FROM slug_redirect WHERE from_slug='v4-jalgratta-trenazoorialused' AND to_slug='v4-sport-ja-vaba-aeg-fitness-ja-treeningseadmed-velo-ja-jalgrattatrenazoorid') THEN RAISE EXCEPTION 'POST: #1 301 puudub'; END IF;
  IF NOT EXISTS (SELECT 1 FROM slug_redirect WHERE from_slug='v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-vintsid' AND to_slug='v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-elektrilised-talid') THEN RAISE EXCEPTION 'POST: #2 301 puudub'; END IF;
END $$;

COMMIT;
