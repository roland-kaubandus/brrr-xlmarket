BEGIN;

-- ============ #9 LÜKANDUSTE LAHENDUS ============
-- 1. UUS L3 "Liuguksed" (valmis liuguste paneelid)
INSERT INTO product_category (id,name,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_9slid','Liuguksed','v4-ehitus-remont-ja-varvid-uksed-aknad-ja-luugid-liuguksed',true,false,'pcat_v4_l9_3','pcat_v4_l9.pcat_v4_l9_3.pcat_9slid',0,NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,created_at,updated_at)
VALUES ('pcat_9slid',3,'active','manual',true,NOW(),NOW());

-- 2. UUS L3 "Pocket-ukse raamikomplektid" (seina-ehituselement)
INSERT INTO product_category (id,name,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_9pkt','Pocket-ukse raamikomplektid','v4-ehitus-remont-ja-varvid-uksed-aknad-ja-luugid-pocket-ukse-raamikomplektid',true,false,'pcat_v4_l9_3','pcat_v4_l9.pcat_v4_l9_3.pcat_9pkt',0,NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,created_at,updated_at)
VALUES ('pcat_9pkt',3,'active','manual',true,NOW(),NOW());

-- 3. RENAME pcat_es_9x3_8 "Kahepoolsed lükanduksed" -> "Voldik-liuguksed" (bifold)
UPDATE product_category SET name='Voldik-liuguksed',
  handle='v4-ehitus-remont-ja-varvid-uksed-aknad-ja-luugid-voldik-liuguksed', updated_at=NOW()
WHERE id='pcat_es_9x3_8';

-- 4. VALMIS UKSED (20) pcat_es_9x3_1 -> pcat_9slid  (barn-paneel 15 + bypass-closet 3 + pocket-paneel 2)
UPDATE product_category_product SET product_category_id='pcat_9slid'
WHERE product_category_id='pcat_es_9x3_1'
AND product_id IN (SELECT id FROM product WHERE
     title LIKE 'VEVOR Barn Door and Hardware Kit%'
  OR title LIKE 'VEVOR Sliding Barn Door, %'
  OR title LIKE 'VEVOR Sliding Closet Door,%'
  OR title LIKE 'VEVOR Sliding Pocket Door, %');

-- 5. POCKET RAAMIKOMPLEKT (7) pcat_es_9x3_1 -> pcat_9pkt
UPDATE product_category_product SET product_category_id='pcat_9pkt'
WHERE product_category_id='pcat_es_9x3_1'
AND product_id IN (SELECT id FROM product WHERE title LIKE 'VEVOR Pocket Door Frame Kit%');

-- 6. BARN DOOR KÄEPIDE (2) pcat_es_9x3_1 -> pcat_es_9x3_2 (dup-värav: olemas)
UPDATE product_category_product SET product_category_id='pcat_es_9x3_2'
WHERE product_category_id='pcat_es_9x3_1'
AND product_id IN (SELECT id FROM product WHERE title LIKE 'VEVOR Barn Door Handle%');

-- 7. BIFOLD MISFILE (1) pcat_es_9x3_7 (saloon) -> pcat_es_9x3_8 (Voldik-liuguksed)
UPDATE product_category_product SET product_category_id='pcat_es_9x3_8'
WHERE product_category_id='pcat_es_9x3_7' AND product_id='prod_01KPJVC91KE9RGTYTWMJF1QTQW';

-- 8. GATE-ROLLER DUP (3) pcat_es_9x3_11 -> pcat_es_9x4_7 (õuevärava-furnituur, #9 Aiad)
UPDATE product_category_product SET product_category_id='pcat_es_9x4_7'
WHERE product_category_id='pcat_es_9x3_11';

-- 9. Kustuta tühjaks jäänud pcat_es_9x3_11 (soft-delete + meta DELETE, konventsioon)
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_es_9x3_11';
UPDATE product_category SET deleted_at=NOW(), updated_at=NOW() WHERE id='pcat_es_9x3_11';

COMMIT;

-- ============ VERIFY ============
\echo '--- L3 counts after ---'
SELECT c.name, count(pcp.product_id) AS n FROM product_category c
LEFT JOIN product_category_product pcp ON pcp.product_category_id=c.id
WHERE c.id IN ('pcat_es_9x3_1','pcat_9slid','pcat_9pkt','pcat_es_9x3_8','pcat_es_9x3_2','pcat_es_9x3_7','pcat_es_9x4_7','pcat_es_9x3_11')
GROUP BY c.name,c.id ORDER BY c.name;
\echo '--- pcat_es_9x3_11 deleted? ---'
SELECT id, deleted_at IS NOT NULL AS deleted FROM product_category WHERE id='pcat_es_9x3_11';
\echo '--- distinct products (must be 17425) + L1 (must be 23) ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND parent_category_id IS NULL AND deleted_at IS NULL;
