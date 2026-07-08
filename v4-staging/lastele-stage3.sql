BEGIN;
-- ===== STAGE 3: 6 mixed L3 → Lastele (whole reparent) + B välja =====
-- Reparent 6 mixed L3 whole → Lastele L2 (handle jääb, #23 precedent)
UPDATE product_category SET parent_category_id='pcat_24soid', mpath='pcat_v4_l24.pcat_24soid.'||id, updated_at=NOW() WHERE id='pcat_el_12x2_3';
UPDATE product_category SET parent_category_id='pcat_24oue', mpath='pcat_v4_l24.pcat_24oue.'||id, updated_at=NOW() WHERE id IN ('pcat_el_12x2_5','pcat_el_12x2_6');
UPDATE product_category SET parent_category_id='pcat_24sprt', mpath='pcat_v4_l24.pcat_24sprt.'||id, updated_at=NOW() WHERE id='pcat_el_12x2_16';
UPDATE product_category SET parent_category_id='pcat_24veh', mpath='pcat_v4_l24.pcat_24veh.'||id, name='Laste reisikohvrid', updated_at=NOW() WHERE id='pcat_el_12x2_22';
UPDATE product_category SET parent_category_id='pcat_24veh', mpath='pcat_v4_l24.pcat_24veh.'||id, name='Laste tõukerattad', updated_at=NOW() WHERE id='pcat_el_12x2_1';

-- Uued #12 B-kodud (Õuetegevus & hobi, etalon-nimed)
INSERT INTO product_category (id,name,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
('pcat_12scoot','Tõukerattad','v4-sport-ja-vaba-aeg-ouetegevus-toukerattad',true,false,'pcat_v4_l12_1','pcat_v4_l12.pcat_v4_l12_1.pcat_12scoot',17,NOW(),NOW()),
('pcat_12swing','Aiakiiged & kiige-furnituur','v4-sport-ja-vaba-aeg-ouetegevus-aiakiiged',true,false,'pcat_v4_l12_1','pcat_v4_l12.pcat_v4_l12_1.pcat_12swing',18,NOW(),NOW()),
('pcat_12adv','Seiklusrajad (zipline & ninja)','v4-sport-ja-vaba-aeg-ouetegevus-seiklusrajad',true,false,'pcat_v4_l12_1','pcat_v4_l12.pcat_v4_l12_1.pcat_12adv',19,NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,created_at,updated_at) VALUES
('pcat_12scoot',3,'active','manual',true,NOW(),NOW()),('pcat_12swing',3,'active','manual',true,NOW(),NOW()),('pcat_12adv',3,'active','manual',true,NOW(),NOW());

-- Move B-tooted välja (id-põhine)
UPDATE product_category_product SET product_category_id='pcat_el_12x1_21' WHERE product_category_id='pcat_el_12x2_5' AND product_id IN ('prod_01KNXXEZ4CYQ7M9B1SD50Z0NDX','prod_01KNXXCWC217E0MJC0K51A1ZP3','prod_01KNXXF01RJ6XGECSB3VCFQGWC');
UPDATE product_category_product SET product_category_id='pcat_7cart4' WHERE product_category_id='pcat_el_12x2_22' AND product_id IN ('prod_01KPJV9C0KQY728Y5Q7KGP9E2P','prod_01KP6FC68QZF00RR5FJBYZX8YR','prod_01KPJV9BT49QZ6SB5ME9QC0ZMR','prod_01KPJVCGSBJPWBCYRQ1KYFT9EG','prod_01KP6FDGHS5ZHCTB4MYKRGQNE7','prod_01KPJVCH5RRCYQG5DKK8SQV3E9','prod_01KPJVCGZCY140PVCEWQRV8ZEH');
UPDATE product_category_product SET product_category_id='pcat_12scoot' WHERE product_category_id='pcat_el_12x2_1' AND product_id IN ('prod_01KPJV6RKSXP2ZZAE6TCNH2FRY','prod_01KP6FB5JHCVH2YYYJ80T8C7BV','prod_01KPJV6VHV2768N1220N0Z34CD','prod_01KPJV6V4W8HDS7PHKSS2NHB83','prod_01KPJV6TBCF5200F5KQ9EHH62K','prod_01KPJV6RS5BCK0XAPD6QC6M2K3','prod_01KPJV6VQ4M48F2KV4C2FAD74B','prod_01KPJV6TYCVHQVFDG0XRGY20KA','prod_01KPJV6TRA6RHX9YM9C9Y8PR62','prod_01KPJV6T55NKQYS54YNCXF8Q6C','prod_01KPJV6SYH17WWGPKY00FKCYK1','prod_01KPJV6SRB5VRVH3RWZEJSN3FK','prod_01KPJV6RZK0NC6TQKYRRY3QJ9K','prod_01KPJV6SBEZKAAACNVMN4Y28CP','prod_01KPJV6THW9JM0QCQVNCN1KNDF','prod_01KNXXKFN27113WW7DEFB5QYGT','prod_01KNXXKHEZAFBJQEA5B5WEFX5X','prod_01KNXXMR7YRGQMQ6X032DMNZNJ','prod_01KNXXMR8JAAEGQA61QZDKN78X','prod_01KNXXMS569F1GNN2PRGVWBXMF');
UPDATE product_category_product SET product_category_id='pcat_12swing' WHERE product_category_id='pcat_el_12x2_6' AND product_id IN ('prod_01KNXXADXKH3PBW21BF2SCYEAF','prod_01KNXXAEST0DC6CV9ZET57TC9F','prod_01KNXXADXTA5KBFCBK8PRDWXBF','prod_01KPJVHBX3624JQ40N2FC460GK','prod_01KPJVHC3HD4RD00YRN5RR7KTT','prod_01KPGAVSJFXC4XD6532NH07KF5','prod_01KQA2TY45WDJ04NGWYB3B7M9B','prod_01KQAGJCSJJ26RZJTZ6SBJVHGQ','prod_01KPGAVST25D4QC4JA2VXGXQPF','prod_01KNXXBJVN7MT0Z1Q4P1JX8KJQ','prod_01KNXX9YGGM2K1V26JX8MP4JPE','prod_01KNXXF012NNB4P4XCAWZVZY6F','prod_01KNXXEZ57303SRZAAGS61QTCS','prod_01KP6FFQN3PZC0MAHSB32YVCZW','prod_01KPJXEE26PV0Z927RMF0BA41E','prod_01KPJXEDMRCEHCG20Y56YE4W1R','prod_01KNXXEM3ZXPTFNJSWA2HY1DB6','prod_01KNXXECZZYEDN91HTFED6XFHC','prod_01KNXXEFQ2T3PNHNB5P513674A','prod_01KNXXEDXS5WFJ6BDD49MXFN9P');
UPDATE product_category_product SET product_category_id='pcat_12swing' WHERE product_category_id='pcat_el_12x2_16' AND product_id IN ('prod_01KPJXEGJ88QKG9SG9K6GQYRV1','prod_01KPJXEEPC20B4ENQJ1WSKB5EJ','prod_01KNXXECZQB0BAYYMMRNHKM0N7','prod_01KNXXEZ4ATMAZKRE6SA5YWPDW','prod_01KNXXEY7XNDYW2PM35PZZT4AV');
UPDATE product_category_product SET product_category_id='pcat_12adv' WHERE product_category_id='pcat_el_12x2_16' AND product_id IN ('prod_01KNXXA6PE6DGBDHQS8GBY84GX','prod_01KNXXA5RTKY7XNJ6MFNGFKM91','prod_01KNXXAA9VWZ5JJWWQ37TY644W','prod_01KNXXAHHQKDCXJZCAX2ZBHQYT','prod_01KNXXA7KG0D9K2VFFKM6MPP67','prod_01KNXXCABQVCM5JTRFTG5W35N8','prod_01KNXX9ZC0W3DXCKTZ9SZW5M9S','prod_01KNXX9XJY2SK6C1VJR3ZEGTN6','prod_01KNXX9XKZ856YW3HX4S9Q8V59','prod_01KNXX9XM0WDFVER3VWKRXPXDD','prod_01KNXX9XK4389BWGX1Q51G2VBW');

-- Vahtmatid (pure-B foam) → #12 Fitness gym-põrandaplaadid
UPDATE product_category SET parent_category_id='pcat_12m2', mpath='pcat_v4_l12.'||(SELECT parent_category_id FROM product_category WHERE id='pcat_12m2')||'.'||id, updated_at=NOW() WHERE id='pcat_el_12x2_23';

-- Kustuta tühjaks jäänud #12 "Mänguasjad lastele" L2
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_v4_l12_2';
UPDATE product_category SET deleted_at=NOW(), updated_at=NOW() WHERE id='pcat_v4_l12_2';
COMMIT;

\echo '--- Lastele #24 L2 + tooteid ---'
SELECT l2.name, sum((SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id)) tooteid
FROM product_category l2 JOIN product_category l3 ON l3.parent_category_id=l2.id AND l3.deleted_at IS NULL
WHERE l2.parent_category_id='pcat_v4_l24' GROUP BY l2.name,l2.rank ORDER BY l2.rank;
\echo '--- uued #12 kodud ---'
SELECT name, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE id IN ('pcat_12scoot','pcat_12swing','pcat_12adv');
\echo '--- #12 Mänguasjad lastele L2 kustutatud? + lapsi ---'
SELECT deleted_at IS NOT NULL AS deleted, (SELECT count(*) FROM product_category WHERE parent_category_id='pcat_v4_l12_2' AND deleted_at IS NULL) AS live_lapsi FROM product_category WHERE id='pcat_v4_l12_2';
\echo '--- distinct + L1 ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND parent_category_id IS NULL AND deleted_at IS NULL;
