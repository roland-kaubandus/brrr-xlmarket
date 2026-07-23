-- Grab-bag lukk 4: #1 masina-grab-bagid + #2 veom-pullerid
BEGIN;
-- UUED L3-d
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_1mill','Metallifreespingid','','v4-tooriistad-metallifreespingid',true,false,'pcat_t3l2_6','pcat_v4_l1.pcat_t3l2_6.pcat_1mill',20,now(),now()),
 ('pcat_1chase','Seinasoonelõikurid','','v4-tooriistad-seinasooneloikurid',true,false,'pcat_t3l2_2','pcat_v4_l1.pcat_t3l2_2.pcat_1chase',20,now(),now()),
 ('pcat_1roll','Plekirullid','','v4-tooriistad-plekirullid',true,false,'pcat_t3l2_6','pcat_v4_l1.pcat_t3l2_6.pcat_1roll',21,now(),now()),
 ('pcat_1conv','Lintkonveierid','','v4-tooriistad-lintkonveierid',true,false,'pcat_tk1','pcat_v4_l1.pcat_tk1.pcat_1conv',20,now(),now()),
 ('pcat_2drive','Veom- & jõuülekande tööriistad','','v4-garaaz-veom-jouulekande-tooriistad',true,false,'pcat_md2','pcat_v4_l2.pcat_md2.pcat_2drive',20,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_1mill',3,'active','manual',true,0,now(),now()),('pcat_1chase',3,'active','manual',true,0,now(),now()),
 ('pcat_1roll',3,'active','manual',true,0,now(),now()),('pcat_1conv',3,'active','manual',true,0,now(),now()),
 ('pcat_2drive',3,'active','manual',true,0,now(),now());
-- SAMM 1: Freesimislauad -> milling 2 -> Metallifreespingid (mortice kit FLAG jää)
UPDATE product_category_product SET product_category_id='pcat_1mill'
  WHERE product_category_id='pcat_t3f_5_9' AND product_id IN (SELECT id FROM product WHERE title ~* 'milling mill machine|milling machine|milling table');
-- SAMM 2: Freesid -> wall chaser 2 -> Seinasoonelõikurid (biscuit joiner FLAG jää)
UPDATE product_category_product SET product_category_id='pcat_1chase'
  WHERE product_category_id='pcat_t3f_2_1' AND product_id IN (SELECT id FROM product WHERE title ~* 'wall chaser|wall groove');
-- SAMM 3: Plekipainutuspingid -> slip roll 3 -> Plekirullid
UPDATE product_category_product SET product_category_id='pcat_1roll'
  WHERE product_category_id='pcat_t3f_6_5' AND product_id IN (SELECT id FROM product WHERE title ~* 'slip roll|plate rolling');
-- SAMM 4: Masina-/konteinerikärud -> belt conveyor 3 -> Lintkonveierid
UPDATE product_category_product SET product_category_id='pcat_1conv'
  WHERE product_category_id='pcat_tk1_5' AND product_id IN (SELECT id FROM product WHERE title ~* 'belt conveyor|conveyor table');
-- SAMM 5: #2 veom-pullerid -> Veom- & jõuülekande tööriistad
UPDATE product_category_product SET product_category_id='pcat_2drive'
  WHERE product_category_id='pcat_ag2_2x1_8' AND product_id IN (SELECT id FROM product WHERE title ~* 'cv axle|tie rod|yoke puller|crank case splitter');
COMMIT;
