BEGIN;
-- SAMM 1: curb-rambid → #3 Auto "Äärekivi rambid" (dup-värav, sõiduki-domeen); minu L3 kustuta
UPDATE product_category_product SET product_category_id='pcat_ag2_3x2_11' WHERE product_id IN ('prod_01KNXXHEPDRY6KZPZQ1TJ0F9YB','prod_01KNXX8HZFHQX8XP5CGD4XKW3W','prod_01KNXX8AQR6R6A3Y6P93JPAQMX');
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_1ncurbramp';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_1ncurbramp';

-- SAMM 2: tappliite split — doweling(3) välja, dovetail(4) jääk rename
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_1ntuubli','Tüübliliite puurimisšabloonid','','v4-tooriistad-tuubliliite-puurimissabloonid',true,false,'pcat_t3l2_5','pcat_v4_l1.pcat_t3l2_5.pcat_1ntuubli',92,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES ('pcat_1ntuubli',3,'active','manual',true,3,now(),now());
UPDATE product_category_product SET product_category_id='pcat_1ntuubli' WHERE product_id IN ('prod_01KNXXQ1C5692RZZ4CFS6RSZ61','prod_01KNXXQ1C3C9PB2BV82FACTYED','prod_01KNXXQ1BTVRKK8E9QHTTCM5Y1');
UPDATE product_category SET name='Kalasabaliite freesimisšabloonid', updated_at=now() WHERE id='pcat_t3f_5_8';

-- SAMM 3a: konsolideeri 2 katusekonksu Muud→minu STAB; Muud→Evakuatsiooniredelid
UPDATE product_category_product SET product_category_id='pcat_1nredelstab' WHERE product_id IN ('prod_01KNXXEVEX5PG22XWTBM66BRC0','prod_01KNXXETH8XCCTKEENHKE6C5F6');
UPDATE product_category SET name='Evakuatsiooniredelid', updated_at=now() WHERE id='pcat_rd1_6';

-- SAMM 3b: merge Astmepukid(8)→Kokkupandavad redelid(15); rename kattev
UPDATE product_category_product SET product_category_id='pcat_rd1_2' WHERE product_category_id='pcat_rd1_4';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_rd1_4';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_rd1_4';
UPDATE product_category SET name='Astmeredelid ja -pukid', updated_at=now() WHERE id='pcat_rd1_2';

-- SAMM 3c: merge Võnk saekettad(2)→saeterad(3)
UPDATE product_category_product SET product_category_id='pcat_t3f_9_14' WHERE product_category_id='pcat_t3f_9_24';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3f_9_24';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_t3f_9_24';

-- 301 redirectid
INSERT INTO slug_redirect (from_slug,to_slug,reason,created_at) VALUES
 ('v4-tooriistad-aarekivi-ja-lavepakurambid','v4-autovaruosad-ja-tarvikud-veoauto-tarvikud-aarekivi-rambid','merge',now()),
 ('v4-tooriistad-ja-tarvikud-redelid-astmepukid','v4-tooriistad-ja-tarvikud-redelid-kokkupandavad','merge',now()),
 ('v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid-vonktooriista-saekettad','v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid-vonk-ja-multitooriista-saeterad','merge',now());
COMMIT;
\echo '--- tulem ---'
SELECT c.name,(SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n, c.deleted_at IS NOT NULL del FROM product_category c WHERE c.id IN ('pcat_ag2_3x2_11','pcat_1ncurbramp','pcat_t3f_5_8','pcat_1ntuubli','pcat_1nredelstab','pcat_rd1_6','pcat_rd1_2','pcat_rd1_4','pcat_t3f_9_14','pcat_t3f_9_24') ORDER BY c.name;
