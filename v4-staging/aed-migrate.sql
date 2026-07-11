BEGIN;
-- FAAS 1 #7 Aed kombineeritud lukk
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_7mults','Kummimultš ja multšmatid','','v4-aed-kummimults-ja-multsmatid',true,false,'pcat_v4_l7_3','pcat_v4_l7.pcat_v4_l7_3.pcat_7mults',90,now(),now()),
 ('pcat_7akked','Äkked ja järelveetavad rullid','','v4-aed-akked-ja-jarelveetavad-rullid',true,false,'pcat_v4_l7_1','pcat_v4_l7.pcat_v4_l7_1.pcat_7akked',90,now(),now()),
 ('pcat_7vaiad','Mõõdistus- ja markeerimisvaiad','','v4-aed-moodistus-ja-markeerimisvaiad',true,false,'pcat_v4_l7_10','pcat_v4_l7.pcat_v4_l7_10.pcat_7vaiad',90,now(),now()),
 ('pcat_7grillkate','Grillikatted','','v4-aed-grillikatted',true,false,'pcat_v4_l7_4','pcat_v4_l7.pcat_v4_l7_4.pcat_7grillkate',90,now(),now()),
 ('pcat_7jaavann','Jäävannid ja külmateraapia','','v4-aed-jaavannid-ja-kulmateraapia',true,false,'pcat_v4_l7_2','pcat_v4_l7.pcat_v4_l7_2.pcat_7jaavann',90,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_7mults',3,'active','manual',true,6,now(),now()),
 ('pcat_7akked',3,'active','manual',true,6,now(),now()),
 ('pcat_7vaiad',3,'active','manual',true,5,now(),now()),
 ('pcat_7grillkate',3,'active','manual',true,8,now(),now()),
 ('pcat_7jaavann',3,'active','manual',true,3,now(),now());
UPDATE product_category_product SET product_category_id='pcat_7mults' WHERE product_id IN ('prod_01KPVXN1N60659XAJ70209AX3D','prod_01KNXXKESD3W6R5RVMGRBTBV1Q','prod_01KNXXKERQT187HDTM3X72W7P2','prod_01KNXXKGJKV00EGRDBYVECS8GJ','prod_01KNXXKERSP83CGXVJJX808MX9','prod_01KNXXKFNS7C51F5Q9WY4DBC9G');
UPDATE product_category_product SET product_category_id='pcat_7akked' WHERE product_id IN ('prod_01KNXXP7BP6P5EJF8T33RMT6SM','prod_01KNXXMS68G8DNQF58DA93XA58','prod_01KNXXNVHFS9NYFCF485BV92BP','prod_01KNXXP6EKK7FD2MTMYN8M93XZ','prod_01KNXXAY2836NF2ZDFT9W2B0J1','prod_01KNXX9HT9A61EJNGBKJ6BW05B');
UPDATE product_category_product SET product_category_id='pcat_7vaiad' WHERE product_id IN ('prod_01KNXXT0DK52F9D8S7JVG558CK','prod_01KNXXT0CVJ7HFT8TJ97QPZS9C','prod_01KNXXT0CZ452C0RF05CPKDBS9','prod_01KNXXT0CVPH4XMVRHRXPB8PNR','prod_01KNXXT0DCBYKQQCMHCAY13131');
UPDATE product_category_product SET product_category_id='pcat_7grillkate' WHERE product_id IN ('prod_01KNXXMWRSR4JFHQZD0XVCHB98','prod_01KNXXMXMJ31NQ8PNATN480GG1','prod_01KNXXMXN3QGJ4R651E6RXPHNM','prod_01KNXXMWRR8PXK95A0W70R3TSW','prod_01KNXXMXMDXFHS7XD08JGFV4QH','prod_01KNXXMWR7YGMEXBTP9YWNSXF4','prod_01KNXXMXMM0XG1FN72FJR9Q78S','prod_01KNXXMWRT3TKW9QQZP6Q19MMA');
UPDATE product_category_product SET product_category_id='pcat_7jaavann' WHERE product_id IN ('prod_01KNXXFP7H1CJZ1W5AGNGVXNDM','prod_01KNXXFNAEMEGXVZ8DJ0Z4D7V6','prod_01KNXXFNAD5DR6XTPP513XSH3C');
UPDATE product_category_product SET product_category_id='pcat_t3a_10_5' WHERE product_id IN ('prod_01KNXXDPJKBTJ22W7HNVZ5ND8N','prod_01KNXX6Z3XA0Z5J0QM2C2QA1G0','prod_01KNXX70346SHJCW3X7PD6MXM3','prod_01KNXX6Z3PFSER29TXWSG23RDW','prod_01KNXX6Z3XP6QXYEG7H0EB605N','prod_01KNXX6Z3QXFQKPTPZCTJ6KQGM','prod_01KNXX7033X3T1P1A1T0QR0FQN','prod_01KNXX7038S9QH8DR144D1SZ2X','prod_01KNXX703A1C48V530GMJ3ZBBS','prod_01KNXX7039RSSM7DVABEKP2Q52','prod_01KNXX7KBDS6W8PW4ZTZYDX6ME','prod_01KNXXMNKJK6HZW6N18ZTKBZPK','prod_01KNXXMNKYCSVZWDENN10FB62Z','prod_01KNXXMMPF8N7W68SBFSHVMY8B','prod_01KNXXMNM15Y12Z9S3DGRSPEHK');
UPDATE product_category_product SET product_category_id='pcat_t3a_1_16' WHERE product_id IN ('prod_01KNXX9GXXMAP0CK5GCY6RZDZG','prod_01KNXXMQCC9438TF6YEH8PFHAC','prod_01KNXXMQCAAWYEGD7MPZA3B7YH','prod_01KNXXMQC45G9BKJSAVMWWSZPC','prod_01KPJXF7F1E0A5Z9Q59MEB9J99');
UPDATE product_category_product SET product_category_id='pcat_t3f_2_7' WHERE product_id IN ('prod_01KNXX6PBTDN21SSYHN7YHDC3F','prod_01KNXXPAZV60AVXQZYAX78GE8B','prod_01KNXXPBYRANTQ90ZYBZ8K1X85');
UPDATE product_category_product SET product_category_id='pcat_t3a_5_9' WHERE product_id IN ('prod_01KNXX99JABSH1CBA0KNAPYHH9','prod_01KNXX98NNMR4RWDPH5M3H6R73','prod_01KPJXEV42GCQB37FR456419B3','prod_01KPJXEVHS8PKTDPXQTAWJ523G','prod_01KPJXBDYP479SYE29BAAGS4K6','prod_01KNXXFKG3VGTETFQB9V9Z9BAC','prod_01KNXXFP7GQ71CQSW9164Y4MNR','prod_01KNXXS57TKC3JXSPZ6EHP5A1G','prod_01KPJX9XD1JSQWSH5AW8JGWMHR','prod_01KNXXS2GTF8X732MZZVR13JJ6');
UPDATE product_category_product SET product_category_id='pcat_1surv2' WHERE product_id IN ('prod_01KNXXRZSVDKR5XKXERM00RESF','prod_01KNXXJ2F5Z6KQ9Y1DTEJ2T0EZ','prod_01KNXXJAHP056V49TCTNPXP3TJ');
UPDATE product_category_product SET product_category_id='pcat_t3a_1_17' WHERE product_id IN ('prod_01KNXXSG2M0ZN06KPRSTNH3VJB','prod_01KNXXSQ69FX8GTS1GTVTN9KFV');
UPDATE product_category_product SET product_category_id='pcat_t3h_12_1' WHERE product_id IN ('prod_01KNXXMF9NGA89FJR3B5MRSYM8','prod_01KNXX78JKPCSXZ6KMMPW4M5M4');
UPDATE product_category_product SET product_category_id='pcat_1surv1' WHERE product_id IN ('prod_01KPJXDG7V7CDNJ1CKRHB2N6RJ','prod_01KNXXM8Z6BMQ6P68WXTA8ZJ63','prod_01KNXXM74SAN9GW0DV61JT2Y32','prod_01KNXXM5BEH7KN6Y88YW12P5FX','prod_01KNXX703CCMXSXTEJE2FBJ0TZ','prod_01KNXX9S21EY52MPX9PEDX06XS','prod_01KNXXADXSCT5JT22GWTX8WK6A','prod_01KNXXS4BNTKAN54G95KRGGHKA','prod_01KNXXSBG1Y4ETC2PDP37R26GH','prod_01KNXXS58FFSDQ3K6HE8MWBENN');
UPDATE product_category_product SET product_category_id='pcat_t3a_1_7' WHERE product_id IN ('prod_01KPJVGY5REFECRT3H5GYGDNWV','prod_01KNXXN35BT9350HRRTCJSVM8M','prod_01KNXXN35MV0H3CFSCD2F4JF58','prod_01KNXXDTZRTM3480RZX4HQKT76','prod_01KNXXDS8FED1157QEXSBVPPM6','prod_01KNXXDPJR126PZYGT6G8YM2H4','prod_01KNXXDPJPJ8M51E11S89CEJ1K');
UPDATE product_category_product SET product_category_id='pcat_t3a_1_8' WHERE product_id IN ('prod_01KPJXCZWMCM0ANJGF726V31GP','prod_01KPJXCX62V8AGGCEKHABZESE6');
UPDATE product_category_product SET product_category_id='pcat_t3a_5_7' WHERE product_id IN ('prod_01KNXXRNXP38SCNAERA2EEWWAP');
UPDATE product_category_product SET product_category_id='pcat_t3a_2_5' WHERE product_id IN ('prod_01KNXXFGSFRX8EQ2VEX1J1E5Q8','prod_01KNXXFE49S6E5RWX68C8BNQSP','prod_01KNXXFEZM6G2YFGQTAD21S7J9');
UPDATE product_category_product SET product_category_id='pcat_7cart5' WHERE product_id IN ('prod_01KNXXJF0PK0191XS3KGS5DDRG','prod_01KNXXJF0S2Y9H6H4XK1PRAVMJ');
UPDATE product_category_product SET product_category_id='pcat_t3a_7_2' WHERE product_id IN ('prod_01KNXXCHM4YYYM059GVYD5T667');
UPDATE product_category_product SET product_category_id='pcat_t3a_7_6' WHERE product_id IN ('prod_01KNXXGS4TANJ0WXWW2S57JVH2');
UPDATE product_category_product SET product_category_id='pcat_t3a_7_4' WHERE product_id IN ('prod_01KNXXQWH3F2NT8RHNQ9D35Q6K');
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3a_5_1';
UPDATE product_category SET deleted_at=now(),updated_at=now() WHERE id='pcat_t3a_5_1';
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_t3a_1_30';
UPDATE product_category SET deleted_at=now(),updated_at=now() WHERE id='pcat_t3a_1_30';
UPDATE product_category SET name='Kunstmuru', updated_at=now() WHERE id='pcat_km7';
UPDATE product_category SET name='Rehad', updated_at=now() WHERE id='pcat_t3a_1_8';
UPDATE product_category SET name='Grilliplaadid', updated_at=now() WHERE id='pcat_t3a_4_1';
UPDATE product_category SET name='Oksasaed ja varrelõikurid', updated_at=now() WHERE id='pcat_t3a_1_19';
UPDATE product_category SET name='Mullivannid', updated_at=now() WHERE id='pcat_t3a_2_19';
COMMIT;
\echo '--- dissolve tühjad(0)? ---'
SELECT id,(SELECT count(*) FROM product_category_product WHERE product_category_id=pc.id) n FROM product_category pc WHERE id IN ('pcat_t3a_5_1','pcat_t3a_1_30');
