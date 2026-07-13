BEGIN;
-- FAAS 2 TIER-B Batch 5 koond-pass (9 split + chair-pocket konsolideerimine)
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_5divid','Taignajagajad','','v4-taignajagajad',true,false,'pcat_5prep','pcat_v4_l5.pcat_5prep.pcat_5divid',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_5prep' AND deleted_at IS NULL),now(),now()),
 ('pcat_5press','Pitsataigna-pressid','','v4-pitsataigna-pressid',true,false,'pcat_5prep','pcat_v4_l5.pcat_5prep.pcat_5press',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_5prep' AND deleted_at IS NULL),now(),now()),
 ('pcat_20disco','Peegel-diskokerad','','v4-peegel-diskokerad',true,false,'pcat_20c','pcat_v4_l20.pcat_20c.pcat_20disco',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_20c' AND deleted_at IS NULL),now(),now()),
 ('pcat_14dogwheel','Koera ratastoolid ja liikumisabi','','v4-koera-ratastoolid',true,false,'pcat_v4_l14_2','pcat_v4_l14.pcat_v4_l14_2.pcat_14dogwheel',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l14_2' AND deleted_at IS NULL),now(),now()),
 ('pcat_14aqlight','Akvaariumivalgustid','','v4-akvaariumivalgustid',true,false,'pcat_14aqua','pcat_v4_l14.pcat_14aqua.pcat_14aqlight',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_14aqua' AND deleted_at IS NULL),now(),now()),
 ('pcat_14aqstand','Akvaariumi alused ja kapid','','v4-akvaariumi-alused',true,false,'pcat_14aqua','pcat_v4_l14.pcat_14aqua.pcat_14aqstand',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_14aqua' AND deleted_at IS NULL),now(),now()),
 ('pcat_16trapez','Voodi-trapetspoomid','','v4-voodi-trapetspoomid',true,false,'pcat_v4_l16_1','pcat_v4_l16.pcat_v4_l16_1.pcat_16trapez',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l16_1' AND deleted_at IS NULL),now(),now()),
 ('pcat_15nailtable','Maniküürilauad','','v4-manikuurilauad',true,false,'pcat_v4_l15_1','pcat_v4_l15.pcat_v4_l15_1.pcat_15nailtable',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_v4_l15_1' AND deleted_at IS NULL),now(),now()),
 ('pcat_25molbert','Molbertid','','v4-molbertid',true,false,'pcat_25art','pcat_v4_l25.pcat_25art.pcat_25molbert',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_25art' AND deleted_at IS NULL),now(),now()),
 ('pcat_25artdry','Kunsti-kuivatusrestid','','v4-kunsti-kuivatusrestid',true,false,'pcat_25art','pcat_v4_l25.pcat_25art.pcat_25artdry',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_25art' AND deleted_at IS NULL),now(),now()),
 ('pcat_9speedbump','Lamavad politseinikud ja kiirustõkked','','v4-lamavad-politseinikud',true,false,'pcat_9traf','pcat_v4_l9.pcat_9traf.pcat_9speedbump',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_9traf' AND deleted_at IS NULL),now(),now()),
 ('pcat_21chairpkt','Klassiruumi tooli-taskud','','v4-klassiruumi-tooli-taskud',true,false,'pcat_21doc','pcat_v4_l21.pcat_21doc.pcat_21chairpkt',(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_21doc' AND deleted_at IS NULL),now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_5divid',3,'active','manual',true,4,now(),now()),
 ('pcat_5press',3,'active','manual',true,3,now(),now()),
 ('pcat_20disco',3,'active','manual',true,3,now(),now()),
 ('pcat_14dogwheel',3,'active','manual',true,9,now(),now()),
 ('pcat_14aqlight',3,'active','manual',true,7,now(),now()),
 ('pcat_14aqstand',3,'active','manual',true,6,now(),now()),
 ('pcat_16trapez',3,'active','manual',true,5,now(),now()),
 ('pcat_15nailtable',3,'active','manual',true,4,now(),now()),
 ('pcat_25molbert',3,'active','manual',true,3,now(),now()),
 ('pcat_25artdry',3,'active','manual',true,4,now(),now()),
 ('pcat_9speedbump',3,'active','manual',true,6,now(),now()),
 ('pcat_21chairpkt',3,'active','manual',true,6,now(),now());
UPDATE product_category_product SET product_category_id='pcat_5divid' WHERE product_id IN ('prod_01KNXXGBV12WDAZZD3EWRDE77W','prod_01KNXXGAXGNMCFJ5ZSHJRJH2G4','prod_01KNXXGEFY2XXATZKPESVM9219','prod_01KNXXG7BD94BAQ2BG3VF8QX9Y') AND product_category_id='pcat_ks_5x1_21';
UPDATE product_category_product SET product_category_id='pcat_5press' WHERE product_id IN ('prod_01KNXXQ7RC66NFMSSV6CP49WCR','prod_01KNXXQ5XGHC6DZYJFE0PD92VP','prod_01KNXXAW8R2VBYTQPPZ7H79BVC') AND product_category_id='pcat_ks_5x1_21';
UPDATE product_category_product SET product_category_id='pcat_20disco' WHERE product_id IN ('prod_01KNXXJ6175Y9YGWPHYP3S4S6A','prod_01KNXXJ3BA0SVKDPV1YFPEJTQD','prod_01KNXXJ3BS109PT81FRS69M6K7') AND product_category_id='pcat_mu_2_3';
UPDATE product_category_product SET product_category_id='pcat_14dogwheel' WHERE product_id IN ('prod_01KPJXD1C3DY97MR1SVNPWBYMR','prod_01KNXXDXQEMEF1N0W6C145Z3GA','prod_01KNXXDXQHNCE8NH0GSMRPD5EJ','prod_01KNXXDXQDQEQCJ3DWYBQ1BFDG','prod_01KNXXDVYF8HJ30PPMARS6J4SB','prod_01KNXXTCH2V1MTED8QPRG132ZZ','prod_01KPJX93J1VCSD8M4XRP664HCV','prod_01KNXXTBNEQ41S7BV7D1PGKVVV','prod_01KNXXT9TZS54ST7W6ERGYECXC') AND product_category_id='pcat_lp_2_5';
UPDATE product_category_product SET product_category_id='pcat_14aqlight' WHERE product_id IN ('prod_01KNXXD9XJ645R57A2P67RVA3B','prod_01KNXXD90QRZHQKRCB5A33P3MS','prod_01KNXXD2KQZ0CXBZ2GQ6DB399X','prod_01KNXXD1PZJS93KTEBMXG14WJQ','prod_01KNXXD90N00C5W1DJC640KEWP','prod_01KNXXD0SY918DS9QD2XW3R5J9','prod_01KNXXD90QA1CDP87SJ7072HTX') AND product_category_id='pcat_lp_1_4';
UPDATE product_category_product SET product_category_id='pcat_14aqstand' WHERE product_id IN ('prod_01KNXXCC72GTP9YPQHBC8VN3TH','prod_01KNXXCC6DHCJPV581W3FA5VX3','prod_01KNXXCC78MGK5ENA3FPWNEC4C','prod_01KNXXCC715JJ2WMY2HN18BMCZ','prod_01KNXXCC7190CGF33BAM1H4PX3','prod_01KNXXCC6CPZ6TDPHSJDM3KRVP') AND product_category_id='pcat_lp_1_4';
UPDATE product_category_product SET product_category_id='pcat_16trapez' WHERE product_id IN ('prod_01KNXXNP4MGBHAP7VRGKVKNBX6','prod_01KNXXNN8R22G5ZCWF27160Z2Y','prod_01KNXXNMBFZ4MP9A8JYQVN38CE','prod_01KNXXNKEQGCCVE2QEPQ4975B2','prod_01KNXXNN8QG6J5NBET9N3YCB0S') AND product_category_id='pcat_f4_16x1_9';
UPDATE product_category_product SET product_category_id='pcat_15nailtable' WHERE product_id IN ('prod_01KNXXBKRRD47QN7CGNFGVA238','prod_01KNXXC25X6J1235MJHB609VPK','prod_01KNXXBWQMGGGM130ZJC7S68WZ','prod_01KNXXBPFC605HP7QRDRC6RGRZ') AND product_category_id='pcat_f4_15x1_6';
UPDATE product_category_product SET product_category_id='pcat_25molbert' WHERE product_id IN ('prod_01KNXXHZS4506X4S14PPEX0CZB','prod_01KNXXHYWCMZCD1ZY4PJXXCEVY','prod_01KNXXHZRY5RTE3ZKNMXTZP3YV') AND product_category_id='pcat_f4_13xtex_11';
UPDATE product_category_product SET product_category_id='pcat_25artdry' WHERE product_id IN ('prod_01KNXXH8DQGSGY55W7WY64M0Y6','prod_01KNXXH9AP8AHFMHSG3ZEDDZWJ','prod_01KNXXH9AN3PHDPJPGV678ZXQP','prod_01KNXXH99N0MZ3PV6SF2H1C8AQ') AND product_category_id='pcat_f4_13xtex_11';
UPDATE product_category_product SET product_category_id='pcat_9speedbump' WHERE product_id IN ('prod_01KNXXSTV4BDF7RRN2WGD4KBGZ','prod_01KNXXS9PPGR508T8AMSF3P7RY','prod_01KNXXSDBP928DBGR0K7YX3R20','prod_01KNXX7N28DA0FAQK773R4W93Z','prod_01KNXXCD2J4KQT9W9WC4R7S34D','prod_01KNXXCD2K18AFYM8AJDHJKRBW') AND product_category_id='pcat_9traf2';
UPDATE product_category_product SET product_category_id='pcat_21chairpkt' WHERE product_id IN ('prod_01KPJXAF9GZPG2QAN9VTG5GYTS','prod_01KNXXPW0R8MDT7S6F9SK39A1G','prod_01KNXXPW0VHFPSNVQ7KAFHCJX2') AND product_category_id='pcat_mv_6x7_3';
UPDATE product_category_product SET product_category_id='pcat_21chairpkt' WHERE product_id IN ('prod_01KNXXPJ52Q6SXGKJFGMZQTV1T','prod_01KNXXPT7NRAZJ7Z9XD4R4FEBH','prod_01KNXXPKYBKGDC40QWP1FQS8AF') AND product_category_id='pcat_mv_6x7_11';
UPDATE product_category_product SET product_category_id='pcat_ks_5x1_12' WHERE product_id IN ('prod_01KNXXEWDKZP8X2BS1C0NWPGGC') AND product_category_id='pcat_ks_5x1_21';
UPDATE product_category SET name='Taignarullid ja -sheeterid', updated_at=now() WHERE id='pcat_ks_5x1_21';
UPDATE product_category SET name='Sädeme- ja suitsuefektimasinad', updated_at=now() WHERE id='pcat_mu_2_3';
UPDATE product_category SET name='Akvaariumi filtrid ja hooldus', updated_at=now() WHERE id='pcat_lp_1_4';
UPDATE product_category SET name='Voodipiirded ja tugiraamid', updated_at=now() WHERE id='pcat_f4_16x1_9';
UPDATE product_category SET name='Küüneviilid ja -drillid', updated_at=now() WHERE id='pcat_f4_15x1_6';
UPDATE product_category SET name='Maalilõuendid', updated_at=now() WHERE id='pcat_f4_13xtex_11';
UPDATE product_category SET name='Pollarid ja parkimistõkked', updated_at=now() WHERE id='pcat_9traf2';
UPDATE product_category SET name='Riidenagid ja esikupuud', updated_at=now() WHERE id='pcat_mv_6x7_3';
UPDATE product_category SET name='Tooli lindid ja kaunistused', updated_at=now() WHERE id='pcat_mv_6x7_11';
UPDATE product_category SET name='Toidukuivatid ja külmkuivatid', updated_at=now() WHERE id='pcat_ks_4x1_4';
COMMIT;
