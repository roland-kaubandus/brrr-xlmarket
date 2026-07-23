-- Suur struktuur FAAS A: labor→#16 (Meditsiin, labor & teadus) + ultraheli→Puhastustehnika + #14 lahendus
BEGIN;

-- SAMM 1: Ultrahelipuhastid (75) reparent #1 Labori-L2 -> #1 Puhastustehnika-L2 (pcat_t3l2_12)
UPDATE product_category SET parent_category_id='pcat_t3l2_12', mpath='pcat_v4_l1.pcat_t3l2_12.pcat_t3f_14_1',
  handle='v4-tooriistad-ja-tarvikud-puhastustehnika-ultrahelipuhastid', rank=3 WHERE id='pcat_t3f_14_1';

-- SAMM 2a: Anatoomilised õppemudelid (8) -> #16 Meditsiinitarvikud
UPDATE product_category SET parent_category_id='pcat_v4_l16_2', mpath='pcat_v4_l16.pcat_v4_l16_2.pcat_t3f_14_5',
  handle='v4-meditsiin-anatoomilised-oppemudelid',
  rank=(SELECT coalesce(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l16_2' AND deleted_at IS NULL)
  WHERE id='pcat_t3f_14_5';

-- SAMM 2b: Õhukvaliteedi mõõturid (4) -> merge #1 Mõõte "Keskkonna- & õhukvaliteedi" (pcat_11env), tühi L3 kustuta
UPDATE product_category_product SET product_category_id='pcat_11env' WHERE product_category_id='pcat_t3f_14_2';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3f_14_2';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_t3f_14_2';

-- SAMM 3: uus #16 L2 "Labor & teadus" + 12 päris-labor L3 reparent
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_16lab','Labor & teadus','','v4-meditsiin-labor-ja-teadus-labor',true,false,'pcat_v4_l16','pcat_v4_l16.pcat_16lab',2,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_16lab',2,'active','manual',true,0,now(),now());
UPDATE product_category SET parent_category_id='pcat_16lab', mpath='pcat_v4_l16.pcat_16lab.pcat_t3f_14_3',  handle='v4-meditsiin-labor-vee-kvaliteedi-mooturid',       rank=1  WHERE id='pcat_t3f_14_3';
UPDATE product_category SET parent_category_id='pcat_16lab', mpath='pcat_v4_l16.pcat_16lab.pcat_t3f_14_4',  handle='v4-meditsiin-labor-magnetsegistid-kuumutusplaadid', rank=2  WHERE id='pcat_t3f_14_4';
UPDATE product_category SET parent_category_id='pcat_16lab', mpath='pcat_v4_l16.pcat_16lab.pcat_t3f_14_6',  handle='v4-meditsiin-labor-laboristatiivid',               rank=3  WHERE id='pcat_t3f_14_6';
UPDATE product_category SET parent_category_id='pcat_16lab', mpath='pcat_v4_l16.pcat_16lab.pcat_t3f_14_7',  handle='v4-meditsiin-labor-laborikaalud',                  rank=4  WHERE id='pcat_t3f_14_7';
UPDATE product_category SET parent_category_id='pcat_16lab', mpath='pcat_v4_l16.pcat_16lab.pcat_t3f_14_8',  handle='v4-meditsiin-labor-viskosimeetrid',                rank=5  WHERE id='pcat_t3f_14_8';
UPDATE product_category SET parent_category_id='pcat_16lab', mpath='pcat_v4_l16.pcat_16lab.pcat_t3f_14_9',  handle='v4-meditsiin-labor-vedellammastiku-mahutid',       rank=6  WHERE id='pcat_t3f_14_9';
UPDATE product_category SET parent_category_id='pcat_16lab', mpath='pcat_v4_l16.pcat_16lab.pcat_t3f_14_10', handle='v4-meditsiin-labor-laborijahutid-tsirkulaatorid',   rank=7  WHERE id='pcat_t3f_14_10';
UPDATE product_category SET parent_category_id='pcat_16lab', mpath='pcat_v4_l16.pcat_16lab.pcat_t3f_14_11', handle='v4-meditsiin-labor-mikroskoobid',                  rank=8  WHERE id='pcat_t3f_14_11';
UPDATE product_category SET parent_category_id='pcat_16lab', mpath='pcat_v4_l16.pcat_16lab.pcat_t3f_14_12', handle='v4-meditsiin-labor-laborihomogenisaatorid',        rank=9  WHERE id='pcat_t3f_14_12';
UPDATE product_category SET parent_category_id='pcat_16lab', mpath='pcat_v4_l16.pcat_16lab.pcat_t3f_14_13', handle='v4-meditsiin-labor-destilleerimis-aurustusseadmed', rank=10 WHERE id='pcat_t3f_14_13';
UPDATE product_category SET parent_category_id='pcat_16lab', mpath='pcat_v4_l16.pcat_16lab.pcat_t3f_14_14', handle='v4-meditsiin-labor-laboritsentrifuugid',           rank=11 WHERE id='pcat_t3f_14_14';
UPDATE product_category SET parent_category_id='pcat_16lab', mpath='pcat_v4_l16.pcat_16lab.pcat_t3f_14_15', handle='v4-meditsiin-labor-laboritostukid',                rank=12 WHERE id='pcat_t3f_14_15';

-- SAMM 4: rename #16 main + kustuta tühjaks jäänud #14 L2 (pcat_t3l2_14)
UPDATE product_category SET name='Meditsiin, labor & teadus', handle='v4-meditsiin-labor-ja-teadus' WHERE id='pcat_v4_l16';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3l2_14';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_t3l2_14';

COMMIT;
