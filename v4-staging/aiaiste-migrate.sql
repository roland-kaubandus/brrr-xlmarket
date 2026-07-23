-- Aia-iste split: Aiaistmed ja põlvituspingid -> Ratastega aiatöö-istmed + Aiapõlvitajad
BEGIN;
-- rename vana L3 -> Ratastega aiatöö-istmed (8 rolling seat/scooter jääb)
UPDATE product_category SET name='Ratastega aiatöö-istmed', handle='v4-aed-ratastega-aiatoo-istmed' WHERE id='pcat_t3a_1_11';
-- uus L3 Aiapõlvitajad
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_7kneel','Aiapõlvitajad','','v4-aed-aiapolvitajad',true,false,'pcat_v4_l7_1','pcat_v4_l7.pcat_v4_l7_1.pcat_7kneel',20,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_7kneel',3,'active','manual',true,0,now(),now());
-- 4 põlvitajat -> Aiapõlvitajad
UPDATE product_category_product SET product_category_id='pcat_7kneel'
  WHERE product_category_id='pcat_t3a_1_11' AND product_id IN (SELECT id FROM product WHERE title ~* 'kneeler|kneeling');
COMMIT;
