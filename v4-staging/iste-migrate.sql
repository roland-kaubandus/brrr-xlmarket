-- FAAS 4: #6 istme-koond (Taburetid split + Jalatsipingid + Pingid lammuta + ottoman + kokkupandav→#20)
BEGIN;
-- SAMM 1: Taburetid split
UPDATE product_category_product SET product_category_id='pcat_mv_6x3_5'
  WHERE product_category_id='pcat_mv_6x8_5' AND product_id IN (SELECT id FROM product WHERE title ~* 'kneeling|wobble');
UPDATE product_category SET name='Rull- ja sadultaburetid' WHERE id='pcat_mv_6x8_5';
-- SAMM 2: dedik. jalatsipingid (5) Hoiupingid-st -> Esikumööbel Jalatsipingid & istmed
UPDATE product_category_product SET product_category_id='pcat_mv_6x10_2'
  WHERE product_category_id='pcat_mv_6x6_7' AND product_id IN (SELECT id FROM product WHERE title ~* 'shoe storage|shoe organizer|shoes bench|rattan shoe bench');
-- SAMM 3: ottoman coffee table (3) Hoiupingid-st -> Diivanilauad (kahetised 4 jäävad)
UPDATE product_category_product SET product_category_id='pcat_mv_6x4_2'
  WHERE product_category_id='pcat_mv_6x6_7' AND product_id IN (SELECT id FROM product WHERE title ~* 'ottoman coffee table');
-- SAMM 4: Pingid lammuta
UPDATE product_category_product SET product_category_id='pcat_mv_6x10_2'
  WHERE product_category_id='pcat_mv_6x8_6' AND product_id IN (SELECT id FROM product WHERE title ~* 'rattan');
UPDATE product_category_product SET product_category_id='pcat_mv_6x6_7'
  WHERE product_category_id='pcat_mv_6x8_6' AND product_id IN (SELECT id FROM product WHERE title !~* 'rattan');
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_mv_6x8_6';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_mv_6x8_6';
-- SAMM 5: Kokkupandav laud -> #20 uus L3
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_20table','Kokkupandavad peolauad','','v4-peoinventar-kokkupandavad-peolauad',true,false,'pcat_20d','pcat_v4_l20.pcat_20d.pcat_20table',3,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_20table',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_20table' WHERE product_category_id='pcat_6klap';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_6klap';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_6klap';
COMMIT;
