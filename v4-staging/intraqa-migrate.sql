BEGIN;
-- ===== SAMM 1: 19 KINDLAT =====
-- 2 RC-building (STEM Building 461/554 = puldiga Car/Robot/Tank) Konstruktorid → Kaugjuhitavad
UPDATE product_category_product SET product_category_id='pcat_el_12x2_3'
WHERE product_category_id='pcat_el_12x2_14' AND product_id IN ('prod_01KNXXGP54XVK4R7WVZG5R1F0R','prod_01KNXXGP4W70YCH93DPYFF968G');
-- 5 busy-board + 4 marble-run tegevuslauad → Õppemänguasjad
UPDATE product_category_product SET product_category_id='pcat_el_12x2_24'
WHERE product_category_id='pcat_el_12x2_13' AND product_id IN ('prod_01KNXXNP4QYJRRZAPS16TKQ88K','prod_01KNXXNP4KVTFY91N0W7YYWG5Y','prod_01KNXXNQ16002TYPKWN0ZQ4F1C','prod_01KNXXNRSQ29SKR9Q13XDPNAKY','prod_01KNXXNQ1WEG7ZDWCSNPC89BVM','prod_01KNXXJN9A3TGQDQ68FKTESRGJ','prod_01KNXXJP4SG73BGWMNFFT345W6','prod_01KNXXKJCM5KG5Z5YATEVR5FYK','prod_01KNXXKJBX50HZVYX8J61E2SC0');
-- 3 baby musical activity table (1×_15 + 2×_24) → tegevuslauad
UPDATE product_category_product SET product_category_id='pcat_el_12x2_13'
WHERE product_category_id IN ('pcat_el_12x2_15','pcat_el_12x2_24') AND product_id IN ('prod_01KPJVDNBPZVBS12M0N62A02NT','prod_01KPJVDN5E3M4VDFYSJKEX034K','prod_01KP6FDZJQ4YT807889ZZMGQV9');
-- 3 ride-on-luggage tõukerattad → reisikohvrid
UPDATE product_category_product SET product_category_id='pcat_el_12x2_22'
WHERE product_category_id='pcat_el_12x2_1' AND product_id IN ('prod_01KNXXPW0PQ4YWSPXKQ5KBQSY6','prod_01KNXXPS9Z7VG6KBQPVECNNPF7','prod_01KNXXPS9ZHK4J7CGT2CHE5B7F');
-- 2 jungle-gym Mänguväljakud → Ronimismänguasjad
UPDATE product_category_product SET product_category_id='pcat_el_12x2_5'
WHERE product_category_id='pcat_el_12x2_17' AND product_id IN ('prod_01KNXXT3SZTYTCBCSJJZ2H8A5A','prod_01KNXXHA6PX3S481WJ9YJF2MQ4');

-- ===== SAMM 2: PIIRIPEALSED (Tarmo otsus) =====
-- 4 motorcycle engine mechanic set Mänguautod → Õppemänguasjad (STEM-õpe)
UPDATE product_category_product SET product_category_id='pcat_el_12x2_24'
WHERE product_category_id='pcat_el_12x2_4' AND product_id IN ('prod_01KPJV62YHV6PPK6JHPJCATP76','prod_01KP6FAXMYWPJHAFSFJPD9H19A','prod_01KPJV62HPXJJ5YY7CRSF1YMNF','prod_01KPJV62R8MQJJVPHWY9QH61WZ');
-- 2 drift ride-on tõukerattad → Laste sõidukid
UPDATE product_category_product SET product_category_id='pcat_el_12x2_2'
WHERE product_category_id='pcat_el_12x2_1' AND product_id IN ('prod_01KNXXJ9N4SHT22M1QJ3EHC29M','prod_01KNXXJCB10XERZ031M6J57YZQ');
-- 1 bike-trailer Laste sõidukid → #12 Jalgrattad haagised (main-tasandi)
UPDATE product_category_product SET product_category_id='pcat_el_12x1_29'
WHERE product_category_id='pcat_el_12x2_2' AND product_id='prod_01KNXXC8HY509VMV4A917P4STX';
-- (3 train-table JÄÄB pcat_el_12x2_4 — Tarmo otsus, hübriid)
COMMIT;

\echo '--- tulem: mõjutatud L3-de arvud ---'
SELECT c.name, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n
FROM product_category c WHERE c.id IN ('pcat_el_12x2_14','pcat_el_12x2_3','pcat_el_12x2_13','pcat_el_12x2_24','pcat_el_12x2_1','pcat_el_12x2_22','pcat_el_12x2_5','pcat_el_12x2_17','pcat_el_12x2_4','pcat_el_12x2_2','pcat_el_12x2_15','pcat_el_12x1_29') ORDER BY c.name;
\echo '--- Konstruktorid puhas (20)? RC eemaldatud? ---'
SELECT count(*) konstruktorid FROM product_category_product WHERE product_category_id='pcat_el_12x2_14';
\echo '--- distinct (17425) + L1 (24) ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND parent_category_id IS NULL AND deleted_at IS NULL;
