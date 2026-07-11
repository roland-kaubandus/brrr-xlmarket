BEGIN;
-- FAAS 1 #1 Tööriistad kombineeritud lukk
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_1nvoolik','Airless-värvivoolikud ja komplektid','','v4-tooriistad-airless-varvivoolikud',true,false,'pcat_t3l2_16','pcat_v4_l1.pcat_t3l2_16.pcat_1nvoolik',90,now(),now()),
 ('pcat_1nrohupaak','Värvi-rõhupaagid','','v4-tooriistad-varvi-rohupaagid',true,false,'pcat_t3l2_16','pcat_v4_l1.pcat_t3l2_16.pcat_1nrohupaak',91,now(),now()),
 ('pcat_1npumbapea','Õhukompressori pumbapead','','v4-tooriistad-ohukompressori-pumbapead',true,false,'pcat_t3l2_4','pcat_v4_l1.pcat_t3l2_4.pcat_1npumbapea',90,now(),now()),
 ('pcat_1ntank','Külmaaine-taastustankid','','v4-tooriistad-kulmaaine-taastustankid',true,false,'pcat_kl1','pcat_v4_l1.pcat_kl1.pcat_1ntank',90,now(),now()),
 ('pcat_1nlihvlint','Lihvlindid','','v4-tooriistad-lihvlindid',true,false,'pcat_t3l2_9','pcat_v4_l1.pcat_t3l2_9.pcat_1nlihvlint',90,now(),now()),
 ('pcat_1ncurbramp','Äärekivi- ja lävepakurambid','','v4-tooriistad-aarekivi-ja-lavepakurambid',true,false,'pcat_1koorma','pcat_v4_l1.pcat_1koorma.pcat_1ncurbramp',90,now(),now()),
 ('pcat_1ntoruvise','Torukruustangid','','v4-tooriistad-torukruustangid',true,false,'pcat_t3l2_15','pcat_v4_l1.pcat_t3l2_15.pcat_1ntoruvise',90,now(),now()),
 ('pcat_1nredelstab','Redeli stabilisaatorid ja seinatoed','','v4-tooriistad-redeli-stabilisaatorid',true,false,'pcat_rd1','pcat_v4_l1.pcat_rd1.pcat_1nredelstab',90,now(),now()),
 ('pcat_1npressloua','Pressimislõuad ja -tarvikud','','v4-tooriistad-pressimislouad',true,false,'pcat_t3l2_15','pcat_v4_l1.pcat_t3l2_15.pcat_1npressloua',91,now(),now()),
 ('pcat_1ntapiloik','Tapilõikurid','','v4-tooriistad-tapiloikurid',true,false,'pcat_t3l2_5','pcat_v4_l1.pcat_t3l2_5.pcat_1ntapiloik',90,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_1nvoolik',3,'active','manual',true,5,now(),now()),
 ('pcat_1nrohupaak',3,'active','manual',true,5,now(),now()),
 ('pcat_1npumbapea',3,'active','manual',true,5,now(),now()),
 ('pcat_1ntank',3,'active','manual',true,3,now(),now()),
 ('pcat_1nlihvlint',3,'active','manual',true,5,now(),now()),
 ('pcat_1ncurbramp',3,'active','manual',true,3,now(),now()),
 ('pcat_1ntoruvise',3,'active','manual',true,3,now(),now()),
 ('pcat_1nredelstab',3,'active','manual',true,4,now(),now()),
 ('pcat_1npressloua',3,'active','manual',true,3,now(),now()),
 ('pcat_1ntapiloik',3,'active','manual',true,6,now(),now());
UPDATE product_category_product SET product_category_id='pcat_1nvoolik' WHERE product_id IN ('prod_01KNXXKGJQMJH5G6EN8Y0N3JK9','prod_01KNXXKGHS9V809T8JT8B9HSEQ','prod_01KNXXEZ581TG2HM2TJFCCCJYF','prod_01KNXX8XR8CP73QZVED9JS64YN','prod_01KNXXKDWRZ82G5VZZ390X3ZGD');
UPDATE product_category_product SET product_category_id='pcat_1nrohupaak' WHERE product_id IN ('prod_01KNXX612VB0W21DTTFP2Q7HYZ','prod_01KNXXFEZH1E9W75Y134T9J5SH','prod_01KNXXFD6GZ2TTXKRZ1E2YGWDK','prod_01KPJX9XM4MSTWMYFW3RENEJ4V','prod_01KNXXFEZN2Q1K757G79S8HKJF');
UPDATE product_category_product SET product_category_id='pcat_1npumbapea' WHERE product_id IN ('prod_01KNXX6292B0WVMHT7XJEZ3YDB','prod_01KNXXH09DX9QDSN6FAEGKNANM','prod_01KNXXH08R4SKB6MC31TY33VVX','prod_01KNXXH161XJKNFQAEAFCHMW2K','prod_01KNXXH15Y2YSFV2C03G2XEQP4');
UPDATE product_category_product SET product_category_id='pcat_1ntank' WHERE product_id IN ('prod_01KNXXA6PDR660B1M2QBCD3CFD','prod_01KNXXCJH57F7H3YRJGKDMXV2P','prod_01KNXXGN5KC03BFCPFN08GEG66');
UPDATE product_category_product SET product_category_id='pcat_1nlihvlint' WHERE product_id IN ('prod_01KNXXRX10Z5ECCK52BW1FBWCT','prod_01KNXXRV6A3QWV27VRHBX04J1J','prod_01KNXXRW4T2EH7ZMK0WD1B2JAN','prod_01KNXXRW4MZCAVSCXS8GNABHGZ','prod_01KNXXRX06HZJW0C6QBZ06VDZ8');
UPDATE product_category_product SET product_category_id='pcat_1ncurbramp' WHERE product_id IN ('prod_01KNXXHEPDRY6KZPZQ1TJ0F9YB','prod_01KNXX8HZFHQX8XP5CGD4XKW3W','prod_01KNXX8AQR6R6A3Y6P93JPAQMX');
UPDATE product_category_product SET product_category_id='pcat_1ntoruvise' WHERE product_id IN ('prod_01KNXXB4D6Q3G72T10E3MN6QKD','prod_01KNXXNEWA2C39BSQ3G2S5RWEN','prod_01KNXXB0TX4NDTB9JZ1PHDEQZ6');
UPDATE product_category_product SET product_category_id='pcat_1nredelstab' WHERE product_id IN ('prod_01KNXXKM71XDTSJFNNKMWTN36G','prod_01KNXXKN37MNNYRAQ8ACKRF831','prod_01KNXXKM71D32A7729QE201HCS','prod_01KNXXKN38AHV5R79KRTFMN30C');
UPDATE product_category_product SET product_category_id='pcat_1npressloua' WHERE product_id IN ('prod_01KNXXQEZG4M4ZFS1R5TW68CTB','prod_01KNXXQGS5PJGEFDFN2W77QNTX','prod_01KNXXQF088EAQ12TVWSKDNR3F');
UPDATE product_category_product SET product_category_id='pcat_1ntapiloik' WHERE product_id IN ('prod_01KNXXAB61MB41GN2RVA8M6X2J','prod_01KNXXA9CQXSGRJ8N46KYYVQH9','prod_01KNXXAAA5N8Z9R8T0EHXE66TT','prod_01KNXXA9CPY45840Y0VT4GD40E','prod_01KNXXA9CMHHEY5BZK0X5DHP8F','prod_01KNXXA9DMJSSB9GA6JB9NEGP9');
UPDATE product_category_product SET product_category_id='pcat_vk2' WHERE product_id IN ('prod_01KPJX9QW1WKXV3PMAT0YK22F3','prod_01KNXXFF0BA8PZRV2BF2WSKT6E','prod_01KNXXFE47Q6Z5JWSXAR6R6B55');
UPDATE product_category_product SET product_category_id='pcat_hv1_3' WHERE product_id IN ('prod_01KNXX63DFQ1KCVP37TV3C8JR3','prod_01KNXX7JF1NGJ54H2KBE57GTBB','prod_01KNXX7M6YG3NXR5ERHPRSMZ9P','prod_01KNXXCFT9XN0EHXD06FEFVKK3','prod_01KNXXCEXSBBX88TCK4CVT7R51');
UPDATE product_category_product SET product_category_id='pcat_t3f_10_21' WHERE product_id IN ('prod_01KNXXJFY9SRAN8YJAW2PV0FJ4');
UPDATE product_category_product SET product_category_id='pcat_t3f_10_2' WHERE product_id IN ('prod_01KNXX864SS58223SD8JE711RG');
UPDATE product_category_product SET product_category_id='pcat_t3f_10_15' WHERE product_id IN ('prod_01KPJVFQXHJ75QHEFM3YQQGD4R','prod_01KNXX6FGXSYR3S503QBP0T5AE');
UPDATE product_category_product SET product_category_id='pcat_t3f_10_22' WHERE product_id IN ('prod_01KNXXQR03CTA9TTHCY2023VQ3');
UPDATE product_category_product SET product_category_id='pcat_t3f_5_15' WHERE product_id IN ('prod_01KNXXQ1BQ1TWVVABK5F3ASE2K','prod_01KNXX95VT88JHP5FR9ZPVDDYG','prod_01KNXX95WDZCHRHEM6FM17W9TT');
UPDATE product_category_product SET product_category_id='pcat_t3g_16_2' WHERE product_id IN ('prod_01KNXX8YMW54JCD2DW8M3S5NWE');
UPDATE product_category_product SET product_category_id='pcat_1screed' WHERE product_id IN ('prod_01KNXXNN7SFDP1RFJP9X31E7AE','prod_01KNXXNDZ8F0K538EDAQ8S1MHA','prod_01KNXXNEX4DY9MRG7SNY6JZYSJ','prod_01KNXXDCNB5Q3CVPEM61SSTRJY','prod_01KNXXF2SMZ6SN8CFSQHKANBW3','prod_01KNXXF6CAM1DW1PPZ78FVKPCQ','prod_01KNXXF3N8GPW4KN2DQW7ANS77');
UPDATE product_category_product SET product_category_id='pcat_t3f_1_20' WHERE product_id IN ('prod_01KNXX8G6BN9NFDR18B3QTQ3HE');
UPDATE product_category_product SET product_category_id='pcat_t3f_9_2' WHERE product_id IN ('prod_01KPJVF6AP8XKWESQ16ZAM5NAW','prod_01KP6FFAC7XH6GXTTC36VY6AKC','prod_01KPJVF6GRM5K1M8AHE886JNJ9');
UPDATE product_category_product SET product_category_id='pcat_t3f_7_5' WHERE product_id IN ('prod_01KNXXHEPHC2WT3RWBSX9RB98V','prod_01KNXX69GZRP9RDQGHVZ4JB9FE');
UPDATE product_category_product SET product_category_id='pcat_1cab1' WHERE product_id IN ('prod_01KNXXCM8W5TKNK7QMBKHPN6BZ');
UPDATE product_category_product SET product_category_id='pcat_t3h_12_1' WHERE product_id IN ('prod_01KNXX703C7PPSAK6KG76KYKM7');
UPDATE product_category_product SET product_category_id='pcat_kl1_1' WHERE product_id IN ('prod_01KNXX68KE2704DN4R4WM2FXSM');
UPDATE product_category_product SET product_category_id='pcat_ku1' WHERE product_id IN ('prod_01KNXX6FHMTD98J4FFNA2RAAJD');
UPDATE product_category_product SET product_category_id='pcat_t3f_2_23' WHERE product_id IN ('prod_01KNXXB1Q6KAA42NPVR2QGKJJE','prod_01KNXXAYZ92KFQXQ5DPGYNNFAR','prod_01KNXXAYZ3NAZV27F1PW0KHEE9');
UPDATE product_category_product SET product_category_id='pcat_t3f_9_9' WHERE product_id IN ('prod_01KNXXSTV2TD55FXCRF77R72AF');
UPDATE product_category_product SET product_category_id='pcat_t3f_1_30' WHERE product_id IN ('prod_01KPJVGWG1G9S1W74F9YNKA3CS');
UPDATE product_category_product SET product_category_id='pcat_t3f_1_6' WHERE product_id IN ('prod_01KNXXPAZSPZP45SPQZ31TGA9T','prod_01KNXXPAZ27WE98FZKJAFKWH6X');
UPDATE product_category_product SET product_category_id='pcat_t3f_2_18' WHERE product_id IN ('prod_01KNXX8BNNVZH76YM6G06WPDZZ');
UPDATE product_category_product SET product_category_id='pcat_t3f_10_19' WHERE product_id IN ('prod_01KNXXJ541WHYYN28EK64X418E');
UPDATE product_category_product SET product_category_id='pcat_t3f_8_18' WHERE product_id IN ('prod_01KPJVD6ZSGVJYJP8HSTGJD9TM');
UPDATE product_category_product SET product_category_id='pcat_t3f_1_3' WHERE product_id IN ('prod_01KNXXTE72HVP9MR85CQ3R6J6B','prod_01KNXXTE750X81D509RM8RS5S2');
UPDATE product_category_product SET product_category_id='pcat_t3g_15_1' WHERE product_id IN ('prod_01KNXXPZKG6JC2S2TNJ2WZDCEB');
UPDATE product_category_product SET product_category_id='pcat_t3f_2_16' WHERE product_id IN ('prod_01KNXXK9BVNB6V01B696ZGXTYB','prod_01KNXXK7CNX9ECVWWTQG2VF5KN');
UPDATE product_category_product SET product_category_id='pcat_th1_4' WHERE product_id IN ('prod_01KNXX9Q8JFKBCRGKZFHKS58CS','prod_01KNXX9R443TNCXK1P4M2YG4ET');
UPDATE product_category_product SET product_category_id='pcat_t3f_3_4' WHERE product_id IN ('prod_01KNXX6AF2400D1TERJW28E538','prod_01KNXX66PZ02T69N3KHYST8EBS');
UPDATE product_category_product SET product_category_id='pcat_t3f_9_19' WHERE product_id IN ('prod_01KNXXNTM2T5Z9E4MV44R184MT');
UPDATE product_category_product SET product_category_id='pcat_tk1_8' WHERE product_id IN ('prod_01KNXXKC246NWB00D8CN6KRRSY');
UPDATE product_category_product SET product_category_id='pcat_t3f_12_8' WHERE product_id IN ('prod_01KPJXAATXWQQHAGGS88FJN48K','prod_01KPJXAB0Y76TJZMJPHWT87H4Y','prod_01KPJXAC3MWK8THP1MR4P4G10D','prod_01KPJXACADZ94N5FMN814V32HB');
UPDATE product_category_product SET product_category_id='pcat_t3f_10_17' WHERE product_id IN ('prod_01KNXXH21SFJHT73H1KK33M1W6','prod_01KNXXF6C6BGRG59JS91A0624Q','prod_01KNXXF6D1WND6WZGZX2TNQXK3','prod_01KNXXFAC63RD1DXW6VHTMF3GK','prod_01KNXXM8335YEZM5GT09KJR8B7','prod_01KNXXF4JCHP7X0F3C5B2NYB4Q','prod_01KNXXF9BY4H58CGBS9S5TYA9A','prod_01KNXXFC8GJSN85S3VKZMJQ9WG');
UPDATE product_category_product SET product_category_id='pcat_t3g_16_1' WHERE product_id IN ('prod_01KNXX6SEM9J9J72R8YWCHSRCA');
UPDATE product_category_product SET product_category_id='pcat_t3f_4_2' WHERE product_id IN ('prod_01KPJVAXRCKRCXQWBG2MB6R5V3','prod_01KP6FCRXHWVVYVQ046GYB8G85','prod_01KPJVAXHZF5Y6ENADJNYSNBBJ','prod_01KPJVAXBNDSV4AE9R4EMF4V90','prod_01KNXXF5E2C4DJCJCGCP1DSF4W');
UPDATE product_category_product SET product_category_id='pcat_t3f_1_24' WHERE product_id IN ('prod_01KNXX8PHBJXFTBZFF97VQSH48','prod_01KNXX8PHGZ61MQVA4CQ5G98RF','prod_01KNXX8KT0YZ879T42RPEXQXSX');
UPDATE product_category SET name='Värvipüstolid ja pihustusseadmed', updated_at=now() WHERE id='pcat_ag2_varv';
UPDATE product_category SET name='Külmaaine-manomeetrid (manifold)', updated_at=now() WHERE id='pcat_es_10x1_17';
UPDATE product_category SET name='Toruvee-lekkedetektorid', updated_at=now() WHERE id='pcat_ku2';
UPDATE product_category SET name='Lintlihvija tarvikud', updated_at=now() WHERE id='pcat_t3f_9_11';
UPDATE product_category SET name='Tappimismasinad', updated_at=now() WHERE id='pcat_t3f_5_6';
UPDATE product_category SET name='Torutoed ja -pukid', updated_at=now() WHERE id='pcat_es_10x3_4';
UPDATE product_category SET name='Redeli tasandajad', updated_at=now() WHERE id='pcat_rd1_3';
UPDATE product_category SET name='Tõstetrollid ja talakärud', updated_at=now() WHERE id='pcat_th1_4';
UPDATE product_category SET name='Betoonisilurid ja -hõõrutid', updated_at=now() WHERE id='pcat_1screed';
UPDATE product_category SET name='Mööblifurnituuri puurimisšabloonid', updated_at=now() WHERE id='pcat_t3f_5_15';
UPDATE product_category SET name='Tõstetropid ja -ketid', updated_at=now() WHERE id='pcat_t3f_10_6';
UPDATE product_category SET name='Kipsplaadi silumistööriistad', updated_at=now() WHERE id='pcat_t3g_16_1';
COMMIT;
