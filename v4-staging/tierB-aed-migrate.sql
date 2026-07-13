BEGIN;
-- FAAS 2 TIER-B Aed: 3 split (Aeraatorid KEEP=FAAS 1 re-flag)
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_7poolwater','Basseinikatte veekotid ja raskused','','v4-basseinikatte-veekotid',true,false,'pcat_v4_l7_2','pcat_v4_l7.pcat_v4_l7_2.pcat_7poolwater',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_2' AND deleted_at IS NULL),now(),now()),
 ('pcat_7weedrake','Veekogu-umbrohurehad','','v4-veekogu-umbrohurehad',true,false,'pcat_v4_l7_1','pcat_v4_l7.pcat_v4_l7_1.pcat_7weedrake',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_1' AND deleted_at IS NULL),now(),now()),
 ('pcat_7weedcut','Veekogu-umbrohulõikurid','','v4-veekogu-umbrohuloikurid',true,false,'pcat_v4_l7_1','pcat_v4_l7.pcat_v4_l7_1.pcat_7weedcut',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_1' AND deleted_at IS NULL),now(),now()),
 ('pcat_7chlor','Basseini soolakloorinaatorid','','v4-basseini-soolakloorinaatorid',true,false,'pcat_v4_l7_2','pcat_v4_l7.pcat_v4_l7_2.pcat_7chlor',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_2' AND deleted_at IS NULL),now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_7poolwater',3,'active','manual',true,8,now(),now()),
 ('pcat_7weedrake',3,'active','manual',true,4,now(),now()),
 ('pcat_7weedcut',3,'active','manual',true,3,now(),now()),
 ('pcat_7chlor',3,'active','manual',true,3,now(),now());
UPDATE product_category_product SET product_category_id='pcat_7poolwater' WHERE product_id IN ('prod_01KNXXRJFZ56M0F56TVTAHD0JZ','prod_01KNXXRGKNBRA42W3T3DNJYKEH','prod_01KNXXSXQAFFJ0BSVBQ4NPZKGT','prod_01KNXXRHJN030ZTHY3J09MVYKK','prod_01KNXXRFPKDF0R15WNSTBRXRHV','prod_01KNXXRJF9DJXZN602GRQSW0FX','prod_01KNXXRGKFWHPHWW8ME12R7RFY','prod_01KNXXRJFBGEN09R9Y4B2MR2GK') AND product_category_id='pcat_t3a_2_12';
UPDATE product_category_product SET product_category_id='pcat_7weedrake' WHERE product_id IN ('prod_01KNXXP03G8JCKBG4EYS6E9W77','prod_01KNXXNVHD6NWV9K2D4HDGWH1E','prod_01KNXXNZ5T5E6EJ0GJM4ZM5WYW','prod_01KNXXAJF4A3NXBK9S3PTEKXE4') AND product_category_id='pcat_t3a_1_13';
UPDATE product_category_product SET product_category_id='pcat_7weedcut' WHERE product_id IN ('prod_01KNXXQN7G0S8V7Z9RXJRKWQFG','prod_01KNXXQN7FNMK13GSJSS15R51R','prod_01KNXXQRW40VCC6JF2894MDTNN') AND product_category_id='pcat_t3a_1_13';
UPDATE product_category_product SET product_category_id='pcat_7chlor' WHERE product_id IN ('prod_01KNXXN34QTQ2C3S6T9CJDN829','prod_01KNXXMCJB5555P7VDZ1NDJ7SS','prod_01KNXXMCJDVTE8HKVAN9TSY1SW') AND product_category_id='pcat_t3a_2_8';
UPDATE product_category SET name='Basseinikatte rullid', updated_at=now() WHERE id='pcat_t3a_2_12';
UPDATE product_category SET name='Veekogu-umbrohurullurid', updated_at=now() WHERE id='pcat_t3a_1_13';
UPDATE product_category SET name='Basseini ionisaatorid', updated_at=now() WHERE id='pcat_t3a_2_8';
COMMIT;
