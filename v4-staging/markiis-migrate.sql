-- #8 sõiduki-markiisid -> #3 Auto (Haagissuvila & matkatarvikud)
BEGIN;
-- SAMM 1: 4 täis-L3 reparent #8 -> #3 pcat_v4_l3_5
UPDATE product_category SET parent_category_id='pcat_v4_l3_5', mpath='pcat_v4_l3.pcat_v4_l3_5.pcat_mv_8x3_7', handle='v4-auto-automarkiisid',                rank=30 WHERE id='pcat_mv_8x3_7';
UPDATE product_category SET parent_category_id='pcat_v4_l3_5', mpath='pcat_v4_l3.pcat_v4_l3_5.pcat_mv_8x3_2', handle='v4-auto-matka-haagissuvila-markiisid', rank=31 WHERE id='pcat_mv_8x3_2';
UPDATE product_category SET parent_category_id='pcat_v4_l3_5', mpath='pcat_v4_l3.pcat_v4_l3_5.pcat_mv_8x3_1', handle='v4-auto-mootor-rv-markiisid',           rank=32 WHERE id='pcat_mv_8x3_1';
UPDATE product_category SET parent_category_id='pcat_v4_l3_5', mpath='pcat_v4_l3.pcat_v4_l3_5.pcat_mv_8x3_3', handle='v4-auto-rv-markiisi-paikesekaitsed',    rank=33 WHERE id='pcat_mv_8x3_3';
-- SAMM 2: Külgekraanid 2 sõiduki-toodet -> Automarkiisid (#3); 12 kodu jäävad #8
UPDATE product_category_product SET product_category_id='pcat_mv_8x3_7'
  WHERE product_category_id='pcat_mv_8x3_4' AND product_id IN ('prod_01KNXX9PB9JCZFKHANJXNXPP0A','prod_01KNXX9PBEYE8WFBGZGSQ12SZQ');
COMMIT;
