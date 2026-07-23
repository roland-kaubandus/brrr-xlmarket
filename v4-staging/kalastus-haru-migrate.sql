-- kalastus-haru-migrate.sql — Kalastus L2 laiendus: 2 uut L3 (A-tee, Tarmo 2026-07-22)
-- ⚠️ KÄIVITA ATOMAARSELT KOOS FISHING-TOODETE IMPORDIGA — mitte eraldi.
--    Põhjus: INV-STRUCT-01 loeb tühja L3 (0 toodet) FAIL-iks. Landing-netid + krabipüünised
--    EI OLE veel DB-s (956 uute seas) → L3 tohib luua alles kui tooted saab kohe külge panna.
--
-- TÜÜBI-OTSUS (CLAUDE.md väljund-test): kahv (aktiivne, ostja tõstab kala) ≠ püünis (passiivne, püüab ise)
--    → ERI TÜÜP → 2 L3, mitte üks segaprofiil. Pot Puller (mootoriga vints) = 3. tüüp → jääb Paaditehnikasse.
--
-- Kalastus L2 = pcat_12fish (mpath pcat_v4_l12.pcat_12fish). Olemas 5 L3 (rank 1-5). Uued: rank 6,7.

BEGIN;

INSERT INTO product_category
  (id, name, description, handle, mpath, is_active, is_internal, rank, parent_category_id, created_at, updated_at)
VALUES
  ('pcat_12fish_kahv', 'Kahvad ja saagivõrgud',
   'Kahvad ja saagivõrgud kala veest tõstmiseks: teleskoopvarrega maandusvõrgud (landing net), heitevõrgud (cast net), sadama-/kaikahvad, drop-net. AKTIIVNE püügiabivahend — ostja tõstab konksus oleva kala veest. EI kuulu siia: passiivsed püünised, mis püüavad ise (→ Kalapüünised); mootoriga püügivintsid (→ Paaditehnika).',
   'v4-sport-kalastus-kahvad-ja-saagivorgud',
   'pcat_v4_l12.pcat_12fish.pcat_12fish_kahv', true, false, 6, 'pcat_12fish', now(), now()),
  ('pcat_12fish_pyynis', 'Kalapüünised',
   'Passiivsed kalapüünised, mis püüavad ise: krabipüünised (crab trap/pot), kalamõrrad, vähipüünised, kokkupandavad püügikorvid. Ostja asetab püünise vette, see püüab passiivselt. EI kuulu siia: kahvad/maandusvõrgud, millega ostja aktiivselt kala tõstab (→ Kahvad ja saagivõrgud); mootoriga püügivintsid/pot-pullerid (→ Paaditehnika).',
   'v4-sport-kalastus-kalapuunised',
   'pcat_v4_l12.pcat_12fish.pcat_12fish_pyynis', true, false, 7, 'pcat_12fish', now(), now());

-- TOOTE-PAIGUTUS (lisatakse kui tooted imporditud — placeholder, täidetakse 956-kaardi järgi):
--   Kahvad ja saagivõrgud (pcat_12fish_kahv): 5 landing net / fishing net / drop net
--   Kalapüünised (pcat_12fish_pyynis): 2 crab trap
--   (EI SIIA) 5 uut Beach Fishing Cart → OLEMAS pcat_el_12x6_11 (Kalapüügikärud), VEVOR tüpiseeris valesti "Material Handling"
--   (EI SIIA) Pot Puller → juba DB-s Paaditehnika all (õige, ei liigu)
-- INSERT INTO product_category_product (product_id, product_category_id) VALUES (...);

COMMIT;
