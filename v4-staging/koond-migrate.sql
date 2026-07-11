BEGIN;
-- FAAS 1 väiksemate mainide koond-pass
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_15ratik','Rätikusoojendid','','v4-tervis-ratikusoojendid',true,false,'pcat_v4_l15_3','pcat_v4_l15.pcat_v4_l15_3.pcat_15ratik',90,now(),now()),
 ('pcat_15kohver','Kosmeetikakohvrid','','v4-tervis-kosmeetikakohvrid',true,false,'pcat_v4_l15_1','pcat_v4_l15.pcat_v4_l15_1.pcat_15kohver',90,now(),now()),
 ('pcat_15lash','Ripsme- ja iluteeninduse valgustid','','v4-tervis-ripsme-valgustid',true,false,'pcat_v4_l15_1','pcat_v4_l15.pcat_v4_l15_1.pcat_15lash',91,now(),now()),
 ('pcat_15aedik','Mänguaedikud','','v4-tervis-manguaedikud',true,false,'pcat_v4_l15_2','pcat_v4_l15.pcat_v4_l15_2.pcat_15aedik',90,now(),now()),
 ('pcat_4jaatis','Jäätisemasinad','','v4-kodumasinad-jaatisemasinad',true,false,'pcat_v4_l4_1','pcat_v4_l4.pcat_v4_l4_1.pcat_4jaatis',90,now(),now()),
 ('pcat_6konv','Konverentsi- ja koosolekulauad','','v4-moobel-konverentsilauad',true,false,'pcat_v4_l6_3','pcat_v4_l6.pcat_v4_l6_3.pcat_6konv',90,now(),now()),
 ('pcat_6winder','Kellakerijad','','v4-moobel-kellakerijad',true,false,'pcat_v4_l6_1','pcat_v4_l6.pcat_v4_l6_1.pcat_6winder',90,now(),now()),
 ('pcat_6cubby','Laste nagid ja garderoob','','v4-moobel-laste-nagid-ja-garderoob',true,false,'pcat_v4_l6_7','pcat_v4_l6.pcat_v4_l6_7.pcat_6cubby',90,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_15ratik',3,'active','manual',true,11,now(),now()),
 ('pcat_15kohver',3,'active','manual',true,6,now(),now()),
 ('pcat_15lash',3,'active','manual',true,6,now(),now()),
 ('pcat_15aedik',3,'active','manual',true,7,now(),now()),
 ('pcat_4jaatis',3,'active','manual',true,6,now(),now()),
 ('pcat_6konv',3,'active','manual',true,6,now(),now()),
 ('pcat_6winder',3,'active','manual',true,6,now(),now()),
 ('pcat_6cubby',3,'active','manual',true,7,now(),now());
UPDATE product_category_product SET product_category_id='pcat_15ratik' WHERE product_id IN ('prod_01KP6FBRC7R9RDZR1S4T6S5WQC','prod_01KPJV8993W4XJNR8VEYEMVJC3','prod_01KPJV89F89BHTDENW5KHPM1FN','prod_01KNXX9C9ZPDM9QSFQ3N07P1EF','prod_01KNXXR3YC3SCAYSFP6V7N6GK8','prod_01KNXXETJPD8KBAQJV0M9WN73K','prod_01KNXXEVEZSTHHSS4J8QBEHTWD','prod_01KNXX8YMYBKQQFH9V95CS43V2','prod_01KNXXREST1FCHNJBVN96952R9','prod_01KNXXR3Z94JEMH10BMC3BFX8F','prod_01KNXXR3YFE6XG4Z4C3217VF40');
UPDATE product_category_product SET product_category_id='pcat_15kohver' WHERE product_id IN ('prod_01KNXXA1745DR2VM2KMJW9RN3Z','prod_01KNXXA09K66AD2QDP199YYXYD','prod_01KNXXA09F3Y3N41F14Q92MQ3E','prod_01KNXXA8G9WMSJ4DRW5QAWDAVF','prod_01KNXXAX69QN3SC8WHTEGBHS6H','prod_01KNXXA09E2E47RHYYEAYYYDHS');
UPDATE product_category_product SET product_category_id='pcat_15lash' WHERE product_id IN ('prod_01KNXXMDF3ZPADE58YH2GZ0NN2','prod_01KNXXMDF82Z77VBWC45J18YHF','prod_01KNXXMCKKPB1WE5P03B2WN5FK','prod_01KNXXMCKJNPWA5ACJ1HTKG3CS','prod_01KNXXMECBCNME3E7XC89BBSD8','prod_01KNXXMCKDNBCCRF0K7BWHKCZ9');
UPDATE product_category_product SET product_category_id='pcat_15aedik' WHERE product_id IN ('prod_01KNXXBQANHTE9FHHMRJDASA4K','prod_01KNXXSYKK1X6QJTBZ9NRJW6ZG','prod_01KNXXSYKMHYCGDJTYHMPK2Z0D','prod_01KNXXSYMK0YH84XGMFBZ93HQK','prod_01KNXXT0DDHNDNYS2V0NB6DRWD','prod_01KNXXRQPZ9D8ABPAC3FJ277PT','prod_01KNXXG6ED7FKD00RV80B8EK1B');
UPDATE product_category_product SET product_category_id='pcat_4jaatis' WHERE product_id IN ('prod_01KNXX941H9N4Z52260W8FRSHN','prod_01KNXX941FMPJK4FDFA6W7FBE3','prod_01KNXXRC2C76080T204B0ZM4GZ','prod_01KNXXRA8GFD2P143W5NH042Z5','prod_01KNXXQVMC99ZJGC737CR8K4KR','prod_01KNXXT3TQ7R6YNAKMN22KGVE8');
UPDATE product_category_product SET product_category_id='pcat_6konv' WHERE product_id IN ('prod_01KPJV7R0F32P3Q07EQX0PPMWR','prod_01KP6FBH1TRSZQA4SG48JW9VWJ','prod_01KPJV7RBMC5NCK7J6STDQNZ7M','prod_01KPJV7RHVQ6T0SDV3JSA1K8Q2','prod_01KPJV7R6E2A4SPFC7YVMGTFFY','prod_01KPJV7RRB366WGKX2B8AEZ202');
UPDATE product_category_product SET product_category_id='pcat_6winder' WHERE product_id IN ('prod_01KNXXB0VJPHJY2N45NKFTV9HX','prod_01KNXXAZXR2V3SQDB57WVNRAC9','prod_01KNXXAY34GEVVYY5056MTRE3T','prod_01KNXXAJEJG9RV4ZHX89BZQF0Q','prod_01KNXXAKB7GNPVEJ8YWMERF1J0','prod_01KNXXAJF8F7JWVHR7E6R33MFP');
UPDATE product_category_product SET product_category_id='pcat_6cubby' WHERE product_id IN ('prod_01KPJVG3BKMNPEQV3ZMB4D5KPF','prod_01KPJVG2SAHA9PB3T7663XKMZK','prod_01KPJVG2KZA2PV66RWTM537E3Q','prod_01KPJVG355PHXXDQ9GAE5G138D','prod_01KP6FFMG0DX18QR1Y2MCF0C49','prod_01KPJVG3J2QTHA6WY2CV3JYPDY','prod_01KPJVG2YNVZ0003TQXVJEDSGK');
UPDATE product_category_product SET product_category_id='pcat_f4_15x1_3' WHERE product_id IN ('prod_01KNXXD6AGQWY8PY3TNY3SHP7S');
UPDATE product_category_product SET product_category_id='pcat_f4_15x1_2' WHERE product_id IN ('prod_01KNXXGTYSRQ0HPH3BQQVZQE4P');
UPDATE product_category_product SET product_category_id='pcat_f4_15x1_1' WHERE product_id IN ('prod_01KNXXD9YB2BK2821Y9XVGY590');
UPDATE product_category_product SET product_category_id='pcat_15pesu' WHERE product_id IN ('prod_01KNXX6FHSCSPRA4HQZMS7DH2X','prod_01KNXXK1ZQ5ACJTSNVWCZS8171','prod_01KNXXK13H4YPFJHD3GQ6SQGCR','prod_01KNXXDDGPX5AESCBS9CPCRS13','prod_01KNXXDDGMXDR4WQ496AW24ZMV');
UPDATE product_category_product SET product_category_id='pcat_f4_15x1_6' WHERE product_id IN ('prod_01KNXXBKRRD47QN7CGNFGVA238');
UPDATE product_category_product SET product_category_id='pcat_f4_16x1_4' WHERE product_id IN ('prod_01KNXXD2MQTEY4MT1YPKGTT9NC','prod_01KNXXD5E7WXSMTDW58XBPNJN7','prod_01KNXXD2MJPFPGDY3TJM8Y4A7V');
UPDATE product_category_product SET product_category_id='pcat_mv_6x4_9' WHERE product_id IN ('prod_01KNXXNN7TSHSYEA79N44RZP0C','prod_01KNXXNZ5WD79GRHHFEVA3RB48','prod_01KNXXNN7SWSY8516E7P16EA8H','prod_01KNXXNN8G8082QNKSNX8NJ4DG','prod_01KNXXNN7V47F7BNEDD8ESVVDB');
UPDATE product_category_product SET product_category_id='pcat_t3f_8_6' WHERE product_id IN ('prod_01KNXXNKEN7GSXDQ589WKT5GS3','prod_01KNXXNMAEQ583S0WH652VX888');
UPDATE product_category_product SET product_category_id='pcat_f4_16x1_9' WHERE product_id IN ('prod_01KNXXT76FRQSQ6GQH466A24Z7');
UPDATE product_category_product SET product_category_id='pcat_f4_16x1_7' WHERE product_id IN ('prod_01KNXXQEZFC6GW1ZS09GF14PSQ');
UPDATE product_category_product SET product_category_id='pcat_f4_16x2_4' WHERE product_id IN ('prod_01KNXXN7N0C91MZ6ARJ8V3K10J');
UPDATE product_category_product SET product_category_id='pcat_9traf2' WHERE product_id IN ('prod_01KNXXA7MGDN4H5SYYF5CWQFA5','prod_01KNXXA7MA6D8SQBB48EGF2JAY','prod_01KNXXAN4VYTQS2R95THVXZPS5','prod_01KNXXAN4ZHKS7YVC4Q5PXYXMQ','prod_01KNXXA7KH16JYHE0871W406V4','prod_01KNXXA7KKS5KKFFWY8YMKQK2Y','prod_01KNXXA7M4RVNBHGJJ9D0JG4JT','prod_01KNXXA7MENEKYJTNH8NPG0S6X','prod_01KNXXAPYSNSS6GN9JWAGJB2A0','prod_01KNXXA7MDWGFB1YE8N4ETCS4F','prod_01KNXXA7KJKN3S037ZP40WE1DS','prod_01KNXXSDBP928DBGR0K7YX3R20','prod_01KNXXSTV4BDF7RRN2WGD4KBGZ','prod_01KNXXCD2J4KQT9W9WC4R7S34D','prod_01KNXXCD2K18AFYM8AJDHJKRBW','prod_01KNXXS9PPGR508T8AMSF3P7RY','prod_01KNXX7N28DA0FAQK773R4W93Z');
UPDATE product_category_product SET product_category_id='pcat_9traf1' WHERE product_id IN ('prod_01KNXXRT9CYDRCX1VG5ZYNHBTV','prod_01KNXXRV751FFFFKPTR9A270A8','prod_01KNXXRW3P5VXWEMG7H0W6HTSD','prod_01KNXXRV70D5RT77G1JR1J1DAG');
UPDATE product_category_product SET product_category_id='pcat_t3f_13_7' WHERE product_id IN ('prod_01KNXXM74TZ0T5Z9VYQC595H0P','prod_01KPJVDD1HDXEXF2953HMJP27T');
UPDATE product_category_product SET product_category_id='pcat_ag2_3x1_2' WHERE product_id IN ('prod_01KPJVH0NTADYR3VPRH0RX5G82','prod_01KPJVGYZKV1809M9CF8AD0MJC','prod_01KPJVH0W3FQZ26NYS5VJT5SVC','prod_01KPJVGYSEA90YSCK80FF8TT09','prod_01KP6FG0744ASTERHF1MDCSHFA','prod_01KPJVH12CN9QTH236C047TZS9','prod_01KP6FG0YW4GBY8JJ9M41TXM1W');
UPDATE product_category_product SET product_category_id='pcat_es_9x5_5' WHERE product_id IN ('prod_01KNXXAB6QWYJYFA45CM1ARGEV','prod_01KNXXAFQ77A5RK9QQEB58WYAN','prod_01KNXXQ1BPJKSSYKSW1PVWR1X5','prod_01KNXXPK201DSP8JK30QRWYJ1V');
UPDATE product_category_product SET product_category_id='pcat_mv_6x7_11' WHERE product_id IN ('prod_01KNXXDBRFK60G5JRYEQZE1WRT','prod_01KNXXD91NFFK3YVN2X14TJSZ1');
UPDATE product_category_product SET product_category_id='pcat_f4_13x6_1' WHERE product_id IN ('prod_01KPJVA0JX45TF7CQ81S8VHKC9','prod_01KNXXNEW2YM85DEWE4YNFPT4X');
UPDATE product_category_product SET product_category_id='pcat_f4_13xtex_14' WHERE product_id IN ('prod_01KNXX7ZVQPYGC651DMV1DXQ3C');
UPDATE product_category_product SET product_category_id='pcat_f4_13x1_16' WHERE product_id IN ('prod_01KNXX9SY2X3X214NSMZWWE6ME','prod_01KNXX9VRNT3TW9KSH80CP1938','prod_01KNXX9TV7C75RJN83FYRVFY6N','prod_01KNXX9VRQERZETD70TQGXRH5B','prod_01KNXX9TVA7EBJY1AE5NH3YAMX');
UPDATE product_category_product SET product_category_id='pcat_f4_13xtex_13' WHERE product_id IN ('prod_01KNXX6JBVEMNFC8Z5SBZSYRBC');
UPDATE product_category_product SET product_category_id='pcat_4triik' WHERE product_id IN ('prod_01KNXX8V3J2GT235J520TJR9Y9','prod_01KNXX8V3Q12817K4J2ZD6BJ48');
UPDATE product_category_product SET product_category_id='pcat_mv_6x4_12' WHERE product_id IN ('prod_01KNXXJTQTZAW6AYDZQBA9Q734','prod_01KNXXJVNQ11QF12ZK2FWHN6VW','prod_01KPJX9RGFHZKCM5W42HKDBS94','prod_01KPJX9RQ9BGT08H12B2EQXHSV','prod_01KNXXRJF6M64RY8Y3C2RTGM23');
UPDATE product_category_product SET product_category_id='pcat_mv_6x3_4' WHERE product_id IN ('prod_01KNXXNXC4YH8GA6GX77TC6F1M','prod_01KNXXNY8XF8EZZKZNMRPA040Q');
UPDATE product_category_product SET product_category_id='pcat_mv_6x1_29' WHERE product_id IN ('prod_01KNXXMKTQQ6DJG70EMSMJ83AQ','prod_01KNXXMNM0F2FBZNJDJB363JYA','prod_01KNXXK8A6XDMK12PZB48NRAYQ','prod_01KNXXK8A5MQ1ZJ2PK3Q6WWVK3');
UPDATE product_category_product SET product_category_id='pcat_ag_3_8' WHERE product_id IN ('prod_01KPJVFP1R9JJ1Y6V37GY5RW9N','prod_01KP6FFG0DB2CK07PZY1J3HVRK','prod_01KPJVFP81TTK8PQ72R6KFEXDR');
UPDATE product_category_product SET product_category_id='pcat_la9_1' WHERE product_id IN ('prod_01KPJV8YP4JPYVAAQ8F1WZ9CM4','prod_01KPJV8Z99098SV990N4T3TX0H','prod_01KPJV8ZFHQ96YYPDR16BN708Y','prod_01KPJV8Z2S99RX5H733KD2Z2CK','prod_01KNXX8BNNBC8TCY3REQN3XHD3','prod_01KNXX8SAMP8A80YB82T0Z2VN5');
UPDATE product_category_product SET product_category_id='pcat_ks_4x3_4' WHERE product_id IN ('prod_01KNXXB2MFM937WM2G8570ZSYT','prod_01KNXXA4VWM4MVBFZVNBA4CQ4H','prod_01KNXXA5RQNAKAB1E0PQ0DGE5V');
UPDATE product_category SET parent_category_id='pcat_v4_l6_10', mpath='pcat_v4_l6.pcat_v4_l6_10.pcat_mv_6x7_3', updated_at=now() WHERE id='pcat_mv_6x7_3';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_es_9x12_1';
UPDATE product_category SET deleted_at=now(),updated_at=now() WHERE id='pcat_es_9x12_1';
UPDATE product_category SET name='Meigipeeglid', updated_at=now() WHERE id='pcat_f4_15x1_4';
UPDATE product_category SET name='Maniküüriseadmed', updated_at=now() WHERE id='pcat_f4_15x1_6';
UPDATE product_category SET name='Mängumatid', updated_at=now() WHERE id='pcat_f4_15x2_3';
UPDATE product_category SET name='Jäämasinad', updated_at=now() WHERE id='pcat_ks_4x1_6';
UPDATE product_category SET name='Seinakellad', updated_at=now() WHERE id='pcat_mv_6x1_19';
UPDATE product_category SET name='Maakerad ja gloobused', updated_at=now() WHERE id='pcat_mv_6x7_12';
COMMIT;
