-- SOOJENDID VARIANT B — UNDO (taasta algseis enne 2026-11-17 lukku).
-- Taastab 3 L3 algse vanema/mpath/nime/handle/kirjelduse + EN-nime, kustutab uue L2.
-- Handle-muutus tagasi → trigger loob reverse-redirecti + chain-collapse puhastab forward'i;
-- lõpus eksplitsiitne slug_redirect koristus uute handle'ite jaoks.

\set ON_ERROR_STOP on
BEGIN;

-- 1. Diisli- ja petrooleumi soojapuhurid → tagasi Kaasaskantavad ruumisoojendid (Santehnika)
UPDATE product_category SET
  parent_category_id = 'pcat_10elheat',
  mpath   = 'pcat_v4_l10.pcat_10elheat.pcat_d9_1',
  name    = 'Kaasaskantavad ruumisoojendid',
  handle  = 'v4-kaasaskantavad-ruumisoojendid',
  rank    = 3,
  description = 'Kaasaskantavad ruumisoojendid ruumi/garaaži/töökoja soojendamiseks: petrooleumi- ja diislikütte torpeedo-soojapuhurid (forced air kerosene/diesel torpedo heater), radiaatortüüpi petrooleumisoojendid (radiant kerosene heater), kütteseadmed ratastega. EI sisalda seinale paigaldatavaid konvektoreid (need: Konvektorid).',
  updated_at = NOW()
WHERE id = 'pcat_d9_1';
UPDATE taxonomy_node_translation SET name = 'Portable Space Heaters', updated_at = NOW()
WHERE node_id = 'pcat_d9_1' AND locale = 'en';

-- 2. Autonoomsed diiselsoojendid → tagasi Sõiduki õhusoojendid (Auto)
UPDATE product_category SET
  parent_category_id = 'pcat_3kute',
  mpath   = 'pcat_v4_l3.pcat_3kute.pcat_d3_1',
  name    = 'Sõiduki õhusoojendid',
  handle  = 'v4-autovaruosad-ja-tarvikud-kute-soiduki-ohusoojendid',
  rank    = 1,
  description = 'Sõiduki õhukütteseadmed salongi/kabiini soojendamiseks: diisel-parkimissoojendid (diesel air heater, parking heater), kõik-ühes diiselsoojendid LCD-lüliti ja puldiga (all-in-one diesel heater). EI sisalda varuosi (need: Diiselsoojendi osad) ega jahutust (need: Sõiduki konditsioneerid).',
  updated_at = NOW()
WHERE id = 'pcat_d3_1';
UPDATE taxonomy_node_translation SET name = 'Parking Heaters', updated_at = NOW()
WHERE node_id = 'pcat_d3_1' AND locale = 'en';

-- 3. Diiselsoojendite varuosad → tagasi Diiselsoojendi osad (Auto)
UPDATE product_category SET
  parent_category_id = 'pcat_3kute',
  mpath   = 'pcat_v4_l3.pcat_3kute.pcat_d3_2',
  name    = 'Diiselsoojendi osad',
  handle  = 'v4-autovaruosad-ja-tarvikud-kute-diiselsoojendi-osad',
  rank    = 2,
  description = 'Diisel-parkimissoojendi varu- ja remondiosad: hõõgküünla remondikomplektid (glow plug repair kit), kütuse doseerpumbad (fuel dosing pump), õhutoru ühendused ja jagajad (duct connector), termostaadi/kontrolleri lülitid (controller thermostat). EI sisalda terviklikke soojendeid (need: Sõiduki õhusoojendid).',
  updated_at = NOW()
WHERE id = 'pcat_d3_2';
UPDATE taxonomy_node_translation SET name = 'Diesel Heater Parts', updated_at = NOW()
WHERE node_id = 'pcat_d3_2' AND locale = 'en';

-- 4. Kustuta uue L2 EN-tõlge + L2 ise (tühi → ohutu)
DELETE FROM taxonomy_node_translation WHERE node_id = 'pcat_2soojapuhur';
DELETE FROM product_category WHERE id = 'pcat_2soojapuhur';

-- 5. Koristus: eemalda uute handle'itega seotud redirectid (forward + reverse)
DELETE FROM slug_redirect WHERE from_slug IN (
  'v4-garaaziseadmed-soojapuhurid-ja-kutteseadmed',
  'v4-garaaziseadmed-diisli-petrooleumi-soojapuhurid',
  'v4-garaaziseadmed-autonoomsed-diiselsoojendid',
  'v4-garaaziseadmed-diiselsoojendite-varuosad'
) OR to_slug IN (
  'v4-garaaziseadmed-soojapuhurid-ja-kutteseadmed',
  'v4-garaaziseadmed-diisli-petrooleumi-soojapuhurid',
  'v4-garaaziseadmed-autonoomsed-diiselsoojendid',
  'v4-garaaziseadmed-diiselsoojendite-varuosad'
);

COMMIT;
