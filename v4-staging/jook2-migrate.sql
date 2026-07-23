-- #5 Joogiseadmed L2: õlle-split (pruulimine #5 / destilleerimine #4); destilleerimine koond #4 (vesi+piiritus); 2 võõrast välja
-- 2026-07-04 · STAGING taxonomy-v4 · ristmain #4<->#5<->#15
BEGIN;

-- ============ SAMM 1: #5 õlle L3 rename (pruulimine jääb) ============
UPDATE product_category
   SET name='Õllepruulimisseadmed', handle='v4-suurkook-ollepruulimisseadmed'
 WHERE id='pcat_ks_5x2_30';

-- ============ SAMM 2: #4 destill L3 repurpose -> Piiritus (35 jäävad) + uus Veedestillaatorid ============
UPDATE product_category
   SET name='Piiritus- & destilleerimisaparaadid', handle='v4-koogitehnika-piiritus-destilleerimisaparaadid'
 WHERE id='pcat_ks_4x1_1';

INSERT INTO product_category (id, name, handle, mpath, parent_category_id, rank, is_active, is_internal) VALUES
 ('pcat_4n1','Veedestillaatorid','v4-koogitehnika-veedestillaatorid','pcat_v4_l4.pcat_v4_l4_1.pcat_4n1','pcat_v4_l4_1',1,true,false);
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached) VALUES
 ('pcat_4n1',3,'active','manual',true,0);

-- ============ SAMM 3: liigutused SKU järgi ============
CREATE TEMP TABLE _mv(vsku text, src text, dst text) ON COMMIT DROP;
INSERT INTO _mv VALUES
 -- #5 DESTILL 2 -> #4 piiritus (pcat_ks_4x1_1)
 ('ZLSJ8GALDTDB00001V2','pcat_ks_5x2_30','pcat_ks_4x1_1'),
 ('DLNTZLQYS8JL8FA16V0','pcat_ks_5x2_30','pcat_ks_4x1_1'),
 -- #4 VESI 13 -> Veedestillaatorid (pcat_4n1)
 ('HR-1ZLSJ000000001V2','pcat_ks_4x1_1','pcat_4n1'),
 ('D1LH1LH4L220V0VTNV2','pcat_ks_4x1_1','pcat_4n1'),
 ('DSD15LH4L220VN0XGV2','pcat_ks_4x1_1','pcat_4n1'),
 ('D1LH1LH4L220V4MQSV2','pcat_ks_4x1_1','pcat_4n1'),
 ('D1LH4L1LH220VY79GV2','pcat_ks_4x1_1','pcat_4n1'),
 ('BXGZLSJXB4LDXH9BQV2','pcat_ks_4x1_1','pcat_4n1'),
 ('BXGZLSJYS4LD2TK5LV2','pcat_ks_4x1_1','pcat_4n1'),
 ('BXGZLSJXB4LDCQHM3V2','pcat_ks_4x1_1','pcat_4n1'),
 ('BXGZLSJJH4LD7H83YV2','pcat_ks_4x1_1','pcat_4n1'),
 ('ZLSJSC-3BXGLYSDWKV2','pcat_ks_4x1_1','pcat_4n1'),
 ('DSDW1LH4L220VKTNFV2','pcat_ks_4x1_1','pcat_4n1'),
 ('DSDW1LH4L220VZC7RV2','pcat_ks_4x1_1','pcat_4n1'),
 ('6LZLSJZXID6LGX8NE001V2','pcat_ks_4x1_1','pcat_4n1'),
 -- #4 VÕÕRAS 2 -> õiged kodud
 ('QSHFQSPGSYBLVU4RUV2','pcat_ks_4x1_1','pcat_f4_15x1_14'),  -- Hydrogen Water -> #15 Vesinikuvee generaatorid
 ('JYJZKFKJ120W2845LV2','pcat_ks_4x1_1','pcat_ks_4x1_18');   -- Vacuum Sealer -> #4 Vaakumpakkimismasinad

-- eemalda allikast
DELETE FROM product_category_product a
 USING product p JOIN _mv ON p.metadata->>'vevor_sku'=_mv.vsku
 WHERE a.product_id=p.id AND a.product_category_id=_mv.src;

-- lisa sihti (dup-guard)
INSERT INTO product_category_product (product_id, product_category_id)
SELECT DISTINCT p.id, _mv.dst FROM product p JOIN _mv ON p.metadata->>'vevor_sku'=_mv.vsku
 ON CONFLICT DO NOTHING;

COMMIT;
