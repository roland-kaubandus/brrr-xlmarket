BEGIN;
INSERT INTO product_category (id,name,handle,parent_category_id,mpath,rank,is_active,is_internal,description,created_at,updated_at) VALUES
('pcat_24trumm','Laste trummikomplektid','v4-lastekaubad-laste-trummikomplektid','pcat_24oppe','pcat_v4_l24.pcat_24oppe.pcat_24trumm',0,true,false,'',NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES ('pcat_24trumm',3,'active','manual',true,7,NOW(),NOW());
UPDATE product_category SET name='Laste klaverid ja klahvpillid', updated_at=NOW() WHERE id='pcat_el_12x2_15';
UPDATE product_category_product SET product_category_id='pcat_24trumm' WHERE product_id IN ('prod_01KNXXQQ1X7T4M695FEXJQDC81','prod_01KNXXQQ20A5AZZTPSZSC31MPA','prod_01KNXXQQZAZPNB4AY98BBMZ6KH','prod_01KNXXQP6BGQ3QKTVMX386MNXE','prod_01KNXXQR069B5R50G4F4NQ5ER2','prod_01KNXXQQZDAYPAE77A93RF4CRT','prod_01KNXXQQ303N8J1E6CSMSCYYA3') AND product_category_id='pcat_el_12x2_15';
COMMIT;
SELECT c.name,(SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_el_12x2_15','pcat_24trumm');
SELECT 'L3',count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
