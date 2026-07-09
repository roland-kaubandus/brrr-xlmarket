BEGIN;
-- ===== 5 UUT L3 =====
INSERT INTO product_category (id,name,handle,parent_category_id,mpath,rank,is_active,is_internal,description,created_at,updated_at) VALUES
('pcat_5lauano','Lauanõude komplektid','v4-suurkoogiseadmed-koogitarvikud-ja-noud-lauanoude-komplektid','pcat_5noud','pcat_v4_l5.pcat_5noud.pcat_5lauano',0,true,false,'',NOW(),NOW()),
('pcat_5kypse','Küpsetusplaadid ja -vormid','v4-suurkoogiseadmed-koogitarvikud-ja-noud-kypsetusplaadid-ja-vormid','pcat_5noud','pcat_v4_l5.pcat_5noud.pcat_5kypse',0,true,false,'',NOW(),NOW()),
('pcat_5rasva','Rasvakogumisämbrid','v4-suurkoogiseadmed-koogitarvikud-ja-noud-rasvakogumisambrid','pcat_5noud','pcat_v4_l5.pcat_5noud.pcat_5rasva',0,true,false,'',NOW(),NOW()),
('pcat_5kubufil','Tõmbekubu filtrid','v4-suurkook-tombekubu-filtrid','pcat_5vent','pcat_v4_l5.pcat_5vent.pcat_5kubufil',0,true,false,'',NOW(),NOW()),
('pcat_5urn','Kohviurnid','v4-suurkoogiseadmed-koogiseadmed-ja-elektriseadmed-kohviurnid','pcat_5kohv','pcat_v4_l5.pcat_5kohv.pcat_5urn',0,true,false,'',NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
('pcat_5lauano',3,'active','manual',true,3,NOW(),NOW()),('pcat_5kypse',3,'active','manual',true,7,NOW(),NOW()),
('pcat_5rasva',3,'active','manual',true,8,NOW(),NOW()),('pcat_5kubufil',3,'active','manual',true,4,NOW(),NOW()),
('pcat_5urn',3,'active','manual',true,5,NOW(),NOW());
-- ===== 3 RENAME =====
UPDATE product_category SET name='Söögiriistade komplektid', updated_at=NOW() WHERE id='pcat_ks_5x2_9';
UPDATE product_category SET name='Tõmbekubud', updated_at=NOW() WHERE id='pcat_5n7';
UPDATE product_category SET name='Kohvimasinad', updated_at=NOW() WHERE id='pcat_ks_5x1_22';
-- ===== GRAB-SPLIT liigutused =====
UPDATE product_category_product SET product_category_id='pcat_5lauano' WHERE product_id IN ('prod_01KNXXP5H5ZC32SZHQZNCWAQKS','prod_01KNXXP7BNVWAZ81QM25YMHRRT','prod_01KNXXP7AQ4WNW8K0V1HFPPBD7') AND product_category_id='pcat_ks_5x2_9';
UPDATE product_category_product SET product_category_id='pcat_5kubufil' WHERE product_id IN ('prod_01KNXXHRJXNTDFERWHF2GVSD8B','prod_01KNXXHSG245CDPHQC9YKYVVC3','prod_01KNXXHRK39JKE798QFA7AWJY3','prod_01KNXXHSG0N5VGGHEBHRZCACEB') AND product_category_id='pcat_5n7';
UPDATE product_category_product SET product_category_id='pcat_5urn' WHERE product_id IN ('prod_01KNXX81NJEXHHBGFX8R7A4X2X','prod_01KNXXSVWGMJ5NX9KX34WB377V','prod_01KNXXSVX2VYA36KYJRN350N0J','prod_01KNXX7ZVMSHSN2F8XB09APTJR','prod_01KNXX81P0V22AQAWMM3WKP7JR') AND product_category_id='pcat_ks_5x1_22';
UPDATE product_category_product SET product_category_id='pcat_5rasva' WHERE product_id IN ('prod_01KNXXC6PW22TTH45RMGNF6Z1Y','prod_01KNXXC6QQM6MGRY7C19FPYSGY','prod_01KNXXC6QD7RXJVVJZHMJ0AD2D','prod_01KNXXC6PWSYFXFNN0HM2C2WB0','prod_01KNXXC6PTAQJJCY9B2ZA6JV11','prod_01KNXXC6QCJBHPJHQ3J5QS657M','prod_01KNXXC6PXNZRN1WE7HB8S0RCA','prod_01KNXXC6QN9B113T3DKGSKNWB6') AND product_category_id='pcat_ks_5x2_25';
UPDATE product_category_product SET product_category_id='pcat_5kypse' WHERE product_id IN ('prod_01KNXXKA83B1ZK6YDMGHGEGEJV','prod_01KNXXKA866D2Z3P9XQ337A5AX','prod_01KNXXKB57847S99MVD3KDFQHX','prod_01KNXXKB5NV6TDREGSYRKPGE5W','prod_01KNXXKC23RNY2J2WY1X4CX23X','prod_01KNXXKA84F6PXGHVVEMRQVCPV','prod_01KNXXK20KBMPV56AYM969EYZT') AND product_category_id='pcat_ks_5x2_8';
-- ===== 15 INTRA liigutused (allikas-guard) =====
UPDATE product_category_product SET product_category_id='pcat_ks_5x2_25' WHERE product_id='prod_01KNXXB9V0WARTT3KGJB2DS2HB' AND product_category_id='pcat_ks_5x1_24';
UPDATE product_category_product SET product_category_id='pcat_5barista' WHERE product_id='prod_01KNXXKY4AGQCFJ29RY615YHVX' AND product_category_id='pcat_ks_5x2_21';
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_15' WHERE product_id='prod_01KNXXNEW9NQ1V4SKYQGBSW7CJ' AND product_category_id='pcat_ks_5x1_21';
UPDATE product_category_product SET product_category_id='pcat_5n29' WHERE product_id='prod_01KNXX8PHFC5CAEWZMFDB1358C' AND product_category_id='pcat_ks_5x1_21';
UPDATE product_category_product SET product_category_id='pcat_5n28' WHERE product_id='prod_01KNXXN35HW659XQ4D495VB64S' AND product_category_id='pcat_ks_5x1_16';
UPDATE product_category_product SET product_category_id='pcat_5n28' WHERE product_id='prod_01KNXXN428VVDTVEJKSM9CE5QQ' AND product_category_id='pcat_ks_5x1_21';
UPDATE product_category_product SET product_category_id='pcat_ks_5x2_22' WHERE product_id='prod_01KNXX7FSJQG4PABP3374QC30C' AND product_category_id='pcat_ks_5x2_20';
UPDATE product_category_product SET product_category_id='pcat_ks_5x10_1' WHERE product_id IN ('prod_01KNXXGFCSJAFAEEG02QM90GFX','prod_01KNXXBCG79E01VWEYPC2V5X54','prod_01KNXX6KSRX36D1GKHP16994VM') AND product_category_id='pcat_ks_5x2_20';
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_16' WHERE product_id IN ('prod_01KNXXQ35CPWC8DRTRTRRVM698','prod_01KNXXFHP5DDY0A1ZFK1EKB9ZW','prod_01KNXXR6M4GV94HJ0FMRJ4ZZYK') AND product_category_id='pcat_ks_5x1_15';
UPDATE product_category_product SET product_category_id='pcat_ks_5x2_5' WHERE product_id='prod_01KNXX6GF52SEAGV469QWXBD3G' AND product_category_id='pcat_ks_5x1_34';
UPDATE product_category_product SET product_category_id='pcat_5n5' WHERE product_id='prod_01KNXX8DFJW6AV6351SN1MZSW3' AND product_category_id='pcat_ks_5x2_12';
COMMIT;
\echo '--- uued + muudetud L3 ---'
SELECT c.name,(SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_5lauano','pcat_5kypse','pcat_5rasva','pcat_5kubufil','pcat_5urn','pcat_ks_5x2_9','pcat_5n7','pcat_ks_5x1_22','pcat_ks_5x2_25','pcat_ks_5x2_8','pcat_ks_5x1_15','pcat_ks_5x1_16') ORDER BY c.name;
\echo '--- distinct(17425) L3(1608->1613) ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
