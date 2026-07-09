BEGIN;
-- ============ 6 UUT L3 ============
INSERT INTO product_category (id,name,handle,parent_category_id,mpath,rank,is_active,is_internal,description,created_at,updated_at) VALUES
('pcat_10kormyts','Korstnamütsid & -katted','v4-santehnika-kute-korsten-mutsid-katted','pcat_v4_l10_4','pcat_v4_l10.pcat_v4_l10_4.pcat_10kormyts',0,true,false,'',NOW(),NOW()),
('pcat_10toruk','Kliimaseadme torukatted','v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-kliimaseadme-torukatted','pcat_v4_l10_1','pcat_v4_l10.pcat_v4_l10_1.pcat_10toruk',0,true,false,'',NOW(),NOW()),
('pcat_10tagasi','Tagasivooluõhu filterrestid','v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-tagasivoolu-ohu-filterrestid','pcat_v4_l10_1','pcat_v4_l10.pcat_v4_l10_1.pcat_10tagasi',0,true,false,'',NOW(),NOW()),
('pcat_10osoon','Osoonigeneraatorid','v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-osoonigeneraatorid','pcat_v4_l10_1','pcat_v4_l10.pcat_v4_l10_1.pcat_10osoon',0,true,false,'',NOW(),NOW()),
('pcat_10ohufil','Õhufiltrid & varufiltrid','v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-ohufiltrid-varufiltrid','pcat_v4_l10_1','pcat_v4_l10.pcat_v4_l10_1.pcat_10ohufil',0,true,false,'',NOW(),NOW()),
('pcat_10jahuti','Õhujahutid','v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-ohujahutid','pcat_v4_l10_1','pcat_v4_l10.pcat_v4_l10_1.pcat_10jahuti',0,true,false,'',NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
('pcat_10kormyts',3,'active','manual',true,5,NOW(),NOW()),('pcat_10toruk',3,'active','manual',true,5,NOW(),NOW()),
('pcat_10tagasi',3,'active','manual',true,8,NOW(),NOW()),('pcat_10osoon',3,'active','manual',true,3,NOW(),NOW()),
('pcat_10ohufil',3,'active','manual',true,4,NOW(),NOW()),('pcat_10jahuti',3,'active','manual',true,3,NOW(),NOW());

-- ============ 5 RENAME (nimi; handle jääb — slug ≠ nimi OK) ============
UPDATE product_category SET name='Korstnapühkimise komplektid', updated_at=NOW() WHERE id='pcat_10kor';
UPDATE product_category SET name='Kliimaseadme katted', updated_at=NOW() WHERE id='pcat_es_10x1_15';
UPDATE product_category SET name='Seina ventilatsioonivõred', updated_at=NOW() WHERE id='pcat_es_10x1_19';
UPDATE product_category SET name='Õhupuhastid', updated_at=NOW() WHERE id='pcat_es_10x1_10';
UPDATE product_category SET name='Õhuniisutid', updated_at=NOW() WHERE id='pcat_es_10x1_11';

-- ============ TOOTE-LIIGUTUSED ============
UPDATE product_category_product SET product_category_id='pcat_10kormyts' WHERE product_id IN ('prod_01KNXX8QEP6BDQRAJ4C5H6MTPM','prod_01KNXX8QEF0RAY8CZ52W6M9267','prod_01KNXX8QE9326EPW4279HQH2Z3','prod_01KNXX8QEHQYZMX00SSMQQHA0V','prod_01KNXX8QDSYEAFGFA3P7SF8PYB') AND product_category_id='pcat_10kor';
UPDATE product_category_product SET product_category_id='pcat_10toruk' WHERE product_id IN ('prod_01KNXXM74Q08NKC4TQM4EBFNRN','prod_01KNXXC7KM2371R1JX48DNTVWS','prod_01KNXXC6QNJ0X1WJET946A6B3W','prod_01KNXXC6QBXS52S7CP8QER59VJ','prod_01KNXXC6QJ026V42DX9V3ST5W4') AND product_category_id='pcat_es_10x1_15';
UPDATE product_category_product SET product_category_id='pcat_10tagasi' WHERE product_id IN ('prod_01KNXXNQY9CST7BHCD92VBSSVK','prod_01KNXXNJHVTW254PR9EDDSYNHQ','prod_01KNXXNJJ0GHAR8PW9YSSARS5X','prod_01KNXXNQ1QPQR1KZWHE36F85M3','prod_01KNXXNHMYY369DY1TATRTKNN9','prod_01KNXXNJGZ05YZSDXXBE1C8HMZ','prod_01KNXXNQXK083GDCCDS3NDYS69','prod_01KNXXNHN1QJW1B6QYA62F22S4') AND product_category_id='pcat_es_10x1_19';
UPDATE product_category_product SET product_category_id='pcat_10osoon' WHERE product_id IN ('prod_01KNXX91AVS599YE2JXK30RHFF','prod_01KNXX91AT31F7CNGEB1XM2DKH','prod_01KNXX91ARWZ4WEP7YW9QJC8Y1') AND product_category_id='pcat_es_10x1_10';
UPDATE product_category_product SET product_category_id='pcat_10ohufil' WHERE product_id IN ('prod_01KNXXB736DJCXNE7SWCVMQRHY','prod_01KNXXB807W2N0RH24H22BXBY0','prod_01KNXXB5AFP4KBJ2HSPGRQSKVD','prod_01KNXXMPFHJ6ZZ8RFD3GT0QJ8B') AND product_category_id='pcat_es_10x1_10';
UPDATE product_category_product SET product_category_id='pcat_10jahuti' WHERE product_id IN ('prod_01KNXXNABG6GNBM7XWE8N26Z8B','prod_01KNXXM90A0C5B5Y8WM9WCY0B1','prod_01KNXXNACKKH0PYPQDSZG0Z16K') AND product_category_id='pcat_es_10x1_11';
-- intra: 2× HVAC-puhasti Kanalvent→Õhupuhastid, 1× tornvent Põranda-kaasask→Tornventilaatorid
UPDATE product_category_product SET product_category_id='pcat_es_10x1_10' WHERE product_id IN ('prod_01KNXXJRV6F5P6D6AC02KFX2AG','prod_01KNXXJTQSPKD7AKD1N6R3FPPG') AND product_category_id='pcat_es_10x1_1';
UPDATE product_category_product SET product_category_id='pcat_es_10x1_3' WHERE product_id='prod_01KNXXNJHDG16W9P1RAQ7F8RMM' AND product_category_id='pcat_es_10x1_2';
COMMIT;
\echo '--- tulem ---'
SELECT c.name, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_10kor','pcat_10kormyts','pcat_es_10x1_15','pcat_10toruk','pcat_es_10x1_19','pcat_10tagasi','pcat_es_10x1_10','pcat_10osoon','pcat_10ohufil','pcat_es_10x1_11','pcat_10jahuti','pcat_es_10x1_3') ORDER BY c.name;
\echo '--- distinct(17425) L3(1600->1606) ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
