BEGIN;
-- Paranda: tervikpumbad (L/h vooluhulk) mille pikk tiitel mainis 'Pool Pump Motor' → tagasi Basseinipumbadesse
UPDATE product_category_product SET product_category_id='pcat_t3a_2_10'
WHERE product_category_id='pcat_11pool'
  AND product_id IN (SELECT pcp.product_id FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id WHERE pcp.product_category_id='pcat_11pool' AND (p.title ILIKE '%L/h%' OR p.title ILIKE '%Strainer%'));
COMMIT;
