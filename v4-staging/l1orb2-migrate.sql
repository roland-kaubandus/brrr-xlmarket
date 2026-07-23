-- L1-orb-paigutus 2: selged jäägid
BEGIN;
-- #12 seebilõikurid/seebitegemine (käsitöö, vale main) -> #13 Käsitöö-seadmed
UPDATE product_category_product SET product_category_id='pcat_13craft' WHERE product_category_id='pcat_v4_l12' AND product_id IN (SELECT id FROM product WHERE title ~* 'soap');
-- #10 vaakumkamber -> #5 Vaakumpakendajad
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_28' WHERE product_category_id='pcat_v4_l10' AND product_id IN (SELECT id FROM product WHERE title ~* 'vacuum chamber');
-- #7 T Post Driver -> Maapuurid ja postiaugurid
UPDATE product_category_product SET product_category_id='pcat_t3a_5_10' WHERE product_category_id='pcat_v4_l7' AND product_id IN (SELECT id FROM product WHERE title ~* 'post driver');
-- #8 Raised Garden Bed -> #7 Peenrakastid
UPDATE product_category_product SET product_category_id='pcat_t3a_11_5' WHERE product_category_id='pcat_v4_l8' AND product_id IN (SELECT id FROM product WHERE title ~* 'raised garden bed');
-- #8 Garden Arbor -> Pergolad
UPDATE product_category_product SET product_category_id='pcat_mv_8x1_5' WHERE product_category_id='pcat_v4_l8' AND product_id IN (SELECT id FROM product WHERE title ~* 'arbor|garden arch');
COMMIT;
