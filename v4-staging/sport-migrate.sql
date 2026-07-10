BEGIN;
-- FAAS 1 #12 Sport kombineeritud lukk

-- 17 UUT L3
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_sp12w1','Kajaki- ja kanuukärud','','v4-sport-ja-vaba-aeg-veesport-ja-ujuvvahendid-kajaki-ja-kanuukarud',true,false,'pcat_v4_l12_4','pcat_v4_l12.pcat_v4_l12_4.pcat_sp12w1',1,now(),now()),
 ('pcat_sp12w2','Kajaki- ja SUP-istmed','','v4-sport-ja-vaba-aeg-veesport-ja-ujuvvahendid-kajaki-ja-sup-istmed',true,false,'pcat_v4_l12_4','pcat_v4_l12.pcat_v4_l12_4.pcat_sp12w2',2,now(),now()),
 ('pcat_sp12w3','Kajaki-, SUP- ja lainelaua hoiuriiulid','','v4-sport-ja-vaba-aeg-veesport-ja-ujuvvahendid-kajaki-sup-ja-lainelaua-hoiuriiulid',true,false,'pcat_v4_l12_4','pcat_v4_l12.pcat_v4_l12_4.pcat_sp12w3',3,now(),now()),
 ('pcat_sp12w4','Paadi veeskamisrattad','','v4-sport-ja-vaba-aeg-veesport-ja-ujuvvahendid-paadi-veeskamisrattad',true,false,'pcat_v4_l12_4','pcat_v4_l12.pcat_v4_l12_4.pcat_sp12w4',4,now(),now()),
 ('pcat_sp12w5','SUP- ja aerulaua pumbad','','v4-sport-ja-vaba-aeg-veesport-ja-ujuvvahendid-sup-ja-aerulaua-pumbad',true,false,'pcat_v4_l12_4','pcat_v4_l12.pcat_v4_l12_4.pcat_sp12w5',5,now(),now()),
 ('pcat_sp12w6','Paadi sõukruvid (propellerid)','','v4-sport-ja-vaba-aeg-veesport-ja-ujuvvahendid-paadi-soukruvid',true,false,'pcat_v4_l12_4','pcat_v4_l12.pcat_v4_l12_4.pcat_sp12w6',6,now(),now()),
 ('pcat_sp12w7','Paadimootori gaasihoovad ja juhtpuldid','','v4-sport-ja-vaba-aeg-veesport-ja-ujuvvahendid-paadimootori-gaasihoovad-ja-juhtpuldid',true,false,'pcat_v4_l12_4','pcat_v4_l12.pcat_v4_l12_4.pcat_sp12w7',7,now(),now()),
 ('pcat_sp12h1','Jääkalastustelgid','','v4-sport-ja-vaba-aeg-jaht-ja-jahivarustus-jaakalastustelgid',true,false,'pcat_v4_l12_6','pcat_v4_l12.pcat_v4_l12_6.pcat_sp12h1',11,now(),now()),
 ('pcat_sp12h2','Jahitõstukid ja -vintsid','','v4-sport-ja-vaba-aeg-jaht-ja-jahivarustus-jahitostukid-ja-vintsid',true,false,'pcat_v4_l12_6','pcat_v4_l12.pcat_v4_l12_6.pcat_sp12h2',12,now(),now()),
 ('pcat_sp12o1','Rebounderid ja tagasilöögivõrgud','','v4-sport-ja-vaba-aeg-ouetegevus-ja-hobi-rebounderid-ja-tagasiloogivorgud',true,false,'pcat_v4_l12_1','pcat_v4_l12.pcat_v4_l12_1.pcat_sp12o1',21,now(),now()),
 ('pcat_sp12o2','Meeskonna- ja vahetuspingid','','v4-sport-ja-vaba-aeg-ouetegevus-ja-hobi-meeskonna-ja-vahetuspingid',true,false,'pcat_v4_l12_1','pcat_v4_l12.pcat_v4_l12_1.pcat_sp12o2',22,now(),now()),
 ('pcat_sp12o3','Ronimisseina haardepunktid ja ninja-komplektid','','v4-sport-ja-vaba-aeg-ouetegevus-ja-hobi-ronimisseina-haardepunktid-ja-ninja',true,false,'pcat_v4_l12_1','pcat_v4_l12.pcat_v4_l12_1.pcat_sp12o3',23,now(),now()),
 ('pcat_sp12f1','Lat pull-down ja kaabelmasinad','','v4-sport-ja-vaba-aeg-fitness-ja-treeningseadmed-lat-pull-down-ja-kaabelmasinad',true,false,'pcat_v4_l12_3','pcat_v4_l12.pcat_v4_l12_3.pcat_sp12f1',12,now(),now()),
 ('pcat_sp12f2','Joogamati hoiuriiulid','','v4-sport-ja-vaba-aeg-fitness-ja-treeningseadmed-joogamati-hoiuriiulid',true,false,'pcat_v4_l12_3','pcat_v4_l12.pcat_v4_l12_3.pcat_sp12f2',13,now(),now()),
 ('pcat_sp12f3','Tantsupostid (pole dance)','','v4-sport-ja-vaba-aeg-fitness-ja-treeningseadmed-tantsupostid',true,false,'pcat_v4_l12_3','pcat_v4_l12.pcat_v4_l12_3.pcat_sp12f3',14,now(),now()),
 ('pcat_sp12f4','Reguleeritavad kettlebellid','','v4-sport-ja-vaba-aeg-fitness-ja-treeningseadmed-reguleeritavad-kettlebellid',true,false,'pcat_v4_l12_3','pcat_v4_l12.pcat_v4_l12_3.pcat_sp12f4',15,now(),now()),
 ('pcat_sp12b1','Jalgratta remondipukid','','v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgratta-remondipukid',true,false,'pcat_v4_l12_11','pcat_v4_l12.pcat_v4_l12_11.pcat_sp12b1',1,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_sp12w1',3,'active','manual',true,15,now(),now()),
 ('pcat_sp12w2',3,'active','manual',true,10,now(),now()),
 ('pcat_sp12w3',3,'active','manual',true,18,now(),now()),
 ('pcat_sp12w4',3,'active','manual',true,6,now(),now()),
 ('pcat_sp12w5',3,'active','manual',true,7,now(),now()),
 ('pcat_sp12w6',3,'active','manual',true,7,now(),now()),
 ('pcat_sp12w7',3,'active','manual',true,7,now(),now()),
 ('pcat_sp12h1',3,'active','manual',true,7,now(),now()),
 ('pcat_sp12h2',3,'active','manual',true,7,now(),now()),
 ('pcat_sp12o1',3,'active','manual',true,18,now(),now()),
 ('pcat_sp12o2',3,'active','manual',true,9,now(),now()),
 ('pcat_sp12o3',3,'active','manual',true,9,now(),now()),
 ('pcat_sp12f1',3,'active','manual',true,3,now(),now()),
 ('pcat_sp12f2',3,'active','manual',true,3,now(),now()),
 ('pcat_sp12f3',3,'active','manual',true,4,now(),now()),
 ('pcat_sp12f4',3,'active','manual',true,2,now(),now()),
 ('pcat_sp12b1',3,'active','manual',true,6,now(),now());

-- LIIGUTUSED (uued L3 + olemasolevad sihid + intra)
UPDATE product_category_product SET product_category_id='pcat_sp12w1' WHERE product_id IN ('prod_01KNXX857FGZTY1XPAJT1EN8HK','prod_01KNXX871QT3K4HFJCVGK0FMBB','prod_01KNXX87Z3CF322T8VXD2M21F5','prod_01KNXX871GNMN1PQ7QT8ME39W1','prod_01KNXX858E5F2W9KH9Q04740X1','prod_01KNXXT5KK3EJG8EGBQ268Y5T6','prod_01KNXXSP7DC6HNCSW6HXPNGQ6H','prod_01KNXXRX0ZBDWYJ4HHQXFK70YC','prod_01KNXXT4Q9W3NGMM9HYKCQEKGD','prod_01KNXXRV63DACWXPVW034FKFCZ','prod_01KNXXRNYP3JHRTQ2H8SDFEC5J','prod_01KNXXRV652PSKMTQVV5KBAJP0','prod_01KNXXRW3VBN3ZD05R3H0GYFB5','prod_01KNXX7N2CS70HJMABDAY9QG3W','prod_01KNXX7N2APSPG1215F60NRFPQ');
UPDATE product_category_product SET product_category_id='pcat_sp12w2' WHERE product_id IN ('prod_01KPJVEC7VK5PP9BHGCW34DNDR','prod_01KPJVEC1NCB236JZE6SVNVCJ7','prod_01KPJVECKEKA2V1JGJ6FF7AENS','prod_01KPJVEF9D5N9ZZDYKFE4WK9CM','prod_01KPJVEBMH0XWGJYTMX27HXCSM','prod_01KP6FEW44ZXPSQYGGGA654BDF','prod_01KPJVECDDVTNXYB3A72WTPSYH','prod_01KPJVEBV86QVABVK9V5SXEXAV','prod_01KP6FEWXTZZ62JKZHNRPP4YG7','prod_01KPJVEF3941Q2D87F44EMC80R');
UPDATE product_category_product SET product_category_id='pcat_sp12w3' WHERE product_id IN ('prod_01KNXXBJTR55ZW0DAMMJ0JVHX1','prod_01KNXXBH2YX5SS4BSGNC0H4DYH','prod_01KNXXBH2ZCXG20NM9TPHVGFZ2','prod_01KPJVG6SMH6439H2FSYPS2C4E','prod_01KPJVG76DMNSFES9GWSH083BY','prod_01KP6FFPH410WDD54709ZM60E7','prod_01KP6FFJJBFV1XV02MJ65TZ8SX','prod_01KP6FFNZ507EMBKABD74HG6WK','prod_01KPJVG6K5DXDH8BNST7G7TS22','prod_01KPJVG6CP3750CAVCFQNR7KZ1','prod_01KPJVG7CHY9KJVRGY7RRE5260','prod_01KPJVG66HV9SMR8ZKHSYWPX6R','prod_01KNXXBHY3NNZHKNQ94T28N2T1','prod_01KNXXSF5X5VZ24MDCWP2JK83M','prod_01KNXXSNCH2YXNX5BCRQNK6E7Q','prod_01KNXXSKMGN3Q37P64WMJXH9YZ','prod_01KNXXSMGCPQ55Y47835F0XC40','prod_01KNXXSKMFVJ0V78MJERVZQE98');
UPDATE product_category_product SET product_category_id='pcat_sp12w4' WHERE product_id IN ('prod_01KNXX7AAZF15ARH565X2JQYSW','prod_01KPJXDQ2ZJF43BZY30RW8908C','prod_01KPJXDPNCW2DKH9YT3SS1AX7P','prod_01KNXX7AB09Q99V70WZJ3X9T0Q','prod_01KNXX7AAZ3NET976JBGGKAJKB','prod_01KNXXC9EZ0K5Q9YXAM7D0Z511');
UPDATE product_category_product SET product_category_id='pcat_sp12w5' WHERE product_id IN ('prod_01KNXXPT7KQC60TBW1D33X77S7','prod_01KNXXPT7K6XZPREC60FGPD73R','prod_01KNXXPVZZ2XCRNFC09WB4BFQ2','prod_01KNXXPT7MWWNJ5DJNPHQKH5TB','prod_01KNXXPT7SPWM0YY526A0MVKCT','prod_01KNXXPSARZ3GY4RH15TBQGDYW','prod_01KNXXPSAM21NZ1PJMNBKX6JZ4');
UPDATE product_category_product SET product_category_id='pcat_sp12w6' WHERE product_id IN ('prod_01KNXXAW8QTK9BJ70S5J7CEWYF','prod_01KNXXATG2VER2Z8DGZCXENH6C','prod_01KNXXASKVPR74B4WVV0EFF032','prod_01KNXXAVBGRVFRAC0FJ0Q3Q18P','prod_01KNXXARPKM16ZAPQJ80P963R8','prod_01KNXXAW8JM31D82W5YE83FCKA','prod_01KNXXARPKT5T63B4ZPS9PZER5');
UPDATE product_category_product SET product_category_id='pcat_sp12w7' WHERE product_id IN ('prod_01KNXXC25V57TMZE0JY93BDV8A','prod_01KNXXCFT6NK5H6PHZ2YW0JTBD','prod_01KNXXC26K82B6WTP25Z71H8TB','prod_01KNXXCFT7HYRBNJ0ASHK19HNR','prod_01KNXXC25XCVF0C7W9CQH18JNC','prod_01KNXXC26D7P12H5GVBVYDYYJF','prod_01KNXXCEXT8WGMNWC71KGA59JK');
UPDATE product_category_product SET product_category_id='pcat_sp12h1' WHERE product_id IN ('prod_01KNXXH4TYEMGERQHHY78V1ME5','prod_01KNXXH2YPFDBES21K5TW4P690','prod_01KNXXH2Z8PZ8J08YTPGG2D2ZF','prod_01KNXXJ8Q1ANQ38V4NPEAF4FG6','prod_01KNXXGK7AMSE6FBX5WXCMQBSE','prod_01KNXXH3XES4VPGR0BEECHPE1P','prod_01KNXXH2ZAYXPBERGSXBGWGV4J');
UPDATE product_category_product SET product_category_id='pcat_sp12h2' WHERE product_id IN ('prod_01KNXXS1KM3DV2XTVQCS6TW34N','prod_01KNXXS1KD4STKFCY4SK71DNVE','prod_01KNXXS3EQGQ1AAJ9TF0AN9Y36','prod_01KNXXS1KHSD503S1A9P7R68ZQ','prod_01KNXXS1JPGADG5BYSGQ346RR2','prod_01KNXXS2HB9FCM7FD75YFG2JVF','prod_01KNXXSJTA1ZRZ4D9GC9YVHEET');
UPDATE product_category_product SET product_category_id='pcat_sp12o1' WHERE product_id IN ('prod_01KNXXJ2F7CBMRA25DSCXMJ0NV','prod_01KNXXAX68FM7C3T5NHA6T374A','prod_01KNXXBF9G4S5ZV9NXHVAYT119','prod_01KNXXBH1VS6SZWTRKX69F2AK8','prod_01KNXXJWK79MR54Y4DDS5MPGCH','prod_01KNXXJQXWJ080W2QQ05TJD1RA','prod_01KNXXJQXRF0Z6C5QQYZ9EZ3W8','prod_01KQ4Y1H4ZG0WFW2VY96118KKQ','prod_01KNXXAY2XGXK5RSE8HKF6KSQ0','prod_01KNXXJ3BXBWT5384ADRC2EYE4','prod_01KNXXJ3BGXYEG5QSE1R3KQ8HV','prod_01KNXX96TY97NTMZY3MP4BXANY','prod_01KNXXJ3BY62024YSDJVF3BPEY','prod_01KNXX96TQ03A6Y9NK3WW9Y5XR','prod_01KNXXBAQ6CXCAVPFFQ8VJ60ZK','prod_01KNXXBAQW2A048WD50B3AQGMN','prod_01KNXXB72BXG7G24YS9T02GEB1','prod_01KNXXAQTNBV8D9PCF2C70KRFR');
UPDATE product_category_product SET product_category_id='pcat_sp12o2' WHERE product_id IN ('prod_01KNXXSR3SWJRY6K4GD05WRKEE','prod_01KNXXEJC9M0STGPT5Q0ME8XZ2','prod_01KNXXEJBH4GJQY389MHF18ASH','prod_01KNXXT779NHQJH2WZ36EJ6YKD','prod_01KNXXSR38PY68BEDY3PMK0Z3D','prod_01KNXXSR39FC26MVPWM2B3H8QE','prod_01KNXXSTV5AGN4VNRZ45AJ0VS0','prod_01KNXXEJCD747SHE5PTY1H4CXJ','prod_01KNXXSVWA29BQBMNMW3F20K9C');
UPDATE product_category_product SET product_category_id='pcat_sp12o3' WHERE product_id IN ('prod_01KNXXEZ4CYQ7M9B1SD50Z0NDX','prod_01KNXXEZ56S4ACE1DN188FEDMG','prod_01KNXXEY74FREDR46P7JSDR5C2','prod_01KNXXEZ4Z4FNR6GCQGYRFEXM4','prod_01KNXXF3NXZF5KD1VE0F9FG9NF','prod_01KNXXF6C9D3AM845TT2K9P301','prod_01KNXXF01RJ6XGECSB3VCFQGWC','prod_01KNXXF3N9MGG8DAMZQTJC58MB','prod_01KNXXCWC217E0MJC0K51A1ZP3');
UPDATE product_category_product SET product_category_id='pcat_sp12f1' WHERE product_id IN ('prod_01KP6FF867J93KAF989HE1WF0P','prod_01KP6FF8CNM6YP42NKQQX9V947','prod_01KP6FF9GNA68ATJK2QC4J3SR3');
UPDATE product_category_product SET product_category_id='pcat_sp12f2' WHERE product_id IN ('prod_01KNXXMDG9MCN65KNXY9D4R2S6','prod_01KNXXMAT3J99T6JMFK76DWPZV','prod_01KNXXM75GTWTXRCEV81H45K1X');
UPDATE product_category_product SET product_category_id='pcat_sp12f3' WHERE product_id IN ('prod_01KNXXCDZ62K9WN6GR65QVVKKN','prod_01KNXXCE01S8XZN9K6FR8PQX8S','prod_01KNXXCE01C99CV5YWJVSQKYTW','prod_01KNXXCDZWE7CEG8QFFPWJV4E5');
UPDATE product_category_product SET product_category_id='pcat_sp12f4' WHERE product_id IN ('prod_01KNXXP5GZT9V794G8BSKHDKBV','prod_01KNXXP4NP1P4DWM6SFJK9J11C');
UPDATE product_category_product SET product_category_id='pcat_sp12b1' WHERE product_id IN ('prod_01KNXXA8H3JQ88P1SR8CWMD0PF','prod_01KNXXA7MG1NS01H8ZX0CMS9X6','prod_01KNXXPEKC9W86AHED307A2Q3F','prod_01KNXXPFFEXFC7XT82F5GPYSD6','prod_01KNXXPEKB8RAHQMJSNCJ5NXP6','prod_01KNXXPEK69D749K7K9PK3X9QJ');
UPDATE product_category_product SET product_category_id='pcat_el_12x4_9' WHERE product_id IN ('prod_01KNXXCHM5W70J2YNHZKS8J1DB','prod_01KPJXEZEH8JC7HPB468THVY5M','prod_01KPJXF7V7RY8D4VMHZ55NKB52','prod_01KPJXF825JF82WAC6ZR4FFTQ3','prod_01KPJXEZ7HZVC3SH1PTBVHG6AT','prod_01KPJXF0A65QQPPXFKSD0R3J4E','prod_01KPJXF3WNJF5PWBWXFS5RYT4B','prod_01KNXXCWBWH5GJPRWQCZ1XW63B','prod_01KNXXCWBVRZD9VJ9NDXXCD6R8','prod_01KNXXCHM6HW8VCM37ATZGHJED');
UPDATE product_category_product SET product_category_id='pcat_el_12x1_16' WHERE product_id IN ('prod_01KNXX75WNRPPT98SC09NCZ7X9');
UPDATE product_category_product SET product_category_id='pcat_el_12x4_14' WHERE product_id IN ('prod_01KNXXP957YT9JZ62DTGTPBE33');
UPDATE product_category_product SET product_category_id='pcat_el_12x1_17' WHERE product_id IN ('prod_01KNXXMT25YK9ETRGCM82T65NX','prod_01KNXXNDZDCKQP1XMN2YPWA5DE','prod_01KNXXMT2A0E609VTMA2ZK70VV','prod_01KNXXKESARHEXTC58Q3WSM6SW','prod_01KNXXKES9JSX25CNHR1EAZV8Y','prod_01KNXXKES53XHF6FJCQX8DYK21','prod_01KNXXKGHSHJJTKQ8PTTJH7GR4');
UPDATE product_category_product SET product_category_id='pcat_ag2_3x7_5' WHERE product_id IN ('prod_01KNXXKES8HCTJCSHGVTCN4Y0A','prod_01KNXXKERTEMMPXZC62RJASEEX','prod_01KNXX9E6C1ZB0QD7FM9VZEMHS','prod_01KNXX9E6CZP8XKQJRYQ3MAH02');
UPDATE product_category_product SET product_category_id='pcat_el_12x11_4' WHERE product_id IN ('prod_01KP6FDNEMSDFRC490DTNFZHCZ','prod_01KPJVCWF81GY8TDES43F6ZVEN','prod_01KPJVCW34PZNAE0XHDFF42JTD','prod_01KP6FE111EAMC3D6A39QRMKRQ','prod_01KNXXMTZ8KGBAK3TM4F693SNX','prod_01KNXXMS66WZ2703K264S01DAN','prod_01KNXXMS598SYDXBJS6R1J19Q7');
UPDATE product_category_product SET product_category_id='pcat_mv_8x2_3' WHERE product_id IN ('prod_01KNXXDVYD5F1D14EX22MPW85M','prod_01KNXXDWV8ZCYQR6P0VJ724YTK');
UPDATE product_category_product SET product_category_id='pcat_el_12x1_37' WHERE product_id IN ('prod_01KNXXNJHE84C5FV6T75DSF068','prod_01KNXXNHM0MC6JCQ0YCXEVJ9W4','prod_01KNXXNHM3E0F0G845496NC0YE','prod_01KNXXNJH9DPVP71QEKKJ09GJ8');
UPDATE product_category_product SET product_category_id='pcat_12adv' WHERE product_id IN ('prod_01KNXX9XKWP31P5AV31A75DHV2','prod_01KNXXCAAYQZ8NZTD0SF4FXXDS');
UPDATE product_category_product SET product_category_id='pcat_el_12x9_2' WHERE product_id IN ('prod_01KPJXEYTNC3RX0HYY4KBP4FW3','prod_01KNXXHV8QF9T6DAZY1YDGJ1N8','prod_01KNXXHNWP0X76KRTSEXM39K69');
UPDATE product_category_product SET product_category_id='pcat_12vints' WHERE product_id IN ('prod_01KNXXT809CQ5ZEC4Q65KGBVPZ','prod_01KNXXT80AVHSARX9NF9SB33PJ');
UPDATE product_category_product SET product_category_id='pcat_12gcart' WHERE product_id IN ('prod_01KNXXR3Z4EEGXZWBC4D0RKR2R');
UPDATE product_category_product SET product_category_id='pcat_el_12x1_34' WHERE product_id IN ('prod_01KNXXDG7KDGFMVXZWRTWAQN3Y','prod_01KNXXDEEF27P0WPD25XPBGWQ6','prod_01KNXXDJXZMMMJDBXEZV5K9QJ9','prod_01KNXXDKTXEAA7551TP4SX429F');
UPDATE product_category_product SET product_category_id='pcat_el_12x4_2' WHERE product_id IN ('prod_01KNXXAY26PANSA75NG6TYE3ES');
UPDATE product_category_product SET product_category_id='pcat_el_12x1_31' WHERE product_id IN ('prod_01KNXXCY5NP3M2NEB1EAAA6DWG','prod_01KNXXCZ1REXHV1Z7J54N3CPA7','prod_01KNXXCY5M52TKACVRSE2PARTV');
UPDATE product_category_product SET product_category_id='pcat_el_12x6_2' WHERE product_id IN ('prod_01KNXXEWDCDRX4HNC06CF11S9K');
UPDATE product_category_product SET product_category_id='pcat_el_12x3_28' WHERE product_id IN ('prod_01KP6FAVX758KD8XYHXB6N8ZEA');
UPDATE product_category_product SET product_category_id='pcat_el_12x1_30' WHERE product_id IN ('prod_01KNXXBJTS9C2BHJFAFKBXEMSR','prod_01KNXXBJTPC0TQM742S8JXTK2X','prod_01KNXXBMMZYYV1NTGKR10ZQ446','prod_01KNXXBKQZ53DKEM5DEQYQ8MY2');
UPDATE product_category_product SET product_category_id='pcat_12m1' WHERE product_id IN ('prod_01KNXXBKRFWDH3P9XW1J8338DM','prod_01KNXXBKQY3E81PQ0M99ADA52B');

-- RENAMES
UPDATE product_category SET name='Kajakid ja kajakitarvikud', updated_at=now() WHERE id='pcat_el_12x4_5';
UPDATE product_category SET name='Veetrampoliinid ja -batuudid', updated_at=now() WHERE id='pcat_el_12x4_10';
UPDATE product_category SET name='Paadihaagise juhikud', updated_at=now() WHERE id='pcat_el_12x4_12';
UPDATE product_category SET name='SUP-lauad ja aerulauad', updated_at=now() WHERE id='pcat_el_12x4_4';
UPDATE product_category SET name='Elektrilised paadimootorid', updated_at=now() WHERE id='pcat_el_12x4_7';
UPDATE product_category SET name='Paadi transomitoed', updated_at=now() WHERE id='pcat_el_12x4_19';
UPDATE product_category SET name='Veesuusad ja lainelauad', updated_at=now() WHERE id='pcat_el_12x4_21';
UPDATE product_category SET name='Jahivarjed', updated_at=now() WHERE id='pcat_el_12x6_5';
UPDATE product_category SET name='Jahisaagikärud', updated_at=now() WHERE id='pcat_el_12x6_12';
UPDATE product_category SET name='Pokerilauad ja -tarvikud', updated_at=now() WHERE id='pcat_el_12x1_11';
UPDATE product_category SET name='Korvpallirõngad, -korvid ja tarvikud', updated_at=now() WHERE id='pcat_el_12x1_6';
UPDATE product_category SET name='Puslelauad ja -alused', updated_at=now() WHERE id='pcat_el_12x1_32';
UPDATE product_category SET name='Tennise pallimasinad ja -korvid', updated_at=now() WHERE id='pcat_el_12x1_24';
UPDATE product_category SET name='Barjääri- ja praktikavõrgud', updated_at=now() WHERE id='pcat_el_12x1_38';
UPDATE product_category SET name='Õue- ja peomängud', updated_at=now() WHERE id='pcat_el_12x1_17';
UPDATE product_category SET name='Staadionitoolid', updated_at=now() WHERE id='pcat_el_12x1_18';
UPDATE product_category SET name='Jalgratta haagised', updated_at=now() WHERE id='pcat_el_12x1_29';
UPDATE product_category SET name='Kaabeltrenažööri tarvikud ja plokisüsteemid', updated_at=now() WHERE id='pcat_el_12x3_22';
UPDATE product_category SET name='Joogamatid ja treeningmatid', updated_at=now() WHERE id='pcat_el_12x3_7';
UPDATE product_category SET name='Balletitangid (barre)', updated_at=now() WHERE id='pcat_el_12x3_10';
UPDATE product_category SET name='Kettaste hoidikud ja -restid', updated_at=now() WHERE id='pcat_el_12x3_20';
UPDATE product_category SET name='Ronimisköied', updated_at=now() WHERE id='pcat_el_12x1_21';
COMMIT;
