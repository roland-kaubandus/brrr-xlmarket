-- Sweep FAAS 3c SAMM 1: #5 uus L2 "Restorani-tehnika"
BEGIN;
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_5rest','Restorani-tehnika','v4-suurkook-restorani-tehnika','pcat_v4_l5.pcat_5rest','pcat_v4_l5',12,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_5rest',2,'active','manual',true,0);
UPDATE product_category SET parent_category_id='pcat_5rest', mpath='pcat_v4_l5.pcat_5rest.pcat_5n16' WHERE id='pcat_5n16';
UPDATE product_category SET parent_category_id='pcat_5rest', mpath='pcat_v4_l5.pcat_5rest.pcat_5n17' WHERE id='pcat_5n17';
COMMIT;
