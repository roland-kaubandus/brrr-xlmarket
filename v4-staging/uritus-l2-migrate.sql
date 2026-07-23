-- #20 sise-struktuur: 4 vahe-L2 + 21 L3 jaotus + handle-korrastus
BEGIN;

-- ===== SAMM 1: 4 uut L2 =====
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_20a','Dekoratsioonid','','v4-peoinventar-dekoratsioonid',true,false,'pcat_v4_l20','pcat_v4_l20.pcat_20a',1,now(),now()),
 ('pcat_20b','Taustaseinad & pulmakaared','','v4-peoinventar-taustaseinad-pulmakaared',true,false,'pcat_v4_l20','pcat_v4_l20.pcat_20b',2,now(),now()),
 ('pcat_20c','Meelelahutus & atraktsioonid','','v4-peoinventar-meelelahutus-atraktsioonid',true,false,'pcat_v4_l20','pcat_v4_l20.pcat_20c',3,now(),now()),
 ('pcat_20d','Peomööbel & katted','','v4-peoinventar-peomoobel-katted',true,false,'pcat_v4_l20','pcat_v4_l20.pcat_20d',4,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_20a',2,'active','manual',true,0,now(),now()),
 ('pcat_20b',2,'active','manual',true,0,now(),now()),
 ('pcat_20c',2,'active','manual',true,0,now(),now()),
 ('pcat_20d',2,'active','manual',true,0,now(),now());

-- ===== SAMM 2: reparent 21 L3 + handle-korrastus =====
-- A Dekoratsioonid
UPDATE product_category SET parent_category_id='pcat_20a', mpath='pcat_v4_l20.pcat_20a.pcat_mv_6x1_8',  handle='v4-peoinventar-kunstlilled-taimed',             rank=1 WHERE id='pcat_mv_6x1_8';
UPDATE product_category SET parent_category_id='pcat_20a', mpath='pcat_v4_l20.pcat_20a.pcat_mv_6x1_13', handle='v4-peoinventar-lillealused-statiivid',           rank=2 WHERE id='pcat_mv_6x1_13';
UPDATE product_category SET parent_category_id='pcat_20a', mpath='pcat_v4_l20.pcat_20a.pcat_mv_6x1_12', handle='v4-peoinventar-lillevaasid',                    rank=3 WHERE id='pcat_mv_6x1_12';
UPDATE product_category SET parent_category_id='pcat_20a', mpath='pcat_v4_l20.pcat_20a.pcat_mv_6x1_29', handle='v4-peoinventar-dekoratiivlaternad-parjad',      rank=4 WHERE id='pcat_mv_6x1_29';
UPDATE product_category SET parent_category_id='pcat_20a', mpath='pcat_v4_l20.pcat_20a.pcat_mv_6x7_11', handle='v4-peoinventar-tooli-satiinpaelad-kaunistused', rank=5 WHERE id='pcat_mv_6x7_11';
-- B Taustaseinad & pulmakaared
UPDATE product_category SET parent_category_id='pcat_20b', mpath='pcat_v4_l20.pcat_20b.pcat_f4_13x7_1', handle='v4-peoinventar-backdrop-statiivid-taustad', rank=1 WHERE id='pcat_f4_13x7_1';
UPDATE product_category SET parent_category_id='pcat_20b', mpath='pcat_v4_l20.pcat_20b.pcat_mv_6x1_14', handle='v4-peoinventar-pulmakaared-lilledekoor',     rank=2 WHERE id='pcat_mv_6x1_14';
UPDATE product_category SET parent_category_id='pcat_20b', mpath='pcat_v4_l20.pcat_20b.pcat_mv_6x1_15', handle='v4-peoinventar-ohupallikaared-raamid',       rank=3 WHERE id='pcat_mv_6x1_15';
-- C Meelelahutus & atraktsioonid
UPDATE product_category SET parent_category_id='pcat_20c', mpath='pcat_v4_l20.pcat_20c.pcat_12peo',     handle='v4-peoinventar-peo-ja-meelelahutusmasinad',  rank=1 WHERE id='pcat_12peo';
UPDATE product_category SET parent_category_id='pcat_20c', mpath='pcat_v4_l20.pcat_20c.pcat_el_12x2_9', handle='v4-peoinventar-atraktsioonipuhurid',         rank=2 WHERE id='pcat_el_12x2_9';
UPDATE product_category SET parent_category_id='pcat_20c', mpath='pcat_v4_l20.pcat_20c.pcat_mu_2_3',    handle='v4-peoinventar-lavaefektide-masinad',        rank=3 WHERE id='pcat_mu_2_3';
UPDATE product_category SET parent_category_id='pcat_20c', mpath='pcat_v4_l20.pcat_20c.pcat_el_12x1_12',handle='v4-peoinventar-onne-loosimisrattad-trumlid', rank=4 WHERE id='pcat_el_12x1_12';
UPDATE product_category SET parent_category_id='pcat_20c', mpath='pcat_v4_l20.pcat_20c.pcat_el_12x2_8', handle='v4-peoinventar-taispuhutavad-atraktsioonid', rank=5 WHERE id='pcat_el_12x2_8';
UPDATE product_category SET parent_category_id='pcat_20c', mpath='pcat_v4_l20.pcat_20c.pcat_20kuusk',   handle='v4-peoinventar-joulukuused',                 rank=6 WHERE id='pcat_20kuusk';
UPDATE product_category SET parent_category_id='pcat_20c', mpath='pcat_v4_l20.pcat_20c.pcat_mv_8x2_6',  handle='v4-peoinventar-peotelgid',                   rank=7 WHERE id='pcat_mv_8x2_6';
-- D Peomööbel & katted
UPDATE product_category SET parent_category_id='pcat_20d', mpath='pcat_v4_l20.pcat_20d.pcat_mv_6x8_3',  handle='v4-peoinventar-kokkupandavad-peotoolid',    rank=1 WHERE id='pcat_mv_6x8_3';
UPDATE product_category SET parent_category_id='pcat_20d', mpath='pcat_v4_l20.pcat_20d.pcat_mv_6x1_1',  handle='v4-peoinventar-toolikatted-umbrised',       rank=2 WHERE id='pcat_mv_6x1_1';
UPDATE product_category SET parent_category_id='pcat_20d', mpath='pcat_v4_l20.pcat_20d.pcat_mv_6x1_7',  handle='v4-peoinventar-laudlinad',                  rank=3 WHERE id='pcat_mv_6x1_7';
UPDATE product_category SET parent_category_id='pcat_20d', mpath='pcat_v4_l20.pcat_20d.pcat_1tool',     handle='v4-peoinventar-toolikarud-hoidikud',        rank=4 WHERE id='pcat_1tool';
UPDATE product_category SET parent_category_id='pcat_20d', mpath='pcat_v4_l20.pcat_20d.pcat_t3f_13_7',  handle='v4-peoinventar-piirdepostid-jarjekorratokked', rank=5 WHERE id='pcat_t3f_13_7';
UPDATE product_category SET parent_category_id='pcat_20d', mpath='pcat_v4_l20.pcat_20d.pcat_t3f_13_5',  handle='v4-peoinventar-sammaspostide-koied',        rank=6 WHERE id='pcat_t3f_13_5';

-- ===== SAMM 3: kustuta tühjaks jäänud vana L2 "Pidu ja üritused" =====
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_pidu';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_pidu';

COMMIT;
