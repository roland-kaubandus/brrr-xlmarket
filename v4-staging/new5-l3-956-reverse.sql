-- new5-l3-956-reverse.sql — TAGASIPÖÖRE new5-l3-956-migrate.sql-ile.
-- ⚠️ Käivita AINULT kui tooted on juba nendest L3-dest lahti seotud (product_category_product tühi neile),
--    muidu FK-viide / kodutud tooted. Soovitatav taastamine: backups/k33g-pre-956-import-*.dump (täielik).

BEGIN;

-- eemalda toote-lingid nendele L3-dele (kui apply-956 jooksis)
DELETE FROM product_category_product
 WHERE product_category_id IN
   ('pcat_12fish_kahv','pcat_12fish_pyynis','pcat_22shelf_alus','pcat_22cab_leke','pcat_t3l2_9_sds');

DELETE FROM product_category
 WHERE id IN
   ('pcat_12fish_kahv','pcat_12fish_pyynis','pcat_22shelf_alus','pcat_22cab_leke','pcat_t3l2_9_sds');

COMMIT;
