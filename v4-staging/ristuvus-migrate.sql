BEGIN;
-- #3: 4 "Pool Pump Motor" (komponent) Basseinipumbadest → Basseini- & pumbamootorid
UPDATE product_category_product SET product_category_id='pcat_11pool'
WHERE product_category_id='pcat_t3a_2_10'
  AND product_id IN (SELECT pcp.product_id FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id WHERE pcp.product_category_id='pcat_t3a_2_10' AND p.title ILIKE '%Pool Pump Motor%');
-- #4: Õuekraanid (3, identsed frost yard hydrandid) MERGE → Maaveepostid; kustuta Õuekraanid
UPDATE product_category_product SET product_category_id='pcat_t3a_8_9' WHERE product_category_id='pcat_es_10x5_12';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_es_10x5_12';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_es_10x5_12';
COMMIT;
