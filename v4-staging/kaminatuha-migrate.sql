BEGIN;
INSERT INTO product_category (id,name,handle,parent_category_id,mpath,rank,is_active,is_internal,description,created_at,updated_at) VALUES
('pcat_10tuha','Tuhaämbrid','v4-santehnika-kute-kaminad-tuhaambrid','pcat_v4_l10_4','pcat_v4_l10.pcat_v4_l10_4.pcat_10tuha',0,true,false,'',NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
('pcat_10tuha',3,'active','manual',true,3,NOW(),NOW());
UPDATE product_category SET name='Kaminatööriistad', updated_at=NOW() WHERE id='pcat_10kamtool';
UPDATE product_category_product SET product_category_id='pcat_10tuha' WHERE product_id IN ('prod_01KP6FARECP6PC4ZBF47PJ8PR4','prod_01KPJV5MSE3WH618SCBF53Q9WS','prod_01KPJV5MZF4QEK87C3EKDRJPQX') AND product_category_id='pcat_10kamtool';
COMMIT;
SELECT c.name,(SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_10kamtool','pcat_10tuha');
SELECT 'distinct',count(DISTINCT product_id) FROM product_category_product;
SELECT 'L3',count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
