-- Cross-main dup lukk 2: kapi-konsolideerimine (KLASTER B)
BEGIN;
-- SAMM 1: #22 prügikastid (8) -> #4 Köök (kus 6)
UPDATE product_category_product SET product_category_id='pcat_ks_4x3_1' WHERE product_category_id='pcat_6pull1';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_6pull1';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_6pull1';
-- SAMM 2: #22 kapiorganiserid (19) -> #4 Köök (kus 3)
UPDATE product_category_product SET product_category_id='pcat_ks_4x3_2' WHERE product_category_id='pcat_mv_6_pull';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_mv_6_pull';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_mv_6_pull';
-- SAMM 3: #2 Töölauad (7) -> #1 Töökoja sisustus Töölauad (kus 13)
UPDATE product_category_product SET product_category_id='pcat_ag2_2x1_1' WHERE product_category_id='pcat_ag2_2x2_10';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ag2_2x2_10';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_ag2_2x2_10';
COMMIT;
