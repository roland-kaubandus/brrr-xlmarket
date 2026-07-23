-- #3 auto-elekter L1: uus Autoaudio L2 (carve Salongitarvikutest)
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_3audio','Autoaudio','v4-autovaruosad-autoaudio','pcat_v4_l3.pcat_3audio','pcat_v4_l3',12,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_3audio',2,'active','manual',true,0);
-- reparent 4 audio-L3 (2 rename)
UPDATE product_category SET parent_category_id='pcat_3audio', mpath='pcat_v4_l3.pcat_3audio.pcat_ag2_3x6_2' WHERE id='pcat_ag2_3x6_2';
UPDATE product_category SET parent_category_id='pcat_3audio', mpath='pcat_v4_l3.pcat_3audio.pcat_ag2_3x6_3', name='Autokõlarid & bassikõlarid', handle='v4-autovaruosad-autokolarid-bassikolarid' WHERE id='pcat_ag2_3x6_3';
UPDATE product_category SET parent_category_id='pcat_3audio', mpath='pcat_v4_l3.pcat_3audio.pcat_ag2_3x6_9', name='Multimeediaseadmed', handle='v4-autovaruosad-multimeediaseadmed' WHERE id='pcat_ag2_3x6_9';
UPDATE product_category SET parent_category_id='pcat_3audio', mpath='pcat_v4_l3.pcat_3audio.pcat_ag2_3x6_7' WHERE id='pcat_ag2_3x6_7';
COMMIT;
