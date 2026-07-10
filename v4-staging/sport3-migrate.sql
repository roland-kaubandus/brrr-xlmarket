BEGIN;
-- SAMM 1: 3 laste-jalgrattahaagist (eksklusiivne) → #24 uus L3 "Laste sõidukid" all
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_sp24bt','Laste jalgrattahaagised ja jooksukärud','','v4-lastekaubad-lastesoidukid-laste-jalgrattahaagised',true,false,'pcat_24veh','pcat_v4_l24.pcat_24veh.pcat_sp24bt',1,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES ('pcat_sp24bt',3,'active','manual',true,3,now(),now());
UPDATE product_category_product SET product_category_id='pcat_sp24bt' WHERE product_id IN ('prod_01KNXXC8HY509VMV4A917P4STX','prod_01KNXXC7KXAZRKRS0B365S10H4','prod_01KNXXC8HTKPGHKT2ZFYCT7J37');

-- SAMM 2: beer pong 4 + soccer dart 3 (peomängud) → #20 uus L3; bocce+cornhole jäävad
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_sp20pg','Peomängud','','v4-peoinventar-meelelahutus-atraktsioonid-peomangud',true,false,'pcat_20c','pcat_v4_l20.pcat_20c.pcat_sp20pg',9,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES ('pcat_sp20pg',3,'active','manual',true,7,now(),now());
UPDATE product_category_product SET product_category_id='pcat_sp20pg' WHERE product_id IN ('prod_01KNXXKESARHEXTC58Q3WSM6SW','prod_01KNXXKES9JSX25CNHR1EAZV8Y','prod_01KNXXKES53XHF6FJCQX8DYK21','prod_01KNXXKGHSHJJTKQ8PTTJH7GR4','prod_01KNXXMT25YK9ETRGCM82T65NX','prod_01KNXXNDZDCKQP1XMN2YPWA5DE','prod_01KNXXMT2A0E609VTMA2ZK70VV');
UPDATE product_category SET name='Muru- ja õuemängud', updated_at=now() WHERE id='pcat_el_12x1_17';

-- SAMM 3: merge Püstolikohvrid(5) → Relvakohvrid ja -kastid(25); väljund sama (relva kõva kaitseümbris, suurus=variant)
UPDATE product_category_product SET product_category_id='pcat_el_12x6_1' WHERE product_category_id='pcat_el_12x6_2';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_el_12x6_2';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_el_12x6_2';
INSERT INTO slug_redirect (from_slug,to_slug,reason,created_at) VALUES
 ('v4-sport-ja-vaba-aeg-jaht-ja-jahivarustus-pustolikohvrid','v4-sport-ja-vaba-aeg-jaht-ja-jahivarustus-relvakohvrid-ja-kastid','merge',now());
COMMIT;
\echo '--- tulem ---'
SELECT name,(SELECT count(*) FROM product_category_product WHERE product_category_id=pc.id) n FROM product_category pc WHERE id IN ('pcat_sp24bt','pcat_sp20pg','pcat_el_12x1_17','pcat_el_12x6_1','pcat_el_12x6_2','pcat_el_12x1_29') ORDER BY id;
