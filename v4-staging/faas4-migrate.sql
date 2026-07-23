-- Suur struktuur FAAS 4: uus main #23 Elektroonika & multimeedia
BEGIN;
-- SAMM 1: L1 #23
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_v4_l23','Elektroonika & multimeedia','','v4-elektroonika-ja-multimeedia',true,false,NULL,'pcat_v4_l23',23,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_v4_l23',1,'active','manual',true,0,now(),now());
-- SAMM 2: 7 L2
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_23proj','Projektsioon & kodukino','','v4-elektroonika-projektsioon',true,false,'pcat_v4_l23','pcat_v4_l23.pcat_23proj',1,now(),now()),
 ('pcat_23audio','Heli & kõlarid','','v4-elektroonika-heli',true,false,'pcat_v4_l23','pcat_v4_l23.pcat_23audio',2,now(),now()),
 ('pcat_23foto','Foto & video','','v4-elektroonika-foto-video',true,false,'pcat_v4_l23','pcat_v4_l23.pcat_23foto',3,now(),now()),
 ('pcat_23pc','Arvutiriistvara','','v4-elektroonika-arvutiriistvara',true,false,'pcat_v4_l23','pcat_v4_l23.pcat_23pc',4,now(),now()),
 ('pcat_23net','Võrk & satelliit','','v4-elektroonika-vork',true,false,'pcat_v4_l23','pcat_v4_l23.pcat_23net',5,now(),now()),
 ('pcat_23smart','Nutikodu & ilm','','v4-elektroonika-nutikodu',true,false,'pcat_v4_l23','pcat_v4_l23.pcat_23smart',6,now(),now()),
 ('pcat_23mount','TV- & monitorikinnitused','','v4-elektroonika-kinnitused',true,false,'pcat_v4_l23','pcat_v4_l23.pcat_23mount',7,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_23proj',2,'active','manual',true,0,now(),now()),('pcat_23audio',2,'active','manual',true,0,now(),now()),
 ('pcat_23foto',2,'active','manual',true,0,now(),now()),('pcat_23pc',2,'active','manual',true,0,now(),now()),
 ('pcat_23net',2,'active','manual',true,0,now(),now()),('pcat_23smart',2,'active','manual',true,0,now(),now()),
 ('pcat_23mount',2,'active','manual',true,0,now(),now());

-- SAMM 3: reparent 17 L3 (hoia handle, uus parent+mpath)
UPDATE product_category SET parent_category_id='pcat_23proj', mpath='pcat_v4_l23.pcat_23proj.'||id  WHERE id IN ('pcat_el_11x1_1','pcat_el_11x1_20');
UPDATE product_category SET parent_category_id='pcat_23audio',mpath='pcat_v4_l23.pcat_23audio.'||id WHERE id IN ('pcat_el_11x1_3','pcat_el_11x1_21','pcat_el_11x1_25');
UPDATE product_category SET parent_category_id='pcat_23foto', mpath='pcat_v4_l23.pcat_23foto.'||id  WHERE id IN ('pcat_el_11x1_10','pcat_el_11x1_12','pcat_el_11x1_22','pcat_el_11x1_23','pcat_el_11x1_13');
UPDATE product_category SET parent_category_id='pcat_23pc',   mpath='pcat_v4_l23.pcat_23pc.'||id    WHERE id IN ('pcat_el_11x1_19','pcat_el_11x1_6');
UPDATE product_category SET parent_category_id='pcat_23net',  mpath='pcat_v4_l23.pcat_23net.'||id   WHERE id='pcat_el_11x1_4';
UPDATE product_category SET parent_category_id='pcat_23smart',mpath='pcat_v4_l23.pcat_23smart.'||id WHERE id IN ('pcat_el_11x1_18','pcat_el_11x1_16');
UPDATE product_category SET parent_category_id='pcat_23mount',mpath='pcat_v4_l23.pcat_23mount.'||id WHERE id IN ('pcat_el_11x1_17','pcat_el_11x1_15');

-- SAMM 4: FLAG-routing
-- Kiudoptika keevitusseadmed (4) -> #1 pcat_1fiber (MERGE, kustuta L3)
UPDATE product_category_product SET product_category_id='pcat_1fiber' WHERE product_category_id='pcat_el_11x1_11';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_el_11x1_11';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_el_11x1_11';
-- Termoprinterid (5) -> #22 Pakendamine (reparent)
UPDATE product_category SET parent_category_id='pcat_22pack', mpath='pcat_v4_l22.pcat_22pack.pcat_el_11x1_7' WHERE id='pcat_el_11x1_7';
-- Tööajaarvestuse terminalid (3) -> #21 Raha & POS (reparent)
UPDATE product_category SET parent_category_id='pcat_21cash', mpath='pcat_v4_l21.pcat_21cash.pcat_el_11x1_14' WHERE id='pcat_el_11x1_14';
-- Lülitid & nupud (3) -> JÄÄ #11 Toitejaotus & jaotussüsteemid (reparent)
UPDATE product_category SET parent_category_id='pcat_v4_l11_7', mpath='pcat_v4_l11.pcat_v4_l11_7.pcat_11switch' WHERE id='pcat_11switch';

-- SAMM 5: #11 Elektroonika L2 tühjaks -> kustuta
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_v4_l11_1';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_v4_l11_1';
COMMIT;
