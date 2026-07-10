BEGIN;
-- SAMM 2 rekursiivne: Jalgpall jääk (15) = 10 viskevõrku + 5 väravat → lisasplit
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_sp12o4','Jalgpalli viske- ja treeningvõrgud','','v4-sport-ja-vaba-aeg-ouetegevus-ja-hobi-jalgpalli-viske-ja-treeningvorgud',true,false,'pcat_v4_l12_1','pcat_v4_l12.pcat_v4_l12_1.pcat_sp12o4',24,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES ('pcat_sp12o4',3,'active','manual',true,10,now(),now());
UPDATE product_category_product SET product_category_id='pcat_sp12o4' WHERE product_id IN ('prod_01KPJXA516Q7NFHB63NW8GP6BW','prod_01KPJXA4TDMH9KW21JHN8DS09X','prod_01KPJXA584K039MW0TRAVHP15S','prod_01KPJXA5NHPEE2RF5YN3TTESAQ','prod_01KPJXA4MZRNCFBJMP53GTKGX7','prod_01KPJXA4E8CQHR49D3AGAWY7PX','prod_01KPJXA5ESR4FHYRXYM5HP7MFQ','prod_01KNXXA32P497Z7XAY9J3STG4G','prod_01KNXXA32YBXQHPZHZA4AFR6A7','prod_01KNXXA32W8GYGBXV02W8GYM77');
UPDATE product_category SET name='Jalgpalliväravad', updated_at=now() WHERE id='pcat_el_12x1_3';
COMMIT;
SELECT c.name,(SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_el_12x1_3','pcat_sp12o4');
