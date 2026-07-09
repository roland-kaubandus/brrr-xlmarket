BEGIN;
-- 5× "for Kids" kiik (saucer/tree/nest/tent, signaali-hierarhia: turundus>kandevõime) → #24 Kiiged ja kiikhobud
UPDATE product_category_product SET product_category_id='pcat_el_12x2_6'
WHERE product_category_id='pcat_12swing' AND product_id IN ('prod_01KNXX9YGGM2K1V26JX8MP4JPE','prod_01KNXXBJVN7MT0Z1Q4P1JX8KJQ','prod_01KNXXEZ57303SRZAAGS61QTCS','prod_01KNXXEZ4ATMAZKRE6SA5YWPDW','prod_01KNXXEY7XNDYW2PM35PZZT4AV');
-- 1× Platform Swing "for Kids AND Adults" (PÄRISELT kaheti) → #7 Aiakiiged ja võrkkiiged (täisk/kaheti kodu)
UPDATE product_category_product SET product_category_id='pcat_t3a_7_2'
WHERE product_category_id='pcat_12swing' AND product_id='prod_01KNXXF012NNB4P4XCAWZVZY6F';
-- #12 "Aiakiiged" tühjeneb → kustuta (kids-kiik on #24, adult/kaheti on #7 — #12 Sport ei vaja kiige-L3)
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_12swing';
UPDATE product_category SET deleted_at=NOW(), updated_at=NOW() WHERE id='pcat_12swing';
COMMIT;
\echo '--- tulem ---'
SELECT c.name, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_el_12x2_6','pcat_t3a_7_2','pcat_12swing');
\echo '--- Aiakiiged kustutatud + tühi? ---'
SELECT deleted_at IS NOT NULL AS del, (SELECT count(*) FROM product_category_product WHERE product_category_id='pcat_12swing') n FROM product_category WHERE id='pcat_12swing';
\echo '--- distinct(17425) L1(24) ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND parent_category_id IS NULL AND deleted_at IS NULL;
