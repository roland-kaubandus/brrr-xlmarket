BEGIN;
UPDATE product_category_product SET product_category_id='pcat_es_9x5_1'
 WHERE product_category_id='pcat_es_9x5_4' AND product_id IN (
   SELECT p.id FROM product p WHERE p.title ~* 'handrail' AND p.title !~* 'railing post|rail post');
COMMIT;
