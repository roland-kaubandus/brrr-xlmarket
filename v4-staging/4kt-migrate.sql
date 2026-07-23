-- #4 Köögitehnika: kommerts->#5 (deli-slicer/grinder/chest/tortilla); Slushi rename
-- 2026-07-04 · STAGING taxonomy-v4 · Vorst + pasta-otsad = FLAG (ei liiguta)
BEGIN;
-- 1. Lihalõikurid #4 (8) -> #5: grinderid -> Hakklihamasinad, slicerid -> Lihalõikurid
DELETE FROM product_category_product a USING product p WHERE a.product_id=p.id AND a.product_category_id='pcat_ks_4x1_10' AND p.title ~* 'grinder|mincer' AND EXISTS (SELECT 1 FROM product_category_product b WHERE b.product_category_id='pcat_ks_5x1_7' AND b.product_id=a.product_id);
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_7' WHERE product_category_id='pcat_ks_4x1_10' AND product_id IN (SELECT id FROM product WHERE title ~* 'grinder|mincer');
DELETE FROM product_category_product a USING product p WHERE a.product_id=p.id AND a.product_category_id='pcat_ks_4x1_10' AND p.title ~* 'slicer|deli' AND EXISTS (SELECT 1 FROM product_category_product b WHERE b.product_category_id='pcat_ks_5x1_6' AND b.product_id=a.product_id);
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_6' WHERE product_category_id='pcat_ks_4x1_10' AND product_id IN (SELECT id FROM product WHERE title ~* 'slicer|deli');
-- delete tühi Lihalõikurid #4
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ks_4x1_10';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_ks_4x1_10';

-- 2. Külmikud: 2 chest freezer -> #5 Sügavkülmikud ja külmakirstud
UPDATE product_category_product SET product_category_id='pcat_5n12' WHERE product_category_id='pcat_ks_4x1_5' AND product_id IN (SELECT id FROM product WHERE title ~* 'chest freezer');

-- 3. Tortilla Maker -> #5 Kreebi- ja pannkoogimasinad
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_16' WHERE product_category_id='pcat_ks_4x1_16' AND product_id IN (SELECT id FROM product WHERE metadata->>'vevor_sku'='DDYMBJDDK55I9RU9JV2');

-- 4. Slushi- ja suhkruvatimasinad -> rename (sisu=popkorn+cotton candy, 0 slushi)
UPDATE product_category SET name='Popkorni- ja suhkruvatimasinad', handle='v4-koogitehnika-popkorni-suhkruvatimasinad' WHERE id='pcat_ks_4x1_13';
COMMIT;
