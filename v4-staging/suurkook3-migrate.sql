BEGIN;
-- 4 griddle → Lauagrillid ja grillplaadid (dup-värav, olemas)
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_10' WHERE product_id IN ('prod_01KNXXN4YX3BWRXJFV9T1H986N','prod_01KNXXN4YWSC19W4MF9E7YRP18','prod_01KNXXADWR0Z6XMJ459VPA8BMY','prod_01KNXXAW8S726E7XPX977N7QHX') AND product_category_id='pcat_ks_5x2_7';
-- 2 canning-potti → Konserveerimistarvikud (seotud tüüp)
UPDATE product_category_product SET product_category_id='pcat_ks_5x2_10' WHERE product_id IN ('prod_01KNXXN5WECAXGPT589GJW8TXH','prod_01KNXXAPYPKDXKXMBKHN88WHG3') AND product_category_id='pcat_ks_5x2_8';
COMMIT;
\echo '--- tulem ---'
SELECT c.name,(SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_ks_5x2_7','pcat_ks_5x1_10','pcat_ks_5x2_8','pcat_ks_5x2_10') ORDER BY c.name;
SELECT 'distinct', count(DISTINCT product_id) FROM product_category_product;
