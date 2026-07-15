BEGIN;
-- a. DISSOLVE Alalisvoolu(üld-DC, 5) → Harjaga (kõik harjaga/PM DC; üld-umbrella ebaloogiline harjaga+harjadeta kõrval)
UPDATE product_category_product SET product_category_id='pcat_el_11x3_6' WHERE product_category_id='pcat_el_11x3_5';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_el_11x3_5';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_el_11x3_5';
-- b. MERGE Kolmefaas(2) → Üksikfaas(12), rename Vahelduvvoolu (faas=power-supply variant)
UPDATE product_category_product SET product_category_id='pcat_el_11x3_4' WHERE product_category_id='pcat_11ac3';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_11ac3';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_11ac3';
UPDATE product_category SET name='Vahelduvvoolu elektrimootorid', updated_at=now() WHERE id='pcat_el_11x3_4';
COMMIT;
