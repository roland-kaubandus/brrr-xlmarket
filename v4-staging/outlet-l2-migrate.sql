-- Outlet L2-struktuur (Tarmo valik A, 2026-07-20): Outlet (v4-outlet, L1) alla 2 L2 →
-- järjekindel teiste mainidega, esilehe-tile täitub. Laiendatav (Väike defekt, Väljapanek).
-- + liiguta olemasolev Outlet-toode (tuulik, condition=rikutud_pakend) L1 alt → "Rikutud pakend" L2.
BEGIN;

-- 2 Outlet L2
INSERT INTO product_category
  (id, name, description, handle, mpath, is_active, is_internal, rank, parent_category_id, created_at, updated_at)
VALUES
  ('pcat_outlet_rp', 'Rikutud pakend', '', 'v4-outlet-rikutud-pakend', 'pcat_v4_l26.pcat_outlet_rp', true, false, 1, 'pcat_v4_l26', now(), now()),
  ('pcat_outlet_ap', 'Avatud pakend',  '', 'v4-outlet-avatud-pakend',  'pcat_v4_l26.pcat_outlet_ap', true, false, 2, 'pcat_v4_l26', now(), now());

INSERT INTO taxonomy_node_meta
  (node_id, level, status, source, show_in_mega_menu, product_count_cached, created_at, updated_at)
VALUES
  ('pcat_outlet_rp', 2, 'active', 'manual', true, 0, now(), now()),
  ('pcat_outlet_ap', 2, 'active', 'manual', true, 0, now(), now());

-- Liiguta Outlet-toode L1 (v4-outlet) → L2 (Rikutud pakend). Üks kodu (reegli-järgne).
UPDATE product_category_product
  SET product_category_id = 'pcat_outlet_rp'
  WHERE product_id = 'prod_01KY0H7DXS8MPZK51TQCS3ZJBE'
    AND product_category_id = 'pcat_v4_l26';

COMMIT;
