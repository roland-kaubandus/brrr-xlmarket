BEGIN;
-- 6 PÄRIS-DUP koondamine (kogu allikas-L3 → tüüp-kodusse; allikas tühjeneb)
UPDATE product_category_product SET product_category_id='pcat_el_11x1_18' WHERE product_category_id='pcat_t3a_6_11'; -- ilmajaamad Aed→#23
UPDATE product_category_product SET product_category_id='pcat_lr1'        WHERE product_category_id='pcat_3laad';    -- laadimisrambid Auto→Tööriistad
UPDATE product_category_product SET product_category_id='pcat_el_12x5_9'  WHERE product_category_id='pcat_3wc';      -- matkatualetid Auto→Sport
UPDATE product_category_product SET product_category_id='pcat_mv_6x7_2'   WHERE product_category_id='pcat_15mah';    -- mähkimislauad Beebi→Lapsemööbel
UPDATE product_category_product SET product_category_id='pcat_9comp'      WHERE product_category_id='pcat_7pc';      -- pinnasetihendajad Aed→Ehitus
UPDATE product_category_product SET product_category_id='pcat_fit_2'      WHERE product_category_id='pcat_f4_17x1_4';-- treeningjalatsid Tööjalatsid→Sport

-- kustuta 6 tühjenenud L3 (soft-delete + meta DELETE)
DELETE FROM taxonomy_node_meta WHERE node_id IN ('pcat_t3a_6_11','pcat_3laad','pcat_3wc','pcat_15mah','pcat_7pc','pcat_f4_17x1_4');
UPDATE product_category SET deleted_at=NOW(), updated_at=NOW() WHERE id IN ('pcat_t3a_6_11','pcat_3laad','pcat_3wc','pcat_15mah','pcat_7pc','pcat_f4_17x1_4');
COMMIT;
\echo '--- koondatud sihtmärgid ---'
SELECT c.name, (SELECT name FROM product_category WHERE id=split_part(c.mpath,'.',1)) main, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_el_11x1_18','pcat_lr1','pcat_el_12x5_9','pcat_mv_6x7_2','pcat_9comp','pcat_fit_2') ORDER BY c.name;
\echo '--- 6 L3 kustutatud + tühi? ---'
SELECT id, deleted_at IS NOT NULL del, (SELECT count(*) FROM product_category_product WHERE product_category_id=product_category.id) n FROM product_category WHERE id IN ('pcat_t3a_6_11','pcat_3laad','pcat_3wc','pcat_15mah','pcat_7pc','pcat_f4_17x1_4') ORDER BY id;
\echo '--- dead-L2 kontroll (kustutatud L3-de vanemad) ---'
WITH v4 AS (SELECT * FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL)
SELECT count(*) dead_l2 FROM v4 l2 WHERE (char_length(l2.mpath)-char_length(replace(l2.mpath,'.','')))=1 AND NOT EXISTS(SELECT 1 FROM v4 l3 WHERE l3.parent_category_id=l2.id);
\echo '--- distinct(17425) L3 ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
