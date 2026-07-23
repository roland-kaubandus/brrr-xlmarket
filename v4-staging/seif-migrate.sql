-- Seifi-konsolideerimine: seifid→Büroo, relvakapid→#12 Jaht
BEGIN;
-- SAMM 2: Ladu Relvakapid ja relvaseifid (10) -> #12 Jaht Relvakapid & -seifid (merge)
UPDATE product_category_product SET product_category_id='pcat_12gun' WHERE product_category_id='pcat_t3f_13_2';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3f_13_2';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_t3f_13_2';
-- SAMM 3: Ladu Seifid (21) -> Büroo #21 Turvakapid & seifid (reparent L3)
UPDATE product_category SET parent_category_id='pcat_21safe', mpath='pcat_v4_l21.pcat_21safe.pcat_t3f_13_3', handle='v4-buroo-seifid' WHERE id='pcat_t3f_13_3';
-- SAMM 3b: tühjaks jäänud Ladu L2 Turvakapid & seifid -> kustuta
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_22safe';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_22safe';
COMMIT;
