BEGIN;
-- ===== KÖÖGI-KORISTUS 1: vaakumpakendajad → tüüp-kodu =====

-- 1. Degassing-kammer MISFILE #5 Vaakumpakendajad → #1 Vaakumkambrid-degassing (silikoon/epoksü, MITTE toit)
UPDATE product_category_product SET product_category_id='pcat_ku1'
WHERE product_category_id='pcat_ks_5x1_28' AND product_id='prod_01KNXXCFTYCX2WAZF5S8NNHHQK';

-- 2. TOIDU-vaakumpakendajad #4 Vaakumpakkimismasinad (4) → #5 Vaakumpakendajad (tüüp-kodu, Pakendamine-liin)
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_28'
WHERE product_category_id='pcat_ks_4x1_18';

-- 3. Kustuta tühjaks jäänud #4 L3 (soft-delete + meta DELETE, konventsioon)
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ks_4x1_18';
UPDATE product_category SET deleted_at=NOW(), updated_at=NOW() WHERE id='pcat_ks_4x1_18';

COMMIT;

\echo '--- tulem ---'
SELECT c.name, count(pcp.product_id) AS n FROM product_category c
LEFT JOIN product_category_product pcp ON pcp.product_category_id=c.id
WHERE c.id IN ('pcat_ks_5x1_28','pcat_ku1','pcat_ks_4x1_18')
GROUP BY c.name,c.id ORDER BY c.name;
\echo '--- #4 kustutatud? ---'
SELECT id, deleted_at IS NOT NULL AS deleted FROM product_category WHERE id='pcat_ks_4x1_18';
\echo '--- distinct (17425) + L1 (23) ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND parent_category_id IS NULL AND deleted_at IS NULL;
