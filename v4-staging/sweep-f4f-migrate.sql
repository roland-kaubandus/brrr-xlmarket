-- Sweep FAAS 4f: #14 Kassipuud + #6 Väljatõmmatavad korraldajad grab-bag split
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;
-- ===== SAMM 1: #14 Kassipuud (29) split (L2 pcat_v4_l14_6) =====
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_14cat1','Kassi seinariiulid','v4-lemmikloomad-kassi-seinariiulid','pcat_v4_l14.pcat_v4_l14_6.pcat_14cat1','pcat_v4_l14_6',5,true,false),
 ('pcat_14cat2','Kassipuurid & -aedikud','v4-lemmikloomad-kassipuurid-aedikud','pcat_v4_l14.pcat_v4_l14_6.pcat_14cat2','pcat_v4_l14_6',6,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_14cat1',3,'active','manual',true,0),('pcat_14cat2',3,'active','manual',true,0);
-- seinariiulid
UPDATE product_category_product SET product_category_id='pcat_14cat1' WHERE product_category_id='pcat_lp_6_dedup' AND product_id IN (
  SELECT id FROM product WHERE title ~* 'wall shelf|wall-mounted|wall mounted|cat shelf|floating');
-- puurid/catio
UPDATE product_category_product SET product_category_id='pcat_14cat2' WHERE product_category_id='pcat_lp_6_dedup' AND product_id IN (
  SELECT id FROM product WHERE title ~* 'cat cage|catio|cat enclosure|cat playpen|cat kennel|cat pen');
-- jääk (17 kassipuu + 1 carpet protector FLAG) -> Kassipuud (nimi jääb)

-- ===== SAMM 2: #6 Väljatõmmatavad korraldajad (40) split (L2 pcat_v4_l6_2) =====
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_6pull1','Väljatõmmatavad prügikastid','v4-moobel-valjatommatavad-prugikastid','pcat_v4_l6.pcat_v4_l6_2.pcat_6pull1','pcat_v4_l6_2',10,true,false),
 ('pcat_6pull2','Nurgakapi-organiserid','v4-moobel-nurgakapi-organiserid','pcat_v4_l6.pcat_v4_l6_2.pcat_6pull2','pcat_v4_l6_2',11,true,false),
 ('pcat_6pull3','Ukse-organiserid & sahvririiulid','v4-moobel-ukse-organiserid-sahvririiulid','pcat_v4_l6.pcat_v4_l6_2.pcat_6pull3','pcat_v4_l6_2',12,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_6pull1',3,'active','manual',true,0),('pcat_6pull2',3,'active','manual',true,0),('pcat_6pull3',3,'active','manual',true,0);
-- prügikastid
UPDATE product_category_product SET product_category_id='pcat_6pull1' WHERE product_category_id='pcat_mv_6_pull' AND product_id IN (
  SELECT id FROM product WHERE title ~* 'trash|waste bin|garbage|recycl|rubbish');
-- nurgakapi
UPDATE product_category_product SET product_category_id='pcat_6pull2' WHERE product_category_id='pcat_mv_6_pull' AND product_id IN (
  SELECT id FROM product WHERE title ~* 'blind corner|lazy susan|corner cabinet|corner organizer');
-- ukse-organiserid (v.a pull-out)
UPDATE product_category_product SET product_category_id='pcat_6pull3' WHERE product_category_id='pcat_mv_6_pull' AND product_id IN (
  SELECT id FROM product WHERE title ~* 'over.door|over the door|door rack|hanging organizer' AND title !~* 'pull out|pull-out|slide out');
-- jääk (19 pull-out kapiorganiser) -> rename "Väljatõmmatavad kapiorganiserid"
UPDATE product_category SET name='Väljatõmmatavad kapiorganiserid', handle='v4-moobel-valjatommatavad-kapiorganiserid' WHERE id='pcat_mv_6_pull';
COMMIT;
