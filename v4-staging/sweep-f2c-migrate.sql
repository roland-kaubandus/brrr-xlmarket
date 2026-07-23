-- Sweep FAAS 2c: #10 Torutoed & -hoidikud -> #1 Torutööriistad (reparent). SAMM 2 (Trepid) = verify only.
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;

-- Torutoed & -hoidikud (pipe jack stands) #10 Kanalisatsiooni-L2 -> #1 Torutööriistad L2
UPDATE product_category
   SET parent_category_id='pcat_t3l2_15',
       mpath='pcat_v4_l1.pcat_t3l2_15.pcat_es_10x3_4',
       handle='v4-tooriistad-torutoed-ja-hoidikud',
       rank=1
 WHERE id='pcat_es_10x3_4';

COMMIT;
