BEGIN;
-- 3 UUT L3 (#20 Dekoratsioonid L2 pcat_20a)
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_20taim','Taimeseinad ja haljasseinad','','v4-peoinventar-taimeseinad-ja-haljasseinad',true,false,'pcat_20a','pcat_v4_l20.pcat_20a.pcat_20taim',90,now(),now()),
 ('pcat_20lill','Kunstlilled ja lilleseaded','','v4-peoinventar-kunstlilled-ja-lilleseaded',true,false,'pcat_20a','pcat_v4_l20.pcat_20a.pcat_20lill',91,now(),now()),
 ('pcat_20parg','Pärjad, vanikud ja girlandid','','v4-peoinventar-parjad-vanikud-ja-girlandid',true,false,'pcat_20a','pcat_v4_l20.pcat_20a.pcat_20parg',92,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_20taim',3,'active','manual',true,19,now(),now()),('pcat_20lill',3,'active','manual',true,16,now(),now()),('pcat_20parg',3,'active','manual',true,13,now(),now());

-- SAMM 1: Kunstlilled(89) 3-way split (scoped title-pattern; C→taimeseinad, siis D→lilleseaded, E jääk)
UPDATE product_category_product pcp SET product_category_id='pcat_20taim'
 FROM product p WHERE p.id=pcp.product_id AND pcp.product_category_id='pcat_mv_6x1_8'
 AND (p.title ILIKE '%wall%' OR p.title ILIKE '%hedge%' OR p.title ILIKE '%privacy%' OR p.title ILIKE '%fence%' OR p.title ILIKE '%panel%' OR p.title ILIKE '%screen%');
UPDATE product_category_product pcp SET product_category_id='pcat_20lill'
 FROM product p WHERE p.id=pcp.product_id AND pcp.product_category_id='pcat_mv_6x1_8'
 AND (p.title ILIKE '%bouquet%' OR p.title ILIKE '%arrangement%' OR p.title ILIKE '%stem%' OR p.title ILIKE '%rose%' OR p.title ILIKE '%hydrangea%' OR p.title ILIKE '%flower ball%' OR p.title ILIKE '%floral%');
UPDATE product_category SET name='Kunsttaimed ja -puud', updated_at=now() WHERE id='pcat_mv_6x1_8';

-- SAMM 2: Dekoratiivlaternad(24) split — flower wall(2)→taimeseinad, wreath+garland(13)→pärg, laternad jääk
UPDATE product_category_product pcp SET product_category_id='pcat_20taim'
 FROM product p WHERE p.id=pcp.product_id AND pcp.product_category_id='pcat_mv_6x1_29'
 AND (p.title ILIKE '%flower wall%' OR p.title ILIKE '%wall panel%');
UPDATE product_category_product pcp SET product_category_id='pcat_20parg'
 FROM product p WHERE p.id=pcp.product_id AND pcp.product_category_id='pcat_mv_6x1_29'
 AND (p.title ILIKE '%wreath%' OR p.title ILIKE '%garland%');
UPDATE product_category SET name='Dekoratiivlaternad', updated_at=now() WHERE id='pcat_mv_6x1_29';

-- SAMM 3: MERGE Toiduhakkijad(4) → Köögikombainid (hakkija = kombaini alamfunktsioon, sama väljund)
UPDATE product_category_product SET product_category_id='pcat_ks_4x1_3' WHERE product_category_id='pcat_ks_4x1_11';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ks_4x1_11';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_ks_4x1_11';
INSERT INTO slug_redirect (from_slug,to_slug,reason,created_at) VALUES
 ('v4-kodumasinad-ja-kodutehnika-koogitehnika-toiduhakkijad-ja-tukeldajad','v4-kodumasinad-ja-kodutehnika-koogitehnika-koogikombainid-ja-toiduprotsessorid','merge',now());
COMMIT;
\echo '--- tulem ---'
SELECT c.name, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_mv_6x1_8','pcat_20taim','pcat_20lill','pcat_20parg','pcat_mv_6x1_29','pcat_ks_4x1_3') AND c.deleted_at IS NULL ORDER BY c.name;
