-- A4 INTRA-MAIN MISFIT — UNDO (batch a4-intra-qa-2026-11-17). Taasta algseis: lingi tagasi allikasse, eemalda sihust.
-- NB: tooted mis olid ENNE juba sihus (tgtPre=true) — sihu-linki EI eemaldata (oli olemas).
\set ON_ERROR_STOP on
BEGIN;
-- prod_01KNXX8FAKHPSHVXXHW9ETS1MV: tagasi Pudelitungrauad → Pneumaatilised tungrauad
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXX8FAKHPSHVXXHW9ETS1MV','pcat_ag2_2x3_1') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXX8FAKHPSHVXXHW9ETS1MV' AND product_category_id='pcat_ag2_2x3_3';
-- prod_01KNXXCEXQ5BN4FPW0GJ6S4DYX: tagasi Pudelitungrauad → Pneumaatilised tungrauad
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXCEXQ5BN4FPW0GJ6S4DYX','pcat_ag2_2x3_1') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXCEXQ5BN4FPW0GJ6S4DYX' AND product_category_id='pcat_ag2_2x3_3';
-- prod_01KNXXTF2XP4DS46731R3PMKFJ: tagasi Käigukastitungrauad → Põrandatungrauad
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXTF2XP4DS46731R3PMKFJ','pcat_ag2_2x3_2') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXTF2XP4DS46731R3PMKFJ' AND product_category_id='pcat_ag2_2x3_8';
-- prod_01KNXXTDC2JSDVSJ1DWAMXZZ1X: tagasi Käigukastitungrauad → Põrandatungrauad
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXTDC2JSDVSJ1DWAMXZZ1X','pcat_ag2_2x3_2') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXTDC2JSDVSJ1DWAMXZZ1X' AND product_category_id='pcat_ag2_2x3_8';
-- prod_01KNXXQQ1VE5ZPJP7SFNQY1HF2: tagasi Kiikautud → Kiiged
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXQQ1VE5ZPJP7SFNQY1HF2','pcat_el_12x2_6') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXQQ1VE5ZPJP7SFNQY1HF2' AND product_category_id='pcat_24seesaw';
-- prod_01KNXXQ5X97DSY47RAEHRRAM5F: tagasi Kiikautud → Kiiged
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXQ5X97DSY47RAEHRRAM5F','pcat_el_12x2_6') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXQ5X97DSY47RAEHRRAM5F' AND product_category_id='pcat_24seesaw';
-- prod_01KNXXPWVM8XPFB6HEPA7M58ZD: tagasi Kiikautud → Kiiged
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXPWVM8XPFB6HEPA7M58ZD','pcat_el_12x2_6') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXPWVM8XPFB6HEPA7M58ZD' AND product_category_id='pcat_24seesaw';
-- prod_01KNXXPT8CKYN72T51BTF629CD: tagasi Kiikautud → Kiiged
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXPT8CKYN72T51BTF629CD','pcat_el_12x2_6') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXPT8CKYN72T51BTF629CD' AND product_category_id='pcat_24seesaw';
-- prod_01KNXXPW0282T1YX3HC5W8731P: tagasi Kiikautud → Kiiged
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXPW0282T1YX3HC5W8731P','pcat_el_12x2_6') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXPW0282T1YX3HC5W8731P' AND product_category_id='pcat_24seesaw';
-- prod_01KNXXQMAMHQDH3TGCMP4KJX2J: tagasi Kiikautud → Kiiged
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXQMAMHQDH3TGCMP4KJX2J','pcat_el_12x2_6') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXQMAMHQDH3TGCMP4KJX2J' AND product_category_id='pcat_24seesaw';
-- prod_01KNXXN4ZFS602JEZKQFSFG9TX: tagasi Pagasikärud → Käsikärud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXN4ZFS602JEZKQFSFG9TX','pcat_tk1_1') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXN4ZFS602JEZKQFSFG9TX' AND product_category_id='pcat_1pagas';
-- prod_01M5K4MPP5TFMZYK48RXZFS58G: tagasi Plaadikandjad ja -klambrid → Vaakumtõstevahendid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01M5K4MPP5TFMZYK48RXZFS58G','pcat_t3f_10_14') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01M5K4MPP5TFMZYK48RXZFS58G' AND product_category_id='pcat_t3f_10_9';
-- prod_01KNXXAX67R18FZKA9XTE0MFAN: tagasi Heitgaasi- ja väljalaskesüsteemid → Katalüsaatorid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXAX67R18FZKA9XTE0MFAN','pcat_ag2_3x4_8') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXAX67R18FZKA9XTE0MFAN' AND product_category_id='pcat_ag2_3x4_7';
-- prod_01KNXX928DQNX72DTK3MQZ8FB7: tagasi Heitgaasi- ja väljalaskesüsteemid → Katalüsaatorid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXX928DQNX72DTK3MQZ8FB7','pcat_ag2_3x4_8') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXX928DQNX72DTK3MQZ8FB7' AND product_category_id='pcat_ag2_3x4_7';
-- prod_01KNXXE1BHGYXT21D8YCVDEV65: tagasi Kassi küünistuskaitsed → Kassipuud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXE1BHGYXT21D8YCVDEV65','pcat_lp_6_dedup') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXE1BHGYXT21D8YCVDEV65' AND product_category_id='pcat_lp_2_9';
-- prod_01KNXXNHMZ7NNA6SE6PEJD04W5: tagasi Koera ortopeedilised toed → Koera ratastoolid ja liikumisabi
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXNHMZ7NNA6SE6PEJD04W5','pcat_14dogwheel') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXNHMZ7NNA6SE6PEJD04W5' AND product_category_id='pcat_lp_2_5';
-- prod_01KNXXNHM6T8W3V49P8DHTY0PZ: tagasi Koera ortopeedilised toed → Koera ratastoolid ja liikumisabi
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXNHM6T8W3V49P8DHTY0PZ','pcat_14dogwheel') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXNHM6T8W3V49P8DHTY0PZ' AND product_category_id='pcat_lp_2_5';
-- prod_01KNXXNHM4DSZAWY43BY5THWC7: tagasi Koera ortopeedilised toed → Koera ratastoolid ja liikumisabi
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXNHM4DSZAWY43BY5THWC7','pcat_14dogwheel') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXNHM4DSZAWY43BY5THWC7' AND product_category_id='pcat_lp_2_5';
-- prod_01KNXXNGQXJEWD15G3NAQQF2BK: tagasi Koera ortopeedilised toed → Koera ratastoolid ja liikumisabi
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXNGQXJEWD15G3NAQQF2BK','pcat_14dogwheel') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXNGQXJEWD15G3NAQQF2BK' AND product_category_id='pcat_lp_2_5';
-- prod_01KNXXEN1CWTDK3TEXXB1V151N: tagasi Lemmiklooma-väravad → Mänguplatsid ja aedikud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXEN1CWTDK3TEXXB1V151N','pcat_lp_1_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXEN1CWTDK3TEXXB1V151N' AND product_category_id='pcat_lp_1_2';
-- prod_01KNXXE8HYFTBNBS49BK1YBF1B: tagasi Lemmiklooma-väravad → Mänguplatsid ja aedikud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXE8HYFTBNBS49BK1YBF1B','pcat_lp_1_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXE8HYFTBNBS49BK1YBF1B' AND product_category_id='pcat_lp_1_2';
-- prod_01KNXXAFPD6RM4R1VKZT74SR5T: tagasi Voodipiirded ja tugiraamid → Kukkumiskaitsevahendid ja voodialarmid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXAFPD6RM4R1VKZT74SR5T','pcat_f4_16x2_9') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXAFPD6RM4R1VKZT74SR5T' AND product_category_id='pcat_f4_16x1_9';
-- prod_01KP6FFECY7SPR915CKFQ9QPTJ: tagasi Põlvitustoolid → Kontoritoolid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KP6FFECY7SPR915CKFQ9QPTJ','pcat_mv_6x3_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KP6FFECY7SPR915CKFQ9QPTJ' AND product_category_id='pcat_e2_kneelingchairs';
-- prod_01KP6FFVJ3ZXNPQKS1WEX7WW1G: tagasi Põlvitustoolid → Kontoritoolid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KP6FFVJ3ZXNPQKS1WEX7WW1G','pcat_mv_6x3_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KP6FFVJ3ZXNPQKS1WEX7WW1G' AND product_category_id='pcat_e2_kneelingchairs';
-- prod_01KNXXPKZ3VQQ2CDRDGR9V91CD: tagasi Laste lamamistoolid → Laste toolid ja istmed
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXPKZ3VQQ2CDRDGR9V91CD','pcat_mv_6x7_6') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXPKZ3VQQ2CDRDGR9V91CD' AND product_category_id='pcat_mv_6x7_1';
-- prod_01KQC7G59MK3YJSR3D1M0930F4: tagasi Tunnelkasvuhooned → Kasvuhooned
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KQC7G59MK3YJSR3D1M0930F4','pcat_mv_8x4_2') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KQC7G59MK3YJSR3D1M0930F4' AND product_category_id='pcat_mv_8x4_1';
-- prod_01KNXX7QRXV1GSRYDFRQ03GBJS: tagasi Tunnelkasvuhooned → Kasvuhooned
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXX7QRXV1GSRYDFRQ03GBJS','pcat_mv_8x4_2') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXX7QRXV1GSRYDFRQ03GBJS' AND product_category_id='pcat_mv_8x4_1';
-- prod_01KNXXKP10DQBJ06C8J4T4HFNS: tagasi Matka- ja telkimistelgid → Rannatelgid ja -varjualused
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXKP10DQBJ06C8J4T4HFNS','pcat_mv_8x2_1') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXKP10DQBJ06C8J4T4HFNS' AND product_category_id='pcat_8camp';
-- prod_01KP6FEZ6Z3P43KMMS3SJ4HQ76: tagasi Matka- ja telkimistelgid → Rannatelgid ja -varjualused
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KP6FEZ6Z3P43KMMS3SJ4HQ76','pcat_mv_8x2_1') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KP6FEZ6Z3P43KMMS3SJ4HQ76' AND product_category_id='pcat_8camp';
-- prod_01KNXXD2MG1XNHGSXPV4MR00Y3: tagasi Trummikomplektid ja -tarvikud → Pillitarvikud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXD2MG1XNHGSXPV4MR00Y3','pcat_mu_1_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXD2MG1XNHGSXPV4MR00Y3' AND product_category_id='pcat_mu_1_3';
-- prod_01KPJXCHN5V68F1P1D5F5Q0Y39: tagasi Trummikomplektid ja -tarvikud → Pillitarvikud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KPJXCHN5V68F1P1D5F5Q0Y39','pcat_mu_1_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KPJXCHN5V68F1P1D5F5Q0Y39' AND product_category_id='pcat_mu_1_3';
-- prod_01KPJXC6FA56DC9RY3RH6G7XYF: tagasi Trummikomplektid ja -tarvikud → Pillitarvikud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KPJXC6FA56DC9RY3RH6G7XYF','pcat_mu_1_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KPJXC6FA56DC9RY3RH6G7XYF' AND product_category_id='pcat_mu_1_3';
-- prod_01KNXXD91QYYFCDV02DDMBMM6A: tagasi Trummikomplektid ja -tarvikud → Pillitarvikud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXD91QYYFCDV02DDMBMM6A','pcat_mu_1_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXD91QYYFCDV02DDMBMM6A' AND product_category_id='pcat_mu_1_3';
-- prod_01KPJXC74EEZHE7WQ4WZZRXXCB: tagasi Trummikomplektid ja -tarvikud → Pillitarvikud
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KPJXC74EEZHE7WQ4WZZRXXCB','pcat_mu_1_5') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KPJXC74EEZHE7WQ4WZZRXXCB' AND product_category_id='pcat_mu_1_3';
-- prod_01KNXXPCVEKW961MKKEFNK01HM: tagasi Tooli- ja seadmekaitsematid → Vaibaalused ja aluskatted
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXXPCVEKW961MKKEFNK01HM','pcat_es_9x1_3') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXXPCVEKW961MKKEFNK01HM' AND product_category_id='pcat_es_9x1_12';
-- prod_01KP6FDNEMSDFRC490DTNFZHCZ: tagasi Jalgratta transpordikotid ja -kohvrid → Jalgratta kotid ja korvid
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KP6FDNEMSDFRC490DTNFZHCZ','pcat_el_12x11_4') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KP6FDNEMSDFRC490DTNFZHCZ' AND product_category_id='pcat_e2_biketravelbagscases';
-- prod_01M2Y5BBPQM3AM7XT93K2BY89K: tagasi Täispuhutavad põrke- ja Zorb-pallid → Seinapehmendused
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01M2Y5BBPQM3AM7XT93K2BY89K','pcat_12seina') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01M2Y5BBPQM3AM7XT93K2BY89K' AND product_category_id='pcat_el_12x1_16';
-- prod_01KNXX9D8W5X9B6ZBD0ZYHX5C0: tagasi Pulma-lillestatiivid → Pulmakaared ja lilledekoor
INSERT INTO product_category_product (product_id, product_category_id) VALUES ('prod_01KNXX9D8W5X9B6ZBD0ZYHX5C0','pcat_mv_6x1_14') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_id='prod_01KNXX9D8W5X9B6ZBD0ZYHX5C0' AND product_category_id='pcat_mv_6x1_13';
COMMIT;
