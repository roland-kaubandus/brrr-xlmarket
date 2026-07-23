-- Suur üle-käik FAAS 1: duplikaat-kategooriate liitmised
BEGIN;
-- Helper-muster: tooted SRC->DST, meta kustut, L3 soft-delete
-- M1 #3 Astumistrepid(5) -> Astmelauad ja astmed(7)
UPDATE product_category_product SET product_category_id='pcat_vt_8' WHERE product_category_id='pcat_ag2_3x1_16';
-- M2 #3 Haagise teisaldus-ja liigutuskärud(5) + Haagise liigutajad(3) -> Haagise teisalduskärud
UPDATE product_category_product SET product_category_id='pcat_3dolly' WHERE product_category_id IN ('pcat_ag2_3x1_12','pcat_ag2_3x5_14');
-- M3 #9 Trosspiirde postid(8) + Trepikäsipuu postid(14) -> Kaabelpiirde postid(11)
UPDATE product_category_product SET product_category_id='pcat_es_9x5_7' WHERE product_category_id IN ('pcat_es_9x5_6','pcat_es_9x5_4');
-- M4 #2 Kaasaskantavad kütusepaagid(8) -> Kütusemahutid ratastega(14)
UPDATE product_category_product SET product_category_id='pcat_ag2_2x4_2' WHERE product_category_id='pcat_ag2_2x4_3';
-- M5 #2 Rattakärud ja teisaldus(3) -> Rattadollyd(8)
UPDATE product_category_product SET product_category_id='pcat_ag2_2x3_9' WHERE product_category_id='pcat_ag2_2x1_20';
-- M6 #2 Õlivahetusanumad(4) -> Õlivahetuspannid(11)
UPDATE product_category_product SET product_category_id='pcat_ag2_2x4_6' WHERE product_category_id='pcat_ag2_2x4_7';
-- M7 #2 Värvimis-kuivatuskabiinid(3) -> Värvimiskabiinid ja -telgid(48)
UPDATE product_category_product SET product_category_id='pcat_vk2' WHERE product_category_id='pcat_ag2_2x4_13';
-- M8 #1 Jaotus-pöördlauad(3) -> Jaotuslauad ja jagamispead(5)
UPDATE product_category_product SET product_category_id='pcat_t3f_6_8' WHERE product_category_id='pcat_t3f_5_4';
-- M9 #1 Avade mulgustajad(2) -> Hüdraulilised mulgustus(7)
UPDATE product_category_product SET product_category_id='pcat_t3f_6_6' WHERE product_category_id='pcat_t3f_1_32';
-- M10 #1 Elektromagnetvälja(1) -> Keskkonna-mõõturid(10)
UPDATE product_category_product SET product_category_id='pcat_11env' WHERE product_category_id='pcat_t3f_8_19';
-- M11 #1 Ristsuportlauad(1) -> Treilauad ja töölauad(2)
UPDATE product_category_product SET product_category_id='pcat_t3f_9_21' WHERE product_category_id='pcat_t3f_6_17';
-- M12 #16 Meditsiinilised kärud ja alused(2) -> Meditsiinikärud ja -lauad(12)
UPDATE product_category_product SET product_category_id='pcat_mv_6x4_9' WHERE product_category_id='pcat_f4_16x2_13';
-- M13 #8 Pergola katted(4) -> Paviljoni ja gasebo talvekatted(4)
UPDATE product_category_product SET product_category_id='pcat_mv_8x1_10' WHERE product_category_id='pcat_mv_8x1_6';
-- M14 #14 Väliskassimajad(7) -> Kassimajad(14)
UPDATE product_category_product SET product_category_id='pcat_lp_4_2' WHERE product_category_id='pcat_lp_4_3';

-- kustuta tühjaks jäänud 16 L3
DELETE FROM taxonomy_node_meta WHERE node_id IN ('pcat_ag2_3x1_16','pcat_ag2_3x1_12','pcat_ag2_3x5_14','pcat_es_9x5_6','pcat_es_9x5_4','pcat_ag2_2x4_3','pcat_ag2_2x1_20','pcat_ag2_2x4_7','pcat_ag2_2x4_13','pcat_t3f_5_4','pcat_t3f_1_32','pcat_t3f_8_19','pcat_t3f_6_17','pcat_f4_16x2_13','pcat_mv_8x1_6','pcat_lp_4_3');
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id IN ('pcat_ag2_3x1_16','pcat_ag2_3x1_12','pcat_ag2_3x5_14','pcat_es_9x5_6','pcat_es_9x5_4','pcat_ag2_2x4_3','pcat_ag2_2x1_20','pcat_ag2_2x4_7','pcat_ag2_2x4_13','pcat_t3f_5_4','pcat_t3f_1_32','pcat_t3f_8_19','pcat_t3f_6_17','pcat_f4_16x2_13','pcat_mv_8x1_6','pcat_lp_4_3');

-- PRODUCT-MOVE dedup (jäta mõlemad L3):
-- P1 #1 Torpedo-loodud Nivelliiritest -> Vesiloodid
UPDATE product_category_product SET product_category_id='pcat_t3f_8_5'
  WHERE product_category_id='pcat_t3f_8_1' AND product_id IN (SELECT id FROM product WHERE title ~* 'torpedo');
-- P2 #1 Teemant-augusaed Augusaest -> Teemantpuurkroonid
UPDATE product_category_product SET product_category_id='pcat_t3f_9_4'
  WHERE product_category_id='pcat_t3f_9_10' AND product_id IN (SELECT id FROM product WHERE title ~* 'diamond');
COMMIT;
