BEGIN;
-- #1 Spordikotid domeeni-lahutus (nime-lõks: kohver≠sport)
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_25mini','Miniatuuride hoiukohvrid ja wargaming','','v4-miniatuurid-wargaming',true,false,'pcat_25pusle','pcat_v4_l25.pcat_25pusle.pcat_25mini',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_25pusle' AND deleted_at IS NULL),now(),now()),
 ('pcat_23console','Mängukonsooli tarvikud','','v4-mangukonsooli-tarvikud',true,false,'pcat_23pc','pcat_v4_l23.pcat_23pc.pcat_23console',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_23pc' AND deleted_at IS NULL),now(),now()),
 ('pcat_12scope','Teleskoobikohvrid','','v4-teleskoobikohvrid',true,false,'pcat_12pall','pcat_v4_l12.pcat_12pall.pcat_12scope',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_12pall' AND deleted_at IS NULL),now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_25mini',3,'active','manual',true,8,now(),now()),
 ('pcat_23console',3,'active','manual',true,4,now(),now()),
 ('pcat_12scope',3,'active','manual',true,6,now(),now());
UPDATE product_category_product SET product_category_id='pcat_25mini' WHERE product_id IN ('prod_01KP6FD6JVWM3J2AF498M1X9RM','prod_01KPJVBR5MVVN6KFPDQ59J3GAJ','prod_01KPJVBRBTJESVSMS0AM3KCPNV','prod_01KPJVBQZHY9ZNDPP2QVSJASCN','prod_01KPJVCG45T5C6498YJ8FYHT36','prod_01KPJVCFY5DJS7MGEVR8NM7ARE','prod_01KP6FDG9HRJTF48R37RE6TXM4','prod_01KPJVCGACN889ZNDT8NGDGBE2') AND product_category_id='pcat_el_12x1_30';
UPDATE product_category_product SET product_category_id='pcat_23console' WHERE product_id IN ('prod_01KNXXP1YRBJKWPYPHGF0D79D0','prod_01KNXXP1XWD06S8W1ZJ0P8TMMJ','prod_01KNXXP1YND5SM7QYW5BV2CWNB','prod_01KNXXP1YSPY8JEYY307WRH052') AND product_category_id='pcat_el_12x1_30';
UPDATE product_category_product SET product_category_id='pcat_12scope' WHERE product_id IN ('prod_01KNXXHB37XJSV2YH9M43WB75R','prod_01KNXXHCWX0SQP0TENH6GMXEMS','prod_01KNXXHCX49P99K1CX1GK6RQHE','prod_01KNXXHC0NNTMGFZ1YN5ZDYH6K','prod_01KNXXHDRSRTS8EBJMWYV08PJF','prod_01KNXXHDRZVAR96YXCFFW96A5H') AND product_category_id='pcat_el_12x1_30';
UPDATE product_category SET name='Pallihoidjad ja spordivarustuse kärud', updated_at=now() WHERE id='pcat_el_12x1_30';
COMMIT;
