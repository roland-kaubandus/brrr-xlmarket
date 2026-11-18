-- A1 PERE-SCATTER — Tarmo otsused 2026-11-18. ÜKS struktuuri-deploy (301 + undo).
-- Undo: v4-staging/a1-family-scatter-2026-11-18-undo.sql
--
-- KOONDA (5 merge: liiguta KÕIK lingid allikast sihti, soft-delete tühi allikas, 301=merge):
--   #1 kanister  pcat_2kanist   → pcat_ag2_3x4_1 (Auto Kütusekanistrid ja ohutuskanistrid)
--   #2 lamp      pcat_t3a_8_11  → pcat_11grow    (Elektritarvikud Kasvulambid)
--   #3 värav     pcat_9karivar  → pcat_9turvv    (Ehitus Turvavõred ja kokkupandavad väravad)
--   #10 telk     pcat_12t2      → pcat_8dome     (Telgid Kuppel- ja mullitelgid)
--   #11 vedru    pcat_es_9x3_6  → pcat_ag2_2_uks (Garaaž Garaažiukse osad ja vedrud)
-- REPARENT (1: L3 jääb elus, uus L2-vanem, handle muutub → 301=rename):
--   #6 ekraan    pcat_el_12x1_39 (Täispuhutavad projektsiooniekraanid) → Elektroonika Projektsioon ja kodukino (pcat_23proj)
-- NIMEDA ÜMBER (handle muutub → 301=rename) + PIIRIREEGEL kirjeldusse:
--   #4 taignamikserid: pcat_ks_5x1_12 → "Professionaalsed köögi- ja taignamikserid"; pcat_4mikser jääb nimi (kirjeldus+piir)
--   #5 seinariiulid:   pcat_ag2_2x2_2 → "Metall-seinariiulid ja -restid"; pcat_mv_6x2_2 → "Dekoratiivsed seinariiulid"
--   #9 tolmuimejad:    pcat_t3f_12_2  → "Tööstus- ja ehitustolmuimejad"; pcat_ks_4x5_3 → "Kodutolmuimejad"
--   #7 membraanpumbad: pcat_es_10x2_6 → "12V membraan-veepumbad"; pcat_ag2_2x4_4 jääb nimi (kirjeldus+piir);
--                      + liiguta 1 SURUÕHK-pump pcat_es_10x2_6 → pcat_ag2_2x4_4 (prod_01KNXX66PY1VP4VWX49516QNTA)
-- 301: trigger xl_product_category_redirect_trg — soft-delete+GUC=merge; handle-muutus=rename (automaatne).

\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE _a1_pre ON COMMIT DROP AS
  SELECT count(*) AS pub,
         (SELECT count(*) FROM product p WHERE p.status='published' AND p.deleted_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM product_category_product x
                            JOIN product_category c ON c.id=x.product_category_id AND c.deleted_at IS NULL
                            WHERE x.product_id=p.id)) AS orphan
  FROM product p WHERE p.status='published' AND p.deleted_at IS NULL;

-- ── PRE-GUARD: kõik 21 kategooriat olemas ────────────────────────────────────
DO $$
DECLARE ids text[] := ARRAY['pcat_2kanist','pcat_ag2_3x4_1','pcat_t3a_8_11','pcat_11grow',
  'pcat_9karivar','pcat_9turvv','pcat_12t2','pcat_8dome','pcat_es_9x3_6','pcat_ag2_2_uks',
  'pcat_el_12x1_39','pcat_23proj','pcat_ks_5x1_12','pcat_4mikser','pcat_ag2_2x2_2','pcat_mv_6x2_2',
  'pcat_t3f_12_2','pcat_ks_4x5_3','pcat_es_10x2_6','pcat_ag2_2x4_4'];
  k text;
BEGIN
  FOREACH k IN ARRAY ids LOOP
    IF NOT EXISTS (SELECT 1 FROM product_category WHERE id=k AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'PRE-GUARD: kategooria % puudub/kustutatud', k; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM product_category_product
    WHERE product_id='prod_01KNXX66PY1VP4VWX49516QNTA' AND product_category_id='pcat_es_10x2_6') THEN
    RAISE EXCEPTION 'PRE-GUARD: suruõhk-pump pole Santehnika membraanpumbades'; END IF;
END $$;

-- ═══ MERGE #1 kanister → Auto ═════════════════════════════════════════════════
INSERT INTO product_category_product (product_id, product_category_id)
  SELECT product_id, 'pcat_ag2_3x4_1' FROM product_category_product WHERE product_category_id='pcat_2kanist'
  ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_2kanist';
SET LOCAL xl.redirect_target='v4-autovaruosad-ja-tarvikud-kutusekanistrid-ja-ohutuskanistrid';
UPDATE product_category SET deleted_at=NOW(), is_active=false, updated_at=NOW() WHERE id='pcat_2kanist';

-- ═══ MERGE #2 lamp → Elektritarvikud ══════════════════════════════════════════
INSERT INTO product_category_product (product_id, product_category_id)
  SELECT product_id, 'pcat_11grow' FROM product_category_product WHERE product_category_id='pcat_t3a_8_11'
  ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_t3a_8_11';
SET LOCAL xl.redirect_target='v4-elektritarvikud-ja-valgustus-lambid-kasvulambid';
UPDATE product_category SET deleted_at=NOW(), is_active=false, updated_at=NOW() WHERE id='pcat_t3a_8_11';

-- ═══ MERGE #3 värav → Ehitus Turvavõred (sama L1) ════════════════════════════
INSERT INTO product_category_product (product_id, product_category_id)
  SELECT product_id, 'pcat_9turvv' FROM product_category_product WHERE product_category_id='pcat_9karivar'
  ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_9karivar';
SET LOCAL xl.redirect_target='v4-ehitus-remont-ja-varvid-ohutus-turvavored-ja-kokkupandavad-varavad';
UPDATE product_category SET deleted_at=NOW(), is_active=false, updated_at=NOW() WHERE id='pcat_9karivar';

-- ═══ MERGE #10 telk → Telgid Kuppel- ja mullitelgid ══════════════════════════
INSERT INTO product_category_product (product_id, product_category_id)
  SELECT product_id, 'pcat_8dome' FROM product_category_product WHERE product_category_id='pcat_12t2'
  ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_12t2';
SET LOCAL xl.redirect_target='v4-varjualused-telgid-ja-kasvuhooned-kuppel-mullitelgid';
UPDATE product_category SET deleted_at=NOW(), is_active=false, updated_at=NOW() WHERE id='pcat_12t2';

-- ═══ MERGE #11 vedru → Garaaž Garaažiukse osad ja vedrud ═════════════════════
INSERT INTO product_category_product (product_id, product_category_id)
  SELECT product_id, 'pcat_ag2_2_uks' FROM product_category_product WHERE product_category_id='pcat_es_9x3_6'
  ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_es_9x3_6';
SET LOCAL xl.redirect_target='v4-garaaziseadmed-garaaziuksed-uksed-osad-ja-vedrud';
UPDATE product_category SET deleted_at=NOW(), is_active=false, updated_at=NOW() WHERE id='pcat_es_9x3_6';

-- ═══ REPARENT #6 ekraan → Elektroonika Projektsioon ja kodukino ══════════════
UPDATE product_category SET
  parent_category_id='pcat_23proj',
  mpath='pcat_v4_l23.pcat_23proj.pcat_el_12x1_39',
  handle='v4-elektroonika-projektsioon-taispuhutavad-projektsiooniekraanid',
  description='Täispuhutavad projektsiooniekraanid välitingimustesse ja koju – õhuga täidetavad kinoekraanid õue-filmiõhtuteks. Projektoriekraani variant, mis püstitub kiiresti ja ei vaja raami. PIIRIREEGEL: raamiga/statiivil/seinale projektoriekraanid → Projektoriekraanid.',
  updated_at=NOW()
WHERE id='pcat_el_12x1_39';

-- ═══ RENAME #4 taignamikserid (kodu vs kommerts) ═════════════════════════════
UPDATE product_category SET
  name='Professionaalsed köögi- ja taignamikserid',
  handle='v4-suurkook-professionaalsed-koogi-ja-taignamikserid',
  description='Professionaalsed ja kommerts-köögi- ja taignamikserid suurköökidele ja pagaritöökodadele (suur kausimaht, pidev kasutus). PIIRIREEGEL: kodutarbija köögi- ja stand-mikserid → Kodumasinad Köögi- ja taignamikserid.',
  updated_at=NOW()
WHERE id='pcat_ks_5x1_12';
UPDATE product_category SET
  description='Kodutarbija köögi- ja taignamikserid: stand-mikserid ja käsimikserid igapäevaseks koduküpsetamiseks. PIIRIREEGEL: professionaalsed/kommerts-mahuga segajad → Suurköögiseadmed Professionaalsed köögi- ja taignamikserid.',
  updated_at=NOW()
WHERE id='pcat_4mikser';

-- ═══ RENAME #5 seinariiulid (garaaž/metall vs dekoratiivne/kodu) ═════════════
UPDATE product_category SET
  name='Metall-seinariiulid ja -restid',
  handle='v4-ladu-metall-seinariiulid-ja-restid',
  description='Raskekoormuslikud metall-seinariiulid ja -restid garaaži, töökoja ja lao seinale (teras, perforeeritud paneelid, tööriistaklambrid). PIIRIREEGEL: kodu-sisustuse dekoratiivsed seinariiulid → Mööbel Dekoratiivsed seinariiulid.',
  updated_at=NOW()
WHERE id='pcat_ag2_2x2_2';
UPDATE product_category SET
  name='Dekoratiivsed seinariiulid',
  handle='v4-moobel-ja-sisustus-riiulid-ja-hoiustamine-dekoratiivsed-seinariiulid',
  description='Kodu-sisustuse dekoratiivsed seinariiulid: ujuvad riiulid, klaas- ja puitriiulid elu- ja magamistuppa. PIIRIREEGEL: raskekoormuslikud metall garaaži-/laoriiulid → Ladu Metall-seinariiulid ja -restid.',
  updated_at=NOW()
WHERE id='pcat_mv_6x2_2';

-- ═══ RENAME #9 tolmuimejad (kodu vs tööstus/ehitus) ══════════════════════════
UPDATE product_category SET
  name='Tööstus- ja ehitustolmuimejad',
  handle='v4-tooriistad-ja-tarvikud-puhastustehnika-ja-tarvikud-toostus-ja-ehitustolmuimejad',
  description='Tööstus- ja ehitustolmuimejad (märg-kuiv shop-vac) töökotta ja ehitusplatsile: suur maht, jäme praht, tolmuklass. PIIRIREEGEL: kodutarbija tolmuimejad → Kodumasinad Kodutolmuimejad.',
  updated_at=NOW()
WHERE id='pcat_t3f_12_2';
UPDATE product_category SET
  name='Kodutolmuimejad',
  handle='v4-kodumasinad-ja-kodutehnika-puhastus-ja-koristustehnika-kodutolmuimejad',
  description='Kodutarbija tolmuimejad: varrega, robot- ja kompakt-tolmuimejad igapäevaseks koristuseks kodus. PIIRIREEGEL: töökoja/ehitus märg-kuiv shop-vac → Tööriistad Tööstus- ja ehitustolmuimejad.',
  updated_at=NOW()
WHERE id='pcat_ks_4x5_3';

-- ═══ RENAME + TOOTE-LIIGUTUS #7 membraanpumbad (12V elektri vs suruõhk) ══════
-- liiguta 1 suruõhk-pump Santehnika → Garaaž ENNE ümbernimetust (link-move, mitte handle)
INSERT INTO product_category_product (product_id, product_category_id)
  VALUES ('prod_01KNXX66PY1VP4VWX49516QNTA','pcat_ag2_2x4_4') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product
  WHERE product_id='prod_01KNXX66PY1VP4VWX49516QNTA' AND product_category_id='pcat_es_10x2_6';
UPDATE product_category SET
  name='12V membraan-veepumbad',
  handle='v4-santehnika-kute-ja-ventilatsioon-veepumbad-ja-vaakumpumbad-12v-membraan-veepumbad',
  description='12V DC elektrilised iseimevad membraan-veepumbad: survepumbad haagissuvilale, paadile, karavanile ja kastmisele (automaatne rõhulüliti). PIIRIREEGEL: suruõhu-/õhutoitel pneumaatilised membraanpumbad → Garaažiseadmed Pneumaatilised ja membraanpumbad.',
  updated_at=NOW()
WHERE id='pcat_es_10x2_6';
UPDATE product_category SET
  description='Pneumaatilised ja õhutoitel membraanpumbad töökotta ja garaaži: suruõhuga käitatavad diafragmapumbad vedelike ja õlide pumpamiseks. PIIRIREEGEL: 12V DC elektrilised iseimevad veepumbad → Santehnika 12V membraan-veepumbad.',
  updated_at=NOW()
WHERE id='pcat_ag2_2x4_4';

-- ── POST-GUARD (fail-loud) ───────────────────────────────────────────────────
DO $$
DECLARE pre_pub bigint; pre_orph bigint; now_pub bigint; now_orph bigint; k text;
  merged text[] := ARRAY['pcat_2kanist','pcat_t3a_8_11','pcat_9karivar','pcat_12t2','pcat_es_9x3_6'];
BEGIN
  SELECT pub, orphan INTO pre_pub, pre_orph FROM _a1_pre;
  -- merge-allikad: soft-deleted + 0 linki
  FOREACH k IN ARRAY merged LOOP
    IF EXISTS (SELECT 1 FROM product_category WHERE id=k AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'POST: % pole soft-deleted', k; END IF;
    IF EXISTS (SELECT 1 FROM product_category_product WHERE product_category_id=k) THEN
      RAISE EXCEPTION 'POST: %-l on veel linke', k; END IF;
  END LOOP;
  -- reparent
  IF NOT EXISTS (SELECT 1 FROM product_category WHERE id='pcat_el_12x1_39'
    AND parent_category_id='pcat_23proj' AND mpath='pcat_v4_l23.pcat_23proj.pcat_el_12x1_39'
    AND handle='v4-elektroonika-projektsioon-taispuhutavad-projektsiooniekraanid' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'POST: reparent pcat_el_12x1_39 ei õnnestunud'; END IF;
  -- renamed handled
  IF (SELECT count(*) FROM product_category WHERE id IN
    ('pcat_ks_5x1_12','pcat_ag2_2x2_2','pcat_mv_6x2_2','pcat_t3f_12_2','pcat_ks_4x5_3','pcat_es_10x2_6')
    AND handle LIKE 'v4-%' AND deleted_at IS NULL) <> 6 THEN
    RAISE EXCEPTION 'POST: ümbernimetused puudulikud'; END IF;
  -- suruõhk-pump liigutatud
  IF EXISTS (SELECT 1 FROM product_category_product
    WHERE product_id='prod_01KNXX66PY1VP4VWX49516QNTA' AND product_category_id='pcat_es_10x2_6') THEN
    RAISE EXCEPTION 'POST: suruõhk-pump veel Santehnikas'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product
    WHERE product_id='prod_01KNXX66PY1VP4VWX49516QNTA' AND product_category_id='pcat_ag2_2x4_4') THEN
    RAISE EXCEPTION 'POST: suruõhk-pump pole Garaažis'; END IF;
  -- 301-d loodud (5 merge + 7 rename/reparent handle)
  IF (SELECT count(*) FROM slug_redirect WHERE from_slug IN
    ('v4-garaaziseadmed-kutus-bensiinikanistrid','v4-aed-ja-aiatehnika-l8-taimede-kasvulambid',
     'v4-kaariturvavaravad','v4-sport-mull-sporditelgid','v4-ehitus-remont-ja-varvid-uksed-aknad-ja-luugid-garaaziuste-tihendid-ja-vedrud')) <> 5 THEN
    RAISE EXCEPTION 'POST: 5 merge-301 puudu'; END IF;
  IF (SELECT count(*) FROM slug_redirect WHERE from_slug IN
    ('v4-sport-ja-vaba-aeg-ouesport-ja-valimangud-taispuhutavad-projektsiooniekraanid',
     'v4-suurkook-koogi-taignamikserid','v4-ladu-seinariiulid',
     'v4-moobel-ja-sisustus-riiulid-ja-hoiustamine-seinariiulid',
     'v4-tooriistad-ja-tarvikud-puhastustehnika-ja-tarvikud-tolmuimejad',
     'v4-kodumasinad-ja-kodutehnika-puhastus-ja-koristustehnika-tolmuimejad',
     'v4-santehnika-kute-ja-ventilatsioon-veepumbad-ja-vaakumpumbad-membraanpumbad')) <> 7 THEN
    RAISE EXCEPTION 'POST: 7 rename-301 puudu'; END IF;
  -- LOSS-GUARD: published tootearv + orvud muutumatu
  SELECT count(*) INTO now_pub FROM product p WHERE p.status='published' AND p.deleted_at IS NULL;
  SELECT count(*) INTO now_orph FROM product p WHERE p.status='published' AND p.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM product_category_product x
      JOIN product_category c ON c.id=x.product_category_id AND c.deleted_at IS NULL
      WHERE x.product_id=p.id);
  IF now_pub <> pre_pub THEN RAISE EXCEPTION 'LOSS-GUARD: published % <> % enne', now_pub, pre_pub; END IF;
  IF now_orph <> pre_orph THEN RAISE EXCEPTION 'LOSS-GUARD: orvud % <> % enne (toode kaotas kategooria!)', now_orph, pre_orph; END IF;
  RAISE NOTICE 'A1 OK: published=% (muutumatu), orvud=% (muutumatu)', now_pub, now_orph;
END $$;

COMMIT;
