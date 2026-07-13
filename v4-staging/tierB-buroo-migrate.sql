BEGIN;
-- FAAS 2 TIER-B Büroo: Tahvlid split + Kassasahtlid dup-värav
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_21cork','Korktahvlid ja teadetetahvlid','','v4-korktahvlid',true,false,'pcat_21board','pcat_v4_l21.pcat_21board.pcat_21cork',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_21board' AND deleted_at IS NULL),now(),now()),
 ('pcat_21combo','Kombineeritud valge- ja korktahvlid','','v4-kombineeritud-tahvlid',true,false,'pcat_21board','pcat_v4_l21.pcat_21board.pcat_21combo',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_21board' AND deleted_at IS NULL),now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_21cork',3,'active','manual',true,7,now(),now()),
 ('pcat_21combo',3,'active','manual',true,5,now(),now());
UPDATE product_category_product SET product_category_id='pcat_21cork' WHERE product_id IN ('prod_01KNXX87YWR5RD26T3VNYTB0PQ','prod_01KNXX88WJQQFA329N291RJK42','prod_01KNXXG105MTF55H2GYMT16XNK','prod_01KNXXG10ZRF83HK5EBFKJ08CQ','prod_01KNXXFR38MKWJWEFS3XT60PAZ','prod_01KNXXG10TG85WCE55HXC1KMZ5','prod_01KNXXFS0YJHA5Q2DH16M8X53Y') AND product_category_id='pcat_mv_6x3_7';
UPDATE product_category_product SET product_category_id='pcat_21combo' WHERE product_id IN ('prod_01KNXXG104T6QEQSZAQC162EG9','prod_01KNXXG10V4MF596NNF5SFW0TZ','prod_01KNXXG050X7Q0D51ND0WFQP4Y','prod_01KNXXG0514BQWH246DRKNKR8C','prod_01KNXXG1033MVMQNRF93BPKEDM') AND product_category_id='pcat_mv_6x3_7';
UPDATE product_category_product SET product_category_id='pcat_5n17' WHERE product_id IN ('prod_01KNXX7M6EJTKX4QSH64K2MS6C','prod_01KNXX7M6D5KQADQM35K794XMF','prod_01KNXX7M6F66131HX8J5FXGFBX') AND product_category_id='pcat_mv_6x3_12';
UPDATE product_category SET name='Kirjutustahvlid', updated_at=now() WHERE id='pcat_mv_6x3_7';
COMMIT;
