-- Suur üle-käik FAAS 3: grab-bag split'id + üksik võõrkehad
BEGIN;
-- ===== UUED L3-d =====
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_1fiber','Kiudoptika jätkuseadmed','','v4-tooriistad-kiudoptika-jatkuseadmed',true,false,'pcat_t3l2_7','pcat_v4_l1.pcat_t3l2_7.pcat_1fiber',30,now(),now()),
 ('pcat_1needi','Needipüstolid','','v4-tooriistad-needipustolid',true,false,'pcat_t3l2_1','pcat_v4_l1.pcat_t3l2_1.pcat_1needi',40,now(),now()),
 ('pcat_1aas','Aasade paigaldustööriistad','','v4-tooriistad-aasade-paigaldus',true,false,'pcat_t3l2_1','pcat_v4_l1.pcat_t3l2_1.pcat_1aas',41,now(),now()),
 ('pcat_3bind','Koorma kinnitusketid','','v4-auto-koorma-kinnitusketid',true,false,'pcat_v4_l3_1','pcat_v4_l3.pcat_v4_l3_1.pcat_3bind',30,now(),now()),
 ('pcat_2farm','Farm-jack tungrauad','','v4-garaaz-farm-jack-tungrauad',true,false,'pcat_v4_l2_3','pcat_v4_l2.pcat_v4_l2_3.pcat_2farm',30,now(),now()),
 ('pcat_22postal','Posti- & loenduskaalud','','v4-ladu-posti-loenduskaalud',true,false,'pcat_22pack','pcat_v4_l22.pcat_22pack.pcat_22postal',20,now(),now()),
 ('pcat_7liner','Basseinivooderdised','','v4-aed-basseinivooderdised',true,false,'pcat_v4_l7_2','pcat_v4_l7.pcat_v4_l7_2.pcat_7liner',20,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_1fiber',3,'active','manual',true,0,now(),now()),('pcat_1needi',3,'active','manual',true,0,now(),now()),
 ('pcat_1aas',3,'active','manual',true,0,now(),now()),('pcat_3bind',3,'active','manual',true,0,now(),now()),
 ('pcat_2farm',3,'active','manual',true,0,now(),now()),('pcat_22postal',3,'active','manual',true,0,now(),now()),
 ('pcat_7liner',3,'active','manual',true,0,now(),now());

-- ===== SAMM 1: #1 grab-bag =====
-- Farm Jack (7) -> #2 Tungrauad uus L3
UPDATE product_category_product SET product_category_id='pcat_2farm' WHERE product_category_id='pcat_th1_1' AND product_id IN (SELECT id FROM product WHERE title ~* 'farm jack');
-- Fiber Fusion Splicer (3) -> #1 uus L3
UPDATE product_category_product SET product_category_id='pcat_1fiber' WHERE product_category_id='pcat_t3f_7_2' AND product_id IN (SELECT id FROM product WHERE title ~* 'fiber fusion|fiber optic splicer|fiber splicer');
-- Grommet (1) -> Aasade paigaldus
UPDATE product_category_product SET product_category_id='pcat_1aas' WHERE product_category_id='pcat_t3f_1_26' AND product_id IN (SELECT id FROM product WHERE title ~* 'grommet');
-- Pop Rivet Gun (3) -> Needipüstolid
UPDATE product_category_product SET product_category_id='pcat_1needi' WHERE product_category_id='pcat_t3f_1_26' AND product_id IN (SELECT id FROM product WHERE title ~* 'pop rivet gun');
-- Chain Load Binder (4) -> #3 Pukseerimisseadmed uus L3
UPDATE product_category_product SET product_category_id='pcat_3bind' WHERE product_category_id='pcat_t3f_10_2' AND product_id IN (SELECT id FROM product WHERE title ~* 'load binder|chain binder');

-- ===== SAMM 2: #5 grab-bag =====
-- Heating Lamp French Fry (3) -> Soojenduslambid
UPDATE product_category_product SET product_category_id='pcat_ks_5x8_3' WHERE product_category_id='pcat_5warm' AND product_id IN (SELECT id FROM product WHERE title ~* 'heating lamp');
-- Hot Box + Warming Drawer (4) -> Toidusoojenduskapid
UPDATE product_category_product SET product_category_id='pcat_ks_5x8_2' WHERE product_category_id='pcat_5warm' AND product_id IN (SELECT id FROM product WHERE title ~* 'hot box|warming drawer');
-- Electric Vibrating Sieve Sõeladest (3) -> Vibrosõelad
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_33' WHERE product_category_id='pcat_ks_5x2_17' AND product_id IN (SELECT id FROM product WHERE title ~* 'vibrating sieve');
-- Apple Crusher (1) -> Mahlapressid
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_17' WHERE product_category_id='pcat_ks_5x1_25' AND product_id IN (SELECT id FROM product WHERE title ~* 'apple crusher|cider press');
-- Popsicle Machine (1) -> Jäätisemasinad
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_3' WHERE product_category_id='pcat_ks_5x1_25' AND product_id IN (SELECT id FROM product WHERE title ~* 'popsicle|ice lolly');

-- ===== SAMM 3: #4 Pliidid Warming Tray (2) -> #5 Toidusoojendajad =====
UPDATE product_category_product SET product_category_id='pcat_5warm' WHERE product_category_id='pcat_ks_4x1_15' AND product_id IN (SELECT id FROM product WHERE title ~* 'warming tray|warming mat');

-- ===== SAMM 4: #16 =====
-- 4 anatoomiamudelit -> Anatoomilised õppemudelid (merge)
UPDATE product_category_product SET product_category_id='pcat_t3f_14_5' WHERE product_category_id='pcat_f4_16x2_5' AND product_id IN ('prod_01KNXXB3G6HBGNBJ2AHX4W4A9Q','prod_01KNXXB0V0808EP77RR2PCXY5F','prod_01KNXXB1R45HWXWED6XBM19931','prod_01KNXXAYZ7H5P8BJWV44MP1TYG');
-- pcat_f4_16x2_5 (9 harjutusmannekeeni jäävad) -> rename
UPDATE product_category SET name='Meditsiinilised simulatsioonivahendid' WHERE id='pcat_f4_16x2_5';
-- Laborikaalud: postikaal+loenduskaal (6) -> #22 uus L3
UPDATE product_category_product SET product_category_id='pcat_22postal' WHERE product_category_id='pcat_t3f_14_7' AND product_id IN (SELECT id FROM product WHERE title ~* 'postal|shipping scale|shipping postal|counting scale');

-- ===== SAMM 5: #3 =====
-- Tungrauad ja alused (3) -> õed
UPDATE product_category_product SET product_category_id='pcat_ag2_3x5_4' WHERE product_category_id='pcat_ag2_3x5_8' AND product_id IN (SELECT id FROM product WHERE title ~* 'scissor jack');
UPDATE product_category_product SET product_category_id='pcat_ag2_3x5_5' WHERE product_category_id='pcat_ag2_3x5_8' AND product_id IN (SELECT id FROM product WHERE title ~* 'leveling pad');
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ag2_3x5_8';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_ag2_3x5_8';
-- Käsivintsid: Traction Boards + Winch Cable/Rope (6) -> Vintsi trossid ja taasteplokid
UPDATE product_category_product SET product_category_id='pcat_ag2_3x1_13' WHERE product_category_id='pcat_ag2_3x1_3' AND product_id IN (SELECT id FROM product WHERE title ~* 'traction board|recovery board|winch cable|winch rope|winch line');

-- ===== SAMM 6: #14 =====
-- Koera autoistmed -> Transport & autotarvikud L2 (reparent)
UPDATE product_category SET parent_category_id='pcat_v4_l14_3', mpath='pcat_v4_l14.pcat_v4_l14_3.pcat_lp_4_1' WHERE id='pcat_lp_4_1';
-- Kassipuurid (4) -> Puurid & aedikud (merge), kustuta
UPDATE product_category_product SET product_category_id='pcat_v4_l14_1' WHERE product_category_id='pcat_14cat2';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_14cat2';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_14cat2';

-- ===== SAMM 7: #7 + #10 =====
-- Pool Liner (8) -> Basseinivooderdised
UPDATE product_category_product SET product_category_id='pcat_7liner' WHERE product_category_id='pcat_t3a_2_1' AND product_id IN (SELECT id FROM product WHERE title ~* 'pool liner');
-- Tulelauad ja tuulevarjud (3) laiali, kustuta
UPDATE product_category_product SET product_category_id='pcat_t3a_9_1' WHERE product_category_id='pcat_t3a_6_12' AND product_id='prod_01KNXXBDFWCJ6TFQ0XZVBBRY2H';
UPDATE product_category_product SET product_category_id='pcat_t3a_9_2' WHERE product_category_id='pcat_t3a_6_12' AND product_id='prod_01KNXXJQ1ANDFXDK0XP3587702';
UPDATE product_category_product SET product_category_id='pcat_7pv'      WHERE product_category_id='pcat_t3a_6_12' AND product_id='prod_01KNXXPJ48B4RTE9CBR90HE8HR';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3a_6_12';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_t3a_6_12';
-- #10 Kaminad: Towel Warmer -> Rätikukuivatid; Chimney Sweep -> Korstnahooldus
UPDATE product_category_product SET product_category_id='pcat_10rat' WHERE product_category_id='pcat_10kam' AND product_id='prod_01KNXXF4HJ1VPBCN4WA50JRGBF';
UPDATE product_category_product SET product_category_id='pcat_10kor' WHERE product_category_id='pcat_10kam' AND product_id='prod_01KNXX7C49MQ9R7ECJVMAQJT6H';

-- ===== SAMM 8: #15 Vesinikuvee Hair Steamer (1) -> Juuksehooldusseadmed =====
UPDATE product_category_product SET product_category_id='pcat_f4_15x1_5' WHERE product_category_id='pcat_f4_15x1_14' AND product_id IN (SELECT id FROM product WHERE title ~* 'hair steamer');
COMMIT;
