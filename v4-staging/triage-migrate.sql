BEGIN;
-- Kids Piano Keyboard (5) #19 Klahvpillid → #24 Muusikainstrumendid lastele
UPDATE product_category_product SET product_category_id='pcat_el_12x2_15'
WHERE product_category_id='pcat_mu_1_2' AND product_id IN ('prod_01KPJVDMAR1W50VS4Z5PQGRRK6','prod_01KP6FDZA0PTAXZ10WAPBYW18P','prod_01KPJVDM4GAR57RZGWS9J63V0S','prod_01KPJVDMQG8YFG1FGH9A73K60E','prod_01KPJVDMH1EYY933A5N567XH0R');
-- Kids Drum Set Junior (7) #19 Löökpillid → #24 Muusikainstrumendid lastele (NB electric roll-up jääb #19, whitelist)
UPDATE product_category_product SET product_category_id='pcat_el_12x2_15'
WHERE product_category_id='pcat_mu_1_3' AND product_id IN ('prod_01KNXXQQ1X7T4M695FEXJQDC81','prod_01KNXXQQ20A5AZZTPSZSC31MPA','prod_01KNXXQQZAZPNB4AY98BBMZ6KH','prod_01KNXXQP6BGQ3QKTVMX386MNXE','prod_01KNXXQR069B5R50G4F4NQ5ER2','prod_01KNXXQQZDAYPAE77A93RF4CRT','prod_01KNXXQQ303N8J1E6CSMSCYYA3');
-- Ninja "for Kids" (5) #12 Seiklusrajad → #24 Ronimismänguasjad
UPDATE product_category_product SET product_category_id='pcat_el_12x2_5'
WHERE product_category_id='pcat_12adv' AND product_id IN ('prod_01KNXX9ZC0W3DXCKTZ9SZW5M9S','prod_01KNXX9XJY2SK6C1VJR3ZEGTN6','prod_01KNXX9XKZ856YW3HX4S9Q8V59','prod_01KNXX9XM0WDFVER3VWKRXPXDD','prod_01KNXX9XK4389BWGX1Q51G2VBW');
-- Balance Beam "for Kids" (6) #12 Võimlemispoomid → #24 Tasakaalu-ja-liikumismänguasjad (adult barre'd jäävad #12)
UPDATE product_category_product SET product_category_id='pcat_el_12x2_16'
WHERE product_category_id='pcat_el_12x3_10' AND product_id IN ('prod_01KNXXSWRXGP37NDC2T7J0CXFD','prod_01KNXXSXPB8EXDPS3G0E1ZFYV8','prod_01KNXXS8VG8A021N887A1RANR3','prod_01KNXXS8VFG2QNPC6R99A5HVVH','prod_01KNXXSBGYBHVJ4VG9X7PBWGJ8','prod_01KNXXSBGX8TPH6G5XPV73XDK8');
-- Kids metal detector (1) #12 → #24 Õppemänguasjad
UPDATE product_category_product SET product_category_id='pcat_el_12x2_24'
WHERE product_category_id='pcat_el_12x1_2' AND product_id='prod_01KNXX8FA0RMMPNWN1DR2DF069';
COMMIT;
\echo '--- tulem ---'
SELECT c.name, (SELECT count(*) FROM product_category_product WHERE product_category_id=c.id) n FROM product_category c WHERE c.id IN ('pcat_el_12x2_15','pcat_el_12x2_5','pcat_el_12x2_16','pcat_el_12x2_24','pcat_mu_1_2','pcat_mu_1_3','pcat_12adv','pcat_el_12x3_10','pcat_el_12x1_2') ORDER BY c.name;
\echo '--- distinct(17425) L1(24) L3 ---'
SELECT count(DISTINCT product_id) FROM product_category_product;
SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;
