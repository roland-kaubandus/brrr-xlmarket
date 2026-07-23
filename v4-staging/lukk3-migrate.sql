-- Grab-bag lukk 3: sihid-olemas grupp
BEGIN;
-- SAMM 1: #12 Hüdratatsiooni- ja seljakotid split
UPDATE product_category_product SET product_category_id='pcat_el_12x5_12'
  WHERE product_category_id='pcat_el_12x5_5' AND product_id IN (SELECT id FROM product WHERE title ~* 'picnic backpack');
UPDATE product_category_product SET product_category_id='pcat_el_12x6_4'
  WHERE product_category_id='pcat_el_12x5_5' AND product_id IN (SELECT id FROM product WHERE title ~* 'tactical backpack|tactical duffle|tactical sling');
UPDATE product_category_product SET product_category_id='pcat_el_12x12_3'
  WHERE product_category_id='pcat_el_12x5_5' AND product_id IN (SELECT id FROM product WHERE title ~* 'vacuum travel backpack|vacuum seal compression');
-- SAMM 2: #13 CNC 3018 routerid -> CNC freespingid
UPDATE product_category_product SET product_category_id='pcat_f4_13x1_4'
  WHERE product_category_id='pcat_f4_13x1_1' AND product_id IN (SELECT id FROM product WHERE title ~* 'cnc 3018');
-- SAMM 3: #2 PDR dent pullerid -> PDR (CV/tie rod/yoke/crank = FLAG, ei liiguta)
UPDATE product_category_product SET product_category_id='pcat_ag2_2x1_18'
  WHERE product_category_id='pcat_ag2_2x1_8' AND product_id IN (SELECT id FROM product WHERE title ~* 'dent puller');
-- SAMM 4: #6 Seinariiulid brackets/pilaster -> Riiulikandurid
UPDATE product_category_product SET product_category_id='pcat_mv_6x2_16'
  WHERE product_category_id='pcat_mv_6x2_2' AND product_id IN (SELECT id FROM product WHERE title ~* 'shelf bracket|shelf pilaster');
-- SAMM 5: #6 Meediakapid TV-alused -> TV-alused
UPDATE product_category_product SET product_category_id='pcat_mv_6x6_4'
  WHERE product_category_id='pcat_mv_6x6_5' AND product_id IN (SELECT id FROM product WHERE title ~* 'tv stand|tv-ständer|tv cabinet|tv-schrank');
COMMIT;
