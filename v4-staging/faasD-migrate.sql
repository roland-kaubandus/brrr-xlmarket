-- Suur struktuur FAAS D: uus main #22 "Ladu, hoiustamine & pakendamine" + marsruut ~391
BEGIN;
-- SAMM 1: uus L1 #22
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_v4_l22','Ladu, hoiustamine & pakendamine','','v4-ladu-hoiustamine-ja-pakendamine',true,false,NULL,'pcat_v4_l22',22,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_v4_l22',1,'active','manual',true,0,now(),now());
-- SAMM 2: 7 L2 (L2-handle eristav L3-st)
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_22shelf','Riiulid & restid','','v4-ladu-riiulid-restid',true,false,'pcat_v4_l22','pcat_v4_l22.pcat_22shelf',1,now(),now()),
 ('pcat_22safe','Turvakapid & seifid','','v4-ladu-turvakapid-seifid',true,false,'pcat_v4_l22','pcat_v4_l22.pcat_22safe',2,now(),now()),
 ('pcat_22pack','Pakendamine','','v4-ladu-pakendamine',true,false,'pcat_v4_l22','pcat_v4_l22.pcat_22pack',3,now(),now()),
 ('pcat_22box','Hoiukastid & -konteinerid','','v4-ladu-hoiukastid-konteinerid',true,false,'pcat_v4_l22','pcat_v4_l22.pcat_22box',4,now(),now()),
 ('pcat_22cart','Mobiilsed hoiukärud & -restid','','v4-ladu-mobiilsed-karud',true,false,'pcat_v4_l22','pcat_v4_l22.pcat_22cart',5,now(),now()),
 ('pcat_22cab','Hoiukapid & -sahtlid','','v4-ladu-hoiukapid-sahtlid',true,false,'pcat_v4_l22','pcat_v4_l22.pcat_22cab',6,now(),now()),
 ('pcat_22peg','Seinapaneelid & pegboardid','','v4-ladu-seinapaneelid',true,false,'pcat_v4_l22','pcat_v4_l22.pcat_22peg',7,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_22shelf',2,'active','manual',true,0,now(),now()),('pcat_22safe',2,'active','manual',true,0,now(),now()),
 ('pcat_22pack',2,'active','manual',true,0,now(),now()),('pcat_22box',2,'active','manual',true,0,now(),now()),
 ('pcat_22cart',2,'active','manual',true,0,now(),now()),('pcat_22cab',2,'active','manual',true,0,now(),now()),
 ('pcat_22peg',2,'active','manual',true,0,now(),now());

-- SAMM 3a: RIIULID & RESTID
-- Metallriiulid: merge #6(11) -> #2(24), siis reparent #2 -> Ladu
UPDATE product_category_product SET product_category_id='pcat_ag2_2x2_1' WHERE product_category_id='pcat_mv_6x2_15';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_mv_6x2_15';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_mv_6x2_15';
UPDATE product_category SET parent_category_id='pcat_22shelf', mpath='pcat_v4_l22.pcat_22shelf.pcat_ag2_2x2_1',  handle='v4-ladu-metallriiulid',                     rank=1 WHERE id='pcat_ag2_2x2_1';
UPDATE product_category SET parent_category_id='pcat_22shelf', mpath='pcat_v4_l22.pcat_22shelf.pcat_ag2_2x2_2',  handle='v4-ladu-seinariiulid',                     rank=2 WHERE id='pcat_ag2_2x2_2';
UPDATE product_category SET parent_category_id='pcat_22shelf', mpath='pcat_v4_l22.pcat_22shelf.pcat_ag2_2x2_7',  handle='v4-ladu-gaasiballoonide-pudelite-hoidikud', rank=3 WHERE id='pcat_ag2_2x2_7';
UPDATE product_category SET parent_category_id='pcat_22shelf', mpath='pcat_v4_l22.pcat_22shelf.pcat_ag2_2x2_5',  handle='v4-ladu-veepudelite-hoidikud-riiulid',      rank=4 WHERE id='pcat_ag2_2x2_5';
UPDATE product_category SET parent_category_id='pcat_22shelf', mpath='pcat_v4_l22.pcat_22shelf.pcat_ag2_2x2_12', handle='v4-ladu-lae-hoiustamisrestid',              rank=5 WHERE id='pcat_ag2_2x2_12';
UPDATE product_category SET parent_category_id='pcat_22shelf', mpath='pcat_v4_l22.pcat_22shelf.pcat_mv_6x2_23',  handle='v4-ladu-kokkupandavad-hoiuriiulid-ratastega', rank=6 WHERE id='pcat_mv_6x2_23';
UPDATE product_category SET parent_category_id='pcat_22shelf', mpath='pcat_v4_l22.pcat_22shelf.pcat_mv_6x2_17',  handle='v4-ladu-filamendi-kunstirestid',            rank=7 WHERE id='pcat_mv_6x2_17';
UPDATE product_category SET parent_category_id='pcat_22shelf', mpath='pcat_v4_l22.pcat_22shelf.pcat_mv_6x2_7',   handle='v4-ladu-roivariiulid-nagid',               rank=8 WHERE id='pcat_mv_6x2_7';
UPDATE product_category SET parent_category_id='pcat_22shelf', mpath='pcat_v4_l22.pcat_22shelf.pcat_ag2_2x2_9',  handle='v4-ladu-tooriistariiulid-kapid',            rank=9 WHERE id='pcat_ag2_2x2_9';

-- SAMM 3b: TURVAKAPID & SEIFID
UPDATE product_category SET parent_category_id='pcat_22safe', mpath='pcat_v4_l22.pcat_22safe.pcat_t3f_13_3',  handle='v4-ladu-seifid',                       rank=1 WHERE id='pcat_t3f_13_3';
UPDATE product_category SET parent_category_id='pcat_22safe', mpath='pcat_v4_l22.pcat_22safe.pcat_t3f_13_2',  handle='v4-ladu-relvakapid-relvaseifid',       rank=2 WHERE id='pcat_t3f_13_2';
UPDATE product_category SET parent_category_id='pcat_22safe', mpath='pcat_v4_l22.pcat_22safe.pcat_t3f_13_6',  handle='v4-ladu-tulekindlad-dokumendihoidikud', rank=3 WHERE id='pcat_t3f_13_6';
UPDATE product_category SET parent_category_id='pcat_22safe', mpath='pcat_v4_l22.pcat_22safe.pcat_t3f_13_12', handle='v4-ladu-votmekapid',                   rank=4 WHERE id='pcat_t3f_13_12';
UPDATE product_category SET parent_category_id='pcat_22safe', mpath='pcat_v4_l22.pcat_22safe.pcat_ag2_2x2_4', handle='v4-ladu-tuleohtlike-ainete-hoiukapid', rank=5 WHERE id='pcat_ag2_2x2_4';

-- SAMM 3c: PAKENDAMINE
UPDATE product_category SET parent_category_id='pcat_22pack', mpath='pcat_v4_l22.pcat_22pack.pcat_th1_3', handle='v4-ladu-pakkimis-koitmistarvikud', rank=1 WHERE id='pcat_th1_3';
UPDATE product_category SET parent_category_id='pcat_22pack', mpath='pcat_v4_l22.pcat_22pack.pcat_1pack', handle='v4-ladu-pakkimis-sidumismasinad',  rank=2 WHERE id='pcat_1pack';

-- SAMM 3d: HOIUKASTID & -KONTEINERID
UPDATE product_category SET parent_category_id='pcat_22box', mpath='pcat_v4_l22.pcat_22box.pcat_t3f_11_1', handle='v4-ladu-tooriistakastid',   rank=1 WHERE id='pcat_t3f_11_1';
UPDATE product_category SET parent_category_id='pcat_22box', mpath='pcat_v4_l22.pcat_22box.pcat_t3f_11_3', handle='v4-ladu-tooriistakotid',    rank=2 WHERE id='pcat_t3f_11_3';
UPDATE product_category SET parent_category_id='pcat_22box', mpath='pcat_v4_l22.pcat_22box.pcat_t3f_11_2', handle='v4-ladu-veekindlad-kohvrid', rank=3 WHERE id='pcat_t3f_11_2';
UPDATE product_category SET parent_category_id='pcat_22box', mpath='pcat_v4_l22.pcat_22box.pcat_mv_6x2_14', handle='v4-ladu-hoiukastid-kirstud', rank=4 WHERE id='pcat_mv_6x2_14';
UPDATE product_category SET parent_category_id='pcat_22box', mpath='pcat_v4_l22.pcat_22box.pcat_mv_6x2_19', handle='v4-ladu-ostukorvid',        rank=5 WHERE id='pcat_mv_6x2_19';

-- SAMM 3e: MOBIILSED HOIUKÄRUD & -RESTID
UPDATE product_category SET parent_category_id='pcat_22cart', mpath='pcat_v4_l22.pcat_22cart.pcat_mv_6x4_8',  handle='v4-ladu-teenindus-hoiukarud',           rank=1 WHERE id='pcat_mv_6x4_8';
UPDATE product_category SET parent_category_id='pcat_22cart', mpath='pcat_v4_l22.pcat_22cart.pcat_t3f_11_4',  handle='v4-ladu-tookarud',                      rank=2 WHERE id='pcat_t3f_11_4';
UPDATE product_category SET parent_category_id='pcat_22cart', mpath='pcat_v4_l22.pcat_22cart.pcat_ag2_2x2_13', handle='v4-ladu-mobiilsed-hoiustusrestid-karud', rank=3 WHERE id='pcat_ag2_2x2_13';
UPDATE product_category SET parent_category_id='pcat_22cart', mpath='pcat_v4_l22.pcat_22cart.pcat_t3f_11_8',  handle='v4-ladu-prugikastialused',              rank=4 WHERE id='pcat_t3f_11_8';

-- SAMM 3f: HOIUKAPID & -SAHTLID
UPDATE product_category SET parent_category_id='pcat_22cab', mpath='pcat_v4_l22.pcat_22cab.pcat_t3f_11_9', handle='v4-ladu-otsikute-padrunite-hoidikud', rank=1 WHERE id='pcat_t3f_11_9';
UPDATE product_category SET parent_category_id='pcat_22cab', mpath='pcat_v4_l22.pcat_22cab.pcat_ag2_2x2_8', handle='v4-ladu-metallkapid',              rank=2 WHERE id='pcat_ag2_2x2_8';
UPDATE product_category SET parent_category_id='pcat_22cab', mpath='pcat_v4_l22.pcat_22cab.pcat_mv_6x3_9',  handle='v4-ladu-toimiku-dokumendikapid',    rank=3 WHERE id='pcat_mv_6x3_9';
UPDATE product_category SET parent_category_id='pcat_22cab', mpath='pcat_v4_l22.pcat_22cab.pcat_ag2_2x2_14', handle='v4-ladu-lukustuskapid',            rank=4 WHERE id='pcat_ag2_2x2_14';
UPDATE product_category SET parent_category_id='pcat_22cab', mpath='pcat_v4_l22.pcat_22cab.pcat_mv_6x2_22', handle='v4-ladu-telefonihoiukapid',         rank=5 WHERE id='pcat_mv_6x2_22';

-- SAMM 3g: SEINAPANEELID & PEGBOARDID
UPDATE product_category SET parent_category_id='pcat_22peg', mpath='pcat_v4_l22.pcat_22peg.pcat_ag2_2x2_6', handle='v4-ladu-seinapaneelid-pegboardid',       rank=1 WHERE id='pcat_ag2_2x2_6';
UPDATE product_category SET parent_category_id='pcat_22peg', mpath='pcat_v4_l22.pcat_22peg.pcat_t3f_11_11', handle='v4-ladu-seinale-kinnitatavad-hoiususteemid', rank=2 WHERE id='pcat_t3f_11_11';
UPDATE product_category SET parent_category_id='pcat_22peg', mpath='pcat_v4_l22.pcat_22peg.pcat_mv_6x2_18', handle='v4-ladu-ekspositsioonirestid',           rank=3 WHERE id='pcat_mv_6x2_18';

-- SAMM 4: PIIRIPEALSED
-- Tööriistariiulid ja -kapid (pcat_ag2_2x2_9, nüüd Ladu Riiulid): split 3 käru -> Mobiilsed Töökärud, 1 kapp -> Hoiukapid Metallkapid, jääk 7 riiul
UPDATE product_category_product SET product_category_id='pcat_t3f_11_4'
  WHERE product_category_id='pcat_ag2_2x2_9' AND product_id IN (SELECT id FROM product p WHERE p.title ~* 'cart|trolley|rolling|wheels');
UPDATE product_category_product SET product_category_id='pcat_ag2_2x2_8'
  WHERE product_category_id='pcat_ag2_2x2_9' AND product_id IN (SELECT id FROM product p WHERE p.title ~* 'cabinet|locker');
-- Köögikärud (pcat_mv_6x4_7, JÄÄB #6): 4 cart -> Ladu Mobiilsed Teenindus-hoiukärud; 12 island jäävad #6
UPDATE product_category_product SET product_category_id='pcat_mv_6x4_8'
  WHERE product_category_id='pcat_mv_6x4_7' AND product_id IN (SELECT id FROM product p WHERE p.title ~* 'cart|trolley|rolling|serving');
-- Meditsiinikärud ja -lauad (12) -> #16 Meditsiinitarvikud
UPDATE product_category SET parent_category_id='pcat_v4_l16_2', mpath='pcat_v4_l16.pcat_v4_l16_2.pcat_mv_6x4_9', handle='v4-meditsiin-meditsiinikarud-lauad', rank=15 WHERE id='pcat_mv_6x4_9';

COMMIT;
