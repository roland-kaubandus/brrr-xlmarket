BEGIN;
-- FAAS 3 NAV-JÄRJEKORD + NIMED + SLUGID LÕPLIKUKS (Tarmo 2026-07-19)
-- 1) maini rank 1-25
UPDATE product_category SET rank=1, updated_at=now() WHERE id='pcat_v4_l1';
UPDATE product_category SET rank=2, updated_at=now() WHERE id='pcat_v4_l2';
UPDATE product_category SET rank=3, updated_at=now() WHERE id='pcat_v4_l5';
UPDATE product_category SET rank=4, updated_at=now() WHERE id='pcat_v4_l4';
UPDATE product_category SET rank=5, updated_at=now() WHERE id='pcat_v4_l6';
UPDATE product_category SET rank=6, updated_at=now() WHERE id='pcat_v4_l7';
UPDATE product_category SET rank=7, updated_at=now() WHERE id='pcat_v4_l8';
UPDATE product_category SET rank=8, updated_at=now() WHERE id='pcat_v4_l3';
UPDATE product_category SET rank=9, updated_at=now() WHERE id='pcat_v4_l12';
UPDATE product_category SET rank=10, updated_at=now() WHERE id='pcat_v4_l9';
UPDATE product_category SET rank=11, updated_at=now() WHERE id='pcat_v4_l11';
UPDATE product_category SET rank=12, updated_at=now() WHERE id='pcat_v4_l10';
UPDATE product_category SET rank=13, updated_at=now() WHERE id='pcat_v4_l22';
UPDATE product_category SET rank=14, updated_at=now() WHERE id='pcat_v4_l21';
UPDATE product_category SET rank=15, updated_at=now() WHERE id='pcat_v4_l13';
UPDATE product_category SET rank=16, updated_at=now() WHERE id='pcat_v4_l23';
UPDATE product_category SET rank=17, updated_at=now() WHERE id='pcat_v4_l19';
UPDATE product_category SET rank=18, updated_at=now() WHERE id='pcat_v4_l20';
UPDATE product_category SET rank=19, updated_at=now() WHERE id='pcat_v4_l25';
UPDATE product_category SET rank=20, updated_at=now() WHERE id='pcat_v4_l24';
UPDATE product_category SET rank=21, updated_at=now() WHERE id='pcat_v4_l14';
UPDATE product_category SET rank=22, updated_at=now() WHERE id='pcat_v4_l18';
UPDATE product_category SET rank=23, updated_at=now() WHERE id='pcat_v4_l15';
UPDATE product_category SET rank=24, updated_at=now() WHERE id='pcat_v4_l16';
UPDATE product_category SET rank=25, updated_at=now() WHERE id='pcat_v4_l17';
-- 2) global & → ja (kõik tasandid: 4 maini + L2/L3)
UPDATE product_category SET name=replace(name,' & ',' ja '), updated_at=now() WHERE name LIKE '% & %' AND deleted_at IS NULL AND mpath LIKE 'pcat_v4_l%';
-- 3) 2 maini eksplitsiitne rename + handle
UPDATE product_category SET name='Garaažiseadmed ja autoremont', handle='v4-garaaziseadmed-ja-autoremont', updated_at=now() WHERE id='pcat_v4_l2';
UPDATE product_category SET name='Telgid, varjualused ja kasvuhooned', handle='v4-telgid-varjualused-ja-kasvuhooned', updated_at=now() WHERE id='pcat_v4_l8';
-- 4) 7 katkist handle → korralik v4- slug
UPDATE product_category SET handle='v4-kaasaskantavad-ruumisoojendid', updated_at=now() WHERE id='pcat_d9_1';
UPDATE product_category SET handle='v4-saunatarvikud', updated_at=now() WHERE id='pcat_saun_4';
UPDATE product_category SET handle='v4-varvimiskabiinid-ja-telgid', updated_at=now() WHERE id='pcat_vk2';
UPDATE product_category SET handle='v4-haagise-tarvikud', updated_at=now() WHERE id='pcat_a3h';
UPDATE product_category SET handle='v4-veoauto-kasti-tarvikud', updated_at=now() WHERE id='pcat_a3k';
UPDATE product_category SET handle='v4-auto-madratsid', updated_at=now() WHERE id='pcat_a3m';
UPDATE product_category SET handle='v4-saun', updated_at=now() WHERE id='pcat_saun';
COMMIT;
