-- #20 L3-nimed jätk: split masinad + 4 rename
BEGIN;
-- SAMM 1 SPLIT: pcat_12peo -> "Vaht- ja lumemasinad" (jää 9); uus "Mänguautomaadid" (2 claw)
UPDATE product_category SET name='Vaht- ja lumemasinad', handle='v4-peoinventar-vaht-lumemasinad' WHERE id='pcat_12peo';
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_20claw','Mänguautomaadid','','v4-peoinventar-manguautomaadid',true,false,'pcat_20c','pcat_v4_l20.pcat_20c.pcat_20claw',8,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_20claw',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_20claw'
WHERE product_category_id='pcat_12peo' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('SYWWJBS000009TIVCV2','ZXWWJHSZSZXZK0UCT001V2'));
-- SAMM 2 RENAME (name + handle)
UPDATE product_category SET name='Lavaefektid', handle='v4-peoinventar-lavaefektid' WHERE id='pcat_mu_2_3';
UPDATE product_category SET name='Hüppelossi- ja batuudipuhurid', handle='v4-peoinventar-huppelossi-batuudipuhurid' WHERE id='pcat_el_12x2_9';
UPDATE product_category SET name='Pulma-lillestatiivid', handle='v4-peoinventar-pulma-lillestatiivid' WHERE id='pcat_mv_6x1_13';
UPDATE product_category SET name='Pulma-lillevaasid', handle='v4-peoinventar-pulma-lillevaasid' WHERE id='pcat_mv_6x1_12';
COMMIT;
