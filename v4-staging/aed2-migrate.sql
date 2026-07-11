BEGIN;
-- a) MERGE Aeraatorrehad(1) → Muru aeraatorid (variant, sama väljund)
UPDATE product_category_product SET product_category_id='pcat_t3a_1_7' WHERE product_category_id='pcat_t3a_1_21';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3a_1_21';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_t3a_1_21';
-- b) REPARENT Survepesurid → #1 Puhastustehnika (üld-tööriist, ühendab tarviku-perega)
UPDATE product_category SET parent_category_id='pcat_t3l2_12', mpath='pcat_v4_l1.pcat_t3l2_12.pcat_t3a_5_3', updated_at=now() WHERE id='pcat_t3a_5_3';
-- d) fence postid → #9 Ehitus (piire-domeen, dup-värav); #7 Aiapostid-L3 tühjeneb → kustuta
UPDATE product_category_product SET product_category_id='pcat_es_9x4_11' WHERE product_category_id='pcat_t3a_10_4';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3a_10_4';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_t3a_10_4';
-- e) L2-fix: Muruharjad ja pühkijad → Aiatööriistad (mitte Aia jõuseadmed)
UPDATE product_category SET parent_category_id='pcat_v4_l7_1', mpath='pcat_v4_l7.pcat_v4_l7_1.pcat_t3a_5_9', updated_at=now() WHERE id='pcat_t3a_5_9';
-- f) REPARENT Jäävannid → #12 Sport Fitness (sportlase recovery)
UPDATE product_category SET parent_category_id='pcat_v4_l12_3', mpath='pcat_v4_l12.pcat_v4_l12_3.pcat_7jaavann', updated_at=now() WHERE id='pcat_7jaavann';
-- 301
INSERT INTO slug_redirect (from_slug,to_slug,reason,created_at) VALUES
('v4-aed-ja-aiatehnika-l1-aeraatorrehad','v4-aed-ja-aiatehnika-l1-muru-aeraatorid-ja-vertikuteerijad','merge',now()),
('v4-aed-ja-aiatehnika-l10-aiapostid','v4-ehitus-remont-ja-varvid-aiad-varavad-ja-piirded-aiapostid-ja-ankrud','merge',now());
COMMIT;
\echo '--- tulem ---'
SELECT c.name, split_part(c.mpath,'.',1) main, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n, c.deleted_at IS NOT NULL del FROM product_category c WHERE c.id IN ('pcat_t3a_1_7','pcat_t3a_1_21','pcat_t3a_5_3','pcat_t3a_10_4','pcat_es_9x4_11','pcat_t3a_5_9','pcat_7jaavann') ORDER BY del,main;
