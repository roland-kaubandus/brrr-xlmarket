-- #1 Viimistlustööriistad: juhtmelõikajad Plaadilõikuritest -> uus kaabli-L3 (VEVOR cutter-mislabel)
BEGIN;
-- 1) LOO uus L3 "Kaablilõikurid & juhtmelõikajad" L2 Elektrilised tööriistad (pcat_t3l2_2) all
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_1cab3','Kaablilõikurid & juhtmelõikajad','','v4-tooriistad-kaabliloikurid-juhtmeloikajad',
        true,false,'pcat_t3l2_2','pcat_v4_l1.pcat_t3l2_2.pcat_1cab3',13,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_1cab3',3,'active','manual',true,0,now(),now());
-- 2) Liiguta 6 juhtmelõikajat Plaadilõikuritest (pcat_t3f_1_7) -> pcat_1cab3
UPDATE product_category_product SET product_category_id='pcat_1cab3'
WHERE product_category_id='pcat_t3f_1_7'
  AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN (
    'DLJD11INCHJLVEL32001V0','DLJD11YCZD40TDVTZV0','DLJD10INCHGGFDA2D001V0',
    'DLJD10INCHJLD1W12001V0','DLJD10INCHJLMGS7B001V0','DLJD10YCZD24ULIE9V0'));
COMMIT;
