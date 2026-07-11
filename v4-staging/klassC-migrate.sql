BEGIN;
-- Klass C väiksed FLAG-id
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_4oil','Õlipressid','','v4-kodumasinad-olipressid',true,false,'pcat_v4_l4_1','pcat_v4_l4.pcat_v4_l4_1.pcat_4oil',91,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_4oil',3,'active','manual',true,2,now(),now());
UPDATE product_category_product SET product_category_id='pcat_4oil' WHERE product_id IN ('prod_01KNXXBZE31WSXT2CBRD7EF6CE','prod_01KNXXC3ZW7MCPWTXN8HK4YM0A');
UPDATE product_category_product SET product_category_id='pcat_ag2_2x1_15' WHERE product_id IN ('prod_01KNXXBHXZW39WMZ0FJGNPEN19','prod_01KPJVGVXGAN2BRRDRB3TWGVA6','prod_01KNXXRZRY31S1CEBMGG16PTN9');
UPDATE product_category_product SET product_category_id='pcat_25kynal' WHERE product_id IN ('prod_01KNXX9D7V75BTWH52RX61TE53','prod_01KNXXSP8CSNJN3X776W4ATXGP');
UPDATE product_category_product SET product_category_id='pcat_f4_13xtex_11' WHERE product_id IN ('prod_01KNXXH8DQGSGY55W7WY64M0Y6','prod_01KNXXH9AN3PHDPJPGV678ZXQP','prod_01KNXXH99N0MZ3PV6SF2H1C8AQ','prod_01KNXXH9AP8AHFMHSG3ZEDDZWJ');
UPDATE product_category_product SET product_category_id='pcat_t3a_1_6' WHERE product_id IN ('prod_01KNXXFS0X31C6XESMRFTGM05T','prod_01KPJXCN6W7FF6RHMT00ZPQ7E8','prod_01KPJVD915XJ0DT9JV7A0CCH8Z','prod_01KP6FDTN9Z9WGHPVAK12PE3ZA','prod_01KPJVD8TPXQ6Z2N3Q7FK3VZ85','prod_01KNXXQGT3XPMZB57JDWG1H8NF');
UPDATE product_category_product SET product_category_id='pcat_t3a_5_2' WHERE product_id IN ('prod_01KNXXRN20FBXK3T540922BQAR','prod_01KNXXRZRYMADRYX174ZJ5K9CN');
UPDATE product_category_product SET product_category_id='pcat_mv_6x13_1' WHERE product_id IN ('prod_01KNXXKK901GRBAVN7V6GWMDTE');
UPDATE product_category_product SET product_category_id='pcat_mv_6x10_2' WHERE product_id IN ('prod_01KNXXSH0BMSHXPRDX6RGGFV56');
UPDATE product_category_product SET product_category_id='pcat_6kpuu' WHERE product_id IN ('prod_01KNXX934KFZNTRSHQF8V520RZ');
UPDATE product_category_product SET product_category_id='pcat_mv_6x3_4' WHERE product_id IN ('prod_01KNXXNXC4YH8GA6GX77TC6F1M','prod_01KNXXNY8XF8EZZKZNMRPA040Q');
UPDATE product_category_product SET product_category_id='pcat_mv_6x4_12' WHERE product_id IN ('prod_01KNXXJTQTZAW6AYDZQBA9Q734','prod_01KNXXJVNQ11QF12ZK2FWHN6VW','prod_01KPJX9RGFHZKCM5W42HKDBS94','prod_01KPJX9RQ9BGT08H12B2EQXHSV');
UPDATE product_category_product SET product_category_id='pcat_mv_6x8_5' WHERE product_id IN ('prod_01KNXXKTH08RMVE3Y3F83QJN57','prod_01KNXXKSN0ZGPPX94DWMY64C74','prod_01KNXXKTH1S5G4B783SQWZXG9J');
UPDATE product_category_product SET product_category_id='pcat_mv_6x5_10' WHERE product_id IN ('prod_01KPJV6ZEWDRM0AB54Z9RH34DH');
UPDATE product_category_product SET product_category_id='pcat_mv_6x7_8' WHERE product_id IN ('prod_01KNXXRN1BNDYQ4Z126QGHXZCX','prod_01KNXXRRHD2N8ZPSR4DV109V4G','prod_01KNXXGN686TDMV0GE5H0VS500','prod_01KNXXGM7DSZ2PY3V5RR3EA0N5');
UPDATE product_category_product SET product_category_id='pcat_mv_6x1_4' WHERE product_id IN ('prod_01KNXXHTCR5QZHJ367ZTMT5CCV');
UPDATE product_category_product SET product_category_id='pcat_mv_6x1_30' WHERE product_id IN ('prod_01KPJVF9MEM3R7KRB9HS84EVRC');
UPDATE product_category_product SET product_category_id='pcat_mv_6x6_5' WHERE product_id IN ('prod_01KPJVFTWQ4JZD0VVSBB426BTT');
UPDATE product_category_product SET product_category_id='pcat_mv_6x4_3' WHERE product_id IN ('prod_01KNXXSNBQ1FA3BBW7FPJY4FZZ','prod_01KNXXSQ746FRZN26KD0V66QNT');
UPDATE product_category_product SET product_category_id='pcat_mv_6x1_24' WHERE product_id IN ('prod_01KNXX8WVMCE37AX0P4X79VKM4');
UPDATE product_category_product SET product_category_id='pcat_mv_6x6_1' WHERE product_id IN ('prod_01KNXXK9C5DWHQ9YW5KM48RBYS');
UPDATE product_category_product SET product_category_id='pcat_mv_6x6_10' WHERE product_id IN ('prod_01KNXXJJK4T6NQGXAGFA1NEGD5');
UPDATE product_category_product SET product_category_id='pcat_mv_6x2_4' WHERE product_id IN ('prod_01KNXXHV9PF28ENZ1827855WD0','prod_01KNXXSKN6WNG99VRZT0H6X0C0','prod_01KNXXSKN3DWGKKHTR24P7TJXQ');
UPDATE product_category_product SET product_category_id='pcat_mv_6x2_2' WHERE product_id IN ('prod_01KNXXH22JP45VWS1F95DBMKK6','prod_01KNXXH16RBBDYN8QH412JP21N');
UPDATE product_category_product SET product_category_id='pcat_mv_6x2_1' WHERE product_id IN ('prod_01KNXXQTPXMS5VDX18HKPZPBAS','prod_01KNXXQTPRHRR7P6R1EKPBDFMD','prod_01KNXXJHPHJAGWSQFVH1WN1RT4');
UPDATE product_category_product SET product_category_id='pcat_mv_6x6_2' WHERE product_id IN ('prod_01KNXXT20RNH2EWEHYCTTSRNRD');
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_ag_3_7';
UPDATE product_category SET deleted_at=now(),updated_at=now() WHERE id='pcat_ag_3_7';
UPDATE product_category SET name='3D-printeri filamendiriiulid', updated_at=now() WHERE id='pcat_mv_6x2_17';
COMMIT;
