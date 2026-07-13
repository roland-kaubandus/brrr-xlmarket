BEGIN;
-- FAAS 2 TIER-A2: 3 FLAG-split (Massaaž 4-way, Turva 2, Piljard 2)
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_15pistol','Massaažipüstolid','','v4-massaazipistolid',true,false,'pcat_v4_l15_1','pcat_v4_l15.pcat_v4_l15_1.pcat_15pistol',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l15_1' AND deleted_at IS NULL),now(),now()),
 ('pcat_15mtable','Massaažilauad','','v4-massaazilauad',true,false,'pcat_v4_l15_1','pcat_v4_l15.pcat_v4_l15_1.pcat_15mtable',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l15_1' AND deleted_at IS NULL),now(),now()),
 ('pcat_15keha','Keha-massöörid','','v4-keha-massoorid',true,false,'pcat_v4_l15_1','pcat_v4_l15.pcat_v4_l15_1.pcat_15keha',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l15_1' AND deleted_at IS NULL),now(),now()),
 ('pcat_9karivar','Kääriturvaväravad','','v4-kaariturvavaravad',true,false,'pcat_v4_l9_4','pcat_v4_l9.pcat_v4_l9_4.pcat_9karivar',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l9_4' AND deleted_at IS NULL),now(),now()),
 ('pcat_20cue','Piljardikiid ja -tarvikud','','v4-piljardikiid',true,false,'pcat_12mang','pcat_v4_l12.pcat_12mang.pcat_20cue',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_12mang' AND deleted_at IS NULL),now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_15pistol',3,'active','manual',true,7,now(),now()),
 ('pcat_15mtable',3,'active','manual',true,4,now(),now()),
 ('pcat_15keha',3,'active','manual',true,12,now(),now()),
 ('pcat_9karivar',3,'active','manual',true,9,now(),now()),
 ('pcat_20cue',3,'active','manual',true,9,now(),now());
UPDATE product_category_product SET product_category_id='pcat_15pistol' WHERE product_id IN ('prod_01KNXXEHFB2M4ARQ99RF79Z2QC','prod_01KNXXEABE6QESYAAD17JW1CXB','prod_01KNXXEAAP26Z7MYHMA55S30YR','prod_01KNXXEABEJTZDT12P6Z798XC1','prod_01KNXXEXBHVGW1R4GQ2RDV1784','prod_01KNXXEAB8ZDRGR1BJRW14663B','prod_01KNXXEABFH1KJTNFR5YWKE5FN') AND product_category_id='pcat_f4_15x1_1';
UPDATE product_category_product SET product_category_id='pcat_15mtable' WHERE product_id IN ('prod_01KNXXDATJ89GMZBQ9TX6TF521','prod_01KNXXDATF2VZ8T91S3CFZT1VF','prod_01KNXXG2T664HC9N9B779P25GE','prod_01KNXXD9YB2BK2821Y9XVGY590') AND product_category_id='pcat_f4_15x1_1';
UPDATE product_category_product SET product_category_id='pcat_15keha' WHERE product_id IN ('prod_01KNXXHNXD0J6PR0CHN2PXRFJX','prod_01KNXXFSXCBCQZF85P6R35CXJP','prod_01KNXXFR41QSCT6MXCQBCM2RGB','prod_01KNXXEPVKZJWH54APNASDR8AA','prod_01KNXXEPWMC6657BFXFMNGF7WY','prod_01KNXXEPVKJ60AXRS7PCXC7E7W','prod_01KNXXEPWH1MYVDQKKC05C0P96','prod_01KNXXENZARB9GWAFM6E8BYQ0W','prod_01KNXXGS5NDA0PWV9WA62R1P4Q','prod_01KNXXGT1F82TS8E4RWJQTKERY','prod_01KNXXGTYXDJ5JGT275KP0KXHM','prod_01KNXXJXGFCJ36MRZY5KXQTH9R') AND product_category_id='pcat_f4_15x1_1';
UPDATE product_category_product SET product_category_id='pcat_9karivar' WHERE product_id IN ('prod_01KNXXR05CNW70GGCR8XMB1P94','prod_01KNXXQZ8122GH9HH270E9SNSF','prod_01KNXXR3052VA1VDPJAYEAYGV0','prod_01KNXXR2Z56KSVJ635DKX168R2','prod_01KNXXR2Z89YV51EW13F4PQ0Q4','prod_01KNXXAN4YS97JA6HPY6P9W0A9','prod_01KNXXA7M9FM02WW8ZWZ513WEF','prod_01KNXXC6PV8MA8TFJ6D3428KBT','prod_01KNXXA7KJP1Y8EDHE3GYZGNCK') AND product_category_id='pcat_es_9x4_4';
UPDATE product_category_product SET product_category_id='pcat_20cue' WHERE product_id IN ('prod_01KP6FC3TC8Q1Z461R7TZQYFF1','prod_01KPJV7W63CMTAZ54TZGFWVD8F','prod_01KP6FBJKTTHR90RSRVKRMFYZ1','prod_01KPJV7VZWCMP0D7BQGJRM351M','prod_01KPJV7VKC9TSAB2PKZYFXP307','prod_01KPJV7VSJB5CYZGXMSVBDM099','prod_01KP6FBJWXRDQ7GV243X334093','prod_01KPJV7WT6Z0JPT3ETSWTFKRP5','prod_01KPJV7WM652T82PA631KSK3AS') AND product_category_id='pcat_el_12x1_7';
UPDATE product_category SET name='Massaažitoolid', updated_at=now() WHERE id='pcat_f4_15x1_1';
UPDATE product_category SET name='Laiendatavad tõkkepuud', updated_at=now() WHERE id='pcat_es_9x4_4';
UPDATE product_category SET name='Piljardilauad', updated_at=now() WHERE id='pcat_el_12x1_7';
COMMIT;
