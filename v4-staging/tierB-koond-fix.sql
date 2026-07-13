BEGIN;
-- FIX: Akvaarium dup-värav (filter+cleaner → olemasolevad kodud), chiller jääb
UPDATE product_category_product SET product_category_id='pcat_lp_5_3' WHERE product_id='prod_01KNXXBTYQVPRNB8DZ8QY6Z50K' AND product_category_id='pcat_lp_1_4';
UPDATE product_category_product SET product_category_id='pcat_lp_2_7' WHERE product_id='prod_01KNXXD91PNHMPPM2V87843AN5' AND product_category_id='pcat_lp_1_4';
UPDATE product_category SET name='Akvaariumijahutid', updated_at=now() WHERE id='pcat_lp_1_4';
-- FIX: Pitsataigna-pressid → olemasolev Tortillapressid (variant), kustuta uus tühi L3
UPDATE product_category_product SET product_category_id='pcat_5n28' WHERE product_category_id='pcat_5press';
UPDATE product_category SET name='Tortilla- ja pitsataignapressid', updated_at=now() WHERE id='pcat_5n28';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_5press';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_5press';
COMMIT;
