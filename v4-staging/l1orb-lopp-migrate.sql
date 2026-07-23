-- L1-orb lõpetus: viimased 11 -> L3-kodud; L1-otse orb = 0
BEGIN;
-- uued L3
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_9comp','Pinnasetihendajad','v4-ehitus-pinnasetihendajad','pcat_v4_l9.pcat_v4_l9_11.pcat_9comp','pcat_v4_l9_11',7,true,false),
 ('pcat_6ash','Välis-tuhatoosid & prügikastid','v4-moobel-valis-tuhatoosid-prugikastid','pcat_v4_l6.pcat_v4_l6_1.pcat_6ash','pcat_v4_l6_1',10,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_9comp',3,'active','manual',true,0),('pcat_6ash',3,'active','manual',true,0);
-- 1. Ostukorvid -> #1 Ostukärud & -korvid
UPDATE product_category_product SET product_category_id='pcat_1ostu' WHERE product_category_id='pcat_v4_l13' AND product_id IN (SELECT id FROM product WHERE title ~* 'shopping basket');
-- 2. Wire Spool Rack -> #1 Kaablitõmbelindid & -tõmburid
UPDATE product_category_product SET product_category_id='pcat_1cab1' WHERE product_category_id='pcat_v4_l11' AND product_id IN (SELECT id FROM product WHERE title ~* 'wire spool rack');
-- 3. Plate Compactor -> uus #9 Pinnasetihendajad
UPDATE product_category_product SET product_category_id='pcat_9comp' WHERE product_category_id='pcat_v4_l9' AND product_id IN (SELECT id FROM product WHERE title ~* 'plate compactor');
-- 4. Sigaretikonteinerid -> uus #6 Välis-tuhatoosid & prügikastid
UPDATE product_category_product SET product_category_id='pcat_6ash' WHERE product_category_id IN ('pcat_v4_l9','pcat_v4_l13') AND product_id IN (SELECT id FROM product WHERE title ~* 'cigarette butt|cigarette receptacle');
COMMIT;
