BEGIN;
-- ============ 5 UUT L3 ============
INSERT INTO product_category (id,name,handle,parent_category_id,mpath,rank,is_active,is_internal,description,created_at,updated_at) VALUES
('pcat_10kamtool','Kaminatööriistad & tuhaämbrid','v4-santehnika-kute-kaminad-tooriistad-tuhaambrid','pcat_v4_l10_4','pcat_v4_l10.pcat_v4_l10_4.pcat_10kamtool',0,true,false,'',NOW(),NOW()),
('pcat_10kamgrate','Kaminarestid & puuhoidjad','v4-santehnika-kute-kaminad-restid-puuhoidjad','pcat_v4_l10_4','pcat_v4_l10.pcat_v4_l10_4.pcat_10kamgrate',0,true,false,'',NOW(),NOW()),
('pcat_10kamscreen','Kaminaekraanid','v4-santehnika-kute-kaminad-ekraanid','pcat_v4_l10_4','pcat_v4_l10.pcat_v4_l10_4.pcat_10kamscreen',0,true,false,'',NOW(),NOW()),
('pcat_10kamlog','Dekoratiivsed kaminahalud','v4-santehnika-kute-kaminad-dekoorhalud','pcat_v4_l10_4','pcat_v4_l10.pcat_v4_l10_4.pcat_10kamlog',0,true,false,'',NOW(),NOW()),
('pcat_10vohk','Vesi-õhk soojusvahetid','v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-vesi-ohk-soojusvahetid','pcat_v4_l10_1','pcat_v4_l10.pcat_v4_l10_1.pcat_10vohk',0,true,false,'',NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
('pcat_10kamtool',3,'active','manual',true,10,NOW(),NOW()),
('pcat_10kamgrate',3,'active','manual',true,7,NOW(),NOW()),
('pcat_10kamscreen',3,'active','manual',true,5,NOW(),NOW()),
('pcat_10kamlog',3,'active','manual',true,3,NOW(),NOW()),
('pcat_10vohk',3,'active','manual',true,3,NOW(),NOW());

-- ============ 2 RENAME ============
UPDATE product_category SET name='Kaminasimsid', handle='v4-santehnika-kute-kaminad-simsid', updated_at=NOW() WHERE id='pcat_10kam';
UPDATE product_category SET name='Põrandakütte kollektorid', handle='v4-santehnika-kute-poorandakutte-kollektorid', updated_at=NOW() WHERE id='pcat_es_10x1_21';

-- ============ TOOTE-LIIGUTUSED ============
-- Kaminad: tööriistad(7)+tuhaämbrid(3) → pcat_10kamtool
UPDATE product_category_product SET product_category_id='pcat_10kamtool' WHERE product_id IN ('prod_01KPJV5PEZYFTYFE70W77CGF3X','prod_01KPJV5P89K1J9ZXJ797MP91AP','prod_01KP6FARP576JXKVX5KVDRM5F2','prod_01KPJV5P1PBY0YRY1CBMM27TPC','prod_01KPJV5NF97TPG9VGEV53N7YE8','prod_01KPJV5NN83BWJ34YC8KAM9TXM','prod_01KPJV5NTRBGTMJZZPH3FB990Q','prod_01KP6FARECP6PC4ZBF47PJ8PR4','prod_01KPJV5MSE3WH618SCBF53Q9WS','prod_01KPJV5MZF4QEK87C3EKDRJPQX') AND product_category_id='pcat_10kam';
-- restid(6)+puuhoidja(1) → pcat_10kamgrate
UPDATE product_category_product SET product_category_id='pcat_10kamgrate' WHERE product_id IN ('prod_01KNXXHEP7WQZ5G2WE8PA0ZKV7','prod_01KNXXBG5GVNZQ1E7FWQ487R4P','prod_01KNXXBAQ999ZEFJC0DT44TTAN','prod_01KNXXBBN2M56FARQFJXFD4KT5','prod_01KNXXB5AFF1ZTKQA010JNAT9W','prod_01KNXXBAQ3D68HEV7BCTX4MA6P','prod_01KNXXS64VZCD5H5NDGN2P65X2') AND product_category_id='pcat_10kam';
-- ekraanid(5) → pcat_10kamscreen
UPDATE product_category_product SET product_category_id='pcat_10kamscreen' WHERE product_id IN ('prod_01KNXX98NZH43XD0ZT1GP92ECR','prod_01KNXX98NMD3H66EVCC3SR2JDK','prod_01KNXX98NPH1NH1HV42ZZZHE7P','prod_01KNXX98NM6C07WVE7R7QJ3NHA','prod_01KNXX98NKJ1E50S3K2M55SS8H') AND product_category_id='pcat_10kam';
-- dekoorhalud(3) → pcat_10kamlog
UPDATE product_category_product SET product_category_id='pcat_10kamlog' WHERE product_id IN ('prod_01KNXX9AFE66D5VEB05W12YENT','prod_01KNXX9AFFVMF635SJSCVBE8BT','prod_01KNXX9AFETW6JMT5RYYHAE60W') AND product_category_id='pcat_10kam';
-- PEX(4) → PEX-AL-PEX torud
UPDATE product_category_product SET product_category_id='pcat_es_10x1_22' WHERE product_id IN ('prod_01KNXX628FD2056MAGHZZVQY18','prod_01KNXX9NEMXDBE5KWVF22QPQ5D','prod_01KNXX9MFWRHP4FFCQ7V6BKWHD','prod_01KNXX9NEPCHK4RNK52P6TXG3K') AND product_category_id='pcat_es_10x1_21';
-- udupihusti-ventilaatorid(6) + intra kaasaskantav(1) → Põranda- ja kaasaskantavad ventilaatorid
UPDATE product_category_product SET product_category_id='pcat_es_10x1_2' WHERE product_id IN ('prod_01KNXXF4J9YQ45XV1MHPS0ZWDN','prod_01KNXXF4HNKVSN1AH001QWFWQB','prod_01KPJVDTK3GW256XX4WBC1ZDZG','prod_01KPJVDTCFCFA2TTKYEZXZBR1W','prod_01KP6FE1M7RR3VGPSB3ACH2RJ3','prod_01KPJVDT66SF4YKPP2BW4X0A38') AND product_category_id='pcat_es_10x1_11';
UPDATE product_category_product SET product_category_id='pcat_es_10x1_2' WHERE product_id='prod_01KNXXA8H2KPDQHG78E04ZH4ZS' AND product_category_id='pcat_es_10x1_7';
-- shutter-väljalaske(2) → Väljalaskeventilaatorid
UPDATE product_category_product SET product_category_id='pcat_es_10x1_6' WHERE product_id IN ('prod_01KNXXDKVF698DXH9HSE84PE3C','prod_01KNXXDKVQPCX0R9QVWR7VH6E4') AND product_category_id='pcat_es_10x1_5';
-- vesi-õhk(3) → pcat_10vohk
UPDATE product_category_product SET product_category_id='pcat_10vohk' WHERE product_id IN ('prod_01KNXXDZFS72WRB27D6WQE476R','prod_01KNXXDZGAA3KZSJHWNA59KP4K','prod_01KNXXDZGF280TYB7FEEFA4V4X') AND product_category_id='pcat_es_10x1_13';
COMMIT;
\echo '--- uute L3 tootearvud ---'
SELECT c.name, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_10kam','pcat_10kamtool','pcat_10kamgrate','pcat_10kamscreen','pcat_10kamlog','pcat_10vohk','pcat_es_10x1_13','pcat_es_10x1_21','pcat_es_10x1_22','pcat_es_10x1_11','pcat_es_10x1_5','pcat_es_10x1_2','pcat_es_10x1_6') ORDER BY c.name;
\echo '--- distinct(17425) + L3(1595→1600) + dead-L2 ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
