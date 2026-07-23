-- Sweep FAAS 4b: #1 Kaablitööriistad + Survepesuri-tarvikud grab-bag split
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;
-- ===== SAMM 1: Kaablitööriistad (29) split =====
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_1cab1','Kaablitõmbelindid & -tõmburid','v4-tooriistad-kaablitombelindid-tomburid','pcat_v4_l1.pcat_t3l2_2.pcat_1cab1','pcat_t3l2_2',11,true,false),
 ('pcat_1cab2','Termotoru-lõikurid','v4-tooriistad-termotoru-loikurid','pcat_v4_l1.pcat_t3l2_2.pcat_1cab2','pcat_t3l2_2',12,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_1cab1',3,'active','manual',true,0),('pcat_1cab2',3,'active','manual',true,0);
-- TÕMBE -> cab1
UPDATE product_category_product SET product_category_id='pcat_1cab1'
 WHERE product_category_id='pcat_kt1' AND product_id IN (SELECT p.id FROM product p WHERE p.title ~* 'fish tape|cable puller|pulling|puller|pull tape|draw wire|running wire');
-- TERMOTORU -> cab2
UPDATE product_category_product SET product_category_id='pcat_1cab2'
 WHERE product_category_id='pcat_kt1' AND product_id IN (SELECT p.id FROM product p WHERE p.title ~* 'heat shrink|tube cutter|tubing cutter');
-- jääk (14 wire stripper) -> rename "Juhtmekoorimismasinad"
UPDATE product_category SET name='Juhtmekoorimismasinad', handle='v4-tooriistad-juhtmekoorimismasinad' WHERE id='pcat_kt1';
-- Kaablitõmbevahendid (pcat_t3f_10_23, Tõsteseadmed, 5 pull tape) -> merge cab1
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_t3f_10_23' AND b.product_category_id='pcat_1cab1' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_1cab1' WHERE product_category_id='pcat_t3f_10_23';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3f_10_23';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_t3f_10_23';

-- ===== SAMM 2: Survepesuri tarvikud (28) split =====
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_1surv1','Survepesuri voolikud & otsakud','v4-tooriistad-survepesuri-voolikud-otsakud','pcat_v4_l1.pcat_t3l2_12.pcat_1surv1','pcat_t3l2_12',1,true,false),
 ('pcat_1surv2','Survepesuri pumbad','v4-tooriistad-survepesuri-pumbad','pcat_v4_l1.pcat_t3l2_12.pcat_1surv2','pcat_t3l2_12',2,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_1surv1',3,'active','manual',true,0),('pcat_1surv2',3,'active','manual',true,0);
-- PUMP -> surv2
UPDATE product_category_product SET product_category_id='pcat_1surv2'
 WHERE product_category_id='pcat_t3h_12_1' AND product_id IN (SELECT p.id FROM product p WHERE p.title ~* 'pump' AND p.title !~* 'surface cleaner');
-- VOOLIK/OTSAK -> surv1
UPDATE product_category_product SET product_category_id='pcat_1surv1'
 WHERE product_category_id='pcat_t3h_12_1' AND product_id IN (SELECT p.id FROM product p WHERE p.title ~* 'hose|nozzle|lance|wand|spray gun|coupler|fitting|extension' AND p.title !~* 'surface cleaner');
-- jääk (17 surface cleaner) -> rename "Survepesuri pinnapuhastid"
UPDATE product_category SET name='Survepesuri pinnapuhastid', handle='v4-tooriistad-survepesuri-pinnapuhastid' WHERE id='pcat_t3h_12_1';
COMMIT;
