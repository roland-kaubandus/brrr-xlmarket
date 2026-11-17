-- A4 INTRA-MAIN MISFIT — 38 kõrge-kindlusega toodet vales L3-s → õigesse L3-sse (sama main).
-- Allikas: reports/intra-qa-taisnimekiri.md (intra-qa-judge). Kõik DRY-verifitseeritud: siht-L3 olemas, sama L1.
-- PRODUCT-LINK-ONLY: 0 L3 lisatud/kustutatud/nimetatud → struktuur muutumatu → AINULT Meili reindeks (ei 301, ei push/redeploy).
-- Batch: a4-intra-qa-2026-11-17 · Undo: v4-staging/a4-intra-qa-2026-11-17-undo.sql
\set ON_ERROR_STOP on
BEGIN;
-- prod_01KNXX8FAKHPSHVXXHW9ETS1MV: Pneumaatilised tungrauad → Pudelitungrauad
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXX8FAKHPSHVXXHW9ETS1MV','pcat_ag2_2x3_3') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXX8FAKHPSHVXXHW9ETS1MV' AND product_category_id='pcat_ag2_2x3_1';
-- prod_01KNXXCEXQ5BN4FPW0GJ6S4DYX: Pneumaatilised tungrauad → Pudelitungrauad
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXCEXQ5BN4FPW0GJ6S4DYX','pcat_ag2_2x3_3') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXCEXQ5BN4FPW0GJ6S4DYX' AND product_category_id='pcat_ag2_2x3_1';
-- prod_01KNXXTF2XP4DS46731R3PMKFJ: Põrandatungrauad → Käigukastitungrauad
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXTF2XP4DS46731R3PMKFJ','pcat_ag2_2x3_8') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXTF2XP4DS46731R3PMKFJ' AND product_category_id='pcat_ag2_2x3_2';
-- prod_01KNXXTDC2JSDVSJ1DWAMXZZ1X: Põrandatungrauad → Käigukastitungrauad
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXTDC2JSDVSJ1DWAMXZZ1X','pcat_ag2_2x3_8') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXTDC2JSDVSJ1DWAMXZZ1X' AND product_category_id='pcat_ag2_2x3_2';
-- prod_01KNXXQQ1VE5ZPJP7SFNQY1HF2: Kiiged → Kiikautud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXQQ1VE5ZPJP7SFNQY1HF2','pcat_24seesaw') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXQQ1VE5ZPJP7SFNQY1HF2' AND product_category_id='pcat_el_12x2_6';
-- prod_01KNXXQ5X97DSY47RAEHRRAM5F: Kiiged → Kiikautud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXQ5X97DSY47RAEHRRAM5F','pcat_24seesaw') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXQ5X97DSY47RAEHRRAM5F' AND product_category_id='pcat_el_12x2_6';
-- prod_01KNXXPWVM8XPFB6HEPA7M58ZD: Kiiged → Kiikautud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXPWVM8XPFB6HEPA7M58ZD','pcat_24seesaw') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXPWVM8XPFB6HEPA7M58ZD' AND product_category_id='pcat_el_12x2_6';
-- prod_01KNXXPT8CKYN72T51BTF629CD: Kiiged → Kiikautud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXPT8CKYN72T51BTF629CD','pcat_24seesaw') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXPT8CKYN72T51BTF629CD' AND product_category_id='pcat_el_12x2_6';
-- prod_01KNXXPW0282T1YX3HC5W8731P: Kiiged → Kiikautud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXPW0282T1YX3HC5W8731P','pcat_24seesaw') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXPW0282T1YX3HC5W8731P' AND product_category_id='pcat_el_12x2_6';
-- prod_01KNXXQMAMHQDH3TGCMP4KJX2J: Kiiged → Kiikautud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXQMAMHQDH3TGCMP4KJX2J','pcat_24seesaw') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXQMAMHQDH3TGCMP4KJX2J' AND product_category_id='pcat_el_12x2_6';
-- prod_01KNXXN4ZFS602JEZKQFSFG9TX: Käsikärud → Pagasikärud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXN4ZFS602JEZKQFSFG9TX','pcat_1pagas') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXN4ZFS602JEZKQFSFG9TX' AND product_category_id='pcat_tk1_1';
-- prod_01M5K4MPP5TFMZYK48RXZFS58G: Vaakumtõstevahendid → Plaadikandjad ja -klambrid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01M5K4MPP5TFMZYK48RXZFS58G','pcat_t3f_10_9') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01M5K4MPP5TFMZYK48RXZFS58G' AND product_category_id='pcat_t3f_10_14';
-- prod_01KNXXAX67R18FZKA9XTE0MFAN: Katalüsaatorid → Heitgaasi- ja väljalaskesüsteemid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXAX67R18FZKA9XTE0MFAN','pcat_ag2_3x4_7') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXAX67R18FZKA9XTE0MFAN' AND product_category_id='pcat_ag2_3x4_8';
-- prod_01KNXX928DQNX72DTK3MQZ8FB7: Katalüsaatorid → Heitgaasi- ja väljalaskesüsteemid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXX928DQNX72DTK3MQZ8FB7','pcat_ag2_3x4_7') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXX928DQNX72DTK3MQZ8FB7' AND product_category_id='pcat_ag2_3x4_8';
-- prod_01KNXXE1BHGYXT21D8YCVDEV65: Kassipuud → Kassi küünistuskaitsed
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXE1BHGYXT21D8YCVDEV65','pcat_lp_2_9') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXE1BHGYXT21D8YCVDEV65' AND product_category_id='pcat_lp_6_dedup';
-- prod_01KNXXNHMZ7NNA6SE6PEJD04W5: Koera ratastoolid ja liikumisabi → Koera ortopeedilised toed
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXNHMZ7NNA6SE6PEJD04W5','pcat_lp_2_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXNHMZ7NNA6SE6PEJD04W5' AND product_category_id='pcat_14dogwheel';
-- prod_01KNXXNHM6T8W3V49P8DHTY0PZ: Koera ratastoolid ja liikumisabi → Koera ortopeedilised toed
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXNHM6T8W3V49P8DHTY0PZ','pcat_lp_2_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXNHM6T8W3V49P8DHTY0PZ' AND product_category_id='pcat_14dogwheel';
-- prod_01KNXXNHM4DSZAWY43BY5THWC7: Koera ratastoolid ja liikumisabi → Koera ortopeedilised toed
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXNHM4DSZAWY43BY5THWC7','pcat_lp_2_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXNHM4DSZAWY43BY5THWC7' AND product_category_id='pcat_14dogwheel';
-- prod_01KNXXNGQXJEWD15G3NAQQF2BK: Koera ratastoolid ja liikumisabi → Koera ortopeedilised toed
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXNGQXJEWD15G3NAQQF2BK','pcat_lp_2_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXNGQXJEWD15G3NAQQF2BK' AND product_category_id='pcat_14dogwheel';
-- prod_01KNXXEN1CWTDK3TEXXB1V151N: Mänguplatsid ja aedikud → Lemmiklooma-väravad
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXEN1CWTDK3TEXXB1V151N','pcat_lp_1_2') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXEN1CWTDK3TEXXB1V151N' AND product_category_id='pcat_lp_1_5';
-- prod_01KNXXE8HYFTBNBS49BK1YBF1B: Mänguplatsid ja aedikud → Lemmiklooma-väravad
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXE8HYFTBNBS49BK1YBF1B','pcat_lp_1_2') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXE8HYFTBNBS49BK1YBF1B' AND product_category_id='pcat_lp_1_5';
-- prod_01KNXXAFPD6RM4R1VKZT74SR5T: Kukkumiskaitsevahendid ja voodialarmid → Voodipiirded ja tugiraamid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXAFPD6RM4R1VKZT74SR5T','pcat_f4_16x1_9') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXAFPD6RM4R1VKZT74SR5T' AND product_category_id='pcat_f4_16x2_9';
-- prod_01KP6FFECY7SPR915CKFQ9QPTJ: Kontoritoolid → Põlvitustoolid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KP6FFECY7SPR915CKFQ9QPTJ','pcat_e2_kneelingchairs') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KP6FFECY7SPR915CKFQ9QPTJ' AND product_category_id='pcat_mv_6x3_5';
-- prod_01KP6FFVJ3ZXNPQKS1WEX7WW1G: Kontoritoolid → Põlvitustoolid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KP6FFVJ3ZXNPQKS1WEX7WW1G','pcat_e2_kneelingchairs') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KP6FFVJ3ZXNPQKS1WEX7WW1G' AND product_category_id='pcat_mv_6x3_5';
-- prod_01KNXXPKZ3VQQ2CDRDGR9V91CD: Laste toolid ja istmed → Laste lamamistoolid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXPKZ3VQQ2CDRDGR9V91CD','pcat_mv_6x7_1') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXPKZ3VQQ2CDRDGR9V91CD' AND product_category_id='pcat_mv_6x7_6';
-- prod_01KQC7G59MK3YJSR3D1M0930F4: Kasvuhooned → Tunnelkasvuhooned
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KQC7G59MK3YJSR3D1M0930F4','pcat_mv_8x4_1') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KQC7G59MK3YJSR3D1M0930F4' AND product_category_id='pcat_mv_8x4_2';
-- prod_01KNXX7QRXV1GSRYDFRQ03GBJS: Kasvuhooned → Tunnelkasvuhooned
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXX7QRXV1GSRYDFRQ03GBJS','pcat_mv_8x4_1') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXX7QRXV1GSRYDFRQ03GBJS' AND product_category_id='pcat_mv_8x4_2';
-- prod_01KNXXKP10DQBJ06C8J4T4HFNS: Rannatelgid ja -varjualused → Matka- ja telkimistelgid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXKP10DQBJ06C8J4T4HFNS','pcat_8camp') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXKP10DQBJ06C8J4T4HFNS' AND product_category_id='pcat_mv_8x2_1';
-- prod_01KP6FEZ6Z3P43KMMS3SJ4HQ76: Rannatelgid ja -varjualused → Matka- ja telkimistelgid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KP6FEZ6Z3P43KMMS3SJ4HQ76','pcat_8camp') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KP6FEZ6Z3P43KMMS3SJ4HQ76' AND product_category_id='pcat_mv_8x2_1';
-- prod_01KNXXD2MG1XNHGSXPV4MR00Y3: Pillitarvikud → Trummikomplektid ja -tarvikud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXD2MG1XNHGSXPV4MR00Y3','pcat_mu_1_3') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXD2MG1XNHGSXPV4MR00Y3' AND product_category_id='pcat_mu_1_5';
-- prod_01KPJXCHN5V68F1P1D5F5Q0Y39: Pillitarvikud → Trummikomplektid ja -tarvikud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KPJXCHN5V68F1P1D5F5Q0Y39','pcat_mu_1_3') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KPJXCHN5V68F1P1D5F5Q0Y39' AND product_category_id='pcat_mu_1_5';
-- prod_01KPJXC6FA56DC9RY3RH6G7XYF: Pillitarvikud → Trummikomplektid ja -tarvikud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KPJXC6FA56DC9RY3RH6G7XYF','pcat_mu_1_3') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KPJXC6FA56DC9RY3RH6G7XYF' AND product_category_id='pcat_mu_1_5';
-- prod_01KNXXD91QYYFCDV02DDMBMM6A: Pillitarvikud → Trummikomplektid ja -tarvikud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXD91QYYFCDV02DDMBMM6A','pcat_mu_1_3') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXD91QYYFCDV02DDMBMM6A' AND product_category_id='pcat_mu_1_5';
-- prod_01KPJXC74EEZHE7WQ4WZZRXXCB: Pillitarvikud → Trummikomplektid ja -tarvikud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KPJXC74EEZHE7WQ4WZZRXXCB','pcat_mu_1_3') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KPJXC74EEZHE7WQ4WZZRXXCB' AND product_category_id='pcat_mu_1_5';
-- prod_01KNXXPCVEKW961MKKEFNK01HM: Vaibaalused ja aluskatted → Tooli- ja seadmekaitsematid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXPCVEKW961MKKEFNK01HM','pcat_es_9x1_12') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXPCVEKW961MKKEFNK01HM' AND product_category_id='pcat_es_9x1_3';
-- prod_01KP6FDNEMSDFRC490DTNFZHCZ: Jalgratta kotid ja korvid → Jalgratta transpordikotid ja -kohvrid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KP6FDNEMSDFRC490DTNFZHCZ','pcat_e2_biketravelbagscases') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KP6FDNEMSDFRC490DTNFZHCZ' AND product_category_id='pcat_el_12x11_4';
-- prod_01M2Y5BBPQM3AM7XT93K2BY89K: Seinapehmendused → Täispuhutavad põrke- ja Zorb-pallid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01M2Y5BBPQM3AM7XT93K2BY89K','pcat_el_12x1_16') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01M2Y5BBPQM3AM7XT93K2BY89K' AND product_category_id='pcat_12seina';
-- prod_01KNXX9D8W5X9B6ZBD0ZYHX5C0: Pulmakaared ja lilledekoor → Pulma-lillestatiivid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXX9D8W5X9B6ZBD0ZYHX5C0','pcat_mv_6x1_13') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXX9D8W5X9B6ZBD0ZYHX5C0' AND product_category_id='pcat_mv_6x1_14';

-- GUARD: iga toode nüüd siht-L3-s ja mitte enam allika-L3-s
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXX8FAKHPSHVXXHW9ETS1MV' AND product_category_id='pcat_ag2_2x3_3') THEN RAISE EXCEPTION 'GUARD: prod_01KNXX8FAKHPSHVXXHW9ETS1MV puudub sihist pcat_ag2_2x3_3'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXX8FAKHPSHVXXHW9ETS1MV' AND product_category_id='pcat_ag2_2x3_1') THEN RAISE EXCEPTION 'GUARD: prod_01KNXX8FAKHPSHVXXHW9ETS1MV veel allikas pcat_ag2_2x3_1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXCEXQ5BN4FPW0GJ6S4DYX' AND product_category_id='pcat_ag2_2x3_3') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXCEXQ5BN4FPW0GJ6S4DYX puudub sihist pcat_ag2_2x3_3'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXCEXQ5BN4FPW0GJ6S4DYX' AND product_category_id='pcat_ag2_2x3_1') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXCEXQ5BN4FPW0GJ6S4DYX veel allikas pcat_ag2_2x3_1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXTF2XP4DS46731R3PMKFJ' AND product_category_id='pcat_ag2_2x3_8') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXTF2XP4DS46731R3PMKFJ puudub sihist pcat_ag2_2x3_8'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXTF2XP4DS46731R3PMKFJ' AND product_category_id='pcat_ag2_2x3_2') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXTF2XP4DS46731R3PMKFJ veel allikas pcat_ag2_2x3_2'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXTDC2JSDVSJ1DWAMXZZ1X' AND product_category_id='pcat_ag2_2x3_8') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXTDC2JSDVSJ1DWAMXZZ1X puudub sihist pcat_ag2_2x3_8'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXTDC2JSDVSJ1DWAMXZZ1X' AND product_category_id='pcat_ag2_2x3_2') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXTDC2JSDVSJ1DWAMXZZ1X veel allikas pcat_ag2_2x3_2'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXQQ1VE5ZPJP7SFNQY1HF2' AND product_category_id='pcat_24seesaw') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXQQ1VE5ZPJP7SFNQY1HF2 puudub sihist pcat_24seesaw'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXQQ1VE5ZPJP7SFNQY1HF2' AND product_category_id='pcat_el_12x2_6') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXQQ1VE5ZPJP7SFNQY1HF2 veel allikas pcat_el_12x2_6'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXQ5X97DSY47RAEHRRAM5F' AND product_category_id='pcat_24seesaw') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXQ5X97DSY47RAEHRRAM5F puudub sihist pcat_24seesaw'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXQ5X97DSY47RAEHRRAM5F' AND product_category_id='pcat_el_12x2_6') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXQ5X97DSY47RAEHRRAM5F veel allikas pcat_el_12x2_6'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXPWVM8XPFB6HEPA7M58ZD' AND product_category_id='pcat_24seesaw') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXPWVM8XPFB6HEPA7M58ZD puudub sihist pcat_24seesaw'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXPWVM8XPFB6HEPA7M58ZD' AND product_category_id='pcat_el_12x2_6') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXPWVM8XPFB6HEPA7M58ZD veel allikas pcat_el_12x2_6'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXPT8CKYN72T51BTF629CD' AND product_category_id='pcat_24seesaw') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXPT8CKYN72T51BTF629CD puudub sihist pcat_24seesaw'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXPT8CKYN72T51BTF629CD' AND product_category_id='pcat_el_12x2_6') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXPT8CKYN72T51BTF629CD veel allikas pcat_el_12x2_6'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXPW0282T1YX3HC5W8731P' AND product_category_id='pcat_24seesaw') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXPW0282T1YX3HC5W8731P puudub sihist pcat_24seesaw'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXPW0282T1YX3HC5W8731P' AND product_category_id='pcat_el_12x2_6') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXPW0282T1YX3HC5W8731P veel allikas pcat_el_12x2_6'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXQMAMHQDH3TGCMP4KJX2J' AND product_category_id='pcat_24seesaw') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXQMAMHQDH3TGCMP4KJX2J puudub sihist pcat_24seesaw'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXQMAMHQDH3TGCMP4KJX2J' AND product_category_id='pcat_el_12x2_6') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXQMAMHQDH3TGCMP4KJX2J veel allikas pcat_el_12x2_6'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXN4ZFS602JEZKQFSFG9TX' AND product_category_id='pcat_1pagas') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXN4ZFS602JEZKQFSFG9TX puudub sihist pcat_1pagas'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXN4ZFS602JEZKQFSFG9TX' AND product_category_id='pcat_tk1_1') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXN4ZFS602JEZKQFSFG9TX veel allikas pcat_tk1_1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01M5K4MPP5TFMZYK48RXZFS58G' AND product_category_id='pcat_t3f_10_9') THEN RAISE EXCEPTION 'GUARD: prod_01M5K4MPP5TFMZYK48RXZFS58G puudub sihist pcat_t3f_10_9'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01M5K4MPP5TFMZYK48RXZFS58G' AND product_category_id='pcat_t3f_10_14') THEN RAISE EXCEPTION 'GUARD: prod_01M5K4MPP5TFMZYK48RXZFS58G veel allikas pcat_t3f_10_14'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXAX67R18FZKA9XTE0MFAN' AND product_category_id='pcat_ag2_3x4_7') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXAX67R18FZKA9XTE0MFAN puudub sihist pcat_ag2_3x4_7'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXAX67R18FZKA9XTE0MFAN' AND product_category_id='pcat_ag2_3x4_8') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXAX67R18FZKA9XTE0MFAN veel allikas pcat_ag2_3x4_8'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXX928DQNX72DTK3MQZ8FB7' AND product_category_id='pcat_ag2_3x4_7') THEN RAISE EXCEPTION 'GUARD: prod_01KNXX928DQNX72DTK3MQZ8FB7 puudub sihist pcat_ag2_3x4_7'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXX928DQNX72DTK3MQZ8FB7' AND product_category_id='pcat_ag2_3x4_8') THEN RAISE EXCEPTION 'GUARD: prod_01KNXX928DQNX72DTK3MQZ8FB7 veel allikas pcat_ag2_3x4_8'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXE1BHGYXT21D8YCVDEV65' AND product_category_id='pcat_lp_2_9') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXE1BHGYXT21D8YCVDEV65 puudub sihist pcat_lp_2_9'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXE1BHGYXT21D8YCVDEV65' AND product_category_id='pcat_lp_6_dedup') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXE1BHGYXT21D8YCVDEV65 veel allikas pcat_lp_6_dedup'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXNHMZ7NNA6SE6PEJD04W5' AND product_category_id='pcat_lp_2_5') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXNHMZ7NNA6SE6PEJD04W5 puudub sihist pcat_lp_2_5'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXNHMZ7NNA6SE6PEJD04W5' AND product_category_id='pcat_14dogwheel') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXNHMZ7NNA6SE6PEJD04W5 veel allikas pcat_14dogwheel'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXNHM6T8W3V49P8DHTY0PZ' AND product_category_id='pcat_lp_2_5') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXNHM6T8W3V49P8DHTY0PZ puudub sihist pcat_lp_2_5'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXNHM6T8W3V49P8DHTY0PZ' AND product_category_id='pcat_14dogwheel') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXNHM6T8W3V49P8DHTY0PZ veel allikas pcat_14dogwheel'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXNHM4DSZAWY43BY5THWC7' AND product_category_id='pcat_lp_2_5') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXNHM4DSZAWY43BY5THWC7 puudub sihist pcat_lp_2_5'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXNHM4DSZAWY43BY5THWC7' AND product_category_id='pcat_14dogwheel') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXNHM4DSZAWY43BY5THWC7 veel allikas pcat_14dogwheel'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXNGQXJEWD15G3NAQQF2BK' AND product_category_id='pcat_lp_2_5') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXNGQXJEWD15G3NAQQF2BK puudub sihist pcat_lp_2_5'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXNGQXJEWD15G3NAQQF2BK' AND product_category_id='pcat_14dogwheel') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXNGQXJEWD15G3NAQQF2BK veel allikas pcat_14dogwheel'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXEN1CWTDK3TEXXB1V151N' AND product_category_id='pcat_lp_1_2') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXEN1CWTDK3TEXXB1V151N puudub sihist pcat_lp_1_2'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXEN1CWTDK3TEXXB1V151N' AND product_category_id='pcat_lp_1_5') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXEN1CWTDK3TEXXB1V151N veel allikas pcat_lp_1_5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXE8HYFTBNBS49BK1YBF1B' AND product_category_id='pcat_lp_1_2') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXE8HYFTBNBS49BK1YBF1B puudub sihist pcat_lp_1_2'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXE8HYFTBNBS49BK1YBF1B' AND product_category_id='pcat_lp_1_5') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXE8HYFTBNBS49BK1YBF1B veel allikas pcat_lp_1_5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXAFPD6RM4R1VKZT74SR5T' AND product_category_id='pcat_f4_16x1_9') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXAFPD6RM4R1VKZT74SR5T puudub sihist pcat_f4_16x1_9'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXAFPD6RM4R1VKZT74SR5T' AND product_category_id='pcat_f4_16x2_9') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXAFPD6RM4R1VKZT74SR5T veel allikas pcat_f4_16x2_9'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KP6FFECY7SPR915CKFQ9QPTJ' AND product_category_id='pcat_e2_kneelingchairs') THEN RAISE EXCEPTION 'GUARD: prod_01KP6FFECY7SPR915CKFQ9QPTJ puudub sihist pcat_e2_kneelingchairs'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KP6FFECY7SPR915CKFQ9QPTJ' AND product_category_id='pcat_mv_6x3_5') THEN RAISE EXCEPTION 'GUARD: prod_01KP6FFECY7SPR915CKFQ9QPTJ veel allikas pcat_mv_6x3_5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KP6FFVJ3ZXNPQKS1WEX7WW1G' AND product_category_id='pcat_e2_kneelingchairs') THEN RAISE EXCEPTION 'GUARD: prod_01KP6FFVJ3ZXNPQKS1WEX7WW1G puudub sihist pcat_e2_kneelingchairs'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KP6FFVJ3ZXNPQKS1WEX7WW1G' AND product_category_id='pcat_mv_6x3_5') THEN RAISE EXCEPTION 'GUARD: prod_01KP6FFVJ3ZXNPQKS1WEX7WW1G veel allikas pcat_mv_6x3_5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXPKZ3VQQ2CDRDGR9V91CD' AND product_category_id='pcat_mv_6x7_1') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXPKZ3VQQ2CDRDGR9V91CD puudub sihist pcat_mv_6x7_1'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXPKZ3VQQ2CDRDGR9V91CD' AND product_category_id='pcat_mv_6x7_6') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXPKZ3VQQ2CDRDGR9V91CD veel allikas pcat_mv_6x7_6'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KQC7G59MK3YJSR3D1M0930F4' AND product_category_id='pcat_mv_8x4_1') THEN RAISE EXCEPTION 'GUARD: prod_01KQC7G59MK3YJSR3D1M0930F4 puudub sihist pcat_mv_8x4_1'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KQC7G59MK3YJSR3D1M0930F4' AND product_category_id='pcat_mv_8x4_2') THEN RAISE EXCEPTION 'GUARD: prod_01KQC7G59MK3YJSR3D1M0930F4 veel allikas pcat_mv_8x4_2'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXX7QRXV1GSRYDFRQ03GBJS' AND product_category_id='pcat_mv_8x4_1') THEN RAISE EXCEPTION 'GUARD: prod_01KNXX7QRXV1GSRYDFRQ03GBJS puudub sihist pcat_mv_8x4_1'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXX7QRXV1GSRYDFRQ03GBJS' AND product_category_id='pcat_mv_8x4_2') THEN RAISE EXCEPTION 'GUARD: prod_01KNXX7QRXV1GSRYDFRQ03GBJS veel allikas pcat_mv_8x4_2'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXKP10DQBJ06C8J4T4HFNS' AND product_category_id='pcat_8camp') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXKP10DQBJ06C8J4T4HFNS puudub sihist pcat_8camp'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXKP10DQBJ06C8J4T4HFNS' AND product_category_id='pcat_mv_8x2_1') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXKP10DQBJ06C8J4T4HFNS veel allikas pcat_mv_8x2_1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KP6FEZ6Z3P43KMMS3SJ4HQ76' AND product_category_id='pcat_8camp') THEN RAISE EXCEPTION 'GUARD: prod_01KP6FEZ6Z3P43KMMS3SJ4HQ76 puudub sihist pcat_8camp'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KP6FEZ6Z3P43KMMS3SJ4HQ76' AND product_category_id='pcat_mv_8x2_1') THEN RAISE EXCEPTION 'GUARD: prod_01KP6FEZ6Z3P43KMMS3SJ4HQ76 veel allikas pcat_mv_8x2_1'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXD2MG1XNHGSXPV4MR00Y3' AND product_category_id='pcat_mu_1_3') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXD2MG1XNHGSXPV4MR00Y3 puudub sihist pcat_mu_1_3'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXD2MG1XNHGSXPV4MR00Y3' AND product_category_id='pcat_mu_1_5') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXD2MG1XNHGSXPV4MR00Y3 veel allikas pcat_mu_1_5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KPJXCHN5V68F1P1D5F5Q0Y39' AND product_category_id='pcat_mu_1_3') THEN RAISE EXCEPTION 'GUARD: prod_01KPJXCHN5V68F1P1D5F5Q0Y39 puudub sihist pcat_mu_1_3'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KPJXCHN5V68F1P1D5F5Q0Y39' AND product_category_id='pcat_mu_1_5') THEN RAISE EXCEPTION 'GUARD: prod_01KPJXCHN5V68F1P1D5F5Q0Y39 veel allikas pcat_mu_1_5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KPJXC6FA56DC9RY3RH6G7XYF' AND product_category_id='pcat_mu_1_3') THEN RAISE EXCEPTION 'GUARD: prod_01KPJXC6FA56DC9RY3RH6G7XYF puudub sihist pcat_mu_1_3'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KPJXC6FA56DC9RY3RH6G7XYF' AND product_category_id='pcat_mu_1_5') THEN RAISE EXCEPTION 'GUARD: prod_01KPJXC6FA56DC9RY3RH6G7XYF veel allikas pcat_mu_1_5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXD91QYYFCDV02DDMBMM6A' AND product_category_id='pcat_mu_1_3') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXD91QYYFCDV02DDMBMM6A puudub sihist pcat_mu_1_3'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXD91QYYFCDV02DDMBMM6A' AND product_category_id='pcat_mu_1_5') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXD91QYYFCDV02DDMBMM6A veel allikas pcat_mu_1_5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KPJXC74EEZHE7WQ4WZZRXXCB' AND product_category_id='pcat_mu_1_3') THEN RAISE EXCEPTION 'GUARD: prod_01KPJXC74EEZHE7WQ4WZZRXXCB puudub sihist pcat_mu_1_3'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KPJXC74EEZHE7WQ4WZZRXXCB' AND product_category_id='pcat_mu_1_5') THEN RAISE EXCEPTION 'GUARD: prod_01KPJXC74EEZHE7WQ4WZZRXXCB veel allikas pcat_mu_1_5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXPCVEKW961MKKEFNK01HM' AND product_category_id='pcat_es_9x1_12') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXPCVEKW961MKKEFNK01HM puudub sihist pcat_es_9x1_12'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXXPCVEKW961MKKEFNK01HM' AND product_category_id='pcat_es_9x1_3') THEN RAISE EXCEPTION 'GUARD: prod_01KNXXPCVEKW961MKKEFNK01HM veel allikas pcat_es_9x1_3'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KP6FDNEMSDFRC490DTNFZHCZ' AND product_category_id='pcat_e2_biketravelbagscases') THEN RAISE EXCEPTION 'GUARD: prod_01KP6FDNEMSDFRC490DTNFZHCZ puudub sihist pcat_e2_biketravelbagscases'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KP6FDNEMSDFRC490DTNFZHCZ' AND product_category_id='pcat_el_12x11_4') THEN RAISE EXCEPTION 'GUARD: prod_01KP6FDNEMSDFRC490DTNFZHCZ veel allikas pcat_el_12x11_4'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01M2Y5BBPQM3AM7XT93K2BY89K' AND product_category_id='pcat_el_12x1_16') THEN RAISE EXCEPTION 'GUARD: prod_01M2Y5BBPQM3AM7XT93K2BY89K puudub sihist pcat_el_12x1_16'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01M2Y5BBPQM3AM7XT93K2BY89K' AND product_category_id='pcat_12seina') THEN RAISE EXCEPTION 'GUARD: prod_01M2Y5BBPQM3AM7XT93K2BY89K veel allikas pcat_12seina'; END IF;
  IF NOT EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXX9D8W5X9B6ZBD0ZYHX5C0' AND product_category_id='pcat_mv_6x1_13') THEN RAISE EXCEPTION 'GUARD: prod_01KNXX9D8W5X9B6ZBD0ZYHX5C0 puudub sihist pcat_mv_6x1_13'; END IF;
  IF EXISTS (SELECT 1 FROM product_category_product WHERE product_id='prod_01KNXX9D8W5X9B6ZBD0ZYHX5C0' AND product_category_id='pcat_mv_6x1_14') THEN RAISE EXCEPTION 'GUARD: prod_01KNXX9D8W5X9B6ZBD0ZYHX5C0 veel allikas pcat_mv_6x1_14'; END IF;
END $$;
COMMIT;
