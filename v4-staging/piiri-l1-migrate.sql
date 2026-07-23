-- mislabel-piiripealsed L1: #7 kompostilaoturid + #1 Betoonivibraatorid 3-way split
BEGIN;
-- SAMM 1: 5 kompostilaoturit -> #7 Väetise- ja seemnelaotajad (pcat_t3a_1_6)
UPDATE product_category_product SET product_category_id='pcat_t3a_1_6'
WHERE product_category_id IN ('pcat_t3a_1_7','pcat_t3a_1_14') AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('GTSBJHSFMTCGUHC8E001V0','GTSBJH224INCH29UKV0','GTSBJHSFMTCGB41IU001V0','GTSBJHSFMTCGFONO4001V0','GTSBJHSFMTCGW6C4X001V0'));
-- SAMM 2b: uus L3 "Betoonisilurid" (#1 Elektrilised tööriistad) + 4 screed
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_1screed','Betoonisilurid','','v4-tooriistad-betoonisilurid',true,false,'pcat_t3l2_2','pcat_v4_l1.pcat_t3l2_2.pcat_1screed',14,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_1screed',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_1screed'
WHERE product_category_id='pcat_t3f_2_19' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('DLSHNTFZ135HWZ9BSV0','DLSHNTFZ135HW6BF8V0','DLSHNTFZ135HOUXQGV0','DLSHNTFZ4FTS3366S001V0'));
-- SAMM 2c: 5 pinnasetihendajat (plate compactor + jumping jack) -> #9 OLEMASOLEV "Pinnasetihendajad" (pcat_9comp)
UPDATE product_category_product SET product_category_id='pcat_9comp'
WHERE product_category_id='pcat_t3f_2_19' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('CJHSDH65HPOZJ2BBAV0','CJHDDH65HPOZQM1Q7V0','RYPBYSJ65HPBQ4O2D001V0','RYPBYSJ65HPW1EMWD001V0'));
COMMIT;
