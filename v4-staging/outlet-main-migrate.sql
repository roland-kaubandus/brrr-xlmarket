-- Outlet 26. L1-main (Tarmo 2026-07-20) — eraldi osakond tagastatud/rikutud-pakend kaubale.
-- FLAT (ei L2/L3 esialgu); tooted otse Outlet-maini all. Nav genereerib SSoT-st (genyM MAINS + gen-category-tree).
-- taxonomy_node_meta (level=1) OBLIGAATNE — indekseerija loeb level → taxonomy.l1_slug=v4-outlet.
BEGIN;

INSERT INTO product_category
  (id, name, description, handle, mpath, is_active, is_internal, rank, created_at, updated_at)
VALUES
  ('pcat_v4_l26', 'Outlet', '', 'v4-outlet', 'pcat_v4_l26', true, false, 26, now(), now());

INSERT INTO taxonomy_node_meta
  (node_id, level, status, source, show_in_mega_menu, product_count_cached, created_at, updated_at)
VALUES
  ('pcat_v4_l26', 1, 'active', 'manual', true, 0, now(), now());

COMMIT;
