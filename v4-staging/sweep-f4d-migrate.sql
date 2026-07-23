-- Sweep FAAS 4d: #12 magnetkalastus->Kalastus; Telgid + Treeningmatid grab-bag split
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;
-- SAMM 1: Magnetkalastuse komplektid -> Kalastus L2
UPDATE product_category SET parent_category_id='pcat_12fish', mpath='pcat_v4_l12.pcat_12fish.pcat_t3f_1_28', handle='v4-sport-magnetkalastuse-komplektid', rank=5 WHERE id='pcat_t3f_1_28';

-- SAMM 2: Telgid (56) split (L2 pcat_v4_l12_5)
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_12t1','Auto- & katusetelgid','v4-sport-auto-katusetelgid','pcat_v4_l12.pcat_v4_l12_5.pcat_12t1','pcat_v4_l12_5',10,true,false),
 ('pcat_12t2','Mull- & sporditelgid','v4-sport-mull-sporditelgid','pcat_v4_l12.pcat_v4_l12_5.pcat_12t2','pcat_v4_l12_5',11,true,false),
 ('pcat_12t3','Bell- & glämpingtelgid','v4-sport-bell-glampingtelgid','pcat_v4_l12.pcat_v4_l12_5.pcat_12t3','pcat_v4_l12_5',12,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_12t1',3,'active','manual',true,0),('pcat_12t2',3,'active','manual',true,0),('pcat_12t3',3,'active','manual',true,0);
-- 1. AUTO
UPDATE product_category_product SET product_category_id='pcat_12t1' WHERE product_category_id='pcat_el_12x5_1' AND product_id IN (
  SELECT id FROM product WHERE title ~* 'rooftop|roof top|roof tent|truck bed|truck tent|suv tent|car tent|vehicle tent|inflatable suv|car awning|awning tent');
-- 2. MULL/sport
UPDATE product_category_product SET product_category_id='pcat_12t2' WHERE product_category_id='pcat_el_12x5_1' AND product_id IN (
  SELECT id FROM product WHERE title ~* 'bubble tent|clear bubble|sports tent');
-- 3. BELL (v.a täispuhutavad matkatelgid)
UPDATE product_category_product SET product_category_id='pcat_12t3' WHERE product_category_id='pcat_el_12x5_1' AND product_id IN (
  SELECT id FROM product WHERE title ~* 'bell tent|yurt|canvas tent|tipi|teepee|hot tent|glamping' AND title !~* 'inflatable tents for camping');
-- jääk -> Matkatelgid
UPDATE product_category SET name='Matkatelgid', handle='v4-sport-matkatelgid' WHERE id='pcat_el_12x5_1';

-- SAMM 3: Treeningmatid (44) split (L2 pcat_v4_l12_3)
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_12m1','Air-track & võimlemismatid','v4-sport-air-track-voimlemismatid','pcat_v4_l12.pcat_v4_l12_3.pcat_12m1','pcat_v4_l12_3',10,true,false),
 ('pcat_12m2','Gym-põrandaplaadid & -kaitse','v4-sport-gym-porandaplaadid-kaitse','pcat_v4_l12.pcat_v4_l12_3.pcat_12m2','pcat_v4_l12_3',11,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_12m1',3,'active','manual',true,0),('pcat_12m2',3,'active','manual',true,0);
-- air-track
UPDATE product_category_product SET product_category_id='pcat_12m1' WHERE product_category_id='pcat_el_12x3_11' AND product_id IN (
  SELECT id FROM product WHERE title ~* 'air track|airtrack|air-track|tumbling|gymnastic');
-- põrandaplaadid (v.a jooga/exercise)
UPDATE product_category_product SET product_category_id='pcat_12m2' WHERE product_category_id='pcat_el_12x3_11' AND product_id IN (
  SELECT id FROM product WHERE title ~* 'floor tile|gym floor|garage floor|interlocking|puzzle mat|eva foam|floor protect' AND title !~* 'yoga|exercise mat|pilates|workout mat');
-- jääk -> Jooga- & treeningmatid
UPDATE product_category SET name='Jooga- & treeningmatid', handle='v4-sport-jooga-treeningmatid' WHERE id='pcat_el_12x3_11';
COMMIT;
