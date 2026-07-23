-- Hüdraulika L2 reparent: #1 Tööriistad (pcat_v4_l1) -> #3 Auto (pcat_v4_l3)
BEGIN;
-- rank = #3 L2-de lõppu
\set NULL ''
-- L2 pcat_hyd
UPDATE product_category SET
  parent_category_id='pcat_v4_l3',
  mpath='pcat_v4_l3.pcat_hyd',
  handle='v4-autovaruosad-ja-tarvikud-hudraulika',
  rank=(SELECT coalesce(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l3' AND deleted_at IS NULL)
WHERE id='pcat_hyd';
-- 5 L3: mpath + handle
UPDATE product_category SET mpath='pcat_v4_l3.pcat_hyd.pcat_hyd_1', handle='v4-autovaruosad-ja-tarvikud-hudraulika-agregaadid'        WHERE id='pcat_hyd_1';
UPDATE product_category SET mpath='pcat_v4_l3.pcat_hyd.pcat_hyd_2', handle='v4-autovaruosad-ja-tarvikud-hudraulika-pumbad-mootorid'   WHERE id='pcat_hyd_2';
UPDATE product_category SET mpath='pcat_v4_l3.pcat_hyd.pcat_hyd_3', handle='v4-autovaruosad-ja-tarvikud-hudraulika-voolikud-liitmikud' WHERE id='pcat_hyd_3';
UPDATE product_category SET mpath='pcat_v4_l3.pcat_hyd.pcat_hyd_4', handle='v4-autovaruosad-ja-tarvikud-hudraulika-silindrid'          WHERE id='pcat_hyd_4';
UPDATE product_category SET mpath='pcat_v4_l3.pcat_hyd.pcat_hyd_5', handle='v4-autovaruosad-ja-tarvikud-hudraulika-klapid-jagajad'      WHERE id='pcat_hyd_5';
COMMIT;
