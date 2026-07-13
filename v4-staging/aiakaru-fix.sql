BEGIN;
-- Teravda piir: elektri-dump-cartid Aiakärudest → Kallutuskärud (misfit, kallutus-mehhanism)
UPDATE product_category_product SET product_category_id='pcat_7cart2'
WHERE product_category_id='pcat_t3a_1_1'
  AND product_id IN (SELECT pcp.product_id FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id WHERE pcp.product_category_id='pcat_t3a_1_1' AND p.title ILIKE '%Dump Cart%');
COMMIT;
