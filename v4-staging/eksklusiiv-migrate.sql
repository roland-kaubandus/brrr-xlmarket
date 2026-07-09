BEGIN;
-- ===== UUED L3-d =====
INSERT INTO product_category (id,name,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
('pcat_24batuut','Täispuhutavad batuudid','v4-lastekaubad-ouemanguasjad-taispuhutavad-batuudid',true,false,'pcat_24oue','pcat_v4_l24.pcat_24oue.pcat_24batuut',0,NOW(),NOW()),
('pcat_12swhw','Kiige-kinnitused & furnituur','v4-sport-ja-vaba-aeg-ouetegevus-kiige-kinnitused',true,false,'pcat_v4_l12_1','pcat_v4_l12.pcat_v4_l12_1.pcat_12swhw',20,NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,created_at,updated_at) VALUES
('pcat_24batuut',3,'active','manual',true,NOW(),NOW()),('pcat_12swhw',3,'active','manual',true,NOW(),NOW());

-- ===== SAMM 1: 17 kindlat → #24 =====
-- 13 batuut-loss #20 → #24 Täispuhutavad batuudid
UPDATE product_category_product SET product_category_id='pcat_24batuut'
WHERE product_category_id='pcat_el_12x2_8' AND product_id IN ('prod_01KPJVE4P7CYCKB35X08GNW2XR','prod_01KPJVE526Z8HKAG11ES20JXR6','prod_01KPJVE4FWRGH6BTEAWRTD3WNK','prod_01KP6FESR45T4FC0CFWY6C9YEY','prod_01KPJVE58JKYYT0P2FJC4Z1TFB','prod_01KP6FEYZDWY8VWDRXWNY4VCXP','prod_01KPJVE4WHX4Y6J79ZBMFGN27G','prod_01KNXXCB9W62KQ5MM0FNCFQJ3N','prod_01KNXXCB9X2H9B6JYMTS96KMHJ','prod_01KNXXCB9XDYG4WR52X6N6SDX2','prod_01KNXXCC6HB21SXJRAE7TGN6HP','prod_01KNXXCC6GE56JVQDKSPAD0PG1','prod_01KNXXCC6EBVK1KKNPE3DDBD4X');
-- 2 mini-toddler-batuut #12 → #24 Trampoliinid ja batuudid
UPDATE product_category_product SET product_category_id='pcat_el_12x2_7'
WHERE product_category_id='pcat_el_12x9_3' AND product_id IN ('prod_01KNXXHYVFK09Q3ZSC98CGTY9N','prod_01KNXXHV9RS05PX7RWQ5M3MZRF');
-- 1 toddler-scooter #12 Lasterollerid → #24 Laste tõukerattad
UPDATE product_category_product SET product_category_id='pcat_el_12x2_1'
WHERE product_category_id='pcat_el_12x1_20' AND product_id='prod_01KPJV6S5ZPYPABHMS9WVB8CYS';

-- ===== SAMM 2: kiige-teema (disain otsustab) =====
-- toddler 3-in-1 + 8 backyard kids swing set + 6-in-1 (10) → #24 Kiiged ja kiikhobud
UPDATE product_category_product SET product_category_id='pcat_el_12x2_6'
WHERE product_category_id='pcat_12swing' AND product_id IN ('prod_01KNXXEM3ZXPTFNJSWA2HY1DB6','prod_01KPJXEGJ88QKG9SG9K6GQYRV1','prod_01KPJXEEPC20B4ENQJ1WSKB5EJ','prod_01KP6FFQN3PZC0MAHSB32YVCZW','prod_01KPJXEE26PV0Z927RMF0BA41E','prod_01KPJXEDMRCEHCG20Y56YE4W1R','prod_01KNXXECZQB0BAYYMMRNHKM0N7','prod_01KNXXECZZYEDN91HTFED6XFHC','prod_01KNXXEDXS5WFJ6BDD49MXFN9P','prod_01KNXXEFQ2T3PNHNB5P513674A');
-- 9 furnituur → uus #12 Kiige-kinnitused & furnituur
UPDATE product_category_product SET product_category_id='pcat_12swhw'
WHERE product_category_id='pcat_12swing' AND product_id IN ('prod_01KNXXADXKH3PBW21BF2SCYEAF','prod_01KNXXAEST0DC6CV9ZET57TC9F','prod_01KNXXADXTA5KBFCBK8PRDWXBF','prod_01KPJVHBX3624JQ40N2FC460GK','prod_01KPGAVSJFXC4XD6532NH07KF5','prod_01KPJVHC3HD4RD00YRN5RR7KTT','prod_01KQA2TY45WDJ04NGWYB3B7M9B','prod_01KQAGJCSJJ26RZJTZ6SBJVHGQ','prod_01KPGAVST25D4QC4JA2VXGXQPF');
-- rename pcat_12swing → "Aiakiiged" (jääb 6: nest/tent + saucer/tree, kaheti)
UPDATE product_category SET name='Aiakiiged', updated_at=NOW() WHERE id='pcat_12swing';

-- ===== SAMM 3: piiripealsed =====
-- 3 toddler play-mat → #15 Beebi Mängumatid ja -aiad
UPDATE product_category_product SET product_category_id='pcat_f4_15x2_3'
WHERE product_category_id='pcat_12m2' AND product_id IN ('prod_01KNXXHA7JJSFJQZ756KM9XHV4','prod_01KNXXHDSR201V41WMCEH9R50D','prod_01KNXXHA7MJYMB1E7DT74N42WP');
-- 3 sensoor-crash-pad ("for Kids Sensory, Children") → #24 Tasakaalu- ja liikumismänguasjad (laste-arendus)
UPDATE product_category_product SET product_category_id='pcat_el_12x2_16'
WHERE product_category_id='pcat_12m2' AND product_id IN ('prod_01KPJVD127A43HYRKHQ70XBAJD','prod_01KP6FDQB8EBBFF1P1Z7MMD2CG','prod_01KPJVD0VZ9X1579D0C9YEQCDY');
-- Yard Drag Sled (mislabel) → #7 ATV-haagised & järelkärud
UPDATE product_category_product SET product_category_id='pcat_7cart1'
WHERE product_category_id='pcat_el_12x1_20' AND product_id='prod_01KNXXQP5P4Y84HED7TC1D01MZ';

-- ===== kustuta tühjenenud L3-d =====
DELETE FROM taxonomy_node_meta WHERE node_id IN ('pcat_el_12x2_8','pcat_el_12x9_3');
UPDATE product_category SET deleted_at=NOW(), updated_at=NOW() WHERE id IN ('pcat_el_12x2_8','pcat_el_12x9_3');
COMMIT;

\echo '--- #24 uued/mõjutatud + uued #12/#15/#7 ---'
SELECT c.name, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c
WHERE c.id IN ('pcat_24batuut','pcat_el_12x2_7','pcat_el_12x2_1','pcat_el_12x2_6','pcat_12swhw','pcat_12swing','pcat_f4_15x2_3','pcat_el_12x2_16','pcat_7cart1','pcat_el_12x1_20') ORDER BY c.name;
\echo '--- tühjenenud kustutatud? ---'
SELECT id, deleted_at IS NOT NULL AS del, (SELECT count(*) FROM product_category_product WHERE product_category_id=product_category.id) n FROM product_category WHERE id IN ('pcat_el_12x2_8','pcat_el_12x9_3');
\echo '--- distinct(17425) + L1(24) + L3 ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND parent_category_id IS NULL AND deleted_at IS NULL;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
