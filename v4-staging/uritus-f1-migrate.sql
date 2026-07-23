-- #20 üritus-konsolideerimine FAAS 1: kogu-L3-reparendid + segakat product-move
BEGIN;

-- ===== 7 KOGU-L3-REPARENT (100% üritus) -> #20 pcat_pidu =====
-- #12 Peo- ja vahumasinad (9 foam/snow) -> #20, rename "Peo- ja meelelahutusmasinad" (+2 claw hiljem)
UPDATE product_category SET name='Peo- ja meelelahutusmasinad', parent_category_id='pcat_pidu',
  mpath='pcat_v4_l20.pcat_pidu.pcat_12peo', handle='v4-peoinventar-peo-ja-meelelahutusmasinad', rank=15 WHERE id='pcat_12peo';
-- #12 Õhupuhurid (5 bounce-house blower) -> #20, rename "Atraktsioonipuhurid"
UPDATE product_category SET name='Atraktsioonipuhurid', parent_category_id='pcat_pidu',
  mpath='pcat_v4_l20.pcat_pidu.pcat_el_12x2_9', handle='v4-peoinventar-atraktsioonipuhurid', rank=16 WHERE id='pcat_el_12x2_9';
-- #19 Lavaefektide masinad (9 cold spark + disco ball) -> #20
UPDATE product_category SET parent_category_id='pcat_pidu',
  mpath='pcat_v4_l20.pcat_pidu.pcat_mu_2_3', handle='v4-peoinventar-lavaefektide-masinad', rank=17 WHERE id='pcat_mu_2_3';
-- #1 Sammaspostide köied (8 velvet) -> #20
UPDATE product_category SET parent_category_id='pcat_pidu',
  mpath='pcat_v4_l20.pcat_pidu.pcat_t3f_13_5', handle='v4-peoinventar-sammaspostide-koied', rank=18 WHERE id='pcat_t3f_13_5';
-- #1 Toolikärud & -hoidikud (7 chair rack) -> #20
UPDATE product_category SET parent_category_id='pcat_pidu',
  mpath='pcat_v4_l20.pcat_pidu.pcat_1tool', handle='v4-peoinventar-toolikarud-hoidikud', rank=19 WHERE id='pcat_1tool';
-- #6 Lillealused & -statiivid (26 wedding) -> #20
UPDATE product_category SET parent_category_id='pcat_pidu',
  mpath='pcat_v4_l20.pcat_pidu.pcat_mv_6x1_13', handle='v4-peoinventar-lillealused-statiivid', rank=20 WHERE id='pcat_mv_6x1_13';
-- #6 Lillevaasid (13 wedding) -> #20
UPDATE product_category SET parent_category_id='pcat_pidu',
  mpath='pcat_v4_l20.pcat_pidu.pcat_mv_6x1_12', handle='v4-peoinventar-lillevaasid', rank=21 WHERE id='pcat_mv_6x1_12';

-- ===== SEGAKAT PRODUCT-MOVE =====
-- Platvormkärud: 2 chair rack -> #20 Toolikärud
UPDATE product_category_product SET product_category_id='pcat_1tool'
WHERE product_category_id='pcat_tk1_2' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('ZYTCYCHS42GDZ055XV0','ZYTCYCHS36GZXQS7ZV0'));
-- Liiklusbarjäärid: 24 crowd-control stanchion -> #20 Piirdepostid & järjekorratõkked (liiklus jääb #9)
UPDATE product_category_product SET product_category_id='pcat_t3f_13_7'
WHERE product_category_id='pcat_9traf2' AND product_id IN (SELECT p.id FROM product p WHERE p.title ~* 'stanchion|crowd control|velvet|queue');
-- 2 claw -> #20 Peo- ja meelelahutusmasinad (pcat_12peo)
UPDATE product_category_product SET product_category_id='pcat_12peo'
WHERE product_category_id IN (SELECT l3.id FROM product_category l3 WHERE l3.name='Õppemänguasjad' AND l3.mpath LIKE 'pcat_v4_l12%')
  AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('SYWWJBS000009TIVCV2','ZXWWJHSZSZXZK0UCT001V2'));
-- 1 ürituse-laudlina -> #20 Laudlinad
UPDATE product_category_product SET product_category_id='pcat_mv_6x1_7'
WHERE product_category_id IN (SELECT l3.id FROM product_category l3 WHERE l3.name='Lauakaitsed & -kiled' AND l3.mpath LIKE 'pcat_v4_l6%')
  AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='DLZZ6FT6PCSHT5RXH001V0');

COMMIT;
