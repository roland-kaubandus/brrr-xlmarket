BEGIN;
-- FAAS 2 TIER-B Tööriistad: Teritusmasinad split + Plastikukeevitus dup-värav
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_t3saw','Saeketaste teritajad','','v4-saeketaste-teritajad',true,false,'pcat_t3l2_2','pcat_v4_l1.pcat_t3l2_2.pcat_t3saw',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_t3l2_2' AND deleted_at IS NULL),now(),now()),
 ('pcat_t3gard','Kett- ja muruniidukitera-teritajad','','v4-kett-muruniiduki-teritajad',true,false,'pcat_t3l2_2','pcat_v4_l1.pcat_t3l2_2.pcat_t3gard',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_t3l2_2' AND deleted_at IS NULL),now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_t3saw',3,'active','manual',true,5,now(),now()),
 ('pcat_t3gard',3,'active','manual',true,3,now(),now());
UPDATE product_category_product SET product_category_id='pcat_t3saw' WHERE product_id IN ('prod_01KNXX9SY3GVKCAAY9V2WKEABS','prod_01KNXX9PC5669NCA22W2VG0J7C','prod_01KQA2TXD9YQY88FQK8R3SYZMN','prod_01KP6FG38JWNEQYRXWH1AC7XW9','prod_01KQA2TXNHQJ1SZP9XE4BKJQ5N') AND product_category_id='pcat_t3f_2_7';
UPDATE product_category_product SET product_category_id='pcat_t3gard' WHERE product_id IN ('prod_01KNXX6PBTDN21SSYHN7YHDC3F','prod_01KNXXPBYRANTQ90ZYBZ8K1X85','prod_01KNXXPAZV60AVXQZYAX78GE8B') AND product_category_id='pcat_t3f_2_7';
UPDATE product_category_product SET product_category_id='pcat_t3f_2_16' WHERE product_id IN ('prod_01KNXX7DY2H7QECXMSN0H2VQPS','prod_01KNXXJQ185NWCMNXHKTA4KW82','prod_01KNXXJN9D6K9X5C1AAD5MRTP6','prod_01KNXXJMC8D9S59Z0X2YZVG20T','prod_01KNXXJQ240M6JGBZPJMNFWTRZ','prod_01KNXXJP5AS1C9YXRK1EBKY35C') AND product_category_id='pcat_t3f_7_9';
UPDATE product_category SET name='Puuritera-teritajad', updated_at=now() WHERE id='pcat_t3f_2_7';
UPDATE product_category SET name='Plastikukeevituspüstolid ja klamberkomplektid', updated_at=now() WHERE id='pcat_t3f_7_9';
UPDATE product_category SET name='Külmaaine-manomeetrid ja laadimiskaalud', updated_at=now() WHERE id='pcat_es_10x1_17';
COMMIT;
