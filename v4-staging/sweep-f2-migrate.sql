-- Sweep FAAS 2a: rename-mislabelid (#12 Zorb) + kirillitsa nime-vead (#7 ×2)
-- 2026-07-04 · STAGING taxonomy-v4 · SAMM 1+2 (SAMM 3 #11 raporteeritud, ootab otsust)
BEGIN;

-- SAMM 1: #12 mislabel — Zorb/põrkepallid (pole pesapalli-puurid)
UPDATE product_category
   SET name='Täispuhutavad põrke- ja Zorb-pallid',
       handle='v4-sport-ja-vaba-aeg-ouesport-ja-valimangud-taispuhutavad-porke-ja-zorb-pallid'
 WHERE id='pcat_el_12x1_16';

-- SAMM 2: #7 kirillitsa import-artefaktid -> ladina (nimi + katkine handle)
UPDATE product_category
   SET name='Välisdušid',
       handle='v4-aed-ja-aiatehnika-valisdusid'
 WHERE id='pcat_t3a_2_9';

UPDATE product_category
   SET name='Hoiukorvid & -kärud',
       handle='v4-aed-ja-aiatehnika-hoiukorvid-ja-karud'
 WHERE id='pcat_t3a_2_14';

COMMIT;
