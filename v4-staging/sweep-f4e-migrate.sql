-- Sweep FAAS 4e: #12 Hoiu-kotid grab-bag (golf välja + rename, cross-main FLAG); Kajakid Boat Seat välja
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;
-- SAMM 1: golf (4) -> Golfikäru-katted & -tarvikud
UPDATE product_category_product SET product_category_id='pcat_12gcart'
 WHERE product_category_id='pcat_el_12x1_30' AND product_id IN (
   SELECT id FROM product WHERE title ~* 'golf cart cover|golf storage|golf bag stand');
-- rename L3 -> Spordikotid & -organiserid (cross-main telescope/PS5/miniatuurid JÄÄVAD - FLAG)
UPDATE product_category SET name='Spordikotid & -organiserid', handle='v4-sport-spordikotid-organiserid' WHERE id='pcat_el_12x1_30';

-- SAMM 2: Boat Seat -> Paadiistmed
UPDATE product_category_product SET product_category_id='pcat_el_12x4_14'
 WHERE product_category_id='pcat_el_12x4_5' AND product_id IN (
   SELECT id FROM product WHERE metadata->>'vevor_sku'='CZZYZDWFZBSBJKGMK001V0');
COMMIT;
