-- A3 MERGE/SPLIT — UNDO (2026-11-17). Taasta algseis täielikult.
-- NB: ükski liigutatav toode EI olnud enne sihus (kontrollitud) → sihu-lingid eemaldatakse ohutult.

\set ON_ERROR_STOP on
BEGIN;

-- ═══ #1 taasta: toode tagasi pcat_12trainer, taasta L3 ════════════════════════
UPDATE product_category SET deleted_at=NULL, is_active=true, updated_at=NOW() WHERE id='pcat_12trainer';
INSERT INTO product_category_product (product_id, product_category_id)
  VALUES ('prod_01KNXX76QZR8M9HRA6GA8722EY','pcat_12trainer') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXX76QZR8M9HRA6GA8722EY' AND product_category_id='pcat_el_12x3_17';

-- ═══ #2 taasta: 8 toodet tagasi pcat_t3f_10_13, taasta L3 ══════════════════════
UPDATE product_category SET deleted_at=NULL, is_active=true, updated_at=NOW() WHERE id='pcat_t3f_10_13';
INSERT INTO product_category_product (product_id, product_category_id) VALUES
  ('prod_01KNXX6BEZZ6DNJQMAZ8A4F8KQ','pcat_t3f_10_13'),
  ('prod_01KNXX68JBPHHJBJ6TDV5MGXAN','pcat_t3f_10_13'),
  ('prod_01KPJVB1H2578ZGM614X535MEJ','pcat_t3f_10_13'),
  ('prod_01KNXX864X8QJ4KVEP435AKY84','pcat_t3f_10_13'),
  ('prod_01KNXXGBT3A8P56DNFMNM4M898','pcat_t3f_10_13'),
  ('prod_01KNXX864X7MPR0G21D6609SN7','pcat_t3f_10_13'),
  ('prod_01KNXX865AQDCDKSP2WESNBXJ9','pcat_t3f_10_13'),
  ('prod_01KNXXGCPS3SG0FW9GP6HSJJYC','pcat_t3f_10_13') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_ag2_3x1_3'
  AND product_id IN ('prod_01KNXX6BEZZ6DNJQMAZ8A4F8KQ','prod_01KNXX68JBPHHJBJ6TDV5MGXAN');
DELETE FROM product_category_product WHERE product_category_id='pcat_t3f_10_15'
  AND product_id IN ('prod_01KPJVB1H2578ZGM614X535MEJ','prod_01KNXX864X8QJ4KVEP435AKY84',
    'prod_01KNXXGBT3A8P56DNFMNM4M898','prod_01KNXX864X7MPR0G21D6609SN7',
    'prod_01KNXX865AQDCDKSP2WESNBXJ9','prod_01KNXXGCPS3SG0FW9GP6HSJJYC');

-- ═══ #3 taasta: paagiga pump tagasi Pinnapumbad + vana kirjeldus ═══════════════
INSERT INTO product_category_product (product_id, product_category_id)
  VALUES ('prod_01KNXXGQ20Y4YRJWTPF8EBWZBZ','pcat_es_10x2_10') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXGQ20Y4YRJWTPF8EBWZBZ' AND product_category_id='pcat_es_10x2_11';
UPDATE product_category SET
  description = 'PIIRIREEGEL (ETAPP 2, 2026-10-07): A (santehnika, küte ja ventilatsioon) = kodumajapidamise sanitaar- ja küttetooted ning üldotstarbelised pumbad, mida ostja paigaldab kodusesse kööki/vannituppa või veesüsteemi. B (suurköögiseadmed) = kommerts- ja professionaalse köögi/toiduainetööstuse seadmed (restoranivalamud, mitmesektsioonilised letivalamud, toidutootmispumbad).',
  updated_at = NOW()
WHERE id = 'pcat_es_10x2_10';

-- ═══ 301 redirectid eemalda (manuaalselt — un-delete trigger neid ei kustuta) ══
DELETE FROM slug_redirect WHERE from_slug IN (
  'v4-jalgratta-trenazoorialused',
  'v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-vintsid');

COMMIT;
