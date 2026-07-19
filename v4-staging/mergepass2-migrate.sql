BEGIN;
-- #8 MERGE Koeravoodid → Lemmiklooma voodid (mõlemad 'Elevated Dog/Pet Bed' literal dup)
UPDATE product_category_product SET product_category_id='pcat_lp_4_6' WHERE product_category_id='pcat_lp_4_4';

DELETE FROM taxonomy_node_meta WHERE node_id='pcat_lp_4_4';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_lp_4_4';
-- #9 rename-fix: eemalda nime-konflikt chafing dish-iga
UPDATE product_category SET name='Soemarmiidid ja bain-marie', updated_at=now() WHERE id='pcat_ks_5x1_4';
-- re-compact pet-beds L2 rank
WITH r AS (SELECT id, row_number() OVER (ORDER BY rank,name) rn FROM product_category WHERE parent_category_id=(SELECT parent_category_id FROM product_category WHERE id='pcat_lp_4_6') AND deleted_at IS NULL) UPDATE product_category p SET rank=r.rn FROM r WHERE p.id=r.id;
COMMIT;
