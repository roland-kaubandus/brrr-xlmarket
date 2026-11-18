-- A1 PERE-SCATTER — UNDO (2026-11-18). Taastab struktuuri: lingid, parent/mpath/handle, nimed, 301 eemaldus.
-- NB: kategooriate KIRJELDUSED (description + PIIRIREEGEL) taastuvad TÄIELIKUST tabeli-backupist
--     (reports/backups/a1-pre-<ts>.sql → product_category), mitte siit — see undo keskendub struktuurile.

\set ON_ERROR_STOP on
BEGIN;

-- ── taasta 5 merge-allikat: un-soft-delete + lingid tagasi, eemalda sihist ────
-- #1 kanister  pcat_2kanist ← pcat_ag2_3x4_1
UPDATE product_category SET deleted_at=NULL, is_active=true, updated_at=NOW() WHERE id='pcat_2kanist';
INSERT INTO product_category_product (product_id, product_category_id) VALUES
  ('prod_01KP6FBHJR42YV6NM4994P7VT6','pcat_2kanist'),('prod_01KP6FBJ4D14VDYH0FMSKCFQ4K','pcat_2kanist'),
  ('prod_01KPJV7SK9MPAM0FHNCQNFQXKB','pcat_2kanist'),('prod_01KPJV7T1CV4DPXZGN05GGRD3M','pcat_2kanist'),
  ('prod_01KPJV7T7PD6N43771C7BDWR8V','pcat_2kanist') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_ag2_3x4_1' AND product_id IN
  ('prod_01KP6FBHJR42YV6NM4994P7VT6','prod_01KP6FBJ4D14VDYH0FMSKCFQ4K','prod_01KPJV7SK9MPAM0FHNCQNFQXKB',
   'prod_01KPJV7T1CV4DPXZGN05GGRD3M','prod_01KPJV7T7PD6N43771C7BDWR8V');
-- #2 lamp  pcat_t3a_8_11 ← pcat_11grow
UPDATE product_category SET deleted_at=NULL, is_active=true, updated_at=NOW() WHERE id='pcat_t3a_8_11';
INSERT INTO product_category_product (product_id, product_category_id) VALUES
  ('prod_01KNXX7W7H55JD63PY0X34FQ82','pcat_t3a_8_11'),('prod_01KNXX7W7PQNF1AQ0TJ48PYYG6','pcat_t3a_8_11'),
  ('prod_01M3TFQAYVGA899JMPTVYRD1XF','pcat_t3a_8_11') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_11grow' AND product_id IN
  ('prod_01KNXX7W7H55JD63PY0X34FQ82','prod_01KNXX7W7PQNF1AQ0TJ48PYYG6','prod_01M3TFQAYVGA899JMPTVYRD1XF');
-- #3 värav  pcat_9karivar ← pcat_9turvv
UPDATE product_category SET deleted_at=NULL, is_active=true, updated_at=NOW() WHERE id='pcat_9karivar';
INSERT INTO product_category_product (product_id, product_category_id) VALUES
  ('prod_01KNXXA7KJP1Y8EDHE3GYZGNCK','pcat_9karivar'),('prod_01KNXXR2Z56KSVJ635DKX168R2','pcat_9karivar'),
  ('prod_01KNXXR2Z89YV51EW13F4PQ0Q4','pcat_9karivar') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_9turvv' AND product_id IN
  ('prod_01KNXXA7KJP1Y8EDHE3GYZGNCK','prod_01KNXXR2Z56KSVJ635DKX168R2','prod_01KNXXR2Z89YV51EW13F4PQ0Q4');
-- #10 telk  pcat_12t2 ← pcat_8dome
UPDATE product_category SET deleted_at=NULL, is_active=true, updated_at=NOW() WHERE id='pcat_12t2';
INSERT INTO product_category_product (product_id, product_category_id) VALUES
  ('prod_01KNXXFWKK49FHFJTYBMP6MBH8','pcat_12t2'),('prod_01KNXXFXF3AB32YEAB4CWQ188D','pcat_12t2'),
  ('prod_01KNXXFYBFDFE8D3GTD496P3K5','pcat_12t2'),('prod_01KNXXFYC7FNYAPQN866GDGTKK','pcat_12t2'),
  ('prod_01KNXXRQPC5EEGQ4QWTPDQ5QY6','pcat_12t2'),('prod_01KNXXSKMK6BF0CCXE10F2APKP','pcat_12t2'),
  ('prod_01KNXXSKMKW15AN9NBY9MZDK0H','pcat_12t2'),('prod_01KNXXSNBP07MKX9BDBG336Y87','pcat_12t2'),
  ('prod_01KPJV9AAQD8MEEJMTWG32QG2C','pcat_12t2') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_8dome' AND product_id IN
  ('prod_01KNXXFWKK49FHFJTYBMP6MBH8','prod_01KNXXFXF3AB32YEAB4CWQ188D','prod_01KNXXFYBFDFE8D3GTD496P3K5',
   'prod_01KNXXFYC7FNYAPQN866GDGTKK','prod_01KNXXRQPC5EEGQ4QWTPDQ5QY6','prod_01KNXXSKMK6BF0CCXE10F2APKP',
   'prod_01KNXXSKMKW15AN9NBY9MZDK0H','prod_01KNXXSNBP07MKX9BDBG336Y87','prod_01KPJV9AAQD8MEEJMTWG32QG2C');
-- #11 vedru  pcat_es_9x3_6 ← pcat_ag2_2_uks
UPDATE product_category SET deleted_at=NULL, is_active=true, updated_at=NOW() WHERE id='pcat_es_9x3_6';
INSERT INTO product_category_product (product_id, product_category_id) VALUES
  ('prod_01KNXX9Q8GC5NV6J9RRZF53914','pcat_es_9x3_6'),('prod_01KNXX9Q8HVNVQ3812R32J7708','pcat_es_9x3_6'),
  ('prod_01KNXX9R466MTZFZEDHGYPG1C0','pcat_es_9x3_6'),('prod_01KNXX9R475H9NNSC7S3HW1475','pcat_es_9x3_6'),
  ('prod_01KNXXJN950KJAP1FKZ0D79S03','pcat_es_9x3_6'),('prod_01KNXXJQYFFK2FP3D89W8XP7BG','pcat_es_9x3_6'),
  ('prod_01KNXXJVPBZ6Z0XM077RTN120X','pcat_es_9x3_6'),('prod_01KNXXJXGDV2C96PN2KHYP786B','pcat_es_9x3_6'),
  ('prod_01KNXXK2XM7G88CMDAXBDX9MZN','pcat_es_9x3_6'),('prod_01KNXXK3SVDYJT39DJ84XGAW7X','pcat_es_9x3_6'),
  ('prod_01KNXXK4PKW6CDH42YW4ASEG9T','pcat_es_9x3_6'),('prod_01KNXXK5JPQ72N31GP3SV6CYWN','pcat_es_9x3_6')
  ON CONFLICT DO NOTHING;
DELETE FROM product_category_product WHERE product_category_id='pcat_ag2_2_uks' AND product_id IN
  ('prod_01KNXX9Q8GC5NV6J9RRZF53914','prod_01KNXX9Q8HVNVQ3812R32J7708','prod_01KNXX9R466MTZFZEDHGYPG1C0',
   'prod_01KNXX9R475H9NNSC7S3HW1475','prod_01KNXXJN950KJAP1FKZ0D79S03','prod_01KNXXJQYFFK2FP3D89W8XP7BG',
   'prod_01KNXXJVPBZ6Z0XM077RTN120X','prod_01KNXXJXGDV2C96PN2KHYP786B','prod_01KNXXK2XM7G88CMDAXBDX9MZN',
   'prod_01KNXXK3SVDYJT39DJ84XGAW7X','prod_01KNXXK4PKW6CDH42YW4ASEG9T','prod_01KNXXK5JPQ72N31GP3SV6CYWN');

-- ── reverse reparent #6 ──────────────────────────────────────────────────────
UPDATE product_category SET
  parent_category_id='pcat_v4_l12_1',
  mpath='pcat_v4_l12.pcat_v4_l12_1.pcat_el_12x1_39',
  handle='v4-sport-ja-vaba-aeg-ouesport-ja-valimangud-taispuhutavad-projektsiooniekraanid',
  updated_at=NOW()
WHERE id='pcat_el_12x1_39';

-- ── reverse renamed (nimi + handle) ──────────────────────────────────────────
UPDATE product_category SET name='Köögi- ja taignamikserid', handle='v4-suurkook-koogi-taignamikserid', updated_at=NOW() WHERE id='pcat_ks_5x1_12';
UPDATE product_category SET name='Seinariiulid', handle='v4-ladu-seinariiulid', updated_at=NOW() WHERE id='pcat_ag2_2x2_2';
UPDATE product_category SET name='Seinariiulid', handle='v4-moobel-ja-sisustus-riiulid-ja-hoiustamine-seinariiulid', updated_at=NOW() WHERE id='pcat_mv_6x2_2';
UPDATE product_category SET name='Tolmuimejad', handle='v4-tooriistad-ja-tarvikud-puhastustehnika-ja-tarvikud-tolmuimejad', updated_at=NOW() WHERE id='pcat_t3f_12_2';
UPDATE product_category SET name='Tolmuimejad', handle='v4-kodumasinad-ja-kodutehnika-puhastus-ja-koristustehnika-tolmuimejad', updated_at=NOW() WHERE id='pcat_ks_4x5_3';
UPDATE product_category SET name='Membraanpumbad', handle='v4-santehnika-kute-ja-ventilatsioon-veepumbad-ja-vaakumpumbad-membraanpumbad', updated_at=NOW() WHERE id='pcat_es_10x2_6';

-- ── reverse suruõhk-pump move #7 ─────────────────────────────────────────────
INSERT INTO product_category_product (product_id, product_category_id)
  VALUES ('prod_01KNXX66PY1VP4VWX49516QNTA','pcat_es_10x2_6') ON CONFLICT DO NOTHING;
DELETE FROM product_category_product
  WHERE product_id='prod_01KNXX66PY1VP4VWX49516QNTA' AND product_category_id='pcat_ag2_2x4_4';

-- ── eemalda kõik A1 301-d (from_slug = vanad handle'd) ───────────────────────
DELETE FROM slug_redirect WHERE from_slug IN (
  'v4-garaaziseadmed-kutus-bensiinikanistrid','v4-aed-ja-aiatehnika-l8-taimede-kasvulambid',
  'v4-kaariturvavaravad','v4-sport-mull-sporditelgid',
  'v4-ehitus-remont-ja-varvid-uksed-aknad-ja-luugid-garaaziuste-tihendid-ja-vedrud',
  'v4-sport-ja-vaba-aeg-ouesport-ja-valimangud-taispuhutavad-projektsiooniekraanid',
  'v4-suurkook-koogi-taignamikserid','v4-ladu-seinariiulid',
  'v4-moobel-ja-sisustus-riiulid-ja-hoiustamine-seinariiulid',
  'v4-tooriistad-ja-tarvikud-puhastustehnika-ja-tarvikud-tolmuimejad',
  'v4-kodumasinad-ja-kodutehnika-puhastus-ja-koristustehnika-tolmuimejad',
  'v4-santehnika-kute-ja-ventilatsioon-veepumbad-ja-vaakumpumbad-membraanpumbad');

COMMIT;
