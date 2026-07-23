-- #3 auto-elekter L3: uus Auto elektritarvikud L2 (inverterid/signaalid/alarm/kaamerad/valgustus)
-- 2026-07-04 · STAGING taxonomy-v4 · TÖÖVERSIOON-nimed
BEGIN;
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_3elt','Auto elektritarvikud','v4-autovaruosad-auto-elektritarvikud','pcat_v4_l3.pcat_3elt','pcat_v4_l3',13,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_3elt',2,'active','manual',true,0);
-- reparent 6 L3
UPDATE product_category SET parent_category_id='pcat_3elt', mpath='pcat_v4_l3.pcat_3elt.pcat_ag2_3x8_3'  WHERE id='pcat_ag2_3x8_3';
UPDATE product_category SET parent_category_id='pcat_3elt', mpath='pcat_v4_l3.pcat_3elt.pcat_ag2_3x4_21' WHERE id='pcat_ag2_3x4_21';
UPDATE product_category SET parent_category_id='pcat_3elt', mpath='pcat_v4_l3.pcat_3elt.pcat_ag2_3x6_12' WHERE id='pcat_ag2_3x6_12';
UPDATE product_category SET parent_category_id='pcat_3elt', mpath='pcat_v4_l3.pcat_3elt.pcat_ag2_3x6_11' WHERE id='pcat_ag2_3x6_11';
UPDATE product_category SET parent_category_id='pcat_3elt', mpath='pcat_v4_l3.pcat_3elt.pcat_3far'       WHERE id='pcat_3far';
-- valgustus reparent + rename
UPDATE product_category SET parent_category_id='pcat_3elt', mpath='pcat_v4_l3.pcat_3elt.pcat_vt_5', name='Autovalgustus & LED-tuled', handle='v4-autovaruosad-autovalgustus-led-tuled' WHERE id='pcat_vt_5';
COMMIT;
