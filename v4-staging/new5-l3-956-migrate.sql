-- new5-l3-956-migrate.sql — 5 uut L3 956-backlogi impordile (A-etapp, Tarmo 2026-07-22)
-- ⚠️ KÄIVITA ATOMAARSELT: import (--defer-categories) → SEE migratsioon → apply-956 → inv-check.
--    INV-STRUCT-01 loeb tühja L3 (0 toodet) FAIL-iks. L3-d luuakse tühjalt, apply-956 täidab kohe.
--    inv jookseb ALLES apply järel → INV-STRUCT-01 pass.
-- SUPERSEDES: kalastus-haru-migrate.sql (2 kalastuse L3 on siin kaasas — ära käivita mõlemat).
--
-- TÜÜBI-PROFIIL = SSoT (CLAUDE.md feed-reegel): description = "mis TÜÜP siia kuulub" (otstarve+tunnus),
--   mille vastu feed-toode mapib — mitte nime järgi. Nimed Eesti etaloni järgi (NIME-REEGEL, sünnihetkel õige).

BEGIN;

INSERT INTO product_category
  (id, name, description, handle, mpath, is_active, is_internal, rank, parent_category_id, created_at, updated_at)
VALUES
  -- 1. Kalastus L2 (pcat_12fish) — kahv (aktiivne, ostja tõstab kala)
  ('pcat_12fish_kahv', 'Kahvad ja saagivõrgud',
   'Kahvad ja saagivõrgud kala veest tõstmiseks: teleskoopvarrega maandusvõrgud (landing net), heitevõrgud (cast net), sadama-/kaikahvad, drop-net. AKTIIVNE püügiabivahend — ostja tõstab konksus oleva kala veest. EI kuulu siia: passiivsed püünised, mis püüavad ise (→ Kalapüünised); mootoriga püügivintsid (→ Paadivintsid ja püügiabivahendid).',
   'v4-sport-kalastus-kahvad-ja-saagivorgud',
   'pcat_v4_l12.pcat_12fish.pcat_12fish_kahv', true, false, 6, 'pcat_12fish', now(), now()),

  -- 2. Kalastus L2 (pcat_12fish) — püünis (passiivne, püüab ise)
  ('pcat_12fish_pyynis', 'Kalapüünised',
   'Passiivsed kalapüünised, mis püüavad ise: krabipüünised (crab trap/pot), kalamõrrad, vähipüünised, kokkupandavad püügikorvid. Ostja asetab püünise vette, see püüab passiivselt. EI kuulu siia: kahvad/maandusvõrgud, millega ostja aktiivselt kala tõstab (→ Kahvad ja saagivõrgud); mootoriga püügivintsid/pot-pullerid (→ Paadivintsid ja püügiabivahendid).',
   'v4-sport-kalastus-kalapuunised',
   'pcat_v4_l12.pcat_12fish.pcat_12fish_pyynis', true, false, 7, 'pcat_12fish', now(), now()),

  -- 3. Ladu > Riiulid ja restid (pcat_22shelf) — kaubaalused (pallets)
  ('pcat_22shelf_alus', 'Kaubaalused',
   'Kaubaalused (pallets) kaupade ladustamiseks ja transpordiks: plastik-kaubaalused, Euro-alused, virnastatavad ja ratastega alused. Ladu-infrastruktuur — ostja virnastab/teisaldab kaupa alusel. EI kuulu siia: alusrestid/riiulid ladustamiseks (→ Riiulid ja restid); lekketõkkealused kemikaalide/vaatide alla (→ Lekketõkkealused ja lekkevannid).',
   'v4-ladu-riiulid-kaubaalused',
   'pcat_v4_l22.pcat_22shelf.pcat_22shelf_alus', true, false, 7, 'pcat_22shelf', now(), now()),

  -- 4. Ladu > Hoiukapid ja -sahtlid (pcat_22cab) — lekketõkkealused (spill containment)
  ('pcat_22cab_leke', 'Lekketõkkealused ja lekkevannid',
   'Lekketõkkealused ja lekkevannid (spill containment) ohtlike vedelike ja vaatide alla: 1–4 vaadi tünnialused, madala profiiliga kogumisalused, lekkevannid. Keskkonna- ja tööohutuse-varustus — püüab lekke enne põranda/pinnase saastumist. EI kuulu siia: tavalised kaubaalused kaupade ladustamiseks (→ Kaubaalused); tuleohtlike ainete hoiukapid (→ Tuleohtlike ainete hoiukapid).',
   'v4-ladu-hoiukapid-lekketokkealused',
   'pcat_v4_l22.pcat_22cab.pcat_22cab_leke', true, false, 6, 'pcat_22cab', now(), now()),

  -- 5. Käsitööriistad > Tööriistade tarvikud ja kulumaterjalid (pcat_t3l2_9) — SDS meislid
  ('pcat_t3l2_9_sds', 'SDS meislid ja purustusterad',
   'SDS-Plus ja SDS-Max meislid, purustus- ja lammutusterad puurvasaratele: lamemeislid, teravikmeislid (bull point), skaleerimismeislid, põrandakaabitsad, meislikomplektid. SDS-kinnitusega kulumaterjal. EI kuulu siia: puuriotsikute ja kruvikeerajaotsikute komplektid (→ Puuri- ja kruvikeerajaotsikute komplektid); pneumaatilised meislid suruõhutööriistadele (→ Pneumaatilised meislid).',
   'v4-tooriistad-tarvikud-sds-meislid',
   'pcat_v4_l1.pcat_t3l2_9.pcat_t3l2_9_sds', true, false, 24, 'pcat_t3l2_9', now(), now());

COMMIT;

-- TOOTE-PAIGUTUS: teeb apply-956.mjs (product_category_product INSERT) — mitte siin.
--   Kahvad (pcat_12fish_kahv): 5 landing/fishing net
--   Kalapüünised (pcat_12fish_pyynis): 2 crab trap
--   Kaubaalused (pcat_22shelf_alus): 4 plastic pallet
--   Lekketõkkealused (pcat_22cab_leke): 3 spill containment pallet
--   SDS meislid (pcat_t3l2_9_sds): 6 SDS chisel/scraper
