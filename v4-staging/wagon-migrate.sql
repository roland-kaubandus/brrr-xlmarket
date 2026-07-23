-- Wagon-disain: leisure-vankrid #7 Aiatööriistad -> #12 Matkavarustus (ranna/üld split)
BEGIN;
-- #12 "Rannakärud ja -vankrid" -> rename "Rannakärud" (KITSAS)
UPDATE product_category SET name='Rannakärud', handle='v4-sport-rannakarud' WHERE id='pcat_el_12x5_4';
-- #7 "Kokkupandavad veovankrid" (7) -> reparent #12 Matkavarustus (LAI)
UPDATE product_category SET parent_category_id='pcat_v4_l12_5', mpath='pcat_v4_l12.pcat_v4_l12_5.pcat_7cart4', handle='v4-sport-kokkupandavad-veovankrid' WHERE id='pcat_7cart4';
-- 5 beach-sand-dolly (#7 Rannakärud 'for sand') -> #12 Rannakärud
UPDATE product_category_product SET product_category_id='pcat_el_12x5_4'
  WHERE product_category_id='pcat_7cart3' AND product_id IN (SELECT id FROM product WHERE title ~* 'for sand');
-- ülejäänud 7 (#7 Rannakärud peidus üld-veovankrid) -> #12 Kokkupandavad veovankrid
UPDATE product_category_product SET product_category_id='pcat_7cart4' WHERE product_category_id='pcat_7cart3';
-- kustuta tühi #7 Rannakärud
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_7cart3';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_7cart3';
COMMIT;
