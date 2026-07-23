-- Sweep FAAS 3b: #5 Nõudepesu L2 loomine; Veini-baaririiulid; humidorid->#6; komplektid split. #5 VALMIS.
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;

-- ===== SAMM 1: UUS L2 "Nõudepesu" + reparent nõudepesu-klaster =====
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_5wash','Nõudepesu','v4-suurkook-noudepesu','pcat_v4_l5.pcat_5wash','pcat_v4_l5',11,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_5wash',2,'active','manual',true,0);

UPDATE product_category SET parent_category_id='pcat_5wash', mpath='pcat_v4_l5.pcat_5wash.pcat_ks_5x4_3'  WHERE id='pcat_ks_5x4_3';
UPDATE product_category SET parent_category_id='pcat_5wash', mpath='pcat_v4_l5.pcat_5wash.pcat_ks_5x2_28' WHERE id='pcat_ks_5x2_28';
UPDATE product_category SET parent_category_id='pcat_5wash', mpath='pcat_v4_l5.pcat_5wash.pcat_5n19'      WHERE id='pcat_5n19';
UPDATE product_category SET parent_category_id='pcat_5wash', mpath='pcat_v4_l5.pcat_5wash.pcat_5n30'      WHERE id='pcat_5n30';
UPDATE product_category SET parent_category_id='pcat_5wash', mpath='pcat_v4_l5.pcat_5wash.pcat_5n31'      WHERE id='pcat_5n31';

-- Töölauad & valamud -> Töölauad & tööpinnad (jääk = töölauad)
UPDATE product_category SET name='Töölauad & tööpinnad', handle='v4-suurkook-toolauad-ja-toopinnad' WHERE id='pcat_5tool';

-- ===== SAMM 2: Veini- ja baaririiulid =====
UPDATE product_category SET name='Veini- ja baaririiulid', handle='v4-suurkook-veini-ja-baaririiulid' WHERE id='pcat_ks_5x2_22';

-- ===== SAMM 3: Humidorid -> #6 Mööbel "Riiulid & hoiustamine" =====
UPDATE product_category SET parent_category_id='pcat_v4_l6_2', mpath='pcat_v4_l6.pcat_v4_l6_2.pcat_ks_5x2_29', handle='v4-moobel-sigarikapid-ja-humidorid', rank=1 WHERE id='pcat_ks_5x2_29';

-- ===== SAMM 4: Köögitarvikute komplektid grab-bag split =====
-- ice ball tray + popsicle moulds (3) -> Jääpressid ja jäätarvikud (frozen-treat accessories)
UPDATE product_category_product SET product_category_id='pcat_ks_5x2_18'
 WHERE product_category_id='pcat_ks_5x2_10' AND product_id IN (
   SELECT p.id FROM product p WHERE p.metadata->>'vevor_sku' IN ('BQZZJHSTMBQ66DWGVV0','SYBBMJYX4000SWI99V0','SYBBMJZFX400HM5XAV0'));
-- crab cracker (1) -> Kokteili- ja baaritarvikud
UPDATE product_category_product SET product_category_id='pcat_ks_5x2_24'
 WHERE product_category_id='pcat_ks_5x2_10' AND product_id IN (
   SELECT p.id FROM product p WHERE p.metadata->>'vevor_sku'='QQJFXBDDWC609556RV0');
-- jääk = canning (4) -> rename "Konserveerimistarvikud"
UPDATE product_category SET name='Konserveerimistarvikud', handle='v4-suurkook-konserveerimistarvikud' WHERE id='pcat_ks_5x2_10';

COMMIT;
