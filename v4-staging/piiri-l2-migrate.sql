-- mislabel-piiripealsed L2: haagise disentangle + määrdepumbad + planetaarmikserid + dethatcher
BEGIN;
-- #3a: 2 electric trailer jack (Vintsidest) -> Haagise tungrauad
UPDATE product_category_product SET product_category_id='pcat_ag2_3x1_11'
WHERE product_category_id='pcat_ag2_3x1_2' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('DDTCQJDDDKCG07KKJ002V9','DDTCQJDDDKCG9JIPZV9'));
-- #3b: UUS L3 "Haagise teisalduskärud" (#3 Pukseerimisseadmed) + 5 dolly
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_3dolly','Haagise teisalduskärud','','v4-autovaruosad-ja-tarvikud-haagise-teisalduskarud',true,false,'pcat_v4_l3_1','pcat_v4_l3.pcat_v4_l3_1.pcat_3dolly',10,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_3dolly',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_3dolly'
WHERE product_category_id IN ('pcat_ag2_3x1_2','pcat_ag2_3x1_11') AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('WXDDQYCZLK36MHH10001V2','YXDDQYCYSB500477AV0','LYSDQYC1500LJYV2YV0','TYSDQYC1200B34ELBV0','TYSDQYC600BHGRGNOV0'));
-- #2: 5 grease pump -> Määrdepüstolid ja otsikud
UPDATE product_category_product SET product_category_id='pcat_ag2_2x4_5'
WHERE product_category_id='pcat_ag2_2x4_4' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('HYJ10JLDT000J2IBRV0','HYJ3JLDT0000XHUHBV0','HYJ5JLDT0000QLKXEV0','HYJDGB000000OW3B1V0','HYJLB0000000WGVWQV0'));
-- #5: 2 planetaarmikserit -> Köögi- ja taignamikserid
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_12'
WHERE product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('DGNJBJOCB20BJ791SV2','ZXSPJBJ15QT6PBP35V2'))
  AND product_category_id IN (SELECT l3.id FROM product_category l3 WHERE l3.name IN ('Hakklihamasinad ja lihaveskid','Toiduprotsessorid') AND l3.mpath LIKE 'pcat_v4_l5%');
-- #18: 6 tow-behind dethatcher/rake (Haakeadapteritest) -> Mullaharimine
UPDATE product_category_product SET product_category_id='pcat_ag_3_3'
WHERE product_category_id='pcat_ag_3_2' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('ZXSCJ50INCHD4JKXH001V0','ZXSCJ60INCHBP8SL7001V0','ZXSCJ60DSDLJO9Q9JV0','ZXSCJ60INCHDM3BO4001V0','ZXSCJ72DSDLJ73TTAV0','ZXSCJ60BDSDLG2B3EV0'));
COMMIT;
