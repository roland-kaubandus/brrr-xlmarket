BEGIN;
-- 15KW induktsioon (tööstus) → #2 Garaaž Induktsioonkuumutid (dup-värav)
UPDATE product_category_product SET product_category_id='pcat_ag2_2x1_19' WHERE product_id='prod_01KNXX615Q8VK22GY4N9Y0WA3V';
-- 7 juveeli-L3 REPARENT #13 → #25 Ehtekunst (maker/metallitöö domeen)
UPDATE product_category SET parent_category_id='pcat_25ehte', mpath='pcat_v4_l25.pcat_25ehte.pcat_f4_13x1_8', rank=3, updated_at=now() WHERE id='pcat_f4_13x1_8';
UPDATE product_category SET parent_category_id='pcat_25ehte', mpath='pcat_v4_l25.pcat_25ehte.pcat_f4_13x1_15', rank=4, updated_at=now() WHERE id='pcat_f4_13x1_15';
UPDATE product_category SET parent_category_id='pcat_25ehte', mpath='pcat_v4_l25.pcat_25ehte.pcat_f4_13x1_11', rank=5, updated_at=now() WHERE id='pcat_f4_13x1_11';
UPDATE product_category SET parent_category_id='pcat_25ehte', mpath='pcat_v4_l25.pcat_25ehte.pcat_f4_13x1_12', rank=6, updated_at=now() WHERE id='pcat_f4_13x1_12';
UPDATE product_category SET parent_category_id='pcat_25ehte', mpath='pcat_v4_l25.pcat_25ehte.pcat_f4_13x1_14', rank=7, updated_at=now() WHERE id='pcat_f4_13x1_14';
UPDATE product_category SET parent_category_id='pcat_25ehte', mpath='pcat_v4_l25.pcat_25ehte.pcat_t3f_1_21', rank=8, updated_at=now() WHERE id='pcat_t3f_1_21';
UPDATE product_category SET parent_category_id='pcat_25ehte', mpath='pcat_v4_l25.pcat_25ehte.pcat_1n7', rank=9, updated_at=now() WHERE id='pcat_1n7';
-- rename Ehtekunst → Ehte- ja metallitöö (katab kivilihvimine/valu/graveerimine)
UPDATE product_category SET name='Ehte- ja metallitöö', updated_at=now() WHERE id='pcat_25ehte';
-- #13 Juveeli L2 tühjenes → kustuta (dead L2)
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_13juv';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_13juv';
COMMIT;
\echo '--- #25 Ehte- ja metallitöö L3-d ---'
SELECT l3.name,(SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n FROM product_category l3 WHERE l3.parent_category_id='pcat_25ehte' AND l3.deleted_at IS NULL ORDER BY l3.rank;
\echo '--- #13 Juveeli L2 kustutatud? · induktsioon #2-s? ---'
SELECT (SELECT deleted_at IS NOT NULL FROM product_category WHERE id='pcat_13juv') juveel_del, (SELECT count(*) FROM product_category_product WHERE product_category_id='pcat_f4_13x1_15') sulatus_jaak, (SELECT count(*) FROM product_category_product WHERE product_category_id='pcat_ag2_2x1_19') induktsioon_n;
