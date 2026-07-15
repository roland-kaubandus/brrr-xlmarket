BEGIN;
-- 1. Ehitusplatsi kütteseadmed → Santehnika/Rätikukuivatid & elektriküte + rename (kaasaskantav ruumisoojendi, funktsioon>kütus)
UPDATE product_category
SET parent_category_id='pcat_10elheat', mpath='pcat_v4_l10.pcat_10elheat.pcat_d9_1',
    name='Kaasaskantavad ruumisoojendid',
    rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_10elheat' AND deleted_at IS NULL),
    updated_at=now()
WHERE id='pcat_d9_1';
-- 2. Kiirgussoojustus → Soojusisolatsioon MERGE (mõlemad 100% radiant barrier, sama väljund) + rename
UPDATE product_category_product SET product_category_id='pcat_es_9x9_2' WHERE product_category_id='pcat_es_9x9_3';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_es_9x9_3';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_es_9x9_3';
UPDATE product_category SET name='Kiirgusbarjäär-isolatsioonirullid', updated_at=now() WHERE id='pcat_es_9x9_2';
COMMIT;
