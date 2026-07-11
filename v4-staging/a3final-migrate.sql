BEGIN;
-- 1. MERGE markiisid (manual+motorized = variant)
UPDATE product_category_product SET product_category_id='pcat_mv_8x3_2' WHERE product_category_id='pcat_mv_8x3_1';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_mv_8x3_1';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_mv_8x3_1';
-- 2. MERGE mootorratta kotid (saddlebag+tail = variant)
UPDATE product_category_product SET product_category_id='pcat_ag2_3x6_13' WHERE product_category_id='pcat_ag2_3x2_12';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ag2_3x2_12';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_ag2_3x2_12';
-- 3. MERGE koormasidurid (chain binder = variant)
UPDATE product_category_product SET product_category_id='pcat_ag2_3x1_9' WHERE product_category_id='pcat_3bind';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_3bind';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_3bind';
-- 5. 3x7_4 Katusereilingud = van ladder rack (vale silt) → Katusekandurid, kustuta
UPDATE product_category_product SET product_category_id='pcat_ag2_3x7_1' WHERE product_id IN ('prod_01KNXXCFV38866GMVEEFF21TKG','prod_01KNXXCGRHSBXMJRSGV50B9SPV');
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ag2_3x7_4';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_ag2_3x7_4';
-- 6. 3x7_9 → rename (hitch cargo carrier, eristus roof-korvidest)
UPDATE product_category SET name='Haakekonksu kaubakandurid', updated_at=now() WHERE id='pcat_ag2_3x7_9';
-- 7. winch mount 3x1_13 → 3x1_6 (koondamine)
UPDATE product_category_product SET product_category_id='pcat_ag2_3x1_6' WHERE product_id='prod_01KNXXR6MZG0R29KSVH037F9DC';
-- 8. jack-bracket orb → Jeep/maasturi välisosad (off-road jack mount)
UPDATE product_category_product SET product_category_id='pcat_vt_3' WHERE product_id='prod_01KNXXPH7YMAK9AD5SKR3T598R';
-- 301
INSERT INTO slug_redirect (from_slug,to_slug,reason,created_at) VALUES
('v4-auto-mootor-rv-markiisid','v4-auto-matka-haagissuvila-markiisid','merge',now()),
('v4-autovaruosad-ja-tarvikud-mootorratta-sadulakotid','v4-autovaruosad-ja-tarvikud-mootorratta-kotid','merge',now()),
('v4-auto-koorma-kinnitusketid','v4-autovaruosad-ja-tarvikud-pukseerimisseadmed-koormasidurid-ja-ratsettkinnitid','merge',now()),
('v4-autovaruosad-ja-tarvikud-katuse-ja-koormakandjad-katusereilingud','v4-autovaruosad-ja-tarvikud-katuse-ja-koormakandjad-katusekandurid','merge',now());
COMMIT;
\echo '--- merged (0=kustutatud) ---'
SELECT c.name,(SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n, c.deleted_at IS NOT NULL del FROM product_category c WHERE c.id IN ('pcat_mv_8x3_2','pcat_mv_8x3_1','pcat_ag2_3x6_13','pcat_ag2_3x2_12','pcat_ag2_3x1_9','pcat_3bind','pcat_ag2_3x7_1','pcat_ag2_3x7_4','pcat_ag2_3x7_9') ORDER BY del,c.name;
