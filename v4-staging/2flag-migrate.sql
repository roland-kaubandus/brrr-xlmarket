BEGIN;
-- FLAG1 MERGE: BLDC-komplektid → BLDC-mootorid (mõlemad mootor+kontroller kit, üle-fragment) + rename
UPDATE product_category_product SET product_category_id='pcat_el_11x3_2' WHERE product_category_id='pcat_el_11x3_3';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_el_11x3_3';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_el_11x3_3';
UPDATE product_category SET name='Harjadeta alalisvoolumootorid ja -komplektid', updated_at=now() WHERE id='pcat_el_11x3_2';
COMMIT;
