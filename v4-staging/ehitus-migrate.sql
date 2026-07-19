BEGIN;
-- EHITUS-MAIN LAHENDUS (nime-lõks + cross-main dup, Tarmo kinnitatud)
-- SAMM 1: main rename + slug
UPDATE product_category SET name='Ehitus ja remont', handle='v4-ehitus-ja-remont', updated_at=now() WHERE id='pcat_v4_l9';
INSERT INTO slug_redirect (from_slug,to_slug,reason,created_at) VALUES ('v4-ehitus-remont-ja-varvid','v4-ehitus-ja-remont','rename',now()) ON CONFLICT DO NOTHING;
-- SAMM 3: vana L2 rename (jäävad ehitus-piirded)
UPDATE product_category SET name='Piirded ja käsipuud', updated_at=now() WHERE id='pcat_v4_l9_4';
-- SAMM 2: MERGE dup-värav
UPDATE product_category_product SET product_category_id='pcat_t3a_10_5' WHERE product_category_id='pcat_es_9x4_5';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_es_9x4_5';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_es_9x4_5';
UPDATE product_category_product SET product_category_id='pcat_t3a_10_2' WHERE product_category_id='pcat_es_9x4_9';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_es_9x4_9';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_es_9x4_9';
-- SAMM 2+4: REPARENT
UPDATE product_category SET parent_category_id='pcat_v4_l7_10', mpath='pcat_v4_l7.pcat_v4_l7_10.pcat_es_9x4_11', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_10' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_es_9x4_11';
UPDATE product_category SET parent_category_id='pcat_v4_l7_10', mpath='pcat_v4_l7.pcat_v4_l7_10.pcat_es_9x4_7', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_10' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_es_9x4_7';
UPDATE product_category SET parent_category_id='pcat_v4_l7_10', mpath='pcat_v4_l7.pcat_v4_l7_10.pcat_es_9x4_13', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_10' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_es_9x4_13';
UPDATE product_category SET parent_category_id='pcat_v4_l7_10', mpath='pcat_v4_l7.pcat_v4_l7_10.pcat_es_9x4_6', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_10' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_es_9x4_6';
UPDATE product_category SET parent_category_id='pcat_v4_l7_10', mpath='pcat_v4_l7.pcat_v4_l7_10.pcat_es_9x4_8', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_10' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_es_9x4_8';
UPDATE product_category SET parent_category_id='pcat_9traf', mpath='pcat_v4_l9.pcat_9traf.pcat_9karivar', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_9traf' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_9karivar';
UPDATE product_category SET parent_category_id='pcat_9traf', mpath='pcat_v4_l9.pcat_9traf.pcat_es_9x4_4', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_9traf' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_es_9x4_4';
UPDATE product_category SET parent_category_id='pcat_9traf', mpath='pcat_v4_l9.pcat_9traf.pcat_es_9x4_12', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_9traf' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_es_9x4_12';
UPDATE product_category SET parent_category_id='pcat_v4_l7_3', mpath='pcat_v4_l7.pcat_v4_l7_3.pcat_es_9x4_14', rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l7_3' AND deleted_at IS NULL), updated_at=now() WHERE id='pcat_es_9x4_14';
COMMIT;
