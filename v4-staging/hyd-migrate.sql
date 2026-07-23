-- Hüdraulika mislabel-fix: hüdro-süsteemi paak #2 Õlivahetusest -> #1 Hüdraulika Hüdroagregaadid
BEGIN;
UPDATE product_category_product SET product_category_id='pcat_hyd_1'
 WHERE product_category_id='pcat_ag2_2x4_7' AND product_id IN (SELECT id FROM product WHERE metadata->>'vevor_sku'='YYYX25JLHDWDJ0001V0');
COMMIT;
