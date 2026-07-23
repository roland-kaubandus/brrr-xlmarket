-- Suur üle-käik FAAS 2: #6 Mööbel puhastus
BEGIN;
-- ===== SAMM 1: UTILITAARNE -> #22 Ladu (reparent) =====
UPDATE product_category SET parent_category_id='pcat_22box',  mpath='pcat_v4_l22.pcat_22box.pcat_mv_6x2_12', handle='v4-ladu-pesukorvid-sorteerijad',        rank=7 WHERE id='pcat_mv_6x2_12';
UPDATE product_category SET parent_category_id='pcat_22shelf',mpath='pcat_v4_l22.pcat_22shelf.pcat_mv_6x2_11',handle='v4-ladu-pesumasina-pealsed-riiulid',    rank=10 WHERE id='pcat_mv_6x2_11';
UPDATE product_category SET parent_category_id='pcat_22cab',  mpath='pcat_v4_l22.pcat_22cab.pcat_mv_6_pull',  handle='v4-ladu-valjatommatavad-kapiorganiserid', rank=6 WHERE id='pcat_mv_6_pull';
UPDATE product_category SET parent_category_id='pcat_22cab',  mpath='pcat_v4_l22.pcat_22cab.pcat_6pull2',     handle='v4-ladu-nurgakapi-organiserid',           rank=7 WHERE id='pcat_6pull2';
UPDATE product_category SET parent_category_id='pcat_22cab',  mpath='pcat_v4_l22.pcat_22cab.pcat_6pull3',     handle='v4-ladu-ukse-organiserid-sahvririiulid',  rank=8 WHERE id='pcat_6pull3';
UPDATE product_category SET parent_category_id='pcat_22cab',  mpath='pcat_v4_l22.pcat_22cab.pcat_6pull1',     handle='v4-ladu-valjatommatavad-prugikastid',     rank=9 WHERE id='pcat_6pull1';
UPDATE product_category SET parent_category_id='pcat_22box',  mpath='pcat_v4_l22.pcat_22box.pcat_mv_6x2_13',  handle='v4-ladu-voodialused-hoiukastid',          rank=8 WHERE id='pcat_mv_6x2_13';
-- Riiulikandurid & -kinnitused -> #6 Mööbliosad (mööbli-riistvara, jääb #6)
UPDATE product_category SET parent_category_id='pcat_6osad', mpath='pcat_v4_l6.pcat_6osad.pcat_mv_6x2_16', rank=20 WHERE id='pcat_mv_6x2_16';
-- Küttepuude hoidjad & restid (1) -> #7 Küttepuude hoidikud & kärud (merge)
UPDATE product_category_product SET product_category_id='pcat_t3a_9_6' WHERE product_category_id='pcat_6kytt';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_6kytt';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_6kytt';

-- ===== SAMM 2: KODUTEKSTIIL L2 (uus #6) =====
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_6tekstiil','Kodutekstiil','','v4-moobel-kodutekstiil',true,false,'pcat_v4_l6','pcat_v4_l6.pcat_6tekstiil',17,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_6tekstiil',2,'active','manual',true,0,now(),now());
UPDATE product_category SET parent_category_id='pcat_6tekstiil', mpath='pcat_v4_l6.pcat_6tekstiil.pcat_mv_6x5_4'  WHERE id='pcat_mv_6x5_4';
UPDATE product_category SET parent_category_id='pcat_6tekstiil', mpath='pcat_v4_l6.pcat_6tekstiil.pcat_mv_6x5_8'  WHERE id='pcat_mv_6x5_8';
UPDATE product_category SET parent_category_id='pcat_6tekstiil', mpath='pcat_v4_l6.pcat_6tekstiil.pcat_mv_6x5_9'  WHERE id='pcat_mv_6x5_9';
UPDATE product_category SET parent_category_id='pcat_6tekstiil', mpath='pcat_v4_l6.pcat_6tekstiil.pcat_mv_6x5_12' WHERE id='pcat_mv_6x5_12';
-- Madratsikaitsed split: 6 heated -> #4 uus L3; 6 plain -> Kodutekstiil; vana L3 kustuta
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_4heat','Elektrilised soojendustekid & -madratsikaitsed','','v4-kodumasinad-elektrilised-soojendustekid',true,false,'pcat_v4_l4_6','pcat_v4_l4.pcat_v4_l4_6.pcat_4heat',10,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_4heat',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_4heat'
  WHERE product_category_id='pcat_mv_6x5_7' AND product_id IN (SELECT id FROM product WHERE title ~* 'heated|heating|electric');
-- ülejäänud (plain madratsikaitsed) -> Kodutekstiil uus L3
UPDATE product_category SET name='Madratsikaitsed', parent_category_id='pcat_6tekstiil', mpath='pcat_v4_l6.pcat_6tekstiil.pcat_mv_6x5_7', handle='v4-moobel-kodutekstiil-madratsikaitsed' WHERE id='pcat_mv_6x5_7';

-- ===== SAMM 3: ÜKSIK VALE-KOHT =====
-- Dekoratsioonid ja maakerad (Lapsemööbel) -> Sisustusdekoor
UPDATE product_category SET parent_category_id='pcat_v4_l6_1', mpath='pcat_v4_l6.pcat_v4_l6_1.pcat_mv_6x7_12' WHERE id='pcat_mv_6x7_12';
-- Teadetetahvlid (Sisustusdekoor 5) -> merge #21 Tahvlid & teadetetahvlid, kustuta
UPDATE product_category_product SET product_category_id='pcat_mv_6x3_7' WHERE product_category_id='pcat_mv_6x1_26';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_mv_6x1_26';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_mv_6x1_26';
-- Välis-tuhatoosid & prügikastid (Sisustusdekoor 6) -> #22 Kaupluse sisustus
UPDATE product_category SET parent_category_id='pcat_22retail', mpath='pcat_v4_l22.pcat_22retail.pcat_6ash', handle='v4-ladu-valis-tuhatoosid-prugikastid', rank=4 WHERE id='pcat_6ash';

-- ===== SAMM 4: REDUNDANT MIKRO-MERGE =====
-- Meediariiulid(12) + Vinüülplaadid(2) -> Meediakapid(11)
UPDATE product_category_product SET product_category_id='pcat_mv_6x6_5' WHERE product_category_id IN ('pcat_mv_6x2_9','pcat_mv_6x6_9');
-- Jalatsihoiustamine(23) -> Jalatsikapid(9)
UPDATE product_category_product SET product_category_id='pcat_mv_6x10_1' WHERE product_category_id='pcat_mv_6x2_6';
-- Sigarikapid ja humidorid(3) -> Sigarihumidorid(5)
UPDATE product_category_product SET product_category_id='pcat_mv_6x1_20' WHERE product_category_id='pcat_ks_5x2_29';
-- Nurgariiulikapid(1)+Redeliriiulid(3)+Bambusriiulid(2) -> Raamaturiiulid(15)
UPDATE product_category_product SET product_category_id='pcat_mv_6x2_1' WHERE product_category_id IN ('pcat_mv_6x2_25','pcat_mv_6x2_24','pcat_mv_6x2_21');
-- kustuta liidetud L3-d
DELETE FROM taxonomy_node_meta WHERE node_id IN ('pcat_mv_6x2_9','pcat_mv_6x6_9','pcat_mv_6x2_6','pcat_ks_5x2_29','pcat_mv_6x2_25','pcat_mv_6x2_24','pcat_mv_6x2_21');
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id IN ('pcat_mv_6x2_9','pcat_mv_6x6_9','pcat_mv_6x2_6','pcat_ks_5x2_29','pcat_mv_6x2_25','pcat_mv_6x2_24','pcat_mv_6x2_21');
-- Ehtekapid & peeglid -> rename "Ehtekapid & -laekad" (peegleid pole)
UPDATE product_category SET name='Ehtekapid & -laekad' WHERE id='pcat_mv_6x5_10';
COMMIT;
