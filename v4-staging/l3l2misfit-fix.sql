BEGIN;
-- #2 dup-värav MISS fix: Kaablitõmbelindid ja juhikud (2t) → Kaablitõmbelindid ja -tõmburid (19t)
UPDATE product_category_product SET product_category_id='pcat_1cab1' WHERE product_category_id='pcat_11fish' AND product_id NOT IN (SELECT product_id FROM product_category_product WHERE product_category_id='pcat_1cab1');
DELETE FROM product_category_product WHERE product_category_id='pcat_11fish';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_11fish';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_11fish';
COMMIT;
