BEGIN;
UPDATE product_category_product SET product_category_id='pcat_12m2' WHERE product_category_id='pcat_el_12x2_23';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_el_12x2_23';
UPDATE product_category SET deleted_at=NOW(), updated_at=NOW() WHERE id='pcat_el_12x2_23';
COMMIT;
SELECT 'gym_matt' k, count(*) v FROM product_category_product WHERE product_category_id='pcat_12m2'
UNION ALL SELECT 'vahtmatid_deleted', (deleted_at IS NOT NULL)::int FROM product_category WHERE id='pcat_el_12x2_23'
UNION ALL SELECT 'vahtmatid_left', count(*) FROM product_category_product WHERE product_category_id='pcat_el_12x2_23'
UNION ALL SELECT 'L3', count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2
UNION ALL SELECT 'distinct', (SELECT count(DISTINCT product_id) FROM product_category_product);
