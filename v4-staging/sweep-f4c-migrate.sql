-- Sweep FAAS 4c: #12 Kalastus L2 eraldus + 3 vale-paigutust
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;
-- SAMM 1: uus L2 Kalastus + 4 kalapüügi-L3 reparent Jaht-st
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_12fish','Kalastus','v4-sport-kalastus','pcat_v4_l12.pcat_12fish','pcat_v4_l12',17,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_12fish',2,'active','manual',true,0);
UPDATE product_category SET parent_category_id='pcat_12fish', mpath='pcat_v4_l12.pcat_12fish.pcat_el_12x6_9'  WHERE id='pcat_el_12x6_9';
UPDATE product_category SET parent_category_id='pcat_12fish', mpath='pcat_v4_l12.pcat_12fish.pcat_el_12x6_10' WHERE id='pcat_el_12x6_10';
UPDATE product_category SET parent_category_id='pcat_12fish', mpath='pcat_v4_l12.pcat_12fish.pcat_el_12x6_11' WHERE id='pcat_el_12x6_11';
UPDATE product_category SET parent_category_id='pcat_12fish', mpath='pcat_v4_l12.pcat_12fish.pcat_el_12x6_14' WHERE id='pcat_el_12x6_14';

-- SAMM 2: 3 vale-paigutust
-- 1. Stair Stepper -> Trepiastmelauad ja stepperid
UPDATE product_category_product SET product_category_id='pcat_el_12x3_26'
 WHERE product_category_id='pcat_el_12x3_5' AND product_id IN (SELECT id FROM product WHERE metadata->>'vevor_sku'='CZDSJYBSSXYDQSPE7V9');
-- 2. STEM klotsid -> Magnet- ja ehitusklotsid
UPDATE product_category_product SET product_category_id='pcat_el_12x2_14'
 WHERE product_category_id='pcat_el_12x2_3' AND product_id IN (SELECT id FROM product WHERE metadata->>'vevor_sku'='YKBCPDJMJQREXQP2UV9');
-- 3. 2 magnet-sweeper -> #1 Magnetpühkijad & magnetkoristajad
UPDATE product_category_product SET product_category_id='pcat_t3f_12_6'
 WHERE product_category_id='pcat_t3f_1_28' AND product_id IN (SELECT id FROM product WHERE metadata->>'vevor_sku' IN ('SCSCXQSQS35353C08V0','XGSCXQSQX6093J83BV0'));
COMMIT;
