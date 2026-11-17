-- SOOJENDID — VARIANT B (Tarmo 2026-11-17): koonda tööstuslik kütust-põletav
-- soojendi-pere ÜHTE L2-sse "Soojapuhurid ja kütteseadmed" Garaažiseadmete alla.
-- Kaart: reports/soojendusseadmed-kaart.md
--
-- MEETOD: TERVIK-REPARENT (3 homogeenset L3 liiguvad tervikuna, mitte toode-kaupa)
--   → tühja-L3 probleemi EI teki (kõik lingid liiguvad L3-ga kaasa).
-- ALLIKAS (3 L1 vahel laiali):
--   pcat_d9_1 Kaasaskantavad ruumisoojendid (10) — Santehnika/elektriküte (pcat_v4_l10)
--   pcat_d3_1 Sõiduki õhusoojendid (60)         — Auto/sõidukiküte      (pcat_v4_l3)
--   pcat_d3_2 Diiselsoojendi osad (22)          — Auto/sõidukiküte      (pcat_v4_l3)
-- SIHT: uus L2 pcat_2soojapuhur < pcat_v4_l2 (Garaažiseadmed ja autoremont)
-- NIMED (Tarmo 2026-11-17): Diisli- ja petrooleumi soojapuhurid / Autonoomsed
--   diiselsoojendid / Diiselsoojendite varuosad.  EN vastavalt (taxonomy_node_translation).
-- JÄÄB PUUTUMATA: kasvuhoone kütteseadmed (4) aia-domeenis.
-- 301: handle-muutus → DB-trigger trg_product_category_slug_redirect loob rename-redirecti.
-- Cross-list Auto alla = Phase-2.

\set ON_ERROR_STOP on
BEGIN;

-- ── GUARD'id (fail-loud, enne muudatust) ─────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM product_category WHERE id = 'pcat_2soojapuhur') THEN
    RAISE EXCEPTION 'GUARD: id pcat_2soojapuhur on juba olemas';
  END IF;
  IF EXISTS (SELECT 1 FROM product_category
             WHERE deleted_at IS NULL AND handle IN (
               'v4-garaaziseadmed-soojapuhurid-ja-kutteseadmed',
               'v4-garaaziseadmed-diisli-petrooleumi-soojapuhurid',
               'v4-garaaziseadmed-autonoomsed-diiselsoojendid',
               'v4-garaaziseadmed-diiselsoojendite-varuosad')) THEN
    RAISE EXCEPTION 'GUARD: uue L2/L3 handle kollisioon';
  END IF;
  IF (SELECT count(*) FROM product_category
      WHERE id IN ('pcat_d3_1','pcat_d3_2','pcat_d9_1') AND deleted_at IS NULL) <> 3 THEN
    RAISE EXCEPTION 'GUARD: allikas-L3 ei ole 3 (oodatud pcat_d3_1/d3_2/d9_1)';
  END IF;
  IF EXISTS (SELECT 1 FROM product_category
             WHERE parent_category_id IN ('pcat_d3_1','pcat_d3_2','pcat_d9_1') AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'GUARD: allikas-L3-l on lapsi (pole leaf) — mpath-kaskaad vajalik';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category WHERE id = 'pcat_v4_l2' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'GUARD: siht-L1 pcat_v4_l2 puudub';
  END IF;
END $$;

-- ── 1. UUS L2 "Soojapuhurid ja kütteseadmed" ────────────────────────────────
INSERT INTO product_category
  (id, name, description, handle, mpath, is_active, is_internal, rank, parent_category_id, created_at, updated_at)
VALUES
  ('pcat_2soojapuhur',
   'Soojapuhurid ja kütteseadmed',
   'Soojapuhurid ja kütteseadmed garaažile, töökojale ja sõidukile: kütust-põletavad soojapuhurid, autonoomsed diiselsoojendid ning nende varuosad. Kasvuhoone- ja aiakütteseadmed leiad Aiatehnika alt.',
   'v4-garaaziseadmed-soojapuhurid-ja-kutteseadmed',
   'pcat_v4_l2.pcat_2soojapuhur',
   true, false, 15, 'pcat_v4_l2', NOW(), NOW());

INSERT INTO taxonomy_node_translation (node_id, locale, name, created_at, updated_at)
VALUES ('pcat_2soojapuhur', 'en', 'Space Heaters & Heating Equipment', NOW(), NOW())
ON CONFLICT (node_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

-- ── 2. Diisli- ja petrooleumi soojapuhurid (endine Kaasaskantavad ruumisoojendid) ──
UPDATE product_category SET
  parent_category_id = 'pcat_2soojapuhur',
  mpath   = 'pcat_v4_l2.pcat_2soojapuhur.pcat_d9_1',
  name    = 'Diisli- ja petrooleumi soojapuhurid',
  handle  = 'v4-garaaziseadmed-diisli-petrooleumi-soojapuhurid',
  rank    = 1,
  description = 'Kütust põletavad kaasaskantavad soojapuhurid (torpeedo-tüüpi) garaaži, töökoja, lao ja ehitusplatsi soojendamiseks. Kütus: diisel või petrooleum (põleb seadmes). Pinge: 230 V (ainult puhur/süüde). Võimsus: ~10–50 kW. Paigaldus: vabalt seisev, ratastel, otse- või kaudpõletus. Sihtruum: suur/avatud tööruum, garaaž, ladu, väliala. EI KUULU SIIA: 12 V/24 V autonoomsed diiselsoojendid (→ Autonoomsed diiselsoojendid), varuosad (→ Diiselsoojendite varuosad), elektri- ega gaasisoojendid.',
  updated_at = NOW()
WHERE id = 'pcat_d9_1';

UPDATE taxonomy_node_translation SET name = 'Diesel & Kerosene Forced-Air Heaters', updated_at = NOW()
WHERE node_id = 'pcat_d9_1' AND locale = 'en';

-- ── 3. Autonoomsed diiselsoojendid (endine Sõiduki õhusoojendid) ─────────────
UPDATE product_category SET
  parent_category_id = 'pcat_2soojapuhur',
  mpath   = 'pcat_v4_l2.pcat_2soojapuhur.pcat_d3_1',
  name    = 'Autonoomsed diiselsoojendid',
  handle  = 'v4-garaaziseadmed-autonoomsed-diiselsoojendid',
  rank    = 2,
  description = 'Autonoomsed diiselsoojendid (parkimissoojendid, webasto-tüüpi) sõiduki- ja väikeruumi kütteks. Kütus: diisel (eraldi paak). Pinge: 12 V / 24 V (elektritoide puhuri ja juhtimise jaoks). Võimsus: ~2–8 kW. Paigaldus: statsionaarne/sisseehitatav, õhukanaliga. Sihtruum: sõidukikabiin, veok, matkaauto, haagissuvila, paat, väikeruum. EI KUULU SIIA: kütust-põletavad soojapuhurid (→ Diisli- ja petrooleumi soojapuhurid), varuosad (→ Diiselsoojendite varuosad), jahutus (→ Sõiduki konditsioneerid).',
  updated_at = NOW()
WHERE id = 'pcat_d3_1';

UPDATE taxonomy_node_translation SET name = 'Standalone Diesel Air Heaters', updated_at = NOW()
WHERE node_id = 'pcat_d3_1' AND locale = 'en';

-- ── 4. Diiselsoojendite varuosad (endine Diiselsoojendi osad) ────────────────
UPDATE product_category SET
  parent_category_id = 'pcat_2soojapuhur',
  mpath   = 'pcat_v4_l2.pcat_2soojapuhur.pcat_d3_2',
  name    = 'Diiselsoojendite varuosad',
  handle  = 'v4-garaaziseadmed-diiselsoojendite-varuosad',
  rank    = 3,
  description = 'Diiselsoojendite (parkimissoojendite) varu- ja remondiosad: hõõgküünla remondikomplektid, kütuse doseerpumbad, õhukanalid ja ühendused, summutid, kontrollerid/termostaadid. Kuuluvad siia seadme-komponendid. EI KUULU SIIA: terviklikud soojendid (→ Autonoomsed diiselsoojendid / Diisli- ja petrooleumi soojapuhurid).',
  updated_at = NOW()
WHERE id = 'pcat_d3_2';

UPDATE taxonomy_node_translation SET name = 'Diesel Heater Spare Parts', updated_at = NOW()
WHERE node_id = 'pcat_d3_2' AND locale = 'en';

COMMIT;
