-- FAAS 4: #12 külmakastid kommerts→#5 + passiiv-konsolideerimine
BEGIN;
-- SAMM 1: 9 kommerts Drop-in Ice Chest -> #5 Jääkastid
UPDATE product_category_product SET product_category_id='pcat_ks_5x2_19'
  WHERE product_category_id='pcat_t3a_4_5' AND product_id IN (SELECT id FROM product WHERE title ~* 'drop in ice chest');
-- SAMM 2: uus L2 + uus L3 Ujuvad
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_12cool','Külmakastid & jahutus','','v4-sport-kulmakastid-jahutus',true,false,'pcat_v4_l12','pcat_v4_l12.pcat_12cool',13,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_12cool',2,'active','manual',true,0,now(),now());
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_12cfloat','Ujuvad külmakastid','','v4-sport-ujuvad-kulmakastid',true,false,'pcat_12cool','pcat_v4_l12.pcat_12cool.pcat_12cfloat',4,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_12cfloat',3,'active','manual',true,0,now(),now());
-- SAMM 2a: dedup product-move'd
UPDATE product_category_product SET product_category_id='pcat_el_12x10_2'
  WHERE product_category_id='pcat_t3a_4_5' AND product_id IN (SELECT id FROM product WHERE title ~* 'rolling ice chest');
UPDATE product_category_product SET product_category_id='pcat_el_12x10_1'
  WHERE product_category_id='pcat_el_12x5_12' AND product_id IN (SELECT id FROM product WHERE title ~* 'hard cooler');
UPDATE product_category_product SET product_category_id='pcat_12cfloat'
  WHERE product_category_id='pcat_el_12x10_1' AND product_id IN (SELECT id FROM product WHERE title ~* 'floating');
-- SAMM 2b: reparent + rename
UPDATE product_category SET parent_category_id='pcat_12cool', mpath='pcat_v4_l12.pcat_12cool.pcat_el_12x5_12',  name='Pehmed jahutuskotid', rank=1 WHERE id='pcat_el_12x5_12';
UPDATE product_category SET parent_category_id='pcat_12cool', mpath='pcat_v4_l12.pcat_12cool.pcat_el_12x10_1', name='Kõvad kaasaskantavad külmakastid', rank=2 WHERE id='pcat_el_12x10_1';
UPDATE product_category SET parent_category_id='pcat_12cool', mpath='pcat_v4_l12.pcat_12cool.pcat_el_12x10_2', rank=3 WHERE id='pcat_el_12x10_2';
-- SAMM 2c: kustuta tühi t3a_4_5
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3a_4_5';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_t3a_4_5';
COMMIT;
