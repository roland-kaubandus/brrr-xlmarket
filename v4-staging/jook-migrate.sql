BEGIN;
-- 2 UUT L3 #5 Joogiseadmed L2 (pcat_5jook)
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_5piiritus','Piiritus- ja destilleerimisaparaadid','','v4-suurkoogiseadmed-piiritus-ja-destilleerimisaparaadid',true,false,'pcat_5jook','pcat_v4_l5.pcat_5jook.pcat_5piiritus',90,now(),now()),
 ('pcat_5vein','Veini- ja siidripressid','','v4-suurkoogiseadmed-veini-ja-siidripressid',true,false,'pcat_5jook','pcat_v4_l5.pcat_5jook.pcat_5vein',91,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_5piiritus',3,'active','manual',true,34,now(),now()),('pcat_5vein',3,'active','manual',true,21,now(),now());

-- SAMM 2: Piiritus-L3(37) jaotus — essõli→#16, alkohol→#5, vee→#4 (scoped, järjekord!)
UPDATE product_category_product pcp SET product_category_id='pcat_t3f_14_13'
 FROM product p WHERE p.id=pcp.product_id AND pcp.product_category_id='pcat_ks_4x1_1'
 AND p.title ILIKE '%essential oil%' AND p.title NOT ILIKE '%moonshine%' AND p.title NOT ILIKE '%alcohol%';
UPDATE product_category_product pcp SET product_category_id='pcat_5piiritus'
 FROM product p WHERE p.id=pcp.product_id AND pcp.product_category_id='pcat_ks_4x1_1'
 AND (p.title ILIKE '%alcohol%' OR p.title ILIKE '%moonshine%' OR p.title ILIKE '%wine boiler%' OR p.title ILIKE '%reflux%');
UPDATE product_category_product SET product_category_id='pcat_4n1' WHERE product_category_id='pcat_ks_4x1_1';  -- jääk = vee-destill → #4 Veedestillaatorid

-- SAMM 1b: Mahla-veinipressid(24) jaotus — vein→#5 uus, wheatgrass→#5 Mahlapressid, tomato→#4 Köögikombain
UPDATE product_category_product pcp SET product_category_id='pcat_5vein'
 FROM product p WHERE p.id=pcp.product_id AND pcp.product_category_id='pcat_ks_4x1_7'
 AND (p.title ILIKE '%wine press%' OR p.title ILIKE '%crusher%');
UPDATE product_category_product pcp SET product_category_id='pcat_ks_5x1_17'
 FROM product p WHERE p.id=pcp.product_id AND pcp.product_category_id='pcat_ks_4x1_7' AND p.title ILIKE '%wheatgrass%';
UPDATE product_category_product pcp SET product_category_id='pcat_ks_4x1_3'
 FROM product p WHERE p.id=pcp.product_id AND pcp.product_category_id='pcat_ks_4x1_7' AND p.title ILIKE '%tomato%';
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_17' WHERE product_category_id='pcat_ks_4x1_7';  -- jääk (kui) → Mahlapressid

-- Tühjenenud #4 L3-d → kustuta
DELETE FROM taxonomy_node_meta WHERE node_id IN ('pcat_ks_4x1_1','pcat_ks_4x1_7');
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id IN ('pcat_ks_4x1_1','pcat_ks_4x1_7');
INSERT INTO slug_redirect (from_slug,to_slug,reason,created_at) VALUES
 ('v4-kodumasinad-ja-kodutehnika-koogitehnika-piiritus-destilleerimisaparaadid','v4-suurkoogiseadmed-piiritus-ja-destilleerimisaparaadid','merge',now()),
 ('v4-kodumasinad-ja-kodutehnika-koogitehnika-mahla-ja-veinipressid','v4-suurkoogiseadmed-veini-ja-siidripressid','merge',now());
COMMIT;
\echo '--- tulem ---'
SELECT c.name, split_part(c.mpath,'.',1) main, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n, c.deleted_at IS NOT NULL del FROM product_category c WHERE c.id IN ('pcat_5piiritus','pcat_5vein','pcat_4n1','pcat_t3f_14_13','pcat_ks_4x1_1','pcat_ks_4x1_7') ORDER BY del,c.name;
