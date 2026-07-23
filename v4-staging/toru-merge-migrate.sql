-- #1 Torutööriistad: merge Torutöötlustööriistad (2 crimperit) -> Toru pressimistööriistad
BEGIN;
UPDATE product_category_product SET product_category_id='pcat_t3f_3_4' WHERE product_category_id='pcat_t3f_2_20';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3f_2_20';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_t3f_2_20';
COMMIT;
