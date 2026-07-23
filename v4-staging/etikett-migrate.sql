-- Grab-bag lukk 2: etiketimasinad → #5 tootmisliin
BEGIN;
-- reparent pcat_13label -> #5 Pakendamine & täitmine (pcat_5pack), tootmisliini lõppu
UPDATE product_category SET parent_category_id='pcat_5pack', mpath='pcat_v4_l5.pcat_5pack.pcat_13label', handle='v4-suurkook-etiketi-margistusmasinad', rank=6 WHERE id='pcat_13label';
-- tootmisliini-järjekord (täitmine → sulgemine → keevitus → vaakum → etiketeerimine)
UPDATE product_category SET rank=1 WHERE id='pcat_ks_5x7_2'; -- Vedeliku täitemasinad
UPDATE product_category SET rank=2 WHERE id='pcat_ks_5x7_3'; -- Pulbri täiteseadmed
UPDATE product_category SET rank=3 WHERE id='pcat_5n1';      -- Topsisulgemismasinad
UPDATE product_category SET rank=4 WHERE id='pcat_ks_5x7_1'; -- Lintkeevitusmasinad
UPDATE product_category SET rank=5 WHERE id='pcat_ks_5x1_28';-- Vaakumpakendajad
COMMIT;
