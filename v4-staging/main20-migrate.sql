-- UUS L1 main #20 "Peoinventar ja dekoratsioonid": tõsta #6 Pidu (289) + #8 telgid + #12 atraktsioonid
-- 2026-07-05 · STAGING taxonomy-v4
BEGIN;
-- 1. Uus L1 main
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_v4_l20','Peoinventar ja dekoratsioonid','v4-peoinventar-ja-dekoratsioonid','pcat_v4_l20',NULL,20,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_v4_l20',1,'active','manual',true,0);

-- 2. Reparent "Pidu ja üritused" L2 (#6 -> #20) + handle
UPDATE product_category SET parent_category_id='pcat_v4_l20', mpath='pcat_v4_l20.pcat_pidu', handle='v4-peoinventar-pidu-ja-uritused', rank=1 WHERE id='pcat_pidu';
-- 3. 11 L3 mpath prefix-fix
UPDATE product_category SET mpath=replace(mpath,'pcat_v4_l6.pcat_pidu','pcat_v4_l20.pcat_pidu') WHERE mpath LIKE 'pcat_v4_l6.pcat_pidu.%' AND deleted_at IS NULL;

-- 4. #8 Peotelgid -> Pidu ja üritused (uus main)
UPDATE product_category SET parent_category_id='pcat_pidu', mpath='pcat_v4_l20.pcat_pidu.pcat_mv_8x2_6', rank=12 WHERE id='pcat_mv_8x2_6';
-- 5. #12 Täispuhutavad atraktsioonid -> Pidu ja üritused
UPDATE product_category SET parent_category_id='pcat_pidu', mpath='pcat_v4_l20.pcat_pidu.pcat_el_12x2_8', rank=13 WHERE id='pcat_el_12x2_8';

-- 6. Järjekorra-piirdepostid rename (etalon peoinventar.ee)
UPDATE product_category SET name='Piirdepostid & järjekorratõkked', handle='v4-peoinventar-piirdepostid-jarjekorratokked' WHERE id='pcat_t3f_13_7';
COMMIT;
