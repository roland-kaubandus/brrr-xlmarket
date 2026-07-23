-- #5 Prep L2: viilutajate koond (liha/köögivilja/juust/leib); friikartul-dup merge
-- 2026-07-04 · STAGING taxonomy-v4 · LUKK 2
BEGIN;

-- 1. UUED L3: Juustulõikurid + Leivalõikurid
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_5n24','Juustulõikurid','v4-suurkook-juustuloikurid','pcat_v4_l5.pcat_5prep.pcat_5n24','pcat_5prep',28,true,false),
 ('pcat_5n25','Leivalõikurid','v4-suurkook-leivaloikurid','pcat_v4_l5.pcat_5prep.pcat_5n25','pcat_5prep',29,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_5n24',3,'active','manual',true,0),
 ('pcat_5n25',3,'active','manual',true,0);

-- 2. SKU-liigutused (viilutaja-sorteering)
CREATE TEMP TABLE _mv(vsku text, src text, dst text) ON COMMIT DROP;
INSERT INTO _mv VALUES
 -- Lihalõikurid (pcat_ks_5x1_6): 2 Electric Vegetable Slicer -> Köögivilja viilutajad
 ('DDSCQPJBXG133TSLKV2','pcat_ks_5x1_6','pcat_ks_5x2_5'),
 ('DDSCQPJBXG00D1ME3V2','pcat_ks_5x1_6','pcat_ks_5x2_5'),
 -- Lihalõikurid: 2 Food Processor & Veg Chopper + 1 Machabeau disk-cutter -> Toiduprotsessorid
 ('DGNSCJ750WBYOSVGSV2','pcat_ks_5x1_6','pcat_ks_5x1_34'),
 ('DGNSCJ550WMYE68N9V2','pcat_ks_5x1_6','pcat_ks_5x1_34'),
 ('QCJJKC-30050HZ001V2','pcat_ks_5x1_6','pcat_ks_5x1_34'),
 -- Köögivilja viilutajad (pcat_ks_5x2_5): 2 Cheese Cutter -> Juustulõikurid
 ('MBNLQPJBXGLHS8682V0','pcat_ks_5x2_5','pcat_5n24'),
 ('MBNLQPJBXGLHGDNRMV0','pcat_ks_5x2_5','pcat_5n24'),
 -- Köögivilja viilutajad: 2 Bread Slicer -> Leivalõikurid
 ('SDMBQPJ67INCI4Z4N001V0','pcat_ks_5x2_5','pcat_5n25'),
 ('SDMBQPJ75INC4T7C3V0','pcat_ks_5x2_5','pcat_5n25'),
 -- Hakklihamasinad (pcat_ks_5x1_7): 1 Food Processor 16Qt (LUKK 1 FLAG) -> Toiduprotsessorid
 ('AJSQSJ15L1407FJY8V2','pcat_ks_5x1_7','pcat_ks_5x1_34');

DELETE FROM product_category_product a
 USING product p JOIN _mv ON p.metadata->>'vevor_sku'=_mv.vsku
 WHERE a.product_id=p.id AND a.product_category_id=_mv.src;

INSERT INTO product_category_product (product_id, product_category_id)
SELECT DISTINCT p.id, _mv.dst FROM product p JOIN _mv ON p.metadata->>'vevor_sku'=_mv.vsku
 ON CONFLICT DO NOTHING;

-- 3. FRIIKARTUL-DUP MERGE: Kartuli- ja friikartulilõikurid (pcat_ks_5x1_31) -> Friikartulilõikurid (pcat_ks_5x2_6)
DELETE FROM product_category_product a USING product_category_product b
 WHERE a.product_category_id='pcat_ks_5x1_31' AND b.product_category_id='pcat_ks_5x2_6' AND a.product_id=b.product_id;
UPDATE product_category_product SET product_category_id='pcat_ks_5x2_6' WHERE product_category_id='pcat_ks_5x1_31';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ks_5x1_31';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_ks_5x1_31';

COMMIT;
