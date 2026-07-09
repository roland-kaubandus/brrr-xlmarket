BEGIN;
-- SAMM 1: rannatelgid #12 Sport (14 telki) → Varjualused-telgid-main (tüüp=telk, kõik telgid koos)
UPDATE product_category_product SET product_category_id='pcat_mv_8x2_1' WHERE product_category_id='pcat_el_12x5_3';
-- SAMM 2: õllepruulimine #4 Kodumasinad (9 brewerit) → #5 Suurköök Joogiseadmed (tüüp-kodu, kõrvuti joogiseadmetega)
UPDATE product_category_product SET product_category_id='pcat_ks_5x2_30' WHERE product_category_id='pcat_ks_4x1_12';
-- kustuta tühjenenud L3-d
DELETE FROM taxonomy_node_meta WHERE node_id IN ('pcat_el_12x5_3','pcat_ks_4x1_12');
UPDATE product_category SET deleted_at=NOW(), updated_at=NOW() WHERE id IN ('pcat_el_12x5_3','pcat_ks_4x1_12');
COMMIT;
\echo '--- tulem ---'
SELECT c.name, (SELECT name FROM product_category WHERE id=split_part(c.mpath,'.',1)) main, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_mv_8x2_1','pcat_ks_5x2_30');
\echo '--- kustutatud tühjad? + dead-L2 ---'
SELECT id, deleted_at IS NOT NULL del, (SELECT count(*) FROM product_category_product WHERE product_category_id=product_category.id) n FROM product_category WHERE id IN ('pcat_el_12x5_3','pcat_ks_4x1_12');
WITH v4 AS (SELECT * FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL) SELECT count(*) dead_l2 FROM v4 l2 WHERE (char_length(l2.mpath)-char_length(replace(l2.mpath,'.','')))=1 AND NOT EXISTS(SELECT 1 FROM v4 l3 WHERE l3.parent_category_id=l2.id);
\echo '--- distinct(17425) L3 ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
