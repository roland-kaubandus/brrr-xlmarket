-- Sweep FAAS 3d: Kuumaseadmed restruktuur — 3 uut L2 (Kohvi/Ventilatsioon/Popkorni-suhkruvati)
-- 2026-07-04 · STAGING taxonomy-v4
BEGIN;

-- 3 UUT L2
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_5kohv','Kohviseadmed','v4-suurkook-kohviseadmed','pcat_v4_l5.pcat_5kohv','pcat_v4_l5',13,true,false),
 ('pcat_5vent','Ventilatsioon & tõmbekubud','v4-suurkook-ventilatsioon-tombekubud','pcat_v4_l5.pcat_5vent','pcat_v4_l5',14,true,false),
 ('pcat_5snack','Popkorni- ja suhkruvatimasinad','v4-suurkook-popkorni-ja-suhkruvatimasinad','pcat_v4_l5.pcat_5snack','pcat_v4_l5',15,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_5kohv',2,'active','manual',true,0),('pcat_5vent',2,'active','manual',true,0),('pcat_5snack',2,'active','manual',true,0);

-- SAMM 1: Kohviseadmed (3 L3 reparent)
UPDATE product_category SET parent_category_id='pcat_5kohv', mpath='pcat_v4_l5.pcat_5kohv.pcat_ks_5x2_21' WHERE id='pcat_ks_5x2_21';
UPDATE product_category SET parent_category_id='pcat_5kohv', mpath='pcat_v4_l5.pcat_5kohv.pcat_ks_5x1_22' WHERE id='pcat_ks_5x1_22';
UPDATE product_category SET parent_category_id='pcat_5kohv', mpath='pcat_v4_l5.pcat_5kohv.pcat_5barista'   WHERE id='pcat_5barista';

-- SAMM 2: Ventilatsioon
UPDATE product_category SET parent_category_id='pcat_5vent', mpath='pcat_v4_l5.pcat_5vent.pcat_5n7' WHERE id='pcat_5n7';

-- SAMM 3: Popkorni- ja suhkruvatimasinad
UPDATE product_category SET parent_category_id='pcat_5snack', mpath='pcat_v4_l5.pcat_5snack.pcat_ks_5x1_11' WHERE id='pcat_ks_5x1_11';
UPDATE product_category SET parent_category_id='pcat_5snack', mpath='pcat_v4_l5.pcat_5snack.pcat_ks_5x1_1',
       name='Suhkruvatimasinad', handle='v4-suurkook-suhkruvatimasinad' WHERE id='pcat_ks_5x1_1';
-- uus katted-L3 + 2 standalone katet
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_5n32','Suhkruvatimasinate katted & tarvikud','v4-suurkook-suhkruvatimasinate-katted','pcat_v4_l5.pcat_5snack.pcat_5n32','pcat_5snack',3,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_5n32',3,'active','manual',true,0);
UPDATE product_category_product SET product_category_id='pcat_5n32'
 WHERE product_category_id='pcat_ks_5x1_1' AND product_id IN (
   SELECT p.id FROM product p WHERE p.metadata->>'vevor_sku' IN ('MHTJGZ00000000001V0','MHTGZYKL38CMT71SL001V0'));

COMMIT;
