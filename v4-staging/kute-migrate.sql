-- FAAS 4: #10 küte-L2 split + Gas Cylinder Warmer -> #2 Kütusekäitlus
BEGIN;
-- SAMM 1: uus L3 #2 "Gaasiballooni soojendid" + 2 Gas Warmer sinna
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_2gas','Gaasiballooni soojendid','','v4-garaaz-gaasiballooni-soojendid',true,false,'pcat_2kytus','pcat_v4_l2.pcat_2kytus.pcat_2gas',10,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_2gas',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_2gas'
  WHERE product_category_id='pcat_10kab' AND product_id IN ('prod_01KNXXFSX0EK48SYFTXDFCVCWR','prod_01KNXXFS084HS8G763MPAQDRV2');

-- SAMM 2: 2 uut L2 #10 all
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_10floor','Põrandaküte & küttekaablid','','v4-santehnika-porandakute-kuttekaablid',true,false,'pcat_v4_l10','pcat_v4_l10.pcat_10floor',10,now(),now()),
 ('pcat_10elheat','Rätikukuivatid & elektriküte','','v4-santehnika-ratikukuivatid-elektrikute',true,false,'pcat_v4_l10','pcat_v4_l10.pcat_10elheat',11,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_10floor',2,'active','manual',true,0,now(),now()),('pcat_10elheat',2,'active','manual',true,0,now(),now());

-- SAMM 3: reparent L3-d
-- Põrandaküte & küttekaablid
UPDATE product_category SET parent_category_id='pcat_10floor', mpath='pcat_v4_l10.pcat_10floor.pcat_es_10x1_21', rank=1 WHERE id='pcat_es_10x1_21';
UPDATE product_category SET parent_category_id='pcat_10floor', mpath='pcat_v4_l10.pcat_10floor.pcat_es_10x1_22', rank=2 WHERE id='pcat_es_10x1_22';
UPDATE product_category SET parent_category_id='pcat_10floor', mpath='pcat_v4_l10.pcat_10floor.pcat_10kab',      rank=3 WHERE id='pcat_10kab';
UPDATE product_category SET parent_category_id='pcat_10floor', mpath='pcat_v4_l10.pcat_10floor.pcat_10term',     rank=4 WHERE id='pcat_10term';
-- Rätikukuivatid & elektriküte
UPDATE product_category SET parent_category_id='pcat_10elheat', mpath='pcat_v4_l10.pcat_10elheat.pcat_10rat',  rank=1 WHERE id='pcat_10rat';
UPDATE product_category SET parent_category_id='pcat_10elheat', mpath='pcat_v4_l10.pcat_10elheat.pcat_10cov',  rank=2 WHERE id='pcat_10cov';
UPDATE product_category SET parent_category_id='pcat_10elheat', mpath='pcat_v4_l10.pcat_10elheat.pcat_10konv', rank=3 WHERE id='pcat_10konv';

-- SAMM 4: vana L2 tühjaks -> kustuta
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_10rad';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_10rad';
COMMIT;
