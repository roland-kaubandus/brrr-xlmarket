BEGIN;
-- a) Jäämasina pead(10) → Kommertsjäämasinad
UPDATE product_category_product SET product_category_id='pcat_ks_5x3_1' WHERE product_category_id='pcat_ks_5x3_4';
-- b) Jää hoiukonteinerid(7) → Jääkastid
UPDATE product_category_product SET product_category_id='pcat_ks_5x2_19' WHERE product_category_id='pcat_ks_5x3_5';
-- c) Katuse-päikeseenergia(9) → Väljalaskeventilaatorid
UPDATE product_category_product SET product_category_id='pcat_es_10x1_6' WHERE product_category_id='pcat_es_10x1_7';
-- RENAME (etalon-nimi, kattev)
UPDATE product_category SET name='Jäämahutid ja -kastid', updated_at=NOW() WHERE id='pcat_ks_5x2_19';
UPDATE product_category SET name='Väljalaske- ja katuseventilaatorid', updated_at=NOW() WHERE id='pcat_es_10x1_6';
-- KUSTUTA tühjenenud L3 (soft-delete + meta)
DELETE FROM taxonomy_node_meta WHERE node_id IN ('pcat_ks_5x3_4','pcat_ks_5x3_5','pcat_es_10x1_7');
UPDATE product_category SET deleted_at=NOW(), updated_at=NOW() WHERE id IN ('pcat_ks_5x3_4','pcat_ks_5x3_5','pcat_es_10x1_7');
-- 301 REDIRECT (vana handle → uus)
INSERT INTO slug_redirect (from_slug, to_slug, reason, created_at) VALUES
('v4-suurkoogiseadmed-jaamasinad-jaamasina-pead','v4-suurkoogiseadmed-jaamasinad-kommertsjaamasinad','merge',NOW()),
('v4-suurkoogiseadmed-jaamasinad-jaa-hoiukonteinerid','v4-suurkoogiseadmed-koogitarvikud-ja-noud-jaakastid','merge',NOW()),
('v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-katuse-ja-paikeseenergia-ventilaatorid','v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-valjalaskeventilaatorid','merge',NOW());
COMMIT;
\echo '--- merged L3 tootearvud ---'
SELECT c.name,(SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_ks_5x3_1','pcat_ks_5x2_19','pcat_es_10x1_6') ORDER BY c.name;
\echo '--- kustutatud tühjad? ---'
SELECT id, deleted_at IS NOT NULL del, (SELECT count(*) FROM product_category_product WHERE product_category_id=product_category.id) n FROM product_category WHERE id IN ('pcat_ks_5x3_4','pcat_ks_5x3_5','pcat_es_10x1_7');
\echo '--- distinct(17425) L3(1628->1625) ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
