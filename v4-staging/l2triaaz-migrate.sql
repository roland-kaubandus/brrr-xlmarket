BEGIN;
-- L2 SISU-TRIAAŽ TEOSTUS (7-FLAG, Tarmo kinnitas)
-- MERGE (dup-värav)
UPDATE product_category_product SET product_category_id='pcat_9traf1' WHERE product_category_id='pcat_t3f_13_1';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3f_13_1';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_t3f_13_1';
UPDATE product_category_product SET product_category_id='pcat_7tv' WHERE product_category_id='pcat_7pond';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_7pond';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_7pond';
UPDATE product_category_product SET product_category_id='pcat_ks_5x2_2' WHERE product_category_id='pcat_12jd';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_12jd';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_12jd';
UPDATE product_category_product SET product_category_id='pcat_es_9x10_1' WHERE product_category_id='pcat_es_9x9_1';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_es_9x9_1';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_es_9x9_1';
-- REPARENT (+rename)
UPDATE product_category SET parent_category_id='pcat_22cart', mpath='pcat_v4_l22.pcat_22cart.pcat_1conv', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_22cart' AND deleted_at IS NULL), name='Konveierid', updated_at=now() WHERE id='pcat_1conv';
UPDATE product_category SET parent_category_id='pcat_9traf', mpath='pcat_v4_l9.pcat_9traf.pcat_t3a_6_5', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_9traf' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_t3a_6_5';
UPDATE product_category SET parent_category_id='pcat_v4_l7_10', mpath='pcat_v4_l7.pcat_v4_l7_10.pcat_t3a_6_14', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_10' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_t3a_6_14';
UPDATE product_category SET parent_category_id='pcat_v4_l7_7', mpath='pcat_v4_l7.pcat_v4_l7_7.pcat_t3a_6_1', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_7' AND deleted_at IS NULL), name='Õuehoiukastid', updated_at=now() WHERE id='pcat_t3a_6_1';
UPDATE product_category SET parent_category_id='pcat_20d', mpath='pcat_v4_l20.pcat_20d.pcat_el_12x10_3', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_20d' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_el_12x10_3';
UPDATE product_category SET parent_category_id='pcat_t3l2_13', mpath='pcat_v4_l1.pcat_t3l2_13.pcat_es_9x6_6', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_t3l2_13' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_es_9x6_6';
UPDATE product_category SET parent_category_id='pcat_v4_l7_6', mpath='pcat_v4_l7.pcat_v4_l7_6.pcat_t3a_12_6', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_6' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_t3a_12_6';
UPDATE product_category SET parent_category_id='pcat_v4_l7_1', mpath='pcat_v4_l7.pcat_v4_l7_1.pcat_t3a_12_4', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_1' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_t3a_12_4';
-- L2 rename
UPDATE product_category SET name='Töökoha ohutus- ja hädaabivarustus', updated_at=now() WHERE id='pcat_t3l2_13';
UPDATE product_category SET name='Aiatiigid ja veekogud', updated_at=now() WHERE id='pcat_v4_l7_12';
-- L2 kustuta (tühi Tailgating)
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_v4_l12_10';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_v4_l12_10';
COMMIT;
