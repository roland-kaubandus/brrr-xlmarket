-- #5 Joogiseadmed L1: Joogidispenserid grab-bag split (peo / jahutusega / termos)
-- 2026-07-04 · STAGING taxonomy-v4 · repurpose vana id -> Peo (27 jäävad) + 2 uut L3
BEGIN;

-- 1. Repurpose "Joogidispenserid" (pcat_ks_5x2_2) -> "Peo- & serveerimisdispenserid" (27 PEO jäävad kohale)
UPDATE product_category
   SET name   = 'Peo- & serveerimisdispenserid',
       handle = 'v4-suurkook-peo-serveerimisdispenserid'
 WHERE id = 'pcat_ks_5x2_2';

-- 2. Loo 2 uut L3
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_5n20','Jahutusega joogidispenserid','v4-suurkook-jahutusega-joogidispenserid','pcat_v4_l5.pcat_5jook.pcat_5n20','pcat_5jook',6,true,false),
 ('pcat_5n21','Termos-joogidispenserid','v4-suurkook-termos-joogidispenserid','pcat_v4_l5.pcat_5jook.pcat_5n21','pcat_5jook',7,true,false);

INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_5n20',3,'active','manual',true,0),
 ('pcat_5n21',3,'active','manual',true,0);

-- 3. Liiguta SKU järgi (JAHUTUS 13 -> pcat_5n20, TERMOS 11 -> pcat_5n21)
CREATE TEMP TABLE _mv(vsku text, dst text) ON COMMIT DROP;
INSERT INTO _mv VALUES
 ('SYYLJJBSJXS1AOADUV2','pcat_5n20'),('SYYLJJBSJXS1TJCUTV2','pcat_5n20'),
 ('SYYLJJBSJXS1LN0XAV2','pcat_5n20'),('SYYLJJBSJXS1NR5MHV2','pcat_5n20'),
 ('SYYLJJBSJXS172LLCV2','pcat_5n20'),('SYYLJJBSJXS1DZ47WV2','pcat_5n20'),
 ('SYYLJJBSJXS1AAIQKV2','pcat_5n20'),('SYYLJJBSJXS1XCB5NV2','pcat_5n20'),
 ('SYYLJJBSJXS1VGEIJV2','pcat_5n20'),('SYYLJJBSJXS1YI25UV2','pcat_5n20'),
 ('YLJ2G24LYSJ12X201V2','pcat_5n20'),('YLJ3G36LYSJ12X301V2','pcat_5n20'),
 ('YLHLQQZXK4GAV8TCQ001V0','pcat_5n20'),
 ('YLHLQQFX5JL08WNJSV0','pcat_5n21'),('YLHLQQYXKHS33IT25001V0','pcat_5n21'),
 ('YLHLQQFX10JL0JHFAV0','pcat_5n21'),('YLHLQQHS5JLFVR6ST001V0','pcat_5n21'),
 ('YLHLQQZS5JLFCHL91001V0','pcat_5n21'),('YLHLQQYXKHS81CX2R001V0','pcat_5n21'),
 ('YLHLQQFX25GAUQGS8V0','pcat_5n21'),('YLHLQQYX8L00TYE16V0','pcat_5n21'),
 ('YLHLQQYX10L0ZNM43V0','pcat_5n21'),('YLHLQQYX12L0TQWXUV0','pcat_5n21'),
 ('YLHLQQYX5JL0EEU4SV0','pcat_5n21');

-- eemalda allikast
DELETE FROM product_category_product
 WHERE product_category_id = 'pcat_ks_5x2_2'
   AND product_id IN (SELECT p.id FROM product p JOIN _mv ON p.metadata->>'vevor_sku' = _mv.vsku);

-- lisa sihti (dup-guard)
INSERT INTO product_category_product (product_id, product_category_id)
SELECT DISTINCT p.id, _mv.dst FROM product p JOIN _mv ON p.metadata->>'vevor_sku' = _mv.vsku
 ON CONFLICT DO NOTHING;

COMMIT;
