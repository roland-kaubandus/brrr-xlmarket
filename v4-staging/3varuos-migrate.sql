-- #3 auto-elekter L4: Varuosad-puhastus (kliima-kompressorid sisse; tarvikud välja)
-- 2026-07-04 · STAGING taxonomy-v4 · TÖÖVERSIOON-nimed
BEGIN;
-- SAMM 1: Kliimaseadme kompressorid (AC Compressor varuosa) Sõiduki küte&kliima -> Autovaruosad + rename
UPDATE product_category SET parent_category_id='pcat_v4_l3_4', mpath='pcat_v4_l3.pcat_v4_l3_4.pcat_ag2_3x4_18',
       name='Kliimapumbad & -kompressorid', handle='v4-autovaruosad-kliimapumbad-kompressorid', rank=1 WHERE id='pcat_ag2_3x4_18';

-- SAMM 2: TARVIKUD VÄLJA
-- Kütusekanistrid (Fuel Container/Diesel Tank, tarvik) -> Veoauto tarvikud L2
UPDATE product_category SET parent_category_id='pcat_v4_l3_2', mpath='pcat_v4_l3.pcat_v4_l3_2.pcat_ag2_3x4_1', rank=1 WHERE id='pcat_ag2_3x4_1';
-- Autopesu filtrid ja täited (DI Water System, car wash tarvik) -> Veoauto tarvikud L2
UPDATE product_category SET parent_category_id='pcat_v4_l3_2', mpath='pcat_v4_l3.pcat_v4_l3_2.pcat_ag2_3x4_20', rank=2 WHERE id='pcat_ag2_3x4_20';
-- Toruuksed (Jeep Tube Doors) -> merge Välistarvikud "Jeep/maasturi välisosad" (dup)
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_ag2_3x4_19' AND b.product_category_id='pcat_vt_3' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_vt_3' WHERE product_category_id='pcat_ag2_3x4_19';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ag2_3x4_19';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_ag2_3x4_19';
COMMIT;
