-- #5 Prep L1: liha-masinate koond; Lihatöötlusmasinad grab-bag dissolve
-- 2026-07-04 · STAGING taxonomy-v4 · LUKK 1
BEGIN;

-- 1. UUED L3: Lihasegistid + Lihamördistajad
INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_5n22','Lihasegistid','v4-suurkook-lihasegistid','pcat_v4_l5.pcat_5prep.pcat_5n22','pcat_5prep',26,true,false),
 ('pcat_5n23','Lihamördistajad','v4-suurkook-lihamordistajad','pcat_v4_l5.pcat_5prep.pcat_5n23','pcat_5prep',27,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_5n22',3,'active','manual',true,0),
 ('pcat_5n23',3,'active','manual',true,0);

-- 2. Liigutused SKU järgi
CREATE TEMP TABLE _mv(vsku text, src text, dst text) ON COMMIT DROP;
INSERT INTO _mv VALUES
 -- Lihatöötlusmasinad (pcat_ks_5x2_16) dissolve:
 --  HAKKLIHA 4 -> Hakklihamasinad (pcat_ks_5x1_7)
 ('BXGSDJRJYS30TU4B1V0','pcat_ks_5x2_16','pcat_ks_5x1_7'),
 ('SYZJSJRJB80CMAC3RV0','pcat_ks_5x2_16','pcat_ks_5x1_7'),
 ('BXGSDJRJYS305W7U7V0','pcat_ks_5x2_16','pcat_ks_5x1_7'),
 ('ZTSDJRJZT800S8NBLV0','pcat_ks_5x2_16','pcat_ks_5x1_7'),
 --  SAAG 6 -> Lihasaed (pcat_ks_5x1_8)
 ('TSJGJ1500W4202NX5V2','pcat_ks_5x2_16','pcat_ks_5x1_8'),
 ('LSJGJ1500W420HDRYV2','pcat_ks_5x2_16','pcat_ks_5x1_8'),
 ('JGJJT1650MM16U0Z8V0','pcat_ks_5x2_16','pcat_ks_5x1_8'),
 ('2025KGHTSJGJ9BRGW001V2','pcat_ks_5x2_16','pcat_ks_5x1_8'),
 ('JGJLDJLDJ000FYK52001V0','pcat_ks_5x2_16','pcat_ks_5x1_8'),
 ('LDSJRJ2200WLXQZ6AV2','pcat_ks_5x2_16','pcat_ks_5x1_8'),
 --  SEGISTI 7 -> Lihasegistid (pcat_5n22)
 ('SYRLJBJBKQXKXAJIU001V0','pcat_ks_5x2_16','pcat_5n22'),
 ('SYRLJBJBKQXKG26A7001V0','pcat_ks_5x2_16','pcat_5n22'),
 ('SYRLJBJKQXK16O0YZ001V0','pcat_ks_5x2_16','pcat_5n22'),
 ('SYRLJBJBKQXKJ02ER001V0','pcat_ks_5x2_16','pcat_5n22'),
 ('SYRLJBJKQXK2VX73T001V0','pcat_ks_5x2_16','pcat_5n22'),
 ('SYRLJBJKQXK4SQNMC001V0','pcat_ks_5x2_16','pcat_5n22'),
 ('SYRLJBJBKQXK8RH6N001V0','pcat_ks_5x2_16','pcat_5n22'),
 --  VORST 2 -> Vorstimasinad ja -täitjad (pcat_ks_5x1_18)
 ('SDLSBXGGCJ155Q4DYV0','pcat_ks_5x2_16','pcat_ks_5x1_18'),
 ('SDLSBXGGCJ7L5STTEV0','pcat_ks_5x2_16','pcat_ks_5x1_18'),
 --  MORDISTAJA 1 -> Lihamördistajad (pcat_5n23)
 ('SDRNJ5YCYZLQQTAF7V0','pcat_ks_5x2_16','pcat_5n23'),
 --  TERA 2 (Meat Cutter Machine Blade SJY-DQ90) -> Lihalõikurid ja -viilutajad (pcat_ks_5x1_6)
 ('XRQPJDZ90MM5FJX19V0','pcat_ks_5x2_16','pcat_ks_5x1_6'),
 ('XRQPJDZ90MM1S4PT0V0','pcat_ks_5x2_16','pcat_ks_5x1_6'),
 -- Hakklihamasinad (pcat_ks_5x1_7) strayd:
 --  2 meat mixer -> Lihasegistid
 ('SYRLJBJBKQXKUC5OQ001V0','pcat_ks_5x1_7','pcat_5n22'),
 ('SYRLJBJKQXK3S0JB1001V0','pcat_ks_5x1_7','pcat_5n22'),
 --  2 tenderizer -> Lihamördistajad
 ('DDNRJ17INCH4R7F1XV2','pcat_ks_5x1_7','pcat_5n23'),
 ('DDNRJ195INCHZ1ATDV2','pcat_ks_5x1_7','pcat_5n23');

DELETE FROM product_category_product a
 USING product p JOIN _mv ON p.metadata->>'vevor_sku'=_mv.vsku
 WHERE a.product_id=p.id AND a.product_category_id=_mv.src;

INSERT INTO product_category_product (product_id, product_category_id)
SELECT DISTINCT p.id, _mv.dst FROM product p JOIN _mv ON p.metadata->>'vevor_sku'=_mv.vsku
 ON CONFLICT DO NOTHING;

-- 3. Lihatöötlusmasinad tühjeneb -> soft-delete + meta eemaldus
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ks_5x2_16';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_ks_5x2_16';

COMMIT;
