-- Sweep FAAS 4a: #7 Aiakärud grab-bag split (59) tüübiti
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;
-- 5 uut L3 (Aiatööriistad L2)
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_7cart1','ATV-haagised & järelkärud','v4-aed-atv-haagised-jarelkarud','pcat_v4_l7.pcat_v4_l7_1.pcat_7cart1','pcat_v4_l7_1',1,true,false),
 ('pcat_7cart2','Kallutuskärud','v4-aed-kallutuskarud','pcat_v4_l7.pcat_v4_l7_1.pcat_7cart2','pcat_v4_l7_1',2,true,false),
 ('pcat_7cart3','Rannakärud','v4-aed-rannakarud','pcat_v4_l7.pcat_v4_l7_1.pcat_7cart3','pcat_v4_l7_1',3,true,false),
 ('pcat_7cart4','Kokkupandavad veovankrid','v4-aed-kokkupandavad-veovankrid','pcat_v4_l7.pcat_v4_l7_1.pcat_7cart4','pcat_v4_l7_1',4,true,false),
 ('pcat_7cart5','Elektrilised aiakärud','v4-aed-elektrilised-aiakarud','pcat_v4_l7.pcat_v4_l7_1.pcat_7cart5','pcat_v4_l7_1',5,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_7cart1',3,'active','manual',true,0),('pcat_7cart2',3,'active','manual',true,0),('pcat_7cart3',3,'active','manual',true,0),
 ('pcat_7cart4',3,'active','manual',true,0),('pcat_7cart5',3,'active','manual',true,0);

-- Sekventsiaalne prioriteet-liigutus (igaüks lahkub pcat_t3a_1_1-st -> järgmine näeb ainult jääki)
-- 1. ATV-haagised
UPDATE product_category_product SET product_category_id='pcat_7cart1'
 WHERE product_category_id='pcat_t3a_1_1' AND product_id IN (SELECT p.id FROM product p WHERE p.title ~* 'utility trailer|tow.behind|tow behind|atv.{0,8}trailer|atv.{0,8}dump');
-- 2. Kallutuskärud
UPDATE product_category_product SET product_category_id='pcat_7cart2'
 WHERE product_category_id='pcat_t3a_1_1' AND product_id IN (SELECT p.id FROM product p WHERE p.title ~* 'dump cart|dump wagon|tipping');
-- 3. Elektrilised
UPDATE product_category_product SET product_category_id='pcat_7cart5'
 WHERE product_category_id='pcat_t3a_1_1' AND product_id IN (SELECT p.id FROM product p WHERE p.title ~* 'electric');
-- 4. Rannakärud
UPDATE product_category_product SET product_category_id='pcat_7cart3'
 WHERE product_category_id='pcat_t3a_1_1' AND product_id IN (SELECT p.id FROM product p WHERE p.title ~* 'beach cart|beach dolly|beach wagon|for sand');
-- 5. Kokkupandavad veovankrid
UPDATE product_category_product SET product_category_id='pcat_7cart4'
 WHERE product_category_id='pcat_t3a_1_1' AND product_id IN (SELECT p.id FROM product p WHERE p.title ~* 'folding|collapsible|foldable');

-- Jääk (15 Steel Garden Cart + plant dolly) -> rename "Aiakärud"
UPDATE product_category SET name='Aiakärud', handle='v4-aed-aiakarud' WHERE id='pcat_t3a_1_1';
COMMIT;
