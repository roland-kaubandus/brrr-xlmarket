BEGIN;
INSERT INTO product_category (id,name,handle,parent_category_id,mpath,rank,is_active,is_internal,description,created_at,updated_at) VALUES
('pcat_10udu','Udupihusti-ventilaatorid','v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-udupihusti-ventilaatorid','pcat_v4_l10_1','pcat_v4_l10.pcat_v4_l10_1.pcat_10udu',0,true,false,'',NOW(),NOW()),
('pcat_10kuiv','Kuivatuspuhurid','v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-kuivatuspuhurid','pcat_v4_l10_1','pcat_v4_l10.pcat_v4_l10_1.pcat_10kuiv',0,true,false,'',NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
('pcat_10udu',3,'active','manual',true,6,NOW(),NOW()),('pcat_10kuiv',3,'active','manual',true,4,NOW(),NOW());
-- udupihustid(6) → uus
UPDATE product_category_product SET product_category_id='pcat_10udu' WHERE product_id IN ('prod_01KNXXF4J9YQ45XV1MHPS0ZWDN','prod_01KNXXF4HNKVSN1AH001QWFWQB','prod_01KPJVDTK3GW256XX4WBC1ZDZG','prod_01KPJVDTCFCFA2TTKYEZXZBR1W','prod_01KP6FE1M7RR3VGPSB3ACH2RJ3','prod_01KPJVDT66SF4YKPP2BW4X0A38') AND product_category_id='pcat_es_10x1_2';
-- air-moverid(4) → uus Kuivatuspuhurid
UPDATE product_category_product SET product_category_id='pcat_10kuiv' WHERE product_id IN ('prod_01KNXXG2SBMCE3N6CJ3CFHN8J9','prod_01KNXXFE3F6T5ZEC60HYFWZRVQ','prod_01KNXXG2SDDF71XK4XAMP78K4Z','prod_01KNXXFEZKCW0YY5Z80TMY2SXD') AND product_category_id='pcat_es_10x1_2';
-- portable tsüklonpuhurid(8) → Tööstuslikud ventilaatorid (olemas)
UPDATE product_category_product SET product_category_id='pcat_es_10x1_4' WHERE product_id IN ('prod_01KNXX8ZHDV5TF4PD5ZDWKK4DV','prod_01KNXX91BT7E5AG108XS1TQXT1','prod_01KNXX90E5WHENXRD954EGBK79','prod_01KNXX8ZHAM32T9DW50A8YSECJ','prod_01KNXX8ZJ57KZ4CM16XRGV1CA6','prod_01KNXX8ZJ0Q6JKQ0ZW288KWT49','prod_01KNXX8ZHZ7DMXJEP1TTAF3YCN','prod_01KNXX8ZHBHJNC5DZJQ8MCCPNJ') AND product_category_id='pcat_es_10x1_1';
COMMIT;
\echo '--- tulem ---'
SELECT c.name, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_es_10x1_2','pcat_10udu','pcat_10kuiv','pcat_es_10x1_1','pcat_es_10x1_4') ORDER BY c.name;
\echo '--- distinct(17425) L3(1606->1608) ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
