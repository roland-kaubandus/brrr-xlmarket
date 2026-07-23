-- FAAS 4 lõpp: matt-split + craft grab-bag lammutus
BEGIN;
-- OSA A: matt-split
UPDATE product_category_product SET product_category_id='pcat_el_12x3_7'
  WHERE product_category_id='pcat_el_12x3_11' AND product_id IN (SELECT id FROM product WHERE title ~* 'yoga mat');
UPDATE product_category_product SET product_category_id='pcat_12m2'
  WHERE product_category_id='pcat_el_12x3_11';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_el_12x3_11';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_el_12x3_11';
-- OSA B: craft klasterdus
-- Pottsepakedrad 9 -> #12 Keraamika (pcat_12cer1)
UPDATE product_category_product SET product_category_id='pcat_12cer1'
  WHERE product_category_id='pcat_13craft' AND product_id IN (SELECT id FROM product WHERE title ~* 'pottery wheel');
-- Juveeli 3 -> #13 Juveeli- & metallitöö L3-d
UPDATE product_category_product SET product_category_id='pcat_13roll' WHERE product_id='prod_01KNXX72556E2GPXZVTYAWW055' AND product_category_id='pcat_13craft';
UPDATE product_category_product SET product_category_id='pcat_f4_13x1_15' WHERE product_id='prod_01KNXX615Q8VK22GY4N9Y0WA3V' AND product_category_id='pcat_13craft';
UPDATE product_category_product SET product_category_id='pcat_f4_13x1_8' WHERE product_id='prod_01KPJX9CZ5BKFTJ600HBE3T9SX' AND product_category_id='pcat_13craft';
-- Residual 15 -> reparent #12 Õuetegevus & hobi + rename
UPDATE product_category SET parent_category_id='pcat_v4_l12_1', mpath='pcat_v4_l12.pcat_v4_l12_1.pcat_13craft', name='Käsitöö- & hobiseadmed', handle='v4-sport-kasitoo-hobiseadmed' WHERE id='pcat_13craft';
COMMIT;
