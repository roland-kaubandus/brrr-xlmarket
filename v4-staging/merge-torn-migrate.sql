BEGIN;
-- Tornventilaatorid(4) → Põranda-/kaasaskantavad (VARIANT: torn=põrandavent vorm, sama väljund=õhuvool)
UPDATE product_category_product SET product_category_id='pcat_es_10x1_2' WHERE product_category_id='pcat_es_10x1_3';
-- RENAME siht (etalon, kattev — torn nüüd nimes)
UPDATE product_category SET name='Põranda-, torni- ja kaasaskantavad ventilaatorid', updated_at=NOW() WHERE id='pcat_es_10x1_2';
-- KUSTUTA tühjenenud torn-L3
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_es_10x1_3';
UPDATE product_category SET deleted_at=NOW(), updated_at=NOW() WHERE id='pcat_es_10x1_3';
-- 301 redirect
INSERT INTO slug_redirect (from_slug, to_slug, reason, created_at) VALUES
('v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-tornventilaatorid','v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-poranda-ja-kaasaskantavad-ventilaatorid','merge',NOW());
COMMIT;
\echo '--- siht tootearv (19+4=23) + torn kustutatud ---'
SELECT c.name, c.deleted_at IS NOT NULL del, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_es_10x1_2','pcat_es_10x1_3');
\echo '--- distinct(17425) L3(1625->1624) ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
