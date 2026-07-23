-- Cross-main dup lukk 1: käru-konsolideerimine (#22 Töökärud bucket lahti)
BEGIN;
-- a) Lab-/med-kärud (7 Töökärud + 1 Teenindus-utility) -> #16 Meditsiinikärud
UPDATE product_category_product SET product_category_id='pcat_mv_6x4_9'
  WHERE product_category_id IN ('pcat_t3f_11_4','pcat_mv_6x4_8')
    AND product_id IN (SELECT id FROM product WHERE title ~* 'lab cart|lab rolling|lab serving|lab utility|mobile medical|dental util');
-- b) Keevituskärud (2 Töökärud) -> #1 Keevituskärud
UPDATE product_category_product SET product_category_id='pcat_t3f_7_15'
  WHERE product_category_id='pcat_t3f_11_4' AND product_id IN (SELECT id FROM product WHERE title ~* 'welding cart|welder cart');
-- c) Ostu-/käsikärud (3 Töökärud) -> #1 Ostukärud & -korvid
UPDATE product_category_product SET product_category_id='pcat_1ostu'
  WHERE product_category_id='pcat_t3f_11_4' AND product_id IN (SELECT id FROM product WHERE title ~* 'shopping|grocery|stair climber|rolling crate handcart');
-- d) Teenindus konsolideerimine: #1 Teenindus-universaal (5) -> #22 Teenindus-utility; kustuta #1 L3
UPDATE product_category_product SET product_category_id='pcat_mv_6x4_8' WHERE product_category_id='pcat_1teen';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_1teen';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_1teen';
COMMIT;
