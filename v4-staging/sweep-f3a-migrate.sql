-- Sweep FAAS 3a: #9 trepi-micro; #5 valamud koond + kubu koond + klaasipoleerimine rename
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;

-- ===== SAMM 1: #9 TREPI-MICRO (9 lekkinud -> naaber-L3-d) =====
-- balusters -> Trepibalustrid
UPDATE product_category_product SET product_category_id='pcat_es_9x5_2'
 WHERE product_category_id='pcat_es_9x5_1' AND product_id IN (
   SELECT pcp.product_id FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
   WHERE pcp.product_category_id='pcat_es_9x5_1' AND p.title ~* 'baluster');
-- cable railing posts -> Trepikäsipuu postid
UPDATE product_category_product SET product_category_id='pcat_es_9x5_4'
 WHERE product_category_id='pcat_es_9x5_1' AND product_id IN (
   SELECT pcp.product_id FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
   WHERE pcp.product_category_id='pcat_es_9x5_1' AND p.title ~* 'cable rail');

-- ===== SAMM 2: #5 VALAMUD KOOND -> "Roostevabast terasest valamud"; carve Käsipesuvalamud =====
-- Uus Käsipesuvalamud
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_5n30','Käsipesuvalamud','v4-suurkook-kasipesuvalamud','pcat_v4_l5.pcat_5tool.pcat_5n30','pcat_5tool',5,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_5n30',3,'active','manual',true,0);
-- carve 2 hand sinks Roostevabast -> Käsipesuvalamud
UPDATE product_category_product SET product_category_id='pcat_5n30'
 WHERE product_category_id='pcat_ks_5x4_3' AND product_id IN (
   SELECT p.id FROM product p WHERE p.metadata->>'vevor_sku' IN ('SYXSPWDSB1410KV62V0','SYXSPYDSB14104S2GV0'));
-- merge Köögivalamud (5x4_1) + Kommertsköögi valamud (5x4_2) -> Roostevabast (5x4_3)
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_ks_5x4_1' AND b.product_category_id='pcat_ks_5x4_3' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_ks_5x4_3' WHERE product_category_id='pcat_ks_5x4_1';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ks_5x4_1';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_ks_5x4_1';

DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_ks_5x4_2' AND b.product_category_id='pcat_ks_5x4_3' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_ks_5x4_3' WHERE product_category_id='pcat_ks_5x4_2';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ks_5x4_2';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_ks_5x4_2';

-- ===== SAMM 3: #5 VENTILATSIOONIKUBU KOOND -> Õhupuhasti filtrid ja tõmbekubud (5n7) =====
-- pcat_5n6 (1 hood) -> 5n7
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_5n6' AND b.product_category_id='pcat_5n7' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_5n7' WHERE product_category_id='pcat_5n6';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_5n6';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_5n6';
-- hood 'Noad ja noakomplektid' (5x2_11) -> 5n7
UPDATE product_category_product SET product_category_id='pcat_5n7'
 WHERE product_category_id='pcat_ks_5x2_11' AND product_id IN (
   SELECT p.id FROM product p WHERE p.metadata->>'vevor_sku'='SYPYZYC7050HPWLY5V0');

-- ===== SAMM 4: #5 KLAASIPOLEERIMINE — rename washer + carve polisher =====
UPDATE product_category SET name='Klaasipesumasinad', handle='v4-suurkook-klaasipesumasinad' WHERE id='pcat_ks_5x2_28';
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_5n31','Klaasipoleerimismasinad','v4-suurkook-klaasipoleerimismasinad','pcat_v4_l5.pcat_5tool.pcat_5n31','pcat_5tool',6,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_5n31',3,'active','manual',true,0);
UPDATE product_category_product SET product_category_id='pcat_5n31'
 WHERE product_category_id='pcat_ks_5x2_28' AND product_id IN (
   SELECT p.id FROM product p WHERE p.metadata->>'vevor_sku' IN ('DDCBJ5GST000423YNV2','DDCBJ8GST000Q1RYQV2'));

COMMIT;
