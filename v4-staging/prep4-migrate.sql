-- #5 Prep L4: pressid split; Hot Dog->Kuum; Šawarma->Kebab rename; uus L2 Pakendamine & täitmine
-- 2026-07-04 · STAGING taxonomy-v4 · LUKK 4 (viimane) · #5 Ettevalmistus VALMIS
BEGIN;

-- ============ A. BURGERI- JA TAIGNAPRESSID (20) SPLIT ============
-- A1. Repurpose -> "Burgeripressid" (7 Patty Maker jäävad)
UPDATE product_category SET name='Burgeripressid', handle='v4-suurkook-burgeripressid' WHERE id='pcat_ks_5x2_15';

-- A2. Uued L3: Tortillapressid + Pastamasinad
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_5n28','Tortillapressid','v4-suurkook-tortillapressid','pcat_v4_l5.pcat_5prep.pcat_5n28','pcat_5prep',31,true,false),
 ('pcat_5n29','Pastamasinad','v4-suurkook-pastamasinad','pcat_v4_l5.pcat_5prep.pcat_5n29','pcat_5prep',32,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_5n28',3,'active','manual',true,0),
 ('pcat_5n29',3,'active','manual',true,0);

-- ============ D1. UUS L2 "Pakendamine & täitmine" ============
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_5pack','Pakendamine & täitmine','v4-suurkook-pakendamine-taitmine','pcat_v4_l5.pcat_5pack','pcat_v4_l5',10,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_5pack',2,'active','manual',true,0);

-- ============ SKU-liigutused (pressid + Hot Dog) ============
CREATE TEMP TABLE _mv(vsku text, src text, dst text) ON COMMIT DROP;
INSERT INTO _mv VALUES
 -- TORTILLA 4 -> pcat_5n28
 ('SYSBBYZTSD10PCND5001V0','pcat_ks_5x2_15','pcat_5n28'),
 ('SYSBBY10YCZTXI1RSV0','pcat_ks_5x2_15','pcat_5n28'),
 ('SYSBBYZTSD8Y5NKP2001V0','pcat_ks_5x2_15','pcat_5n28'),
 ('SYSBBY8YCZT0DX21YV0','pcat_ks_5x2_15','pcat_5n28'),
 -- PASTA 2 -> pcat_5n29
 ('QMJYSSSD15CMI7P7OV0','pcat_ks_5x2_15','pcat_5n29'),
 ('QMJYSFSD15CM0RP1YV0','pcat_ks_5x2_15','pcat_5n29'),
 -- PITSA 2 + TAIGEN 4 + DONUT 1 -> Pitsataigna ja taignamasinad (pcat_ks_5x1_21)
 ('SDYMJ9YCBXGSQNEGM001V0','pcat_ks_5x2_15','pcat_ks_5x1_21'),
 ('SDYMJ9YCBXGSX7AWPV0','pcat_ks_5x2_15','pcat_ks_5x1_21'),
 ('SDMTFGQLD10LYPDHQV0','pcat_ks_5x2_15','pcat_ks_5x1_21'),
 ('SDMTFGQTM18LO1RE9V0','pcat_ks_5x2_15','pcat_ks_5x1_21'),
 ('SDMTFGQLD40LQIGO0V0','pcat_ks_5x2_15','pcat_ks_5x1_21'),
 ('SDQSJTM11INCTNSEBV0','pcat_ks_5x2_15','pcat_ks_5x1_21'),
 ('TTQFPQ5L6DL0JZ8KTV0','pcat_ks_5x2_15','pcat_ks_5x1_21'),
 -- B. Hot Dog Roller -> Kuumaseadmed "Hot dog ja viineri seadmed" (pcat_ks_5x1_26)
 ('SYGDSRGJ11GF8O3OPV2','pcat_ks_5x1_18','pcat_ks_5x1_26');

DELETE FROM product_category_product a
 USING product p JOIN _mv ON p.metadata->>'vevor_sku'=_mv.vsku
 WHERE a.product_id=p.id AND a.product_category_id=_mv.src;
INSERT INTO product_category_product (product_id, product_category_id)
SELECT DISTINCT p.id, _mv.dst FROM product p JOIN _mv ON p.metadata->>'vevor_sku'=_mv.vsku
 ON CONFLICT DO NOTHING;

-- ============ C. ŠAWARMA RENAME ============
UPDATE product_category SET name='Kebabi- & šawarmanoad', handle='v4-suurkook-kebabi-shawarmanoad' WHERE id='pcat_ks_5x1_30';

-- ============ D2. 5 pakendus-L3 reparent prep -> Pakendamine & täitmine ============
UPDATE product_category SET parent_category_id='pcat_5pack', mpath='pcat_v4_l5.pcat_5pack.pcat_5n1'        WHERE id='pcat_5n1';
UPDATE product_category SET parent_category_id='pcat_5pack', mpath='pcat_v4_l5.pcat_5pack.pcat_ks_5x1_28'  WHERE id='pcat_ks_5x1_28';
UPDATE product_category SET parent_category_id='pcat_5pack', mpath='pcat_v4_l5.pcat_5pack.pcat_ks_5x7_1'   WHERE id='pcat_ks_5x7_1';
UPDATE product_category SET parent_category_id='pcat_5pack', mpath='pcat_v4_l5.pcat_5pack.pcat_ks_5x7_2'   WHERE id='pcat_ks_5x7_2';
UPDATE product_category SET parent_category_id='pcat_5pack', mpath='pcat_v4_l5.pcat_5pack.pcat_ks_5x7_3'   WHERE id='pcat_ks_5x7_3';

COMMIT;
