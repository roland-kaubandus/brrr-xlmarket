BEGIN;
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_19handpan','Handpanid ja keelepillid','','v4-muusika-handpanid-ja-keelepillid',true,false,'pcat_v4_l19_1','pcat_v4_l19.pcat_v4_l19_1.pcat_19handpan',90,now(),now()),
 ('pcat_19cajon','Cajonid','','v4-muusika-cajonid',true,false,'pcat_v4_l19_1','pcat_v4_l19.pcat_v4_l19_1.pcat_19cajon',91,now(),now()),
 ('pcat_20noor','Piirde-nöörid ja köied','','v4-peoinventar-piirde-noorid-ja-koied',true,false,'pcat_20d','pcat_v4_l20.pcat_20d.pcat_20noor',90,now(),now()),
 ('pcat_1annular','Annulaarfreesid','','v4-tooriistad-annulaarfreesid',true,false,'pcat_t3l2_9','pcat_v4_l1.pcat_t3l2_9.pcat_1annular',90,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_19handpan',3,'active','manual',true,15,now(),now()),('pcat_19cajon',3,'active','manual',true,8,now(),now()),
 ('pcat_20noor',3,'active','manual',true,36,now(),now()),('pcat_1annular',3,'active','manual',true,9,now(),now());

-- A) Löökpillid(47) split: handpan/cajon välja, JÄÄK trummikomplektid+tarvikud
UPDATE product_category_product pcp SET product_category_id='pcat_19handpan'
 FROM product p WHERE p.id=pcp.product_id AND pcp.product_category_id='pcat_mu_1_3'
 AND (p.title ILIKE '%handpan%' OR p.title ILIKE '%tongue drum%' OR p.title ILIKE '%steel drum%');
UPDATE product_category_product pcp SET product_category_id='pcat_19cajon'
 FROM product p WHERE p.id=pcp.product_id AND pcp.product_category_id='pcat_mu_1_3' AND p.title ILIKE '%cajon%';
UPDATE product_category SET name='Trummikomplektid ja -tarvikud', updated_at=now() WHERE id='pcat_mu_1_3';

-- B) Piirdepostid(58) split: nöörid välja, JÄÄK postid/stanchionid
UPDATE product_category_product pcp SET product_category_id='pcat_20noor'
 FROM product p WHERE p.id=pcp.product_id AND pcp.product_category_id='pcat_t3f_13_7'
 AND (p.title ILIKE '%rope%' OR p.title ILIKE '%velvet%');
UPDATE product_category SET name='Piirdepostid ja stanchionid', updated_at=now() WHERE id='pcat_t3f_13_7';

-- C) Teemantpuurkroonid(49): 9 annular → uus L3 (metall); JÄÄK teemant-südamikpuurid(40, betoon)
UPDATE product_category_product SET product_category_id='pcat_1annular' WHERE product_id IN ('prod_01KNXX934JXEXEEEN4W656TA3K','prod_01KPJXEEX2FF5CQJ06PKJZ7F5Q','prod_01KPJXEFQS0QZF79QY789JZEFA','prod_01KNXX934JE2Z8MSAQR1HY1DT9','prod_01KPJXFARH9M09V843ZDXKX7Z5','prod_01KPJXFAZ5520CT2W22N9RGR8G','prod_01KNXX933Q1PNT7A9Z20P7W923','prod_01KNXX96TWAGZXF8XK0Z8FVXTY','prod_01KPJXEF3KYZ2CYMN9G79BEQRJ');

-- Muusika intra (2)
UPDATE product_category_product SET product_category_id='pcat_mu_2_2' WHERE product_id='prod_01KNXXHNXHK08284ET6T0RPRSV';
UPDATE product_category_product SET product_category_id='pcat_mu_1_5' WHERE product_id='prod_01KNXXKK9NCK7K2SHT224S4ETG';
COMMIT;
\echo '--- tulem ---'
SELECT c.name, split_part(c.mpath,'.',1) main, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_mu_1_3','pcat_19handpan','pcat_19cajon','pcat_t3f_13_7','pcat_20noor','pcat_t3f_9_4','pcat_1annular') AND c.deleted_at IS NULL ORDER BY main;
