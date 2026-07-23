-- #4 Köögitehnika lõpetus: Vorstitäitemasinad 11->#5 (2 väikseimat kodu jää); pasta-otsad->#5
-- 2026-07-05 · STAGING taxonomy-v4
BEGIN;
CREATE TEMP TABLE _vsrc AS SELECT id FROM product_category WHERE name='Vorstitäitemasinad ja -pressid' AND parent_category_id=(SELECT id FROM product_category WHERE name='Köögitehnika' AND parent_category_id='pcat_v4_l4');
-- Vorst 11 (v.a 2 väikseimat 1.5L+2L) -> #5 Vorstimasinad ja -täitjad
DELETE FROM product_category_product a WHERE a.product_category_id=(SELECT id FROM _vsrc)
  AND a.product_id NOT IN (SELECT id FROM product WHERE metadata->>'vevor_sku' IN ('SDLSBXGGC15L18HO0V0','SDLSBXGGCJ2LHRF1AV0'))
  AND EXISTS (SELECT 1 FROM product_category_product b WHERE b.product_category_id='pcat_ks_5x1_18' AND b.product_id=a.product_id);
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_18' WHERE product_category_id=(SELECT id FROM _vsrc)
  AND product_id NOT IN (SELECT id FROM product WHERE metadata->>'vevor_sku' IN ('SDLSBXGGC15L18HO0V0','SDLSBXGGCJ2LHRF1AV0'));
-- pasta-otsad (KitchenAid Pasta Attachment) -> #5 Pastamasinad; L3 tühjeneb -> kustut
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_ks_4x4_5' AND b.product_category_id='pcat_5n29' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_5n29' WHERE product_category_id='pcat_ks_4x4_5';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ks_4x4_5';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_ks_4x4_5';
COMMIT;
