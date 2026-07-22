-- new5-l3-meta-fix-migrate.sql — parandus: 5 uut L3 (956-import) puudusid taxonomy_node_meta-st.
-- JUUR: new5-l3-956-migrate.sql lõi product_category+mpath, aga JÄTTIS meta-rea lisamata →
--   meta-põhised tööriistad (whole-catalog spec-backfill, nav-gen) jätsid 20 toodet vahele.
-- Muster õdede järgi: level=3, status='active', source='manual', class=NULL, show_in_mega_menu=true.
-- Idempotentne: ON CONFLICT (node_id) DO NOTHING.
BEGIN;
INSERT INTO taxonomy_node_meta (node_id, level, status, source, show_in_mega_menu, product_count_cached, created_at, updated_at)
VALUES
  ('pcat_12fish_kahv',   3, 'active', 'manual', true, 0, now(), now()),
  ('pcat_12fish_pyynis', 3, 'active', 'manual', true, 0, now(), now()),
  ('pcat_22shelf_alus',  3, 'active', 'manual', true, 0, now(), now()),
  ('pcat_22cab_leke',    3, 'active', 'manual', true, 0, now(), now()),
  ('pcat_t3l2_9_sds',    3, 'active', 'manual', true, 0, now(), now())
ON CONFLICT (node_id) DO NOTHING;
COMMIT;
