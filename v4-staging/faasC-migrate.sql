-- Suur struktuur FAAS C: uus main #21 "Büroo & kontoritarvikud" + marsruut ~124 + #6 puhastus
BEGIN;
-- SAMM 1: uus L1 main #21
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_v4_l21','Büroo & kontoritarvikud','','v4-buroo-ja-kontoritarvikud',true,false,NULL,'pcat_v4_l21',21,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_v4_l21',1,'active','manual',true,0,now(),now());
-- SAMM 2: 5 L2
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_21doc','Dokumendihaldus & organiseerijad','','v4-buroo-dokumendihaldus-organiseerijad',true,false,'pcat_v4_l21','pcat_v4_l21.pcat_21doc',1,now(),now()),
 ('pcat_21board','Tahvlid & teadetetahvlid','','v4-buroo-tahvlid',true,false,'pcat_v4_l21','pcat_v4_l21.pcat_21board',2,now(),now()),
 ('pcat_21cash','Raha & POS','','v4-buroo-raha-pos',true,false,'pcat_v4_l21','pcat_v4_l21.pcat_21cash',3,now(),now()),
 ('pcat_21lam','Laminaatorid & köitmine','','v4-buroo-laminaatorid-koitmine',true,false,'pcat_v4_l21','pcat_v4_l21.pcat_21lam',4,now(),now()),
 ('pcat_21supp','Kontoritarvikud & kulumaterjalid','','v4-buroo-kontoritarvikud',true,false,'pcat_v4_l21','pcat_v4_l21.pcat_21supp',5,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_21doc',2,'active','manual',true,0,now(),now()),('pcat_21board',2,'active','manual',true,0,now(),now()),
 ('pcat_21cash',2,'active','manual',true,0,now(),now()),('pcat_21lam',2,'active','manual',true,0,now(),now()),
 ('pcat_21supp',2,'active','manual',true,0,now(),now());
-- SAMM 3: reparent L3-d õigetesse #21 L2-desse (parent+mpath+handle+rank)
-- Dokumendihaldus
UPDATE product_category SET parent_category_id='pcat_21doc', mpath='pcat_v4_l21.pcat_21doc.pcat_mv_6x3_1',  handle='v4-buroo-dokumendisorteerijad-organisaatorid', rank=1 WHERE id='pcat_mv_6x3_1';
UPDATE product_category SET parent_category_id='pcat_21doc', mpath='pcat_v4_l21.pcat_21doc.pcat_mv_6x3_8',  handle='v4-buroo-brosuuri-ajakirjahoidikud',          rank=2 WHERE id='pcat_mv_6x3_8';
UPDATE product_category SET parent_category_id='pcat_21doc', mpath='pcat_v4_l21.pcat_21doc.pcat_mv_6x3_11', handle='v4-buroo-joonistehoidjad-restid',              rank=3 WHERE id='pcat_mv_6x3_11';
-- Tahvlid
UPDATE product_category SET parent_category_id='pcat_21board', mpath='pcat_v4_l21.pcat_21board.pcat_mv_6x3_7', handle='v4-buroo-tahvlid-teadetetahvlid', rank=1 WHERE id='pcat_mv_6x3_7';
-- Raha & POS
UPDATE product_category SET parent_category_id='pcat_21cash', mpath='pcat_v4_l21.pcat_21cash.pcat_mv_6x3_12', handle='v4-buroo-raha-mundiloendusmasinad',   rank=1 WHERE id='pcat_mv_6x3_12';
UPDATE product_category SET parent_category_id='pcat_21cash', mpath='pcat_v4_l21.pcat_21cash.pcat_5n17',      handle='v4-buroo-kassasahtlid-pos-tarvikud', rank=2 WHERE id='pcat_5n17';
-- Laminaatorid & köitmine
UPDATE product_category SET parent_category_id='pcat_21lam', mpath='pcat_v4_l21.pcat_21lam.pcat_13lam',  handle='v4-buroo-laminaatorid',    rank=1 WHERE id='pcat_13lam';
UPDATE product_category SET parent_category_id='pcat_21lam', mpath='pcat_v4_l21.pcat_21lam.pcat_13bind', handle='v4-buroo-koitmismasinad', rank=2 WHERE id='pcat_13bind';
-- Kontoritarvikud & kulumaterjalid
UPDATE product_category SET parent_category_id='pcat_21supp', mpath='pcat_v4_l21.pcat_21supp.pcat_6kont',        handle='v4-buroo-kontoritarvikud-kulumaterjalid', rank=1 WHERE id='pcat_6kont';
UPDATE product_category SET parent_category_id='pcat_21supp', mpath='pcat_v4_l21.pcat_21supp.pcat_13tape',       handle='v4-buroo-etiketi-lindid-materjalid',      rank=2 WHERE id='pcat_13tape';
UPDATE product_category SET parent_category_id='pcat_21supp', mpath='pcat_v4_l21.pcat_21supp.pcat_f4_13x3_6',    handle='v4-buroo-plotteri-paberirullid',          rank=3 WHERE id='pcat_f4_13x3_6';
UPDATE product_category SET parent_category_id='pcat_21supp', mpath='pcat_v4_l21.pcat_21supp.pcat_f4_13xtex_15', handle='v4-buroo-truki-termoprinterid',           rank=4 WHERE id='pcat_f4_13xtex_15';
-- Lauasahtlid & -alused (mööblitarvik) -> JÄÄB #6 Kontorimööbel
UPDATE product_category SET parent_category_id='pcat_v4_l6_3', mpath='pcat_v4_l6.pcat_v4_l6_3.pcat_mv_6x3_10',
  handle='v4-moobel-ja-sisustus-kontorimoobel-lauasahtlid-alused',
  rank=(SELECT coalesce(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l6_3' AND deleted_at IS NULL AND id<>'pcat_mv_6x3_10')
  WHERE id='pcat_mv_6x3_10';
-- SAMM 4: kustuta tühjaks jäänud #6 "Kontoritarvikud & organiseerijad" L2 (pcat_6ktarv)
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_6ktarv';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_6ktarv';
COMMIT;
