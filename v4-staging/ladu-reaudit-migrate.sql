-- #22 Ladu re-audit parandused: tööriista-spets→#1, kontori-turva→Büroo, relvakapid→#12 Jaht, üksik-mislabelid
BEGIN;

-- ===== SAMM 1: TÖÖRIISTA-SPETS -> #1 Tööriistade hoiustamine (pcat_t3l2_11) =====
UPDATE product_category SET parent_category_id='pcat_t3l2_11', mpath='pcat_v4_l1.pcat_t3l2_11.pcat_t3f_11_9', handle='v4-tooriistad-otsikute-padrunite-hoidikud', rank=10 WHERE id='pcat_t3f_11_9';
UPDATE product_category SET parent_category_id='pcat_t3l2_11', mpath='pcat_v4_l1.pcat_t3l2_11.pcat_t3f_11_3', handle='v4-tooriistad-tooriistakotid',              rank=11 WHERE id='pcat_t3f_11_3';
UPDATE product_category SET parent_category_id='pcat_t3l2_11', mpath='pcat_v4_l1.pcat_t3l2_11.pcat_t3f_11_1', handle='v4-tooriistad-tooriistakastid',             rank=12 WHERE id='pcat_t3f_11_1';
UPDATE product_category SET parent_category_id='pcat_t3l2_11', mpath='pcat_v4_l1.pcat_t3l2_11.pcat_ag2_2x2_9', handle='v4-tooriistad-tooriistariiulid-kapid',      rank=13 WHERE id='pcat_ag2_2x2_9';
UPDATE product_category SET parent_category_id='pcat_t3l2_11', mpath='pcat_v4_l1.pcat_t3l2_11.pcat_t3f_11_4', handle='v4-tooriistad-tookarud',                     rank=14 WHERE id='pcat_t3f_11_4';
-- plastik-hoiukastid (8) Tööriistakastidest -> Ladu Hoiukastid & -kirstud (geneeriline)
UPDATE product_category_product SET product_category_id='pcat_mv_6x2_14'
  WHERE product_category_id='pcat_t3f_11_1' AND product_id IN (SELECT id FROM product WHERE title ~* 'plastic|stackable');
-- pegboard (1) Tööriistariiulitest -> Ladu Seinapaneelid
UPDATE product_category_product SET product_category_id='pcat_ag2_2x2_6'
  WHERE product_category_id='pcat_ag2_2x2_9' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='GJGBHSJS241219C35V0');
-- 2 üld-utility cart Töökärudest -> Ladu Mobiilsed hoiustusrestid (geneeriline)
UPDATE product_category_product SET product_category_id='pcat_ag2_2x2_13'
  WHERE product_category_id='pcat_t3f_11_4' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('DXSLSYTCDXCX2WXI2V0','DXSLSYTCZH2CKF17ZV0'));

-- ===== SAMM 2: KONTORI-TURVA -> Büroo #21 uus L2 "Turvakapid & seifid" =====
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_21safe','Turvakapid & seifid','','v4-buroo-turvakapid',true,false,'pcat_v4_l21','pcat_v4_l21.pcat_21safe',6,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_21safe',2,'active','manual',true,0,now(),now());
-- Tulekindlad dokumendihoidikud (7) + Võtmekapid (5) reparent
UPDATE product_category SET parent_category_id='pcat_21safe', mpath='pcat_v4_l21.pcat_21safe.pcat_t3f_13_6',  handle='v4-buroo-tulekindlad-dokumendihoidikud', rank=1 WHERE id='pcat_t3f_13_6';
UPDATE product_category SET parent_category_id='pcat_21safe', mpath='pcat_v4_l21.pcat_21safe.pcat_t3f_13_12', handle='v4-buroo-votmekapid',                    rank=2 WHERE id='pcat_t3f_13_12';
-- uus L3 "Rahaseifid & deposiidiseifid" + 7 drop/depository seifi
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_21safebox','Rahaseifid & deposiidiseifid','','v4-buroo-rahaseifid-deposiidiseifid',true,false,'pcat_21safe','pcat_v4_l21.pcat_21safe.pcat_21safebox',3,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_21safebox',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_21safebox'
  WHERE product_category_id='pcat_t3f_13_3' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('70ELJYBXG00000001V0','BXXTDSHS000000001V0','LCSBXX17L000GVVNCV0','LCSBXX25L000IZ30IV0','TDSBXJ1378131EP8M001V9','TDSBXJ141420DFPNC001V9','TDSBXJ975137GV4FB001V9'));

-- ===== SAMM 3: RELVAKAPID (16 rifle) -> #12 Jaht uus L3 =====
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_12gun','Relvakapid & -seifid','','v4-sport-jaht-relvakapid-seifid',true,false,'pcat_v4_l12_6','pcat_v4_l12.pcat_v4_l12_6.pcat_12gun',10,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_12gun',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_12gun'
  WHERE product_category_id='pcat_t3f_13_2' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('ZQBXXPZS1575XH6VH001V9','BGBXX13CUFT4CLHYQV9','ZQJBDSX34Z9WLE0P5V9','ZQBXXDCTS111B4B03001V9','ZQBXXPZS1522FF92D001V9','ZQBXX152157IXISIC001V9','ZQJDSX78ZZW99Q44OV9','ZQJBDSX5ZZWYML6AZV9','ZQBXXPZS1889US6QZ001V9','ZQJDSX78Z9WS6RWVQV9','ZQBXXPZS1571I3CTY001V9','ZQBXXCZLB11M5KHYC001V9','ZQBXXCZLB11MQR5TN001V9','JXSQJPZS12Z04XCNVV9','JXSQJPZS8Z002XKG0V9','JXSQJPZS10Z0M9ZPGV9'));

-- ===== SAMM 4: RATTAD + MAILBOX =====
-- uus #1 L3 "Rattad & rullikud" (Tööriistade tarvikud pcat_t3l2_9) + 4 ratast
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_1wheel','Rattad, rullikud & dollid','','v4-tooriistad-rattad-rullikud-dollid',true,false,'pcat_t3l2_9','pcat_v4_l1.pcat_t3l2_9.pcat_1wheel',30,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_1wheel',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_1wheel'
  WHERE product_category_id='pcat_th1_3' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('WGC1611INCHS52QR5V0','FPLJAZPU180LBKDVKV0','FPLJAZPU400LBUE89V0','JLTX13-5-1XJL25YGV0'));
-- 2 Mailbox Post Prügikastialustest -> #6 Postkastid & pakikastid
UPDATE product_category_product SET product_category_id='pcat_6mail1'
  WHERE product_category_id='pcat_t3f_11_8' AND product_id IN (SELECT id FROM product WHERE title ~* 'mailbox');

-- ===== SAMM 5: LADU-SISENE KOOND =====
-- Ekspositsioonirestid (2 Grid Wall) -> Seinapaneelid, tühi L3 kustuta
UPDATE product_category_product SET product_category_id='pcat_ag2_2x2_6' WHERE product_category_id='pcat_mv_6x2_18';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_mv_6x2_18';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_mv_6x2_18';
-- Water jug holder -> Veepudelite hoidikud (kui pole seal)
UPDATE product_category_product SET product_category_id='pcat_ag2_2x2_5'
  WHERE product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='5JLTZSSTSTZCDLP1WV0')
    AND product_category_id IN (SELECT id FROM product_category WHERE mpath LIKE 'pcat_v4_l22.%');

COMMIT;
