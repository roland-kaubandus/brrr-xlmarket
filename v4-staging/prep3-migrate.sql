-- #5 Prep L3: mikserid split (köögi/sau/blender); milkshake+mahlapressid -> Joogiseadmed
-- 2026-07-04 · STAGING taxonomy-v4 · LUKK 3
BEGIN;

-- 1. Repurpose mikser-L3 -> "Köögi- ja taignamikserid" (11 Stand/Food/Dough jäävad)
UPDATE product_category
   SET name='Köögi- ja taignamikserid', handle='v4-suurkook-koogi-taignamikserid'
 WHERE id='pcat_ks_5x1_12';

-- 2. UUED L3: Saumikserid (prep) + Blenderid & smuutimasinad (Joogiseadmed)
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_5n26','Saumikserid','v4-suurkook-saumikserid','pcat_v4_l5.pcat_5prep.pcat_5n26','pcat_5prep',30,true,false),
 ('pcat_5n27','Blenderid & smuutimasinad','v4-suurkook-blenderid-smuutimasinad','pcat_v4_l5.pcat_5jook.pcat_5n27','pcat_5jook',8,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_5n26',3,'active','manual',true,0),
 ('pcat_5n27',3,'active','manual',true,0);

-- 3. SKU-liigutused mikserist
CREATE TEMP TABLE _mv(vsku text, src text, dst text) ON COMMIT DROP;
INSERT INTO _mv VALUES
 -- 10 Immersion Blender -> Saumikserid (pcat_5n26)
 ('ZXSCJBQ350WBTBCTVV2','pcat_ks_5x1_12','pcat_5n26'),
 ('ZXSCJBQ350WBFMXPAV2','pcat_ks_5x1_12','pcat_5n26'),
 ('ZXSCJBQ350WB371FZV2','pcat_ks_5x1_12','pcat_5n26'),
 ('ZXSCJBQ350WBSWKAHV2','pcat_ks_5x1_12','pcat_5n26'),
 ('ZXSCJBQYCBSDJF3WGV2','pcat_ks_5x1_12','pcat_5n26'),
 ('ZXSCJBQYCBSDJYFXLV2','pcat_ks_5x1_12','pcat_5n26'),
 ('ZXSCJBQ500WBHM0FZV2','pcat_ks_5x1_12','pcat_5n26'),
 ('ZXSCJBQYCBSDJVG6KV2','pcat_ks_5x1_12','pcat_5n26'),
 ('ZXSCJBQYCBSDJM9WCV2','pcat_ks_5x1_12','pcat_5n26'),
 ('ZXSCJBQYCBSDJJDGJV2','pcat_ks_5x1_12','pcat_5n26'),
 -- 3 Commercial Countertop Blender -> Blenderid & smuutimasinad (pcat_5n27, Joogiseadmed)
 ('TSSBJ20L1600W4DTQV2','pcat_ks_5x1_12','pcat_5n27'),
 ('TSSBJ20L1600WCAX2V2','pcat_ks_5x1_12','pcat_5n27'),
 ('TSSBJ20L1400WO5FOV2','pcat_ks_5x1_12','pcat_5n27'),
 -- 3 Milkshake Maker -> Joogiseadmed "Piimakokteili- ja milkshake-masinad" (pcat_ks_5x1_13)
 ('SBNCYYJ35075BWBQ4V2','pcat_ks_5x1_12','pcat_ks_5x1_13'),
 ('DTNXJHABS375WK7HDV2','pcat_ks_5x1_12','pcat_ks_5x1_13'),
 ('STNXJHABS375WDQUWV2','pcat_ks_5x1_12','pcat_ks_5x1_13');

DELETE FROM product_category_product a
 USING product p JOIN _mv ON p.metadata->>'vevor_sku'=_mv.vsku
 WHERE a.product_id=p.id AND a.product_category_id=_mv.src;

INSERT INTO product_category_product (product_id, product_category_id)
SELECT DISTINCT p.id, _mv.dst FROM product p JOIN _mv ON p.metadata->>'vevor_sku'=_mv.vsku
 ON CONFLICT DO NOTHING;

-- 4. MAHLAPRESSID reparent: prep -> Joogiseadmed (kogu L3, sisu=juicer'id)
UPDATE product_category
   SET parent_category_id='pcat_5jook',
       mpath='pcat_v4_l5.pcat_5jook.pcat_ks_5x1_17',
       handle='v4-suurkook-jook-mahlapressid',
       rank=9
 WHERE id='pcat_ks_5x1_17';

COMMIT;
