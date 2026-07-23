-- FAAS 4 viimane: #10 boilerid-L2 → Dušisüsteemid
BEGIN;
-- SAMM 1: reparent L3 Elektrilised veesoojendid -> Dušisüsteemid & dušikabiinid
UPDATE product_category SET parent_category_id='pcat_v4_l10_7', mpath='pcat_v4_l10.pcat_v4_l10_7.pcat_10vs' WHERE id='pcat_10vs';
-- SAMM 2: kustuta õhuke L2 Veesoojendid & boilerid
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_10boil';
UPDATE product_category SET deleted_at=now(), is_active=false WHERE id='pcat_10boil';
COMMIT;
