BEGIN;
-- Soft-delete KÕIK ülejäänud mitte-v4 aktiivsed scaffold-kategooriad (0 toodet)
DELETE FROM taxonomy_node_meta WHERE node_id IN (SELECT id FROM product_category WHERE deleted_at IS NULL AND is_active AND mpath NOT LIKE 'pcat_v4_l%');
UPDATE product_category SET deleted_at=now(), is_active=false, updated_at=now() WHERE deleted_at IS NULL AND is_active AND mpath NOT LIKE 'pcat_v4_l%';
COMMIT;
