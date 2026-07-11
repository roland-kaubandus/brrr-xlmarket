BEGIN;
-- Fix 1: kustuta tühjenenud #12 Sport L2 "Keraamika & pottsepatöö" (keraamika kolis #25)
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_12cer';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_12cer';
-- Fix 2: Maalimistarvikud split — valguslauad(5, LED jäljendamine) välja; lõuend+molbert jäävad(12)
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_25valgus','Valguslauad ja jäljenduslauad','','v4-hobi-kunst-valguslauad-ja-jaljenduslauad',true,false,'pcat_25art','pcat_v4_l25.pcat_25art.pcat_25valgus',2,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES ('pcat_25valgus',3,'active','manual',true,5,now(),now());
UPDATE product_category_product SET product_category_id='pcat_25valgus' WHERE product_id IN ('prod_01KNXXKB54P051T6TDGY3GS8MP','prod_01KNXXK063BEPHSXF1APS2GKP7','prod_01KNXXKA8ZWQBQW88FVJW2WQ90','prod_01KNXXKA861810XS3YH78RY22D','prod_01KNXXK1ZMJ2E62NN71EHX3SYM');
COMMIT;
SELECT l3.name,(SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n FROM product_category l3 WHERE l3.parent_category_id='pcat_25art' AND l3.deleted_at IS NULL ORDER BY l3.rank;
