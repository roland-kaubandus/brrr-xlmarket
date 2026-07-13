BEGIN;
-- FAAS 2 TIER-A: 6 puhast split (eri-funktsioon)
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_16commode','Tualett-toolid','','v4-tualett-toolid',true,false,'pcat_v4_l16_1','pcat_v4_l16.pcat_v4_l16_1.pcat_16commode',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l16_1' AND deleted_at IS NULL),now(),now()),
 ('pcat_16wcrail','WC-tugiraamid ja -käepidemed','','v4-wc-tugiraamid',true,false,'pcat_v4_l16_1','pcat_v4_l16.pcat_v4_l16_1.pcat_16wcrail',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l16_1' AND deleted_at IS NULL),now(),now()),
 ('pcat_16overbed','Voodilauad','','v4-voodilauad',true,false,'pcat_v4_l16_2','pcat_v4_l16.pcat_v4_l16_2.pcat_16overbed',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l16_2' AND deleted_at IS NULL),now(),now()),
 ('pcat_15clipper','Juukselõikurid ja -trimmerid','','v4-juukseloikurid-trimmerid',true,false,'pcat_v4_l15_1','pcat_v4_l15.pcat_v4_l15_1.pcat_15clipper',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l15_1' AND deleted_at IS NULL),now(),now()),
 ('pcat_9panic','Paanikalatid ja avariiväljapääsud','','v4-paanikalatid',true,false,'pcat_v4_l9_3','pcat_v4_l9.pcat_v4_l9_3.pcat_9panic',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l9_3' AND deleted_at IS NULL),now(),now()),
 ('pcat_20raffle','Loositrumlid','','v4-loositrumlid',true,false,'pcat_20c','pcat_v4_l20.pcat_20c.pcat_20raffle',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_20c' AND deleted_at IS NULL),now(),now()),
 ('pcat_7pond','Tiigivooderdised','','v4-tiigivooderdised',true,false,'pcat_v4_l7_6','pcat_v4_l7.pcat_v4_l7_6.pcat_7pond',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_6' AND deleted_at IS NULL),now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_16commode',3,'active','manual',true,9,now(),now()),
 ('pcat_16wcrail',3,'active','manual',true,6,now(),now()),
 ('pcat_16overbed',3,'active','manual',true,5,now(),now()),
 ('pcat_15clipper',3,'active','manual',true,4,now(),now()),
 ('pcat_9panic',3,'active','manual',true,6,now(),now()),
 ('pcat_20raffle',3,'active','manual',true,6,now(),now()),
 ('pcat_7pond',3,'active','manual',true,4,now(),now());
UPDATE product_category_product SET product_category_id='pcat_16commode' WHERE product_id IN ('prod_01KNXXQE2J3XZMC35ZPG2B2VH6','prod_01KNXXD3JCJN30ZQM0WFD8JH0Y','prod_01KNXXBXM4220088RJH45K11XE','prod_01KNXXQEZM97DKQC1KBZ7GYSZS','prod_01KNXXBVSZ4PFTAF85CFH2GX0K','prod_01KNXXBTYHK1HTFGDHQA3GSWTA','prod_01KNXXQF06TT9A4V88XH493XME','prod_01KNXXQE2GHY3KCGQ2WNRXGPTN','prod_01KNXXQEZFC6GW1ZS09GF14PSQ') AND product_category_id='pcat_f4_16x1_7';
UPDATE product_category_product SET product_category_id='pcat_16wcrail' WHERE product_id IN ('prod_01KNXXMXMHTFFJQPD2GC12PWFM','prod_01KNXXMWRRWKM46S4DVHB0SWTE','prod_01KNXXA17Q2JTC0HTDHYFCBD9B','prod_01KNXXJVPH3FHMWS9P55H1JNBW','prod_01KNXXA0AEY4THT9AQVHGM48W3','prod_01KNXXMZEKQYBFK2MT9QBX4AKQ') AND product_category_id='pcat_f4_16x1_7';
UPDATE product_category_product SET product_category_id='pcat_16overbed' WHERE product_id IN ('prod_01KNXXNN7SWSY8516E7P16EA8H','prod_01KNXXNN7V47F7BNEDD8ESVVDB','prod_01KNXXNN8G8082QNKSNX8NJ4DG','prod_01KNXXNN7TSHSYEA79N44RZP0C','prod_01KNXXNZ5WD79GRHHFEVA3RB48') AND product_category_id='pcat_mv_6x4_9';
UPDATE product_category_product SET product_category_id='pcat_15clipper' WHERE product_id IN ('prod_01KNXXGS4WNZ9EBFPCTQ1A2X5G','prod_01KNXXGS4TQ3ZZMB4ZAXN8VQ0P','prod_01KNXXGR88RE61E3T283XEBA9Q','prod_01KNXXGQ2XE2TZJMSXPTFTRWB1') AND product_category_id='pcat_f4_15x1_5';
UPDATE product_category_product SET product_category_id='pcat_9panic' WHERE product_id IN ('prod_01KNXX9AFB0YCQ5TS8VS49X452','prod_01KNXX99K4NXZ36SS7E7PSD981','prod_01KQD2Z3799PSZ2TCKFZH2CSEY','prod_01KQD2Z2ZZNQ59WR6Q2WW76XYW','prod_01KQCN7MCC2BYG26J52H3MV7EN','prod_01KQC7G52BVY0X085DP4Q91H62') AND product_category_id='pcat_es_9x3_5';
UPDATE product_category_product SET product_category_id='pcat_20raffle' WHERE product_id IN ('prod_01KNXXCGRQNSNB624XAKDKP2Y9','prod_01KNXXCGQ9PYQY3CGXB70XBSD6','prod_01KNXXCM89XH12Q86G8XKK8DM0','prod_01KNXXCFV5XA4GHACH0NDWAKVV','prod_01KNXXCGRK1PH4VFMYZ6Q2NHB6','prod_01KNXXCGRJ5FBMSN2ZQARJ49AE') AND product_category_id='pcat_el_12x1_12';
UPDATE product_category_product SET product_category_id='pcat_7pond' WHERE product_id IN ('prod_01KNXXARPT7B51KKPBRTPRDQ14','prod_01KNXXASJZGJQ0C80WP0NNFBYT','prod_01KNXXAW9HHT0PZY89DJXXSFS7','prod_01KNXXBVTSG59ETY3RQZFGJXCR') AND product_category_id='pcat_t3a_2_2';
UPDATE product_category SET name='Tõstetud WC-istmed', updated_at=now() WHERE id='pcat_f4_16x1_7';
UPDATE product_category SET name='Meditsiini- ja laborikärud', updated_at=now() WHERE id='pcat_mv_6x4_9';
UPDATE product_category SET name='Juuksehooldus- ja stiiliseadmed', updated_at=now() WHERE id='pcat_f4_15x1_5';
UPDATE product_category SET name='Uksesulgurid', updated_at=now() WHERE id='pcat_es_9x3_5';
UPDATE product_category SET name='Õnnerattad', updated_at=now() WHERE id='pcat_el_12x1_12';
UPDATE product_category SET name='Basseinivooderdised', updated_at=now() WHERE id='pcat_t3a_2_2';
COMMIT;
