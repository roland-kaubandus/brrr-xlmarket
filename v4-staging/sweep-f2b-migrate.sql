-- Sweep FAAS 2b: #10 baseboard-katted eralda (SAMM 2). SAMM 1 (CNC) + SAMM 3 (torutoed) = FLAG.
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;

-- Uus L3 "Põrandaliistkütte katted" (Radiaatorid & küttekehad L2)
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_10cov','Põrandaliistkütte katted','v4-santehnika-porandaliistkutte-katted','pcat_v4_l10.pcat_10rad.pcat_10cov','pcat_10rad',8,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_10cov',3,'active','manual',true,0);

-- 8 Baseboard Heater Covers -> uus katte-L3
UPDATE product_category_product SET product_category_id='pcat_10cov'
 WHERE product_category_id='pcat_10konv'
   AND product_id IN (SELECT pcp.product_id FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
                      WHERE pcp.product_category_id='pcat_10konv' AND p.title ~* 'baseboard heater cover');

-- pcat_10konv jääk = 1 Convection Panel Heater -> rename "Konvektorid"
UPDATE product_category SET name='Konvektorid', handle='v4-santehnika-kute-ja-ventilatsioon-konvektorid' WHERE id='pcat_10konv';

COMMIT;
