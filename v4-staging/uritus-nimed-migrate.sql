-- #20 L3-nimed + sisu-parandused (FAAS): 1a rename Õhupallikaared, 2 merge Sammaspostide köied
BEGIN;
-- 1a: Õhupallikaared & raamid -> Laua-õhupallistatiivid (sisu = laua-varda-statiivid)
UPDATE product_category SET name='Laua-õhupallistatiivid', handle='v4-peoinventar-laua-ohupallistatiivid' WHERE id='pcat_mv_6x1_15';
-- 2: merge Sammaspostide köied (8 velvet) -> Piirdepostid & järjekorratõkked
UPDATE product_category_product SET product_category_id='pcat_t3f_13_7' WHERE product_category_id='pcat_t3f_13_5';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3f_13_5';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_t3f_13_5';
COMMIT;
