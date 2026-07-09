BEGIN;
INSERT INTO product_category (id,name,handle,parent_category_id,mpath,rank,is_active,is_internal,description,created_at,updated_at) VALUES
('pcat_24tahvel','Tegevustahvlid','v4-lastekaubad-tegevustahvlid','pcat_24oppe','pcat_v4_l24.pcat_24oppe.pcat_24tahvel',0,true,false,'',NOW(),NOW()),
('pcat_24kuul','Kuulirajad','v4-lastekaubad-kuulirajad','pcat_24oppe','pcat_v4_l24.pcat_24oppe.pcat_24kuul',0,true,false,'',NOW(),NOW()),
('pcat_24mootor','Mootori- ja mehaanika-mänguasjad','v4-lastekaubad-mootori-ja-mehaanika-manguasjad','pcat_24roll','pcat_v4_l24.pcat_24roll.pcat_24mootor',0,true,false,'',NOW(),NOW()),
('pcat_24tants','Tantsumatid','v4-lastekaubad-tantsumatid','pcat_24oppe','pcat_v4_l24.pcat_24oppe.pcat_24tants',0,true,false,'',NOW(),NOW()),
('pcat_24vibu','Mänguvibud ja -nooled','v4-lastekaubad-manguvibud-ja-nooled','pcat_24roll','pcat_v4_l24.pcat_24roll.pcat_24vibu',0,true,false,'',NOW(),NOW()),
('pcat_24vesi','Veelauad','v4-lastekaubad-veelauad','pcat_24oue','pcat_v4_l24.pcat_24oue.pcat_24vesi',0,true,false,'',NOW(),NOW()),
('pcat_24hobu','Kiikhobud','v4-lastekaubad-kiikhobud','pcat_24oue','pcat_v4_l24.pcat_24oue.pcat_24hobu',0,true,false,'',NOW(),NOW()),
('pcat_24seesaw','Kiikautud','v4-lastekaubad-kiikautud','pcat_24oue','pcat_v4_l24.pcat_24oue.pcat_24seesaw',0,true,false,'',NOW(),NOW());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
('pcat_24tahvel',3,'active','manual',true,5,NOW(),NOW()),('pcat_24kuul',3,'active','manual',true,4,NOW(),NOW()),
('pcat_24mootor',3,'active','manual',true,8,NOW(),NOW()),('pcat_24tants',3,'active','manual',true,3,NOW(),NOW()),
('pcat_24vibu',3,'active','manual',true,3,NOW(),NOW()),('pcat_24vesi',3,'active','manual',true,3,NOW(),NOW()),
('pcat_24hobu',3,'active','manual',true,5,NOW(),NOW()),('pcat_24seesaw',3,'active','manual',true,6,NOW(),NOW());
-- RENAMES
UPDATE product_category SET name='Valgusmõõgad', updated_at=NOW() WHERE id='pcat_el_12x2_21';
UPDATE product_category SET name='Laste tööpingid', updated_at=NOW() WHERE id='pcat_el_12x2_19';
UPDATE product_category SET name='Libamäed', updated_at=NOW() WHERE id='pcat_el_12x2_17';
UPDATE product_category SET name='Liivakastid', updated_at=NOW() WHERE id='pcat_el_12x2_12';
UPDATE product_category SET name='Kiiged', updated_at=NOW() WHERE id='pcat_el_12x2_6';
-- SPLIT liigutused
UPDATE product_category_product SET product_category_id='pcat_24tahvel' WHERE product_id IN ('prod_01KNXXNP4QYJRRZAPS16TKQ88K','prod_01KNXXNP4KVTFY91N0W7YYWG5Y','prod_01KNXXNQ16002TYPKWN0ZQ4F1C','prod_01KNXXNRSQ29SKR9Q13XDPNAKY','prod_01KNXXNQ1WEG7ZDWCSNPC89BVM') AND product_category_id='pcat_el_12x2_24';
UPDATE product_category_product SET product_category_id='pcat_24kuul' WHERE product_id IN ('prod_01KNXXJN9A3TGQDQ68FKTESRGJ','prod_01KNXXJP4SG73BGWMNFFT345W6','prod_01KNXXKJCM5KG5Z5YATEVR5FYK','prod_01KNXXKJBX50HZVYX8J61E2SC0') AND product_category_id='pcat_el_12x2_24';
UPDATE product_category_product SET product_category_id='pcat_24mootor' WHERE product_id IN ('prod_01KPJV62YHV6PPK6JHPJCATP76','prod_01KP6FAXMYWPJHAFSFJPD9H19A','prod_01KPJV62HPXJJ5YY7CRSF1YMNF','prod_01KPJV62R8MQJJVPHWY9QH61WZ') AND product_category_id='pcat_el_12x2_24';
UPDATE product_category_product SET product_category_id='pcat_24mootor' WHERE product_id IN ('prod_01KNXXP03H6B9A7S0HHJEQH24W','prod_01KNXXP046CPXS70AMQF4Y2A7E','prod_01KNXXP03Q20Z3G8X99S4GNY9J','prod_01KNXXP03N8B7B1W21Y8JJXB7Q') AND product_category_id='pcat_el_12x2_19';
UPDATE product_category_product SET product_category_id='pcat_24tants' WHERE product_id IN ('prod_01KNXXH7GHV1ZC22J88FRWHBA1','prod_01KNXXGT1X11HXRRNJNDNZABMY','prod_01KNXXGT1K63VZXS2FRWKNFP0B') AND product_category_id='pcat_el_12x2_15';
UPDATE product_category_product SET product_category_id='pcat_24vibu' WHERE product_id IN ('prod_01KNXXDWVB41E8MYPS4V3JY2DN','prod_01KNXXDWTE4KTRVMR8K9DCSHZJ','prod_01KNXXDWVBP1J3P67PS1H24XWZ') AND product_category_id='pcat_el_12x2_21';
UPDATE product_category_product SET product_category_id='pcat_24vesi' WHERE product_id IN ('prod_01KNXXPYPQAVQDT0Q4AEQM128M','prod_01KNXXQ1CHVAPYHBBP6WM771CS','prod_01KNXXPYP1C7C6NM1A037DB31X') AND product_category_id='pcat_el_12x2_12';
UPDATE product_category_product SET product_category_id='pcat_24hobu' WHERE product_id IN ('prod_01KNXXDEDVP6242YM3RTTBEMA5','prod_01KNXXDEDQBQW7D0WPFEWAYNAY','prod_01KNXXDT4DWFVMC44VR62SYFEA','prod_01KNXXDT4EH9FNW5DC0AXZAWDE','prod_01KNXXDEDSQ4T7CB35R2XH3VDV') AND product_category_id='pcat_el_12x2_6';
UPDATE product_category_product SET product_category_id='pcat_24seesaw' WHERE product_id IN ('prod_01KNXXQQ1VE5ZPJP7SFNQY1HF2','prod_01KNXXQ5X97DSY47RAEHRRAM5F','prod_01KNXXPWVM8XPFB6HEPA7M58ZD','prod_01KNXXPT8CKYN72T51BTF629CD','prod_01KNXXPW0282T1YX3HC5W8731P','prod_01KNXXQMAMHQDH3TGCMP4KJX2J') AND product_category_id='pcat_el_12x2_6';
-- MOVE olemasolevatesse (dup-värav)
UPDATE product_category_product SET product_category_id='pcat_el_12x2_5' WHERE product_id IN ('prod_01KNXXG2T401C53CZ3V3ABS7M8','prod_01KNXXG2T0CDN1V4RY91KPF8W4') AND product_category_id='pcat_el_12x2_17';
UPDATE product_category_product SET product_category_id='pcat_el_12x2_13' WHERE product_id IN ('prod_01KNXXPZKNF5RN9KFRDD6WG430','prod_01KNXXPYP2BC0FCXH97KXVAXZB','prod_01KNXXQ0FZ7H7RDTQBC6D7SJHK') AND product_category_id='pcat_el_12x2_4';
COMMIT;
\echo '--- tulem ---'
SELECT c.name,(SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_el_12x2_24','pcat_24tahvel','pcat_24kuul','pcat_24mootor','pcat_el_12x2_19','pcat_el_12x2_21','pcat_24vibu','pcat_el_12x2_6','pcat_24hobu','pcat_24seesaw','pcat_el_12x2_15','pcat_24tants','pcat_el_12x2_12','pcat_24vesi','pcat_el_12x2_17','pcat_el_12x2_4') ORDER BY c.name;
SELECT 'distinct',count(DISTINCT product_id) FROM product_category_product;
SELECT 'L3',count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
