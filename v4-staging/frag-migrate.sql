BEGIN;
-- PRE-EXISTING ÜLE-FRAGMENT MERGE (merge-judge kõrge + väljundi-test kinnitatud)
UPDATE product_category_product SET product_category_id='pcat_es_9x1_6' WHERE product_category_id='pcat_es_9x1_14';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_es_9x1_14';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_es_9x1_14';
UPDATE product_category_product SET product_category_id='pcat_es_9x1_6' WHERE product_category_id='pcat_es_9x1_10';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_es_9x1_10';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_es_9x1_10';
UPDATE product_category_product SET product_category_id='pcat_es_9x10_4' WHERE product_category_id='pcat_es_9x10_5';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_es_9x10_5';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_es_9x10_5';
COMMIT;
