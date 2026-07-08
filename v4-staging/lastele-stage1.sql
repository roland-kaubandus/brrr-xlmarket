BEGIN;
-- ===== STAGE 1: UUS MAIN #24 + 7 L2 =====
INSERT INTO product_category (id,name,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
('pcat_v4_l24','Lastekaubad ja mänguasjad','v4-lastekaubad-ja-manguasjad',true,false,NULL,'pcat_v4_l24',24,NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,created_at,updated_at) VALUES ('pcat_v4_l24',1,'active','manual',true,NOW(),NOW());

INSERT INTO product_category (id,name,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
('pcat_24kons','Konstruktorid & klotsid','v4-lastekaubad-konstruktorid',true,false,'pcat_v4_l24','pcat_v4_l24.pcat_24kons',1,NOW(),NOW()),
('pcat_24soid','Mängusõidukid & RC','v4-lastekaubad-manguasoidukid',true,false,'pcat_v4_l24','pcat_v4_l24.pcat_24soid',2,NOW(),NOW()),
('pcat_24roll','Rolli- & tegevusmängud','v4-lastekaubad-rollimangud',true,false,'pcat_v4_l24','pcat_v4_l24.pcat_24roll',3,NOW(),NOW()),
('pcat_24oppe','Loov- & õppemänguasjad','v4-lastekaubad-loov-oppe',true,false,'pcat_v4_l24','pcat_v4_l24.pcat_24oppe',4,NOW(),NOW()),
('pcat_24oue','Õuemänguasjad & mänguväljak','v4-lastekaubad-ouemanguasjad',true,false,'pcat_v4_l24','pcat_v4_l24.pcat_24oue',5,NOW(),NOW()),
('pcat_24sprt','Laste sport & aktiiv','v4-lastekaubad-lastesport',true,false,'pcat_v4_l24','pcat_v4_l24.pcat_24sprt',6,NOW(),NOW()),
('pcat_24veh','Laste sõidukid','v4-lastekaubad-lastesoidukid',true,false,'pcat_v4_l24','pcat_v4_l24.pcat_24veh',7,NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,created_at,updated_at) VALUES
('pcat_24kons',2,'active','manual',true,NOW(),NOW()),('pcat_24soid',2,'active','manual',true,NOW(),NOW()),
('pcat_24roll',2,'active','manual',true,NOW(),NOW()),('pcat_24oppe',2,'active','manual',true,NOW(),NOW()),
('pcat_24oue',2,'active','manual',true,NOW(),NOW()),('pcat_24sprt',2,'active','manual',true,NOW(),NOW()),
('pcat_24veh',2,'active','manual',true,NOW(),NOW());

-- ===== STAGE 2: 15 PUHAST-A L3 REPARENT (handle jääb, #23 precedent) =====
UPDATE product_category SET parent_category_id='pcat_24kons', mpath='pcat_v4_l24.pcat_24kons.'||id, updated_at=NOW() WHERE id='pcat_el_12x2_14';
UPDATE product_category SET parent_category_id='pcat_24soid', mpath='pcat_v4_l24.pcat_24soid.'||id, updated_at=NOW() WHERE id='pcat_el_12x2_4';
UPDATE product_category SET parent_category_id='pcat_24roll', mpath='pcat_v4_l24.pcat_24roll.'||id, updated_at=NOW() WHERE id IN ('pcat_el_12x2_11','pcat_el_12x2_19','pcat_el_12x2_13','pcat_el_12x2_21');
UPDATE product_category SET parent_category_id='pcat_24oppe', mpath='pcat_v4_l24.pcat_24oppe.'||id, updated_at=NOW() WHERE id IN ('pcat_el_12x2_24','pcat_el_12x2_20','pcat_el_12x2_15');
UPDATE product_category SET parent_category_id='pcat_24oue', mpath='pcat_v4_l24.pcat_24oue.'||id, updated_at=NOW() WHERE id IN ('pcat_el_12x2_17','pcat_el_12x2_10','pcat_el_12x2_12');
UPDATE product_category SET parent_category_id='pcat_24veh', mpath='pcat_v4_l24.pcat_24veh.'||id, updated_at=NOW() WHERE id='pcat_el_12x2_2';
UPDATE product_category SET parent_category_id='pcat_24sprt', mpath='pcat_v4_l24.pcat_24sprt.'||id, updated_at=NOW() WHERE id IN ('pcat_el_12x2_7','pcat_el_12x2_18');
COMMIT;

\echo '--- L1 24 + 7 L2 loodud? ---'
SELECT c.name, count(ch.id) AS l2_lapsi FROM product_category c LEFT JOIN product_category ch ON ch.parent_category_id=c.id AND ch.deleted_at IS NULL WHERE c.id='pcat_v4_l24' GROUP BY c.name;
\echo '--- 7 L2 + reparented L3 arv igas ---'
SELECT l2.name, count(l3.id) AS l3_arv, sum((SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id)) AS tooteid
FROM product_category l2 LEFT JOIN product_category l3 ON l3.parent_category_id=l2.id AND l3.deleted_at IS NULL
WHERE l2.parent_category_id='pcat_v4_l24' GROUP BY l2.name,l2.rank ORDER BY l2.rank;
\echo '--- L1 arv (peaks 24) + distinct ---'
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND parent_category_id IS NULL AND deleted_at IS NULL;
SELECT count(DISTINCT product_id) FROM product_category_product;
