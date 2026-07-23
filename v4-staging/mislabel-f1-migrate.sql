-- Mislabel-fix FAAS 1: KÕRGE-kobarad + muster-üksikleiud
BEGIN;

-- ============ UUS L3 #4 "Slushiemasinad" (kodu, paralleel #5 Slušimasinad kommerts) ============
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_4slush','Slushiemasinad','','v4-kodumasinad-koogitehnika-slushiemasinad',true,false,'pcat_v4_l4_1','pcat_v4_l4.pcat_v4_l4_1.pcat_4slush',24,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_4slush',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_4slush'
WHERE product_category_id='pcat_ks_4x1_13' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('CGXXRJ25X13LRYFFU001V2','CGXXRJ25X14LO716M001V2','CGXXRJ25X23LBBJ9F001V2','CGXXRJ25X24LT0XJF001V2','MNXRJ12LDGDZS9773001V2'));

-- ============ UUS L3 #20 "Jõulukuused" (kunstkuused, pärjad JÄÄVAD) ============
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at)
VALUES ('pcat_20kuusk','Jõulukuused','','v4-peoinventar-joulukuused',true,false,'pcat_pidu','pcat_v4_l20.pcat_pidu.pcat_20kuusk',14,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at)
VALUES ('pcat_20kuusk',3,'active','manual',true,0,now(),now());
UPDATE product_category_product SET product_category_id='pcat_20kuusk'
WHERE product_category_id='pcat_mv_6x1_29' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN
  ('CGKSDSPVCLS6K87RZ001V0','CGKSDSPVCLS7U7DA2001V0','RZSDSQBSDSDS8ES4AV2','RZSDSQBSDSDSCOD37V2','RZSDSRZSDSDSARCDDV2','RZSDSZRQBSDS7VXXGV2','RZSDSZRSDSDSMEDSNV2'));

-- ============ LIIGUTUSED olemasolevatesse L3-desse ============
-- Beebi-hüpiktool #18 Haakeadapterid -> #15 Beebitoolid ja -lamamistoolid
UPDATE product_category_product SET product_category_id='pcat_f4_15x2_5'
WHERE product_category_id='pcat_ag_3_2' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('YEYYQZCKDJWWODJ6WV0','YEYYQZCWWJJKCRKM5V0'));
-- Board Cutter #1 Plaadilõikurid -> Plekikäärid
UPDATE product_category_product SET product_category_id='pcat_t3f_6_2'
WHERE product_category_id='pcat_t3f_1_7' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='QDTJQJJQT13MM7CLVV0');
-- Ring Engraver #13 Lasergraveerijad -> Graveerimispingid ja -klambrid
UPDATE product_category_product SET product_category_id='pcat_f4_13x1_11'
WHERE product_category_id='pcat_f4_13x1_1' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='JZNKKZJ0000000001V0');
-- Pool Heat Pump #7 Basseinipumbad -> Basseiniküttekehad & soojuspumbad
UPDATE product_category_product SET product_category_id='pcat_t3a_2_11'
WHERE product_category_id='pcat_t3a_2_10' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('YCRBOZZG1487KIF00V7','YCRBOZZG3221J0TYLV7'));
-- Beer Pump #10 Tsirkulatsioonipumbad -> Pinna- & iseimevad pumbad
UPDATE product_category_product SET product_category_id='pcat_es_10x2_10'
WHERE product_category_id='pcat_es_10x2_8' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='PJBMP-15RP0000001V2');
-- brushless #11 Harjaga -> Harjadeta alalisvoolumootorite komplektid
UPDATE product_category_product SET product_category_id='pcat_el_11x3_3'
WHERE product_category_id='pcat_el_11x3_6' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='ZLWSDJTJ2000G4RXBV9');
-- Compost Bin #7 Astmekivid -> Kompostrid
UPDATE product_category_product SET product_category_id='pcat_t3a_13_2'
WHERE product_category_id='pcat_t3a_3_6' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='GDSDFXHSPP80WX06WV0');
-- Sandbags #7 Astmekivid -> Üleujutuskaitse kotid ja barjäärid
UPDATE product_category_product SET product_category_id='pcat_t3a_3_5'
WHERE product_category_id='pcat_t3a_3_6' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('JBXSD14INCH2XS8TI001V0','JBXSD16INCH2AN6CX001V0','JBXSD16INCH2IOAWY001V0'));
-- Pond Liner EPDM #7 Auru- ja niiskustõkkekiled -> Tiigivooderdised
UPDATE product_category_product SET product_category_id='pcat_7tv'
WHERE product_category_id='pcat_t3a_3_1' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='CTFSMHSEPDM20SZTDV0');
-- Pond Liner LLDPE #7 Kokkupandavad kalatiigid -> Tiigivooderdised
UPDATE product_category_product SET product_category_id='pcat_7tv'
WHERE product_category_id='pcat_t3a_12_3' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='FSM15X20FT0000001V0');
-- Tomato Cages #7 Istutuspuurid ja maaaugurid -> Taimetoed
UPDATE product_category_product SET product_category_id='pcat_t3a_1_5'
WHERE product_category_id='pcat_t3a_1_2' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('FXKZDFQ14.639YCQ1V0','KZDFQZZZCJ68FH9Y4V0'));
-- Plotter Paper #6 Joonistehoidjad -> Kontoritarvikud & kulumaterjalid
UPDATE product_category_product SET product_category_id='pcat_6kont'
WHERE product_category_id='pcat_mv_6x3_11' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('KFDYZ2INCH243KB2WV0','KFDYZ2INCH24NPAM0V0','KFDYZ2INCH364YY5FV0','KFDYZ3INCH24EICCFV0'));
-- Bookshelf #6 Joonistehoidjad -> Raamaturiiulid
UPDATE product_category_product SET product_category_id='pcat_mv_6x2_1'
WHERE product_category_id='pcat_mv_6x3_11' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('BSSJZFXBHB1LUKRBCV0','TBSJTBJSZFX58N2I7V0'));
-- Bathroom Cabinet #6 Ehtekapid & peeglid -> Vannitoakapid & hoiustamine
UPDATE product_category_product SET product_category_id='pcat_mv_6x2_4'
WHERE product_category_id='pcat_mv_6x5_10' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='DMJG3JSTLMRZGUFKJ001V0');
-- Bunkie Board #6 Hoiupingid ja tumbad -> Voodipõhjad & latialused
UPDATE product_category_product SET product_category_id='pcat_mv_6x5_11'
WHERE product_category_id='pcat_mv_6x6_7' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='PJCBKINGCCHS26IOP001V0');
-- Water Skis #12 Veejalatsid -> Veesuusad & lauad
UPDATE product_category_product SET product_category_id='pcat_el_12x4_21'
WHERE product_category_id='pcat_el_12x4_23' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('HSQXLK48INCH09XP1V0','HSQSJK68INCHAQPTGV0'));
-- Magnet Fishing #12 Lauamängud -> Magnetkalastuse komplektid
UPDATE product_category_product SET product_category_id='pcat_t3f_1_28'
WHERE product_category_id='pcat_el_12x1_31' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('CXDYTZ3JTSM18MVVCV0','CXDYTZSM2000VUG2BV0'));
-- PS5 #12 Mängumajad ja telgid -> Spordikotid & -organiserid
UPDATE product_category_product SET product_category_id='pcat_el_12x1_30'
WHERE product_category_id='pcat_el_12x2_10' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='PS5YSBQBYBTY36GTO001V0');
-- Dartboard #12 Pokerilauad -> Noolemängud ja -lauad
UPDATE product_category_product SET product_category_id='pcat_el_12x1_35'
WHERE product_category_id='pcat_el_12x1_11' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='MJTZZXBSKJK08JZLXV0');
-- Saksofonid #19 Keelpillid + Pillitarvikud -> Puhkpillid
UPDATE product_category_product SET product_category_id='pcat_mu_1_4'
WHERE product_category_id IN ('pcat_mu_1_1','pcat_mu_1_5') AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku') IN ('WGSKSZYJEDJSFJGJU001V0','ZGSKSGYJBDJSST1KC001V0'));

COMMIT;
