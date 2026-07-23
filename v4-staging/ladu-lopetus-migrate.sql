-- #22 Ladu struktuuri lõpetus: konsolideerimine + süva-QA fixid + Kaupluse sisustus L2
BEGIN;

-- ===== SAMM 1: KONSOLIDEERIMINE — tööriista-hoiustus #1 -> #22 Ladu (Otsikuhoidikud JÄÄB #1) =====
UPDATE product_category SET parent_category_id='pcat_22box',   mpath='pcat_v4_l22.pcat_22box.pcat_t3f_11_1',   handle='v4-ladu-tooriistakastid',        rank=10 WHERE id='pcat_t3f_11_1';
UPDATE product_category SET parent_category_id='pcat_22box',   mpath='pcat_v4_l22.pcat_22box.pcat_t3f_11_3',   handle='v4-ladu-tooriistakotid',         rank=11 WHERE id='pcat_t3f_11_3';
UPDATE product_category SET parent_category_id='pcat_22shelf', mpath='pcat_v4_l22.pcat_22shelf.pcat_ag2_2x2_9', handle='v4-ladu-tooriistariiulid-kapid', rank=10 WHERE id='pcat_ag2_2x2_9';
UPDATE product_category SET parent_category_id='pcat_22cart',  mpath='pcat_v4_l22.pcat_22cart.pcat_t3f_11_4',  handle='v4-ladu-tookarud',               rank=10 WHERE id='pcat_t3f_11_4';

-- ===== SAMM 2: "Teenindus- ja hoiukärud" (30) SPLIT =====
-- uus Büroo #21 L3 "Raamatukärud" (Dokumendihaldus all) + 11 raamatukäru
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_21bookcart','Raamatu- ja raamatukogukärud','','v4-buroo-raamatukarud',true,false,'pcat_21doc','pcat_v4_l21.pcat_21doc.pcat_21bookcart',10,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_21bookcart',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_21bookcart'
  WHERE product_category_id='pcat_mv_6x4_8' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('LXTSGTCHS1003OVCP001V0','VXTSGTCBS330I2HAK001V0','VXTSGTCHS3307B7MH001V0','WXTSGTCB330LUQQ0G001V0','LXTSGTCHS200UNMD3001V0','LXTSGTCHS330DC6LE001V0','WXTSGTCH330LMU071001V0','WXTSGTCHS330K73PFV0','LXTSGTCBS330DZLNM001V0','TSGTCSCWXSMBS0001V0','TSGTCSCWXSMHS0001V0'));
-- köök 6 + baar 2 -> #6 Köögikärud ja köögisaared
UPDATE product_category_product SET product_category_id='pcat_mv_6x4_7'
  WHERE product_category_id='pcat_mv_6x4_8' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('WGCFTCCB30X184GWTV0','WGCFTCCB350X1RH9BV0','BXGCFTCCB374XSWSCV0','LLCFTCCB20X24IGJ4V0','DGNTCBS3CLKS3X7Q5V0','DGNTCHS4CLKSH4R74V0','BLFWCCB14X43XARO0V0','BLFWCCB15X315AFJYV0'));
-- jääk (11 utility/lab/food + scrapbook + akrüül) rename
UPDATE product_category SET name='Teenindus- & utility-kärud', handle='v4-ladu-teenindus-utility-karud' WHERE id='pcat_mv_6x4_8';

-- ===== SAMM 3: SÜVA-QA ÜKSIK-FIXID =====
-- Strapping Machine 8500N -> Pakkimis-masinad
UPDATE product_category_product SET product_category_id='pcat_1pack'
  WHERE product_category_id='pcat_th1_3' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='QDGDKZJQDGD1GKZ2A001V0');
-- Metal Locker: Lukustuskapid (1) + kaksik Metallriiulitest -> Metallkapid; tühi Lukustuskapid L3 kustuta
UPDATE product_category_product SET product_category_id='pcat_ag2_2x2_8'
  WHERE product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('JCJHSLMY331807L53V0','JCJHSBMY33180TSQWV0'))
    AND product_category_id IN ('pcat_ag2_2x2_14','pcat_ag2_2x2_1');
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ag2_2x2_14';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_ag2_2x2_14';
-- 3 Wall Garage Shelving + pipe -> Seinariiulid
UPDATE product_category_product SET product_category_id='pcat_ag2_2x2_2'
  WHERE product_category_id='pcat_ag2_2x2_1' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('ZXCKGBHSSCD72F9WLV0','QXCKGBDHSSC725OF5V0','CKGBGSWGJ123E7HT0001V0','JSGZWJYGHMBHZ07TOV0'));
-- Slat Wall -> Seinapaneelid
UPDATE product_category_product SET product_category_id='pcat_ag2_2x2_6'
  WHERE product_category_id='pcat_ag2_2x2_2' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='BTQBXWB16SQFXJD1EV0');
-- DDWLX virnastatavad plastikkastid (8) -> uus L3 "Virnastatavad hoiukastid" (Hoiukastid & -konteinerid all)
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_22bin','Virnastatavad hoiukastid & -bin''id','','v4-ladu-virnastatavad-hoiukastid',true,false,'pcat_22box','pcat_v4_l22.pcat_22box.pcat_22bin',6,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_22bin',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_22bin'
  WHERE product_category_id='pcat_mv_6x2_14' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('DDWLX12G00006BTMBV0','DDWLX6G00000096OEV0','DDWLX24J0000UOOGSV0','DDWLX8GZ5LHS988AE001V0','DDWLX6GZ14LTCARKA001V0','DDWLX8GZ5LTMCQQ5O001V0','DDWLX6GZ14LHKWMV2001V0','DDWLX12GZ14L7T773001V0'));
-- Foldable-riiulid (3) Metallriiulitest -> Kokkupandavad hoiuriiulid + rename
UPDATE product_category_product SET product_category_id='pcat_mv_6x2_23'
  WHERE product_category_id='pcat_ag2_2x2_1' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('YDKZDHJHS3C1VVYHI001V0','YDKZDHJHS4C2H57U9001V0','YDKZDHJHS6C16QFT1001V0'));
UPDATE product_category SET name='Kokkupandavad hoiuriiulid' WHERE id='pcat_mv_6x2_23';

-- ===== SAMM 4: KAUPLUSE SISUSTUS (uus L2 #22 all) =====
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_22retail','Kaupluse sisustus','','v4-ladu-kaupluse-sisustus',true,false,'pcat_v4_l22','pcat_v4_l22.pcat_22retail',8,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_22retail',2,'active','manual',true,0,now(),now());
-- Ostukorvid + Rõivariiulid reparent
UPDATE product_category SET parent_category_id='pcat_22retail', mpath='pcat_v4_l22.pcat_22retail.pcat_mv_6x2_19', handle='v4-ladu-ostukorvid',        rank=1 WHERE id='pcat_mv_6x2_19';
UPDATE product_category SET parent_category_id='pcat_22retail', mpath='pcat_v4_l22.pcat_22retail.pcat_mv_6x2_7',  handle='v4-ladu-roivariiulid-nagid', rank=2 WHERE id='pcat_mv_6x2_7';
-- uus L3 "Ekspositsioonistendid" + 4 pegboard display-stendi
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_22display','Ekspositsioonistendid & display','','v4-ladu-ekspositsioonistendid',true,false,'pcat_22retail','pcat_v4_l22.pcat_22retail.pcat_22display',3,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_22display',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_22display'
  WHERE product_category_id='pcat_ag2_2x2_6' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('ZMXZSDBZXDPJJE9PA001V0','ZMLSDB4GZBDP5ACQT001V0','ZMLSDB2GZDPJA8XSJ001V0','ZMLSDB1GZDPJUTAOH001V0'));

-- ===== SAMM 5: VALED NIMED =====
UPDATE product_category SET name='Gaasiballoonide hoidikud' WHERE id='pcat_ag2_2x2_7';

COMMIT;
