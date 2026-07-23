-- Sweep FAAS 1b: 4 verify'tud concept-dup merge (#11 foto, #12 kino, #14 ×2)
-- 2026-07-04 · STAGING taxonomy-v4 · #5 Metallsaed + #6 kätekuivatid + #7 gates = FLAG (ei merge)
BEGIN;

-- 1. #11 Fotostuudio valgustus (11x1_5, Elektroonika) -> Fotostuudio valgustid (11x6_5, Töö-&erivalgustus) = 18
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_el_11x1_5' AND b.product_category_id='pcat_el_11x6_5' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_el_11x6_5' WHERE product_category_id='pcat_el_11x1_5';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_el_11x1_5';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_el_11x1_5';

-- 2. #12 Välikinod (12x5_15, Matka) -> Täispuhutavad projektsiooniekraanid (12x1_39, Õuetegevus) = 6
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_el_12x5_15' AND b.product_category_id='pcat_el_12x1_39' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_el_12x1_39' WHERE product_category_id='pcat_el_12x5_15';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_el_12x5_15';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_el_12x5_15';

-- 3. #14 Lemmiklooma autobarjäärid (lp_2_8, Hooldus) -> Lemmikloomade autobarjäärid (lp_3_1, Transport) = 10
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_lp_2_8' AND b.product_category_id='pcat_lp_3_1' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_lp_3_1' WHERE product_category_id='pcat_lp_2_8';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_lp_2_8';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_lp_2_8';

-- 4. #14 Koera autoistme katted (lp_2_4, Hooldus) -> Auto istmekatted & põrandakaitsed (lp_3_6, Transport) = 13
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_lp_2_4' AND b.product_category_id='pcat_lp_3_6' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_lp_3_6' WHERE product_category_id='pcat_lp_2_4';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_lp_2_4';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_lp_2_4';

COMMIT;
