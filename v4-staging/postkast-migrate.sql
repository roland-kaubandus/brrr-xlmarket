BEGIN;
-- Postkastid & pakiautomaadid L2 (välis-hoone-infra, mitte sisustusmööbel): Mööbel → Ehitus ja remont
UPDATE product_category SET parent_category_id='pcat_v4_l9', mpath='pcat_v4_l9.pcat_6mail', rank=18, updated_at=now() WHERE id='pcat_6mail';
UPDATE product_category SET mpath='pcat_v4_l9.pcat_6mail.pcat_6mail1', updated_at=now() WHERE id='pcat_6mail1';
COMMIT;
