BEGIN;
-- ===== 5 UUT L3 =====
INSERT INTO product_category (id,name,handle,parent_category_id,mpath,rank,is_active,is_internal,description,created_at,updated_at) VALUES
('pcat_5surve','Survepotid','v4-suurkook-survepotid','pcat_5noud','pcat_v4_l5.pcat_5noud.pcat_5surve',0,true,false,'',NOW(),NOW()),
('pcat_5auru','Aurutuspotid ja aurutajad','v4-suurkook-aurutuspotid-ja-aurutajad','pcat_5noud','pcat_v4_l5.pcat_5noud.pcat_5auru',0,true,false,'',NOW(),NOW()),
('pcat_5popsi','Jäätisepulga masinad','v4-suurkook-jaatisepulga-masinad','pcat_5kulm','pcat_v4_l5.pcat_5kulm.pcat_5popsi',0,true,false,'',NOW(),NOW()),
('pcat_5ferm','Õllefermentorid','v4-suurkook-ollefermentorid','pcat_5jook','pcat_v4_l5.pcat_5jook.pcat_5ferm',0,true,false,'',NOW(),NOW()),
('pcat_5keg','Kegid ja õllesüsteemi tarvikud','v4-suurkook-kegid-ja-ollesysteemi-tarvikud','pcat_5jook','pcat_v4_l5.pcat_5jook.pcat_5keg',0,true,false,'',NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
('pcat_5surve',3,'active','manual',true,5,NOW(),NOW()),('pcat_5auru',3,'active','manual',true,6,NOW(),NOW()),
('pcat_5popsi',3,'active','manual',true,3,NOW(),NOW()),('pcat_5ferm',3,'active','manual',true,4,NOW(),NOW()),
('pcat_5keg',3,'active','manual',true,5,NOW(),NOW());
-- ===== POTID split =====
UPDATE product_category_product SET product_category_id='pcat_5surve' WHERE product_id IN ('prod_01KPJVCBR1ZB7WACWWEG0EJTQ8','prod_01KP6FDE57ZCW6055PGTT8MMWA','prod_01KPJVCBHVQ03V4K29E082F8DK','prod_01KPJVCC3EZ176238D551QVJD5','prod_01KPJVCBY2G07GGTBMXY37SKPN') AND product_category_id='pcat_ks_5x2_8';
UPDATE product_category_product SET product_category_id='pcat_5auru' WHERE product_id IN ('prod_01KNXX66QG1WXBNDRVEY99BHG1','prod_01KNXX6AF68V0B4XTZ0K5MK9WH','prod_01KNXX8V2P98XJC3VAYX68AADP','prod_01KNXX8V2TA3R3TJYKPB1TNWKB','prod_01KNXX8V3M91DEKGNJNCBJSDKB','prod_01KNXX8V2QP1499RRNY1WW35GX') AND product_category_id='pcat_ks_5x2_8';
-- brew kettles → Õllepruulimisseadmed (intra, seotud tüüp)
UPDATE product_category_product SET product_category_id='pcat_ks_5x2_30' WHERE product_id IN ('prod_01KNXX97Q76MM6NGY7684TPA6Q','prod_01KNXX97Q8RQAVS4XK1KM89SG8') AND product_category_id='pcat_ks_5x2_8';
-- ===== 7 FLAG =====
-- a) baking set → Küpsetusplaadid
UPDATE product_category_product SET product_category_id='pcat_5kypse' WHERE product_id='prod_01KNXXK9C0501XKD05SYHQ2J11' AND product_category_id='pcat_ks_5x2_7';
-- b) popsicle → uus
UPDATE product_category_product SET product_category_id='pcat_5popsi' WHERE product_id IN ('prod_01KNXXD0SWFAQH3KD2BGECA1FK','prod_01KNXXD1QQ5KB2YT739SZQ4GCE','prod_01KNXXD0TJZ21SH0QGFXZNK4C9') AND product_category_id='pcat_ks_5x1_3';
-- c) fermentorid → uus (kõrvuti pruulimisseadmetega, sama L2 Joogiseadmed)
UPDATE product_category_product SET product_category_id='pcat_5ferm' WHERE product_id IN ('prod_01KNXXCP2GQ1BKDSD8GCT8BNTY','prod_01KNXXCQWXDG4GGJRTK38M1NQE','prod_01KPJV9NZS7YY6JGJQ4WVAA2RD','prod_01KPJV9PC535Z37D8F60EHHZDZ') AND product_category_id='pcat_ks_5x2_30';
-- d) kegid+tarvikud → uus
UPDATE product_category_product SET product_category_id='pcat_5keg' WHERE product_id IN ('prod_01KNXXCWC24JA2SN422XNR4TGF','prod_01KNXXCWBYQE1B4SK7S8MMPGHP','prod_01KNXXSF6F7MVJX1H7GSTFTYF1','prod_01KNXXSF6KXTBJDNSQ5GC57ASS','prod_01KNXXSF6GJ536B7DHC03F2NZB') AND product_category_id='pcat_ks_5x2_12';
-- e) freezers → Sügavkülmikud (olemas)
UPDATE product_category_product SET product_category_id='pcat_5n12' WHERE product_id IN ('prod_01KNXXDG7B9GMAQ6QA453DWPXJ','prod_01KNXXDH3BC40A9BG8RYZ22EVV') AND product_category_id='pcat_ks_5x5_3';
-- g) refrigerated prep stations → Jahutusega ettevalmistusjaamad (olemas)
UPDATE product_category_product SET product_category_id='pcat_5n14' WHERE product_id IN ('prod_01KNXXDAVEKP55S2JTSSX2XPJ0','prod_01KNXXDBQPWFH3D52X425J2X24','prod_01KNXXD9Y9JWK4K523ZHAATNQZ','prod_01KNXXDBRCYZ00QE6P2XRB711G','prod_01KNXXDAV8HXN08KSJGWWGK2AS','prod_01KNXXDBQR7863R0QZJGCNS7QQ') AND product_category_id='pcat_ks_5x2_23';
COMMIT;
\echo '--- tulem ---'
SELECT c.name,(SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_ks_5x2_8','pcat_5surve','pcat_5auru','pcat_ks_5x1_3','pcat_5popsi','pcat_ks_5x2_30','pcat_5ferm','pcat_ks_5x2_12','pcat_5keg','pcat_ks_5x5_3','pcat_5n12','pcat_ks_5x2_23','pcat_5n14','pcat_ks_5x2_7') ORDER BY c.name;
\echo '--- distinct(17425) L3(1613->1618) ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
