BEGIN;
-- FAAS 2 TIER-B Ladu: Pakkimis-köitmistarvikud + Pesukorvid split
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_22tape','Pakketeip','','v4-pakketeip',true,false,'pcat_22pack','pcat_v4_l22.pcat_22pack.pcat_22tape',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_22pack' AND deleted_at IS NULL),now(),now()),
 ('pcat_22film','Venituskile ja mullikile','','v4-venituskile-mullikile',true,false,'pcat_22pack','pcat_v4_l22.pcat_22pack.pcat_22film',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_22pack' AND deleted_at IS NULL),now(),now()),
 ('pcat_22dry','Riidekuivatusrestid','','v4-riidekuivatusrestid',true,false,'pcat_22box','pcat_v4_l22.pcat_22box.pcat_22dry',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_22box' AND deleted_at IS NULL),now(),now()),
 ('pcat_22lcart','Pesukärud','','v4-pesukarud',true,false,'pcat_22box','pcat_v4_l22.pcat_22box.pcat_22lcart',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_22box' AND deleted_at IS NULL),now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_22tape',3,'active','manual',true,8,now(),now()),
 ('pcat_22film',3,'active','manual',true,3,now(),now()),
 ('pcat_22dry',3,'active','manual',true,3,now(),now()),
 ('pcat_22lcart',3,'active','manual',true,4,now(),now());
UPDATE product_category_product SET product_category_id='pcat_22tape' WHERE product_id IN ('prod_01KNXXKN45GGJBJDCRP2GJQQT2','prod_01KNXXKHFQN2N53JYJ806ESP7X','prod_01KNXXKHFTR27PHJ0QGVF3DKC6','prod_01KNXXKHFX684DY192WMYV0RR5','prod_01KNXXKJBRFQJDSEGVE2AE1ACT','prod_01KNXXKHFRFDKDVK5EBBWEQSY3','prod_01KNXXKJBTS45E8PDJHSYHQCER','prod_01KNXXKJCCVCRTNVVEQPHPBZ6S') AND product_category_id='pcat_th1_3';
UPDATE product_category_product SET product_category_id='pcat_22film' WHERE product_id IN ('prod_01KNXXAPXWWC7HGPDC9X78QWSS','prod_01KNXXCN53V8438N3ZPVYZ2AHP','prod_01KNXXCKCC6TJSD1V4JYQJZWHM') AND product_category_id='pcat_th1_3';
UPDATE product_category_product SET product_category_id='pcat_22dry' WHERE product_id IN ('prod_01KNXXPDPAVENVDQCEC96AKJNZ','prod_01KNXXPJ4W1TQ1EAQ56VHPK47J','prod_01KNXXPK109JNTXHXZWVHKY49A') AND product_category_id='pcat_mv_6x2_12';
UPDATE product_category_product SET product_category_id='pcat_22lcart' WHERE product_id IN ('prod_01KPJV8E3XRRQ0QC622XSTS3HM','prod_01KPJV8EAHBW60YVBSJKM4TBSF','prod_01KNXXAP0YMTND2CPMVZG8NW4Q','prod_01KNXXRYV8750D7WYHX0B6E81G') AND product_category_id='pcat_mv_6x2_12';
UPDATE product_category SET name='Pantimis- ja rihmastamistarvikud', updated_at=now() WHERE id='pcat_th1_3';
UPDATE product_category SET name='Pesusorteerijad ja -korvid', updated_at=now() WHERE id='pcat_mv_6x2_12';
COMMIT;
