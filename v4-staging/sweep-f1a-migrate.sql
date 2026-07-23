-- Sweep FAAS 1a: 8 concept-dup merge (#6 ×4, #2, #10, #13, #8)
-- 2026-07-04 · STAGING taxonomy-v4 · kõik verify'tud identne sisu
BEGIN;

-- Merge-helper: dup-guard -> move -> meta del -> soft-delete src
-- 1. #6 Kokkupandavad ruumijagajad (6x9_2) -> Ruumijagajad (6x9_1) = 53
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_mv_6x9_2' AND b.product_category_id='pcat_mv_6x9_1' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_mv_6x9_1' WHERE product_category_id='pcat_mv_6x9_2';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_mv_6x9_2';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_mv_6x9_2';

-- 2. #6 Konsoollauad (6x6_12) -> Konsoolilauad (6x4_1); rename -> "Konsoollauad" = 29
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_mv_6x6_12' AND b.product_category_id='pcat_mv_6x4_1' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_mv_6x4_1' WHERE product_category_id='pcat_mv_6x6_12';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_mv_6x6_12';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_mv_6x6_12';
UPDATE product_category SET name='Konsoollauad', handle='v4-moobel-ja-sisustus-lauad-konsoollauad' WHERE id='pcat_mv_6x4_1';

-- 3. #6 TV-alused & jalused (6tval) -> TV-alused (6x6_4) = 32
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_6tval' AND b.product_category_id='pcat_mv_6x6_4' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_mv_6x6_4' WHERE product_category_id='pcat_6tval';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_6tval';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_6tval';

-- 4. #6 Vannitoakapid (6x13_2) -> Vannitoakapid & hoiustamine (6x2_4) = 25
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_mv_6x13_2' AND b.product_category_id='pcat_mv_6x2_4' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_mv_6x2_4' WHERE product_category_id='pcat_mv_6x13_2';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_mv_6x13_2';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_mv_6x13_2';

-- 5. #2 Porta Power & hüdr. (2porta) -> Porta power komplektid (ag2_2x3_14) = 7
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_2porta' AND b.product_category_id='pcat_ag2_2x3_14' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_ag2_2x3_14' WHERE product_category_id='pcat_2porta';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_2porta';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_2porta';

-- 6. #10 Dušikomplektid (10x5_3) -> Dušisüsteemid (10x5_1) = 29
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_es_10x5_3' AND b.product_category_id='pcat_es_10x5_1' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_es_10x5_1' WHERE product_category_id='pcat_es_10x5_3';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_es_10x5_3';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_es_10x5_3';

-- 7. #13 Kuumpressid (13xtex_2) -> Kuumpressid (sublimatsioon) (13xtex_1); rename -> "Kuumpressid" = 64
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_f4_13xtex_2' AND b.product_category_id='pcat_f4_13xtex_1' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_f4_13xtex_1' WHERE product_category_id='pcat_f4_13xtex_2';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_f4_13xtex_2';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_f4_13xtex_2';
UPDATE product_category SET name='Kuumpressid', handle='v4-reklaami-truki-ja-graveerimisseadmed-tekstiili-ja-roivatrukk-kuumpressid' WHERE id='pcat_f4_13xtex_1';

-- 8. #8 3-way: Uksekatuse varikatused (8x1_2) + Aknakatuse varjualused (8x3_6) -> Uksekatuse ja aknakatuse visiirid (8x1_1); rename = 26
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_mv_8x1_2' AND b.product_category_id='pcat_mv_8x1_1' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_mv_8x1_1' WHERE product_category_id='pcat_mv_8x1_2';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_mv_8x1_2';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_mv_8x1_2';

DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_mv_8x3_6' AND b.product_category_id='pcat_mv_8x1_1' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_mv_8x1_1' WHERE product_category_id='pcat_mv_8x3_6';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_mv_8x3_6';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_mv_8x3_6';

UPDATE product_category SET name='Uksekatuse ja aknakatuse varikatused', handle='v4-varjualused-uksekatuse-ja-aknakatuse-varikatused' WHERE id='pcat_mv_8x1_1';

COMMIT;
