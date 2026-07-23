-- #3 auto-elekter L2: aku-L2 rename
BEGIN;
UPDATE product_category SET name='Akud, Laadijad & Tarvikud', handle='v4-autovaruosad-akud-laadijad-tarvikud' WHERE id='pcat_v4_l3_8';
COMMIT;
