BEGIN;
-- FAAS 2 TIER-B Sport: 6 eri-funktsioon split
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_12goldpan','Kullapesu- ja liivaotsimisseadmed','','v4-kullapesu-seadmed',true,false,'pcat_v4_l12_1','pcat_v4_l12.pcat_v4_l12_1.pcat_12goldpan',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l12_1' AND deleted_at IS NULL),now(),now()),
 ('pcat_12pchip','Pokerižetonid ja mängukomplektid','','v4-pokerizetonid',true,false,'pcat_12mang','pcat_v4_l12.pcat_12mang.pcat_12pchip',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_12mang' AND deleted_at IS NULL),now(),now()),
 ('pcat_12trainer','Jalgratta trenažöörialused','','v4-jalgratta-trenazoorialused',true,false,'pcat_v4_l12_3','pcat_v4_l12.pcat_v4_l12_3.pcat_12trainer',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l12_3' AND deleted_at IS NULL),now(),now()),
 ('pcat_12gtravel','Golfi reisikotid ja -kaaned','','v4-golfi-reisikotid',true,false,'pcat_12golf','pcat_v4_l12.pcat_12golf.pcat_12gtravel',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_12golf' AND deleted_at IS NULL),now(),now()),
 ('pcat_12disc','Disc golfi kettad','','v4-disc-golfi-kettad',true,false,'pcat_12golf','pcat_v4_l12.pcat_12golf.pcat_12disc',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_12golf' AND deleted_at IS NULL),now(),now()),
 ('pcat_12stepper','Stepper-treeningmasinad','','v4-stepper-masinad',true,false,'pcat_v4_l12_3','pcat_v4_l12.pcat_v4_l12_3.pcat_12stepper',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l12_3' AND deleted_at IS NULL),now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_12goldpan',3,'active','manual',true,6,now(),now()),
 ('pcat_12pchip',3,'active','manual',true,7,now(),now()),
 ('pcat_12trainer',3,'active','manual',true,7,now(),now()),
 ('pcat_12gtravel',3,'active','manual',true,4,now(),now()),
 ('pcat_12disc',3,'active','manual',true,5,now(),now()),
 ('pcat_12stepper',3,'active','manual',true,5,now(),now());
UPDATE product_category_product SET product_category_id='pcat_12goldpan' WHERE product_id IN ('prod_01KNXXA0ABHZXCWZNMFZC02R2P','prod_01KPJXEBRF53AKA7SKGFP1HEPS','prod_01KNXXA0ACAVG9D6C51764PMSW','prod_01KPJXEBB67ZN579CVGCRPTBQE','prod_01KNXXB5ACWK3ZH2FMDA9NNVNT','prod_01KP6FFMVYP3BXHRK17EFC0ERA') AND product_category_id='pcat_el_12x1_2';
UPDATE product_category_product SET product_category_id='pcat_12pchip' WHERE product_id IN ('prod_01KNXXB0TYXPZZ9052KYRYJTKB','prod_01KNXXASJX3KQ2TTK8HBC8G8VT','prod_01KNXXB3H5VQ9Y4QGQE6TBJF9Y','prod_01KNXXAZXDZCWMJYKA0ABPJM9C','prod_01KNXXAD013P3EVDCAK4M7WC4J','prod_01KNXXAJFBRZ88973AXDNA3262','prod_01KNXXAQTR4QXSJDHZ2ZMN7FTA') AND product_category_id='pcat_el_12x1_11';
UPDATE product_category_product SET product_category_id='pcat_12trainer' WHERE product_id IN ('prod_01KP6FC1J569CFZDV7PJHFJTVW','prod_01KP6FC4NF9JBGF8N523RQH7P2','prod_01KNXX76QZR8M9HRA6GA8722EY','prod_01KNXXC4X907ZR4M5P8Q4RX3YB','prod_01KNXXC5SZ44NB3NBTH71H7N45','prod_01KNXXC5THC58R9G1NKWWD2AY4','prod_01KNXXC4WWDKP2708VAAGWTB8W') AND product_category_id='pcat_el_12x3_17';
UPDATE product_category_product SET product_category_id='pcat_12gtravel' WHERE product_id IN ('prod_01KNXXGAXG1T2TQZQD1EF85DQP','prod_01KNXXGDKVZKQQ05MA529WAXRS','prod_01KNXXGEF0NXYJ8Y9806KGRV2S','prod_01KNXXRC25H00862NS9C53N1SG') AND product_category_id='pcat_12gbag';
UPDATE product_category_product SET product_category_id='pcat_12disc' WHERE product_id IN ('prod_01KNXXS7ZDTCNX6GCG5Y3A9VWH','prod_01KNXXS7ZCGM4AX45HW7AJ7J3K','prod_01KNXXS7ZETADJ673HR10DWZEG','prod_01KNXXS4BG6BR4X1E009PAM9Q9','prod_01KNXXS57VJQC85977T56WKRT0') AND product_category_id='pcat_el_12x1_5';
UPDATE product_category_product SET product_category_id='pcat_12stepper' WHERE product_id IN ('prod_01KNXXKD0M9SCFSAN1EDG3PB5J','prod_01KNXXJ54A689CBN9B4HMFCDJ7','prod_01KNXXJCA9K5QJ5PEMYN7520KZ','prod_01KNXXJ6166AB8MNFS588WPREG','prod_01KNXXJ47H716PHVVQKS1YEBCX') AND product_category_id='pcat_el_12x3_26';
UPDATE product_category SET name='Metallidetektorid', updated_at=now() WHERE id='pcat_el_12x1_2';
UPDATE product_category SET name='Pokerilauad ja lauakatted', updated_at=now() WHERE id='pcat_el_12x1_11';
UPDATE product_category SET name='Velotrenažöörid', updated_at=now() WHERE id='pcat_el_12x3_17';
UPDATE product_category SET name='Golfikotid', updated_at=now() WHERE id='pcat_12gbag';
UPDATE product_category SET name='Disc golfi korvid', updated_at=now() WHERE id='pcat_el_12x1_5';
UPDATE product_category SET name='Aeroobika stepp-platvormid', updated_at=now() WHERE id='pcat_el_12x3_26';
COMMIT;
