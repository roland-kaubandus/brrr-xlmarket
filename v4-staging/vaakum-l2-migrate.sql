BEGIN;
-- Vaakumkambrid ja vaakumpumbad (16, resin/silikoon degassing) Kliima-hoolduse (Tööriistad) →
-- Hobi 'Ehte- ja metallitöö' (seotud-tüüp vaakumvalu-klastriga: Vaakumvalamismasinad + Sulatustiiglid).
-- ÖVER-FRAG GUARD: EI loo uut L2. AC-vaakumpumbad (41) JÄÄVAD Kliima-hooldusse (HVAC-domeen).
UPDATE product_category SET parent_category_id='pcat_25ehte',
  mpath='pcat_v4_l25.pcat_25ehte.pcat_ku1',
  rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_25ehte' AND deleted_at IS NULL),
  updated_at=now()
WHERE id='pcat_ku1';
COMMIT;
