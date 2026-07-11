BEGIN;
-- ============ SAMM 2: #25 Hobi ja käsitöö + 6 L2 + 3 uut L3 ============
INSERT INTO product_category (id,name,description,handle,is_active,is_internal,parent_category_id,mpath,rank,created_at,updated_at) VALUES
 ('pcat_v4_l25','Hobi ja käsitöö','','v4-hobi-ja-kasitoo',true,false,NULL,'pcat_v4_l25',25,now(),now()),
 ('pcat_25ker','Keraamika ja pottsepatöö','','v4-hobi-keraamika-ja-pottsepatoo',true,false,'pcat_v4_l25','pcat_v4_l25.pcat_25ker',1,now(),now()),
 ('pcat_25tool','Käsitöö-tööriistad ja -seadmed','','v4-hobi-kasitoo-tooriistad-ja-seadmed',true,false,'pcat_v4_l25','pcat_v4_l25.pcat_25tool',2,now(),now()),
 ('pcat_25art','Kunst ja maalimine','','v4-hobi-kunst-ja-maalimine',true,false,'pcat_v4_l25','pcat_v4_l25.pcat_25art',3,now(),now()),
 ('pcat_25tekst','Õmblus ja tekstiil','','v4-hobi-omblus-ja-tekstiil',true,false,'pcat_v4_l25','pcat_v4_l25.pcat_25tekst',4,now(),now()),
 ('pcat_25pusle','Pusled ja mudelitööd','','v4-hobi-pusled-ja-mudelitood',true,false,'pcat_v4_l25','pcat_v4_l25.pcat_25pusle',5,now(),now()),
 ('pcat_25ehte','Ehtekunst','','v4-hobi-ehtekunst',true,false,'pcat_v4_l25','pcat_v4_l25.pcat_25ehte',6,now(),now()),
 ('pcat_25nahk','Nahatöö-tööriistad','','v4-hobi-tooriistad-nahatoo',true,false,'pcat_25tool','pcat_v4_l25.pcat_25tool.pcat_25nahk',1,now(),now()),
 ('pcat_25kynal','Küünla- ja seebivalmistus','','v4-hobi-tooriistad-kuunla-ja-seebivalmistus',true,false,'pcat_25tool','pcat_v4_l25.pcat_25tool.pcat_25kynal',2,now(),now()),
 ('pcat_25pyro','Puidupõletusseadmed (pürograafia)','','v4-hobi-tooriistad-puidupoletusseadmed',true,false,'pcat_25tool','pcat_v4_l25.pcat_25tool.pcat_25pyro',3,now(),now());
INSERT INTO taxonomy_node_meta (node_id,level,status,source,show_in_mega_menu,product_count_cached,created_at,updated_at) VALUES
 ('pcat_v4_l25',1,'active','manual',true,99,now(),now()),
 ('pcat_25ker',2,'active','manual',true,0,now(),now()),('pcat_25tool',2,'active','manual',true,0,now(),now()),
 ('pcat_25art',2,'active','manual',true,0,now(),now()),('pcat_25tekst',2,'active','manual',true,0,now(),now()),
 ('pcat_25pusle',2,'active','manual',true,0,now(),now()),('pcat_25ehte',2,'active','manual',true,0,now(),now()),
 ('pcat_25nahk',3,'active','manual',true,5,now(),now()),('pcat_25kynal',3,'active','manual',true,5,now(),now()),
 ('pcat_25pyro',3,'active','manual',true,3,now(),now());

-- ============ SAMM 2: 6 OLEMASOLEVAT L3 REPARENT (parent+mpath+handle+rename) ============
UPDATE product_category SET parent_category_id='pcat_25ker', mpath='pcat_v4_l25.pcat_25ker.pcat_12cer1', name='Pottsepakettad ja keraamikarattad', handle='v4-hobi-keraamika-pottsepakettad-ja-keraamikarattad', rank=1, updated_at=now() WHERE id='pcat_12cer1';
UPDATE product_category SET parent_category_id='pcat_25pusle', mpath='pcat_v4_l25.pcat_25pusle.pcat_el_12x1_32', handle='v4-hobi-pusled-puslelauad-ja-alused', rank=1, updated_at=now() WHERE id='pcat_el_12x1_32';
UPDATE product_category SET parent_category_id='pcat_25art', mpath='pcat_v4_l25.pcat_25art.pcat_f4_13xtex_11', name='Maalimistarvikud ja molbertid', handle='v4-hobi-kunst-maalimistarvikud-ja-molbertid', rank=1, updated_at=now() WHERE id='pcat_f4_13xtex_11';
UPDATE product_category SET parent_category_id='pcat_25tekst', mpath='pcat_v4_l25.pcat_25tekst.pcat_f4_13xtex_9', handle='v4-hobi-tekstiil-omblusmasinad', rank=1, updated_at=now() WHERE id='pcat_f4_13xtex_9';
UPDATE product_category SET parent_category_id='pcat_25ehte', mpath='pcat_v4_l25.pcat_25ehte.pcat_13roll', handle='v4-hobi-ehtekunst-ehte-rullpressid', rank=1, updated_at=now() WHERE id='pcat_13roll';
UPDATE product_category SET parent_category_id='pcat_25ehte', mpath='pcat_v4_l25.pcat_25ehte.pcat_f4_13x1_17', handle='v4-hobi-ehtekunst-juveelimikroskoobid', rank=2, updated_at=now() WHERE id='pcat_f4_13x1_17';

-- ============ SAMM 3: käsitöö-seadmed SPLIT → 3 uut L3 ============
UPDATE product_category_product SET product_category_id='pcat_25nahk' WHERE product_id IN ('prod_01KNXXP104AJAWJKZG3WRZBM9Y','prod_01KNXXP102HDBE12VWSA5B195A','prod_01KNXXP1054ZTRS8TNEJPES04B','prod_01KNXXP0429AWRVDQCV2MXBR4J','prod_01KNXXP03NJAVRHRDWSWZA3MR6');
UPDATE product_category_product SET product_category_id='pcat_25kynal' WHERE product_id IN ('prod_01KNXX9D7V7M7195B5TRJ3D58W','prod_01KPJXA1W3P3ZGB7YVDHMMRX09','prod_01KNXX9D7XJSRNNDQ2W4YR4962','prod_01KNXX97Q2P7H2JJA0Y6J07WBV','prod_01KNXXCVEYA6AYQJ5Z50955TE7');
UPDATE product_category_product SET product_category_id='pcat_25pyro' WHERE product_id IN ('prod_01KNXX91BVRPJPJ8EBERZ0M6WV','prod_01KNXX91BV1Z6YQ7F3MFT9Q6T2','prod_01KNXX927KTWAMZY27VEVPCT8E');

-- ============ SAMM 4: ERANDID (dup-värav) ============
UPDATE product_category_product SET product_category_id='pcat_t3f_2_2' WHERE product_id='prod_01KNXX78HJEREK4D2WMQGARWV8';   -- foam cutter → #1 Vahtplasti lõikurid
UPDATE product_category_product SET product_category_id='pcat_22bin' WHERE product_id='prod_01KNXXMECAPHWYMJNP9M0E8RBR';   -- scrapbook hoiukarp → #22 Ladu

-- ============ Tühjenenud Käsitöö- & hobiseadmed → kustuta ============
DELETE FROM taxonomy_node_meta WHERE node_id='pcat_13craft';
UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id='pcat_13craft';

-- ============ 301 REDIRECTID (6 reparent + 1 kustutatud) ============
INSERT INTO slug_redirect (from_slug,to_slug,reason,created_at) VALUES
 ('v4-sport-pottsepakettad-keraamikarattad','v4-hobi-keraamika-pottsepakettad-ja-keraamikarattad','merge',now()),
 ('v4-sport-ja-vaba-aeg-ouesport-ja-valimangud-puslelauad-ja-hoiususteemid','v4-hobi-pusled-puslelauad-ja-alused','merge',now()),
 ('v4-reklaami-truki-ja-graveerimisseadmed-tekstiili-ja-roivatrukk-maalimistarvikud-ja-molbertid','v4-hobi-kunst-maalimistarvikud-ja-molbertid','merge',now()),
 ('v4-reklaami-truki-ja-graveerimisseadmed-tekstiili-ja-roivatrukk-omblusmasinad','v4-hobi-tekstiil-omblusmasinad','merge',now()),
 ('v4-reklaam-ehte-rullpressid','v4-hobi-ehtekunst-ehte-rullpressid','merge',now()),
 ('v4-reklaami-truki-ja-graveerimisseadmed-laser-graveerimine-ja-cnc-juveelimikroskoobid','v4-hobi-ehtekunst-juveelimikroskoobid','merge',now()),
 ('v4-sport-kasitoo-hobiseadmed','v4-hobi-kasitoo-tooriistad-ja-seadmed','merge',now());
COMMIT;
\echo '--- #25 struktuur ---'
SELECT l2.name l2, l3.name l3, (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n
FROM product_category l2 JOIN product_category l3 ON l3.parent_category_id=l2.id
WHERE l2.parent_category_id='pcat_v4_l25' AND l3.deleted_at IS NULL ORDER BY l2.rank, l3.rank;
\echo '--- käsitöö-seadmed tühi(0)+kustutatud? · distinct(17425) · L1(25) ---'
SELECT (SELECT count(*) FROM product_category_product WHERE product_category_id='pcat_13craft') craft_n, (SELECT deleted_at IS NOT NULL FROM product_category WHERE id='pcat_13craft') craft_del,
 (SELECT count(DISTINCT product_id) FROM product_category_product) distinct_tooteid,
 (SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND char_length(mpath)-char_length(replace(mpath,'.',''))=0) l1;
