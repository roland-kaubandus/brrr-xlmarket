-- Grab-bag lukk 1: Büroo/print/kulumaterjal
BEGIN;
-- SAMM 1: pcat_6kont lammutus
UPDATE product_category_product SET product_category_id='pcat_th1_3'
  WHERE product_category_id='pcat_6kont' AND product_id IN (SELECT id FROM product WHERE title ~* 'packing tape');
UPDATE product_category_product SET product_category_id='pcat_f4_13x3_6'
  WHERE product_category_id='pcat_6kont' AND product_id IN (SELECT id FROM product WHERE title ~* 'plotter paper|wide format');
UPDATE product_category_product SET product_category_id='pcat_el_11x1_14'
  WHERE product_category_id='pcat_6kont' AND product_id IN (SELECT id FROM product WHERE title ~* 'time clock|attendance');
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_6kont';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_6kont';
-- SAMM 2: termoprinter #21 -> #22 Termoprinterid (merge)
UPDATE product_category_product SET product_category_id='pcat_el_11x1_7' WHERE product_category_id='pcat_f4_13xtex_15';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_f4_13xtex_15';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_f4_13xtex_15';
COMMIT;
