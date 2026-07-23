-- Sweep FAAS 1c: 3 FLAG lahendus — metallsaed tüübi-rename; kätekuivatid->#4; beebiväravad->#15
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;

-- ===== FLAG5: METALLSAED near-dup nimi-kollisioon =====
-- Chop Saw -> rename "Metalli katkestussaed"
UPDATE product_category SET name='Metalli katkestussaed', handle='v4-tooriistad-ja-tarvikud-elektrilised-tooriistad-metalli-katkestussaed' WHERE id='pcat_t3f_2_18';
-- Band Saw (Metallsaed, 1) -> Lintsaed (pcat_t3f_2_4, 13) = 14
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_t3f_6_15' AND b.product_category_id='pcat_t3f_2_4' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_t3f_2_4' WHERE product_category_id='pcat_t3f_6_15';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3f_6_15';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_t3f_6_15';

-- ===== FLAG6: KÄTEKUIVATID #11 (2) -> #4 Puhastus (ks_4x5_1) = 5 =====
DELETE FROM product_category_product a USING product_category_product b WHERE a.product_category_id='pcat_el_11x1_26' AND b.product_category_id='pcat_ks_4x5_1' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_ks_4x5_1' WHERE product_category_id='pcat_el_11x1_26';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_el_11x1_26';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_el_11x1_26';

-- ===== FLAG7: BEEBIVÄRAVAD 40 (#14 lp_1_2) -> #15 Turvaväravad (f4_15x2_6, 5) = 45; 4 pet jäävad =====
CREATE TEMP TABLE _baby(pid text) ON COMMIT DROP;
INSERT INTO _baby SELECT pcp.product_id FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
  WHERE pcp.product_category_id='pcat_lp_1_2' AND p.title ~* 'baby gate|safety gate|stair gate';
DELETE FROM product_category_product a USING _baby WHERE a.product_category_id='pcat_f4_15x2_6' AND a.product_id=_baby.pid;
UPDATE product_category_product SET product_category_id='pcat_f4_15x2_6' WHERE product_category_id='pcat_lp_1_2' AND product_id IN (SELECT pid FROM _baby);
-- lp_1_2 jääk = 4 pet gate -> rename
UPDATE product_category SET name='Lemmiklooma-väravad', handle='v4-lemmikloomatarbed-lemmiklooma-varavad' WHERE id='pcat_lp_1_2';

COMMIT;
