-- L1-orb-paigutus: 174 orbu -> L3-kodud; uued L2 Liikluskorraldus/Keraamika/Postkastid
-- 2026-07-04 · STAGING taxonomy-v4 · sisu (title_en) otsustab iga toote
BEGIN;
-- ========== UUED L2 + L3 ==========
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_9traf','Liikluskorraldus & teeohutus','v4-ehitus-liikluskorraldus-teeohutus','pcat_v4_l9.pcat_9traf','pcat_v4_l9',17,true,false),
 ('pcat_9traf1','Liikluskoonused & delineaatorpostid','v4-ehitus-liikluskoonused-delineaatorpostid','pcat_v4_l9.pcat_9traf.pcat_9traf1','pcat_9traf',1,true,false),
 ('pcat_9traf2','Liiklusbarjäärid, bollardid & tõkked','v4-ehitus-liiklusbarjaarid-bollardid-tokked','pcat_v4_l9.pcat_9traf.pcat_9traf2','pcat_9traf',2,true,false),
 ('pcat_12cer','Keraamika & pottsepatöö','v4-sport-keraamika-pottsepatoo','pcat_v4_l12.pcat_12cer','pcat_v4_l12',18,true,false),
 ('pcat_12cer1','Pottsepakettad & keraamikarattad','v4-sport-pottsepakettad-keraamikarattad','pcat_v4_l12.pcat_12cer.pcat_12cer1','pcat_12cer',1,true,false),
 ('pcat_6mail','Postkastid & pakiautomaadid','v4-moobel-postkastid-pakiautomaadid','pcat_v4_l6.pcat_6mail','pcat_v4_l6',17,true,false),
 ('pcat_6mail1','Postkastid & pakikastid','v4-moobel-postkastid-pakikastid','pcat_v4_l6.pcat_6mail.pcat_6mail1','pcat_6mail',1,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_9traf',2,'active','manual',true,0),('pcat_9traf1',3,'active','manual',true,0),('pcat_9traf2',3,'active','manual',true,0),
 ('pcat_12cer',2,'active','manual',true,0),('pcat_12cer1',3,'active','manual',true,0),
 ('pcat_6mail',2,'active','manual',true,0),('pcat_6mail1',3,'active','manual',true,0);

-- ========== #9 (59) ==========
-- traffic koonused/delineaatorid
UPDATE product_category_product SET product_category_id='pcat_9traf1' WHERE product_category_id='pcat_v4_l9' AND product_id IN (SELECT id FROM product WHERE title ~* 'delineator|traffic cone|safety cone|traffic post|traffic delineator');
-- traffic barjäärid/bollardid/tõkked
UPDATE product_category_product SET product_category_id='pcat_9traf2' WHERE product_category_id='pcat_v4_l9' AND product_id IN (SELECT id FROM product WHERE title ~* 'barrier|bollard|crowd control|stanchion|guardrail|guard rail|parking lock|parking barrier|parking post|speed bump|speed hump|wheel stop');
-- strapping-masinad -> #1 Pakkimis- & sidumismasinad
UPDATE product_category_product SET product_category_id='pcat_1pack' WHERE product_category_id='pcat_v4_l9' AND product_id IN (SELECT id FROM product WHERE title ~* 'strapping machine');
-- strapping-tarvikud (banding kit/tool) -> #1 Pakkimis- ja köitmistarvikud
UPDATE product_category_product SET product_category_id='pcat_th1_3' WHERE product_category_id='pcat_v4_l9' AND product_id IN (SELECT id FROM product WHERE title ~* 'banding|strapping tool|strapping kit');
-- turva-kääruksed -> #9 Turvavõred & kokkupandavad väravad
UPDATE product_category_product SET product_category_id='pcat_9turvv' WHERE product_category_id='pcat_v4_l9' AND product_id IN (SELECT id FROM product WHERE title ~* 'security gate|scissor gate|folding.*gate');

-- ========== #13 (48) ==========
UPDATE product_category_product SET product_category_id='pcat_1pack' WHERE product_category_id='pcat_v4_l13' AND product_id IN (SELECT id FROM product WHERE title ~* 'strapping machine|carton closing stapler|tape dispenser|zcut');
UPDATE product_category_product SET product_category_id='pcat_th1_3' WHERE product_category_id='pcat_v4_l13' AND product_id IN (SELECT id FROM product WHERE title ~* 'strapping|banding|packing tape');
UPDATE product_category_product SET product_category_id='pcat_ks_5x7_2' WHERE product_category_id='pcat_v4_l13' AND product_id IN (SELECT id FROM product WHERE title ~* 'liquid filling machine');
UPDATE product_category_product SET product_category_id='pcat_12cer1' WHERE product_category_id='pcat_v4_l13' AND product_id IN (SELECT id FROM product WHERE title ~* 'pottery wheel|ceramic wheel');
UPDATE product_category_product SET product_category_id='pcat_f4_13xtex_13' WHERE product_category_id='pcat_v4_l13' AND product_id IN (SELECT id FROM product WHERE title ~* 'fabric cutter|fabric cutting');
UPDATE product_category_product SET product_category_id='pcat_13craft' WHERE product_category_id='pcat_v4_l13' AND product_id IN (SELECT id FROM product WHERE title ~* 'leather working|leather craft|wood burning|wax melter|foam cut|rock tumbler|coin ring|induction heater');

-- ========== #12 (34) ==========
UPDATE product_category_product SET product_category_id='pcat_12cer1' WHERE product_category_id='pcat_v4_l12' AND product_id IN (SELECT id FROM product WHERE title ~* 'pottery|ceramic wheel|potter|keraamika|pottsepa');

-- ========== #6 (14) ==========
UPDATE product_category_product SET product_category_id='pcat_6mail1' WHERE product_category_id='pcat_v4_l6' AND product_id IN (SELECT id FROM product WHERE title ~* 'mailbox|package delivery box|drop box');
UPDATE product_category_product SET product_category_id='pcat_mv_6x1_24' WHERE product_category_id='pcat_v4_l6' AND product_id IN (SELECT id FROM product WHERE title ~* 'caster');

-- ========== #7 (6) ==========
UPDATE product_category_product SET product_category_id='pcat_1surv2' WHERE product_category_id='pcat_v4_l7' AND product_id IN (SELECT id FROM product WHERE title ~* 'pressure washer pump');
UPDATE product_category_product SET product_category_id='pcat_1surv1' WHERE product_category_id='pcat_v4_l7' AND product_id IN (SELECT id FROM product WHERE title ~* 'pressure washer wand|telescoping.*wand');

-- ========== #8 (6) ==========
UPDATE product_category_product SET product_category_id='pcat_mv_8x4_2' WHERE product_category_id='pcat_v4_l8' AND product_id IN (SELECT id FROM product WHERE title ~* 'crop cage|indoor greenhouse|grow tent|plant protection|plant tent');

-- ========== #11 (6) ==========
UPDATE product_category_product SET product_category_id='pcat_kt1' WHERE product_category_id='pcat_v4_l11' AND product_id IN (SELECT id FROM product WHERE title ~* 'wire strip|stripping machine');
UPDATE product_category_product SET product_category_id='pcat_t3f_8_16' WHERE product_category_id='pcat_v4_l11' AND product_id IN (SELECT id FROM product WHERE title ~* 'thermal camera|thermal imager|infrared thermal');
UPDATE product_category_product SET product_category_id='pcat_t3f_5_12' WHERE product_category_id='pcat_v4_l11' AND product_id IN (SELECT id FROM product WHERE title ~* 'infrared thermometer');
COMMIT;
